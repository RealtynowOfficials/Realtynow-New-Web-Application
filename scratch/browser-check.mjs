import { chromium, firefox, webkit } from '@playwright/test';

const URL = 'http://localhost:5175/';
const engines = { chromium, firefox, webkit };

for (const [name, engine] of Object.entries(engines)) {
  const browser = await engine.launch();
  const page = await browser.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  const failedRequests = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => pageErrors.push(err.message));
  page.on('requestfailed', (req) => {
    failedRequests.push(`${req.url()} :: ${req.failure()?.errorText}`);
  });
  page.on('response', (res) => {
    if (res.status() >= 400) failedRequests.push(`${res.status()} ${res.url()}`);
  });

  try {
    await page.goto(URL, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1500);
  } catch (e) {
    pageErrors.push(`goto failed: ${e.message}`);
  }

  console.log(`\n=== ${name} ===`);
  console.log('console errors:', consoleErrors.length ? consoleErrors : 'none');
  console.log('page errors:', pageErrors.length ? pageErrors : 'none');
  console.log('failed requests:', failedRequests.length ? failedRequests : 'none');

  await browser.close();
}
