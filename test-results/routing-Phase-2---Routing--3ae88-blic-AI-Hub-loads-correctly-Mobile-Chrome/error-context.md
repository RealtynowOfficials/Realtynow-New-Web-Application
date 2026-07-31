# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: routing.spec.ts >> Phase 2 - Routing & Navigation >> Public AI Hub loads correctly
- Location: e2e\routing.spec.ts:18:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText(/AI Property Assistant/i).first()
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByText(/AI Property Assistant/i).first()

```

```yaml
- banner:
  - link "RealtyNow":
    - /url: /
    - img "RealtyNow"
  - button "Search":
    - img
  - button "Account & User Options":
    - img
  - button:
    - img
- main:
  - img
  - text: Phase 1 — AI Foundation Suite
  - heading "RealtyNow AI Property Advisor" [level=1]
  - paragraph: Powered by OpenRouter AI (GPT-4o Mini). Search using voice, generate property copy, summarize customer leads, and analyze locality price trends in real-time.
  - img
  - text: Active & Connected to OpenRouter AI Engine
  - button "AI Assistant":
    - img
    - text: AI Assistant
  - button "Smart Search":
    - img
    - text: Smart Search
  - button "Recommendations":
    - img
    - text: Recommendations
  - button "Copy Generator":
    - img
    - text: Copy Generator
  - button "Lead Summary":
    - img
    - text: Lead Summary
  - button "AI Translation":
    - img
    - text: AI Translation
  - button "Market Insights":
    - img
    - text: Market Insights
  - heading "Interactive AI Real Estate Assistant" [level=3]:
    - img
    - text: Interactive AI Real Estate Assistant
  - text: Ask in English or Voice Hello! I am your RealtyNow AI Property Advisor. Ask me anything about property prices, buying vs renting in India, home loans, or top localities!
  - textbox "Ask about properties in Mumbai, buying guide, home loans..."
  - button "Voice Search":
    - img
  - button "Send" [disabled]:
    - text: Send
    - img
- contentinfo:
  - link "RealtyNow":
    - /url: /
    - img "RealtyNow"
  - paragraph: India's AI-powered real estate marketplace. Find, compare, and buy properties with intelligent recommendations, price predictions, and verified listings.
  - paragraph:
    - img
    - text: "#19, Road No. 2B, Chandrapuri Colony, LB Nagar, Hyderabad 500081, Telangana"
  - paragraph:
    - img
    - link "+91 94942 30774":
      - /url: tel:+919494230774
  - paragraph:
    - img
    - link "info@realtynow.in":
      - /url: mailto:info@realtynow.in
  - link:
    - /url: "#"
    - img
  - link:
    - /url: "#"
    - img
  - link:
    - /url: "#"
    - img
  - link:
    - /url: "#"
    - img
  - link:
    - /url: "#"
    - img
  - paragraph: Popular Searches
  - list:
    - listitem:
      - link "Flats for Sale":
        - /url: /search?purpose=Sale
    - listitem:
      - link "Flats for Rent":
        - /url: /search?purpose=Rent
    - listitem:
      - link "Luxury Villas":
        - /url: /search?type=Villa
    - listitem:
      - link "Commercial Properties":
        - /url: /commercial
    - listitem:
      - link "Plots & Land":
        - /url: /search?type=Plots
  - paragraph: Top Cities
  - list:
    - listitem:
      - link "Properties in Hyderabad":
        - /url: /search?q=Hyderabad
    - listitem:
      - link "Properties in Mumbai":
        - /url: /search?q=Mumbai
    - listitem:
      - link "Properties in Bengaluru":
        - /url: /search?q=Bengaluru
    - listitem:
      - link "Properties in Pune":
        - /url: /search?q=Pune
    - listitem:
      - link "Properties in Delhi NCR":
        - /url: /search?q=Delhi
  - paragraph: Company
  - list:
    - listitem:
      - link "About Us":
        - /url: /about
    - listitem:
      - link "Blogs":
        - /url: /blogs
    - listitem:
      - link "Contact Us":
        - /url: /contact
    - listitem:
      - link "Terms of Service":
        - /url: /terms
    - listitem:
      - link "Privacy Policy":
        - /url: /privacy
  - paragraph: © 2026 RealtyNow Technologies Pvt. Ltd. All rights reserved.
  - paragraph: Made with ❤️ for Indian Real Estate
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
> 21 |     await expect(page.getByText(/AI Property Assistant/i).first()).toBeVisible();
     |                                                                    ^ Error: expect(locator).toBeVisible() failed
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
  45 |     await expect(page).toHaveURL(/.*login.*/);
  46 |   });
  47 | });
  48 | 
```