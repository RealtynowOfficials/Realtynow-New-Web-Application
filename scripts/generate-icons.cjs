#!/usr/bin/env node
/**
 * Generate all PWA icons from favicon.svg using sharp
 * Run: node scripts/generate-icons.cjs
 */
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, '..', 'public');

// Read the SVG
const svgRaw = fs.readFileSync(path.join(publicDir, 'favicon.svg'), 'utf8');

// Make SVG render at high resolution
const svgHighRes = svgRaw.replace('viewBox="0 0 100 100"', 'viewBox="0 0 100 100" width="1024" height="1024"');

// Maskable icon: full-bleed red with logo in safe zone
// Safe zone = inner 80% (10% padding each side) → logo lives in 20–80 range
// Three triangles (upward pointing) with clear gaps, centered at x=50
// Top triangle: apex at (50,20), base from (33,47) to (67,47)
// Bottom-left: apex at (30,50), base from (13,77) to (47,77)
// Bottom-right: apex at (70,50), base from (53,77) to (87,77)
const maskableSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="1024" height="1024">
  <rect width="100" height="100" fill="#b61f24" />
  <!-- Top center triangle (larger) -->
  <polygon points="50,20 67,47 33,47" fill="#ffffff" />
  <!-- Bottom-left triangle -->
  <polygon points="30,51 47,78 13,78" fill="#ffffff" />
  <!-- Bottom-right triangle -->
  <polygon points="70,51 87,78 53,78" fill="#ffffff" />
</svg>`;

// Icon sizes to generate
const icons = [
  { name: 'favicon.png', size: 32 },
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'pwa-192x192.png', size: 192 },
  { name: 'pwa-512x512.png', size: 512 },
];

async function main() {
  const svgBuffer = Buffer.from(svgHighRes);

  for (const icon of icons) {
    const outputPath = path.join(publicDir, icon.name);
    await sharp(svgBuffer)
      .resize(icon.size, icon.size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(outputPath);
    const stat = fs.statSync(outputPath);
    console.log(`✓ ${icon.name} (${icon.size}x${icon.size}) — ${stat.size} bytes`);
  }

  // Generate maskable icon
  const maskableBuffer = Buffer.from(maskableSvg);
  await sharp(maskableBuffer).resize(512, 512).png().toFile(path.join(publicDir, 'maskable-icon-512x512.png'));
  const mstat = fs.statSync(path.join(publicDir, 'maskable-icon-512x512.png'));
  console.log(`✓ maskable-icon-512x512.png (512x512) — ${mstat.size} bytes`);

  console.log('\n✅ All PWA icons generated with brand color #b61f24!');
}

main().catch(console.error);
