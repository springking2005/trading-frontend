<template>
  <div>
    <!-- Error State -->
    <div v-if="error" class="card" style="text-align:center;padding:32px">
      <div class="text-up" style="margin-bottom:12px">{{ error }}</div>
      <button class="btn btn-primary" @click="loadDashboard">Retry</button>
    </div>

    <template v-else>
      <!-- Page Header -->
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:1.5rem">
        <h2 style="margin:0;font-size:1.25rem;font-weight:700;color:var(--tr-text)">驾驶舱概览</h2>
        <span class="pulse-dot"></span>
        <span style="font-size:0.75rem;color:var(--tr-brand)">行情及策略引擎连接正常</span>
      </div>

      <!-- Metric Cards -->
      <div class="metrics-grid" style="margin-bottom:1.5rem">
        <div class="metric-card">
          <div class="label" style="display:flex;align-items:center;gap:6px">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
            总资产
          </div>
          <div class="value">&yen;{{ summary.totalValue.toLocaleString() }}</div>
        </div>
        <div class="metric-card">
          <div class="label" style="display:flex;align-items:center;gap:6px">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
            今日盈亏
          </div>
          <div class="value" :class="summary.todayPnl >= 0 ? 'text-down' : 'text-up'">
            {{ summary.todayPnl >= 0 ? '+' : '' }}&yen;{{ summary.todayPnl.toLocaleString() }}
          </div>
          <span class="badge" :class="summary.todayPnl >= 0 ? '' : 'badge-danger'" style="margin-top:6px">
            {{ summary.todayPnl >= 0 ? '+' : '' }}{{ summary.usagePct > 0 ? ((summary.todayPnl / (summary.totalValue - summary.todayPnl + 1)) * 100).toFixed(2) : '0.00' }}%
          </span>
        </div>
        <div class="metric-card">
          <div class="label" style="display:flex;align-items:center;gap:6px">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.21 15.89A10 10 0 1118 2.83"/><path d="M22 12A10 10 0 0012 2v10l6.36 6.36"/></svg>
            可用资金
          </div>
          <div class="value" style="color:var(--tr-warning)">&yen;{{ summary.availableCash.toLocaleString() }}</div>
          <div class="progress-bar" style="margin-top:8px">
            <div class="progress-bar-fill warning" :style="{ width: summary.usagePct + '%' }"></div>
          </div>
          <span class="text-muted" style="font-size:0.7rem">占用 {{ summary.usagePct }}%</span>
        </div>
        <div class="metric-card">
          <div class="label" style="display:flex;align-items:center;gap:6px">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
            活跃策略数
          </div>
          <div class="value" style="color:var(--tr-brand)">{{ summary.activeCount }}</div>
          <span class="text-muted" style="font-size:0.75rem">占用单票总容量: {{ summary.usagePct }}%</span>
        </div>
      </div>

      <!-- Advanced Mode Toggle -->
      <div v-if="enableMultiExecution" class="card" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.5rem">
        <div>
          <span style="font-weight:600;color:var(--tr-text)">高级模式</span>
          <span class="text-muted" style="margin-left:8px;font-size:12px">多策略并行执行</span>
        </div>
        <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
          <span style="font-size:13px;color:var(--tr-muted)">{{ advancedMode ? 'ON' : 'OFF' }}</span>
          <button class="toggle" :class="{ active: advancedMode }" @click="advancedMode = !advancedMode"></button>
        </label>
      </div>

      <!-- Two Column Layout: Chart + Event Log -->
      <div class="two-col" style="margin-bottom:1.5rem">
        <!-- Left: Strategy Return Curve -->
        <div class="card">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem">
            <span style="font-weight:600;font-size:0.95rem;color:var(--tr-text)">策略总收益率曲线</span>
            <div style="display:flex;gap:6px">
              <button class="btn btn-sm" :class="chartPeriod === '1D' ? 'btn-primary' : 'btn-outline'" @click="chartPeriod = '1D'">1D</button>
              <button class="btn btn-sm" :class="chartPeriod === '1W' ? 'btn-primary' : 'btn-outline'" @click="chartPeriod = '1W'">1W</button>
              <button class="btn btn-sm" :class="chartPeriod === '1M' ? 'btn-primary' : 'btn-outline'" @click="chartPeriod = '1M'">1M</button>
              <button class="btn btn-sm" :class="chartPeriod === 'ALL' ? 'btn-primary' : 'btn-outline'" @click="chartPeriod = 'ALL'">ALL</button>
            </div>
          </div>
          <!-- SVG Placeholder Chart -->
          <svg viewBox="0 0 600 240" style="width:100%;height:auto;max-height:260px" preserveAspectRatio="xMidYMid meet">
            <defs>
              <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="var(--tr-brand)" stop-opacity="0.25"/>
                <stop offset="100%" stop-color="var(--tr-brand)" stop-opacity="0"/>
              </linearGradient>
            </defs>
            <rect x="0" y="0" width="600" height="240" fill="var(--tr-bg)" rx="8"/>
            <!-- Grid lines -->
            <line v-for="i in 4" :key="'gl'+i" x1="50" :y1="40 + i * 45" x2="580" :y2="40 + i * 45" stroke="var(--tr-border)" stroke-width="0.5"/>
            <!-- Area fill -->
            <path :d="chartAreaPath" fill="url(#chartFill)"/>
            <!-- Line -->
            <path :d="chartLinePath" fill="none" stroke="var(--tr-brand)" stroke-width="2"/>
            <!-- Dot at end -->
            <circle :cx="chartPoints[chartPoints.length-1]?.x || 580" :cy="chartPoints[chartPoints.length-1]?.y || 120" r="4" fill="var(--tr-brand)"/>
          </svg>
        </div>

        <!-- Right: Event Log -->
        <div class="card" style="display:flex;flex-direction:column">
          <span style="font-weight:600;font-size:0.95rem;color:var(--tr-text);margin-bottom:0.75rem">系统日志 & 策略事件</span>
          <div style="flex:1;overflow-y:auto;max-height:260px;display:flex;flex-direction:column;gap:8px">
            <div v-for="(evt, i) in eventLog" :key="i" class="event-row">
              <span class="event-dot" :class="'event-' + evt.type"></span>
              <div style="flex:1;min-width:0">
                <div style="font-size:0.8rem;color:var(--tr-text)">{{ evt.msg }}</div>
                <div style="font-size:0.65rem;color:var(--tr-muted)">{{ evt.time }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="card" style="text-align:center;padding:32px;color:var(--tr-muted)">
        Loading positions...
      </div>

      <!-- Empty State -->
      <div v-else-if="positions.length === 0" class="card">
        <div style="text-align:center;color:var(--tr-muted);padding:24px">No active positions</div>
      </div>

      <!-- Position Cards -->
      <div v-else style="display:flex;flex-direction:column;gap:0.75rem">
        <div
          class="card position-card"
          v-for="p in positions"
          :key="p.id"
        >
          <div style="display:flex;justify-content:space-between;align-items:center;cursor:pointer"
               @click="toggleExpand(p.id)">
            <div>
              <span style="font-weight:600;cursor:pointer;color:var(--tr-text)" @click.stop="$router.push(`/positions/${p.id}`)">
                {{ p.stock_name || p.vt_symbol }}
              </span>
              <span class="badge" :class="'badge-' + p.status.toLowerCase()" style="margin-left:8px">
                {{ p.status }}
              </span>
              <span v-if="advancedMode && primaryExecution(p.id)" class="badge" style="margin-left:4px">
                主策略
              </span>
              <div class="text-muted" style="margin-top:2px">{{ p.vt_symbol }}</div>
            </div>
            <div style="text-align:right">
              <div style="color:var(--tr-text)">&yen;{{ (p.current_value || 0).toLocaleString() }}</div>
              <div :class="(p.unrealized_pnl || 0) >= 0 ? 'text-down' : 'text-up'" style="font-size:13px">
                {{ (p.unrealized_pnl || 0) >= 0 ? '+' : '' }}&yen;{{ (p.unrealized_pnl || 0).toLocaleString() }}
              </div>
            </div>
          </div>

          <!-- Capacity Bar -->
          <div class="progress-bar" style="margin-top:8px">
            <div class="progress-bar-fill" :style="{ width: capacityPct(p) + '%' }"></div>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--tr-muted);margin-top:2px">
            <span>{{ p.add_count || 0 }} / {{ p.max_add_count || 5 }} adds</span>
            <span>{{ ((p.add_count || 0) / (p.max_add_count || 5) * 100).toFixed(0) }}%</span>
          </div>

          <!-- Expanded TradeLots & Executions -->
          <div v-if="expandedIds.has(p.id)" style="margin-top:12px;border-top:1px solid var(--tr-border);padding-top:12px">
            <!-- Advanced Mode: Execution Rows -->
            <template v-if="advancedMode">
              <div v-if="executionsLoading[p.id]" class="text-muted" style="text-align:center;padding:8px">
                Loading executions...
              </div>
              <div v-else-if="executionsError[p.id]" class="text-up" style="text-align:center;padding:8px;font-size:13px">
                {{ executionsError[p.id] }}
              </div>
              <div
                v-for="exec in stockExecutions[p.id]"
                :key="exec.id"
                class="exec-row"
              >
                <div style="display:flex;justify-content:space-between;align-items:center">
                  <div>
                    <span style="font-weight:500;color:var(--tr-text)">{{ exec.name || 'Execution' }}</span>
                    <span v-if="exec.is_primary" class="badge" style="margin-left:6px">主策略</span>
                    <span class="badge" :class="stateBadgeClass(exec.state)" style="margin-left:4px">{{ exec.state }}</span>
                    <span v-if="exec.strategy_template_name" class="text-muted" style="margin-left:6px;font-size:11px">
                      {{ exec.strategy_template_name }}
                    </span>
                  </div>
                  <div style="text-align:right;font-size:13px">
                    <div v-if="exec.unrealized_pnl != null" :class="exec.unrealized_pnl >= 0 ? 'text-down' : 'text-up'">
                      {{ exec.unrealized_pnl >= 0 ? '+' : '' }}&yen;{{ exec.unrealized_pnl.toLocaleString() }}
                    </div>
                    <button
                      v-if="!exec.is_primary"
                      class="btn btn-sm btn-outline"
                      style="padding:2px 8px;font-size:11px;margin-top:2px"
                      @click.stop="removeExecution(p.id, exec.id)"
                    >
                      删除
                    </button>
                  </div>
                </div>
              </div>
              <button
                class="btn btn-sm btn-outline btn-block"
                style="margin-top:8px"
                @click.stop="openAddExecutionModal(p)"
              >
                + 添加策略
              </button>
            </template>

            <!-- Trade Lots (Basic Mode) -->
            <template v-if="!advancedMode">
              <div v-if="tradeLots[p.id]?.loading" class="text-muted" style="text-align:center;padding:8px">
                Loading trade lots...
              </div>
              <div v-else-if="!tradeLots[p.id]?.lots?.length" class="text-muted" style="text-align:center;padding:8px">
                No trade lots
              </div>
              <div v-else v-for="lot in tradeLots[p.id]?.lots" :key="lot.id" class="lot-row">
                <div style="display:flex;justify-content:space-between;align-items:center">
                  <div>
                    <span style="font-weight:500;color:var(--tr-text)">#{{ lot.batch_number || lot.batch_index }}</span>
                    <span class="badge" :class="'badge-' + lotStatusClass(lot.status)" style="margin-left:6px">
                      {{ lot.status }}
                    </span>
                  </div>
                  <div style="text-align:right">
                    <div style="color:var(--tr-text)">&yen;{{ (lot.entry_price || 0).toFixed(2) }}</div>
                    <div class="text-muted">{{ (lot.entry_volume || lot.volume || 0) }} shares</div>
                  </div>
                </div>
                <div style="display:flex;justify-content:space-between;margin-top:4px;font-size:12px">
                  <span class="text-muted">Buy: {{ formatDate(lot.entry_time || lot.created_at) }}</span>
                  <span v-if="lot.target_sell_price" class="text-muted">
                    Target: &yen;{{ lot.target_sell_price }}
                  </span>
                  <span v-if="lot.pnl != null" :class="lot.pnl >= 0 ? 'text-down' : 'text-up'">
                    P&amp;L: &yen;{{ lot.pnl.toLocaleString() }}
                  </span>
                </div>
              </div>
            </template>
          </div>
        </div>
      </div>

      <!-- Add Execution Modal -->
      <div v-if="showAddExecModal" class="modal" @click.self="closeAddExecModal">
        <div class="modal-content">
          <div class="modal-header">添加策略执行</div>

          <!-- Loading -->
          <div v-if="addExecLoading" class="text-muted" style="text-align:center;padding:16px">Loading templates...</div>

          <!-- Error -->
          <div v-else-if="addExecError" class="text-up" style="text-align:center;padding:8px;margin-bottom:8px">{{ addExecError }}</div>

          <template v-else>
            <!-- Stock info -->
            <div class="text-muted" style="margin-bottom:12px;font-size:13px">
              Stock: {{ addExecStock?.stock_name || addExecStock?.vt_symbol }}
            </div>

            <!-- Template Selector -->
            <div class="input-group">
              <label>Strategy Template</label>
              <select class="input" v-model="addExecTemplateId">
                <option value="">Select template...</option>
                <option v-for="t in addExecTemplates" :key="t.id" :value="t.id">
                  {{ t.name }}{{ t.is_system ? ' (System)' : '' }}
                </option>
              </select>
            </div>

            <!-- Execution Name -->
            <div class="input-group">
              <label>Execution Name (optional)</label>
              <input class="input" v-model="addExecName" type="text" placeholder="e.g. Tail Grid #2" />
            </div>

            <!-- Key Parameters -->
            <div v-if="selectedAddTemplate" class="param-group">
              <div class="param-group-label">Parameters (default from template)</div>
              <div class="row">
                <div class="input-group" style="flex:1">
                  <label>Base Amount (&yen;)</label>
                  <input class="input" v-model.number="addExecParams.base_position_amount" type="number" step="10000" />
                </div>
                <div class="input-group" style="flex:1">
                  <label>Add Amount (&yen;)</label>
                  <input class="input" v-model.number="addExecParams.add_position_amount" type="number" step="10000" />
                </div>
              </div>
              <div class="row">
                <div class="input-group" style="flex:1">
                  <label>Max Add Count</label>
                  <input class="input" v-model.number="addExecParams.max_add_count" type="number" min="1" max="20" />
                </div>
                <div class="input-group" style="flex:1">
                  <label>Max Position Amt (&yen;)</label>
                  <input class="input" v-model.number="addExecParams.max_position_amount" type="number" step="10000" />
                </div>
              </div>
              <div class="row">
                <div class="input-group" style="flex:1">
                  <label>Add Trigger (%)</label>
                  <input class="input" v-model.number="addExecParams.add_trigger_pct" type="number" step="0.1" />
                </div>
                <div class="input-group" style="flex:1">
                  <label>Sell Trigger (%)</label>
                  <input class="input" v-model.number="addExecParams.sell_trigger_pct" type="number" step="0.1" />
                </div>
              </div>
              <div class="row">
                <div class="input-group" style="flex:1">
                  <label>Hard Stop Loss (%)</label>
                  <input class="input" v-model.number="addExecParams.hard_stop_loss_pct" type="number" step="0.1" />
                </div>
              </div>
            </div>
          </template>

          <div class="modal-actions">
            <button class="btn btn-outline" @click="closeAddExecModal">Cancel</button>
            <button
              class="btn btn-primary"
              :disabled="!addExecTemplateId || addingExecution"
              @click="addExecution"
            >
              {{ addingExecution ? 'Adding...' : 'Add Execution' }}
            </button>
          </div>
        </div>
      </div>

      <button class="btn btn-primary btn-block btn-lg" @click="$router.push('/order')">+ New Order</button>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue';
