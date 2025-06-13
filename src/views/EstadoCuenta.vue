<template>
  <div class="card mx-auto w-full"> <!-- Solo w-full -->
    <h2 class="text-2xl font-bold mb-4">Estado de cuenta</h2>
    <div class="flex flex-col sm:flex-row sm:justify-between mb-2">
      <div>
        <span class="font-semibold">AL:</span>
        <span class="ml-2">{{ new Date().toLocaleDateString() }}</span>
      </div>
    </div>

    <div class="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs mb-4">
      <div>
        <div class="font-semibold text-gray-600">LIMITE DE CREDITO APROBADO</div>
        <div class="text-green-700 font-bold">${{ estadoCuenta?.limiteCredito?.toLocaleString() }}</div>
      </div>
      <div>
        <div class="font-semibold text-gray-600">PENDIENTE DE PAGO</div>
        <div class="text-yellow-700 font-bold">
          <span v-if="pendientePorMoneda('GTQ') > 0">Q{{ pendientePorMoneda('GTQ').toLocaleString() }}</span>
          <span v-if="pendientePorMoneda('USD') > 0">${{ pendientePorMoneda('USD').toLocaleString() }}</span>
        </div>
      </div>
      <div>
        <div class="font-semibold text-gray-600">CXC NO VENCIDAS</div>
        <div class="text-green-700 font-bold">{{ contarCxcNoVencidas() }}</div>
      </div>
      <div>
        <div class="font-semibold text-gray-600">CXC VENCIDAS</div>
        <div class="text-red-700 font-bold">{{ contarCxcVencidas() }}</div>
      </div>
      <div>
        <div class="font-semibold text-gray-600">LIM. DOCUMENTOS PENDIENTES</div>
        <div class="font-bold">{{ estadoCuenta?.limiteDocsPendientes }}</div>
      </div>
    </div>

    <div class="flex justify-end mb-2">
      <Button label="DESCARGAR DATOS" icon="pi pi-download" />
    </div>

    <!-- Tabla solo en web -->
    <div v-if="!isMobile" class="overflow-x-auto">
      <table class="min-w-full w-full text-sm">
        <thead style="background-color: #0056A6; color: white;">
          <tr>
            <th class="p-3 rounded-l-lg">SELECCIONADOS</th>
            <th class="p-3">FECHA DOC</th>
            <th class="p-3">FECHA VENCIMIENTO</th>
            <th class="p-3">N° DOC SAP</th>
            <th class="p-3">N° PEDIDO</th>
            <th class="p-3">CLIENTE</th>
            <th class="p-3 rounded-r-lg">MONTO DOCUM</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="doc in documentos"
            :key="doc.BELNR"
            :class="[
              'shadow-sm transition',
              getEstadoDocumento(doc) === 'vigente' ? 'bg-green-50 hover:bg-green-100' : '',
              getEstadoDocumento(doc) === 'por-vencer' ? 'bg-yellow-50 hover:bg-yellow-100' : '',
              getEstadoDocumento(doc) === 'vencido' ? 'bg-red-50 hover:bg-red-100' : ''
            ]"
          >
            <td class="p-3 text-center"><input type="checkbox" v-model="doc.selected" /></td>
            <td class="p-3">{{ formatFechaSAP(doc.BUDAT) }}</td>
            <td class="p-3">{{ formatFechaSAP(calcularFechaVencimiento(doc.BUDAT, doc.ZBD1T, true)) }}</td>
            <td class="p-3">{{ getNumeroDocSAP(doc) }}</td>
            <td class="p-3">{{ doc.VBELN }}</td>
            <td class="p-3">{{ doc.KUNNR }} - {{ doc.NAME1 }} - {{ doc.NAME2 }}</td>
            <td class="p-3 font-bold">
              {{ getCurrencySymbol(doc.WAERS) }}{{ Number(doc.DMBTR).toLocaleString() }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Cards solo en móvil -->
    <div v-else class="flex flex-col gap-3">
      <div
        v-for="doc in documentos"
        :key="doc.BELNR"
        class="rounded p-3 shadow"
        :class="{
          'bg-green-100': getEstadoDocumento(doc) === 'vigente',
          'bg-yellow-100': getEstadoDocumento(doc) === 'por-vencer',
          'bg-red-100': getEstadoDocumento(doc) === 'vencido'
        }"
      >
        <div class="flex justify-between items-center mb-2">
          <span class="font-bold text-blue-700">{{ getNumeroDocSAP(doc) }}</span>
          <span
            class="text-xs font-bold px-2 py-1 rounded"
            :class="{
              'bg-green-200 text-green-800': getEstadoDocumento(doc) === 'vigente',
              'bg-yellow-200 text-yellow-800': getEstadoDocumento(doc) === 'por-vencer',
              'bg-red-200 text-red-800': getEstadoDocumento(doc) === 'vencido'
            }"
          >
            {{
              getEstadoDocumento(doc) === 'vigente' ? 'VIGENTE'
              : getEstadoDocumento(doc) === 'por-vencer' ? 'POR VENCER'
              : 'VENCIDO'
            }}
          </span>
          <input type="checkbox" v-model="doc.selected" />
        </div>
        <div class="text-xs text-gray-700 mb-1">Fecha doc: {{ formatFechaSAP(doc.BUDAT) }}</div>
        <div class="text-xs text-gray-700 mb-1">Vence: {{ formatFechaSAP(calcularFechaVencimiento(doc.BUDAT, doc.ZBD1T, true)) }}</div>
        <div class="text-xs mb-1">Pedido: <span class="font-semibold">{{ doc.VBELN }}</span></div>
        <div class="text-xs mb-1">Cliente: <span class="font-semibold">{{ doc.KUNNR }} - {{ doc.NAME1 }} - {{ doc.NAME2 }}</span></div>
        <div class="text-xs mb-1">Monto: <span class="font-bold">{{ getCurrencySymbol(doc.WAERS) }}{{ Number(doc.DMBTR).toLocaleString() }}</span></div>
      </div>
    </div>

    <div class="flex justify-end mt-4">
      <div class="text-lg font-bold mr-4">
        <span v-if="totalPorMoneda('GTQ') > 0">Q{{ totalPorMoneda('GTQ').toLocaleString() }}</span>
        <span v-if="totalPorMoneda('USD') > 0">${{ totalPorMoneda('USD').toLocaleString() }}</span>
      </div>
      <Button label="ABONAR" class="bg-green-500 text-white" />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, h } from 'vue';
