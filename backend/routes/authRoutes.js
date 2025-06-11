const express = require('express');
const { 
    registerUser, 
    loginUser, 
    resetPassword, 
    confirmResetPassword 
} = require('../controllers/authController');

const router = express.Router();
//rutas de autenticacion
// Registro de usuario
router.post('/register', registerUser);

// Inicio de sesión
router.post('/login', loginUser);

// Solicitar restablecimiento de contraseña
router.post('/reset-password', resetPassword);

// Confirmar restablecimiento de contraseña
router.post('/reset-password/confirm', confirmResetPassword);

module.exports = router;