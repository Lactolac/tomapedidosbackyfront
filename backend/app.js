const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userAdminRoutes');
const pedidosRoutes = require('./routes/pedidosRoutes');
const { connectDB } = require('./config/db');

require('dotenv').config();

const app = express();

// Middleware para habilitar CORS
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173', // URL del cliente (frontend)
    methods: ['GET', 'POST', 'PUT', 'DELETE'], // Métodos permitidos
    credentials: true, // Permitir envío de cookies y cabeceras de autenticación
  })
);

// Middleware para procesar JSON y datos de formularios
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Conectar a la base de datos
connectDB();

// Rutas
app.use('/auth', authRoutes);
app.use('/admin', userRoutes);
app.use('/pedidos', pedidosRoutes);

// Middleware para manejar errores
app.use((err, req, res, next) => {
  console.error(err.stack); // Imprimir el error en la consola
  res.status(err.status || 500).json({
    message: err.message || 'Error interno del servidor',
  });
});

module.exports = app;