import axios from 'axios';
import { useAuthStore } from "@/api-plugins/authStores";
import { DataTable } from 'primevue';
const authStore = useAuthStore();
const clientes = ref([]);
const documentos = ref([]);
const cargando = ref(false);
const isMobile = ref(window.innerWidth < 640);

function checkMobile() {
  isMobile.value = window.innerWidth < 640;
}

onMounted(async () => {
  window.addEventListener('resize', checkMobile);
  cargando.value = true;
  try {
    // ¡Solo una petición al backend!
    const res = await axios.get(`/api/admin/users/${authStore.user.id}/alldocs`, {
      headers: { Authorization: `Bearer ${authStore.token}` }
    });
    let docs = Array.isArray(res.data) ? res.data : [];
    // Ordenar por fecha descendente (más reciente primero)
    docs.sort((a, b) => b.BUDAT.localeCompare(a.BUDAT));
    documentos.value = docs;
  } catch (e) {
    documentos.value = [];
  } finally {
    cargando.value = false;
  }
});

function calcularFechaVencimiento(budat, zbd1t, returnRaw = false) {
  if (!budat) return '';
  const anio = Number(budat.slice(0, 4));
  const mes = Number(budat.slice(4, 6)) - 1;
  const dia = Number(budat.slice(6, 8));
  const fecha = new Date(anio, mes, dia);

  const diasCredito = Number(zbd1t) || 0;
  if (diasCredito > 0) {
    fecha.setDate(fecha.getDate() + diasCredito);
  }
  if (returnRaw) {
    const y = fecha.getFullYear();
    const m = String(fecha.getMonth() + 1).padStart(2, '0');
    const d = String(fecha.getDate()).padStart(2, '0');
    return `${y}${m}${d}`;
  }
  return fecha.toLocaleDateString();
}

function getCurrencySymbol(moneda) {
  if (!moneda) return '';
  if (moneda.toUpperCase() === 'GTQ') return 'Q';
  if (moneda.toUpperCase().startsWith('USD')) return '$';
  return moneda;
}

function getNumeroDocSAP(doc) {
  if (doc.LAND1 === 'SV') return doc.CAMPO1;
  if (doc.LAND1 === 'GT') return doc.SERIE;
  return doc.BELNR;
}

function formatFechaSAP(fechaSap) {
  if (!fechaSap || fechaSap.length !== 8) return '';
  const anio = fechaSap.slice(0, 4);
  const mes = fechaSap.slice(4, 6);
  const dia = fechaSap.slice(6, 8);
  return `${dia}/${mes}/${anio}`;
}

// Estado del documento: vigente, por-vencer o vencido
function getEstadoDocumento(doc) {
  // Calcula la fecha de vencimiento
  const vencimiento = calcularFechaVencimiento(doc.BUDAT, doc.ZBD1T, true); // YYYYMMDD
  const hoy = new Date();
  const hoyStr = hoy.getFullYear().toString() +
    String(hoy.getMonth() + 1).padStart(2, '0') +
    String(hoy.getDate()).padStart(2, '0');

  if (vencimiento > hoyStr) return 'vigente';      // Verde
  if (vencimiento === hoyStr) return 'por-vencer'; // Amarillo
  return 'vencido';                                // Rojo
}

// Total por moneda seleccionada
function totalPorMoneda(moneda) {
  return documentos.value
    .filter(d => d.selected && d.WAERS && getCurrencySymbol(d.WAERS) === getCurrencySymbol(moneda))
    .reduce((sum, d) => sum + Number(d.DMBTR || 0), 0);
}

function contarCxcNoVencidas() {
  return documentos.value.filter(doc => getEstadoDocumento(doc) !== 'vencido').length;
}
function contarCxcVencidas() {
  return documentos.value.filter(doc => getEstadoDocumento(doc) === 'vencido').length;
}


// Pendiente por moneda (sin filtrar por selección)
function pendientePorMoneda(moneda) {
  return documentos.value
    .filter(doc => doc.WAERS && getCurrencySymbol(doc.WAERS) === getCurrencySymbol(moneda))
    .reduce((sum, doc) => sum + Number(doc.DMBTR || 0), 0);
}
</script>