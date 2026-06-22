import { api, toast } from '../api/api-client';
import { router } from '../api/router';

export function renderSettings(container: HTMLElement) {
  container.innerHTML = `
    <div class="card">
      <div class="card-header">Trading</div>
      <div class="row"><div class="input-group"><label>Max Concurrent Stocks</label><input class="input" id="s-max-stocks" type="number" value="5" min="1" max="50" /></div></div>
      <div class="row"><div class="input-group"><label>Total Capital (¥)</label><input class="input" id="s-capital" type="number" value="1000000" step="100000" /></div></div>
    </div>
    <div class="card">
      <div class="card-header">Risk Management</div>
      <div class="input-group"><label>Max Daily Loss %</label><input class="slider" id="s-daily-loss" type="range" min="1" max="10" value="3" /><span id="s-daily-loss-val" class="text-secondary">3%</span></div>
      <div class="input-group"><label>Default Hard Stop Loss %</label><input class="slider" id="s-stop-loss" type="range" min="2" max="20" value="8" /><span id="s-stop-loss-val" class="text-secondary">8%</span></div>
    </div>
    <div class="card">
      <div class="card-header">Order Confirmation Thresholds</div>
      <div class="row"><div class="input-group"><label>Double-tap threshold (¥)</label><input class="input" id="s-confirm-small" type="number" value="50000" /></div></div>
      <div class="row"><div class="input-group"><label>Dialog threshold (¥)</label><input class="input" id="s-confirm-large" type="number" value="200000" /></div></div>
    </div>
    <div class="card">
      <div class="card-header">Account</div>
      <button class="btn btn-danger" id="logout-btn">Logout</button>
    </div>
    <button class="btn btn-primary btn-block" id="save-settings">Save Settings</button>`;

  document.getElementById('s-daily-loss')?.addEventListener('input', (e) => {
    document.getElementById('s-daily-loss-val')!.textContent = `${(e.target as HTMLInputElement).value}%`;
  });
  document.getElementById('s-stop-loss')?.addEventListener('input', (e) => {
    document.getElementById('s-stop-loss-val')!.textContent = `${(e.target as HTMLInputElement).value}%`;
  });
  document.getElementById('save-settings')?.addEventListener('click', () => toast('Settings saved'));
  document.getElementById('logout-btn')?.addEventListener('click', () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refresh');
    router.navigate('login');
  });
}
