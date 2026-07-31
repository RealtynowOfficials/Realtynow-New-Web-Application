import { test, expect } from '@playwright/test';

test.describe('Phase 4 - Authentication & Forms', () => {
  test('Login Page renders all inputs', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByPlaceholder(/Email/i)).toBeVisible();
    await expect(page.getByPlaceholder(/Password/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /Sign in/i })).toBeVisible();
  });

  test('Signup Page renders all inputs', async ({ page }) => {
    await page.goto('/register');
    await expect(page.getByPlaceholder(/First Name/i)).toBeVisible();
    await expect(page.getByPlaceholder(/Email/i)).toBeVisible();
    await expect(page.getByPlaceholder(/Password/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /Create Account/i })).toBeVisible();
  });

  test('Empty form submission shows validation errors', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: /Sign in/i }).click();
    
    // Zod validation should kick in
    await expect(page.getByText(/String must contain at least/i).first()).toBeVisible();
  });
});
