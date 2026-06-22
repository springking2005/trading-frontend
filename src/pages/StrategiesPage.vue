<template>
  <div>
    <div class="card" style="display:flex;justify-content:space-between;align-items:center">
      <span class="card-header" style="margin:0">Strategy Templates</span>
      <button class="btn btn-primary btn-sm">+ New</button>
    </div>
    <div class="card" v-for="t in templates" :key="t.name" style="cursor:pointer">
      <div style="display:flex;justify-content:space-between;align-items:start">
        <div>
          <span style="font-weight:600">{{ t.name }}</span>
          <span v-if="t.system" class="badge badge-active" style="margin-left:8px">System</span>
          <div class="text-secondary" style="margin-top:4px">{{ t.summary }}</div>
        </div>
        <button class="btn btn-sm btn-outline" :disabled="t.system">Edit</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
const templates = ref([
  { name: 'Classic T+0 Replenishment', system: true, summary: 'Base: ¥100K | Add: ¥50K | -2%/+3% | Max 5x' },
  { name: 'Aggressive - High Volatility', system: false, summary: 'Base: ¥80K | Add: ¥40K | -1.5%/+2.5% | Max 3x' },
  { name: 'Conservative - Blue Chip', system: false, summary: 'Base: ¥150K | Add: ¥75K | -3%/+2% | Max 8x' },
]);
</script>
