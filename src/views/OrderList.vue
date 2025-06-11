<script setup>
import { ref, onMounted } from 'vue';
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
</script>

<template>
  <div class="flex flex-col">
    <div class="card">
      <div class="font-semibold text-xl mb-6">Pedidos realizados</div>

      <div v-if="cargando" class="text-lg text-center text-surface-400 my-12 flex flex-col items-center">
        <i class="pi pi-spin pi-spinner text-3xl mb-3 text-[#0056A6]"></i>
        Cargando pedidos...
      </div>
      <div v-else-if="!pedidos.length" class="text-lg text-center text-surface-400 my-12">
        No tienes pedidos realizados aún.
      </div>

      <div
        v-for="pedido in pedidos"
        :key="pedido.id"
        class="mb-10"
      >
        <div
          :class="[
            'p-4 rounded',
            pedido.sap === 1 ? 'bg-green-100 border-green-400' : '',
            esPedidoDeHoy(pedido.fecha) ? 'bg-green-200 border-green-600' : ''
          ]"
          style="border: 2px solid transparent; border-radius: 8px;"
        >
          <div class="mb-2 flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <span class="font-bold">N° Pedido:</span> {{ pedido.id }}
              <span class="ml-4 font-bold">Fecha:</span> {{ pedido.fecha }}
              <span class="ml-4 font-bold">Cliente: </span>
              <span>
                {{ pedido.kunnr }}
                <template v-if="pedido.name1 || pedido.name2">
                  - {{ pedido.name1 || '' }}<template v-if="pedido.name2"> - {{ pedido.name2 }}</template>
                </template>
              </span>
            </div>
            <div class="flex items-center gap-2">
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
          <DataView :value="pedido.pedido_detalles" :layout="layout" >
            <template #grid="slotProps">
              <div
                :class="[
                  'grid grid-cols-12 gap-2 w-full rounded',
                  esPedidoDeHoy(pedido.fecha) ? 'bg-green-200 border-green-200' : ''
                ]"
                style="min-height: 140px;"
              >
                <div
                  v-for="(item, index) in slotProps.items"
                  :key="index"
                  class="col-span-12 sm:col-span-3 lg:col-span-2 p-1 w-full"
                >
                  <div
                    :class="[
                      'p-2 rounded flex flex-col h-full',
                      esPedidoDeHoy(pedido.fecha) ? 'bg-green-200 border-green-200' : 'border border-green-200'
                    ]"
                  >
                    <div>
                      <div class="text-base font-medium"><strong>{{ item.arktx }}</strong></div>
                      <span class="text-sm font-medium">Código: {{ item.matnr }}</span>
                    </div>
                    <!-- Unidades abajo -->
                    <div class="mt-1 flex flex-row items-center gap-2">
                      <div style="background: #f97316;" class="p-1 rounded-full flex items-center gap-2 px-2">
                        <template v-if="editandoPedido === pedido.id">
                          <InputNumber v-model="cantidadesEdit[`${pedido.id}-${item.matnr}`]" :min="0"
                            inputStyle="width:50px; font-size:0.85rem;" />
                        </template>
                        <template v-else>
                          <span class="text-base text-white">
                            <strong>Unidades: {{ item.cantidad }}</strong>
                          </span>
                        </template>
                      </div>
                    </div>
                    <div class="flex flex-col gap-4 mt-3">
                      <span class="text-base font-semibold">{{ formatCurrency(item.precio) }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </template>
          </DataView>

          <!-- Botones de guardar/cancelar edición -->
          <div v-if="editandoPedido === pedido.id" class="flex justify-end gap-2 mt-3">
            <Button label="Guardar" icon="pi pi-check" severity="success" @click="guardarEdicion(pedido)" />
            <Button label="Cancelar" icon="pi pi-times" severity="danger" outlined @click="cancelarEdicion" />
          </div>
          
          <!-- Total -->
          <div class="flex justify-end mt-2">
            <span class="font-bold text-lg">
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
        </div>
      </div>
    </div>
  </div>
</template>