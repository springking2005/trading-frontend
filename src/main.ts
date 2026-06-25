import { createApp } from 'vue';
import { createRouter, createWebHashHistory } from 'vue-router';
import App from './App.vue';
import LoginPage from './pages/LoginPage.vue';
import DashboardPage from './pages/DashboardPage.vue';
import OrderPage from './pages/OrderPage.vue';
import PositionDetailPage from './pages/PositionDetailPage.vue';
import StrategiesPage from './pages/StrategiesPage.vue';
import SettingsPage from './pages/SettingsPage.vue';
import './styles/main.css';

const routes = [
  { path: '/', redirect: '/dashboard' },
  { path: '/login', component: LoginPage },
  { path: '/dashboard', component: DashboardPage },
  { path: '/order', component: OrderPage },
  { path: '/positions/:id', component: PositionDetailPage },
  { path: '/tradelot', component: PositionDetailPage },
  { path: '/strategies', component: StrategiesPage },
  { path: '/strategy', component: StrategiesPage },
  { path: '/settings', component: SettingsPage },
];

const router = createRouter({ history: createWebHashHistory(), routes });
router.beforeEach((to, _from, next) => {
  const token = localStorage.getItem('token');
  if (to.path !== '/login' && !token) next('/login');
  else next();
});

const app = createApp(App);
app.use(router);
app.mount('#app');
