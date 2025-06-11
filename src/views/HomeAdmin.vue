<script setup>
import { ref, onMounted, watch, computed } from 'vue';
import axios from 'axios';
import { useAuthStore } from "@/api-plugins/authStores";
import { useRouter } from "vue-router";
import { FilterMatchMode } from '@primevue/core/api';
import { useLayout } from "@/layout/composables/layout";

const { showAlert } = useLayout();

const authStore = useAuthStore();
const router = useRouter();

const users = ref([]);
const clientes = ref([]);
const pageClientes = ref(1);
const limitClientes = ref(100);
const hasMoreClientes = ref(true);
const searchClientes = ref('');
const loadingClientes = ref(false);
const loading = ref(false);

const dt = ref();
const selectedUsers = ref([]);
const filters = ref({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS }
});

const assignDialog = ref(false);
const userToAssign = ref(null);
const selectedKunnr = ref([]); // Múltiples clientes por usuario
const geoDialog = ref(false);
const geoUser = ref(null);

const createDialog = ref(false);
const newUser = ref({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
});

if (authStore.user?.role !== "admin") {
    router.replace({ name: "login" });
}

onMounted(async () => {
    loading.value = true;
    try {
        // Carga usuarios
        const usersRes = await axios.get("/api/admin/users", {
            headers: { Authorization: `Bearer ${authStore.token}` }
        });
        users.value = usersRes.data;

        // Carga todos los clientes (puedes ajustar el límite según tu cantidad real)
        const clientesRes = await axios.get("/api/admin/clientes", {
            params: { page: 1, limit: 50000 }, // Trae todos los clientes
            headers: { Authorization: `Bearer ${authStore.token}` }
        });
        clientes.value = clientesRes.data.map(c => ({
            ...c,
            displayName: `${c.kunnr} - ${c.name1 || ''} - ${c.name2 || ''}`
        }));

        // Asigna kunnr a cada usuario
        await Promise.all(
            users.value.map(async (user) => {
                try {
                    const res = await axios.get(`/api/admin/users/${user.id}/clientes`, {
                        headers: { Authorization: `Bearer ${authStore.token}` }
                    });
                    user.kunnr = res.data; // Guarda los objetos completos
                } catch (e) {
                    user.kunnr = [];
                }
            })
        );
    } catch (err) {
        showAlert({
            title: "Error",
            text: "Error cargando usuarios/clientes",
            icon: "error"
        });
    } finally {
        loading.value = false;
    }
});

async function cargarClientesDropdown(reset = false) {
    if (loadingClientes.value || (!hasMoreClientes.value && !reset)) return;
    loadingClientes.value = true;
    try {
        if (reset) {
            // Mantén los seleccionados aunque resetees
            const seleccionados = clientes.value.filter(c =>
                selectedKunnr.value.includes(c.kunnr)
            );
            clientes.value = [...seleccionados];
            pageClientes.value = 1;
            hasMoreClientes.value = true;
        }
        const res = await axios.get("/api/admin/clientes", {
            params: {
                page: pageClientes.value,
                limit: limitClientes.value,
                search: searchClientes.value
            },
            headers: { Authorization: `Bearer ${authStore.token}` }
        });
        if (res.data.length < limitClientes.value) hasMoreClientes.value = false;
        const nuevos = res.data.map(c => ({
            ...c,
            name2: c.name2 && c.name2.trim() ? c.name2 : (c.name1 || c.kunnr)
        }));
        // Mezcla sin duplicar
        clientes.value = [
            ...clientes.value,
            ...nuevos.filter(nuevo =>
                !clientes.value.some(existente => existente.kunnr === nuevo.kunnr)
            )
        ];
        pageClientes.value++;
    } catch (err) {
        showAlert({
            title: "Error",
            text: "Error cargando clientes",
            icon: "error"
        });
    } finally {
        loadingClientes.value = false;
    }
}

function onClienteScroll(e) {
    const list = e.originalEvent.target;
    if (list.scrollTop + list.clientHeight >= list.scrollHeight - 10) {
        cargarClientesDropdown();
    }
}

function onClienteFilter(event) {
    searchClientes.value = event.value;
    cargarClientesDropdown(true);
}

