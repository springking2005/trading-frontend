import { test, expect } from '@playwright/test';
import { setupDashboardMock, setupMarketMock, setupTemplatesMock, setupOrderMock, mockPositions, mockPositionDetail } from '../fixtures/mocks';

test.describe('Strategy Binding Regression', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('token', 'mock-token');
    });
    await setupDashboardMock(page);
    await setupMarketMock(page);
    await setupTemplatesMock(page);
    await setupOrderMock(page);
  });

  test('quick buy remains usable when strategy is not selected', async ({ page }) => {
    await page.goto('/#/trade');

    await page.locator('[data-testid="order-search"]').fill('600519');
    await page.waitForSelector('[data-testid="order-search-results"]', { timeout: 5000 });
    await page.locator('[data-testid="order-search-results"] .search-item').first().click();
    await page.waitForSelector('[data-testid="quote-bar"]', { timeout: 5000 });

    await page.locator('[data-testid="order-buy-shares"]').fill('300');
    await expect(page.getByTestId('order-buy-submit')).toBeVisible();
    await expect(page.getByText('策略绑定', { exact: true })).toBeVisible();
  });

  test('strategy selector remains optional and readable', async ({ page }) => {
    await page.goto('/#/trade');

    await expect(page.getByText('策略模板')).toBeVisible({ timeout: 5000 });
    await page.getByTestId('buy-strategy-toggle').click();
    await expect(page.getByTestId('buy-strategy-template')).toBeVisible();
  });

  test('position detail exposes strategy takeover actions', async ({ page }) => {
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

    await page.goto('/#/tradelot');
    await page.waitForSelector('[data-testid="tl-position-card"]', { timeout: 5000 });
    await page.locator('[data-testid="tl-position-card"] .tl-row-header').first().click();

    await expect(page.getByTestId('tl-tune-params-btn')).toBeVisible();
    await expect(page.getByTestId('tl-pause-strategy-btn')).toBeVisible();
    await expect(page.getByTestId('tl-clear-stock-btn')).toBeVisible();
  });
});
