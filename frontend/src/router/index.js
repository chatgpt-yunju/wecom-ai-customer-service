import { createRouter, createWebHistory } from 'vue-router';

const routes = [
  { path: '/', redirect: '/dashboard' },
  { path: '/dashboard', component: () => import('../views/Dashboard.vue') },
  { path: '/users', component: () => import('../views/Users.vue') },
  { path: '/sessions', component: () => import('../views/Sessions.vue') },
  { path: '/knowledge', component: () => import('../views/Knowledge.vue') },
  { path: '/agents', component: () => import('../views/Agents.vue') },
  { path: '/statistics', component: () => import('../views/Statistics.vue') },
  { path: '/settings', component: () => import('../views/Settings.vue') },
];

const router = createRouter({ history: createWebHistory(), routes });
export default router;
