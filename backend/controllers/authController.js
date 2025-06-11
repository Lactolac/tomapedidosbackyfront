const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { sendEmail } = require('../config/email');

// Registro de Usuario
const registerUser = async (req, res) => {
  const { username, email, password, lat, lng } = req.body; // <-- Agrega lat y lng

  try {
    const existingUser = await User.findOne({ where: { email } });

    if (existingUser) {
      // Si el usuario ya existe, enviar correo para restablecimiento y devolver 200 pero indicar en el mensaje
      const resetToken = jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: '1h' });
      existingUser.reset_token = resetToken;
      existingUser.reset_token_expires = new Date(Date.now() + 3600000); // 1 hora
      await existingUser.save();

      const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
      await sendEmail(
        email,
        'Restablecimiento de Contraseña',
        `<p>Haz clic en el siguiente enlace para restablecer tu contraseña:</p><a href="${resetLink}">Restablecer Contraseña</a>`
      );
      return res.status(200).json({ alreadyExists: true, message: 'Correo existente enviando correo, para restablecer contraseña.' });
    }

    // Si es nuevo usuario
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await User.create({
      username,
      email,
      password_hash: hashedPassword,
      is_verified: true, // Marcar al usuario como verificado automáticamente
      lat,   // <-- Guarda latitud
      lng    // <-- Guarda longitud
    });

    await sendEmail(
      email,
      'Bienvenido a Nuestra Plataforma de pedidos Lactolac',
      `<p>Hola ${username}, gracias por registrarte en nuestra plataforma.<br>
      Estas son tus credenciales:<br>
      <strong>Usuario:</strong> ${username}<br>
      <strong>Contraseña:</strong> ${password}<br>
      ¡Disfruta de nuestros Productos!</p>`
    );

    return res.status(201).json({ alreadyExists: false, message: 'Usuario registrado exitosamente. Ya puedes iniciar sesión.' });
  } catch (error) {
    console.error('Error en registro:', error);
    return res.status(500).json({ message: 'Error interno del servidor.' });
  }
};

// Inicio de Sesión
const loginUser = async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await User.findOne({ where: { username } });

    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado.' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Contraseña incorrecta.' });
    }

    if (!user.is_verified) {
      return res.status(403).json({ message: 'Por favor, verifica tu correo antes de iniciar sesión.' });
    }

    // Incluye el rol en el token
    const token = jwt.sign(
      { id: user.id, username: user.username, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.status(200).json({
      message: 'Inicio de sesión exitoso.',
      user: { id: user.id, username: user.username, email: user.email, role: user.role },
      token,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error interno del servidor.' });
  }
};

// Solicitar Restablecimiento de Contraseña
const resetPassword = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ where: { email } });

    if (!user) {
      return res.status(404).json({ message: 'Correo no encontrado.' });
    }

    const resetToken = jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: '1h' });
    user.reset_token = resetToken;
    user.reset_token_expires = new Date(Date.now() + 3600000); // 1 hora
    await user.save();

    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    await sendEmail(
      email,
      'Restablecimiento de Contraseña',
      `<p>Haz clic en el siguiente enlace para restablecer tu contraseña:</p><a href="${resetLink}">Restablecer Contraseña</a>`
    );

    res.status(200).json({ message: 'Correo enviado para restablecer contraseña.' });
  } catch (error) {
    console.error('Error al enviar correo de restablecimiento:', error);
    res.status(500).json({ message: 'Error interno del servidor.' });
  }
};

// Confirmar el restablecimiento de la contraseña
const confirmResetPassword = async (req, res) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    return res.status(400).json({ message: "Token y nueva contraseña son obligatorios" });
  }

  try {
    // Verificar el token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Buscar al usuario por su email (contenido en el token)
    const user = await User.findOne({ where: { email: decoded.email } });
    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    // Generar un hash para la nueva contraseña
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Actualizar la contraseña del usuario
    user.password_hash = hashedPassword;
    user.reset_token = null; // Invalida el token usado
    user.reset_token_expires = null; // Limpia la fecha de expiración del token
    await user.save();

    res.status(200).json({ message: "Contraseña actualizada exitosamente" });
  } catch (error) {
    console.error("Error al restablecer la contraseña:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};

// Exportar los controladores
module.exports = { 
  registerUser, 
  loginUser, 
  resetPassword, 
  confirmResetPassword 
};