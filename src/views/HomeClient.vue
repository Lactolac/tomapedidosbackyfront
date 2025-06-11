<script setup>
import { ref, onMounted, computed } from 'vue';
import axios from 'axios';
import { useAuthStore } from "@/api-plugins/authStores";
import { useRouter } from "vue-router";
import { useLayout } from "@/layout/composables/layout";
import InputNumber from 'primevue/inputnumber';
import Button from 'primevue/button';
import { useToast } from 'primevue/usetoast';

const toast = useToast();
const filtrosHistorial = ref({}); // key: kunnr, value: string de búsqueda
const clientesAsociados = ref([]);
const expandedRows = ref({});
const authStore = useAuthStore();
const router = useRouter();
const { showAlert } = useLayout();

const cantidades = ref({}); // key: `${kunnr}-${matnr}` value: cantidad
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

    // Agrupa los productos/historial por cliente
    const grouped = {};
    for (const entry of historialRes.data) {
      const kunag = entry.kunag;
      if (!grouped[kunag]) grouped[kunag] = [];
      // Solo agrega si no existe ya ese matnr para ese cliente
      if (!grouped[kunag].some(e => e.matnr === entry.matnr)) {
        grouped[kunag].push({
          ...entry,
          cantidad: 0 // Para v-model
        });
      }
    }
    clientesRes.data.forEach(cliente => {
      cliente.historial = grouped[cliente.kunnr] || [];
      // Inicializa cantidades por producto
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
  cargarPrecios(); // <-- agrega esta línea
});

// Computed: productos seleccionados para el pedido (no repetir mismo producto/cliente)
const productosSeleccionados = computed(() => {
  const map = new Map();
  clientesAsociados.value.forEach(cliente => {
    (cliente.historial || []).forEach(prod => {
      const cant = cantidades.value[`${cliente.kunnr}-${prod.matnr}`];
      if (cant && cant > 0) {
        const key = `${cliente.kunnr}-${prod.matnr}`;
        map.set(key, {
          kunnr: cliente.kunnr,
          name1: cliente.name1,
          name2: cliente.name2,
          matnr: prod.matnr,
          arktx: prod.arktx,
          cantidad: cant,
          image: prod.image || null,
          sortl: cliente.sortl || "" // <-- AGREGADO sortl
        });
      }
    });
  });
  return Array.from(map.values());
});