function openAssignDialog(user) {
    userToAssign.value = user;
    // IDs seleccionados
    selectedKunnr.value = (user.kunnr || []).map(c => typeof c === 'object' ? c.kunnr : c);

    // --- NUEVO: agrega los clientes asignados al array clientes si no están ---
    const asignados = (user.kunnr || []).map(c =>
        typeof c === 'object' ? c : clientes.value.find(cli => cli.kunnr === c)
    );
    asignados.forEach(asignado => {
        if (asignado && !clientes.value.some(cli => cli.kunnr === asignado.kunnr)) {
            clientes.value.push(asignado);
        }
    });

    assignDialog.value = true;
    searchClientes.value = '';
    cargarClientesDropdown(true);
}

async function asociarClientes() {
    try {
        await axios.post(
            `/api/admin/users/${userToAssign.value.id}/clientes`,
            { kunnr: selectedKunnr.value },
            { headers: { Authorization: `Bearer ${authStore.token}` } }
        );
        // Actualiza con los objetos completos
        userToAssign.value.kunnr = clientes.value.filter(c =>
            selectedKunnr.value.includes(c.kunnr)
        );
        assignDialog.value = false;
        showAlert({
            title: "¡Éxito!",
            text: "Clientes asociados correctamente",
            icon: "success"
        });
    } catch (err) {
        showAlert({
            title: "Error",
            text: "Error al asociar clientes",
            icon: "error"
        });
    }
}

// Confirmación de eliminación con showAlert
async function deleteUsers() {
    if (!selectedUsers.value?.length) return;

    // Confirmación
    const result = await showAlert({
        title: "¿Estás seguro que deseas eliminar este usuario?",
        text: "Esta acción no se puede deshacer.",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Sí, eliminar",
        cancelButtonText: "Cancelar"
    });

    // Si el usuario confirma (puede cambiar según tu implementación de showAlert)
    if (result?.isConfirmed) {
        for (const user of selectedUsers.value) {
            try {
                await axios.delete(`/api/admin/users/${user.id}`, {
                    headers: { Authorization: `Bearer ${authStore.token}` }
                });
            } catch (e) { }
        }
        users.value = users.value.filter(u => !selectedUsers.value.includes(u));
        selectedUsers.value = [];
        showAlert({
            title: "¡Eliminado!",
            text: "Usuarios eliminados",
            icon: "success"
        });
    }
}

