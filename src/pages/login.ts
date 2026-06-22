import { api, toast } from '../api/api-client';
import { router } from '../api/router';

export function renderLogin(container: HTMLElement) {
  container.innerHTML = `
    <div class="login-page">
      <div class="login-card">
        <h1>Trading Platform</h1>
        <div class="input-group">
          <label>Username</label>
          <input class="input" id="login-user" type="text" placeholder="Enter username" />
        </div>
        <div class="input-group">
          <label>Password</label>
          <input class="input" id="login-pass" type="password" placeholder="Enter password" />
        </div>
        <button class="btn btn-primary btn-block btn-lg" id="login-btn">Sign In</button>
        <div style="text-align:center;margin-top:12px">
          <a href="#" id="toggle-register">Create new account</a>
        </div>
        <div id="login-error" class="text-red" style="text-align:center;margin-top:8px;display:none"></div>
      </div>
    </div>`;

  let isRegister = false;
  const btn = document.getElementById('login-btn')!;
  const userInp = document.getElementById('login-user') as HTMLInputElement;
  const passInp = document.getElementById('login-pass') as HTMLInputElement;
  const errorEl = document.getElementById('login-error')!;
  const toggle = document.getElementById('toggle-register')!;

  toggle.addEventListener('click', (e) => {
    e.preventDefault();
    isRegister = !isRegister;
    btn.textContent = isRegister ? 'Create Account' : 'Sign In';
    toggle.textContent = isRegister ? 'Already have an account? Sign in' : 'Create new account';
  });

  const submit = async () => {
    const username = userInp.value.trim();
    const password = passInp.value.trim();
    if (!username || !password) return;
    errorEl.style.display = 'none';
    btn.disabled = true;
    try {
      const endpoint = isRegister ? '/auth/register' : '/auth/login';
      const data: any = await api.post(endpoint, { username, password });
      localStorage.setItem('token', data.access_token);
      localStorage.setItem('refresh', data.refresh_token);
      toast(isRegister ? 'Account created!' : 'Welcome back!');
      router.navigate('dashboard');
    } catch (e: any) {
      errorEl.textContent = e.message;
      errorEl.style.display = 'block';
    }
    btn.disabled = false;
  };

  btn.addEventListener('click', submit);
  passInp.addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); });
}
