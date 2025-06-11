<script setup></script>

<template>
    <div class="layout-footer flex flex-col md:flex-row items-center justify-center gap-4">
        <img
            src="@/assets/images/lactolac-logo.png"
            alt="Lactolac"
            class="footer-logo"
        />
        <div class="flex flex-col items-center md:items-start">
            <span class="text-white font-semibold mb-2">Nuestras redes sociales</span>
            <div class="footer-social flex justify-center gap-4">
                <a href="https://www.facebook.com/LactolacCentroamerica/" target="_blank" aria-label="Facebook" class="footer-social-link">
                    <i class="pi pi-facebook text-2xl"></i>
                </a>
                <a href="https://www.instagram.com/yogurtyes/" target="_blank" aria-label="Instagram" class="footer-social-link">
                    <i class="pi pi-instagram text-2xl"></i>
                </a>
                <a href="https://www.youtube.com/channel/UChNYMSjd_gWe6uhplEvCqlw" target="_blank" aria-label="YouTube" class="footer-social-link">
                    <i class="pi pi-youtube text-2xl"></i>
                </a>
                <a href="https://web.whatsapp.com/send?phone=50372105004" target="_blank" aria-label="WhatsApp" class="footer-social-link">
                    <i class="pi pi-whatsapp text-2xl"></i>
                </a>
            </div>
        </div>
    </div>
</template>

<style scoped>
.layout-footer {
    background: #0056A6;
    color: #fff;
    border-top: 3px solid #ff650f;
    text-align: center;
    padding: 1rem 0;
}
.footer-logo {
    height: 48px;
    max-width: 180px;
    object-fit: contain;
    margin: 0;
    display: block;
}
.footer-social-link {
    color: #fff;
    transition: color 0.2s;
    display: inline-flex;
    align-items: center;
    justify-content: center;
}
.footer-social-link:hover {
    color: #ff650f;
}
</style>
