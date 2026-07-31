import fs from 'fs';

const filePath = 'e:/Realtynow_new/src/pages/public/home.tsx';
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(
  'const activeAd = bannerItems[currentIndex % bannerItems.length] || defaultBanners[0];',
  'const activeAd = (bannerItems[currentIndex % bannerItems.length] || defaultBanners[0]) as any;'
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Fixed activeAd type.');
