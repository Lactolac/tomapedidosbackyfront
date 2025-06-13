<script setup>
import { ref, onMounted, computed } from 'vue';
import axios from 'axios';
import { useAuthStore } from "@/api-plugins/authStores";
import { useRouter } from "vue-router";
import { useLayout } from "@/layout/composables/layout";
import InputNumber from 'primevue/inputnumber';
import Button from 'primevue/button';
import { useToast } from 'primevue/usetoast';
import Dropdown from 'primevue/dropdown';

const toast = useToast();
const filtrosHistorial = ref({});
const clientesAsociados = ref([]);
const authStore = useAuthStore();
const router = useRouter();
const { showAlert } = useLayout();

const cantidades = ref({});
const cargando = ref(false);

if (authStore.user?.role !== "client") {
  router.replace({ name: "login" });
}

function getHistorialFiltrado(kunnr, historial) {
  const search = (filtrosHistorial.value[kunnr] || '').toLowerCase();
  if (!search) return historial;
  return historial.filter(prod =>
    (prod.arktx || '').toLowerCase().includes(search) ||
    (prod.matnr || '').toLowerCase().includes(search) ||
    (prod.bzirk || '').toLowerCase().includes(search)
  );
}

const cargarClienteYHistorial = async () => {
  cargando.value = true;
  try {
    const clientesRes = await axios.get(`/api/admin/users/${authStore.user.id}/clientes`, {
      headers: { Authorization: `Bearer ${authStore.token}` }
    });
    const historialRes = await axios.get(`/api/admin/users/${authStore.user.id}/historial`, {
      headers: { Authorization: `Bearer ${authStore.token}` }
    });

    const grouped = {};
    for (const entry of historialRes.data) {
      const kunag = entry.kunag;
      if (!grouped[kunag]) grouped[kunag] = [];
      if (!grouped[kunag].some(e => e.matnr === entry.matnr)) {
        grouped[kunag].push({
          ...entry,
          cantidad: 0
        });
      }
    }
    clientesRes.data.forEach(cliente => {
      cliente.historial = grouped[cliente.kunnr] || [];
      cliente.historial.forEach(prod => {
        cantidades.value[`${cliente.kunnr}-${prod.matnr}`] = 0;
      });
    });
    clientesAsociados.value = clientesRes.data;
  } catch (e) {
    clientesAsociados.value = [];
  } finally {
    cargando.value = false;
  }
};

const sugerenciasGrupo = ref([]);

async function cargarSugerenciasGrupo() {
  try {
    const res = await axios.get(`/api/admin/users/${authStore.user.id}/sugerencias-grupo`, {
      headers: { Authorization: `Bearer ${authStore.token}` }
    });
    sugerenciasGrupo.value = res.data;
  } catch (e) {
    sugerenciasGrupo.value = [];
  }
}

onMounted(() => {
  cargarClienteYHistorial();
  cargarSugerenciasGrupo();
  cargarPrecios();
});

function formatCurrency(value) {
  if (!value) return '';
  return value.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

const precios = ref([]);

async function cargarPrecios() {
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
  }
}

function getPrecioPorCodigo(matnr) {
  const precioObj = precios.value.find(p => String(p.PRODUCTO) === String(matnr));
  return precioObj ? precioObj.PRECIO : null;
}

function getSubtotalSucursal(kunnr, historial) {
  return (historial || []).reduce((sum, prod) => {
    const cant = cantidades.value[`${kunnr}-${prod.matnr}`] || 0;
    const precio = getPrecioPorCodigo(prod.matnr) || 0;
    return sum + (cant * precio);
  }, 0);
}

function tieneProductosSeleccionados(kunnr) {
  const cliente = clientesAsociados.value.find(c => c.kunnr === kunnr);
  if (!cliente) return false;
  return (cliente.historial || []).some(prod => (cantidades.value[`${kunnr}-${prod.matnr}`] || 0) > 0);
}

