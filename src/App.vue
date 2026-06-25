<template>
  <!-- Login: no chrome -->
  <router-view v-if="$route.path === '/login'" />

  <!-- App layout -->
  <div v-else class="app-layout">
    <!-- Sidebar (desktop) -->
    <aside class="sidebar">
      <div class="sidebar-brand">
        <span>TraderGrid V3</span>
      </div>
      <nav class="sidebar-nav">
        <router-link to="/dashboard" class="sidebar-link" active-class="active">
          Dashboard
        </router-link>
        <router-link to="/order" class="sidebar-link" active-class="active">
          Quick Order
        </router-link>
        <router-link to="/tradelot" class="sidebar-link" active-class="active">
          Trade Lots
        </router-link>
        <router-link to="/strategies" class="sidebar-link" active-class="active">
          Strategies
        </router-link>
      </nav>
      <div class="sidebar-footer" @click="logout">Logout</div>
    </aside>

    <!-- Main area -->
    <div class="main-content">
      <!-- Top header -->
      <header class="top-header">
        <div class="desktop-only" style="display:flex;gap:2rem;">
          <div class="metric-card" style="padding:0.5rem 1rem;">
            <div class="label">Total Assets</div>
            <div class="value" style="font-size:1.125rem;">&yen;{{ headerMetrics.totalAssets }}</div>
          </div>
          <div class="metric-card" style="padding:0.5rem 1rem;">
            <div class="label">Available</div>
            <div class="value" style="font-size:1.125rem;">&yen;{{ headerMetrics.available }}</div>
          </div>
          <div class="metric-card" style="padding:0.5rem 1rem;">
            <div class="label">Today P&amp;L</div>
            <div class="value" :class="headerMetrics.todayPnl >= 0 ? 'text-down' : 'text-up'" style="font-size:1.125rem;">
              &yen;{{ headerMetrics.todayPnlFormatted }}
            </div>
          </div>
        </div>
        <div class="mobile-only" style="font-size:1.25rem;font-weight:700;color:var(--tr-brand);">
          TraderGrid V3
        </div>
      </header>

      <!-- Content -->
      <div class="content-area">
        <router-view />
      </div>

      <!-- Bottom nav (mobile) -->
      <nav class="bottom-nav">
        <router-link to="/dashboard" class="bottom-nav-link" active-class="active">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
          <span>Overview</span>
        </router-link>
        <router-link to="/order" class="bottom-nav-link" active-class="active">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>
          <span>Trade</span>
        </router-link>
        <router-link to="/tradelot" class="bottom-nav-link" active-class="active">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
          <span>Lots</span>
        </router-link>
        <router-link to="/strategies" class="bottom-nav-link" active-class="active">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2"/><line x1="12" y1="22" x2="12" y2="15.5"/></svg>
          <span>Strategy</span>
        </router-link>
      </nav>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { api } from './api/api-client';

const router = useRouter();

const headerMetrics = reactive({
  totalAssets: '--',
  available: '--',
  todayPnl: 0,
  todayPnlFormatted: '--',
});

let pollTimer: ReturnType<typeof setInterval> | null = null;

async function loadHeaderMetrics() {
  try {
    const dash = await api.get('/dashboard');
    headerMetrics.totalAssets = (dash.capital.current_value || 0).toLocaleString();
    headerMetrics.available = (dash.capital.available || 0).toLocaleString();
    headerMetrics.todayPnl = dash.pnl.total || 0;
    const sign = headerMetrics.todayPnl >= 0 ? '+' : '';
    headerMetrics.todayPnlFormatted = sign + headerMetrics.todayPnl.toLocaleString();
  } catch {
    // Silently ignore — header shows '--'
  }
}

function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('refresh');
  router.push('/login');
}

onMounted(() => {
  loadHeaderMetrics();
  pollTimer = setInterval(loadHeaderMetrics, 30000);
});

onUnmounted(() => {
  if (pollTimer) clearInterval(pollTimer);
});
</script>
