import { test, expect } from '@playwright/test';
import {
  setupDashboardMock,
  setupMarketMock,
  setupTemplatesMock,
  setupOrderMock,
} from '../fixtures/mocks';

test.describe('Order Page Semantics', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('token', 'mock-token');
    });
    await setupDashboardMock(page);
    await setupMarketMock(page);
    await setupTemplatesMock(page);
    await setupOrderMock(page);
  });

  test('uses trading workbench terminology instead of quick-build lots wording', async ({ page }) => {
    await page.goto('/#/trade');

    await expect(page.getByRole('heading', { name: /交易工作台|交易工作台/ })).toBeVisible();
    await expect(page.getByText('买入数量（股）')).toBeVisible();
    await expect(page.getByText('每手参考 100 股')).toBeVisible({ timeout: 5000 });
  });

  test('shows share input and reference hand conversion', async ({ page }) => {
    await page.goto('/#/trade');

    await page.locator('[data-testid="order-search"]').fill('600519');
    await page.waitForSelector('[data-testid="order-search-results"]', { timeout: 5000 });
    await page.locator('[data-testid="order-search-results"] .search-item').first().click();
    await page.waitForSelector('[data-testid="quote-bar"]', { timeout: 5000 });

    await page.locator('[data-testid="order-buy-shares"]').fill('300');
    await expect(page.locator('[data-testid="order-buy-shares"]')).toHaveValue('300');
    await expect(page.getByTestId('buy-share-reference')).toHaveText(/约\s*3\s*手；每手参考 100 股/);
  });

  test('keeps quick buy available without strategy binding', async ({ page }) => {
    await page.goto('/#/trade');

    await page.locator('[data-testid="order-search"]').fill('600519');
    await page.waitForSelector('[data-testid="order-search-results"]', { timeout: 5000 });
    await page.locator('[data-testid="order-search-results"] .search-item').first().click();
    await page.waitForSelector('[data-testid="quote-bar"]', { timeout: 5000 });

    await page.locator('[data-testid="order-buy-shares"]').fill('300');
    await expect(page.getByTestId('order-buy-submit')).toBeVisible();
  });

  test('preset buttons prefer share-based recommendations', async ({ page }) => {
    await page.goto('/#/trade');

    await page.locator('[data-testid="order-search"]').fill('600519');
    await expect(page.getByTestId('order-search-results')).toBeVisible({ timeout: 5000 });
    await page.locator('[data-testid="order-search-results"] .search-item').first().click();
    await expect(page.getByTestId('quote-bar')).toBeVisible({ timeout: 5000 });

    await expect(page.getByTestId('buy-preset-hints')).toContainText('200 股');
    await expect(page.getByRole('button', { name: /1\/2 可用/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /1\/2 可用/ })).toHaveAttribute('title', expect.stringContaining('200 股'));
  });

  test('manual invalid quantity shows guidance instead of silent rewrite', async ({ page }) => {
    await page.goto('/#/trade');

    await page.locator('[data-testid="order-search"]').fill('600519');
    await page.waitForSelector('[data-testid="order-search-results"]', { timeout: 5000 });
    await page.locator('[data-testid="order-search-results"] .search-item').first().click();
    await page.waitForSelector('[data-testid="quote-bar"]', { timeout: 5000 });

    await page.locator('[data-testid="order-buy-shares"]').fill('101');
    await expect(page.getByText('系统建议按 100 股步进调整。')).toBeVisible({ timeout: 5000 });
  });

  test('shows external link, orderbook depth and rule flags', async ({ page }) => {
    await page.goto('/#/trade');

    await page.locator('[data-testid="order-search"]').fill('600519');
    await page.waitForSelector('[data-testid="order-search-results"]', { timeout: 5000 });
    await page.locator('[data-testid="order-search-results"] .search-item').first().click();
    await expect(page.getByTestId('quote-bar')).toBeVisible({ timeout: 5000 });

    await expect(page.getByTestId('workbench-external-link')).toHaveAttribute('href', '/#/dashboard');
    await expect(page.getByTestId('orderbook-grid')).toContainText('买盘');
    await expect(page.getByTestId('orderbook-grid')).toContainText('卖盘');
    await expect(page.getByTestId('rule-status-flags')).toContainText('状态 TRADING');
  });

  test('shows preset order UI with existing preset orders', async ({ page }) => {
    await page.goto('/#/trade');

    await page.locator('[data-testid="order-search"]').fill('600519');
    await expect(page.getByTestId('order-search-results')).toBeVisible({ timeout: 5000 });
    await page.locator('[data-testid="order-search-results"] .search-item').first().click();
    await expect(page.getByTestId('quote-bar')).toBeVisible({ timeout: 5000 });

    await expect(page.getByText('策略绑定', { exact: true })).toBeVisible();
    await expect(page.getByTestId('buy-strategy-toggle')).toBeVisible();
    await expect(page.getByRole('button', { name: /1\/2 可用/ })).toBeVisible();
    await expect(page.getByTestId('buy-preset-hints')).toContainText('200 股');
  });
});
