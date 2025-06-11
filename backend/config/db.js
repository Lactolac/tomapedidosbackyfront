const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
  process.env.DB_NAME,      // Nombre de la base de datos
  process.env.DB_USER,      // Usuario
  process.env.DB_PASSWORD,  // Contraseña
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 5432,  // Puerto de PostgreSQL, por defecto 5432
    dialect: 'postgres',                // Cambiado de 'mysql' a 'postgres'
    logging: false,                     // Deshabilitar logs de SQL
  }
);

const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log('Conexión a la base de datos exitosa.');
  } catch (error) {
    console.error('Error al conectar a la base de datos:', error);
    process.exit(1);
  }
};

module.exports = { sequelize, connectDB };