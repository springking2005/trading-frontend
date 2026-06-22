<template>
  <div>
    <div class="card">
      <div class="card-header">Portfolio Summary</div>
      <div class="grid-3">
        <div style="text-align:center">
          <div class="text-xl">¥{{ totalValue.toLocaleString() }}</div>
          <div class="text-secondary">Total Value</div>
        </div>
        <div style="text-align:center">
          <div class="text-xl" :class="pnl >= 0 ? 'text-green' : 'text-red'">¥{{ pnl.toLocaleString() }}</div>
          <div class="text-secondary">P&L</div>
        </div>
        <div style="text-align:center">
          <div class="text-xl">{{ positions.length }}</div>
          <div class="text-secondary">Positions</div>
        </div>
      </div>
    </div>
    <div class="card" v-for="p in positions" :key="p.id" style="cursor:pointer">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div>
          <span style="font-weight:600">{{ p.vt_symbol }}</span>
          <span class="badge" :class="'badge-' + p.status.toLowerCase()" style="margin-left:8px">{{ p.status }}</span>
        </div>
        <div style="text-align:right">
          <div>¥{{ p.current_value?.toLocaleString() || '0' }}</div>
          <div class="text-secondary">{{ p.add_count }}/{{ p.max_add_count || 5 }} adds</div>
        </div>
      </div>
    </div>
    <div v-if="positions.length === 0" class="card">
      <div style="text-align:center;color:var(--text-secondary);padding:24px">No active positions</div>
    </div>
    <button class="btn btn-primary btn-block btn-lg" @click="$router.push('/order')">+ New Order</button>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
const totalValue = ref(0);
const pnl = ref(0);
const positions = ref<any[]>([]);
</script>
