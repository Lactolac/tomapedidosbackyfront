<script setup>
import { useAuthStore } from "@/api-plugins/authStores.js";
import { useLayout } from "@/layout/composables/layout";
import Button from "primevue/button";
import InputText from "primevue/inputtext";
import Password from "primevue/password";
import { ref, watch, onMounted } from "vue";
import { useRouter } from "vue-router";

const { showAlert } = useLayout();
const username = ref("");
const email = ref("");
const password = ref("");
const isLoading = ref(false);
const authStore = useAuthStore();
const router = useRouter();

const lat = ref(null);
const lng = ref(null);

onMounted(() => {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        lat.value = pos.coords.latitude;
        lng.value = pos.coords.longitude;
      },
      () => {
        lat.value = null;
        lng.value = null;
      }
    );
  }
});

const handleRegister = async () => {
  if (!username.value || !email.value || !password.value) {
    showAlert("Error", "Todos los campos son obligatorios", "error");
    return;
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.value)) {
    showAlert("Error", "Por favor, ingresa un correo electrónico válido", "error");
    return;
  }
  isLoading.value = true;
  try {
    await authStore.register(username.value, email.value, password.value, lat.value, lng.value);
    showAlert("Éxito", "Registro exitoso. Ahora puedes iniciar sesión.", "success");
    router.push("/auth/login");
  } catch (error) {
    showAlert("Error", "Hubo un problema con el registro. Intenta de nuevo.", "error");
  } finally {
    isLoading.value = false;
  }
};

const goToLogin = () => {
  router.push("/auth/login");
};

watch(username, (val) => {
  if (val) username.value = val.toUpperCase();
});
</script>

<template>
  <div class="min-h-screen min-w-[100vw] flex items-center justify-center bg-[#0056A6]">
    <div class="rounded-3xl shadow-lg bg-white py-12 px-8 sm:px-16 w-full max-w-md">
      <div class="text-center mb-8">
        <img
          src="@/assets/images/lactolac-logo.png"
          alt="Logo"
          class="mx-auto mb-4 w-50 h-24 object-contain"
        />
        <div class="text-[#0056A6] text-3xl font-bold mb-2">
          Crea tu cuenta
        </div>
        <span class="text-gray-600 font-medium">
          Completa los campos para registrarte
        </span>
      </div>
      <div>
        <label
          for="username"
          class="block text-[#0056A6] text-lg font-semibold mb-1"
        >Nombre de usuario</label>
        <InputText
          id="username"
          type="text"
          class="w-full mb-6"
          v-model="username"
        />

        <label
          for="email"
          class="block text-[#0056A6] text-lg font-semibold mb-1"
        >Correo electrónico</label>
        <InputText
          id="email"
          type="email"
          class="w-full mb-6"
          v-model="email"
        />

        <label
          for="password"
          class="block text-[#0056A6] font-semibold text-lg mb-1"
        >Contraseña</label>
        <Password
          id="password"
          v-model="password"
          :toggleMask="true"
          class="mb-4"
          fluid
          :feedback="false"
        />

        <Button
          label="Registrarse"
          class="w-full p-button-orange mb-4"
          :loading="isLoading"
          :disabled="isLoading"
          @click="handleRegister"
        />
        <Button
          label="Volver al inicio de sesión"
          class="w-full p-button-primary"
          @click="goToLogin"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.p-button-orange {
  background-color: #ff650f;
  border-color: #ff650f;
  color: #fff;
  font-weight: bold;
}
.p-button-orange:hover {
  background-color: #c2410c;
  border-color: #c2410c;
}
.p-button-primary {
  background-color: #0056A6;
  border-color: #0056A6;
  color: #fff;
  font-weight: bold;
}
.p-button-primary:hover {
  background-color: #003e7e;
  border-color: #003e7e;
}
#username,
#email,
#password {
  text-transform: none;
}
.pi-eye,
.pi-eye-slash {
  transform: scale(1.6);
  margin-right: 1rem;
}
</style>