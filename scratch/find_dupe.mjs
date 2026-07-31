import fs from 'fs';
const lines = fs.readFileSync('e:/Realtynow_new/src/pages/public/home.tsx', 'utf8').split('\n');
lines.forEach((line, i) => {
  if (line.includes('function ThreeColumnAdBannersSection')) {
    console.log(`Found at line ${i + 1}`);
  }
});
