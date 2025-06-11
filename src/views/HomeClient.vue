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
const expandedRows = ref([]);
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

// Nuevo método: Enviar pedido directamente al backend
async function enviarPedidoDirecto() {
  if (!productosSeleccionados.value.length) {
    showAlert({ title: "Agrega cantidades", text: "Debes colocar cantidades antes de enviar.", icon: "warning" });
    return;
  }
  try {
    await axios.post('/api/pedidos/crear-pedidos', {
      usuario_id: authStore.user.id,
      productos: productosSeleccionados.value
    }, {
      headers: { Authorization: `Bearer ${authStore.token}` }
    });
    showAlert({
      title: "¡Pedido realizado!",
      text: "Tu pedido fue enviado correctamente.",
      icon: "success"
    });
    // Limpia cantidades
    Object.keys(cantidades.value).forEach(key => cantidades.value[key] = 0);
    cargarClienteYHistorial(); // Refresca datos si lo deseas

    // Redireccionar a la pantalla de orderlist
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
</script>

<template>
  <Toast />
  <div class="card">
    <DataTable v-model:expandedRows="expandedRows" :value="clientesAsociados" dataKey="kunnr"
      tableStyle="min-width: 60rem">
      <template #header>
        <div class="font-semibold text-xl mb-4">Sucursales y Pedidos</div>
      </template>
      <Column expander style="width: 5rem" />
      <Column field="kunnr" header="Código"></Column>
      <Column field="name1" header="Nombre"></Column>
      <Column field="name2" header="Razon social"></Column>
      <Column field="telf1" header="Telefono">
        <template #body="slotProps">
          {{ slotProps.data.telf1 && slotProps.data.telf1.trim() ? slotProps.data.telf1 : '-' }}
        </template>
      </Column>
      <Column field="sortl" header="Atiende"></Column>
      <Column field="stras" header="Ubicación"></Column>

      <!-- Slot para mostrar mensaje si no hay clientes -->
      <template #empty>
        <div v-if="cargando" class="flex flex-col items-center py-8 text-lg text-gray-500">
          <i class="pi pi-spin pi-spinner text-3xl mb-3 text-[#0056A6]"></i>
          Cargando sucursales...
        </div>
        <div v-else class="text-center py-8 text-lg text-gray-500 flex flex-col items-center">
          <img
            src="https://img.icons8.com/?size=100&id=q3Sat36CVkrd&format=png&color=000000"
            alt="Beginner Icon"
            style="width: 48px; height: 48px; margin-bottom: 12px;"
          />
          No tienes sucursales asignadas.<br>
          Pronto el equipo de LACTOLAC se comunicará con usted para validar su registro y asignarle su código.
        </div>
      </template>

      <template #expansion="slotProps">
        <div class="p-4">
          <div class="flex items-center gap-4 mb-3">
            <strong>
              <h5 class="mb-0">Historial de Productos {{ slotProps.data.name1 }}</h5>
            </strong>
            <input v-model="filtrosHistorial[slotProps.data.kunnr]" type="text" placeholder="Buscar producto"
              class="p-2 border rounded max-w-xs" />
            <Button icon="pi pi-times" text v-if="filtrosHistorial[slotProps.data.kunnr]"
              @click="filtrosHistorial[slotProps.data.kunnr] = ''" title="Limpiar búsqueda" />      
          </div>
          <DataTable :value="getHistorialFiltrado(slotProps.data.kunnr, slotProps.data.historial)"
            tableStyle="min-width:40rem">
            <Column field="arktx" header="Producto"></Column>
            <Column field="matnr" header="Código Prod."></Column>
            <Column header="Cantidad">
              <template #body="prodProps">
                <InputNumber v-model="cantidades[`${slotProps.data.kunnr}-${prodProps.data.matnr}`]" :min="0"
                  showButtons buttonLayout="horizontal" inputStyle="width: 80px" />
              </template>
            </Column>
            <Column header="Precio">
              <template #body="prodProps">
                {{ formatCurrency(getPrecioPorCodigo(prodProps.data.matnr)) }}
              </template>
            </Column>
          </DataTable>
          <span v-if="!getHistorialFiltrado(slotProps.data.kunnr, slotProps.data.historial).length">
            No hay historial para este cliente o no hay coincidencias en la búsqueda.
          </span>
          <!-- Subtotal -->
          <div class="flex justify-end mt-2" v-if="getSubtotalSucursal(slotProps.data.kunnr, slotProps.data.historial) > 0">
            <span class="font-bold text-lg text-[#0056A6]">
              Subtotal: {{ formatCurrency(getSubtotalSucursal(slotProps.data.kunnr, slotProps.data.historial)) }}
            </span>
          </div>
        </div>
      </template>
    </DataTable>
<div class="flex justify-end mt-4">
      <Button label="Agregar al carrito" icon="pi pi-check" @click="enviarPedidoDirecto"
        :disabled="!productosSeleccionados.length" />
    </div>
    <div v-if="sugerenciasGrupo.length" class="mb-6">
      <div class="font-semibold text-lg mb-2 text-[#0056A6]">
        Productos que podrían interesarte y que tu competencia ya está comprando.
      </div>
      <div class="flex flex-wrap gap-4">
        <div
          v-for="prod in sugerenciasGrupo"
          :key="prod.matnr"
          class="bg-white rounded shadow p-3 flex flex-col items-center w-48 cursor-pointer hover:bg-blue-50 transition"
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