async function agregarAlCarrito(kunnr) {
  const cliente = clientesAsociados.value.find(c => c.kunnr === kunnr);
  if (!cliente) return;
  const productos = (cliente.historial || []).filter(prod => (cantidades.value[`${kunnr}-${prod.matnr}`] || 0) > 0)
    .map(prod => ({
      kunnr,
      matnr: prod.matnr,
      arktx: prod.arktx,
      cantidad: cantidades.value[`${kunnr}-${prod.matnr}`],
      precio: getPrecioPorCodigo(prod.matnr)
    }));
  if (!productos.length) {
    showAlert({ title: "Agrega cantidades", text: "Debes colocar cantidades antes de enviar.", icon: "warning" });
    return;
  }
  try {
    await axios.post('/api/pedidos/crear-pedidos', {
      usuario_id: authStore.user.id,
      productos
    }, {
      headers: { Authorization: `Bearer ${authStore.token}` }
    });
    showAlert({
      title: "¡Pedido realizado!",
      text: "Tu pedido fue enviado correctamente.",
      icon: "success"
    });
    (cliente.historial || []).forEach(prod => {
      cantidades.value[`${kunnr}-${prod.matnr}`] = 0;
    });
    cargarClienteYHistorial();
    setTimeout(() => {
      router.push({ name: "OrderList" });
    }, 700);
  } catch (e) {
    showAlert({
      title: "Error",
      text: "No se pudo enviar el pedido.",
      icon: "error"
    });
  }
}

const dialogSucursalVisible = ref(false);
const sucursalSeleccionada = ref(null);

function abrirSucursal(cliente) {
  sucursalSeleccionada.value = cliente;
  dialogSucursalVisible.value = true;
}

// Sugerencias: agregar directo o con dropdown
function agregarSugeridoDirecto(prod) {
  let cliente;
  if (clientesAsociados.value.length === 1) {
    cliente = clientesAsociados.value[0];
  } else {
    return;
  }
  if (cliente.historial.some(p => p.matnr === prod.matnr)) {
    toast.add({ severity: 'info', summary: 'Ya agregado', detail: 'Este producto ya está en el historial.', life: 2000 });
    return;
  }
  cliente.historial.push({ ...prod, cantidad: 0 });
  cantidades.value[`${cliente.kunnr}-${prod.matnr}`] = 0;
  toast.add({
    severity: 'success',
    summary: 'Producto agregado',
    detail: `El producto ${prod.arktx} está disponible para pedir en ${cliente.name1}.`,
    life: 2000
  });
}

function agregarSugeridoASucursal(prod, kunnr) {
  const cliente = clientesAsociados.value.find(c => c.kunnr === kunnr);
  if (!cliente) return;
  if (cliente.historial.some(p => p.matnr === prod.matnr)) {
    toast.add({ severity: 'info', summary: 'Ya agregado', detail: 'Este producto ya está en el historial.', life: 2000 });
    return;
  }
  cliente.historial.push({ ...prod, cantidad: 0 });
  cantidades.value[`${cliente.kunnr}-${prod.matnr}`] = 0;
  toast.add({
    severity: 'success',
    summary: 'Producto agregado',
    detail: `El producto ${prod.arktx} está disponible para pedir en ${cliente.name1}.`,
    life: 2000
  });
}
</script>

