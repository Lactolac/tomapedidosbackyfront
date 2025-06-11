const { sequelize } = require('../config/db');
const Pedido = require('../models/Pedido');
const PedidoDetalle = require('../models/PedidoDetalle');
const axios = require('axios');

// Crear un nuevo pedido
exports.crearPedido = async (req, res) => {
  try {
    const { usuario_id, productos } = req.body;
    if (!usuario_id || !productos || !productos.length) {
      return res.status(400).json({ message: "Datos incompletos" });
    }

    // Agrupa productos por cliente (kunnr)
    const clientes = [...new Set(productos.map(p => p.kunnr))];
    const pedidosCreados = [];

    for (const kunnr of clientes) {
      const productosCliente = productos.filter(p => p.kunnr === kunnr);
      const sortl = productosCliente[0].sortl || ""; // <-- Toma el sortl del primer producto de ese cliente
      const pedido = await Pedido.create({ usuario_id, kunnr, sortl }); // <-- Guarda sortl
      const detalles = productosCliente.map(p => ({
        pedido_id: pedido.id,
        matnr: p.matnr,
        arktx: p.arktx,
        cantidad: p.cantidad,
        precio: p.precio || null
      }));
      await PedidoDetalle.bulkCreate(detalles);
      pedidosCreados.push(pedido);
    }

    res.status(201).json({ message: "Pedido(s) registrado(s)", pedidos: pedidosCreados });
  } catch (error) {
    console.error("Error al crear pedido:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};

// Listar pedidos de un usuario
exports.listarPedidosUsuario = async (req, res) => {
  try {
    const { usuario_id } = req.params;

    // 1. Trae los pedidos con sus detalles
    const pedidos = await Pedido.findAll({
      where: { usuario_id },
      include: [{ model: PedidoDetalle }]
    });

    // 2. Si no hay pedidos, responde vacío y termina
    if (!pedidos.length) {
      return res.json([]);
    }

    // 3. Trae los datos de cliente para cada pedido
    const kunnrList = pedidos.map(p => p.kunnr);

    // 4. Trae los clientes únicos
    const clientes = await sequelize.query(
      `SELECT kunnr, name1, name2 FROM clientes_view WHERE kunnr IN (:kunnrList)`,
      {
        replacements: { kunnrList },
        type: sequelize.QueryTypes.SELECT
      }
    );
    // Mapea kunnr a datos de cliente
    const clientesMap = {};
    clientes.forEach(c => {
      clientesMap[c.kunnr] = c;
    });

    // 5. Agrega los datos de cliente a cada pedido
    const pedidosConCliente = pedidos.map(p => ({
      ...p.toJSON(),
      name1: clientesMap[p.kunnr]?.name1 || '',
      name2: clientesMap[p.kunnr]?.name2 || ''
    }));

    res.json(pedidosConCliente);
  } catch (error) {
    res.status(500).json({ message: "Error al obtener pedidos", error });
  }
};

// Eliminar un pedido y sus detalles
exports.eliminarPedido = async (req, res) => {
  try {
    const { id } = req.params;
    const pedido = await Pedido.findByPk(id, { include: PedidoDetalle });
    if (!pedido) return res.status(404).json({ message: "Pedido no encontrado" });

    // Elimina los detalles primero
    await PedidoDetalle.destroy({ where: { pedido_id: id } });
    // Luego el pedido
    await Pedido.destroy({ where: { id } });

    res.json({ message: "Pedido eliminado correctamente" });
  } catch (error) {
    res.status(500).json({ message: "Error al eliminar pedido", error });
  }
};

// Actualizar cantidades de productos en un pedido
exports.actualizarCantidadesPedido = async (req, res) => {
  try {
    const { id } = req.params; // ID del pedido
    const { productos } = req.body; // [{matnr, cantidad}, ...]

    if (!productos || !productos.length) {
      return res.status(400).json({ message: "No se enviaron productos a actualizar" });
    }

    for (const prod of productos) {
      if (Number(prod.cantidad) === 0) {
        // Si la cantidad es 0, elimina el producto del pedido
        await PedidoDetalle.destroy({
          where: { pedido_id: id, matnr: prod.matnr }
        });
      } else {
        // Si la cantidad es mayor a 0, actualiza normalmente
        await PedidoDetalle.update(
          { cantidad: prod.cantidad },
          { where: { pedido_id: id, matnr: prod.matnr } }
        );
      }
    }

    // --- NUEVO: Si ya no quedan detalles, elimina el pedido ---
    const detallesRestantes = await PedidoDetalle.count({ where: { pedido_id: id } });
    if (detallesRestantes === 0) {
      await Pedido.destroy({ where: { id } });
      return res.json({ message: "Todos los productos eliminados, pedido eliminado" });
    }

    res.json({ message: "Cantidades actualizadas correctamente" });
  } catch (error) {
    res.status(500).json({ message: "Error al actualizar cantidades", error });
  }
};

// Ver detalles de un pedido
exports.detallePedido = async (req, res) => {
  try {
    const { id } = req.params;
    const pedido = await Pedido.findByPk(id, {
      include: [{ model: PedidoDetalle }]
    });
    if (!pedido) return res.status(404).json({ message: "Pedido no encontrado" });
    res.json(pedido);
  } catch (error) {
    res.status(500).json({ message: "Error al obtener detalle", error });
  }
};

// Procesar pedido en SAP
exports.procesarPedidoSAP = async (req, res) => {
  try {
    const pedidoPayload = req.body;
    const token = req.headers.authorization;

    const response = await axios.post(
      "https://calidad-api-sap-crm.yes.com.sv/insertar-pedido-solo-sap/",
      pedidoPayload,
      {
        headers: { Authorization: token }
      }
    );

    // Si SAP devuelve un error, lo manejas como ya tienes
    if (response.data && response.data["Error en pedido SAP"]) {
      return res.status(400).json({
        message: "Error en pedido SAP",
        detail: response.data["Error en pedido SAP"]
      });
    }

    // --- ACTUALIZA EL PEDIDO EN TU BASE DE DATOS ---
    // Busca el pedido por pedido_id (que es el id local)
    const pedidoId = pedidoPayload.pedido_id;
    await Pedido.update(
      { estado: "procesado", sap: 1 },
      { where: { id: pedidoId } }
    );
    // ----------------------------------------------

    res.status(200).json({ message: "Procesado en SAP", data: response.data });
  } catch (error) {
    if (error.response && error.response.data) {
      const sapError = error.response.data["Error en pedido SAP"];
      if (sapError) {
        return res.status(400).json({
          message: "Error en pedido SAP",
          detail: sapError
        });
      }
      return res.status(400).json({
        message: "Error al procesar pedido en SAP",
        detail: error.response.data
      });
    }
    res.status(500).json({
      message: "Error al conectar con SAP",
      detail: error.message
    });
  }
};