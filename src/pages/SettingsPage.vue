<template>
  <div>
    <!-- Header -->
    <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:1.5rem">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--tr-brand)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/>
      </svg>
      <span style="font-size:1.25rem;font-weight:700;color:var(--tr-text)">系统设置</span>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="card" style="text-align:center;padding:2rem;color:var(--tr-muted)">加载设置中...</div>

    <template v-else>
      <!-- Error banner (keeps shell visible for logout/save fallback) -->
      <div v-if="error && !saving" class="card" style="text-align:center;padding:2rem;margin-bottom:1rem">
        <div style="color:var(--tr-up);margin-bottom:0.75rem">{{ error }}</div>
        <button class="btn btn-primary" @click="loadSettings">重试</button>
      </div>

      <div class="card settings-readme">
        <div>
          <div style="font-weight:700;color:var(--tr-text)">交易风控配置</div>
          <div class="text-muted" style="font-size:12px;margin-top:4px">
            覆盖交易工作台所需风控字段；自动化能力以设置态展示，真实执行仍由交易工作台/后端风控二次校验。
          </div>
        </div>
        <span class="badge" :class="futuTradeEnv === 'REAL' ? 'badge-warning' : ''">
          {{ futuTradeEnv === 'REAL' ? '实盘环境' : '模拟环境' }}
        </span>
      </div>

      <!-- 交易设置 -->
      <div class="card">
        <div style="font-size:0.75rem;font-weight:600;color:var(--tr-muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:1rem">交易设置</div>
        <div class="input-group">
          <label>最大持仓股票数</label>
          <input class="input-field" v-model.number="maxConcurrentStocks" type="number" min="1" max="50" />
          <span class="field-help">限制策略与手动交易合计可同时持有的股票数量。</span>
        </div>
        <div class="input-group">
          <label>总资金 (&yen;)</label>
          <input class="input-field" v-model.number="totalCapital" type="number" step="100000" />
          <span class="field-help">用于仓位、亏损上限和快捷下单资金比例计算。</span>
        </div>
      </div>

      <!-- 风控设置 -->
      <div class="card">
        <div style="font-size:0.75rem;font-weight:600;color:var(--tr-muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:1rem">风控设置</div>
        <div class="input-group">
          <label>日内最大亏损: {{ dailyLoss }}%</label>
          <input class="slider" v-model.number="dailyLoss" type="range" min="1" max="20" step="0.5" />
          <div style="display:flex;justify-content:space-between;font-size:0.75rem;color:var(--tr-muted);margin-top:0.25rem">
            <span>1%</span><span>20%</span>
          </div>
        </div>
        <div class="input-group">
          <label>确认弹窗阈值 (&yen;)</label>
          <input class="input-field" v-model.number="confirmThreshold" type="number" step="10000" />
          <span class="field-help">超过此金额的订单需要二次确认。</span>
        </div>
        <div class="input-group">
          <label>大额订单阈值 (&yen;)</label>
          <input class="input-field" v-model.number="largeThreshold" type="number" step="50000" />
          <span class="field-help">超过此金额触发大额订单风险提示；不替代后端风控。</span>
        </div>
      </div>

      <!-- Feature Flags -->
      <div class="card">
        <div style="font-size:0.75rem;font-weight:600;color:var(--tr-muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:1rem">自动化与交易环境</div>
        <div style="display:flex;flex-direction:column;gap:0.875rem">
          <label class="setting-toggle-row">
            <span>
              <span class="setting-toggle-row__title">自动交易主开关</span>
              <span class="setting-toggle-row__desc">关闭后，所有自动补仓/止盈卖出仅保留为只读策略建议。</span>
            </span>
            <span class="toggle" :class="{ active: enableAutoTrading }" @click="enableAutoTrading = !enableAutoTrading"></span>
          </label>
          <label class="setting-toggle-row">
            <span>
              <span class="setting-toggle-row__title">自动补仓</span>
              <span class="setting-toggle-row__desc">按策略规则触发加仓；真实下单仍受确认阈值和后端风控约束。</span>
            </span>
            <span class="toggle" :class="{ active: enableAutoAdd }" @click="enableAutoAdd = !enableAutoAdd"></span>
          </label>
          <label class="setting-toggle-row">
            <span>
              <span class="setting-toggle-row__title">自动止盈卖出</span>
              <span class="setting-toggle-row__desc">达到止盈条件后允许策略发起卖出建议/委托。</span>
            </span>
            <span class="toggle" :class="{ active: enableAutoSell }" @click="enableAutoSell = !enableAutoSell"></span>
          </label>
          <label class="setting-toggle-row">
            <span>
              <span class="setting-toggle-row__title">硬止损保护</span>
              <span class="setting-toggle-row__desc">触发硬止损时优先保护本金，不能被单票策略绕过。</span>
            </span>
            <span class="toggle" :class="{ active: enableHardStop }" @click="enableHardStop = !enableHardStop"></span>
          </label>
          <label class="setting-toggle-row">
            <span>
              <span class="setting-toggle-row__title">单票多策略执行</span>
              <span class="setting-toggle-row__desc">允许同一股票挂载多个策略执行；用于策略接管/分批执行。</span>
            </span>
            <span class="toggle" :class="{ active: enableMultiExecution }" @click="enableMultiExecution = !enableMultiExecution"></span>
          </label>
          <div style="display:flex;align-items:center;justify-content:space-between">
            <span>
              <span class="setting-toggle-row__title">交易环境（模拟/实盘）</span>
              <span class="setting-toggle-row__desc">模拟盘用于演练；实盘需额外确认与后端券商连接。</span>
            </span>
            <select v-model="futuTradeEnv" class="select-field" data-testid="futu-trade-env" style="width:auto;padding:0.375rem 2rem 0.375rem 0.75rem;font-size:0.85rem">
              <option value="SIMULATE">模拟盘</option>
              <option value="REAL">实盘</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Account -->
      <div class="card">
        <div style="font-size:0.75rem;font-weight:600;color:var(--tr-muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:1rem">交易账户</div>

        <!-- Existing accounts -->
        <div v-if="accountRows.length" style="display:flex;flex-direction:column;gap:0.6rem;margin-bottom:1rem">
          <div v-for="acct in accountRows" :key="acct.id" class="account-chip">
            <div style="display:flex;align-items:center;gap:0.5rem">
              <strong>{{ acct.broker }}</strong>
              <span v-if="acct.is_primary" class="badge">主</span>
              <span v-if="!acct.is_active" class="badge badge-warning">停用</span>
              <span class="text-muted" style="font-size:0.8rem">{{ maskAccountId(acct.account_id) }}</span>
            </div>
            <div style="display:flex;gap:1rem;font-size:0.8rem;color:var(--tr-muted);margin-top:0.25rem">
              <span>余额 ¥{{ Math.round(acct.balance).toLocaleString() }}</span>
              <span>可用 ¥{{ Math.round(acct.available).toLocaleString() }}</span>
              <span>{{ acct.is_simulated ? '模拟' : '实盘' }}</span>
            </div>
            <div style="display:flex;gap:0.5rem;margin-top:0.4rem">
              <button v-if="!acct.is_primary" class="btn btn-outline btn-sm" @click="setPrimary(acct.id)">设为主账号</button>
              <button class="btn btn-outline btn-sm" @click="toggleAccountActive(acct.id, !acct.is_active)">
                {{ acct.is_active ? '停用' : '启用' }}
              </button>
            </div>
          </div>
        </div>
        <div v-else class="text-muted" style="margin-bottom:1rem;font-size:0.85rem">暂无交易账户，请先添加</div>

        <!-- Create form -->
        <details style="margin-bottom:1rem">
          <summary style="cursor:pointer;color:var(--tr-brand);font-weight:600;font-size:0.9rem">+ 添加新账号</summary>
          <div style="display:flex;flex-direction:column;gap:0.75rem;margin-top:0.75rem;padding:0.75rem;background:var(--tr-bg);border-radius:var(--tr-radius-sm)">
            <div class="input-group">
              <label>券商</label>
              <select v-model="newAccount.broker" class="select-field">
                <option value="simulated">模拟 (Simulated)</option>
                <option value="futu">富途 (Futu)</option>
                <option value="guotou">国投 (Guotou)</option>
              </select>
            </div>
            <div class="input-group">
              <label>资金账号号</label>
              <input v-model="newAccount.account_id" class="input-field" placeholder="券商分配的资金账号" data-testid="new-account-id" />
            </div>
            <div class="input-group">
              <label>初始余额 (¥)</label>
              <input v-model.number="newAccount.balance" class="input-field" type="number" step="10000" placeholder="1000000" data-testid="new-account-balance" />
            </div>
            <div class="text-muted" style="font-size:0.75rem;margin-bottom:0.25rem">账号类型由当前交易环境决定（设置 → 交易环境）</div>
            <label class="agreement-row">
              <input v-model="newAccount.is_primary" type="checkbox" />
              <span>设为主账号</span>
            </label>
            <div v-if="createAccountError" class="text-warning" style="font-size:0.8rem">{{ createAccountError }}</div>
            <button class="btn btn-primary btn-sm" :disabled="!canCreateAccount || creatingAccount" @click="createAccount" data-testid="create-account-btn">
              {{ creatingAccount ? '创建中...' : '创建账号' }}
            </button>
          </div>
        </details>

        <button class="btn btn-danger" data-testid="logout-btn" @click="logout">退出登录</button>
      </div>

      <!-- Save Button -->
      <button class="btn btn-primary btn-block btn-lg" data-testid="settings-save-btn" :disabled="saving" @click="save">
        <span v-if="saving">保存中...</span>
        <span v-else>保存设置</span>
      </button>

      <!-- Error display during save -->
      <div v-if="error && saving" class="card" style="text-align:center;padding:1rem;color:var(--tr-up);margin-top:1rem">
        {{ error }}
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue';
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
  futu_trade_env?: string;
}

