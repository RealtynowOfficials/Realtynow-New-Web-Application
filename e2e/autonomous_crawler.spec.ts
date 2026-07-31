import { test, expect } from '@playwright/test';

// Configuration
const BASE_URL = 'http://localhost:5174';
const VISITED = new Set<string>();
const QUEUE = new Set<string>([BASE_URL]);
const MAX_URLS = 50;

const ERRORS: { url: string; error: string; type: string }[] = [];

test.describe('Autonomous Application Crawler & QA', () => {
  // Give this test a long timeout since it's crawling the app
  test.setTimeout(120000); 

  test('Crawl application and catch exceptions', async ({ page }) => {
    // 1. Setup Event Listeners
    page.on('pageerror', (err) => {
      ERRORS.push({ url: page.url(), error: err.message, type: 'PageError' });
      console.error(`[PAGE_ERROR] at ${page.url()}: ${err.message}`);
    });

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        ERRORS.push({ url: page.url(), error: msg.text(), type: 'ConsoleError' });
        console.error(`[CONSOLE_ERROR] at ${page.url()}: ${msg.text()}`);
      }
    });

    page.on('response', (res) => {
      if (res.status() >= 400 && res.url().startsWith(BASE_URL)) {
        ERRORS.push({ url: page.url(), error: `${res.status()} ${res.statusText()} - ${res.url()}`, type: 'NetworkError' });
        console.error(`[NETWORK_ERROR] ${res.status()} at ${res.url()}`);
      }
    });

    // 2. BFS Crawler Loop
    while (QUEUE.size > 0 && VISITED.size < MAX_URLS) {
      // Dequeue next URL
      const currentUrl = Array.from(QUEUE)[0];
      QUEUE.delete(currentUrl);

      if (VISITED.has(currentUrl)) continue;
      VISITED.add(currentUrl);

      console.log(`[CRAWLING] Visiting: ${currentUrl}`);

      try {
        const response = await page.goto(currentUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
        
        if (response && response.status() >= 400) {
           console.error(`[404/500] Failed to load ${currentUrl}`);
           continue; // Move on
        }

        // Wait a tiny bit for React hydration
        await page.waitForTimeout(1000);

        // Optional: Take a screenshot of every route visited
        const routePath = new URL(currentUrl).pathname.replace(/\//g, '_') || 'home';
        await page.screenshot({ path: `test-results/crawl_${routePath}.png`, fullPage: true });

        // Extract Links
        const links = await page.locator('a[href]').evaluateAll((elements) => {
          return elements.map(el => (el as HTMLAnchorElement).href);
        });

        // Add valid internal links to queue
        for (const link of links) {
          try {
            const urlObj = new URL(link);
            if (urlObj.origin === BASE_URL && !VISITED.has(urlObj.href) && !urlObj.href.includes('#')) {
              QUEUE.add(urlObj.href);
            }
          } catch {
            // Ignore invalid URLs
          }
        }

      } catch (err: any) {
         console.error(`[TIMEOUT/FAIL] on ${currentUrl}:`, err.message);
      }
    }

    console.log(`\n\n--- CRAWL COMPLETE ---`);
    console.log(`Visited ${VISITED.size} pages.`);
    console.log(`Found ${ERRORS.length} runtime/network errors.`);
    
    // Output error summary
    if (ERRORS.length > 0) {
      console.error(JSON.stringify(ERRORS, null, 2));
    }

    // Fail the test if we caught ANY errors during the crawl
    expect(ERRORS.length).toBe(0);
  });
});
