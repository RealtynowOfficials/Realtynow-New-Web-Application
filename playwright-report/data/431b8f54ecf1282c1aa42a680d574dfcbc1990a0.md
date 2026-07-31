# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: auth.spec.ts >> Phase 4 - Authentication & Forms >> Empty form submission shows validation errors
- Location: e2e\auth.spec.ts:19:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText(/String must contain at least/i).first()
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByText(/String must contain at least/i).first()

```

```yaml
- link "RealtyNow":
  - /url: /
  - img "RealtyNow"
- heading "Welcome back to RealtyNow" [level=2]
- paragraph: Sign in to manage your properties, enquiries, and saved listings.
- list:
  - listitem:
    - img
    - text: AI-powered property recommendations
  - listitem:
    - img
    - text: Verified listings & trusted agents
  - listitem:
    - img
    - text: Real-time notifications
- paragraph: © 2026 RealtyNow. All rights reserved.
- heading "Sign in" [level=1]
- paragraph: Enter your credentials to access your account.
- text: Email
- textbox "you@email.com"
- paragraph: Enter a valid email
- img
- text: Password
- textbox "••••••••"
- paragraph: Min 6 characters
- img
- button:
  - img
- button "Sign in":
  - text: Sign in
  - img
- paragraph:
  - text: Don't have an account?
  - link "Sign up":
    - /url: /signup
- link "Forgot password?":
  - /url: /forgot-password
- text: ·
- link "Agent login":
  - /url: /agent/login
- text: ·
- link "Admin login":
  - /url: /admin/login
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
  3  | test.describe('Phase 4 - Authentication & Forms', () => {
  4  |   test('Login Page renders all inputs', async ({ page }) => {
  5  |     await page.goto('/login');
  6  |     await expect(page.getByPlaceholder(/Email/i)).toBeVisible();
  7  |     await expect(page.getByPlaceholder(/Password/i)).toBeVisible();
  8  |     await expect(page.getByRole('button', { name: /Sign in/i })).toBeVisible();
  9  |   });
  10 | 
  11 |   test('Signup Page renders all inputs', async ({ page }) => {
  12 |     await page.goto('/register');
  13 |     await expect(page.getByPlaceholder(/First Name/i)).toBeVisible();
  14 |     await expect(page.getByPlaceholder(/Email/i)).toBeVisible();
  15 |     await expect(page.getByPlaceholder(/Password/i)).toBeVisible();
  16 |     await expect(page.getByRole('button', { name: /Create Account/i })).toBeVisible();
  17 |   });
  18 | 
  19 |   test('Empty form submission shows validation errors', async ({ page }) => {
  20 |     await page.goto('/login');
  21 |     await page.getByRole('button', { name: /Sign in/i }).click();
  22 |     
  23 |     // Zod validation should kick in
> 24 |     await expect(page.getByText(/String must contain at least/i).first()).toBeVisible();
     |                                                                           ^ Error: expect(locator).toBeVisible() failed
  25 |   });
  26 | });
  27 | 
```