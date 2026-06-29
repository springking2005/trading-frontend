import { test, expect } from '@playwright/test';

const defaultSettings = {
  max_concurrent_stocks: 5,
  total_capital: 1000000,
  max_daily_loss_pct: -3,
  order_confirm_small: 50000,
  order_confirm_large: 200000,
  enable_auto_trading: true,
  enable_auto_add: true,
  enable_auto_sell: true,
  enable_hard_stop: true,
  enable_multi_execution_per_stock: false,
  futu_trade_env: 'SIMULATE',
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
});

test.describe('Settings Page', () => {
  test('1. Settings load with default values', async ({ page }) => {
    await page.route('**/api/v1/settings**', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({ json: defaultSettings });
      } else {
        await route.continue();
      }
    });

    await page.goto('/#/settings');
    await page.waitForSelector('select[data-testid="futu-trade-env"]', { timeout: 5000 });

    const futuSelect = page.locator('[data-testid="futu-trade-env"]');
    await expect(futuSelect).toHaveValue('SIMULATE');
  });

  test('2. Change Futu env and save', async ({ page }) => {
    let putCalled = false;
    await page.route('**/api/v1/settings**', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({ json: defaultSettings });
      } else if (route.request().method() === 'PUT') {
        putCalled = true;
        await route.fulfill({ json: { updated: true } });
      } else {
        await route.continue();
      }
    });

    await page.goto('/#/settings');
    await page.waitForSelector('[data-testid="futu-trade-env"]', { timeout: 5000 });

    await page.selectOption('[data-testid="futu-trade-env"]', 'REAL');
    await page.click('[data-testid="settings-save-btn"]');

    // Verify toast appears
    await expect(page.locator('.toast')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('.toast')).toContainText('Settings saved');
    expect(putCalled).toBe(true);
  });

  test('3. Logout clears token and redirects', async ({ page }) => {
    await page.route('**/api/v1/settings**', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({ json: defaultSettings });
      } else {
        await route.continue();
      }
    });

    await page.goto('/#/settings');
    await page.waitForSelector('[data-testid="logout-btn"]', { timeout: 5000 });

    await page.click('[data-testid="logout-btn"]');
    await page.waitForURL('**/#/login', { timeout: 5000 });

    const token = await page.evaluate(() => localStorage.getItem('token'));
    expect(token).toBeNull();
  });

  test('4. Save error shows error text', async ({ page }) => {
    await page.route('**/api/v1/settings**', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({ json: defaultSettings });
      } else if (route.request().method() === 'PUT') {
        await route.fulfill({
          status: 500,
          json: { detail: 'Server error: database unavailable' },
        });
      } else {
        await route.continue();
      }
    });

    await page.goto('/#/settings');
    await page.waitForSelector('[data-testid="settings-save-btn"]', { timeout: 5000 });

    await page.click('[data-testid="settings-save-btn"]');

    // After 500 error, saving resets to false, so template shows the load-error view:
    // <div v-else-if="error && !saving" class="card"> {{ error }} <button>Retry</button> </div>
    await expect(page.locator('text=Server error: database unavailable')).toBeVisible({ timeout: 5000 });
    // Confirm we're in error state (Retry button visible)
    await expect(page.locator('button:has-text("重试")')).toBeVisible({ timeout: 3000 });
  });

  test('5. Batch save sends all params', async ({ page }) => {
    let putUrl = '';
    await page.route('**/api/v1/settings**', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({ json: defaultSettings });
      } else if (route.request().method() === 'PUT') {
        putUrl = route.request().url();
        await route.fulfill({ json: { updated: true } });
      } else {
        await route.continue();
      }
    });

    await page.goto('/#/settings');
    await page.waitForSelector('[data-testid="settings-save-btn"]', { timeout: 5000 });

    await page.click('[data-testid="settings-save-btn"]');

    await expect(page.locator('.toast')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('.toast')).toContainText('Settings saved');

    // Verify PUT URL contains all expected query parameters
    expect(putUrl).toContain('max_concurrent_stocks=');
    expect(putUrl).toContain('total_capital=');
    expect(putUrl).toContain('max_daily_loss_pct=');
    expect(putUrl).toContain('order_confirm_small=');
    expect(putUrl).toContain('order_confirm_large=');
    expect(putUrl).toContain('enable_auto_trading=');
    expect(putUrl).toContain('enable_multi_execution_per_stock=');
    expect(putUrl).toContain('futu_trade_env=');
  });
});
