<script setup>
import { ref, onMounted, computed } from 'vue';
import axios from 'axios';
import DataView from 'primevue/dataview';
import Tag from 'primevue/tag';
import Button from 'primevue/button';
import InputNumber from 'primevue/inputnumber';
import { useAuthStore } from "@/api-plugins/authStores";
import { useRouter } from "vue-router";
import { useLayout } from "@/layout/composables/layout";

const pedidos = ref([]);
const layout = ref('grid');
const options = ref(['grid']);
const editandoPedido = ref(null); // ID del pedido en edición de cantidades
const precios = ref([]); // [{ PRODUCTO: '140280', PRECIO: 12.5 }, ...]
const cargando = ref(false);

const authStore = useAuthStore();
const router = useRouter();
const { showAlert } = useLayout();

function formatCurrency(value) {
  if (!value) return '';
  return value.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

function getEstadoTag(estado) {
  switch (estado?.toLowerCase()) {
    case 'pendiente': return 'warning';
    case 'procesado': return 'success';
    default: return 'secondary'; // Por si acaso
  }
}

async function cargarPrecios() {
  cargando.value = true;
  try {
    const res = await axios.post('https://ora-api.yes.com.sv/select', {
      query: "SELECT PRODUCTO, PRECIO FROM HH.PRECIOS",
      db: {
        server: "10.10.4.9",
        database: "lactosa"
      }
    });
    precios.value = res.data;
  } catch (e) {
    precios.value = [];
  } finally {
    cargando.value = false;
  }
}

function getPrecioPorCodigo(matnr) {
  const precioObj = precios.value.find(p => String(p.PRODUCTO) === String(matnr));
  return precioObj ? precioObj.PRECIO : 0;
}

// Asigna los precios a los detalles de cada pedido
function asignarPreciosAPedidos() {
  pedidos.value = pedidos.value.map(pedido => ({
    ...pedido,
    pedido_detalles: (pedido.pedido_detalles || []).map(det => ({
      ...det,
      precio: getPrecioPorCodigo(det.matnr)
    }))
  }));
}

const cargarPedidos = async () => {
  cargando.value = true;
  try {
    const res = await axios.get(`/api/pedidos/listar-pedidos/${authStore.user.id}`, {
      headers: { Authorization: `Bearer ${authStore.token}` }
    });
    pedidos.value = res.data.map(pedido => ({
      ...pedido,
      fecha: pedido.fecha ? new Date(pedido.fecha).toLocaleString() : '',
      pedido_detalles: pedido.PedidoDetalles || pedido.pedido_detalles || [],
    }));
    asignarPreciosAPedidos();
  } catch (e) {
    showAlert({
      title: "Error",
      text: "No se pudieron cargar tus pedidos.",
      icon: "error"
    });
    pedidos.value = [];
  } finally {
    cargando.value = false;
  }
};

onMounted(async () => {
  await cargarPrecios();
  await cargarPedidos();
});

// Eliminar pedido
const eliminarPedido = async (id) => {
  // Mostrar confirmación personalizada con showAlert
  showAlert({
    title: "¿Estás seguro?",
    text: "¿Seguro que deseas eliminar este pedido?",
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Sí, eliminar",
    cancelButtonText: "Cancelar",
    preConfirm: async () => {
      try {
        await axios.delete(`/api/pedidos/eliminar/${id}`, {
          headers: { Authorization: `Bearer ${authStore.token}` }
        });
        showAlert({
          title: "Eliminado",
          text: "Pedido eliminado correctamente.",
          icon: "success"
        });
        await cargarPedidos();
      } catch (e) {
        showAlert({
          title: "Error",
          text: "No se pudo eliminar el pedido.",
          icon: "error"
        });
      }
    }
  });
};

// Editar cantidades
const cantidadesEdit = ref({}); // { [pedidoId-matnr]: cantidad }

function comenzarEdicion(pedido) {
  editandoPedido.value = pedido.id;
  // Copia cantidades actuales
  pedido.pedido_detalles.forEach(det => {
    cantidadesEdit.value[`${pedido.id}-${det.matnr}`] = det.cantidad;
  });
}

function cancelarEdicion() {
  editandoPedido.value = null;
  cantidadesEdit.value = {};
}

async function guardarEdicion(pedido) {
  try {
    // Construir el array de productos a actualizar, INCLUYENDO los de cantidad 0
    const productos = pedido.pedido_detalles.map(det => ({
      matnr: det.matnr,
      cantidad: cantidadesEdit.value[`${pedido.id}-${det.matnr}`] ?? det.cantidad
    }));

    await axios.put(`/api/pedidos/actualizar-cantidades/${pedido.id}`, { productos }, {
      headers: { Authorization: `Bearer ${authStore.token}` }
    });
    showAlert({ title: "Actualizado", text: "Cantidades actualizadas.", icon: "success" });
    editandoPedido.value = null;
    cantidadesEdit.value = {};
    await cargarPedidos();
  } catch (e) {
    showAlert({ title: "Error", text: "No se pudo actualizar el pedido.", icon: "error" });
  }
}

const procesarPedido = async (pedido) => {
  try {
    // Construir detalles
    const detalles = (pedido.pedido_detalles || []).map((det, idx) => ({
      linea: idx + 1,
      id_material: String(det.matnr),
      cantidad: Number(det.cantidad)
    }));

    // Calcular subtotal (si no tienes precio, pon 0)
    const subtotal = (pedido.pedido_detalles || []).reduce(
      (sum, d) => sum + (Number(d.precio || 0) * Number(d.cantidad)),
      0
    );

    const pedidoPayload = {
      id_cliente: String(pedido.kunnr),
      ruta: String(pedido.sortl || ""),
      subtotal: subtotal,
      lista_precios: String(pedido.lista_precios || ""),
      usuario_creacion: String(pedido.usuario_creacion || authStore.user.username || ""),
      aplicado: 0,
      anulado: 0,
      pedido_id: String(pedido.id),
      origen: "SALIENTE",
      pedido_sap: String(pedido.pedido_sap || ""),
      detalles
    };

    await axios.post(
      "/api/pedidos/procesar-sap", // <-- tu backend
      pedidoPayload,
      {
        headers: { Authorization: `Bearer ${authStore.token}` }
      }
    );

    showAlert({ title: "Procesado", text: "El pedido se procesó correctamente en SAP.", icon: "success" });
    await cargarPedidos();
  } catch (e) {
    showAlert({ title: "Error", text: "No se pudo procesar el pedido en SAP.", icon: "error" });
  }
};

// Nueva función para verificar si el pedido es de hoy
function esPedidoDeHoy(fechaPedido) {
  if (!fechaPedido) return false;
  const hoy = new Date();
  const fecha = new Date(fechaPedido);
  return (
    fecha.getDate() === hoy.getDate() &&
    fecha.getMonth() === hoy.getMonth() &&
    fecha.getFullYear() === hoy.getFullYear()
  );
}

const pedidosOrdenados = computed(() =>
  [...pedidos.value].sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
);
</script>

<template>
  <div class="flex flex-col">
    <div class="card">
      <h2 class="text-2xl font-bold mb-4">Pedidos realizados</h2>

      <div v-if="cargando" class="text-lg text-center text-surface-400 my-12 flex flex-col items-center">
        <i class="pi pi-spin pi-spinner text-3xl mb-3 text-[#0056A6]"></i>
        Cargando pedidos...
      </div>
      <div v-else-if="!pedidos.length" class="text-lg text-center text-surface-400 my-12">
        No tienes pedidos realizados aún.
      </div>

      <div
        v-for="pedido in pedidosOrdenados"
        :key="pedido.id"
        class="mb-8"
      >
        <div
          :class="[
            'p-4 rounded shadow',
            esPedidoDeHoy(pedido.fecha)
              ? 'bg-green-200 border-green-600'
              : 'bg-white border border-surface-200'
          ]"
          style="border-radius: 12px;"
        >
          <div class="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div class="font-bold text-base mb-1">N° Pedido: <span class="font-normal">{{ pedido.id }}</span></div>
              <div class="text-sm text-gray-500 mb-1">Fecha: {{ pedido.fecha }}</div>
              <div class="text-sm text-gray-500">Cliente: {{ pedido.kunnr }} - {{ pedido.name1 }}</div>
            </div>
            <div class="flex items-center gap-2 mt-2 sm:mt-0">
              <Button v-if="pedido.estado && pedido.estado.toLowerCase() === 'pendiente'" label="Procesar pedido"
                icon="pi pi-check-circle" severity="success" text @click="procesarPedido(pedido)" />
              <Tag :value="pedido.estado" :severity="getEstadoTag(pedido.estado)" class="uppercase ml-2" />
              <!-- Botón eliminar -->
              <Button icon="pi pi-trash" severity="danger" text rounded @click="eliminarPedido(pedido.id)" />
              <!-- Botón editar cantidades solo si está pendiente -->
              <Button v-if="pedido.estado && pedido.estado.toLowerCase() === 'pendiente' && editandoPedido !== pedido.id"
                icon="pi pi-pencil" severity="warning" text rounded @click="comenzarEdicion(pedido)" />
            </div>
          </div>

          <!-- DataView de productos -->
          <DataView :value="pedido.pedido_detalles" :layout="layout">
            <template #grid="slotProps">
              <div
                :class="[
                  'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 w-full rounded',
                  esPedidoDeHoy(pedido.fecha) ? 'bg-green-200 border-green-200' : ''
                ]"
                style="min-height: 140px;"
              >
                <div
                  v-for="(item, index) in slotProps.items"
                  :key="index"
                  class="p-1 w-full"
                >
                  <div
                    :class="[
                      'p-2 rounded flex flex-col h-full shadow-sm',
                      esPedidoDeHoy(pedido.fecha) ? 'bg-green-200 border-green-200' : 'border border-green-200 bg-white'
                    ]"
                  >
                    <div class="font-semibold text-base mb-1">{{ item.arktx }}</div>
                    <div class="text-xs text-gray-500 mb-1">Código: {{ item.matnr }}</div>
                    <div class="flex items-center gap-2 mt-1">
                      <template v-if="editandoPedido === pedido.id">
                        <InputNumber
                          v-model="cantidadesEdit[`${pedido.id}-${item.matnr}`]"
                          :min="0"
                          showButtons
                          buttonLayout="horizontal"
                          inputStyle="width: 60px"
                          class="w-full"
                        />
                      </template>
                      <template v-else>
                        <div class="bg-orange-400 text-white rounded-full px-3 py-1 text-xs font-bold">
                          {{ item.cantidad }} Unidades
                        </div>
                      </template>
                    </div>
                    <div class="mt-2 text-right font-semibold text-sm">
                      {{ formatCurrency(item.precio) }}
                    </div>
                  </div>
                </div>
              </div>
            </template>
          </DataView>

          <div class="flex justify-end mt-3">
            <span class="font-bold text-lg text-[#0056A6]">
              Total: {{
                formatCurrency(
                  (pedido.pedido_detalles || []).reduce(
                    (sum, d) => sum + (Number(d.precio || 0) * Number(d.cantidad)),
                    0
                  )
                )
              }}
            </span>
          </div>

          <div v-if="editandoPedido === pedido.id" class="flex gap-2 justify-end mt-2">
            <Button label="Guardar" icon="pi pi-save" severity="success" @click="guardarEdicion(pedido)" />
            <Button label="Cancelar" icon="pi pi-times" severity="danger" @click="cancelarEdicion" text />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>