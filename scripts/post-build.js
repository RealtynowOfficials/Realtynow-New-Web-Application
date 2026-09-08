import fs from 'fs';
import path from 'path';

// 1. Ensure dist/.htaccess exists with latest cache headers
if (fs.existsSync('public/.htaccess')) {
  fs.copyFileSync('public/.htaccess', 'dist/.htaccess');
  console.log('[Post-Build] Synced public/.htaccess to dist/.htaccess');
}

// 2. Ensure dist/vercel.json exists with latest headers
if (fs.existsSync('public/vercel.json')) {
  fs.copyFileSync('public/vercel.json', 'dist/vercel.json');
  console.log('[Post-Build] Synced public/vercel.json to dist/vercel.json');
}

// 3. Stamp dist/sw.js with a unique build timestamp for instant cache invalidation
const distSwPath = path.resolve('dist/sw.js');
if (fs.existsSync(distSwPath)) {
  let swContent = fs.readFileSync(distSwPath, 'utf8');
  const buildId = Date.now().toString();
  swContent = swContent.replace('__SW_BUILD_VERSION__', buildId);
  fs.writeFileSync(distSwPath, swContent, 'utf8');
  console.log(`[Post-Build] Stamped dist/sw.js with cache version: realtynow-pwa-${buildId}`);
}
