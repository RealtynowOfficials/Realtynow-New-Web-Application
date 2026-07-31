# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: auth.spec.ts >> Phase 4 - Authentication & Forms >> Signup Page renders all inputs
- Location: e2e\auth.spec.ts:11:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByPlaceholder(/First Name/i)
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByPlaceholder(/First Name/i)

```

```yaml
- link "RealtyNow":
  - /url: /
  - img "RealtyNow"
- heading "Create your account" [level=1]
- paragraph: Join RealtyNow as a customer — it's free.
- text: First name
- textbox
- text: Last name
- textbox
- text: Email
- textbox "you@email.com"
- img
- text: Phone
- textbox "+91 90000 00000"
- text: Password
- textbox "••••••••"
- img
- button:
  - img
- button "Create account":
  - text: Create account
  - img
- paragraph:
  - text: Already have an account?
  - link "Sign in":
    - /url: /login
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
> 13 |     await expect(page.getByPlaceholder(/First Name/i)).toBeVisible();
     |                                                        ^ Error: expect(locator).toBeVisible() failed
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
  24 |     await expect(page.getByText(/String must contain at least/i).first()).toBeVisible();
  25 |   });
  26 | });
  27 | 
```