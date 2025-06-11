<script setup>
import { ref, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useAuthStore } from "@/api-plugins/authStores.js";
import { useLayout } from "@/layout/composables/layout";
import Password from "primevue/password";
import Button from "primevue/button";

const { showAlert } = useLayout();
const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();

const token = ref("");
const newPassword = ref("");
const confirmPassword = ref("");
const isLoading = ref(false);

onMounted(() => {
  token.value = route.query.token || "";
  if (!token.value) {
    showAlert("Error", "Token inválido o ausente", "error");
    router.push("/auth/login");
  }
});

const handleResetPassword = async () => {
  if (!newPassword.value || !confirmPassword.value) {
    showAlert("Error", "Todos los campos son obligatorios", "error");
    return;
  }
  if (newPassword.value !== confirmPassword.value) {
    showAlert("Error", "Las contraseñas no coinciden", "error");
    return;
  }
  isLoading.value = true;
  try {
    await authStore.confirmPasswordReset(token.value, newPassword.value);
    showAlert("Éxito", "Tu contraseña ha sido actualizada correctamente", "success");
    router.push("/auth/login");
  } catch (error) {
    showAlert("Error", "Hubo un problema al restablecer la contraseña. Intenta de nuevo.", "error");
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
          Restablece tu contraseña
        </div>
        <span class="text-gray-600 font-medium">
          Ingresa tu nueva contraseña para continuar
        </span>
      </div>
      <div>
        <label
          for="newPassword"
          class="block text-[#0056A6] font-semibold text-lg mb-1"
        >Nueva contraseña</label>
        <Password
          id="newPassword"
          v-model="newPassword"
          :toggleMask="true"
          class="mb-4"
          fluid
          :feedback="false"
        />

        <label
          for="confirmPassword"
          class="block text-[#0056A6] font-semibold text-lg mb-1"
        >Confirmar nueva contraseña</label>
        <Password
          id="confirmPassword"
          v-model="confirmPassword"
          :toggleMask="true"
          class="mb-4"
          fluid
          :feedback="false"
        />

        <Button
          label="Restablecer contraseña"
          class="w-full p-button-orange mb-4"
          :loading="isLoading"
          :disabled="isLoading"
          @click="handleResetPassword"
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
#newPassword,
#confirmPassword {
  text-transform: none;
}
.pi-eye,
.pi-eye-slash {
  transform: scale(1.6);
  margin-right: 1rem;
}
</style>