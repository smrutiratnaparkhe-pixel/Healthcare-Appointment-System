import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('Login page loads correctly', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('h1')).toContainText('Welcome back');
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
  });

  test('Invalid credentials show error toast', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', 'invalid@user.com');
    await page.fill('input[name="password"]', 'WrongPassword123');
    await page.click('button[type="submit"]');

    // Wait for the error toast to appear (assuming sonner or similar is used)
    await expect(page.locator('text="Invalid email or password"').first()).toBeVisible({ timeout: 10000 }).catch(async () => {
        await expect(page.locator('text="Failed to login"').first()).toBeVisible({ timeout: 10000 });
    });
  });
});
