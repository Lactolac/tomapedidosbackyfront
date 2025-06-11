<script setup>
import { useAuthStore } from "@/api-plugins/authStores.js";
import { useLayout } from "@/layout/composables/layout";
import { ref, onMounted, watch } from "vue";
import { useRouter } from "vue-router";

const { showAlert } = useLayout();
const username = ref("");
const password = ref("");
const isLoading = ref(false);
const authStore = useAuthStore();
const router = useRouter();

const handleLogin = async () => {
  if (!username.value || !password.value) {
    showAlert("Error", "Todos los campos son obligatorios", "error");
    return;
  }
  isLoading.value = true;
  try {
    await authStore.login(username.value.trim(), password.value.trim());
  } catch (error) {
    const errorMessage =
      error.response?.data?.message ||
      "Hubo un problema con el inicio de sesión. Intenta de nuevo.";
    showAlert("Error", errorMessage, "error");
  } finally {
    isLoading.value = false;
  }
};

const goToRegister = () => {
  router.push("/auth/register");
};
const goToResetPassword = () => {
  router.push("/auth/reset-password");
};

// Forzar modo claro en login
onMounted(() => {
  document.documentElement.classList.remove('app-dark');
});

watch(username, (val) => {
  if (val) username.value = val.toUpperCase();
});

const showFb = ref(false);
const showIg = ref(false);
const showYt = ref(false);
const showWp = ref(false);

function hideAllPopovers() {
  showFb.value = false;
  showIg.value = false;
  showYt.value = false;
  showWp.value = false;
}

const promoIndex = ref(0);
</script>

