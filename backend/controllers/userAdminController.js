const User = require('../models/User');
const UsuarioCliente = require('../models/UsuarioCliente');
const axios = require('axios');
const { sequelize } = require('../config/db');

/**
 * Obtener todos los usuarios
 * GET /users
 */
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: ['id', 'username', 'email', 'role', 'created_at', 'lat', 'lng'] // <-- agrega lat y lng aquí
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener los usuarios', error });
  }
};

/**
 * Asignar cliente a un usuario
 * PUT /users/:userId/asignar-cliente
 * Body: { clienteId }
 */
exports.asociarClientes = async (req, res) => {
  const { userId } = req.params;
  const { kunnr } = req.body; // kunnr es un array de códigos de cliente

  try {
    // Borra asociaciones anteriores
    await UsuarioCliente.destroy({ where: { usuario_id: userId } });
    // Crea nuevas asociaciones
    const bulk = kunnr.map(k => ({ usuario_id: userId, kunnr: k }));
    await UsuarioCliente.bulkCreate(bulk);

    res.json({ message: "Clientes asociados correctamente" });
  } catch (error) {
  console.error("Error asociando clientes:", error); // log real
  res.status(500).json({ message: "Error asociando clientes", error: error.toString() });
}
};
/**
 * Eliminar un usuario (opcional, para tu botón de borrar)
 * DELETE /users/:userId
 */
exports.deleteUser = async (req, res) => {
  const { userId } = req.params;
  try {
    const user = await User.findByPk(userId);
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });

    await user.destroy();
    res.json({ message: 'Usuario eliminado' });
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar usuario', error });
  }
};
//para traer los clientes
exports.getAllClientes = async (req, res) => {
  const search = req.query.search || '';
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 100;
  const offset = (page - 1) * limit;

  try {
    let query = `
      SELECT kunnr, name1, name2, sortl, doc_type,detalle_grupo
      FROM clientes_view
    `;
    let replacements = { limit, offset };

    if (search) {
      query += ` WHERE name1 ILIKE :search OR name2 ILIKE :search OR kunnr ILIKE :search `;
      replacements.search = `%${search}%`;
    }

    query += ` ORDER BY name2 LIMIT :limit OFFSET :offset`;

    

    const clientes = await sequelize.query(query, {
      replacements,
      type: sequelize.QueryTypes.SELECT
    });

    res.json(Array.isArray(clientes) ? clientes : []);
  } catch (error) {
    console.error("Error getAllClientes:", error);
    res.status(500).json({ message: "Error obteniendo clientes locales", error: error.toString() });
  }
};

//llamar clientes de una funcion externa
exports.getClientesDeUsuario = async (req, res) => {
  const { userId } = req.params;
  try {
    const asignaciones = await UsuarioCliente.findAll({ where: { usuario_id: userId } });
    const kunnrList = asignaciones.map(a => a.kunnr);

    if (!kunnrList.length) return res.json([]);

    // Sequelize espera el array así, pero si no funciona prueba con :...kunnrList
    const clientesUsuario = await sequelize.query(
      `SELECT * FROM clientes_view WHERE kunnr IN (:kunnrList)`,
      {
        replacements: { kunnrList },
        type: sequelize.QueryTypes.SELECT
      }
    );

    res.json(Array.isArray(clientesUsuario) ? clientesUsuario : []);
  } catch (error) {
    console.error("Error getClientesDeUsuario:", error);
    res.status(500).json({ message: "Error obteniendo clientes", error: error.toString() });
  }
};

