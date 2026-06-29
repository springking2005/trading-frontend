import { test, expect } from '@playwright/test';

const mockPositions = [
  {
    id: 'pos-001',
    vt_symbol: '600519.SSE',
    stock_name: '贵州茅台',
    status: 'ACTIVE',
    current_value: 250000,
    unrealized_pnl: 15000,
    unrealized_pnl_pct: 6.38,
    current_price: 1800.50,
    price_change_pct: 2.15,
    add_count: 2,
    max_add_count: 5,
    strategy_name: 'Grid Pro',
    strategy_instance_id: 'inst-001',
  },
  {
    id: 'pos-002',
    vt_symbol: '000858.SZE',
    stock_name: '五粮液',
    status: 'PENDING',
    current_value: 120000,
    unrealized_pnl: -5000,
    unrealized_pnl_pct: -4.0,
    current_price: 150.20,
    price_change_pct: -1.2,
    add_count: 1,
    max_add_count: 5,
    strategy_name: 'Momentum',
    strategy_instance_id: 'inst-002',
  },
  {
    id: 'pos-003',
    vt_symbol: '300750.SZE',
    stock_name: '宁德时代',
    status: 'CLEARED',
    current_value: 0,
    unrealized_pnl: 0,
    unrealized_pnl_pct: 0,
    current_price: 200.00,
    price_change_pct: 0,
    add_count: 0,
    max_add_count: 5,
    strategy_name: 'Scalp',
    strategy_instance_id: 'inst-003',
  },
];

const today = new Date().toISOString().split('T')[0];

const mockPositionDetail = {
  id: 'pos-001',
  vt_symbol: '600519.SSE',
  stock_name: '贵州茅台',
  status: 'ACTIVE',
  batches: [
    {
      id: 'lot-001',
      batch_index: 1,
      locked: true,
      entry_price: 1700.00,
      entry_volume: 100,
      entry_amount: 170000,
      entry_time: `${today}T09:30:00`,
      status: 'HOLDING',
      pnl: 10000,
      hard_stop_price: 1530.00,
      sellable: false,
    },
    {
      id: 'lot-002',
      batch_index: 2,
      locked: false,
      entry_price: 1690.00,
      entry_volume: 100,
      entry_amount: 169000,
      entry_time: `${today}T10:15:00`,
      status: 'HOLDING',
      pnl: 5000,
      sell_trigger_price: 1860.00,
      sellable: true,
    },
    {
      id: 'lot-003',
      batch_index: 3,
      locked: false,
      entry_price: 1750.00,
      entry_volume: 100,
      entry_amount: 175000,
      entry_time: '2026-06-20T14:00:00',
      status: 'PENDING',
      pnl: -2000,
      sell_trigger_price: 1925.00,
      sellable: true,
    },
  ],
};

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('token', 'mock-token');
    localStorage.setItem('refresh', 'mock-refresh');
  });

  // Mock dashboard to prevent App.vue header metrics from triggering 401 redirect
  await page.route('**/api/v1/dashboard', async (route) => {
    await route.fulfill({
      json: {
        capital: { current_value: 1000000, available: 500000 },
        pnl: { total: 5000 },
        positions: [],
      },
    });
  });

  // Mock settings (TradeLot page calls loadSettings() to check enable_multi_execution)
  await page.route('**/api/v1/settings**', async (route) => {
    await route.fulfill({
      json: {
        max_concurrent_stocks: 5,
        total_capital: 1000000,
        max_daily_loss_pct: -3,
        order_confirm_small: 50000,
        order_confirm_large: 200000,
        enable_auto_trading: true,
        enable_multi_execution_per_stock: false,
        futu_trade_env: 'SIMULATE',
      },
    });
  });
});

