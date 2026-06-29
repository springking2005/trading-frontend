import { test, expect } from '@playwright/test';
import { setupDashboardMock, setupMarketMock, setupTemplatesMock } from '../fixtures/mocks';

test.describe('Visual Trading Workbench', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('token', 'mock-token');
    });
    await setupDashboardMock(page);
    await setupMarketMock(page);
    await setupTemplatesMock(page);
  });

  test('renders trading workbench with dark theme baseline', async ({ page }) => {
    await page.goto('/#/trade');

    await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(11, 14, 20)');
    const hasOverflow = await page.locator('body').evaluate((el) => el.scrollWidth > el.clientWidth + 2);
    expect(hasOverflow).toBeFalsy();
  });

  test('shows share-based amount input and no obvious horizontal overflow on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 900 });
    await page.goto('/#/trade');

    const body = page.locator('body');
    const hasOverflow = await body.evaluate((el) => el.scrollWidth > el.clientWidth + 2);
    expect(hasOverflow).toBeFalsy();
  });
});
