<template>
  <div>
    <div class="card">
      <div class="card-header">Quick Order</div>
      <div class="input-group">
        <label>Stock Code</label>
        <input class="input" v-model="symbol" type="text" placeholder="Search code/name/pinyin..." />
      </div>
      <div class="card" style="background:var(--bg);cursor:pointer" @click="showOrderbook = !showOrderbook">
        <div style="display:flex;justify-content:space-between">
          <span class="text-lg">¥{{ currentPrice || '--' }}</span>
          <span class="text-secondary">±0.00%</span>
        </div>
        <div v-if="showOrderbook" class="orderbook-panel" style="margin-top:8px">
          <div v-for="i in 10" :key="i" class="orderbook-row" :class="i <= 5 ? 'orderbook-ask' : 'orderbook-bid'">
            <span>{{ ((currentPrice || 100) + (5 - i) * 0.5).toFixed(2) }}</span><span>{{ i * 10 }}</span>
          </div>
        </div>
      </div>
      <div class="input-group" style="margin-top:12px">
        <label>Strategy Template</label>
        <select class="input" v-model="template">
          <option value="">Select template...</option>
          <option value="default">Classic T+0 Replenishment</option>
        </select>
      </div>
      <div class="row">
        <div class="input-group" style="flex:1">
          <label>Price Type</label>
          <select class="input" v-model="priceType">
            <option value="market">Market</option>
            <option value="limit">Limit</option>
          </select>
        </div>
        <div class="input-group" v-if="priceType === 'limit'" style="flex:1">
          <label>Limit Price</label>
          <input class="input" v-model.number="limitPrice" type="number" step="0.01" />
        </div>
      </div>
      <div class="row">
        <div class="input-group" style="flex:1">
          <label>Volume (lots)</label>
          <input class="input" :value="volume" type="number" readonly />
        </div>
        <div class="input-group" style="flex:1">
          <label>Amount (¥)</label>
          <input class="input" v-model="amountDisplay" type="text" @input="onAmountInput" />
        </div>
      </div>
      <div class="text-secondary">Est. fee: ¥{{ fee.toFixed(2) }}</div>
      <div style="margin-top:16px">
        <button class="btn btn-primary btn-block btn-lg" :disabled="!canSubmit" @click="submitOrder">
          Confirm Order
        </button>
      </div>
    </div>
    <div class="card">
      <div class="card-header">Number Keypad</div>
      <div class="keypad">
        <button class="key" v-for="k in ['1','2','3','4','5','6','7','8','9']" :key="k" @click="tapKey(k)">{{ k }}</button>
        <button class="key key-clear" @click="tapKey('C')">C</button>
        <button class="key" @click="tapKey('0')">0</button>
        <button class="key key-ac" @click="tapKey('AC')">AC</button>
      </div>
      <div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap">
        <button class="btn btn-sm btn-outline" v-for="a in [50000,100000,150000,200000]" :key="a" @click="amountStr = String(a); updateAmount()">¥{{ a / 10000 }}w</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';

const symbol = ref('');
const currentPrice = ref(100);
const showOrderbook = ref(false);
const template = ref('');
const priceType = ref('market');
const limitPrice = ref<number | null>(null);
const amountStr = ref('');
const amountDisplay = ref('');

const amount = computed(() => parseFloat(amountStr.value) || 0);
const volume = computed(() => currentPrice.value > 0 ? Math.floor(amount.value / (currentPrice.value * 100)) : 0);
const fee = computed(() => amount.value * 0.00025);
const canSubmit = computed(() => symbol.value.trim() && amount.value > 0);

function tapKey(k: string) {
  if (k === 'C') amountStr.value = amountStr.value.slice(0, -1);
  else if (k === 'AC') amountStr.value = '';
  else amountStr.value += k;
  updateAmount();
}
function onAmountInput(e: Event) { amountStr.value = (e.target as HTMLInputElement).value; updateAmount(); }
function updateAmount() { amountDisplay.value = amountStr.value; }

function submitOrder() {
  if (amount.value > 200000 && !confirm(`Large order: ¥${amount.value.toLocaleString()}. Confirm?`)) return;
  alert(`Order submitted: ${symbol.value} ${priceType.value} ¥${amount.value.toLocaleString()}`);
}
</script>