test.describe('TradeLot Page', () => {
  test('1. Position list loads', async ({ page }) => {
    await page.route('**/api/v1/positions', async (route) => {
      await route.fulfill({ json: mockPositions });
    });

    await page.goto('/#/tradelot');
    await page.waitForSelector('[data-testid="tl-position-card"]', { timeout: 5000 });

    const cards = page.locator('[data-testid="tl-position-card"]');
    await expect(cards).toHaveCount(3);
    await expect(cards.first()).toContainText('贵州茅台');
    await expect(cards.nth(1)).toContainText('五粮液');
    await expect(cards.nth(2)).toContainText('宁德时代');
  });

  test('2. Expand position shows TradeLot batches', async ({ page }) => {
    await page.route('**/api/v1/positions', async (route) => {
      await route.fulfill({ json: mockPositions });
    });
    await page.route('**/api/v1/positions/pos-001', async (route) => {
      await route.fulfill({ json: mockPositionDetail });
    });

    await page.goto('/#/tradelot');
    await page.waitForSelector('[data-testid="tl-position-card"]', { timeout: 5000 });

    // Click the first position card header row to expand
    await page.locator('[data-testid="tl-position-card"] .tl-row-header').first().click();

    // Wait for lot rows to appear
    await page.waitForSelector('.tl-lot-row', { timeout: 5000 });

    const lotRows = page.locator('.tl-lot-row');
    await expect(lotRows).toHaveCount(3);

    // Base lot (first lot) has tl-base-lot class
    await expect(page.locator('.tl-base-lot')).toBeVisible();
    await expect(page.locator('.tl-base-lot')).toContainText('底仓');
  });

  test('3. Filter buttons switch active', async ({ page }) => {
    await page.route('**/api/v1/positions', async (route) => {
      await route.fulfill({ json: mockPositions });
    });

    await page.goto('/#/tradelot');
    await page.waitForSelector('[data-testid="tl-filter-abnormal"]', { timeout: 5000 });

    const abnormalBtn = page.locator('[data-testid="tl-filter-abnormal"]');
    await expect(abnormalBtn).toBeVisible();

    // Before click, btn-primary should be on the 'all' button
    await expect(page.locator('[data-testid="tl-filter-all"]')).toHaveClass(/btn-primary/);

    // Click abnormal filter
    await abnormalBtn.click();

    // After click, abnormal button should have btn-primary
    await expect(abnormalBtn).toHaveClass(/btn-primary/);

    // Only the PENDING position should show (五粮液 has status PENDING)
    const cards = page.locator('[data-testid="tl-position-card"]');
    await expect(cards).toHaveCount(1);
    await expect(cards.first()).toContainText('五粮液');
  });

  test('4. Clear stock button visible', async ({ page }) => {
    await page.route('**/api/v1/positions', async (route) => {
      await route.fulfill({ json: mockPositions });
    });
    await page.route('**/api/v1/positions/pos-001', async (route) => {
      await route.fulfill({ json: mockPositionDetail });
    });

    await page.goto('/#/tradelot');
    await page.waitForSelector('[data-testid="tl-position-card"]', { timeout: 5000 });

    // Expand the first position
    await page.locator('[data-testid="tl-position-card"] .tl-row-header').first().click();
    await page.waitForSelector('.tl-lot-row', { timeout: 5000 });

    // Verify "一键清仓" button is visible
    const clearBtn = page.locator('[data-testid="tl-clear-stock-btn"]');
    await expect(clearBtn).toBeVisible();
    await expect(clearBtn).toContainText('一键清仓');
  });

  test('5. T+1 label on locked batch', async ({ page }) => {
    await page.route('**/api/v1/positions', async (route) => {
      await route.fulfill({ json: mockPositions });
    });
    await page.route('**/api/v1/positions/pos-001', async (route) => {
      await route.fulfill({ json: mockPositionDetail });
    });

    await page.goto('/#/tradelot');
    await page.waitForSelector('[data-testid="tl-position-card"]', { timeout: 5000 });

    // Expand the first position
    await page.locator('[data-testid="tl-position-card"] .tl-row-header').first().click();
    await page.waitForSelector('.tl-lot-row', { timeout: 5000 });

    // The base lot (lot-001) has locked=true and should show T+1 badge
    const lockBadge = page.locator('.tl-lock-badge').first();
    await expect(lockBadge).toBeVisible();
    await expect(lockBadge).toContainText('T+1');
  });
});
