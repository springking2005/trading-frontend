<template>
  <div>
    <!-- Header -->
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.5rem;flex-wrap:wrap;gap:0.75rem">
      <div style="display:flex;align-items:center;gap:0.75rem">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--tr-brand)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/>
        </svg>
        <span style="font-size:1.25rem;font-weight:700;color:var(--tr-text)">策略模板库</span>
      </div>
      <button class="btn btn-primary" data-testid="strategy-create-btn" @click="openCreateModal">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="margin-right:0.375rem"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        新建策略模板
      </button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="card" style="text-align:center;padding:2rem;color:var(--tr-muted)">加载中...</div>

    <!-- Error -->
    <div v-else-if="error" class="card" style="text-align:center;padding:2rem">
      <div style="color:var(--tr-up);margin-bottom:0.75rem">{{ error }}</div>
      <button class="btn btn-primary" @click="loadTemplates">重试</button>
    </div>

    <!-- Template Grid -->
    <div v-else class="strategy-grid">
      <div
        v-for="t in templates"
        :key="t.id"
        class="card strategy-card"
        :class="{ 'strategy-card-builtin': t.is_system }"
        data-testid="strategy-card"
      >
        <!-- Built-in badge -->
        <span v-if="t.is_system" class="strategy-builtin-badge">内置默认</span>

        <!-- Card header -->
        <div style="display:flex;align-items:flex-start;gap:0.75rem;margin-bottom:0.75rem">
          <div class="strategy-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" :stroke="t.is_system ? 'var(--tr-brand)' : 'var(--tr-muted)'" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2"/>
              <line x1="12" y1="22" x2="12" y2="15.5"/>
            </svg>
          </div>
          <div style="flex:1;min-width:0">
            <div style="font-weight:600;color:var(--tr-text);font-size:0.9375rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{{ t.name }}</div>
            <div style="font-size:0.8125rem;color:var(--tr-muted);margin-top:0.125rem">
              {{ t.description || '暂无描述' }}
            </div>
          </div>
        </div>

        <!-- Parameter rows -->
        <div class="strategy-params">
          <div class="strategy-param-row">
            <span class="strategy-param-label">底仓股数</span>
            <span class="strategy-param-value">{{ t.params?.base_position_shares ? t.params.base_position_shares + ' 股' : '未设' }}</span>
          </div>
          <div class="strategy-param-row">
            <span class="strategy-param-label">补仓触发（跌幅）</span>
            <span class="strategy-param-value text-down">{{ t.params?.add_trigger_pct ?? '--' }}%</span>
          </div>
          <div class="strategy-param-row">
            <span class="strategy-param-label">补仓股数</span>
            <span class="strategy-param-value">{{ t.params?.add_position_shares ? t.params.add_position_shares + ' 股' : '未设' }}</span>
          </div>
          <div class="strategy-param-row">
            <span class="strategy-param-label">止盈触发（涨幅）</span>
            <span class="strategy-param-value text-up">{{ t.params?.sell_trigger_pct ?? '--' }}%</span>
          </div>
          <div class="strategy-param-row">
            <span class="strategy-param-label">最大补仓次数</span>
            <span class="strategy-param-value">{{ t.params?.max_add_count ?? '--' }}</span>
          </div>
          <div class="strategy-param-row">
            <span class="strategy-param-label">硬止损（跌幅）</span>
            <span class="strategy-param-value text-up">{{ t.params?.hard_stop_loss_pct ?? '--' }}%</span>
          </div>
        </div>

        <!-- Action buttons -->
        <div style="display:flex;gap:0.375rem;margin-top:0.75rem">
          <button class="btn btn-sm btn-outline" style="flex:1" data-testid="strategy-edit-btn" @click="openEditModal(t)">编辑</button>
          <button class="btn btn-sm btn-outline" style="flex:1" @click="cloneTemplate(t)">克隆</button>
          <button v-if="!t.is_system" class="btn btn-sm btn-danger" style="flex:0" data-testid="strategy-delete-btn" @click="confirmDelete(t)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
          </button>
        </div>
      </div>

      <!-- Empty state -->
      <div v-if="templates.length === 0 && !loading" class="card" style="text-align:center;padding:2rem;color:var(--tr-muted);grid-column:1/-1">
        暂无策略模板，点击"新建策略模板"创建
      </div>
    </div>

    <!-- Create / Edit Modal -->
    <div v-if="showFormModal" class="modal-overlay" @click.self="closeFormModal">
      <div class="modal-content" style="max-width:520px">
        <div class="modal-header">{{ editingTemplate ? '编辑策略模板' : '新建策略模板' }}</div>

        <div class="input-group">
          <label>名称</label>
          <input class="input-field" v-model="formData.name" type="text" placeholder="例如：激进网格" />
        </div>
        <div class="input-group">
          <label>描述</label>
          <input class="input-field" v-model="formData.description" type="text" placeholder="简要描述..." />
        </div>

        <div class="param-group">
          <div class="param-group-label">建仓参数</div>
          <div class="param-hint">底仓股数为首次建仓的股票数量；补仓股数为每次补仓的数量</div>
          <div class="row">
            <div class="input-group" style="flex:1">
              <label>底仓股数</label>
              <input class="input-field" v-model.number="formData.base_position_shares" type="number" step="100" min="100" placeholder="如 1000" />
            </div>
            <div class="input-group" style="flex:1">
              <label>补仓股数</label>
              <input class="input-field" v-model.number="formData.add_position_shares" type="number" step="100" min="100" placeholder="如 500" />
              <div class="param-hint" v-if="formData.add_position_shares && formData.add_position_shares > 0">每次补仓 {{ formData.add_position_shares }} 股</div>
            </div>
          </div>
        </div>

        <div class="param-group">
          <div class="param-group-label">仓位参数</div>
          <div class="row">
            <div class="input-group" style="flex:1">
              <label>最大补仓次数</label>
              <input class="input-field" v-model.number="formData.max_add_count" type="number" min="1" max="20" />
            </div>
            <div class="input-group" style="flex:1">
              <label>单票容量上限 (&yen;)</label>
              <input class="input-field" v-model.number="formData.max_position_amount" type="number" step="10000" />
            </div>
          </div>
        </div>

        <div class="param-group">
          <div class="param-group-label">离场参数</div>
          <div class="row">
            <div class="input-group" style="flex:1">
              <label>补仓触发（跌幅%，须为负）</label>
              <input class="input-field" v-model.number="formData.add_trigger_pct" type="number" step="0.1" placeholder="如 -2" />
              <div class="param-hint" :class="{ 'param-hint--error': formData.add_trigger_pct != null && formData.add_trigger_pct >= 0 }">价格下跌到此幅度时自动补仓（如 -2 = 跌2%补仓）</div>
            </div>
            <div class="input-group" style="flex:1">
              <label>止盈触发（涨幅%，须为正）</label>
              <input class="input-field" v-model.number="formData.sell_trigger_pct" type="number" step="0.1" placeholder="如 3" />
              <div class="param-hint" :class="{ 'param-hint--error': formData.sell_trigger_pct != null && formData.sell_trigger_pct <= 0 }">补仓批次盈利到此幅度卖出该批；底仓不自动止盈（如 3 = 涨3%卖该批）</div>
            </div>
          </div>
        </div>

        <div class="param-group">
          <div class="param-group-label">风控开关</div>
          <div class="checkbox-group">
            <label class="checkbox-label">
              <input type="checkbox" v-model="formData.enable_auto_add" />
              <span>启用自动补仓</span>
            </label>
            <label class="checkbox-label">
              <input type="checkbox" v-model="formData.enable_auto_sell" />
              <span>启用自动止盈</span>
            </label>
            <label class="checkbox-label">
              <input type="checkbox" v-model="formData.enable_hard_stop" />
              <span>启用硬止损（默认关闭）</span>
            </label>
          </div>
          <div class="param-hint">硬止损默认关闭，须主动勾选。启用后底仓价跌到止损线将全部清仓（含底仓+补仓）。</div>
          <div class="row" v-if="formData.enable_hard_stop">
            <div class="input-group" style="flex:1">
              <label>硬止损（跌幅%，须为负）</label>
              <input class="input-field" v-model.number="formData.hard_stop_loss_pct" type="number" step="0.1" placeholder="如 -8" />
              <div class="param-hint" :class="{ 'param-hint--error': formData.hard_stop_loss_pct != null && formData.hard_stop_loss_pct >= 0 }">底仓价下跌到此幅度全部清仓（含底仓+补仓），停止监控（如 -8 = 跌8%清仓）</div>
            </div>
          </div>
        </div>

        <div class="modal-actions">
          <button class="btn btn-outline" @click="closeFormModal">取消</button>
          <button class="btn btn-primary" :disabled="!formData.name || saving" @click="submitForm">
            {{ saving ? '保存中...' : (editingTemplate ? '更新' : '创建') }}
          </button>
        </div>
      </div>
    </div>

    <!-- Delete Confirm Modal -->
    <div v-if="showDeleteModal" class="modal-overlay" @click.self="showDeleteModal = false">
      <div class="modal-content" style="max-width:400px">
        <div class="modal-header">确认删除</div>
        <p style="color:var(--tr-muted);margin-bottom:1rem">
          确认删除策略模板 "{{ deleteTarget?.name }}"？
        </p>
        <div class="modal-actions">
          <button class="btn btn-outline" @click="showDeleteModal = false">取消</button>
          <button class="btn btn-danger" data-testid="strategy-confirm-delete" :disabled="deleting" @click="deleteTemplate">
            {{ deleting ? '删除中...' : '确认删除' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { api, toast } from '../api/api-client';

interface StrategyTemplate {
  id: string;
  name: string;
  description: string | null;
  is_system: boolean;
  params: Record<string, any>;
}

interface TemplateFormData {
  name: string;
  description: string;
  base_position_amount: number | undefined;
  base_position_shares: number | undefined;
  add_position_amount: number | undefined;
  add_position_shares: number | undefined;
  add_trigger_pct: number | undefined;
  sell_trigger_pct: number | undefined;
  max_add_count: number | undefined;
  max_position_amount: number | undefined;
  hard_stop_loss_pct: number | undefined;
  enable_auto_add: boolean;
  enable_auto_sell: boolean;
  enable_hard_stop: boolean;
}

const loading = ref(true);
const error = ref('');
const templates = ref<StrategyTemplate[]>([]);

// Form modal
const showFormModal = ref(false);
const editingTemplate = ref<StrategyTemplate | null>(null);
const saving = ref(false);
const formData = reactive<TemplateFormData>({
  name: '',
  description: '',
  base_position_amount: undefined,
  base_position_shares: undefined,
  add_position_amount: undefined,
  add_position_shares: undefined,
  add_trigger_pct: undefined,
  sell_trigger_pct: undefined,
  max_add_count: undefined,
  max_position_amount: undefined,
  hard_stop_loss_pct: undefined,
  enable_auto_add: true,
  enable_auto_sell: true,
  enable_hard_stop: false,
});

// Delete modal
const showDeleteModal = ref(false);
const deleteTarget = ref<StrategyTemplate | null>(null);
const deleting = ref(false);

async function loadTemplates() {
  loading.value = true;
  error.value = '';
  try {
    const data = await api.get('/strategies/definitions');
    templates.value = Array.isArray(data) ? data : (data.items || []);
  } catch (e: any) {
    error.value = e.message || '加载失败';
  }
  loading.value = false;
}

function resetForm() {
  formData.name = '';
  formData.description = '';
  formData.base_position_amount = undefined;
  formData.base_position_shares = undefined;
  formData.add_position_amount = undefined;
  formData.add_position_shares = undefined;
  formData.add_trigger_pct = undefined;
  formData.sell_trigger_pct = undefined;
  formData.max_add_count = undefined;
  formData.max_position_amount = undefined;
  formData.hard_stop_loss_pct = undefined;
  formData.enable_auto_add = true;
  formData.enable_auto_sell = true;
  formData.enable_hard_stop = false;
}

function openCreateModal() {
  editingTemplate.value = null;
  resetForm();
  showFormModal.value = true;
}

function openEditModal(t: StrategyTemplate) {
  editingTemplate.value = t;
  formData.name = t.name;
  formData.description = t.description || '';
  formData.base_position_amount = t.params?.base_position_amount;
  formData.base_position_shares = t.params?.base_position_shares;
  formData.add_position_amount = t.params?.add_position_amount;
  formData.add_position_shares = t.params?.add_position_shares;
  formData.add_trigger_pct = t.params?.add_trigger_pct;
  formData.sell_trigger_pct = t.params?.sell_trigger_pct;
  formData.max_add_count = t.params?.max_add_count;
  formData.max_position_amount = t.params?.max_position_amount;
  formData.hard_stop_loss_pct = t.params?.hard_stop_loss_pct;
  formData.enable_auto_add = t.params?.enable_auto_add ?? true;
  formData.enable_auto_sell = t.params?.enable_auto_sell ?? true;
  formData.enable_hard_stop = t.params?.enable_hard_stop ?? false;
  showFormModal.value = true;
}

function closeFormModal() {
  showFormModal.value = false;
  editingTemplate.value = null;
}

function buildParams(): Record<string, any> {
  const p: Record<string, any> = {};
  if (formData.base_position_amount != null) p.base_position_amount = formData.base_position_amount;
  if (formData.base_position_shares != null) p.base_position_shares = formData.base_position_shares;
  if (formData.add_position_amount != null) p.add_position_amount = formData.add_position_amount;
  if (formData.add_position_shares != null) p.add_position_shares = formData.add_position_shares;
  if (formData.add_trigger_pct != null) p.add_trigger_pct = formData.add_trigger_pct;
  if (formData.sell_trigger_pct != null) p.sell_trigger_pct = formData.sell_trigger_pct;
  if (formData.max_add_count != null) p.max_add_count = formData.max_add_count;
  if (formData.max_position_amount != null) p.max_position_amount = formData.max_position_amount;
  if (formData.hard_stop_loss_pct != null) p.hard_stop_loss_pct = formData.hard_stop_loss_pct;
  p.enable_auto_add = formData.enable_auto_add;
  p.enable_auto_sell = formData.enable_auto_sell;
  p.enable_hard_stop = formData.enable_hard_stop;
  return p;
}

async function submitForm() {
  if (!formData.name) return;
  saving.value = true;
  try {
    const params = buildParams();
    if (editingTemplate.value) {
      await api.put(`/strategies/definitions/${editingTemplate.value.id}`, {
        name: formData.name,
        description: formData.description || null,
        params,
      });
      toast('模板已更新');
    } else {
      await api.post('/strategies/definitions', {
        name: formData.name,
        description: formData.description || null,
        params,
      });
      toast('模板已创建');
    }
    showFormModal.value = false;
    editingTemplate.value = null;
    await loadTemplates();
  } catch (e: any) {
    toast(e.message || '保存失败');
  }
  saving.value = false;
}

async function cloneTemplate(t: StrategyTemplate) {
  try {
    await api.post('/strategies/definitions', {
      name: `${t.name} (Copy)`,
      description: t.description,
      params: { ...t.params },
    });
    toast('模板已克隆');
    await loadTemplates();
  } catch (e: any) {
    toast(e.message || '克隆失败');
  }
}

function confirmDelete(t: StrategyTemplate) {
  deleteTarget.value = t;
  showDeleteModal.value = true;
}

async function deleteTemplate() {
  if (!deleteTarget.value) return;
  deleting.value = true;
  try {
    await api.delete(`/strategies/definitions/${deleteTarget.value.id}`);
    toast('模板已删除');
    showDeleteModal.value = false;
    deleteTarget.value = null;
    await loadTemplates();
  } catch (e: any) {
    toast(e.message || '删除失败');
  }
  deleting.value = false;
}

onMounted(() => {
  loadTemplates();
});
</script>

<style scoped>
.strategy-card {
  position: relative;
  overflow: hidden;
}
.strategy-card-builtin {
  border-color: rgba(30, 173, 111, 0.35);
  box-shadow: 0 0 24px rgba(30, 173, 111, 0.06);
}
.strategy-builtin-badge {
  position: absolute;
  top: 0.625rem;
  right: 0.625rem;
  padding: 0.1875rem 0.5625rem;
  font-size: 0.6875rem;
  font-weight: 600;
  background: rgba(30, 173, 111, 0.12);
  color: var(--tr-brand);
  border: 1px solid rgba(30, 173, 111, 0.25);
  border-radius: 4px;
}

.strategy-icon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--tr-bg);
  border-radius: var(--tr-radius-sm);
  flex-shrink: 0;
}

.strategy-params {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}
.strategy-param-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.3125rem 0.5rem;
  background: var(--tr-bg);
  border-radius: 4px;
  font-size: 0.8125rem;
}
.strategy-param-label {
  color: var(--tr-muted);
  font-size: 0.75rem;
}
.strategy-param-value {
  color: var(--tr-text);
  font-weight: 500;
  font-size: 0.8125rem;
}

.param-group {
  margin-bottom: 1rem;
}
.param-group-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--tr-muted);
  text-transform: uppercase;
  margin-bottom: 0.5rem;
  letter-spacing: 0.5px;
}
.param-hint { font-size: 0.75rem; color: var(--tr-muted, #888); margin-top: 0.25rem; }
.param-hint--error { color: #ef4444; font-weight: 600; }
.checkbox-group { display: flex; gap: 1.5rem; flex-wrap: wrap; margin-bottom: 0.5rem; }
.checkbox-label { display: flex; align-items: center; gap: 0.4rem; cursor: pointer; font-size: 0.9rem; }
.checkbox-label input[type="checkbox"] { width: 16px; height: 16px; cursor: pointer; }
</style>