<template>
  <div class="fixed inset-0 min-h-screen min-w-[100vw] flex items-center justify-center bg-[#f3f6fa] py-0 overflow-hidden">
    <div class="flex flex-col md:flex-row bg-white rounded-3xl shadow-2xl overflow-hidden max-w-6xl w-full my-20">
      <!-- Lado izquierdo: Imagen y texto -->
      <div class="hidden md:flex md:w-1/2 flex-col justify-center items-center bg-gradient-to-br from-[#0056A6] to-[#3b82f6] p-10">
        <div class="text-white text-3xl font-bold mb-4 leading-tight text-left w-full">
          ¡Bienvenido a Lactolac!
        </div>
        <img
          src="@/assets/images/promo.jpg"
          alt="Promoción"
          class="object-contain w-full max-h-72 drop-shadow-xl rounded-xl"
        />
        <div class="text-white text-base mb-8 w-full text-left">
          Ordena tus productos favoritos de manera fácil y rápida.<br>
          Plataforma exclusiva para clientes.
        </div>
      </div>
      <!-- Lado derecho: Login -->
      <div class="w-full md:w-7/12 flex flex-col justify-center px-8 py-12">
        <div class="flex flex-col items-center mb-8">
          <img
            src="@/assets/images/lactolac-logo.png"
            alt="Logo"
            class="mb-4 w-80 h-20 object-contain"
          />
          <div class="text-[#0056A6] text-2xl font-bold mb-2 text-center">
            Inicia sesión en tu cuenta
          </div>
          <span class="text-gray-600 font-medium text-center">
            Ingresa tus credenciales o regístrate
          </span>
        </div>
        <label
          for="username"
          class="block text-[#0056A6] text-base font-semibold mb-1"
        >Nombre de usuario</label>
        <InputText
          id="username"
          type="text"
          class="w-full mb-4"
          v-model="username"
        />

        <label
          for="password"
          class="block text-[#0056A6] font-semibold text-base mb-1"
        >Contraseña</label>
        <Password
          id="password"
          v-model="password"
          :toggleMask="true"
          class="mb-2"
          fluid
          :feedback="false"
          @keyup.enter="handleLogin"
        />

        <div class="mb-6 text-right">
          <a
            href="#"
            class="forgot-link"
            @click.prevent="goToResetPassword"
          >¿Has olvidado tu contraseña?</a>
        </div>

        <Button
          label="Iniciar Sesión"
          class="w-full p-button-orange mb-4"
          :loading="isLoading"
          :disabled="isLoading"
          @click="handleLogin"
        />
        <Button
          label="Registrarse"
          class="w-full p-button-primary"
          @click="goToRegister"
        />

        <!-- Línea divisoria y login social opcional -->
        <div class="flex items-center my-6">
          <div class="flex-grow border-t border-gray-300"></div>
          <span class="mx-4 text-gray-400 text-sm">Conocenos o contactanos</span>
          <div class="flex-grow border-t border-gray-300"></div>
        </div>
        <div class="flex gap-4 justify-center">
          <!-- Facebook -->
          <div class="relative">
            <button
              class="rounded-full border border-[#0056A6] p-2 bg-white hover:bg-[#f3f6fa] transition"
              @mouseenter="showFb = true"
              @mouseleave="showFb = false"
              @focus="showFb = true"
              @blur="showFb = false"
              aria-label="Facebook"
              type="button"
            >
              <i class="pi pi-facebook text-2xl"></i>
            </button>
            <div
              v-if="showFb"
              class="absolute left-1/2 -translate-x-1/2 top-12 z-50 bg-white rounded-xl shadow-lg p-3 text-sm min-w-[180px] text-[#0056A6] border"
              @mouseenter="showFb = true"
              @mouseleave="showFb = false"
            >
              <div class="font-bold mb-1">Facebook</div>
              <div class="flex flex-col gap-1 text-left">
                <a href="https://www.facebook.com/LactolacCentroamerica/" target="_blank">Lactolac</a>
              </div>
            </div>
          </div>
          <!-- Instagram -->
          <div class="relative">
            <button
              class="rounded-full border border-[#0056A6] p-2 bg-white hover:bg-[#f3f6fa] transition"
              @mouseenter="showIg = true"
              @mouseleave="showIg = false"
              @focus="showIg = true"
              @blur="showIg = false"
              aria-label="Instagram"
              type="button"
            >
              <i class="pi pi-instagram text-2xl"></i>
            </button>
            <div
              v-if="showIg"
              class="absolute left-1/2 -translate-x-1/2 top-12 z-50 bg-white rounded-xl shadow-lg p-3 text-sm min-w-[150px] text-[#0056A6] border"
              @mouseenter="showIg = true"
              @mouseleave="showIg = false"
            >
              <div class="font-bold mb-1">Instagram</div>
              <div class="flex flex-col gap-1 text-left">
                <a href="https://www.instagram.com/yogurtyes/" target="_blank">@yogurtyes</a>
                <a href="https://www.instagram.com/quesoslactolac/" target="_blank">@quesoslactolac</a>
              </div>
            </div>
          </div>
          <!-- YouTube -->
          <div class="relative">
            <button
              class="rounded-full border border-[#0056A6] p-2 bg-white hover:bg-[#f3f6fa] transition"
              @mouseenter="showYt = true"
              @mouseleave="showYt = false"
              @focus="showYt = true"
              @blur="showYt = false"
              aria-label="YouTube"
              type="button"
            >
              <i class="pi pi-youtube text-2xl"></i>
            </button>
            <div
              v-if="showYt"
              class="absolute left-1/2 -translate-x-1/2 top-12 z-50 bg-white rounded-xl shadow-lg p-3 text-sm min-w-[150px] text-[#0056A6] border"
              @mouseenter="showYt = true"
              @mouseleave="showYt = false"
            >
              <div class="font-bold mb-1">YouTube</div>
              <div class="flex flex-col gap-1 text-left">
                <a href="https://www.youtube.com/channel/UChNYMSjd_gWe6uhplEvCqlw" target="_blank">YES</a>
                <a href="https://www.youtube.com/channel/UCwE8rOhZyGWVtSdhIO9pCpQ" target="_blank">Lactolac</a>
              </div>
            </div>
          </div>
          <!-- WhatsApp -->
          <div class="relative">
            <button
              class="rounded-full border border-[#0056A6] p-2 bg-white hover:bg-[#f3f6fa] transition"
              @mouseenter="showWp = true"
              @mouseleave="showWp = false"
              @focus="showWp = true"
              @blur="showWp = false"
              aria-label="WhatsApp"
              type="button"
            >
              <i class="pi pi-whatsapp text-2xl"></i>
            </button>
            <div
              v-if="showWp"
              class="absolute left-1/2 -translate-x-1/2 top-12 z-50 bg-white rounded-xl shadow-lg p-3 text-sm min-w-[150px] text-[#0056A6] border"
              @mouseenter="showWp = true"
              @mouseleave="showWp = false"
            >
              <div class="font-bold mb-1">WhatsApp</div>
              <div class="flex flex-col gap-1 text-left">
                <a href="https://web.whatsapp.com/send?phone=50372105004" target="_blank">+503 7210-5004</a>
              </div>
            </div>
          </div>
        </div>
        <!-- Contacto fijo -->
        <div class="flex flex-col gap-1 text-sm text-[#0056A6] mt-2">
          <div>
            <i class="pi pi-phone mr-1"></i>
            <a href="tel:+50322016000" class="hover:underline">+503 2201-6000</a>
          </div>
          <div>
            <i class="pi pi-envelope mr-1"></i>
            <a href="mailto:infolactolac@yes.com.sv" class="hover:underline">infolactolac@yes.com.sv</a>
          </div>
          <div>
            <i class="pi pi-map-marker mr-1"></i>
            Dirección: Calle Siemens 1, Antiguo Cuscatlán, La Libertad. El Salvador
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Botón naranja Lactolac */
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

/* Botón primario (azul) */
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

/* Enlace para recuperar contraseña */
.forgot-link {
  color: #0056A6;
  font-weight: 500;
  font-size: 0.98rem;
  text-decoration: underline;
  cursor: pointer;
  transition: color 0.2s;
}
.forgot-link:hover {
  color: #ff650f;
}

/* Input y password */
#username,
#password {
  text-transform: none;
}

.pi-eye,
.pi-eye-slash {
  transform: scale(1.6);
  margin-right: 1rem;
}
</style>