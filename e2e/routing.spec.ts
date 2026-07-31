import { test, expect } from '@playwright/test';

test.describe('Phase 2 - Routing & Navigation', () => {
  test('HomePage loads correctly without 404', async ({ page }) => {
    const response = await page.goto('/');
    expect(response?.status()).toBe(200);
    await expect(page).toHaveTitle(/RealtyNow/i);
    // Ensure no broken UI
    await expect(page.locator('body')).not.toContainText('404 Not Found');
  });

  test('Public Search Page loads correctly', async ({ page }) => {
    const response = await page.goto('/search');
    expect(response?.status()).toBe(200);
    await expect(page.getByPlaceholder(/City, neighborhood/i)).toBeVisible();
  });

  test('Public AI Hub loads correctly', async ({ page }) => {
    const response = await page.goto('/ai-hub');
    expect(response?.status()).toBe(200);
    await expect(page.getByText(/AI Property Assistant/i).first()).toBeVisible();
  });

  test('Static Pages load correctly', async ({ page }) => {
    await page.goto('/about');
    await expect(page.getByText(/About RealtyNow/i).first()).toBeVisible();

    await page.goto('/contact');
    await expect(page.getByText(/Contact Us/i).first()).toBeVisible();

    await page.goto('/faq');
    await expect(page.getByText(/Frequently Asked Questions/i).first()).toBeVisible();
  });

  test('Invalid routes correctly show 404 Page', async ({ page }) => {
    const response = await page.goto('/this-route-does-not-exist');
    // For SPAs, Vite usually returns 200, but the UI should show 404
    await expect(page.getByText(/Page not found/i).first()).toBeVisible();
    await expect(page.getByRole('link', { name: /Go Back Home/i })).toBeVisible();
  });

  test('Protected routes redirect unauthorized users to login', async ({ page }) => {
    await page.goto('/portal/dashboard');
    // Should be redirected or show unauthorized
    await expect(page).toHaveURL(/.*login.*/);
  });
});