import { api, executionsApi, toast } from '../api/api-client';
import type { ExecutionInfo, SettingsResponse } from '../api/api-client';
import { WsClient } from '../api/ws-client';

interface DashboardData {
  positions: { total: number; active: number; cleared: number };
  capital: { total_invested: number; current_value: number; balance: number; frozen: number; available: number; usage_pct: number };
  pnl: { unrealized: number; realized: number; total: number };
}

interface Position {
  id: string;
  vt_symbol: string;
  stock_name?: string;
  status: string;
  current_value?: number;
  unrealized_pnl?: number;
  add_count?: number;
  max_add_count?: number;
  strategy_instance_id?: string;
}

interface TradeLot {
  id: string;
  batch_number?: number;
  batch_index?: number;
  status: string;
  entry_price?: number;
  entry_volume?: number;
  volume?: number;
  entry_time?: string;
  created_at?: string;
  target_sell_price?: number;
  pnl?: number;
  pnl_pct?: number;
}

interface TemplateResult {
  id: string;
  name: string;
  description: string | null;
  is_system: boolean;
  params: Record<string, any>;
}

const loading = ref(true);
const error = ref('');
const positions = ref<Position[]>([]);
const expandedIds = ref(new Set<string>());
const tradeLots = reactive<Record<string, { loading: boolean; lots: TradeLot[] }>>({});

