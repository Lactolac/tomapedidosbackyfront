import { PrimeVueResolver } from '@primevue/auto-import-resolver';
import vue from '@vitejs/plugin-vue';
import { fileURLToPath, URL } from 'node:url';
import Components from 'unplugin-vue-components/vite';
import { defineConfig } from 'vite';

// https://vitejs.dev/config/
export default defineConfig({
    // Define the base path for your app
    base: '/', // Ajuste aquí para la carpeta 'lactolac' si es necesario

    optimizeDeps: {
        noDiscovery: true
    },

    plugins: [
        vue(),
        Components({
            resolvers: [PrimeVueResolver()]
        })
    ],

    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url))
        }
    },
    server: {
        host: '0.0.0.0', // Esto hace que el servidor sea accesible desde cualquier dispositivo en la misma red
        port: 5173, // O cualquier puerto que prefieras
        proxy: {
            // Proxy todas las peticiones que empiecen con /api a tu backend pero local no produccion
            '/api': {
                target: 'http://localhost:3000',
                changeOrigin: true,
                rewrite: path => path.replace(/^\/api/, '')
            },
            // Proxy todas las peticiones que empiecen con /api a tu backend para produccion movil
            // '/api': {
            //     target: 'https://backend_toma_pedidos.yes.com.sv',
            //     changeOrigin: true,
            //     rewrite: path => path.replace(/^\/api/, '')
            // }
        }
    }
});
