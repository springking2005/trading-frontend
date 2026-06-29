<template>
  <div>
    <!-- Header -->
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:1.5rem">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--tr-brand)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="16" x2="12" y2="12"/>
        <line x1="12" y1="8" x2="12.01" y2="8"/>
      </svg>
      <span style="font-size:1.25rem;font-weight:700;color:var(--tr-text)">工具箱</span>
      <span class="badge badge-muted" style="margin-left:4px">待接入能力汇总</span>
    </div>

    <div class="card" style="margin-bottom:1.5rem">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px">
        <div>
          <div style="font-weight:700;color:var(--tr-text)">辅助功能 &amp; 待接入能力</div>
          <div class="text-muted" style="font-size:12px;margin-top:4px">
            转账、逆回购、资产分析、T 操作盈亏、新股申购、对账单等 P2 能力集中管理。<br/>
            当前均为只读/占位/待接入状态，不会发起真实券商执行。
          </div>
        </div>
        <button class="btn btn-outline btn-sm" @click="$router.push('/dashboard')">← 返回驾驶舱</button>
      </div>
    </div>

    <P2FeatureGrid :items="toolsFeatures" @select="handleFeature" />
  </div>
</template>

<script setup lang="ts">
import P2FeatureGrid from '../components/trading/P2FeatureGrid.vue';
import { toast } from '../api/api-client';

interface P2FeatureItem {
  title: string;
  icon: string;
  description: string;
  status: '只读' | '待接入' | '占位';
  note?: string;
  target?: string;
}

const toolsFeatures: P2FeatureItem[] = [
  {
    title: '转账',
    icon: '⇄',
    status: '待接入',
    description: '银证转账入口已预留，当前只展示资金归属与后续接入边界。',
    note: '不会发起真实转入/转出',
  },
  {
    title: '逆回购',
    icon: '↩',
    status: '占位',
    description: '国债逆回购功能归属交易查询能力，报价与下单接口待券商接入。',
    note: '首版仅展示入口',
  },
  {
    title: '资产分析',
    icon: '◔',
    status: '只读',
    description: '按总资产、股票市值、可用/可取资金做只读资产结构概览。',
    note: '深度报表待接入',
  },
  {
    title: 'T 操作盈亏',
    icon: 'T',
    status: '待接入',
    description: 'T+0 复盘、日内价差与收益归因入口，当前不计算真实 T 盈亏。',
    note: '查询页后续承接',
  },
  {
    title: '新股申购',
    icon: '新',
    status: '占位',
    description: '新股申购额度、申购记录与中签查询入口占位。',
    note: '待券商账户能力接入',
  },
  {
    title: '对账单',
    icon: '账',
    status: '待接入',
    description: '对账、转账记录与历史流水统一归属查询区，当前为待接入入口。',
    note: '不得作为真实报表',
  },
];

function handleFeature(item: P2FeatureItem) {
  toast(`${item.title}：${item.status}入口，${item.note || '真实能力待接入'}`);
}
</script>
