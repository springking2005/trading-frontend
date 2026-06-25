<template>
  <div>
    <!-- Header -->
    <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:1.5rem">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--tr-brand)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/>
      </svg>
      <span style="font-size:1.25rem;font-weight:700;color:var(--tr-text)">Settings</span>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="card" style="text-align:center;padding:2rem;color:var(--tr-muted)">Loading settings...</div>

    <!-- Error -->
    <div v-else-if="error && !saving" class="card" style="text-align:center;padding:2rem">
      <div style="color:var(--tr-up);margin-bottom:0.75rem">{{ error }}</div>
      <button class="btn btn-primary" @click="loadSettings">Retry</button>
    </div>

    <template v-else>
      <!-- 交易设置 -->
      <div class="card">
        <div style="font-size:0.75rem;font-weight:600;color:var(--tr-muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:1rem">交易设置</div>
        <div class="input-group">
          <label>Max Concurrent Stocks</label>
          <input class="input-field" v-model.number="maxConcurrentStocks" type="number" min="1" max="50" />
        </div>
        <div class="input-group">
          <label>Total Capital (&yen;)</label>
          <input class="input-field" v-model.number="totalCapital" type="number" step="100000" />
        </div>
      </div>

      <!-- 风控设置 -->
      <div class="card">
        <div style="font-size:0.75rem;font-weight:600;color:var(--tr-muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:1rem">风控设置</div>
        <div class="input-group">
          <label>Daily Loss Limit: {{ dailyLoss }}%</label>
          <input class="slider" v-model.number="dailyLoss" type="range" min="1" max="20" step="0.5" />
          <div style="display:flex;justify-content:space-between;font-size:0.75rem;color:var(--tr-muted);margin-top:0.25rem">
            <span>1%</span><span>20%</span>
          </div>
        </div>
        <div class="input-group">
          <label>Confirmation Threshold (&yen;)</label>
          <input class="input-field" v-model.number="confirmThreshold" type="number" step="10000" />
          <span style="font-size:0.75rem;color:var(--tr-muted);display:block;margin-top:0.25rem">Orders above this amount require confirmation</span>
        </div>
        <div class="input-group">
          <label>Large Order Threshold (&yen;)</label>
          <input class="input-field" v-model.number="largeThreshold" type="number" step="50000" />
          <span style="font-size:0.75rem;color:var(--tr-muted);display:block;margin-top:0.25rem">Orders above this trigger extra risk warning</span>
        </div>
      </div>

      <!-- Feature Flags -->
      <div class="card">
        <div style="font-size:0.75rem;font-weight:600;color:var(--tr-muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:1rem">Feature Flags</div>
        <div style="display:flex;flex-direction:column;gap:0.875rem">
          <label style="display:flex;align-items:center;justify-content:space-between;cursor:pointer">
            <span style="color:var(--tr-text);font-size:0.9375rem">Auto Add Position</span>
            <span class="toggle" :class="{ active: enableAutoAdd }" @click="enableAutoAdd = !enableAutoAdd"></span>
          </label>
          <label style="display:flex;align-items:center;justify-content:space-between;cursor:pointer">
            <span style="color:var(--tr-text);font-size:0.9375rem">Auto Sell Position</span>
            <span class="toggle" :class="{ active: enableAutoSell }" @click="enableAutoSell = !enableAutoSell"></span>
          </label>
          <label style="display:flex;align-items:center;justify-content:space-between;cursor:pointer">
            <span style="color:var(--tr-text);font-size:0.9375rem">Hard Stop Loss</span>
            <span class="toggle" :class="{ active: enableHardStop }" @click="enableHardStop = !enableHardStop"></span>
          </label>
          <label style="display:flex;align-items:center;justify-content:space-between;cursor:pointer">
            <span style="color:var(--tr-text);font-size:0.9375rem">Auto Trading (Master Switch)</span>
            <span class="toggle" :class="{ active: enableAutoTrading }" @click="enableAutoTrading = !enableAutoTrading"></span>
          </label>
          <label style="display:flex;align-items:center;justify-content:space-between;cursor:pointer">
            <span style="color:var(--tr-text);font-size:0.9375rem">Multi-Execution per Stock</span>
            <span class="toggle" :class="{ active: enableMultiExecution }" @click="enableMultiExecution = !enableMultiExecution"></span>
          </label>
        </div>
      </div>

      <!-- Account -->
      <div class="card">
        <div style="font-size:0.75rem;font-weight:600;color:var(--tr-muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:1rem">Account</div>
        <button class="btn btn-danger" @click="logout">Logout</button>
      </div>

      <!-- Error display during save -->
      <div v-if="error && saving" class="card" style="text-align:center;padding:1rem;color:var(--tr-up)">
        {{ error }}
      </div>

      <!-- Save Button -->
      <button class="btn btn-primary btn-block btn-lg" :disabled="saving" @click="save">
        <span v-if="saving">Saving...</span>
        <span v-else>Save Settings</span>
      </button>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { api, toast } from '../api/api-client';

interface SettingsResponse {
  max_concurrent_stocks: number;
  total_capital: number;
  max_daily_loss_pct: number;
  order_confirm_small: number;
  order_confirm_large: number;
  enable_auto_trading: boolean;
  enable_auto_add?: boolean;
  enable_auto_sell?: boolean;
  enable_hard_stop?: boolean;
  enable_multi_execution_per_stock?: boolean;
}

const router = useRouter();
const loading = ref(true);
const saving = ref(false);
const error = ref('');

const maxConcurrentStocks = ref(5);
const totalCapital = ref(1000000);
const dailyLoss = ref(3);
const confirmThreshold = ref(50000);
const largeThreshold = ref(200000);
const enableAutoAdd = ref(true);
const enableAutoSell = ref(true);
const enableHardStop = ref(true);
const enableAutoTrading = ref(true);
const enableMultiExecution = ref(false);

async function loadSettings() {
  loading.value = true;
  error.value = '';
  try {
    const data: SettingsResponse = await api.get('/settings');
    maxConcurrentStocks.value = data.max_concurrent_stocks ?? 5;
    totalCapital.value = data.total_capital ?? 1000000;
    dailyLoss.value = Math.abs(data.max_daily_loss_pct ?? 3);
    confirmThreshold.value = data.order_confirm_small ?? 50000;
    largeThreshold.value = data.order_confirm_large ?? 200000;
    enableAutoTrading.value = data.enable_auto_trading ?? true;
    enableAutoAdd.value = data.enable_auto_add ?? true;
    enableAutoSell.value = data.enable_auto_sell ?? true;
    enableHardStop.value = data.enable_hard_stop ?? true;
    enableMultiExecution.value = data.enable_multi_execution_per_stock ?? false;
  } catch (e: any) {
    error.value = e.message || 'Failed to load settings';
  }
  loading.value = false;
}

async function save() {
  saving.value = true;
  error.value = '';
  try {
    await api.put(
      `/settings?max_concurrent_stocks=${maxConcurrentStocks.value}&total_capital=${totalCapital.value}&max_daily_loss_pct=${-Math.abs(dailyLoss.value)}&order_confirm_small=${confirmThreshold.value}&order_confirm_large=${largeThreshold.value}&enable_auto_trading=${enableAutoTrading.value}`
    );
    toast('Settings saved');
  } catch (e: any) {
    error.value = e.message || 'Failed to save settings';
  }
  saving.value = false;
}

function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('refresh');
  router.push('/login');
}

onMounted(() => {
  loadSettings();
});
</script>

<style scoped>
/* All styling uses V3 CSS classes from v3-theme.css + main.css */
</style>