const summary = ref({
  totalValue: 0,
  todayPnl: 0,
  availableCash: 0,
  activeCount: 0,
  usagePct: 0,
});

// ── Advanced Mode State ──
const enableMultiExecution = ref(false);
const advancedMode = ref(false);
const stockExecutions = reactive<Record<string, ExecutionInfo[]>>({});
const executionsLoading = reactive<Record<string, boolean>>({});
const executionsError = reactive<Record<string, string>>({});

// Add Execution Modal State
const showAddExecModal = ref(false);
const addExecLoading = ref(false);
const addExecError = ref('');
const addExecStock = ref<Position | null>(null);
const addExecTemplates = ref<TemplateResult[]>([]);
const addExecTemplateId = ref('');
const addExecName = ref('');
const addingExecution = ref(false);
const addExecParams = reactive<Record<string, any>>({});

const selectedAddTemplate = computed(() =>
  addExecTemplates.value.find(t => t.id === addExecTemplateId.value) || null
);

const wsClient = new WsClient();

// Chart state
const chartPeriod = ref('1M');

// Chart data — placeholder points for SVG
const chartPoints = computed(() => {
  const points: { x: number; y: number }[] = [];
  const count = chartPeriod.value === '1D' ? 8 : chartPeriod.value === '1W' ? 12 : chartPeriod.value === '1M' ? 24 : 36;
  const startX = 50;
  const endX = 580;
  const stepX = (endX - startX) / (count - 1);
  const baseY = 200;
  const amp = 140;
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1);
    const y = baseY - (t * amp * 0.7) + Math.sin(t * Math.PI * 2.5) * amp * 0.15;
    points.push({ x: startX + i * stepX, y });
  }
  return points;
});

