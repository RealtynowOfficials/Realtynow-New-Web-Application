import { chromium } from '@playwright/test';

const browser = await chromium.launch();

// 1. Deep-route refresh check (dev server SPA fallback)
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto('http://localhost:5175/search', { waitUntil: 'networkidle' });
await page.reload({ waitUntil: 'networkidle' });
console.log('Deep-route refresh (/search) — url after reload:', page.url());
console.log('errors:', errors.length ? errors.slice(0, 5) : 'none');
await page.close();

// 2. Mobile emulation
const iphone = await browser.newPage({ viewport: { width: 390, height: 844 }, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' });
const mErrors = [];
iphone.on('pageerror', (e) => mErrors.push(e.message));
iphone.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('fetchPriority') && !/logo\.clearbit|unsplash|wikimedia|__cf_bm/.test(m.text())) mErrors.push(m.text()); });
await iphone.goto('http://localhost:5175/', { waitUntil: 'networkidle' });
console.log('\nMobile emulation console errors (excluding known sandbox/network noise):', mErrors.length ? mErrors : 'none');

await browser.close();
