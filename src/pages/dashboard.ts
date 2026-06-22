import { router } from '../api/router';

export function renderDashboard(container: HTMLElement) {
  container.innerHTML = `
    <div class="card">
      <div class="card-header">Portfolio Summary</div>
      <div class="grid-3">
        <div style="text-align:center"><div class="text-xl" id="dash-total">¥0</div><div class="text-secondary">Total Value</div></div>
        <div style="text-align:center"><div class="text-xl" id="dash-pnl">¥0</div><div class="text-secondary">P&L</div></div>
        <div style="text-align:center"><div class="text-xl" id="dash-positions">0</div><div class="text-secondary">Positions</div></div>
      </div>
    </div>
    <div id="position-list">
      <div class="card"><div style="text-align:center;color:var(--text-secondary);padding:24px">No active positions</div></div>
    </div>
    <button class="btn btn-primary btn-block btn-lg" id="new-order-btn">+ New Order</button>`;

  document.getElementById('new-order-btn')?.addEventListener('click', () => router.navigate('order'));
}