const chartLinePath = computed(() => {
  if (chartPoints.value.length === 0) return '';
  return 'M' + chartPoints.value.map(p => `${p.x},${p.y}`).join(' L');
});

const chartAreaPath = computed(() => {
  if (chartPoints.value.length === 0) return '';
  const first = chartPoints.value[0];
  const last = chartPoints.value[chartPoints.value.length - 1];
  return `M${first.x},240 L${chartPoints.value.map(p => `${p.x},${p.y}`).join(' L')} L${last.x},240 Z`;
});

// Event log — starts with placeholders, updates from WS
const eventLog = reactive<{ type: string; msg: string; time: string }[]>([
  { type: 'success', msg: '策略引擎已启动，监控 0 只活跃股票', time: new Date().toLocaleTimeString() },
  { type: 'info', msg: '行情数据源连接正常 (simulated)', time: new Date(Date.now() - 30000).toLocaleTimeString() },
]);

function capacityPct(p: Position): number {
  const used = p.add_count || 0;
  const max = p.max_add_count || 5;
  return Math.min((used / max) * 100, 100);
}

function lotStatusClass(status: string): string {
  const s = status?.toLowerCase() || '';
  if (s === 'holding') return 'active';
  if (s === 'pending_sell') return 'stopped';
  if (s === 'sold') return 'cleared';
  if (s === 'locked') return 'stopped';
  return 'cleared';
}

