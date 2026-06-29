<template>
  <!-- Login: no chrome -->
  <router-view v-if="$route.path === '/login'" />

  <!-- App layout -->
  <div v-else class="app-layout">
    <!-- Sidebar (desktop) -->
    <aside class="sidebar">
      <div class="sidebar-brand">
        <span>交易工作台</span>
      </div>
      <nav class="sidebar-nav">
        <router-link to="/dashboard" class="sidebar-link" active-class="active">
          驾驶舱
        </router-link>
        <router-link to="/trade" class="sidebar-link" active-class="active">
          交易工作台
        </router-link>
        <router-link to="/strategies" class="sidebar-link" active-class="active">
          策略中心
        </router-link>
        <router-link to="/tools" class="sidebar-link" active-class="active">
          工具箱
        </router-link>
        <router-link to="/settings" class="sidebar-link" active-class="active">
          设置
        </router-link>
      </nav>
      <div class="sidebar-footer" @click="logout">退出登录</div>
    </aside>

    <!-- Main area -->
    <div class="main-content">
      <!-- Top header -->
      <header class="top-header">
        <div class="desktop-only" style="display:flex;gap:2rem;">
          <div class="metric-card" style="padding:0.5rem 1rem;">
            <div class="label">总资产</div>
            <div class="value" style="font-size:1.125rem;">&yen;{{ headerMetrics.totalAssets }}</div>
          </div>
          <div class="metric-card" style="padding:0.5rem 1rem;">
            <div class="label">可用资金</div>
            <div class="value" style="font-size:1.125rem;">&yen;{{ headerMetrics.available }}</div>
          </div>
          <div class="metric-card" style="padding:0.5rem 1rem;">
            <div class="label">今日盈亏</div>
            <div class="value" :class="headerMetrics.todayPnl >= 0 ? 'text-down' : 'text-up'" style="font-size:1.125rem;">
              &yen;{{ headerMetrics.todayPnlFormatted }}
            </div>
          </div>
        </div>
        <div class="mobile-only" style="font-size:1.125rem;font-weight:700;color:var(--tr-brand);">
          交易工作台
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
          <span>概览</span>
        </router-link>
        <router-link to="/trade" class="bottom-nav-link" active-class="active">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>
          <span>交易</span>
        </router-link>
        <router-link to="/tradelot" class="bottom-nav-link" active-class="active">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
          <span>持仓/批次</span>
        </router-link>
        <router-link to="/strategies" class="bottom-nav-link" active-class="active">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2"/><line x1="12" y1="22" x2="12" y2="15.5"/></svg>
          <span>策略</span>
        </router-link>
        <router-link to="/tools" class="bottom-nav-link" active-class="active">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
          <span>工具箱</span>
        </router-link>
        <router-link to="/settings" class="bottom-nav-link" active-class="active">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a7.9 7.9 0 0 0 .1-6l2-1.5-2-3.5-2.3.9a8.2 8.2 0 0 0-5.2-3l-.4-2.4H10l-.4 2.4a8.2 8.2 0 0 0-5.2 3L2.1 4 0.1 7.5 2.1 9a7.9 7.9 0 0 0 .1 6L.1 16.5l2 3.5 2.3-.9a8.2 8.2 0 0 0 5.2 3l.4 2.4h4l.4-2.4a8.2 8.2 0 0 0 5.2-3l2.3.9 2-3.5-2-1.5Z"/></svg>
          <span>设置</span>
        </router-link>
      </nav>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, onMounted, onUnmounted } from 'vue';
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
    const totalAssets = dash.capital.total_assets ?? (dash.capital.current_value + dash.capital.available);
    headerMetrics.totalAssets = (totalAssets || 0).toLocaleString();
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
