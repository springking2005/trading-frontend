import { test, expect } from '@playwright/test';
import {
  setupDashboardMock,
  setupMarketMock,
  setupTemplatesMock,
  setupOrderMock,
} from '../fixtures/mocks';

async function selectStock(page: import('@playwright/test').Page, query = '600519') {
  await page.getByTestId('order-search').waitFor({ state: 'visible' });
  await page.getByTestId('order-search').fill(query);
  const firstResult = page.locator('[data-testid="order-search-results"] .search-item').first();
  await expect(firstResult).toBeVisible({ timeout: 10000 });
  await firstResult.click();
  await expect(page.getByTestId('quote-bar')).toBeVisible({ timeout: 10000 });
}

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

    await selectStock(page);

    await page.locator('[data-testid="order-buy-shares"]').fill('300');
    await expect(page.locator('[data-testid="order-buy-shares"]')).toHaveValue('300');
    await expect(page.getByTestId('buy-share-reference')).toHaveText(/约\s*3\s*手；每手参考 100 股/);
  });

  test('keeps quick buy available without strategy binding', async ({ page }) => {
    await page.goto('/#/trade');

    await selectStock(page);

    await page.locator('[data-testid="order-buy-shares"]').fill('300');
    await expect(page.getByTestId('order-buy-submit')).toBeVisible();
  });

  test('preset buttons prefer share-based recommendations', async ({ page }) => {
    await page.goto('/#/trade');

    await selectStock(page);

    await expect(page.getByTestId('buy-preset-hints')).toContainText('200 股');
    await expect(page.getByRole('button', { name: /1\/2 可用/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /1\/2 可用/ })).toHaveAttribute('title', expect.stringContaining('200 股'));
  });

  test('manual invalid quantity shows guidance instead of silent rewrite', async ({ page }) => {
    await page.goto('/#/trade');

    await selectStock(page);

    await page.locator('[data-testid="order-buy-shares"]').fill('101');
    await expect(page.getByText('系统建议按 100 股步进调整。')).toBeVisible({ timeout: 5000 });
  });

  test('shows external link, orderbook depth and rule flags', async ({ page }) => {
    await page.goto('/#/trade');

    await selectStock(page);

    await expect(page.getByTestId('workbench-external-link')).toHaveAttribute('href', '/#/dashboard');
    await expect(page.getByTestId('orderbook-grid')).toContainText('买盘');
    await expect(page.getByTestId('orderbook-grid')).toContainText('卖盘');
    await expect(page.getByTestId('rule-status-flags')).toContainText('状态 TRADING');
  });

  test('shows preset order UI with existing preset orders', async ({ page }) => {
    await page.goto('/#/trade');

    await selectStock(page);

    await expect(page.getByText('策略绑定', { exact: true })).toBeVisible();
    await expect(page.getByTestId('buy-strategy-toggle')).toBeVisible();
    await expect(page.getByRole('button', { name: /1\/2 可用/ })).toBeVisible();
    await expect(page.getByTestId('buy-preset-hints')).toContainText('200 股');
  });

  test('today order tab requests all today orders and shows filled orders', async ({ page }) => {
    await page.unroute(/\/api\/v1\/orders(\?.*)?$/);
    let todayOrderUrl = '';
    await page.route(/\/api\/v1\/orders(\?.*)?$/, async (route) => {
      const requestUrl = new URL(route.request().url());
      if (requestUrl.searchParams.get('today') === 'true') {
        todayOrderUrl = route.request().url();
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            items: [
              {
                id: 'ord-filled-kc',
                vt_orderid: 'ord-kc-1',
                vt_symbol: 'KC.US',
                direction: 'LONG',
                order_type: 'LIMIT',
                price: 9.28,
                volume: 1,
                traded_volume: 1,
                traded_price: 9.28,
                status: 'ALLTRADED',
                created_at: '2026-07-01T15:02:59.000Z',
              },
            ],
            total: 1,
          }),
        });
        return;
      }
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ items: [], total: 0 }) });
    });

    await page.goto('/#/trade');
    await page.getByTestId('workbench-tab-query').click();
    await page.getByText('当日委托', { exact: true }).click();

    await expect(page.getByTestId('order-query-list')).toContainText('KC');
    await expect(page.getByTestId('order-query-list')).toContainText('ALLTRADED');
    expect(todayOrderUrl).not.toBe('');
    const requested = new URL(todayOrderUrl);
    expect(requested.searchParams.get('today')).toBe('true');
    expect(requested.searchParams.has('statuses')).toBe(false);
  });


  test('positions tab refreshes after quick buy submit', async ({ page }) => {
    let submitted = false;
    await page.unroute(/\/api\/v1\/orders(\?.*)?$/);
    await page.unroute(/\/api\/v1\/positions/);
    await page.route(/\/api\/v1\/orders(\?.*)?$/, async (route) => {
      if (route.request().method() === 'POST') {
        submitted = true;
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({ id: 'ord-quick-1', vt_orderid: 'ord-quick-1', status: 'ALLTRADED', traded_volume: 300 }),
        });
        return;
      }
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ items: [], total: 0 }) });
    });
    await page.route(/\/api\/v1\/positions/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(submitted ? [
          {
            id: 'pos-quick-1',
            vt_symbol: '600519.SSE',
            code: '600519',
            name: '贵州茅台',
            stock_name: '贵州茅台',
            status: 'ACTIVE',
            volume: 300,
            sellable_qty: 300,
            t1_locked_qty: 0,
            current_price: 1550,
            current_value: 465000,
            market_value: 465000,
            unrealized_pnl: 0,
            pnl: 0,
            cost_price: 1550,
            weight: 100,
          },
        ] : []),
      });
    });

    await page.goto('/#/trade');
    await selectStock(page);
    await page.locator('[data-testid="order-buy-shares"]').fill('300');
    await page.getByTestId('order-buy-submit').click();

    await expect.poll(() => submitted).toBe(true);
    await page.getByTestId('workbench-tab-positions').click();
    await expect(page.getByTestId('order-position-list')).toContainText('600519');
    await expect(page.getByTestId('order-position-list')).toContainText('持仓 300 股');
  });

});
