<template>
  <div class="exec-selector">
    <!-- Tab Bar -->
    <div class="exec-tabs">
      <button
        v-for="exec in executions"
        :key="exec.id"
        class="exec-tab"
        :class="{ 'exec-tab--active': exec.id === selectedId }"
        @click="$emit('select', exec.id)"
      >
        <span class="exec-tab-name">{{ exec.name || 'Execution' }}</span>
        <span class="badge" :class="stateBadgeClass(exec.state)">{{ exec.state }}</span>
        <span
          v-if="exec.unrealized_pnl != null"
          class="exec-tab-pnl"
          :class="exec.unrealized_pnl >= 0 ? 'text-green' : 'text-red'"
        >
          {{ exec.unrealized_pnl >= 0 ? '+' : '' }}&#165;{{ Math.abs(exec.unrealized_pnl).toLocaleString() }}
        </span>
        <span v-if="exec.is_primary" class="badge badge-active" style="margin-left:4px">&#20027;</span>
      </button>

      <!-- Add Execution Button -->
      <button class="exec-tab exec-tab--add" @click="$emit('add')">
        <span style="font-size:18px;line-height:1">+</span>
        <span class="text-secondary" style="font-size:12px">Add</span>
      </button>
    </div>

    <!-- Empty State -->
    <div v-if="executions.length === 0" class="text-secondary" style="text-align:center;padding:12px">
      <div v-if="loading">Loading executions...</div>
      <div v-else-if="error" class="text-red">{{ error }}</div>
      <div v-else>No executions</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ExecutionInfo } from '../api/api-client';

defineProps<{
  executions: ExecutionInfo[];
  selectedId: string | null;
  loading?: boolean;
  error?: string;
}>();

defineEmits<{
  select: [executionId: string];
  add: [];
}>();

function stateBadgeClass(state: string): string {
  const s = state?.toLowerCase() || '';
  if (s === 'active' || s === 'running') return 'badge-active';
  if (s === 'paused' || s === 'stopped') return 'badge-stopped';
  return 'badge-cleared';
}
</script>

<style scoped>
.exec-selector {
  margin-bottom: 12px;
}

.exec-tabs {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  align-items: flex-start;
}

.exec-tab {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  padding: 8px 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--card);
  cursor: pointer;
  transition: border-color 0.2s, box-shadow 0.2s;
  min-width: 100px;
  font-size: 13px;
  font-family: inherit;
  color: var(--text);
  line-height: 1.4;
}

.exec-tab:hover {
  border-color: var(--primary);
}

.exec-tab--active {
  border-color: var(--primary);
  box-shadow: 0 0 0 1px var(--primary);
}

.exec-tab-name {
  font-weight: 600;
}

.exec-tab-pnl {
  font-size: 11px;
  font-weight: 600;
}

.exec-tab--add {
  align-items: center;
  justify-content: center;
  border-style: dashed;
  color: var(--text-secondary);
  min-width: 60px;
  gap: 0;
}

.exec-tab--add:hover {
  color: var(--primary);
  border-color: var(--primary);
}
</style>
