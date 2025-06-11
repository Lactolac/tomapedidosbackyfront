<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "@/api-plugins/authStores.js";
import { useLayout } from "@/layout/composables/layout";
import InputText from "primevue/inputtext";
import Button from "primevue/button";

const { showAlert } = useLayout();
const router = useRouter();
const authStore = useAuthStore();

const email = ref("");
const isLoading = ref(false);

const handleRequestResetPassword = async () => {
  if (!email.value) {
    showAlert("Error", "El correo es obligatorio", "error");
    return;
  }
  isLoading.value = true;
  try {
    const response = await authStore.requestPasswordReset(email.value.trim());
    if (response.status === 200) {
      showAlert({
        title: "Correo enviado",
        text:
          response.data?.message ||
          "Revisa tu correo electrónico para restablecer tu contraseña.",
        icon: "success",
        confirmButtonText: "Entendido",
      });
      router.push("/auth/login");
    }
    // El store ya muestra el mensaje y puede redirigir si quieres
    // Si quieres redirigir solo en éxito, hazlo en el store después del showAlert de éxito
  } finally {
    isLoading.value = false;
  }
};
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
          Solicitar Restablecimiento de Contraseña
        </div>
        <span class="text-gray-600 font-medium">
          Ingresa tu correo para recibir un enlace de restablecimiento
        </span>
      </div>
      <div>
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

        <Button
          label="Solicitar Restablecimiento"
          class="w-full p-button-orange mb-4"
          :loading="isLoading"
          :disabled="isLoading"
          @click="handleRequestResetPassword"
        />
        <Button
          label="Volver al login"
          class="w-full p-button-primary"
          @click="() => router.push('/auth/login')"
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
#email {
  text-transform: none;
}
</style>