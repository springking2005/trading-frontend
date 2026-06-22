<template>
  <div>
    <div class="card">
      <div class="card-header">Trading</div>
      <div class="row"><div class="input-group"><label>Max Concurrent Stocks</label><input class="input" v-model.number="maxStocks" type="number" min="1" max="50" /></div></div>
      <div class="row"><div class="input-group"><label>Total Capital (¥)</label><input class="input" v-model.number="capital" type="number" step="100000" /></div></div>
    </div>
    <div class="card">
      <div class="card-header">Risk Management</div>
      <div class="input-group"><label>Max Daily Loss: {{ dailyLoss }}%</label><input class="slider" v-model.number="dailyLoss" type="range" min="1" max="10" /></div>
      <div class="input-group"><label>Hard Stop Loss: {{ stopLoss }}%</label><input class="slider" v-model.number="stopLoss" type="range" min="2" max="20" /></div>
    </div>
    <div class="card">
      <div class="card-header">Account</div>
      <button class="btn btn-danger" @click="logout">Logout</button>
    </div>
    <button class="btn btn-primary btn-block" @click="save">Save Settings</button>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { toast } from '../api/api-client';

const router = useRouter();
const maxStocks = ref(5);
const capital = ref(1000000);
const dailyLoss = ref(3);
const stopLoss = ref(8);

function save() { toast('Settings saved'); }
function logout() { localStorage.removeItem('token'); localStorage.removeItem('refresh'); router.push('/login'); }
</script>
