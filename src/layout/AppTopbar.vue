<script setup>
import { ref, onMounted, computed } from 'vue';
import { useAuthStore } from '@/api-plugins/authStores.js';
import { useLayout } from '@/layout/composables/layout';
import AppConfigurator from './AppConfigurator.vue';

const authStore = useAuthStore();
const { toggleMenu, toggleDarkMode, isDarkTheme, defaultSwal } = useLayout();

// Lógica para manejar el logout
const handleLogout = () => {
    authStore.logout();
};

// Computed para saber si es admin
const isAdmin = computed(() => authStore.user?.role === 'admin');
// Computed para saber si es cliente
const isClient = computed(() => authStore.user?.role === 'client' || !authStore.user?.role);
</script>

<template>
    <div class="layout-topbar">
        <div class="layout-topbar-logo-container flex items-center gap-2">
            <button class="layout-menu-button layout-topbar-action mr-2" @click="toggleMenu">
                <i class="pi pi-bars"></i>
            </button>
            <!-- Logo Lactolac -->

            <router-link v-if="isAdmin" to="/HomeAdmin" class="layout-topbar-logo ml-2">
                <img src="@/assets/images/logo.png" alt="Lactolac" class="h-8" />
            </router-link>
            <router-link v-else to="/HomeClient" class="layout-topbar-logo ml-2">
                <img src="@/assets/images/logo.png" alt="Lactolac" class="h-8" />
            </router-link>
        </div>

        <div class="layout-topbar-actions">
            <div class="layout-config-menu">
                <AppConfigurator />
                <div class="relative flex items-center gap-4">
                    <span v-if="isAdmin" class="font-bold topbar-text">
                        Administrador: {{ authStore.user?.username }}
                    </span>
                    <span v-else class="font-bold topbar-text">
                        Cliente: {{ authStore.user?.username }}
                    </span>
                    <button type="button" class="layout-topbar-action btn btn-danger" @click="handleLogout">
                        <i class="pi pi-power-off"></i>
                        <span class="ml-2 topbar-text">Cerrar Sesión</span>
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.layout-topbar {
    background: #0056A6;
    color: #fff;
    border-bottom: 4px solid #ff650f;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 1.5rem;
    min-height: 56px;
}

.layout-topbar-logo img {
    height: 32px;
}

/* Fuerza texto blanco y sombra para mejor visibilidad */
.topbar-text {
    color: #fff !important;
    text-shadow: 0 1px 4px rgba(0, 0, 0, 0.25);
}

/* Fuerza íconos blancos y sombra clara */
.layout-topbar .pi,
.layout-topbar-action .pi {
    color: #fff !important;
    text-shadow: 0 1px 4px rgba(0, 0, 0, 0.18), 0 0 2px #fff;
    font-size: 1.25rem;
}

.layout-topbar .pi:hover,
.layout-topbar-action .pi:hover {
    text-shadow:
        0 0 8px #ff650f,
        0 1px 4px rgba(0, 0, 0, 0.18),
        0 0 2px #fff;
    color: #fff !important;
    transition: text-shadow 0.2s;
}

.layout-topbar-action.btn.btn-danger {
    background: transparent !important;
    border: none !important;
    box-shadow: none !important;
    color: #fff !important;
    padding: 0.5rem 0.75rem;
    transition: background 0.2s;
}

.layout-topbar-action.btn.btn-danger:hover,
.layout-topbar-action.btn.btn-danger:focus {
    background: #ff650f !important;
    /* leve fondo naranja al hover */
    color: #fff !important;
    box-shadow: none !important;
}

.layout-menu-button {
    background: transparent !important;
    border: none !important;
    box-shadow: none !important;
    color: #fff !important;
    padding: 0.5rem 0.75rem;
    border-radius: 0.375rem;
    transition: background 0.2s;
}

.layout-menu-button:hover,
.layout-menu-button:focus {
    background: #ff650f !important;
    color: #fff !important;
    box-shadow: none !important;
}
</style>