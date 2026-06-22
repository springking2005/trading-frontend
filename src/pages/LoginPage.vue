<template>
  <div class="login-page">
    <div class="login-card">
      <h1>Trading Platform</h1>
      <div class="input-group">
        <label>Username</label>
        <input class="input" v-model="username" type="text" placeholder="Enter username" @keydown.enter="submit" />
      </div>
      <div class="input-group">
        <label>Password</label>
        <input class="input" v-model="password" type="password" placeholder="Enter password" @keydown.enter="submit" />
      </div>
      <button class="btn btn-primary btn-block btn-lg" :disabled="loading" @click="submit">
        <span v-if="loading">Loading...</span>
        <span v-else>{{ isRegister ? 'Create Account' : 'Sign In' }}</span>
      </button>
      <div style="text-align:center;margin-top:12px">
        <a href="#" @click.prevent="isRegister = !isRegister">
          {{ isRegister ? 'Already have an account?' : 'Create new account' }}
        </a>
      </div>
      <div v-if="error" class="text-red" style="text-align:center;margin-top:8px">{{ error }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { api } from '../api/api-client';

const router = useRouter();
const username = ref('');
const password = ref('');
const isRegister = ref(false);
const loading = ref(false);
const error = ref('');

async function submit() {
  if (!username.value.trim() || !password.value.trim()) return;
  error.value = '';
  loading.value = true;
  try {
    const endpoint = isRegister.value ? '/auth/register' : '/auth/login';
    const data = await api.post(endpoint, { username: username.value, password: password.value });
    localStorage.setItem('token', data.access_token);
    localStorage.setItem('refresh', data.refresh_token);
    router.push('/dashboard');
  } catch (e: any) {
    error.value = e.message;
  }
  loading.value = false;
}
</script>
