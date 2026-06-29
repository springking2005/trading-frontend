import { test, expect } from '@playwright/test';

const mockDashboard = {
  positions: { total: 2, active: 2, cleared: 0 },
  capital: {
    total_invested: 300000,
    current_value: 315000,
    balance: 700000,
    frozen: 0,
    available: 700000,
    usage_pct: 30,
  },
  pnl: { unrealized: 15000, realized: 0, total: 15000 },
};

const mockPositions = [
  {
    id: 'pos-1',
    vt_symbol: '600519.SSE',
    stock_name: '贵州茅台',
    status: 'ACTIVE',
    current_value: 200000,
    unrealized_pnl: 10000,
    add_count: 2,
    max_add_count: 5,
  },
  {
    id: 'pos-2',
    vt_symbol: '000858.SZE',
    stock_name: '五粮液',
    status: 'ACTIVE',
    current_value: 115000,
    unrealized_pnl: 5000,
    add_count: 1,
    max_add_count: 5,
  },
];

const today = new Date().toISOString().split('T')[0];

const mockPositionDetail = {
  id: 'pos-1',
  vt_symbol: '600519.SSE',
  stock_name: '贵州茅台',
  batches: [
    {
      id: 'lot-1',
      batch_index: 0,
      batch_number: 0,
      status: 'HOLDING',
      entry_price: 1800.0,
      entry_volume: 100,
      entry_time: `${today}T09:30:00`,
      target_sell_price: 1900.0,
      pnl: 800,
    },
  ],
};

const mockSettings = {
  enable_multi_execution_per_stock: false,
};

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('token', 'mock-token');
    localStorage.setItem('refresh', 'mock-refresh');
  });
});

