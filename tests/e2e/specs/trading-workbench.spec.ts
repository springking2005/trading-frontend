import { test, expect } from '@playwright/test';
import {
  setupDashboardMock,
  setupMarketMock,
  setupTemplatesMock,
  setupOrderMock,
  setupAllMocks,
  mockOpenOrders,
  mockPositions,
  mockPositionDetail,
} from '../fixtures/mocks';

async function setupWorkbenchMocks(page: any) {
  await setupAllMocks(page);
  await page.route(/\/api\/v1\/accounts/, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([{ id: 'acc-001', broker_name: 'Mock Broker', account_no_masked: '****1234' }]),
    })
  );
  await page.route(/\/api\/v1\/orders\/open/, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockOpenOrders),
    })
  );
  await page.route(/\/api\/v1\/orders\/history/, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    })
  );
  await page.route(/\/api\/v1\/trades\/today/, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    })
  );
  await page.route(/\/api\/v1\/positions/, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockPositions),
    })
  );
  await page.route(/\/api\/v1\/positions\/pos-001/, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockPositionDetail),
    })
  );
}

test.describe('Trading Workbench', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('token', 'mock-token');
    });
    await setupWorkbenchMocks(page);
  });

  test('shows trading workbench shell and top context', async ({ page }) => {
    await page.goto('/#/trade');

    await expect(page.getByRole('heading', { name: '交易工作台' }).first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/券商 \//)).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('button', { name: '刷新' })).toBeVisible();
  });

  test('renders five trading tabs', async ({ page }) => {
    await page.goto('/#/trade');

    for (const tab of ['买入', '卖出', '撤单', '持仓', '查询']) {
      await expect(page.getByTestId(`workbench-tab-${tab === '买入' ? 'buy' : tab === '卖出' ? 'sell' : tab === '撤单' ? 'cancel' : tab === '持仓' ? 'positions' : 'query'}`)).toBeVisible();
    }
  });

  test('buy flow keeps quantity in shares and shows hand reference', async ({ page }) => {
    await page.goto('/#/trade');

    await page.locator('[data-testid="order-search"]').fill('600519');
    await page.waitForSelector('[data-testid="order-search-results"]', { timeout: 5000 });
    await page.locator('[data-testid="order-search-results"] .search-item').first().click();
    await page.waitForSelector('[data-testid="quote-bar"]', { timeout: 5000 });

    await page.locator('[data-testid="order-buy-shares"]').fill('300');
    await expect(page.locator('[data-testid="order-buy-shares"]')).toHaveValue('300');
    await expect(page.getByTestId('buy-share-reference')).toHaveText(/约\s*3\s*手；每手参考 100 股/);
  });

  test('quick buy does not require strategy selection', async ({ page }) => {
    await page.goto('/#/trade');

    await page.locator('[data-testid="order-search"]').fill('600519');
    await page.waitForSelector('[data-testid="order-search-results"]', { timeout: 5000 });
    await page.locator('[data-testid="order-search-results"] .search-item').first().click();
    await page.waitForSelector('[data-testid="quote-bar"]', { timeout: 5000 });

    await page.locator('[data-testid="order-buy-shares"]').fill('300');
    await expect(page.getByTestId('order-buy-submit')).toBeVisible();
    await expect(page.getByTestId('buy-strategy-toggle')).toBeVisible();
  });

  test('strategy binding is optional in buy flow', async ({ page }) => {
    await page.goto('/#/trade');

    await page.locator('[data-testid="order-search"]').fill('600519');
    await page.waitForSelector('[data-testid="order-search-results"]', { timeout: 5000 });
    await page.locator('[data-testid="order-search-results"] .search-item').first().click();
    await page.waitForSelector('[data-testid="quote-bar"]', { timeout: 5000 });

    await expect(page.getByText('策略绑定', { exact: true })).toBeVisible();
    await page.getByTestId('buy-strategy-toggle').click();
    await expect(page.getByTestId('buy-strategy-template')).toBeVisible();
  });

  test('cancel section exposes empty state or open order list', async ({ page }) => {
    await page.goto('/#/trade');
    await page.getByTestId('workbench-tab-cancel').click();

    await expect(page.getByText(/撤单/).first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/暂无可撤委托|支持单笔撤单/)).toBeVisible();
    if (await page.getByText('贵州茅台').count()) {
      await expect(page.getByText('贵州茅台').first()).toBeVisible();
      await expect(page.getByText('SUBMITTED').first()).toBeVisible();
    }
  });

  test('holdings section shows asset and position fields', async ({ page }) => {
    await page.goto('/#/trade');
    await page.getByTestId('workbench-tab-positions').click();

    await expect(page.getByTestId('order-asset-grid')).toBeVisible({ timeout: 5000 });
    await expect(page.getByTestId('order-position-list')).toBeVisible();
    await expect(page.getByText('贵州茅台').first()).toBeVisible();
    await expect(page.getByTestId('order-asset-grid')).toContainText('总资产');
    await expect(page.getByTestId('order-asset-grid')).toContainText('浮动盈亏');
    await expect(page.getByTestId('order-asset-grid')).toContainText('当日盈亏');
    await expect(page.getByTestId('order-asset-grid')).toContainText('总市值');
    await expect(page.getByText('市值 ¥250,000')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('成本 1700.00')).toBeVisible({ timeout: 5000 });
  });

  test('query section exposes P2 entry placeholders', async ({ page }) => {
    await page.goto('/#/trade');
    await page.getByTestId('workbench-tab-query').click();

    await expect(page.getByTestId('order-query-grid')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('当日委托')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('对账单 / 转账 / T / 新股 / 资产分析')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('[data-testid="order-query-grid"] .query-section').first()).toContainText('已归位');
  });

  test('position actions link out to detail page actions', async ({ page }) => {
    await page.goto('/#/trade');
    await page.getByTestId('workbench-tab-positions').click();

    await expect(page.getByText('涨跌幅 +2.15%')).toBeVisible({ timeout: 5000 });
    await page.getByRole('button', { name: '绑定策略' }).first().click();
    await expect(page).toHaveURL(/\/#\/positions\/pos-001\?action=bind/);
  });

  test('route query action opens bind strategy modal in position detail page', async ({ page }) => {
    await page.goto('/#/positions/pos-001?action=bind');

    await expect(page.getByText('策略接管')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('绑定策略会接管后续执行归属，不改写历史成交；普通交易路径仍然保留可见。')).toBeVisible();
    await expect(page.getByTestId('position-bind-confirm-btn')).toBeVisible();
  });
});
