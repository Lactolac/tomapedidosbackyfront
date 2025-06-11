require('dotenv').config();
const Mailjet = require('node-mailjet');

const mailjet = Mailjet.apiConnect(
  process.env.MAILJET_API_KEY,
  process.env.MAILJET_API_SECRET
);

// Función para enviar correos
const sendEmail = async (to, subject, html) => {
  try {
    const result = await mailjet
      .post('send', { version: 'v3.1' })
      .request({
        Messages: [
          {
            From: {
              Email: process.env.MAILJET_FROM,
              Name: 'Soporte'
            },
            To: [
              {
                Email: to,
                Name: to
              }
            ],
            Subject: subject,
            HTMLPart: html
          }
        ]
      });
    console.log('Respuesta de Mailjet:', result.body);
    return result.body;
  } catch (error) {
    console.error('Error al enviar correo:', error.message, error.response?.body);
    throw new Error('No se pudo enviar el correo.');
  }
};

// Función para enviar correo de confirmación de registro
const sendRegistrationEmail = async (to, username) => {
  const subject = '¡Bienvenido a nuestra plataforma!';
  const html = `
    <h1>Hola, ${username} 👋</h1>
    <p>¡Gracias por registrarte en nuestra plataforma! Estamos encantados de que te unas a nosotros.</p>
    <p>Si tienes alguna pregunta, no dudes en contactarnos.</p>
    <p>Saludos,<br>El equipo de Soporte</p>
  `;

  return sendEmail(to, subject, html);
};

// Función para enviar correo de cambio de contraseña
const sendPasswordResetEmail = async (to, resetLink) => {
  const subject = 'Restablecimiento de Contraseña';
  const html = `
    <h1>Restablecimiento de Contraseña</h1>
    <p>Recibimos una solicitud para restablecer tu contraseña. Si no realizaste esta solicitud, puedes ignorar este mensaje.</p>
    <p>Haz clic en el siguiente enlace para restablecer tu contraseña:</p>
    <a href="${resetLink}">${resetLink}</a>
    <p>Este enlace expirará en 24 horas.</p>
    <p>Saludos,<br>El equipo de Soporte</p>
  `;

  return sendEmail(to, subject, html);
};

module.exports = {
  sendEmail,
  sendRegistrationEmail,
  sendPasswordResetEmail,
};