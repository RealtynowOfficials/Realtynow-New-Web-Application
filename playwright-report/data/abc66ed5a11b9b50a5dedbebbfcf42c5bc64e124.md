# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: routing.spec.ts >> Phase 2 - Routing & Navigation >> Protected routes redirect unauthorized users to login
- Location: e2e\routing.spec.ts:42:3

# Error details

```
Error: expect(page).toHaveURL(expected) failed

Expected pattern: /.*login.*/
Received string:  "http://localhost:5173/portal/dashboard"
Timeout: 5000ms

Call log:
  - Expect "toHaveURL" with timeout 5000ms
    11 × locator resolved to <html lang="en">…</html>
       - unexpected value "http://localhost:5173/portal/dashboard"

```

```yaml
- img
- heading "404 - Page Not Found" [level=1]
- paragraph: The page you're looking for doesn't exist or has been moved.
- link "Back to Home":
  - /url: /
  - button "Back to Home"
- link "Chat on WhatsApp":
  - /url: https://wa.me/919494230774
  - img
- button "AI Assistant":
  - img
  - text: AI Assistant
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('Phase 2 - Routing & Navigation', () => {
  4  |   test('HomePage loads correctly without 404', async ({ page }) => {
  5  |     const response = await page.goto('/');
  6  |     expect(response?.status()).toBe(200);
  7  |     await expect(page).toHaveTitle(/RealtyNow/i);
  8  |     // Ensure no broken UI
  9  |     await expect(page.locator('body')).not.toContainText('404 Not Found');
  10 |   });
  11 | 
  12 |   test('Public Search Page loads correctly', async ({ page }) => {
  13 |     const response = await page.goto('/search');
  14 |     expect(response?.status()).toBe(200);
  15 |     await expect(page.getByPlaceholder(/City, neighborhood/i)).toBeVisible();
  16 |   });
  17 | 
  18 |   test('Public AI Hub loads correctly', async ({ page }) => {
  19 |     const response = await page.goto('/ai-hub');
  20 |     expect(response?.status()).toBe(200);
  21 |     await expect(page.getByText(/AI Property Assistant/i).first()).toBeVisible();
  22 |   });
  23 | 
  24 |   test('Static Pages load correctly', async ({ page }) => {
  25 |     await page.goto('/about');
  26 |     await expect(page.getByText(/About RealtyNow/i).first()).toBeVisible();
  27 | 
  28 |     await page.goto('/contact');
  29 |     await expect(page.getByText(/Contact Us/i).first()).toBeVisible();
  30 | 
  31 |     await page.goto('/faq');
  32 |     await expect(page.getByText(/Frequently Asked Questions/i).first()).toBeVisible();
  33 |   });
  34 | 
  35 |   test('Invalid routes correctly show 404 Page', async ({ page }) => {
  36 |     const response = await page.goto('/this-route-does-not-exist');
  37 |     // For SPAs, Vite usually returns 200, but the UI should show 404
  38 |     await expect(page.getByText(/Page not found/i).first()).toBeVisible();
  39 |     await expect(page.getByRole('link', { name: /Go Back Home/i })).toBeVisible();
  40 |   });
  41 | 
  42 |   test('Protected routes redirect unauthorized users to login', async ({ page }) => {
  43 |     await page.goto('/portal/dashboard');
  44 |     // Should be redirected or show unauthorized
> 45 |     await expect(page).toHaveURL(/.*login.*/);
     |                        ^ Error: expect(page).toHaveURL(expected) failed
  46 |   });
  47 | });
  48 | 
```