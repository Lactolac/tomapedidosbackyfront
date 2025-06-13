const express = require('express');
const {
    getAllUsers,
    asociarClientes,          
    getClientesDeUsuario,     
    getHistorialDeUsuario,    
    deleteUser,
    getAllClientes, // <--- ¡IMPORTANTE! Para el dropdown de clientes
    getSugerenciasGrupo,
    getAllDocsUsuario
} = require('../controllers/userAdminController');

const router = express.Router();

// Obtener todos los usuarios
router.get('/users', getAllUsers);

// Obtener todos los clientes externos
router.get('/clientes', getAllClientes); // <---- ¡Esta faltaba!

// Asociar clientes a usuario (muchos-a-muchos)
router.post('/users/:userId/clientes', asociarClientes);

// Obtener los clientes asociados a un usuario
router.get('/users/:userId/clientes', getClientesDeUsuario);

// Obtener historial de compras filtrado por los clientes asociados
router.get('/users/:userId/historial', getHistorialDeUsuario);

// Eliminar usuario
router.delete('/users/:userId', deleteUser);

// Obtener sugerencias de grupo para un usuario
router.get('/users/:userId/sugerencias-grupo', getSugerenciasGrupo);

//Obtener las cuentas por cobrar de todos los clientes por sap
router.get('/users/:userId/alldocs', getAllDocsUsuario);

module.exports = router;