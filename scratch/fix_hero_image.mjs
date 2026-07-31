import fs from 'fs';

const filePath = 'e:/Realtynow_new/src/pages/public/home.tsx';
let code = fs.readFileSync(filePath, 'utf8');

const imgToReplace = `<motion.img
          initial={{ scale: 1.05 }}
          animate={{ scale: 1 }}
          transition={{ duration: 15, ease: 'easeOut' }}
          src="/hero_luxury_bg.png"
          alt="Luxury Real Estate"
          className="h-full w-full object-cover object-center"
        />`;

const newImg = `<img
          src="/hero_luxury_bg.png"
          alt="Luxury Real Estate"
          className="h-full w-full object-cover object-[75%_15%]"
        />`;

if (code.includes(imgToReplace)) {
  code = code.replace(imgToReplace, newImg);
  fs.writeFileSync(filePath, code, 'utf8');
  console.log('Successfully updated hero image visibility.');
} else {
  console.log('Could not find the exact img block to replace.');
}