test.describe('Dashboard Page', () => {
  test('1. Dashboard metrics load', async ({ page }) => {
    await page.route('**/api/v1/dashboard', async (route) => {
      await route.fulfill({ json: mockDashboard });
    });
    await page.route('**/api/v1/positions', async (route) => {
      await route.fulfill({ json: mockPositions });
    });
    await page.route('**/api/v1/settings', async (route) => {
      await route.fulfill({ json: mockSettings });
    });

    await page.goto('/#/dashboard');
    await page.waitForSelector('.metric-card', { timeout: 5000 });

    // Header (App.vue) also has 3 metric cards; dashboard body has 4 more
    const metricCards = page.locator('.metric-card');
    await expect(metricCards.first()).toBeVisible();
    // Dashboard body metrics are in .metrics-grid
    const dashboardMetrics = page.locator('.metrics-grid .metric-card');
    await expect(dashboardMetrics).toHaveCount(4);
    await expect(dashboardMetrics.first()).toContainText('315,000');
  });

  test('2. Expand position shows TradeLot detail', async ({ page }) => {
    await page.route('**/api/v1/dashboard', async (route) => {
      await route.fulfill({ json: mockDashboard });
    });
    await page.route('**/api/v1/positions', async (route) => {
      await route.fulfill({ json: mockPositions });
    });
    await page.route('**/api/v1/settings', async (route) => {
      await route.fulfill({ json: mockSettings });
    });
    await page.route('**/api/v1/positions/pos-1', async (route) => {
      await route.fulfill({ json: mockPositionDetail });
    });

    await page.goto('/#/dashboard');
    await page.waitForSelector('[data-testid="position-card"]', { timeout: 5000 });

    // Click the first position card to expand
    await page.locator('[data-testid="position-card"]').first().click();
    await page.waitForSelector('.lot-row', { timeout: 5000 });

    const lotRows = page.locator('.lot-row');
    await expect(lotRows).toHaveCount(1);
    await expect(lotRows.first()).toContainText('#0');
    await expect(lotRows.first()).toContainText('1800.00');
  });

  test('3. T+1 label shows on today\'s batch', async ({ page }) => {
    await page.route('**/api/v1/dashboard', async (route) => {
      await route.fulfill({ json: mockDashboard });
    });
    await page.route('**/api/v1/positions', async (route) => {
      await route.fulfill({ json: mockPositions });
    });
    await page.route('**/api/v1/settings', async (route) => {
      await route.fulfill({ json: mockSettings });
    });
    // Position detail with today's entry date batch
    await page.route('**/api/v1/positions/pos-1', async (route) => {
      await route.fulfill({
        json: {
          id: 'pos-1',
          batches: [
            {
              id: 'lot-today',
              batch_index: 1,
              batch_number: 1,
              status: 'locked',
              entry_price: 1820.0,
              entry_volume: 100,
              entry_time: `${today}T10:00:00`,
              target_sell_price: 1910.0,
              pnl: 300,
            },
          ],
        },
      });
    });

    await page.goto('/#/dashboard');
    await page.waitForSelector('[data-testid="position-card"]', { timeout: 5000 });

    // Expand position
    await page.locator('[data-testid="position-card"]').first().click();
    await page.waitForSelector('.lot-row', { timeout: 5000 });

    const lotRow = page.locator('.lot-row').first();
    await expect(lotRow).toBeVisible();
    // The lot row shows "Buy:" prefix with the entry date
    await expect(lotRow).toContainText('买入:');
    // Status badge shows "locked" for a T+1-frozen lot
    await expect(lotRow).toContainText('locked');
  });

  test('4. WebSocket connection established', async ({ page }) => {
    await page.route('**/api/v1/dashboard', async (route) => {
      await route.fulfill({ json: mockDashboard });
    });
    await page.route('**/api/v1/positions', async (route) => {
      await route.fulfill({ json: mockPositions });
    });
    await page.route('**/api/v1/settings', async (route) => {
      await route.fulfill({ json: mockSettings });
    });

    await page.goto('/#/dashboard');
    await page.waitForSelector('.pulse-dot', { timeout: 5000 });

    // Connection indicator is always shown
    await expect(page.locator('.pulse-dot')).toBeVisible();
    await expect(page.getByText('行情及策略引擎连接正常')).toBeVisible();
  });

  test('5. Empty state', async ({ page }) => {
    await page.route('**/api/v1/dashboard', async (route) => {
      await route.fulfill({
        json: {
          positions: { total: 0, active: 0, cleared: 0 },
          capital: {
            total_invested: 0,
            current_value: 0,
            balance: 1000000,
            frozen: 0,
            available: 1000000,
            usage_pct: 0,
          },
          pnl: { unrealized: 0, realized: 0, total: 0 },
        },
      });
    });
    await page.route('**/api/v1/positions', async (route) => {
      await route.fulfill({ json: [] });
    });
    await page.route('**/api/v1/settings', async (route) => {
      await route.fulfill({ json: mockSettings });
    });

    await page.goto('/#/dashboard');

    // Verify empty state message (English text matches the template)
    await expect(page.getByText('暂无活跃持仓')).toBeVisible({ timeout: 5000 });
  });

  test('6. New Order button navigates', async ({ page }) => {
    await page.route('**/api/v1/dashboard', async (route) => {
      await route.fulfill({ json: mockDashboard });
    });
    await page.route('**/api/v1/positions', async (route) => {
      await route.fulfill({ json: mockPositions });
    });
    await page.route('**/api/v1/settings', async (route) => {
      await route.fulfill({ json: mockSettings });
    });

    await page.goto('/#/dashboard');
    await page.waitForSelector('button:has-text("进入交易工作台")', { timeout: 5000 });

    await page.locator('button:has-text("进入交易工作台")').click();
    await page.waitForURL('**/#/trade', { timeout: 5000 });
  });

  test('7. API error shows retry', async ({ page }) => {
    // Mock dashboard to return 500
    await page.route('**/api/v1/dashboard', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'Server error' }),
      });
    });
    await page.route('**/api/v1/settings', async (route) => {
      await route.fulfill({ json: mockSettings });
    });

    await page.goto('/#/dashboard');

    // Error state should show with retry button
    await expect(page.getByText('Server error')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('button:has-text("重试")')).toBeVisible();
  });
});