function exportCSV() {
    dt.value.exportCSV();
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleString('es-SV', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function openGeoDialog(user) {
    geoUser.value = user;
    geoDialog.value = true;
}

// Mapa
watch([geoDialog, geoUser], ([dialogOpen, user]) => {
    if (dialogOpen && user && user.lat && user.lng) {
        // Espera a que el DOM esté listo
        setTimeout(() => {
            if (window.google && window.google.maps && document.getElementById('google-map')) {
                const map = new window.google.maps.Map(document.getElementById('google-map'), {
                    center: { lat: Number(user.lat), lng: Number(user.lng) },
                    zoom: 16,
                });
                new window.google.maps.Marker({
                    position: { lat: Number(user.lat), lng: Number(user.lng) },
                    map,
                    title: user.username,
                });
            }
        }, 200); // Da tiempo a que el diálogo y el div estén en el DOM
    }
});

const usersClientes = computed(() =>
    users.value
        .filter(u => u.role === 'client')
        .slice() // copia para no mutar el original
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
);

function openCreateDialog() {
    newUser.value = { username: '', email: '', password: '', confirmPassword: '' };
    createDialog.value = true;
}

async function crearUsuarioCliente() {
    if (!newUser.value.username || !newUser.value.email || !newUser.value.password) {
        showAlert({ title: "Error", text: "Todos los campos son obligatorios", icon: "error" });
        return;
    }
    if (newUser.value.password !== newUser.value.confirmPassword) {
        showAlert({ title: "Error", text: "Las contraseñas no coinciden", icon: "error" });
        return;
    }
    try {
        const res = await axios.post('/api/auth/register', {
            username: newUser.value.username,
            email: newUser.value.email,
            password: newUser.value.password,
            role: 'cliente'
        });
        // Si el backend responde con alreadyExists
        if (res.data?.alreadyExists) {
            showAlert({
                title: "Correo ya registrado",
                text: res.data.message || "El correo ya existe. Se ha enviado un correo para restablecer la contraseña.",
                icon: "warning"
            });
            createDialog.value = false;
            return;
        }
        users.value.push(res.data);
        createDialog.value = false;
        showAlert({ title: "¡Éxito!", text: "Usuario creado correctamente", icon: "success" });
    } catch (err) {
        showAlert({ title: "Error", text: "No se pudo crear el usuario", icon: "error" });
    }
}

function esUsuarioNuevo(fechaCreacion) {
    if (!fechaCreacion) return false;
    const hoy = new Date();
    const fecha = new Date(fechaCreacion);
    return (
        fecha.getDate() === hoy.getDate() &&
        fecha.getMonth() === hoy.getMonth() &&
        fecha.getFullYear() === hoy.getFullYear()
    );
}

function rowClassUsuario(user) {
    return esUsuarioNuevo(user.created_at) ? 'tr-usuario-nuevo' : '';
}
</script>

<template>
    <div class="p-6">
        <h2 class="text-2xl font-bold mb-4">Administración de Usuarios</h2>
        <Toolbar class="mb-6">
            <template #start>
                <Button label="Crear usuario" icon="pi pi-user-plus" @click="openCreateDialog" class="mr-2" />
                <Button label="Eliminar" icon="pi pi-trash" severity="secondary" @click="deleteUsers"
                    :disabled="!selectedUsers || !selectedUsers.length" class="mr-2" />
            </template>
            <template #end>
                <Button label="Exportar" icon="pi pi-upload" severity="secondary" @click="exportCSV($event)" />
            </template>
        </Toolbar>

        <div class="w-full overflow-x-auto hidden sm:block">
            <DataTable
                ref="dt"
                v-model:selection="selectedUsers"
                :value="usersClientes"
                dataKey="id"
                :filters="filters"
                :loading="loading"
                :rowClass="rowClassUsuario"
                responsiveLayout="scroll"
                class="text-xs sm:text-base lg:text-m min-w-[600px] sm:min-w-0"
            >
                <template #header>
                    <div class="flex flex-wrap gap-2 items-center justify-between">
                        <h4 class="m-0">Usuarios</h4>
                        <IconField>
                            <InputIcon>
                                <i class="pi pi-search" />
                            </InputIcon>
                            <InputText v-model="filters['global'].value" placeholder="Buscar..." />
                        </IconField>
                    </div>
                </template>

                <Column selectionMode="multiple" style="width: 3rem" :exportable="false"></Column>
                <Column field="username" header="Usuario" sortable style="min-width: 10rem"></Column>
                <Column field="email" header="Email" sortable style="min-width: 14rem"></Column>
                <Column field="kunnr" header="Clientes asignados" style="min-width: 14rem">
                    <template #body="slotProps">
                        <span v-if="slotProps.data.kunnr?.length">
                            {{
                                slotProps.data.kunnr
                                    .map(cliente => cliente.name2 && cliente.name2.trim() ? cliente.name2 : cliente.name1 ||
                                        cliente.kunnr)
                            .join(', ')
                            }}
                        </span>
                        <span v-else>Sin asociar</span>
                    </template>
                </Column>
                <Column header="Fecha de creación">
                    <template #body="slotProps">
                        {{ formatDate(slotProps.data.created_at) }}
                    </template>
                </Column>
                <Column :exportable="false" header="Acciones">
                    <template #body="slotProps">
                        <div class="flex flex-col gap-2 sm:flex-row">
                            <Button label="Asignar cliente(s)" icon="pi pi-user-plus" rounded size="small"
                                @click="openAssignDialog(slotProps.data)" />
                            <Button label="Ubicación" icon="pi pi-map-marker" rounded size="small" severity="info"
                                @click="openGeoDialog(slotProps.data)"
                                :disabled="!slotProps.data.lat || !slotProps.data.lng" />
                        </div>
                    </template>
                </Column>
            </DataTable>
        </div>

        <!-- Cards para móvil -->
        <div class="flex flex-col gap-4 sm:hidden mt-4">
  <div
    v-for="user in usersClientes"
    :key="user.id"
    class="bg-white rounded shadow p-4"
  >
    <div class="flex items-center justify-between mb-2">
      <div>
        <div class="font-bold text-[#0056A6] text-base">{{ user.username }}</div>
        <div class="text-xs text-gray-500">{{ user.email }}</div>
      </div>
      <span
        class="px-2 py-1 rounded text-xs"
        :class="esUsuarioNuevo(user.created_at) ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'"
      >
        {{ formatDate(user.created_at) }}
      </span>
    </div>
    <div class="mb-2">
      <span class="font-semibold text-xs">Clientes asignados:</span>
      <div class="text-xs text-gray-700">
        <span v-if="user.kunnr?.length">
          {{
            user.kunnr
              .map(cliente => cliente.name2 && cliente.name2.trim() ? cliente.name2 : cliente.name1 || cliente.kunnr)
              .join(', ')
          }}
        </span>
        <span v-else>Sin asociar</span>
      </div>
    </div>
    <div class="flex flex-col gap-2 mt-2">
      <Button label="Asignar cliente(s)" icon="pi pi-user-plus" rounded size="small"
        @click="openAssignDialog(user)" class="w-full" />
      <Button label="Ubicación" icon="pi pi-map-marker" rounded size="small" severity="info"
        @click="openGeoDialog(user)" :disabled="!user.lat || !user.lng" class="w-full" />
    </div>
  </div>
</div>

        <Dialog v-model:visible="assignDialog"
  :style="{ width: '95vw', maxWidth: '500px', padding: '0.5rem' }"
  header="Asignar cliente(s)"
  :modal="true"
>
            <div class="flex flex-col gap-4 py-4">
                <span class="font-semibold">Usuario: {{ userToAssign?.username }}</span>
                <MultiSelect v-model="selectedKunnr" :options="clientes" optionLabel="name2" optionValue="kunnr"
                    placeholder="Selecciona uno o más clientes" class="w-full" filter display="chip"
                    :loading="loadingClientes" @filter="onClienteFilter" @scroll="onClienteScroll" />
            </div>
            <template #footer>
                <Button label="Cancelar" icon="pi pi-times" text @click="assignDialog = false" />
                <Button label="Asignar" icon="pi pi-check" @click="asociarClientes" :disabled="!selectedKunnr.length" />
            </template>
        </Dialog>

        <Dialog v-model:visible="geoDialog" :style="{ width: '95vw', maxWidth: '1200px', minHeight: '80vh' }"
            header="Ubicación de registro" :modal="true">
            <div v-if="geoUser && geoUser.lat && geoUser.lng" style="height: 70vh;">
                <div class="mb-2 flex items-center gap-2">
                    <i class="pi pi-user" style="font-size: 1.2rem; color: #0056A6;" />
                    <span class="font-semibold">{{ geoUser.username }}</span>
                    <span class="text-gray-500 text-sm">({{ geoUser.email }})</span>
                </div>
                <!-- Google Map más grande -->
                <div id="google-map" style="height: 60vh; width: 100%; border-radius: 12px; overflow: hidden;"></div>
            </div>
            <div v-else>
                <p class="text-center text-gray-500">Este usuario no tiene geolocalización registrada.</p>
            </div>
        </Dialog>

        <!-- Diálogo para crear usuario -->
        <Dialog v-model:visible="createDialog"
  :style="{ width: '95vw', maxWidth: '400px', padding: '0.5rem' }"
  header="Crear usuario cliente"
  :modal="true"
>
            <div class="flex flex-col gap-4 py-4">
                <InputText v-model="newUser.username" placeholder="Nombre de usuario" class="w-full" />
                <InputText v-model="newUser.email" placeholder="Correo electrónico" class="w-full" />
                <Password v-model="newUser.password" placeholder="Contraseña" class="w-full" toggleMask />
                <Password v-model="newUser.confirmPassword" placeholder="Confirmar contraseña" class="w-full"
                    toggleMask />
            </div>
            <template #footer>
                <Button label="Cancelar" icon="pi pi-times" text @click="createDialog = false" />
                <Button label="Crear" icon="pi pi-check" @click="crearUsuarioCliente" />
            </template>
        </Dialog>
    </div>
</template>

<style>
/* Puedes poner esto al final del archivo o en tu CSS global */
.tr-usuario-nuevo {
  background-color: #bbf7d0 !important; /* Tailwind bg-green-100 */
}
</style>