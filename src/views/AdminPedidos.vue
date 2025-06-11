<script setup>
import { ref, onMounted, computed } from 'vue';
import axios from 'axios';
import DataView from 'primevue/dataview';
import Tag from 'primevue/tag';
import Button from 'primevue/button';

const pedidos = ref([]);
const layout = ref('grid');
const cargando = ref(false);

function formatCurrency(value) {
  if (!value) return '';
  return value.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

function getEstadoTag(estado) {
  switch (estado?.toLowerCase()) {
    case 'pendiente': return 'warning';
    case 'procesado': return 'success';
    case 'anulado': return 'danger';
    default: return 'secondary';
  }
}

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

async function procesarPedido(pedido) {
  try {
    const detalles = (pedido.pedido_detalles || []).map((det, idx) => ({
      linea: idx + 1,
      id_material: String(det.matnr),
      cantidad: Number(det.cantidad)
    }));

    const subtotal = (pedido.pedido_detalles || []).reduce(
      (sum, d) => sum + (Number(d.precio || 0) * Number(d.cantidad)),
      0
    );

    const pedidoPayload = {
      id_cliente: String(pedido.kunnr),
      ruta: String(pedido.sortl || ""),
      subtotal: subtotal,
      lista_precios: String(pedido.lista_precios || ""),
      usuario_creacion: String(pedido.usuario_creacion || ""),
      aplicado: 0,
      anulado: 0,
      pedido_id: String(pedido.id),
      origen: "SALIENTE",
      pedido_sap: String(pedido.pedido_sap || ""),
      detalles
    };

    await axios.post(
      "/api/pedidos/procesar-sap",
      pedidoPayload,
      {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      }
    );

    alert("El pedido se procesó correctamente en SAP.");
    location.reload();
  } catch (e) {
    alert("No se pudo procesar el pedido en SAP.");
  }
}

const pedidosOrdenados = computed(() =>
  [...pedidos.value].sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
);

onMounted(async () => {
  cargando.value = true;
  try {
    const res = await axios.get('/api/pedidos/listar-pedidos', {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });
    pedidos.value = res.data.map(pedido => ({
      ...pedido,
      fecha: pedido.fecha ? new Date(pedido.fecha).toLocaleString() : '',
      pedido_detalles: pedido.PedidoDetalles || pedido.pedido_detalles || [],
    }));
  } catch (e) {
    pedidos.value = [];
  } finally {
    cargando.value = false;
  }
});
</script>

<template>
  <div class="flex flex-col">
    <div class="card">
      <h2 class="text-2xl font-bold mb-4">Todos los pedidos</h2>

      <div v-if="cargando" class="text-lg text-center text-surface-400 my-12 flex flex-col items-center">
        <i class="pi pi-spin pi-spinner text-3xl mb-3 text-[#0056A6]"></i>
        Cargando pedidos...
      </div>
      <div v-else-if="!pedidos.length" class="text-lg text-center text-surface-400 my-12">
        No hay pedidos registrados.
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
              <Button
                v-if="pedido.estado && pedido.estado.toLowerCase() === 'pendiente'"
                label="Procesar pedido"
                icon="pi pi-check-circle"
                severity="success"
                text
                @click="procesarPedido(pedido)"
              />
              <Tag :value="pedido.estado" :severity="getEstadoTag(pedido.estado)" class="uppercase ml-2" />
            </div>
          </div>

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
                      <div class="bg-orange-400 text-white rounded-full px-3 py-1 text-xs font-bold">
                        {{ item.cantidad }} Unidades
                      </div>
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
        </div>
      </div>
    </div>
  </div>
</template>