exports.getHistorialDeUsuario = async (req, res) => {
  const { userId } = req.params;
  try {
    // 1. Busca los kunnr asociados a este usuario
    const asignaciones = await UsuarioCliente.findAll({ where: { usuario_id: userId } });
    const kunnrList = asignaciones.map(a => a.kunnr);

    // 2. Llama a la API externa para obtener el historial de compras
    const response = await axios.post('https://pg-api.yes.com.sv/select', {
      query: "SELECT * FROM historial_compras_cli;",
      db: { host: "192.168.101.77", database: "yesentregas" }
    });
    const allHistorial = response.data;

    // 3. Filtra solo los registros de los kunnr asociados a este usuario
    let historialUsuario = allHistorial.filter(h => kunnrList.includes(h.kunag) || kunnrList.includes(h.kunrg));

    // 4. Limpia los ceros a la izquierda del matnr en cada registro
    historialUsuario = historialUsuario.map(item => ({
      ...item,
      matnr: item.matnr ? item.matnr.replace(/^0+/, '') : item.matnr
    }));

    res.json(historialUsuario);
  } catch (error) {
    res.status(500).json({ message: "Error obteniendo historial de compras", error });
  }
};

exports.getSugerenciasGrupo = async (req, res) => {
  const { userId } = req.params;
  try {
    // 1. Busca los kunnr asociados a este usuario
    const asignaciones = await UsuarioCliente.findAll({ where: { usuario_id: userId } });
    const kunnrList = asignaciones.map(a => a.kunnr);

    if (!kunnrList.length) return res.json([]);

    // 2. Obtén TODOS los grupos de los clientes del usuario
    const grupos = await sequelize.query(
      `SELECT DISTINCT detalle_grupo FROM clientes_view WHERE kunnr IN (:kunnrList) AND detalle_grupo IS NOT NULL`,
      { replacements: { kunnrList }, type: sequelize.QueryTypes.SELECT }
    );
    const grupoList = grupos.map(g => g.detalle_grupo);

    if (!grupoList.length) return res.json([]);

    // 3. Busca todos los kunnr de esos grupos, excepto los del usuario actual
    const otrosClientes = await sequelize.query(
      `SELECT kunnr FROM clientes_view WHERE detalle_grupo IN (:grupoList) AND kunnr NOT IN (:kunnrList)`,
      { replacements: { grupoList, kunnrList }, type: sequelize.QueryTypes.SELECT }
    );
    const otrosKunnr = otrosClientes.map(c => c.kunnr);

    if (!otrosKunnr.length) return res.json([]);

    // 4. Busca historial de compras de esos kunnr (otros clientes del grupo)
    const response = await axios.post('https://pg-api.yes.com.sv/select', {
      query: `SELECT * FROM historial_compras_cli WHERE kunag IN (${otrosKunnr.map(k => `'${k}'`).join(',')})`,
      db: { host: "192.168.101.77", database: "yesentregas" }
    });
    const historial = response.data;

    // 5. Obtén productos que el usuario actual ya ha comprado
    const responseUser = await axios.post('https://pg-api.yes.com.sv/select', {
      query: `SELECT * FROM historial_compras_cli WHERE kunag IN (${kunnrList.map(k => `'${k}'`).join(',')})`,
      db: { host: "192.168.101.77", database: "yesentregas" }
    });
    const historialUser = responseUser.data;
    const productosUsuario = new Set(historialUser.map(item => item.matnr));

    // 6. Agrupa por producto y cuenta compras, excluyendo los que ya tiene el usuario
    const sugerencias = {};
    historial.forEach(item => {
      // Limpia los ceros a la izquierda del matnr
      const matnrLimpio = item.matnr.replace(/^0+/, '');
      if (productosUsuario.has(item.matnr)) return; // EXCLUIR productos ya comprados por el usuario
      if (!sugerencias[matnrLimpio]) {
        sugerencias[matnrLimpio] = { ...item, matnr: matnrLimpio, total: 0 };
      }
      sugerencias[matnrLimpio].total += Number(item.qty || 1);
    });

    // Devuelve los productos más comprados por el grupo (puedes limitar a top 10)
    res.json(Object.values(sugerencias).sort((a, b) => b.total - a.total).slice(0, 10));
  } catch (error) {
    res.status(500).json({ message: "Error obteniendo sugerencias de grupo", error: error.toString() });
  }
};