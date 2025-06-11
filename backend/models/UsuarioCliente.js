const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const UsuarioCliente = sequelize.define('usuario_clientes', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  usuario_id: { type: DataTypes.INTEGER, allowNull: false },
  kunnr: { type: DataTypes.STRING, allowNull: false }
}, { tableName: 'usuario_clientes', timestamps: false });

module.exports = UsuarioCliente;