<template>
  <div class="p2-grid">
    <button
      v-for="item in items"
      :key="item.title"
      class="p2-card"
      type="button"
      @click="$emit('select', item)"
    >
      <div class="p2-card__top">
        <span class="p2-card__icon">{{ item.icon }}</span>
        <span class="badge" :class="badgeClass(item.status)">{{ item.status }}</span>
      </div>
      <div class="p2-card__title">{{ item.title }}</div>
      <div class="p2-card__desc">{{ item.description }}</div>
      <div v-if="item.note" class="p2-card__note">{{ item.note }}</div>
    </button>
  </div>
</template>

<script setup lang="ts">
interface P2FeatureItem {
  title: string;
  icon: string;
  description: string;
  status: '只读' | '待接入' | '占位';
  note?: string;
  target?: string;
}

defineProps<{
  items: P2FeatureItem[];
}>();

defineEmits<{
  select: [item: P2FeatureItem];
}>();

function badgeClass(status: P2FeatureItem['status']) {
  if (status === '只读') return '';
  if (status === '待接入') return 'badge-warning';
  return 'badge-muted';
}
</script>

<style scoped>
.p2-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.p2-card {
  min-height: 142px;
  padding: 14px;
  text-align: left;
  border-radius: var(--tr-radius);
  border: 1px solid var(--tr-border);
  background:
    linear-gradient(135deg, rgba(30, 173, 111, 0.08), transparent 52%),
    var(--tr-bg);
  color: var(--tr-text);
  cursor: pointer;
  transition: border-color 0.15s, transform 0.15s;
}

.p2-card:hover {
  border-color: rgba(30, 173, 111, 0.45);
  transform: translateY(-1px);
}

.p2-card__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 12px;
}

.p2-card__icon {
  width: 34px;
  height: 34px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  background: rgba(30, 173, 111, 0.12);
  border: 1px solid rgba(30, 173, 111, 0.2);
}

.p2-card__title {
  font-weight: 700;
  margin-bottom: 6px;
}

.p2-card__desc {
  color: var(--tr-muted);
  font-size: 12px;
  line-height: 1.45;
}

.p2-card__note {
  color: var(--tr-warning);
  font-size: 11px;
  margin-top: 8px;
}

@media (max-width: 900px) {
  .p2-grid { grid-template-columns: 1fr 1fr; }
}

@media (max-width: 560px) {
  .p2-grid { grid-template-columns: 1fr; }
}
</style>
