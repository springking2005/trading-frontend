import { test, expect } from '@playwright/test';
import {
  setupDashboardMock,
  setupMarketMock,
  setupTemplatesMock,
  setupOrderMock,
} from '../fixtures/mocks';

test.describe('Mobile H5 entry', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.addInitScript(() => {
      localStorage.setItem('token', 'mock-token');
      localStorage.setItem('refresh', 'mock-refresh');
    });
    await setupDashboardMock(page);
    await setupMarketMock(page);
    await setupTemplatesMock(page);
    await setupOrderMock(page);
  });

  test('loads mobile shell and navigates core tabs without horizontal overflow', async ({ page }) => {
    await page.goto('/mobile.html#/dashboard');

    await expect(page.locator('.mobile-h5-shell')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('.mobile-h5-bottom-nav')).toBeVisible();
    await expect(page.getByText('驾驶舱概览').first()).toBeVisible();

    const hasOverflow = await page.locator('body').evaluate((body) => body.scrollWidth > body.clientWidth + 2);
    expect(hasOverflow).toBeFalsy();

    await page.getByRole('link', { name: /交易/ }).click();
    await page.waitForURL('**/mobile.html#/trade', { timeout: 10000 });
    await expect(page.getByRole('heading', { name: '交易工作台' }).first()).toBeVisible();
  });
});
