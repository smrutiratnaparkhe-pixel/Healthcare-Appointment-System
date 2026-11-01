import { test, expect } from '@playwright/test';

test.describe('E2E Full Flow', () => {
  test('Register, View Dashboard, and Find Care', async ({ page }) => {
    const uniqueEmail = `testuser_${Date.now()}@example.com`;

    // 1. Register a new patient
    await page.goto('/register');
    await page.fill('input[name="firstName"]', 'Playwright');
    await page.fill('input[name="lastName"]', 'Tester');
    await page.fill('input[name="email"]', uniqueEmail);
    await page.fill('input[name="password"]', 'Kakshil@1234');
    // Role is defaulted to 'patient'
    await page.click('button[type="submit"]');

    // Should redirect to patient dashboard
    await expect(page).toHaveURL(/.*\/patient/, { timeout: 15000 });
    await expect(page.locator('text="Overview"').first()).toBeVisible();

    // 2. Navigate to Find Care
    await page.click('a[href="/discover"]');
    await expect(page).toHaveURL(/.*\/discover/, { timeout: 10000 });

    // 3. Verify Hospitals load in Find Care
    await expect(page.locator('h3:has-text("All Hospitals")')).toBeVisible({ timeout: 15000 });
    
    const firstHospital = page.locator('.group.relative.p-4.rounded-2xl').first();
    await expect(firstHospital).toBeVisible({ timeout: 15000 });

    // 4. Click a hospital and verify detail panel opens
    await firstHospital.click();
    await expect(page.locator('h3:has-text("Hospital Details")')).toBeVisible({ timeout: 10000 });
    
    // Quick action Rate button should be present
    await expect(page.locator('button:has-text("Rate")')).toBeVisible();
  });
});
