const express = require('express');
const router = express.Router();
const pedidoController = require('../controllers/pedidosController');

// Crear pedido (POST)
router.post('/crear-pedidos', pedidoController.crearPedido);

//Procesar pedidos en sap (POST)
router.post('/procesar-sap', pedidoController.procesarPedidoSAP);

// Listar pedidos de usuario (GET)
router.get('/listar-pedidos/:usuario_id', pedidoController.listarPedidosUsuario);

// Ver detalle de un pedido (GET)
router.get('/ver-detalle/:id', pedidoController.detallePedido);

//Eliminar pedidos (DELETE)
router.delete('/eliminar/:id', pedidoController.eliminarPedido);

//Actualizar cantidades de un pedido (PUT) 
router.put('/actualizar-cantidades/:id', pedidoController.actualizarCantidadesPedido);
module.exports = router;