function stateBadgeClass(state: string): string {
  const s = state?.toLowerCase() || '';
  if (s === 'active' || s === 'running') return 'badge-active';
  if (s === 'paused' || s === 'stopped') return 'badge-stopped';
  return 'badge-cleared';
}

function formatDate(d: string | undefined): string {
  if (!d) return '--';
  try { return new Date(d).toLocaleDateString(); } catch { return d.slice(0, 10); }
}

function primaryExecution(stockId: string): ExecutionInfo | null {
  const execs = stockExecutions[stockId];
  if (!execs) return null;
  return execs.find(e => e.is_primary) || execs[0] || null;
}

async function loadSettings() {
  try {
    const data: SettingsResponse = await api.get('/settings');
    enableMultiExecution.value = data.enable_multi_execution_per_stock === true;
  } catch {
    enableMultiExecution.value = false;
  }
}

async function loadDashboard() {
  loading.value = true;
  error.value = '';
  try {
    const dash: DashboardData = await api.get('/dashboard');
    summary.value = {
      totalValue: dash.capital.current_value,
      todayPnl: dash.pnl.total,
      availableCash: dash.capital.available,
      activeCount: dash.positions.active,
      usagePct: dash.capital.usage_pct,
    };

    const posData = await api.get('/positions');
    positions.value = Array.isArray(posData) ? posData : (posData.items || []);
  } catch (e: any) {
    error.value = e.message || 'Failed to load dashboard';
  }
  loading.value = false;
}

