<template>
  <div>
    <!-- Page Header -->
    <div style="margin-bottom:1.5rem">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--tr-warning)" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
        <h2 style="margin:0;font-size:1.25rem;font-weight:700;color:var(--tr-text)">快速建仓与策略绑定</h2>
      </div>
      <p class="text-muted" style="margin:0;font-size:0.8rem">V3 核心：单票独立，建仓即激活，所有数值参数化</p>
    </div>

    <!-- Main Layout: 7:5 -->
    <div class="order-layout">
      <!-- Left Column: Order Form -->
      <div style="display:flex;flex-direction:column;gap:1rem">
        <!-- Step 1: Stock Search -->
        <div class="card">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:0.75rem">
            <span class="badge" style="font-size:0.7rem">STEP 1</span>
            <span style="font-weight:600;font-size:0.95rem;color:var(--tr-text)">选择标的</span>
          </div>
          <div style="position:relative">
            <div style="position:relative">
              <svg style="position:absolute;left:12px;top:50%;transform:translateY(-50%);pointer-events:none" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--tr-muted)" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              <input
                class="input-field"
                style="padding-left:40px"
                v-model="searchQuery"
                type="text"
                placeholder="输入代码、名称或拼音搜索..."
                @input="onSearchInput"
                @focus="showDropdown = searchResults.length > 0"
                @blur="onSearchBlur"
              />
            </div>
            <div v-if="showDropdown && searchResults.length > 0" class="search-dropdown">
              <div
                v-for="r in searchResults"
                :key="r.code"
                class="search-item"
                @mousedown.prevent="selectStock(r)"
              >
                <span style="font-weight:600;color:var(--tr-text)">{{ r.code }}</span>
                <span style="margin-left:8px;color:var(--tr-text)">{{ r.name }}</span>
                <span class="badge badge-muted" style="margin-left:auto;font-size:0.65rem">{{ r.exchange }}</span>
              </div>
            </div>
            <div v-if="searchLoading" class="text-muted" style="margin-top:4px;font-size:0.75rem">搜索中...</div>
          </div>

          <!-- Selected Stock Display -->
          <div v-if="selectedStock" style="margin-top:10px">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
              <span class="badge">{{ selectedStock.code }}</span>
              <span style="font-weight:500;color:var(--tr-text)">{{ selectedStock.name }}</span>
              <span class="badge badge-muted" style="font-size:0.65rem">{{ selectedStock.exchange }}</span>
            </div>
            <!-- Quote Bar: 卖一 / 现价 / 买一 -->
            <div v-if="currentPrice > 0" class="quote-bar">
              <div class="quote-side">
                <div class="text-muted" style="font-size:0.65rem">卖一</div>
                <div class="text-down" style="font-weight:600">{{ (currentPrice * 1.002).toFixed(2) }}</div>
              </div>
              <div class="quote-mid">
                <div class="text-muted" style="font-size:0.65rem">现价</div>
                <div style="font-size:1.1rem;font-weight:700;color:var(--tr-text)">{{ currentPrice.toFixed(2) }}</div>
              </div>
              <div class="quote-side">
                <div class="text-muted" style="font-size:0.65rem">买一</div>
                <div class="text-up" style="font-weight:600">{{ (currentPrice * 0.998).toFixed(2) }}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Step 2: Strategy Template -->
        <div class="card">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.75rem">
            <div style="display:flex;align-items:center;gap:8px">
              <span class="badge" style="font-size:0.7rem">STEP 2</span>
              <span style="font-weight:600;font-size:0.95rem;color:var(--tr-text)">选择策略模板</span>
            </div>
            <router-link to="/strategies" class="text-brand" style="font-size:0.75rem;text-decoration:none">模板管理 &rarr;</router-link>
          </div>
          <select class="select-field" v-model="selectedTemplateId" @change="onTemplateChange">
            <option value="">-- 选择策略模板 --</option>
            <option v-for="t in templates" :key="t.id" :value="t.id">
              {{ t.name }}{{ t.is_system ? ' (系统)' : '' }}
            </option>
          </select>
          <div v-if="selectedTemplate" class="text-muted" style="margin-top:6px;font-size:0.8rem">
            {{ selectedTemplate.description || '底仓: ¥' + (selectedTemplate.params?.base_position_amount || 100000)?.toLocaleString() }}
          </div>
        </div>

        <!-- Step 3: Amount / Shares -->
        <div class="card">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:0.75rem">
            <span class="badge" style="font-size:0.7rem">STEP 3</span>
            <span style="font-weight:600;font-size:0.95rem;color:var(--tr-text)">输入金额</span>
          </div>

          <!-- Amount / Shares Toggle -->
          <div style="display:flex;background:var(--tr-bg);border-radius:var(--tr-radius-sm);padding:3px;margin-bottom:0.75rem">
            <button
              class="toggle-btn"
              :class="{ active: amountMode === 'amount' }"
              @click="amountMode = 'amount'"
            >金额</button>
            <button
              class="toggle-btn"
              :class="{ active: amountMode === 'shares' }"
              @click="amountMode = 'shares'"
            >手数</button>
          </div>

          <!-- Amount Input -->
          <div v-if="amountMode === 'amount'" style="position:relative">
            <span style="position:absolute;left:14px;top:50%;transform:translateY(-50%);color:var(--tr-muted);font-weight:600">&yen;</span>
            <input
              class="input-field"
              style="padding-left:30px;font-size:1.5rem;font-weight:700;text-align:center"
              v-model="amountDisplay"
              type="text"
              placeholder="0"
              @input="onAmountInput"
            />
          </div>

          <!-- Shares Input -->
          <div v-if="amountMode === 'shares'" style="position:relative">
            <span style="position:absolute;right:14px;top:50%;transform:translateY(-50%);color:var(--tr-muted);font-weight:600">股</span>
            <input
              class="input-field"
              style="padding-right:36px;font-size:1.5rem;font-weight:700;text-align:center"
              v-model="sharesDisplay"
              type="text"
              placeholder="0"
              @input="onSharesInput"
            />
          </div>

          <!-- Auto-calculated shares / amount line -->
          <div v-if="currentPrice > 0 && amount > 0" class="text-muted" style="text-align:center;margin-top:6px;font-size:0.8rem">
            {{ amountMode === 'amount' ? '≈ ' + volume + ' 股 (100股/手)' : '≈ ¥' + amount.toLocaleString() }}
            &nbsp;|&nbsp; 市价买入 @ &yen;{{ currentPrice.toFixed(2) }}
          </div>

          <!-- Quick Presets -->
          <div style="display:flex;gap:6px;margin-top:10px;flex-wrap:wrap">
            <button
              v-for="a in [50000, 100000, 150000, 200000]"
              :key="a"
              class="btn btn-sm"
              :class="amountStr === String(a) ? 'btn-primary' : 'btn-outline'"
              @click="setAmount(a)"
            >
              &yen;{{ (a / 10000).toFixed(0) }}w
            </button>
            <button class="btn btn-sm btn-outline" @click="setAmount('')">清空</button>
          </div>

          <!-- Price Type -->
          <div class="row" style="margin-top:10px">
            <div class="input-group" style="flex:1">
              <label>订单类型</label>
              <select class="select-field" v-model="priceType">
                <option value="market">市价单</option>
                <option value="limit">限价单</option>
              </select>
            </div>
            <div class="input-group" v-if="priceType === 'limit'" style="flex:1">
              <label>限价 (&yen;)</label>
              <input class="input-field" v-model.number="limitPrice" type="number" step="0.01" min="0.01" />
            </div>
          </div>
        </div>

        <!-- Number Keypad -->
        <div class="card">
          <div style="font-weight:600;font-size:0.9rem;color:var(--tr-text);margin-bottom:0.5rem;text-align:center">数字键盘</div>
          <div class="keypad">
            <button class="key" v-for="k in ['1','2','3','4','5','6','7','8','9']" :key="k" @click="tapKey(k)">{{ k }}</button>
            <button class="key key-clear" @click="tapKey('C')">C</button>
            <button class="key" @click="tapKey('0')">0</button>
            <button class="key key-ac" @click="tapKey('AC')">AC</button>
          </div>
        </div>

        <!-- Error & Submit (mobile-first, above right col on small screens) -->
        <div v-if="orderError" class="text-up" style="text-align:center;font-size:0.875rem">{{ orderError }}</div>

        <!-- Desktop submit shown here; slider-confirm in right col -->
        <button
          class="btn btn-primary btn-block btn-lg mobile-only"
          :disabled="!canSubmit || submitting"
          @click="openConfirmModal"
          style="margin-top:0.5rem"
        >
          <span v-if="submitting">提交中...</span>
          <span v-else>确认下单</span>
        </button>
      </div>

      <!-- Right Column: Strategy Preview + Confirm -->
      <div style="display:flex;flex-direction:column;gap:1rem">
        <!-- Strategy Rules Preview Card -->
        <div class="card strategy-preview">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.75rem">
            <span style="font-weight:600;font-size:0.95rem;color:var(--tr-text)">策略规则预览</span>
            <span class="badge" :class="selectedTemplate ? '' : 'badge-muted'">{{ selectedTemplate ? selectedTemplate.name : '未选择' }}</span>
          </div>

          <template v-if="selectedTemplate">
            <div class="rule-row">
              <span class="text-muted">自动加仓条件</span>
              <span style="color:var(--tr-text)">下跌 {{ selectedTemplate.params?.add_trigger_pct ?? '--' }}% 触发</span>
            </div>
            <div class="rule-row">
              <span class="text-muted">自动卖出条件</span>
              <span style="color:var(--tr-text)">上涨 {{ selectedTemplate.params?.sell_trigger_pct ?? '--' }}% 触发</span>
            </div>
            <div class="rule-row">
              <span class="text-muted">最大加仓次数</span>
              <span style="color:var(--tr-brand)">{{ selectedTemplate.params?.max_add_count ?? '--' }}</span>
            </div>
            <div class="rule-row">
              <span class="text-muted">单票容量上限</span>
              <span style="color:var(--tr-warning)">&yen;{{ (selectedTemplate.params?.max_position_amount ?? 0).toLocaleString() }}</span>
            </div>
            <div class="rule-row">
              <span class="text-muted">硬止损线</span>
              <span class="text-up">{{ selectedTemplate.params?.hard_stop_loss_pct ?? '--' }}%</span>
            </div>
            <div class="divider" style="margin:10px 0"></div>
            <div class="rule-row">
              <span class="text-muted">底仓金额</span>
              <span style="color:var(--tr-text)">&yen;{{ (selectedTemplate.params?.base_position_amount ?? 0).toLocaleString() }}</span>
            </div>
            <div class="rule-row">
              <span class="text-muted">加仓金额</span>
              <span style="color:var(--tr-text)">&yen;{{ (selectedTemplate.params?.add_position_amount ?? 0).toLocaleString() }}</span>
            </div>

            <!-- T+1 Warning -->
            <div style="display:flex;align-items:center;gap:6px;margin-top:10px;padding:8px 10px;background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.2);border-radius:var(--tr-radius-sm);font-size:0.75rem">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--tr-warning)" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              <span class="text-warning">A股实行 T+1 交易制度，当日买入次日方可卖出</span>
            </div>
          </template>

          <template v-else>
            <div class="text-muted" style="text-align:center;padding:20px 0;font-size:0.85rem">
              请先在左侧选择策略模板<br/>选择后将展示完整规则参数
            </div>
          </template>
        </div>

        <!-- Pre-Trade Risk Summary -->
        <div v-if="amount > 0 && currentPrice > 0" class="card">
          <span style="font-weight:600;font-size:0.95rem;color:var(--tr-text);display:block;margin-bottom:0.5rem">订单摘要</span>
          <div class="risk-row">
            <span class="text-muted">订单金额</span>
            <span style="color:var(--tr-text)">&yen;{{ amount.toLocaleString() }}</span>
          </div>
          <div class="risk-row">
            <span class="text-muted">预估股数</span>
            <span style="color:var(--tr-text)">{{ volume }}</span>
          </div>
          <div class="risk-row">
            <span class="text-muted">手续费 (0.025%)</span>
            <span style="color:var(--tr-text)">&yen;{{ fee.toFixed(2) }}</span>
          </div>
          <div class="risk-row">
            <span class="text-muted">总成本</span>
            <span style="font-weight:600;color:var(--tr-text)">&yen;{{ (amount + fee).toFixed(2) }}</span>
          </div>
          <div v-if="amount > largeThreshold" class="risk-row">
            <span class="text-warning">&#9888; 大额订单</span>
            <span class="text-warning">需二次确认</span>
          </div>
        </div>

        <!-- Available Cash -->
        <div class="card" style="text-align:center">
          <span class="text-muted" style="font-size:0.8rem">可用资金</span>
          <div style="font-size:1.25rem;font-weight:700;color:var(--tr-warning);margin-top:2px">&yen;{{ availableCashDisplay }}</div>
        </div>

        <!-- Slider Confirm Button -->
        <div v-if="canSubmit" class="slider-confirm" @click="openConfirmModal">
          <div class="slider-confirm-thumb">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <span class="slider-confirm-text">滑动确认建仓并激活策略</span>
        </div>

        <!-- Desktop fallback submit button when can't submit -->
        <button
          v-else
          class="btn btn-primary btn-block btn-lg desktop-only"
          disabled
        >
          请完善订单信息
        </button>
      </div>
    </div>

    <!-- Confirmation Modal -->
    <div v-if="showConfirm" class="modal" @click.self="showConfirm = false">
      <div class="modal-content">
        <div class="modal-header">确认下单</div>
        <div class="confirm-grid">
          <div class="confirm-item">
            <span class="text-muted">股票</span>
            <span style="font-weight:600;color:var(--tr-text)">{{ selectedStock?.code }} {{ selectedStock?.name }}</span>
          </div>
          <div class="confirm-item">
            <span class="text-muted">策略模板</span>
            <span style="color:var(--tr-text)">{{ selectedTemplate?.name || 'None' }}</span>
          </div>
          <div class="confirm-item">
            <span class="text-muted">类型</span>
            <span style="color:var(--tr-text);text-transform:capitalize">{{ priceType === 'market' ? '市价' : '限价' }}</span>
          </div>
          <div class="confirm-item" v-if="priceType === 'limit'">
            <span class="text-muted">限价</span>
            <span style="color:var(--tr-text)">&yen;{{ limitPrice?.toFixed(2) }}</span>
          </div>
          <div class="confirm-item">
            <span class="text-muted">金额</span>
            <span style="font-weight:600;color:var(--tr-text)">&yen;{{ amount.toLocaleString() }}</span>
          </div>
          <div class="confirm-item">
            <span class="text-muted">股数</span>
            <span style="color:var(--tr-text)">{{ volume }}</span>
          </div>
          <div class="confirm-item">
            <span class="text-muted">手续费</span>
            <span style="color:var(--tr-text)">&yen;{{ fee.toFixed(2) }}</span>
          </div>
        </div>
        <div v-if="riskWarnings.length > 0" class="risk-warning-box">
          <div v-for="(w, i) in riskWarnings" :key="i" class="text-warning" style="font-size:13px">
            &#9888; {{ w }}
          </div>
        </div>
        <div class="modal-actions">
          <button class="btn btn-outline" @click="showConfirm = false">取消</button>
          <button class="btn btn-primary" :disabled="submitting" @click="submitOrder">
            {{ submitting ? '提交中...' : '确认下单' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { api, toast } from '../api/api-client';

interface StockResult {
  code: string;
  name: string;
  exchange: string;
  pinyin?: string;
}

interface TemplateResult {
  id: string;
  name: string;
  description: string | null;
  is_system: boolean;
  params: Record<string, any>;
}

const LOT_SIZE = 100;

// Stock search
const searchQuery = ref('');
const searchResults = ref<StockResult[]>([]);
const searchLoading = ref(false);
const showDropdown = ref(false);
const selectedStock = ref<StockResult | null>(null);
let searchTimer: ReturnType<typeof setTimeout> | null = null;

// Templates
const templates = ref<TemplateResult[]>([]);
const selectedTemplateId = ref('');
const selectedTemplate = computed(() =>
  templates.value.find(t => t.id === selectedTemplateId.value) || null
);

// Order params
const priceType = ref('market');
const limitPrice = ref<number | null>(null);
const amountStr = ref('');
const amountDisplay = ref('');
const sharesDisplay = ref('');
const currentPrice = ref(0);
const amountMode = ref<'amount' | 'shares'>('amount');

// Available cash
const availableCashDisplay = ref('--');

// Modal
const showConfirm = ref(false);
const submitting = ref(false);
const orderError = ref('');

// Derived
const amount = computed(() => parseFloat(amountStr.value) || 0);
const volume = computed(() => {
  if (currentPrice.value <= 0) return 0;
  return Math.floor(amount.value / (currentPrice.value * LOT_SIZE)) * LOT_SIZE;
});
const fee = computed(() => amount.value * 0.00025);
const largeThreshold = computed(() => 200000);

const canSubmit = computed(() =>
  selectedStock.value != null && amount.value >= LOT_SIZE * currentPrice.value && !submitting.value
);

const riskWarnings = computed(() => {
  const warnings: string[] = [];
  if (amount.value > 200000) warnings.push('大额订单: 超过 ¥200,000');
  if (priceType.value === 'limit' && limitPrice.value != null) {
    if (currentPrice.value > 0 && limitPrice.value > currentPrice.value * 1.05) {
      warnings.push('限价高于现价 5% 以上');
    }
  }
  return warnings;
});

// Load templates on mount
async function loadTemplates() {
  try {
    const data = await api.get('/strategies/templates');
    templates.value = Array.isArray(data) ? data : [];
  } catch {
    templates.value = [];
  }
}

// Load available cash
async function loadAvailableCash() {
  try {
    const dash = await api.get('/dashboard');
    availableCashDisplay.value = (dash.capital?.available ?? 0).toLocaleString();
  } catch {
    availableCashDisplay.value = '--';
  }
}

// Stock search with debounce
function onSearchInput() {
  const q = searchQuery.value.trim();
  if (!q) {
    searchResults.value = [];
    showDropdown.value = false;
    return;
  }
  if (searchTimer) clearTimeout(searchTimer);
  searchTimer = setTimeout(async () => {
    searchLoading.value = true;
    try {
      const data = await api.get(`/market/search?q=${encodeURIComponent(q)}`);
      searchResults.value = data.results || [];
      showDropdown.value = searchResults.value.length > 0;
    } catch {
      searchResults.value = [];
    }
    searchLoading.value = false;
  }, 250);
}

function onSearchBlur() {
  setTimeout(() => { showDropdown.value = false; }, 150);
}

function selectStock(r: StockResult) {
  selectedStock.value = r;
  searchQuery.value = `${r.code} ${r.name}`;
  showDropdown.value = false;
  searchResults.value = [];
  // Fetch current price
  fetchPrice(r.code, r.exchange);
}

async function fetchPrice(code: string, exchange: string) {
  const vtSymbol = `${code}.${exchange}`;
  try {
    const data = await api.get(`/market/${vtSymbol}/snapshot`);
    currentPrice.value = data.last_price || 0;
  } catch {
    currentPrice.value = 0;
  }
}

function onTemplateChange() {
  // Could pre-fill amount from template defaults
}

// Amount / Shares linked
function setAmount(val: number | string) {
  amountMode.value = 'amount';
  amountStr.value = String(val);
  amountDisplay.value = String(val);
  updateShares();
}

function onAmountInput(e: Event) {
  const raw = (e.target as HTMLInputElement).value.replace(/[^0-9]/g, '');
  amountStr.value = raw;
  amountDisplay.value = raw;
  updateShares();
}

function onSharesInput(e: Event) {
  const raw = (e.target as HTMLInputElement).value.replace(/[^0-9]/g, '');
  const shares = parseInt(raw) || 0;
  const roundedShares = Math.floor(shares / LOT_SIZE) * LOT_SIZE;
  if (currentPrice.value > 0) {
    const calcAmount = roundedShares * currentPrice.value;
    amountStr.value = String(Math.round(calcAmount));
    amountDisplay.value = amountStr.value;
  }
  sharesDisplay.value = String(roundedShares);
}

function updateShares() {
  sharesDisplay.value = String(volume.value);
}

// Watch for changes to auto-update
watch([amount, currentPrice], () => {
  updateShares();
});

// Keypad
function tapKey(k: string) {
  amountMode.value = 'amount';
  if (k === 'C') {
    amountStr.value = amountStr.value.slice(0, -1);
  } else if (k === 'AC') {
    amountStr.value = '';
  } else {
    amountStr.value += k;
  }
  amountDisplay.value = amountStr.value;
  updateShares();
}

// Order flow
function openConfirmModal() {
  orderError.value = '';
  if (!canSubmit.value) return;
  showConfirm.value = true;
}

async function submitOrder() {
  submitting.value = true;
  orderError.value = '';
  try {
    const vtSymbol = `${selectedStock.value!.code}.${selectedStock.value!.exchange}`;
    let url = `/orders?vt_symbol=${encodeURIComponent(vtSymbol)}&direction=LONG&order_type=${priceType.value.toUpperCase()}&volume=${volume.value}&amount=${amount.value}&gateway_name=simulated`;
    if (priceType.value === 'limit' && limitPrice.value != null) {
      url += `&price=${limitPrice.value}`;
    }
    const result = await api.post(url);
    showConfirm.value = false;
    toast(`Order placed: ${result.vt_orderid || result.id}`);
    // Reset form
    amountStr.value = '';
    amountDisplay.value = '';
    sharesDisplay.value = '';
    searchQuery.value = '';
    selectedStock.value = null;
    currentPrice.value = 0;
  } catch (e: any) {
    orderError.value = e.message || 'Order failed';
  }
  submitting.value = false;
}

loadTemplates();
loadAvailableCash();
</script>

<style scoped>
.search-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: var(--tr-panel);
  border: 1px solid var(--tr-border);
  border-radius: var(--tr-radius-sm);
  max-height: 240px;
  overflow-y: auto;
  z-index: 50;
  box-shadow: 0 12px 32px rgba(0,0,0,0.5);
}
.search-item {
  display: flex;
  align-items: center;
  padding: 10px 14px;
  cursor: pointer;
  font-size: 14px;
  transition: background 0.1s;
}
.search-item:hover {
  background: var(--tr-bg);
}

/* Quote Bar */
.quote-bar {
  display: grid;
  grid-template-columns: 1fr 1.5fr 1fr;
  gap: 8px;
  padding: 8px 12px;
  background: var(--tr-bg);
  border-radius: var(--tr-radius-sm);
  text-align: center;
}
.quote-side {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.quote-mid {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0 8px;
  border-left: 1px solid var(--tr-border);
  border-right: 1px solid var(--tr-border);
}

/* Amount mode toggle */
.toggle-btn {
  flex: 1;
  padding: 6px 12px;
  border: none;
  background: transparent;
  color: var(--tr-muted);
  border-radius: 6px;
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
}
.toggle-btn.active {
  background: var(--tr-brand);
  color: white;
}

/* Strategy Preview */
.strategy-preview {
  border: 1px solid rgba(30, 173, 111, 0.3);
  box-shadow: 0 0 24px rgba(30, 173, 111, 0.06);
}
.rule-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 7px 0;
  font-size: 0.85rem;
}
.rule-row + .rule-row {
  border-top: 1px solid var(--tr-border);
}

/* Risk Summary */
.risk-row {
  display: flex;
  justify-content: space-between;
  padding: 5px 0;
  font-size: 0.85rem;
}

/* Confirm Grid */
.confirm-grid {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.confirm-item {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid var(--tr-border);
  font-size: 0.9rem;
}

.risk-warning-box {
  margin-top: 12px;
  padding: 10px;
  background: rgba(245, 158, 11, 0.08);
  border: 1px solid rgba(245, 158, 11, 0.2);
  border-radius: var(--tr-radius-sm);
  display: flex;
  flex-direction: column;
  gap: 4px;
}
</style>
