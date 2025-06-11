const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Pedido = sequelize.define('Pedido', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  usuario_id: { type: DataTypes.INTEGER, allowNull: false },
  kunnr: { type: DataTypes.STRING(20), allowNull: false }, // Código cliente
  sortl: { type: DataTypes.STRING(20), allowNull: false }, // ruta del cliente ejemplo INS001
  fecha: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  estado: { type: DataTypes.STRING(20), defaultValue: 'pendiente' },
  sap: { type: DataTypes.INTEGER, defaultValue: 0 }, // <--- AGREGAR AQUÍ
}, {
  tableName: 'pedidos',
  timestamps: false
});

module.exports = Pedido;