async function loadExecutions(stockId: string) {
  if (stockExecutions[stockId]) return;
  executionsLoading[stockId] = true;
  executionsError[stockId] = '';
  try {
    const data = await executionsApi.list(stockId);
    stockExecutions[stockId] = Array.isArray(data) ? data : [];
  } catch (e: any) {
    executionsError[stockId] = e.message || 'Failed to load executions';
    stockExecutions[stockId] = [];
  }
  executionsLoading[stockId] = false;
}

async function openAddExecutionModal(p: Position) {
  addExecStock.value = p;
  addExecTemplateId.value = '';
  addExecName.value = '';
  addExecError.value = '';
  addExecParams.base_position_amount = null;
  addExecParams.add_position_amount = null;
  addExecParams.max_add_count = null;
  addExecParams.max_position_amount = null;
  addExecParams.add_trigger_pct = null;
  addExecParams.sell_trigger_pct = null;
  addExecParams.hard_stop_loss_pct = null;
  showAddExecModal.value = true;

  // Load templates if not loaded
  if (addExecTemplates.value.length === 0) {
    addExecLoading.value = true;
    try {
      const data = await api.get('/strategies/templates');
      addExecTemplates.value = Array.isArray(data) ? data : [];
    } catch (e: any) {
      addExecError.value = e.message || 'Failed to load templates';
    }
    addExecLoading.value = false;
  }
}

function closeAddExecModal() {
  showAddExecModal.value = false;
  addExecStock.value = null;
}