<template>
  <Toast />
  <!-- Banner superior tipo ecommerce moderno con 4 imágenes decorativas en mosaico -->
  <div class="w-full rounded-2xl overflow-hidden flex flex-col sm:flex-row items-center justify-between bg-gradient-to-br from-[#1166bb] to-[#3b82f6] shadow-lg mb-8 min-h-[180px] relative">
    <!-- Texto a la izquierda -->
    <div class="flex-1 flex flex-col justify-center px-8 py-8 z-10">
      <h1 class="text-3xl sm:text-4xl font-extrabold text-white mb-2">
        ¡Hola {{ (authStore.user?.username || 'CLIENTE').toUpperCase() }}!
      </h1>
      <p class="text-white text-lg sm:text-xl">
        Selecciona una sucursal para ver tu historial de compras y realizar tu pedido.
      </p>
    </div>
    <!-- Imágenes decorativas a la derecha, en grid 2x2 compacto -->
    <div class="hidden sm:grid grid-cols-2 grid-rows-2 gap-2 items-center justify-end pr-6 py-4 z-0">
      <img
        src="@/assets/images/banner.png"
        alt="Banner"
        class="object-cover rounded-xl shadow-lg w-32 h-16 opacity-70"
        style="max-width:120px; min-width:80px;"
      />
      <img
        src="@/assets/images/banner3.png"
        alt="Banner 3"
        class="object-cover rounded-xl shadow-lg w-32 h-16 opacity-70"
        style="max-width:120px; min-width:80px;"
      />
      <img
        src="@/assets/images/banner2.png"
        alt="Banner 2"
        class="object-cover rounded-xl shadow-lg w-32 h-16 opacity-70"
        style="max-width:120px; min-width:80px;"
      />
      <img
        src="@/assets/images/banner4.png"
        alt="Banner 4"
        class="object-cover rounded-xl shadow-lg w-32 h-16 opacity-70"
        style="max-width:120px; min-width:80px;"
      />
    </div>
  </div>

  <div class="container mx-auto px-2">
    <div v-if="cargando" class="text-lg text-center text-surface-400 my-12 flex flex-col items-center">
      <i class="pi pi-spin pi-spinner text-3xl mb-3 text-[#0056A6]"></i>
      Cargando sucursales y productos...
    </div>

    <!-- Grid de sucursales tipo catálogo -->
    <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
      <div
        v-for="cliente in clientesAsociados"
        :key="cliente.kunnr"
        class="bg-white rounded-xl shadow-lg p-6 flex flex-col items-start transition relative cursor-pointer group
               hover:shadow-2xl hover:border-2 hover:border-[#ff650f]"
        @click="abrirSucursal(cliente)"
        tabindex="0"
        title="Ver historial de compra"
        style="border: 2px solid transparent;"
      >
        <div class="flex items-center gap-3 mb-2">
          <div class="bg-[#0056A6] text-white rounded-full w-10 h-10 flex items-center justify-center font-bold text-lg">
            {{ cliente.name1?.charAt(0) || '?' }}
          </div>
          <div>
            <div class="font-bold text-[#0056A6] text-2xl">{{ cliente.name1 }}</div>
            <div class="text-base text-gray-500">Código: {{ cliente.kunnr }}</div>
          </div>
        </div>
        <div class="text-base text-gray-500 mb-1">Razón social: {{ cliente.name2 || '-' }}</div>
        <div class="text-base text-gray-500 mb-1">Teléfono: {{ cliente.telf1 && cliente.telf1.trim() ? cliente.telf1 : '-' }}</div>
        <div class="text-base text-gray-500 mb-1">Atiende: {{ cliente.sortl || '-' }}</div>
        <div class="text-base text-gray-500 mb-3">Ubicación: {{ cliente.stras || '-' }}</div>
        <div
          class="mt-auto w-full text-center font-semibold text-lg group-hover:text-[#ff650f] group-focus:text-[#ff650f] transition-colors"
        >
          Ver historial de compra
        </div>
      </div>
    </div>
  </div>

  <!-- Panel/modal de productos de sucursal -->
  <Dialog v-model:visible="dialogSucursalVisible" :style="{ width: '95vw', maxWidth: '700px' }" :modal="true" :closable="true">
    <template #header>
      <div class="flex flex-col">
        <span class="font-bold text-[#0056A6] text-lg">{{ sucursalSeleccionada?.name1 }}</span>
        <span class="text-xs text-gray-500">Código: {{ sucursalSeleccionada?.kunnr }}</span>
      </div>
    </template>
    <div>
      <div class="flex items-center gap-2 mb-3">
        <input v-model="filtrosHistorial[sucursalSeleccionada?.kunnr]" type="text" placeholder="Buscar producto"
          class="p-2 border rounded w-full" />
        <Button icon="pi pi-times" text v-if="filtrosHistorial[sucursalSeleccionada?.kunnr]"
          @click="filtrosHistorial[sucursalSeleccionada?.kunnr] = ''" title="Limpiar búsqueda" />
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[50vh] overflow-y-auto">
        <div
          v-for="prod in getHistorialFiltrado(sucursalSeleccionada?.kunnr, sucursalSeleccionada?.historial)"
          :key="prod.matnr"
          class="bg-blue-50 rounded shadow p-3 flex flex-col"
        >
          <div class="font-bold text-[#0056A6] text-xs truncate">{{ prod.arktx }}</div>
          <div class="text-xs text-gray-500">Código: {{ prod.matnr }}</div>
          <div class="flex items-center gap-1 mt-1">
            <InputNumber
              v-model="cantidades[`${sucursalSeleccionada?.kunnr}-${prod.matnr}`]"
              :min="0"
              showButtons
              buttonLayout="horizontal"
              inputStyle="width: 60px"
              class="w-full"
            />
            <span class="ml-auto text-xs font-semibold">
              {{ formatCurrency(getPrecioPorCodigo(prod.matnr)) }}
            </span>
          </div>
        </div>
      </div>
      <div v-if="!getHistorialFiltrado(sucursalSeleccionada?.kunnr, sucursalSeleccionada?.historial)?.length" class="text-xs text-gray-400 mt-2">
        No hay historial para esta sucursal o no hay coincidencias en la búsqueda.
      </div>
      <div class="flex justify-between items-center mt-4">
        <span v-if="getSubtotalSucursal(sucursalSeleccionada?.kunnr, sucursalSeleccionada?.historial) > 0" class="font-bold text-lg text-[#0056A6]">
          Subtotal: {{ formatCurrency(getSubtotalSucursal(sucursalSeleccionada?.kunnr, sucursalSeleccionada?.historial)) }}
        </span>
        <Button label="Realizar pedido" icon="pi pi-check"
          @click="agregarAlCarrito(sucursalSeleccionada?.kunnr)"
          :disabled="!tieneProductosSeleccionados(sucursalSeleccionada?.kunnr)" />
      </div>
    </div>
  </Dialog>

  <!-- Sugerencias de productos -->
  <div v-if="sugerenciasGrupo.length" class="mt-12">
    <h2 class="text-2xl font-bold mb-4 text-[#0056A6]">
      Productos que podrían interesarte y que tu competencia ya está comprando!.
    </h2>
    <p class="mb-4 text-gray-600 text-lg">
      Si algún producto sugerido es de tu interés, selecciónalo y agrégalo a la sucursal donde deseas pedirlo.
    </p>
    <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
      <div
        v-for="prod in sugerenciasGrupo"
        :key="prod.matnr"
        class="bg-white rounded-xl shadow p-4 flex flex-col items-center transition cursor-pointer group
               hover:shadow-2xl hover:border-2 hover:border-[#ff650f]"
        style="border: 2px solid transparent;"
      >
        <div class="font-bold text-[#0056A6] text-center mb-1 text-xl transition-colors group-hover:text-[#ff650f]">
          {{ prod.arktx }}
        </div>
        <div class="text-base text-gray-500 mb-1">Código: {{ prod.matnr }}</div>
        <div class="text-base text-gray-500 mb-1">Comprado {{ prod.total }} veces</div>
        <div class="text-lg text-gray-700 mb-2">
          Precio: {{ formatCurrency(getPrecioPorCodigo(prod.matnr)) }}
        </div>
        <Dropdown
          v-if="clientesAsociados.length > 1"
          :options="clientesAsociados"
          optionLabel="name1"
          optionValue="kunnr"
          placeholder="Agregar a sucursal"
          class="w-full"
          @change="val => agregarSugeridoASucursal(prod, val.value)"
        />
        <Button
          v-else
          label="Agregar a sucursal"
          icon="pi pi-plus"
          size="small"
          @click.stop="agregarSugeridoDirecto(prod)"
        />
      </div>
    </div>
    <div class="text-base text-gray-400 mt-2">
      <!-- Solo mensaje de éxito se muestra al agregar, no mensajes de expandir -->
    </div>
  </div>
</template>