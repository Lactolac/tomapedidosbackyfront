import Swal from 'sweetalert2';
import { computed, onMounted, onBeforeUnmount, reactive, watch } from 'vue';

const layoutConfig = reactive({
    preset: 'Aura',
    primary: '#ff650f',
    surface: null,
    darkTheme: false, // Siempre claro
    menuMode: 'static',
    // Puedes eliminar darkModeStyles si ya no los usas
    darkModeStyles: [],
    lightModeStyles: [
        { "elementType": "geometry", "stylers": [{ "color": "#ebe3cd" }] },
        { "elementType": "labels.text.fill", "stylers": [{ "color": "#523735" }] },
        { "elementType": "labels.text.stroke", "stylers": [{ "color": "#f5f1e6" }] },
        { "featureType": "administrative", "elementType": "geometry.stroke", "stylers": [{ "color": "#c9b2a6" }] },
        { "featureType": "administrative.land_parcel", "elementType": "geometry.stroke", "stylers": [{ "color": "#dcd2be" }] },
        { "featureType": "administrative.land_parcel", "elementType": "labels.text.fill", "stylers": [{ "color": "#ae9e90" }] },
        { "featureType": "landscape.natural", "elementType": "geometry", "stylers": [{ "color": "#dfd2ae" }] },
        { "featureType": "poi", "elementType": "geometry", "stylers": [{ "color": "#dfd2ae" }] },
        { "featureType": "poi.park", "elementType": "geometry.fill", "stylers": [{ "color": "#a5b076" }] },
        { "featureType": "poi.park", "elementType": "labels.text.fill", "stylers": [{ "color": "#447530" }] },
        { "featureType": "road", "elementType": "geometry", "stylers": [{ "color": "#f5f1e6" }] },
        { "featureType": "road.arterial", "elementType": "geometry", "stylers": [{ "color": "#fdfcf8" }] },
        { "featureType": "road.highway", "elementType": "geometry", "stylers": [{ "color": "#f8c967" }] },
        { "featureType": "road.highway", "elementType": "geometry.stroke", "stylers": [{ "color": "#e9bc62" }] },
        { "featureType": "road.highway.controlled_access", "elementType": "geometry", "stylers": [{ "color": "#e98d58" }] },
        { "featureType": "road.highway.controlled_access", "elementType": "geometry.stroke", "stylers": [{ "color": "#db8555" }] },
        { "featureType": "transit", "elementType": "geometry", "stylers": [{ "color": "#dfd2ae" }] },
        { "featureType": "water", "elementType": "geometry.fill", "stylers": [{ "color": "#b9d3c2" }] },
        { "featureType": "water", "elementType": "labels.text.fill", "stylers": [{ "color": "#92998d" }] }
    ],
});

const layoutState = reactive({
    staticMenuDesktopInactive: false,
    overlayMenuActive: false,
    profileSidebarVisible: false,
    configSidebarVisible: false,
    staticMenuMobileActive: false,
    menuHoverActive: false,
    activeMenuItem: null,
});

export function useLayout() {
    const setActiveMenuItem = (item) => {
        layoutState.activeMenuItem = item.value || item;
    };

    // Elimina la función toggleDarkMode o hazla vacía
    const toggleDarkMode = () => {
        // Modo oscuro deshabilitado
    };

    // Elimina executeDarkModeToggle, ya no se necesita

    const toggleMenu = () => {
        if (layoutConfig.menuMode === 'overlay') {
            layoutState.overlayMenuActive = !layoutState.overlayMenuActive;
        }

        if (window.innerWidth > 991) {
            layoutState.staticMenuDesktopInactive = !layoutState.staticMenuDesktopInactive;
        } else {
            layoutState.staticMenuMobileActive = !layoutState.staticMenuMobileActive;
        }
    };

    const isSidebarActive = computed(() => layoutState.overlayMenuActive || layoutState.staticMenuMobileActive);

    // Siempre modo claro
    const isDarkTheme = computed(() => false);

    const getPrimary = computed(() => layoutConfig.primary);

    const getSurface = computed(() => layoutConfig.surface);

    // Solo estilos claros
    const getDarkModeStyles = computed(() => []);
    const getLightModeStyles = computed(() => layoutConfig.lightModeStyles);

    // Siempre modo claro
    const updateDarkModeFromSystem = () => {
        layoutConfig.darkTheme = false;
        document.documentElement.classList.remove('app-dark');
    };

    onMounted(() => {
        updateDarkModeFromSystem();
        // Ya no es necesario escuchar cambios de sistema, pero si quieres puedes dejarlo para asegurar
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', updateDarkModeFromSystem);
    });

    onBeforeUnmount(() => {
        window.matchMedia('(prefers-color-scheme: dark)').removeEventListener('change', updateDarkModeFromSystem);
    });

    // Siempre modo claro, nunca agrega app-dark
    watch(() => layoutConfig.darkTheme, () => {
        document.documentElement.classList.remove('app-dark');
    });

    const showAlert = (titleOrOptions, text = '', icon = '', customOptions = {}) => {
        // Siempre claro
        const primaryColor = getPrimary.value;
        const backgroundColor = "#ffffff";
        const textColor = "#000000";

        let options = {};

        if (typeof titleOrOptions === 'object') {
            options = {
                background: backgroundColor,
                color: textColor,
                confirmButtonColor: primaryColor,
                ...titleOrOptions,
            };
        } else {
            options = {
                title: titleOrOptions,
                text,
                icon,
                background: backgroundColor,
                color: textColor,
                confirmButtonColor: primaryColor,
                ...customOptions,
            };
        }

        return Swal.fire(options);
    };

    const closeAlert = () => {
        Swal.close();
    };

    return {
        layoutConfig,
        layoutState,
        toggleMenu,
        isSidebarActive,
        isDarkTheme,
        getPrimary,
        getSurface,
        getDarkModeStyles,
        getLightModeStyles,
        setActiveMenuItem,
        toggleDarkMode,
        showAlert,
        closeAlert,
    };
}