import { showModal } from '../api/api-client';

export function renderOrder(container: HTMLElement) {
  container.innerHTML = `
    <div class="card">
      <div class="card-header">Quick Order</div>
      <div class="input-group">
        <label>Stock Code</label>
        <div class="row">
          <input class="input" id="order-symbol" type="text" placeholder="Search code/name/pinyin..." style="flex:1" />
        </div>
      </div>
      <div class="card" style="background:var(--bg);cursor:pointer" id="orderbook-toggle">
        <div class="row" style="justify-content:space-between">
          <span class="text-lg" id="order-price">--</span>
          <span class="text-secondary" id="order-change">--</span>
        </div>
        <div class="orderbook-panel hidden" id="orderbook-panel"></div>
      </div>
      <div class="input-group" style="margin-top:12px">
        <label>Strategy Template</label>
        <select class="input" id="order-template">
          <option value="">Select template...</option>
          <option value="default">Classic T+0 Replenishment</option>
          <option value="aggressive">Aggressive - High Volatility</option>
          <option value="conservative">Conservative - Blue Chip</option>
        </select>
      </div>
      <div class="row">
        <div class="input-group" style="flex:1">
          <label>Price Type</label>
          <select class="input" id="order-price-type">
            <option value="market">Market</option>
            <option value="limit">Limit</option>
          </select>
        </div>
        <div class="input-group hidden" style="flex:1" id="limit-price-group">
          <label>Limit Price</label>
          <input class="input" id="order-limit-price" type="number" step="0.01" placeholder="0.00" />
        </div>
      </div>
      <div class="row">
        <div class="input-group" style="flex:1">
          <label>Volume (lots)</label>
          <input class="input" id="order-volume" type="number" value="0" min="0" step="1" readonly />
        </div>
        <div class="input-group" style="flex:1">
          <label>Amount (¥)</label>
          <input class="input" id="order-amount" type="number" value="0" min="0" step="100" />
        </div>
      </div>
      <div class="text-secondary" id="order-fee">Est. fee: ¥0.00</div>
      <div style="margin-top:16px">
        <button class="btn btn-primary btn-block btn-lg" id="order-submit" disabled>Confirm Order</button>
      </div>
    </div>
    <div class="card">
      <div class="card-header">Number Keypad</div>
      <div class="keypad">
        <button class="key" data-k="1">1</button><button class="key" data-k="2">2</button><button class="key" data-k="3">3</button>
        <button class="key" data-k="4">4</button><button class="key" data-k="5">5</button><button class="key" data-k="6">6</button>
        <button class="key" data-k="7">7</button><button class="key" data-k="8">8</button><button class="key" data-k="9">9</button>
        <button class="key key-clear" data-k="C">C</button><button class="key" data-k="0">0</button><button class="key key-ac" data-k="AC">AC</button>
      </div>
      <div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap">
        <button class="btn btn-sm btn-outline" data-preset="50000">¥5w</button>
        <button class="btn btn-sm btn-outline" data-preset="100000">¥10w</button>
        <button class="btn btn-sm btn-outline" data-preset="150000">¥15w</button>
        <button class="btn btn-sm btn-outline" data-preset="200000">¥20w</button>
      </div>
    </div>`;

  // State
  let currentPrice = 0;
  let inputMode: 'volume' | 'amount' = 'amount';
  let amountStr = '';

  const volInp = document.getElementById('order-volume') as HTMLInputElement;
  const amtInp = document.getElementById('order-amount') as HTMLInputElement;
  const feeEl = document.getElementById('order-fee')!;
  const submitBtn = document.getElementById('order-submit') as HTMLButtonElement;
  const priceEl = document.getElementById('order-price')!;
  const symbolInp = document.getElementById('order-symbol') as HTMLInputElement;
  const priceType = document.getElementById('order-price-type') as HTMLSelectElement;
  const limitGroup = document.getElementById('limit-price-group')!;

  function updateDisplay() {
    const amt = parseFloat(amtInp.value) || 0;
    const lots = currentPrice > 0 ? Math.floor(amt / (currentPrice * 100)) : 0;
    volInp.value = String(lots);
    const fee = amt * 0.00025;
    feeEl.textContent = `Est. fee: ¥${fee.toFixed(2)} | Total: ¥${(amt + fee).toFixed(2)}`;
    submitBtn.disabled = !symbolInp.value.trim() || amt <= 0;
  }

  // Keypad
  document.querySelectorAll('.keypad .key').forEach(k => {
    k.addEventListener('click', () => {
      const key = (k as HTMLElement).dataset.k!;
      if (key === 'C') amountStr = amountStr.slice(0, -1);
      else if (key === 'AC') amountStr = '';
      else amountStr += key;
      amtInp.value = amountStr || '0';
      updateDisplay();
    });
  });

  // Preset buttons
  document.querySelectorAll('[data-preset]').forEach(b => {
    b.addEventListener('click', () => {
      amountStr = (b as HTMLElement).dataset.preset!;
      amtInp.value = amountStr;
      updateDisplay();
    });
  });

  // Manual amount input
  amtInp.addEventListener('input', () => { amountStr = amtInp.value; updateDisplay(); });

  // Price type toggle
  priceType.addEventListener('change', () => {
    limitGroup.classList.toggle('hidden', priceType.value === 'market');
  });

  // Orderbook toggle
  document.getElementById('orderbook-toggle')?.addEventListener('click', () => {
    const panel = document.getElementById('orderbook-panel')!;
    panel.classList.toggle('hidden');
    if (!panel.classList.contains('hidden')) {
      panel.innerHTML = Array.from({length:10}, (_, i) => {
        const price = (currentPrice || 100) + (5 - i) * 0.5;
        const isAsk = i < 5;
        return `<div class="orderbook-row ${isAsk ? 'orderbook-ask' : 'orderbook-bid'}">
          <span>${price.toFixed(2)}</span><span>${(i+1)*10}</span></div>`;
      }).join('');
    }
  });

  // Submit
  submitBtn.addEventListener('click', () => {
    const sym = symbolInp.value.trim();
    const amt = parseFloat(amtInp.value) || 0;
    if (!sym || amt <= 0) return;
    if (amt > 200000) {
      showModal('Confirm Large Order',
        `<p>Symbol: <b>${sym}</b></p><p>Amount: <b>¥${amt.toLocaleString()}</b></p><p>Type: <b>${priceType.value.toUpperCase()}</b></p><p style="color:var(--primary)">This is a large order. Please confirm.</p>`,
        () => { /* Submit order via API */ });
    } else {
      showModal('Confirm Order',
        `<p>Symbol: <b>${sym}</b></p><p>Amount: <b>¥${amt.toLocaleString()}</b></p>`,
        () => { /* Submit order via API */ });
    }
  });
}
