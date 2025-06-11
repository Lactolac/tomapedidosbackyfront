const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const Pedido = require('./Pedido');

const PedidoDetalle = sequelize.define('PedidoDetalle', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  pedido_id: {
    type: DataTypes.INTEGER,
    references: { model: Pedido, key: 'id' },
    allowNull: false
  },
  matnr: { type: DataTypes.STRING(20), allowNull: false },
  arktx: { type: DataTypes.STRING(100) },
  cantidad: { type: DataTypes.INTEGER, allowNull: false },
  precio: { type: DataTypes.DECIMAL(12, 2) }
}, {
  tableName: 'pedido_detalle',
  timestamps: false
});

Pedido.hasMany(PedidoDetalle, { foreignKey: 'pedido_id' });
PedidoDetalle.belongsTo(Pedido, { foreignKey: 'pedido_id' });

module.exports = PedidoDetalle;