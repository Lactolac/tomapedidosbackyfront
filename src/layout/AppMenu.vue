<script setup>
import { ref, computed } from "vue";
import AppMenuItem from "./AppMenuItem.vue";
import { useAuthStore } from "@/api-plugins/authStores";

const authStore = useAuthStore();

const clientMenu = [
  {
    label: "Inicio",
    items: [
      {
        label: "Inicio",
        icon: "pi pi-fw pi-home",
        to: { name: "HomeClient" },
      },
      {
        label: "Lista de pedidos",
        icon: "pi pi-fw pi-shopping-bag",
        to: { name: "OrderList" },
      },
      {
        label: "Lista de productos",
        icon: "pi pi-fw pi-th-large",
        to: { name: "OrderList" },
      },
    {
        label: "Historial de compras",
        icon: "pi pi-fw pi-dollar",
        to: { name: "OrderList" },
      },
      {
        label: "Estado de cuenta",
        icon: "pi pi-fw pi-money-bill",
        to: { name: "OrderList" },
        title: "Visualiza y paga tus facturas aquí",
      },
      {
        label: "Promociones",
        icon: "pi pi-fw pi-shopping-bag",
        to: { name: "OrderList" },
      },
      

    ],
  },
];

const adminMenu = [
  {
    label: "Admin",
    items: [
      {
        label: "Panel Admin",
        icon: "pi pi-fw pi-users",
        to: { name: "HomeAdmin" },
      },
      // Puedes agregar más ítems de admin aquí
    ],
  },
];

const model = computed(() => {
  if (authStore.user?.role === "admin") {
    return adminMenu;
  }
  // Por defecto, menú cliente
  return clientMenu;
});
</script>

<template>
  <ul class="layout-menu">
    <template v-for="(item, i) in model" :key="item.label">
      <AppMenuItem
        v-if="!item.separator"
        :item="item"
        :index="i"
      />
      <li v-if="item.separator" class="menu-separator" ></li>
    </template>
  </ul>
</template>