// Para formato de moneda si tienes precio
function formatCurrency(value) {
  if (!value) return '';
  return value.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

function agregarSugeridoAlExpandido(producto) {
  const kunnrExpandido = Object.keys(expandedRows.value).find(k => expandedRows.value[k]);
  if (!kunnrExpandido) {
    toast.add({ severity: 'warn', summary: 'Selecciona una sucursal', detail: 'Expande una sucursal para agregar el producto.', life: 2500 });
    return;
  }
  const cliente = clientesAsociados.value.find(c => c.kunnr === kunnrExpandido);
  if (!cliente) return;
  if (cliente.historial.some(p => p.matnr === producto.matnr)) {
    toast.add({ severity: 'info', summary: 'Ya agregado', detail: 'Este producto ya está en tu historial.', life: 2000 });
    return;
  }
  cliente.historial.push({
    ...producto,
    cantidad: 0
  });
  cantidades.value[`${cliente.kunnr}-${producto.matnr}`] = 0;
  toast.add({
    severity: 'success',
    summary: 'Producto agregado',
    detail: `El producto ${producto.arktx} está disponible para pedir en ${cliente.name1}.`,
    life: 2000
  });
}

const precios = ref([]); // [{ PRODUCTO: '140280', PRECIO: 12.5 }, ...]

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

function toggleExpand(kunnr) {
  // Solo permite expandir una sucursal a la vez (opcional)
  Object.keys(expandedRows.value).forEach(k => expandedRows.value[k] = false);
  expandedRows.value[kunnr] = !expandedRows.value[kunnr];
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
      precio: getPrecioPorCodigo(prod.matnr) // <-- AGREGA ESTA LÍNEA
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
    // Limpia cantidades solo de esta sucursal
    (cliente.historial || []).forEach(prod => {
      cantidades.value[`${kunnr}-${prod.matnr}`] = 0;
    });
    // Opcional: refresca datos
    cargarClienteYHistorial();
    // Opcional: redirige
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
</script>

<template>
  <Toast />
  <div class="card">
    <div v-if="cargando" class="text-lg text-center text-surface-400 my-12 flex flex-col items-center">
      <i class="pi pi-spin pi-spinner text-3xl mb-3 text-[#0056A6]"></i>
      Cargando sucursales y productos...
    </div>
    <div v-else class="flex flex-col gap-4">
      <h2 class="text-2xl font-bold mb-4">Sucursales asociadas</h2>
      <div
        v-for="cliente in clientesAsociados"
        :key="cliente.kunnr"
        class="bg-white rounded shadow p-3"
      >
        <!-- Cabecera sucursal -->
        <div class="flex items-center justify-between cursor-pointer" @click="toggleExpand(cliente.kunnr)">
          <div>
            <div class="font-bold text-[#0056A6]">{{ cliente.name1 }}</div>
            <div class="text-s text-gray-500">Código: {{ cliente.kunnr }}</div>
            <div class="text-s text-gray-500">Razón social: {{ cliente.name2 || '-' }}</div>
            <div class="text-s text-gray-500">Teléfono: {{ cliente.telf1 && cliente.telf1.trim() ? cliente.telf1 : '-' }}</div>
            <div class="text-s text-gray-500">Atiende: {{ cliente.sortl || '-' }}</div>
            <div class="text-s text-gray-500">Ubicación: {{ cliente.stras || '-' }}</div>
          </div>
          <Button :icon="expandedRows[cliente.kunnr] ? 'pi pi-chevron-up' : 'pi pi-chevron-down'" text />
        </div>
        <!-- Contenido expandido -->
        <div v-if="expandedRows[cliente.kunnr]" class="mt-3">
          <div class="flex items-center gap-4 mb-3 flex-wrap">
            <h5 class="mb-0 font-semibold">Historial de Productos</h5>
            <input v-model="filtrosHistorial[cliente.kunnr]" type="text" placeholder="Buscar producto"
              class="p-2 border rounded max-w-xs" />
            <Button icon="pi pi-times" text v-if="filtrosHistorial[cliente.kunnr]"
              @click.stop="filtrosHistorial[cliente.kunnr] = ''" title="Limpiar búsqueda" />
          </div>
          <!-- Productos historial -->
          <div class="flex gap-4 overflow-x-auto pb-2">
            <div
              v-for="prod in getHistorialFiltrado(cliente.kunnr, cliente.historial)"
              :key="prod.matnr"
              class="bg-blue-50 rounded shadow p-2 min-w-[200px] flex-shrink-0 flex flex-col"
            >
              <div class="font-bold text-[#0056A6] text-xs truncate">{{ prod.arktx }}</div>
              <div class="text-xs text-gray-500">Código: {{ prod.matnr }}</div>
              <div class="flex items-center gap-1 mt-1">
                <InputNumber
                  v-model="cantidades[`${cliente.kunnr}-${prod.matnr}`]"
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
          <div v-if="!getHistorialFiltrado(cliente.kunnr, cliente.historial).length" class="text-xs text-gray-400 mt-2">
            No hay historial para esta sucursal o no hay coincidencias en la búsqueda.
          </div>
          <!-- Subtotal y botón -->
          <div class="flex justify-between items-center mt-2">
            <span v-if="getSubtotalSucursal(cliente.kunnr, cliente.historial) > 0" class="font-bold text-lg text-[#0056A6]">
              Subtotal: {{ formatCurrency(getSubtotalSucursal(cliente.kunnr, cliente.historial)) }}
            </span>
            <Button label="Agregar al carrito" icon="pi pi-check" size="small"
              @click.stop="agregarAlCarrito(cliente.kunnr)"
              :disabled="!tieneProductosSeleccionados(cliente.kunnr)" />
          </div>
        </div>
      </div>
    </div>

    <!-- Sugerencias -->
    <div v-if="sugerenciasGrupo.length" class="mb-6 mt-8">
      <div class="font-semibold text-lg mb-2 text-[#0056A6]">
        Productos que podrían interesarte y que tu competencia ya está comprando.
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div
          v-for="prod in sugerenciasGrupo"
          :key="prod.matnr"
          class="bg-white rounded shadow p-3 flex flex-col items-center cursor-pointer hover:bg-blue-50 transition"
          @click="agregarSugeridoAlExpandido(prod)"
          :title="'Agregar este producto a tu sucursal que este expandida'"
        >
          <span class="font-bold text-[#0056A6] text-center">{{ prod.arktx }}</span>
          <span class="text-xs text-gray-500 mb-2">Código: {{ prod.matnr }}</span>
          <span class="text-sm text-gray-700">Comprado {{ prod.total }} veces</span>
          <span class="text-sm text-gray-700">
            Precio: {{ formatCurrency(getPrecioPorCodigo(prod.matnr)) }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>