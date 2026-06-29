import { test, expect } from '@playwright/test';
import { login } from '../fixtures/auth';
import { setupAuthMock, setupDashboardMock } from '../fixtures/mocks';

test.describe('Login Page', () => {
  test('empty form should not submit', async ({ page }) => {
    await page.goto('/#/login');
    await page.locator('[data-testid="login-submit"]').click();

    // Should stay on login page — the submit() function returns early when fields are empty
    await expect(page).toHaveURL(/\/#\/login/);
  });

  test('successful login stores token and redirects to dashboard', async ({ page }) => {
    await setupAuthMock(page);
    await setupDashboardMock(page);

    await page.goto('/#/login');
    await page.locator('[data-testid="login-username"]').fill('testuser');
    await page.locator('[data-testid="login-password"]').fill('testpass');
    await page.locator('[data-testid="login-submit"]').click();

    await page.waitForURL(/\/#\/dashboard/, { timeout: 10000 });

    // Wait for the dashboard to fully render (all API calls resolved)
    await expect(page.getByText('驾驶舱概览')).toBeVisible({ timeout: 5000 });

    // Check localStorage tokens
    const token = await page.evaluate('localStorage.getItem("token")');
    expect(token).toBe('mock-token');

    const refresh = await page.evaluate('localStorage.getItem("refresh")');
    expect(refresh).toBe('mock-refresh');
  });

  test('401 clears token and redirects to login', async ({ page }) => {
    // Set an expired token so the auth guard lets us through to dashboard
    await page.goto('/#/login');
    await page.evaluate(() => {
      localStorage.setItem('token', 'expired-token');
      localStorage.setItem('refresh', 'expired-refresh');
    });

    // Mock settings & positions to return 200 so they don't interfere.
    // Only the dashboard endpoint returns 401 to demonstrate token clearing.
    await page.route(/\/api\/v1\/settings/, (route) =>
      route.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify({ enable_multi_execution_per_stock: false }) })
    );
    await page.route(/\/api\/v1\/positions/, (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
    );
    await page.route(/\/api\/v1\/dashboard/, (route) =>
      route.fulfill({ status: 401, contentType: 'application/json', body: '{"detail":"Unauthorized"}' })
    );

    await page.goto('/#/dashboard');
    await page.waitForURL(/\/#\/login/, { timeout: 10000 });

    const token = await page.evaluate(() => localStorage.getItem('token'));
    expect(token).toBeNull();
  });

  test('unauthenticated access redirects to login', async ({ page }) => {
    // Use addInitScript to clear localStorage before the app loads.
    await page.addInitScript(() => {
      localStorage.clear();
    });

    await page.goto('/#/dashboard');
    await page.waitForURL(/\/#\/login/, { timeout: 10000 });

    // Verify the login form is visible
    await expect(page.locator('[data-testid="login-username"]')).toBeVisible();
  });

  test('invalid credentials show error', async ({ page }) => {
    // Use 400 instead of 401 — the api-client's 401 handler short-circuits
    // with "登录已过期" before the !res.ok detail check can run.
    await page.route(/\/api\/v1\/auth\/login/, (route) =>
      route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'Invalid username or password' }),
      })
    );

    await page.goto('/#/login');
    await page.locator('[data-testid="login-username"]').fill('baduser');
    await page.locator('[data-testid="login-password"]').fill('badpass');
    await page.locator('[data-testid="login-submit"]').click();

    // The error message is displayed in a div with class text-up (v-if="error")
    await expect(page.locator('.login-card .text-up')).toContainText('Invalid username or password');
  });

  test('toggle register/login mode', async ({ page }) => {
    await page.goto('/#/login');

    // Default mode: Sign In
    await expect(page.locator('[data-testid="login-submit"]')).toContainText('登 录');

    // Click the "Create one" link to toggle to register mode
    await page.getByText('没有账户？创建新账户').click();

    // Should now show "Create Account"
    await expect(page.locator('[data-testid="login-submit"]')).toContainText('创建账户');

    // Click again to toggle back
    await page.getByText('已有账户？去登录').click();

    // Should be back to "Sign In"
    await expect(page.locator('[data-testid="login-submit"]')).toContainText('登 录');
  });
});