async function addExecution() {
  if (!addExecStock.value || !addExecTemplateId.value) return;
  addingExecution.value = true;
  addExecError.value = '';
  try {
    await executionsApi.create({
      stock_id: addExecStock.value.id,
      strategy_template_id: addExecTemplateId.value,
      name: addExecName.value || undefined,
      params: { ...addExecParams },
    });
    toast('Execution added');
    showAddExecModal.value = false;
    // Reload executions for this stock
    delete stockExecutions[addExecStock.value.id];
    await loadExecutions(addExecStock.value.id);
  } catch (e: any) {
    addExecError.value = e.message || 'Failed to add execution';
  }
  addingExecution.value = false;
}

async function removeExecution(stockId: string, executionId: string) {
  try {
    await executionsApi.remove(stockId, executionId);
    toast('Execution removed');
    delete stockExecutions[stockId];
    await loadExecutions(stockId);
  } catch (e: any) {
    toast(e.message || 'Failed to remove execution');
  }
}

async function toggleExpand(posId: string) {
  if (expandedIds.value.has(posId)) {
    expandedIds.value.delete(posId);
  } else {
    expandedIds.value.add(posId);
    if (advancedMode.value && enableMultiExecution.value) {
      // Load executions for advanced mode
      loadExecutions(posId);
    }
    if (!tradeLots[posId]) {
      tradeLots[posId] = { loading: true, lots: [] };
      try {
        const data = await api.get(`/positions/${posId}`);
        tradeLots[posId].lots = (data.batches || []).map((b: any) => ({
          ...b,
          batch_number: b.batch_index,
          entry_time: b.entry_time,
        }));
      } catch {
        tradeLots[posId].lots = [];
      }
      tradeLots[posId].loading = false;
    }
  }
  // trigger reactivity
  expandedIds.value = new Set(expandedIds.value);
}

function onWsMessage(msg: any) {
  if (msg.type === 'portfolio') {
    const d = msg.data;
    if (d) {
      summary.value = {
        totalValue: d.total_value ?? summary.value.totalValue,
        todayPnl: d.today_pnl ?? summary.value.todayPnl,
        availableCash: d.available_cash ?? summary.value.availableCash,
        activeCount: d.active_count ?? summary.value.activeCount,
        usagePct: d.usage_pct ?? summary.value.usagePct,
      };
      if (d.positions) positions.value = d.positions;
    }
  }
}

onMounted(() => {
  loadSettings();
  loadDashboard();
  wsClient.on('portfolio', onWsMessage);
  wsClient.connect('portfolio');
});

onUnmounted(() => {
  wsClient.disconnect();
});
</script>

<style scoped>
.position-card { cursor: pointer; }
.lot-row {
  padding: 8px;
  margin-bottom: 4px;
  border-radius: var(--tr-radius-sm);
  background: var(--tr-bg);
  font-size: 13px;
}
.exec-row {
  padding: 8px;
  margin-bottom: 4px;
  border-radius: var(--tr-radius-sm);
  background: var(--tr-bg);
  font-size: 13px;
  border-left: 3px solid var(--tr-brand);
}
.param-group {
  margin-bottom: 16px;
}
.param-group-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--tr-muted);
  text-transform: uppercase;
  margin-bottom: 8px;
  letter-spacing: 0.5px;
}

/* Pulse dot */
.pulse-dot {
  width: 8px;
  height: 8px;
  background: var(--tr-brand);
  border-radius: 50%;
  display: inline-block;
  animation: pulse 2s infinite;
}
@keyframes pulse {
  0% { box-shadow: 0 0 0 0 rgba(30, 173, 111, 0.6); }
  70% { box-shadow: 0 0 0 8px rgba(30, 173, 111, 0); }
  100% { box-shadow: 0 0 0 0 rgba(30, 173, 111, 0); }
}

/* Event log rows */
.event-row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 6px;
  background: var(--tr-bg);
  font-size: 13px;
}
.event-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  margin-top: 5px;
  flex-shrink: 0;
}
.event-success { background: var(--tr-brand); }
.event-info { background: var(--tr-muted); }
.event-warning { background: var(--tr-warning); }
.event-danger { background: var(--tr-up); }
</style>