interface AccountRow {
  id: string;
  broker: string;
  account_id: string;
  balance: number;
  frozen: number;
  available: number;
  is_simulated: boolean;
  is_primary?: boolean;
  is_active?: boolean;
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
const futuTradeEnv = ref('SIMULATE');

// ── 账号管理 ──
const accountRows = ref<AccountRow[]>([]);
const creatingAccount = ref(false);
const createAccountError = ref('');
const newAccount = ref({
  broker: 'simulated',
  account_id: '',
  balance: 1000000,
  is_primary: false,
});

const canCreateAccount = computed(() =>
  newAccount.value.account_id.trim().length > 0
  && newAccount.value.balance >= 0
  && newAccount.value.broker.length > 0
);

function maskAccountId(value: string) {
  const trimmed = (value || '').trim();
  if (!trimmed) return '****';
  if (trimmed.length <= 4) return `****${trimmed}`;
  return `****${trimmed.slice(-4)}`;
}

async function loadAccounts() {
  try {
    const data = await api.get('/accounts');
    const items = Array.isArray(data?.items) ? data.items : (Array.isArray(data) ? data : []);
    accountRows.value = items.map((item: any) => {
      const balance = Number(item.balance ?? 0);
      const frozen = Number(item.frozen ?? 0);
      const available = Number(item.available ?? (balance - frozen));
      return {
        id: String(item.id || ''),
        broker: String(item.broker || ''),
        account_id: String(item.account_id || ''),
        balance,
        frozen,
        available: Number.isFinite(available) ? available : 0,
        is_simulated: Boolean(item.is_simulated ?? true),
        is_primary: Boolean(item.is_primary ?? false),
        is_active: item.is_active !== false,
      };
    });
  } catch {
    accountRows.value = [];
  }
}

async function createAccount() {
  if (!canCreateAccount.value) return;
  creatingAccount.value = true;
  createAccountError.value = '';
  try {
    await api.post('/accounts', {
      broker: newAccount.value.broker,
      account_id: newAccount.value.account_id.trim(),
      balance: newAccount.value.balance,
      frozen: 0,
      is_primary: newAccount.value.is_primary,
    });
    toast('账号已创建');
    newAccount.value = { broker: 'simulated', account_id: '', balance: 1000000, is_primary: false };
    await loadAccounts();
  } catch (e: any) {
    createAccountError.value = e?.message || '创建失败';
  }
  creatingAccount.value = false;
}

async function setPrimary(accountDbId: string) {
  try {
    await api.patch(`/accounts/${accountDbId}`, { is_primary: true });
    await loadAccounts();
    toast('已切换主账号');
  } catch (e: any) {
    toast(e?.message || '切换失败');
  }
}

async function toggleAccountActive(accountDbId: string, active: boolean) {
  try {
    await api.patch(`/accounts/${accountDbId}`, { is_active: active });
    await loadAccounts();
    toast(active ? '账号已启用' : '账号已停用');
  } catch (e: any) {
    toast(e?.message || '操作失败');
  }
}

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
    futuTradeEnv.value = data.futu_trade_env ?? 'SIMULATE';
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
      `/settings?max_concurrent_stocks=${maxConcurrentStocks.value}&total_capital=${totalCapital.value}&max_daily_loss_pct=${-Math.abs(dailyLoss.value)}&order_confirm_small=${confirmThreshold.value}&order_confirm_large=${largeThreshold.value}&enable_auto_trading=${enableAutoTrading.value}&enable_auto_add=${enableAutoAdd.value}&enable_auto_sell=${enableAutoSell.value}&enable_hard_stop=${enableHardStop.value}&enable_multi_execution_per_stock=${enableMultiExecution.value}&futu_trade_env=${futuTradeEnv.value}`
    );
    toast('设置已保存 / Settings saved');
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
  loadAccounts();
});
</script>

<style scoped>
/* All styling uses V3 CSS classes from v3-theme.css + main.css */
.settings-readme {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
  margin-bottom: 1rem;
}

.field-help {
  font-size: 0.75rem;
  color: var(--tr-muted);
  display: block;
  margin-top: 0.25rem;
}

.setting-toggle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  cursor: pointer;
}

.setting-toggle-row__title {
  display: block;
  color: var(--tr-text);
  font-size: 0.9375rem;
  font-weight: 600;
}

.setting-toggle-row__desc {
  display: block;
  color: var(--tr-muted);
  font-size: 0.75rem;
  margin-top: 2px;
}

.account-chip {
  padding: 0.75rem 1rem;
  background: var(--tr-bg);
  border: 1px solid var(--tr-border);
  border-radius: var(--tr-radius-sm);
}

@media (max-width: 640px) {
  .settings-readme,
  .setting-toggle-row {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
