import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '@/api-plugins/authStores';
import AppLayout from '@/layout/AppLayout.vue';
import ResetPassword from '@/views/ResetPassword.vue';

const routes = [
  {
    path: '/',
    redirect: '/auth/login',
  },
  {
    path: '/auth/login',
    name: 'login',
    component: () => import('@/views/Login.vue'),
  },
  {
    path: '/auth/register',
    name: 'register',
    component: () => import('@/views/Register.vue'),
  },
  {
    path: '/auth/reset-password',
    name: 'ForgetPass',
    component: () => import('@/views/ForgetPass.vue'),
  },
  {
    path: '/reset-password',
    name: 'ResetPassword',
    component: ResetPassword,
    props: (route) => ({ token: route.query.token }),
  },
  {
    path: '/',
    component: AppLayout,
    meta: { requiresAuth: true },
    children: [
      {
        path: 'HomeClient',
        name: 'HomeClient',
        component: () => import('@/views/HomeClient.vue'),
        meta: { requiresAuth: true, requiresClient: true },
      },
      {
        path: 'OrderList',
        name: 'OrderList',
        component: () => import('@/views/OrderList.vue'),
        meta: { requiresAuth: true, requiresClient: true },
      },
      {
        path: 'HomeAdmin',
        name: 'HomeAdmin',
        component: () => import('@/views/HomeAdmin.vue'),
        meta: { requiresAuth: true, requiresAdmin: true }, // <--- PROTECCIÓN SOLO ADMIN
      },
    ],
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

// Guard de navegación para protección por rol
router.beforeEach((to, from, next) => {
  const authStore = useAuthStore();
  if (to.meta.requiresAuth && !authStore.isAuthenticated()) {
    return next({ name: 'login' });
  }
  if (to.meta.requiresClient && authStore.user?.role !== 'client') {
    return next({ name: 'login' });
  }
  if (to.meta.requiresAdmin && authStore.user?.role !== 'admin') {
    return next({ name: 'login' });
  }
  next();
});

export default router;