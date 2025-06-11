import { useLayout } from "@/layout/composables/layout";
import router from '@/router';
import axios from 'axios';
import { defineStore } from 'pinia';

const { showAlert } = useLayout();

// Configurar el interceptor de Axios
axios.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Interceptor para manejar la expiración del token
axios.interceptors.response.use(
    (response) => {
        return response;
    },
    (error) => {
        if (error.response && error.response.status === 401) {
            const authStore = useAuthStore();
            authStore.logout(true); // Pasar true para indicar que la sesión expiró
        }
        return Promise.reject(error);
    }
);

export const useAuthStore = defineStore('auth', {
    state: () => ({
        user: null,
        token: null,
        error: null,
    }),

    actions: {
        // Registro de usuario
async register(username, email, password, lat, lng) {
    try {
        const response = await axios.post('/api/auth/register', {
            username,
            email,
            password,
            lat,    // <-- Agrega lat
            lng     // <-- Agrega lng
        });

        // Usa el flag alreadyExists del backend
        if (response.data?.alreadyExists) {
            await showAlert({
                title: 'El correo ya existe',
                text: 'Ya existe una cuenta con este correo. Te hemos enviado un enlace para restablecer la contraseña.',
                icon: 'warning',
                confirmButtonText: 'Entendido'
            });
        } else {
            await showAlert({
                title: 'Registro exitoso',
                text: 'Por favor, verifica tu correo electrónico para validar tu cuenta.',
                icon: 'success',
                confirmButtonText: 'Entendido'
            });
        }

        // Redirige SOLO después del alert
        router.push('/auth/login');
    } catch (err) {
        console.error('Error en el registro:', err);
        if (err.response && err.response.data.message) {
            showAlert({
                title: 'Error',
                text: err.response.data.message,
                icon: 'error',
                confirmButtonText: 'Intentar de nuevo'
            });
        } else {
            showAlert({
                title: 'Error',
                text: 'Ocurrió un problema al registrar. Por favor, intenta de nuevo.',
                icon: 'error',
                confirmButtonText: 'Intentar de nuevo'
            });
        }
    }
},

        // Inicio de sesión
        async login(username, password) {
            try {
                const response = await axios.post('/api/auth/login', {
                    username,
                    password,
                });

                if (!response.data.token) {
                    throw new Error('Credenciales incorrectas o falta de información en la respuesta.');
                }

                this.user = response.data.user;
                this.token = response.data.token;
                this.error = null;

                localStorage.setItem('user', JSON.stringify(this.user));
                localStorage.setItem('token', this.token);

                this.setAxiosToken(this.token);

                showAlert({
                    title: '¡Inicio de sesión exitoso!',
                    text: `Bienvenido, ${this.user?.username || 'Usuario'}`,
                    icon: 'success',
                    timer: 2000,
                    showConfirmButton: false
                });

                // Redirección según el rol
                if (this.user.role === 'admin') {
                    router.push({ name: 'HomeAdmin' });
                } else {
                    router.push({ name: 'HomeClient' });
                }

            } catch (err) {
                console.error('Error al autenticar:', err);

                // Manejo de errores por código de estado
                if (err.response) {
                    if (err.response.status === 401) {
                        this.error = 'Contraseña incorrecta.';
                    } else if (err.response.status === 404) {
                        this.error = 'Usuario no encontrado.';
                    } else {
                        this.error = err.response.data.message || 'Ocurrió un error inesperado.';
                    }
                } else {
                    this.error = err.message || 'Ocurrió un error inesperado.';
                }

                showAlert({
                    title: 'Error',
                    text: this.error,
                    icon: 'error',
                    confirmButtonText: 'Intentar de nuevo'
                });
            }
        },
        // Solicitar reseteo de contraseña
        async requestPasswordReset(email) {
            try {
                const response = await axios.post('/api/auth/reset-password', { email });

                // Solo muestra éxito si el backend responde 200
                if (response.status === 200) {
                    showAlert({
                        title: 'Correo enviado',
                        text: response.data?.message || 'Revisa tu correo electrónico para restablecer tu contraseña.',
                        icon: 'success',
                        confirmButtonText: 'Entendido'
                    });
                }
                // No redirijas aquí, deja que el frontend decida si redirigir o no
                console.log('Respuesta del servidor:', response.data);
            } catch (err) {
                console.error('Error al solicitar el reseteo de contraseña:', err);
                if (err.response && err.response.data.message) {
                    showAlert({
                        title: 'Error',
                        text: err.response.data.message,
                        icon: 'error',
                        confirmButtonText: 'Intentar de nuevo'
                    });
                } else {
                    showAlert({
                        title: 'Error',
                        text: 'Ocurrió un problema al solicitar el reseteo de contraseña.',
                        icon: 'error',
                        confirmButtonText: 'Intentar de nuevo'
                    });
                }
            }
        },

        // Confirmar reseteo de contraseña
        async confirmPasswordReset(token, newPassword) {
            try {
                const response = await axios.post('/api/auth/reset-password/confirm', {
                    token,
                    newPassword
                });

                showAlert({
                    title: 'Contraseña actualizada',
                    text: 'Tu contraseña ha sido restablecida correctamente. Ahora puedes iniciar sesión.',
                    icon: 'success',
                    confirmButtonText: 'Iniciar sesión'
                });

                router.push('/auth/login');
            } catch (err) {
                console.error('Error al confirmar el reseteo de contraseña:', err);
                if (err.response && err.response.data.message) {
                    showAlert({
                        title: 'Error',
                        text: err.response.data.message,
                        icon: 'error',
                        confirmButtonText: 'Intentar de nuevo'
                    });
                } else {
                    showAlert({
                        title: 'Error',
                        text: 'Ocurrió un problema al restablecer tu contraseña.',
                        icon: 'error',
                        confirmButtonText: 'Intentar de nuevo'
                    });
                }
            }
        },

        // Configurar el token en Axios
        setAxiosToken(token) {
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        },

        // Cargar sesión desde localStorage
        loadSession() {
            const user = localStorage.getItem('user');
            const token = localStorage.getItem('token');

            if (user && token) {
                try {
                    this.user = JSON.parse(user);
                    this.token = token;
                    this.setAxiosToken(this.token);
                    console.log('Sesión cargada:', this.user);
                } catch (error) {
                    console.error('Error al cargar la sesión:', error);
                }
            }
        },

        // Cerrar sesión
        async logout(sessionExpired = false) {
            this.user = null;
            this.token = null;

            localStorage.removeItem('user');
            localStorage.removeItem('token');

            delete axios.defaults.headers.common['Authorization'];

            if (sessionExpired) {
                showAlert({
                    title: 'Sesión Expirada',
                    text: 'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.',
                    icon: 'warning',
                    timer: 2000,
                    showConfirmButton: false
                });
            } else {
                showAlert({
                    title: 'Has cerrado sesión correctamente.',
                    icon: 'success',
                    timer: 2000,
                    showConfirmButton: false
                });
            }

            router.push({ name: 'login' });
        },

        // Verificar si hay una sesión activa
        isAuthenticated() {
            return !!this.user && !!this.token;
        },
    }
});