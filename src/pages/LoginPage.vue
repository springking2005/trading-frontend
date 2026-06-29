<template>
  <div class="login-page">
    <!-- Background effects -->
    <div class="login-bg-dots"></div>
    <div class="login-glow"></div>

    <!-- Login card -->
    <div class="login-card">
      <!-- Brand icon -->
      <div style="text-align:center;margin-bottom:1.5rem;">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--tr-brand)" stroke-width="1.5" style="display:inline-block;">
          <polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2"/>
          <line x1="12" y1="22" x2="12" y2="15.5"/>
          <polyline points="2 8.5 12 15.5 22 8.5"/>
        </svg>
      </div>

      <h1 style="text-align:center;font-size:1.5rem;font-weight:700;color:var(--tr-text);margin-bottom:0.25rem;">
        TraderGrid V3
      </h1>
      <p style="text-align:center;font-size:0.875rem;color:var(--tr-muted);margin-bottom:1.5rem;">
        专业操盘手的通用策略容器
      </p>

      <!-- Account input -->
      <div class="input-group">
        <label>交易账户</label>
        <input
          data-testid="login-username"
          class="input-field"
          v-model="username"
          type="text"
          placeholder="输入账户名"
          @keydown.enter="submit"
        />
      </div>

      <!-- Password input -->
      <div class="input-group">
        <label>安全密码</label>
        <input
          data-testid="login-password"
          class="input-field"
          v-model="password"
          type="password"
          placeholder="输入密码"
          @keydown.enter="submit"
        />
      </div>

      <!-- Submit button -->
      <button
        data-testid="login-submit"
        class="btn-primary"
        style="width:100%;margin-top:0.5rem;"
        :disabled="loading"
        @click="submit"
      >
        <span v-if="loading">加载中...</span>
        <span v-else>{{ isRegister ? '创建账户' : '登 录' }}</span>
      </button>

      <!-- Register toggle -->
      <div style="text-align:center;margin-top:1rem;">
        <a
          href="#"
          @click.prevent="isRegister = !isRegister"
          style="color:var(--tr-muted);font-size:0.875rem;text-decoration:none;"
        >
          {{ isRegister ? '已有账户？去登录' : '没有账户？创建新账户' }}
        </a>
      </div>

      <!-- Error message -->
      <div v-if="error" class="text-up" style="text-align:center;margin-top:0.75rem;font-size:0.875rem;">
        {{ error }}
      </div>
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
    const payload = isRegister.value
      ? {
          username: username.value,
          password: password.value,
          email: `${username.value.trim()}@trading.app`,
        }
      : { username: username.value, password: password.value };
    const data = await api.post(endpoint, payload);
    localStorage.setItem('token', data.access_token);
    localStorage.setItem('refresh', data.refresh_token);
    router.push('/dashboard');
  } catch (e: any) {
    error.value = e.message;
  }
  loading.value = false;
}
</script>
