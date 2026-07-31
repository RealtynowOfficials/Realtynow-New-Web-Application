import fs from 'fs';

const filePath = 'e:/Realtynow_new/src/pages/public/home.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// If there's a BOM or null bytes from UTF-16, let's fix it by reading correctly.
// Actually, if it's UTF-16 LE, reading it as utf8 will have lots of null bytes.
if (content.includes('\u0000')) {
  console.log('File is UTF-16. Converting to UTF-8.');
  content = fs.readFileSync(filePath, 'utf16le');
}

// 1. Fix slideVariants
content = content.replace(
  'const slideVariants = {',
  'const slideVariants: any = {'
);

// 2. Fix textVariants
content = content.replace(
  'const textVariants = {',
  'const textVariants: any = {'
);

// 3. Fix activeAd.seo_alt_text
content = content.replace(
  'alt={activeAd.seo_alt_text || activeAd.title}',
  'alt={(activeAd as any).seo_alt_text || activeAd.title}'
);

// 4. Fix activeAd.link_url
content = content.replace(
  'activeAd.cta_link || activeAd.link_url || \'/search\'',
  'activeAd.cta_link || (activeAd as any).link_url || \'/search\''
);

// 5. Fix type syntax error if present from previous bad replace
if (content.includes('</section>\n}')) {
  content = content.replace('</section>\n}', '</section>\n  );\n}');
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully fixed encoding and TS errors in home.tsx.');
