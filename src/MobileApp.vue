<template>
  <router-view v-if="$route.path === '/login'" />

  <div v-else class="mobile-h5-shell">
    <header class="mobile-h5-topbar">
      <div class="mobile-h5-topbar__title">
        <span class="mobile-h5-eyebrow">TraderGrid H5</span>
        <strong>{{ pageTitle }}</strong>
      </div>
      <button class="mobile-h5-asset-pill" type="button" @click="refreshHeader">
        <span>总资产</span>
        <strong>¥{{ headerMetrics.totalAssets }}</strong>
      </button>
    </header>

    <main class="mobile-h5-content">
      <router-view />
    </main>

    <nav class="mobile-h5-bottom-nav" aria-label="移动端主导航">
      <router-link to="/dashboard" class="mobile-h5-nav-link" active-class="active">
        <span class="mobile-h5-nav-icon">⌂</span>
        <span>概览</span>
      </router-link>
      <router-link to="/trade" class="mobile-h5-nav-link" active-class="active">
        <span class="mobile-h5-nav-icon">⇅</span>
        <span>交易</span>
      </router-link>
      <router-link to="/tradelot" class="mobile-h5-nav-link" active-class="active">
        <span class="mobile-h5-nav-icon">▤</span>
        <span>批次</span>
      </router-link>
      <router-link to="/strategies" class="mobile-h5-nav-link" active-class="active">
        <span class="mobile-h5-nav-icon">◇</span>
        <span>策略</span>
      </router-link>
      <router-link to="/settings" class="mobile-h5-nav-link" active-class="active">
        <span class="mobile-h5-nav-icon">⚙</span>
        <span>设置</span>
      </router-link>
    </nav>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, watch } from 'vue';
import { useRoute } from 'vue-router';
import { api } from './api/api-client';

const route = useRoute();

const titleMap: Record<string, string> = {
  '/dashboard': '驾驶舱概览',
  '/trade': '交易工作台',
  '/order': '交易工作台',
  '/tradelot': '持仓 / 批次',
  '/strategies': '策略中心',
  '/strategy': '策略中心',
  '/settings': '系统设置',
};

const pageTitle = computed(() => {
  if (route.path.startsWith('/positions/')) return '持仓详情';
  return titleMap[route.path] || 'TraderGrid';
});

const headerMetrics = reactive({
  totalAssets: '--',
});

let pollTimer: ReturnType<typeof setInterval> | null = null;

async function refreshHeader() {
  if (route.path === '/login' || !localStorage.getItem('token')) {
    headerMetrics.totalAssets = '--';
    return;
  }

  try {
    const dash = await api.get('/dashboard');
    headerMetrics.totalAssets = (dash?.capital?.current_value || 0).toLocaleString();
  } catch {
    headerMetrics.totalAssets = '--';
  }
}

watch(
  () => route.path,
  () => { void refreshHeader(); },
);

onMounted(() => {
  void refreshHeader();
  pollTimer = setInterval(refreshHeader, 30000);
});

onUnmounted(() => {
  if (pollTimer) clearInterval(pollTimer);
});
</script>
