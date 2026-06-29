import { test, expect } from '@playwright/test';
import { setupDashboardMock } from '../fixtures/mocks';

const templates = [
  {
    id: 'builtin-1',
    name: 'Default Grid',
    description: 'Built-in default grid strategy',
    is_system: true,
    params: {
      base_position_amount: 100000,
      add_position_amount: 50000,
      add_trigger_pct: -3.0,
      sell_trigger_pct: 5.0,
      max_add_count: 5,
      hard_stop_loss_pct: -8.0,
    },
  },
  {
    id: 'custom-1',
    name: 'My Custom Grid',
    description: 'A custom grid strategy',
    is_system: false,
    params: {
      base_position_amount: 200000,
      add_position_amount: 50000,
      add_trigger_pct: -2.0,
      sell_trigger_pct: 4.0,
      max_add_count: 3,
      hard_stop_loss_pct: -5.0,
    },
  },
];

test.beforeEach(async ({ page }) => {
  await page.goto('/#/login');
  await page.evaluate(() => {
    localStorage.setItem('token', 'mock-token');
    localStorage.setItem('refresh', 'mock-refresh');
  });
  await setupDashboardMock(page);
});

test.describe('Strategies Page', () => {
  test('1. Template list loads', async ({ page }) => {
    await page.route('**/api/v1/strategies/definitions', async (route) => {
      await route.fulfill({ json: templates });
    });

    await page.goto('/#/strategies');
    await page.waitForSelector('[data-testid="strategy-card"]', { timeout: 5000 });

    const cards = page.locator('[data-testid="strategy-card"]');
    await expect(cards).toHaveCount(2);
    await expect(cards.first()).toContainText('Default Grid');
    await expect(cards.nth(1)).toContainText('My Custom Grid');
  });

  test('2. Create new template', async ({ page }) => {
    await page.route('**/api/v1/strategies/definitions', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({ json: templates });
      } else if (route.request().method() === 'POST') {
        await route.fulfill({ status: 201, json: { id: 'new-id', name: 'New Template' } });
      }
    });

    await page.goto('/#/strategies');
    await page.waitForSelector('[data-testid="strategy-create-btn"]', { timeout: 5000 });
    await page.click('[data-testid="strategy-create-btn"]');

    // Modal opens
    await page.waitForSelector('.modal-overlay', { timeout: 3000 });

    // Fill the name (first text input in modal)
    const nameInput = page.locator('.modal-content input[type="text"]').first();
    await nameInput.fill('New Template');

    // Click Create
    await page.locator('.modal-content .btn-primary').click();

    // Verify toast
    await expect(page.locator('.toast')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('.toast')).toContainText('模板已创建');
  });

  test('3. Edit template pre-fills modal', async ({ page }) => {
    await page.route('**/api/v1/strategies/definitions', async (route) => {
      await route.fulfill({ json: templates });
    });

    await page.goto('/#/strategies');
    await page.waitForSelector('[data-testid="strategy-edit-btn"]', { timeout: 5000 });

    // Click edit on the first card
    await page.locator('[data-testid="strategy-edit-btn"]').first().click();

    // Wait for modal
    await page.waitForSelector('.modal-overlay', { timeout: 3000 });

    // Name input should be pre-filled
    const nameInput = page.locator('.modal-content input[type="text"]').first();
    await expect(nameInput).not.toHaveValue('');
    await expect(nameInput).toHaveValue('Default Grid');
  });

  test('4. Built-in template has no delete button', async ({ page }) => {
    await page.route('**/api/v1/strategies/definitions', async (route) => {
      await route.fulfill({ json: templates });
    });

    await page.goto('/#/strategies');
    await page.waitForSelector('[data-testid="strategy-card"]', { timeout: 5000 });

    // First card is built-in: no delete button
    const firstCard = page.locator('[data-testid="strategy-card"]').first();
    await expect(firstCard.locator('[data-testid="strategy-delete-btn"]')).toHaveCount(0);

    // Second card is custom: delete button present
    const secondCard = page.locator('[data-testid="strategy-card"]').nth(1);
    await expect(secondCard.locator('[data-testid="strategy-delete-btn"]')).toHaveCount(1);
  });

  test('5. Clone template', async ({ page }) => {
    await page.route('**/api/v1/strategies/definitions', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({ json: templates });
      } else if (route.request().method() === 'POST') {
        await route.fulfill({ status: 201, json: { id: 'cloned-id', name: templates[0].name + ' (Copy)' } });
      }
    });

    await page.goto('/#/strategies');
    await page.waitForSelector('[data-testid="strategy-card"]', { timeout: 5000 });

    // Click clone button (Chinese text "克隆") on first card
    await page.locator('button:has-text("克隆")').first().click();

    // Verify toast
    await expect(page.locator('.toast')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('.toast')).toContainText('模板已克隆');
  });

  test('6. Delete confirmation modal', async ({ page }) => {
    await page.route('**/api/v1/strategies/definitions', async (route) => {
      await route.fulfill({ json: templates });
    });

    await page.goto('/#/strategies');
    await page.waitForSelector('[data-testid="strategy-card"]', { timeout: 5000 });

    // Click delete on the second card (non-builtin)
    await page.locator('[data-testid="strategy-delete-btn"]').first().click();

    // Confirmation modal visible
    await page.waitForSelector('.modal-overlay', { timeout: 3000 });
    await expect(page.locator('.modal-header')).toContainText('确认删除');
    await expect(page.locator('[data-testid="strategy-confirm-delete"]')).toBeVisible();
  });

  test('7. Delete success closes modal and shows toast', async ({ page }) => {
    let currentTemplates = [...templates];
    await page.route(/\/api\/v1\/strategies\/definitions(\/custom-1)?$/, async (route) => {
      const request = route.request();
      if (request.method() === 'GET') {
        await route.fulfill({ json: currentTemplates });
        return;
      }
      if (request.method() === 'DELETE') {
        currentTemplates = currentTemplates.filter((item) => item.id !== 'custom-1');
        await route.fulfill({ status: 204 });
        return;
      }
      await route.fulfill({ status: 405, json: { detail: 'Method Not Allowed' } });
    });

    await page.goto('/#/strategies');
    await page.waitForSelector('[data-testid="strategy-card"]', { timeout: 5000 });

    await page.locator('[data-testid="strategy-card"]').nth(1).locator('[data-testid="strategy-delete-btn"]').click();
    await page.waitForSelector('.modal-overlay', { timeout: 3000 });
    await expect(page.locator('.modal-header')).toContainText('确认删除');
    await expect(page.locator('.modal-content')).toContainText('My Custom Grid');

    await Promise.all([
      page.waitForResponse((response) =>
        response.request().method() === 'DELETE'
          && response.url().endsWith('/api/v1/strategies/definitions/custom-1')
          && response.status() === 204
      ),
      page.locator('[data-testid="strategy-confirm-delete"]').click(),
    ]);

    await expect(page.locator('.toast')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('.toast')).toContainText('模板已删除');
    await expect(page.locator('.modal-overlay')).toHaveCount(0);
  });

  test('8. Empty name should not submit', async ({ page }) => {
    await page.route('**/api/v1/strategies/definitions', async (route) => {
      await route.fulfill({ json: templates });
    });

    await page.goto('/#/strategies');
    await page.waitForSelector('[data-testid="strategy-create-btn"]', { timeout: 5000 });
    await page.click('[data-testid="strategy-create-btn"]');

    // Modal visible
    await page.waitForSelector('.modal-overlay', { timeout: 3000 });

    // Create button should be disabled when name is empty
    const createBtn = page.locator('.modal-content .btn-primary');
    await expect(createBtn).toBeDisabled();

    // Force-click the disabled button
    await createBtn.click({ force: true });

    // Modal should still be open (submitForm returned early)
    await expect(page.locator('.modal-overlay')).toBeVisible();
  });

  test('9. Plain-text 500 shows readable error', async ({ page }) => {
    await page.route('**/api/v1/strategies/definitions', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'text/plain; charset=utf-8',
        body: 'Internal Server Error',
      });
    });

    await page.goto('/#/strategies');

    await expect(page.locator('text=Internal Server Error')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('body')).not.toContainText('Unexpected token');
  });
});
