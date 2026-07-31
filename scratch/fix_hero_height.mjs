import fs from 'fs';

const filePath = 'e:/Realtynow_new/src/pages/public/home.tsx';
let code = fs.readFileSync(filePath, 'utf8');

// 1. Fix Hero section height
const sectionToReplace = `<section className="relative overflow-hidden w-full min-h-[760px] h-[100vh] bg-[#071526]">`;
const newSection = `<section className="relative overflow-hidden w-full min-h-[550px] h-[calc(100vh-72px)] max-h-[850px] bg-[#071526]">`;
code = code.replace(sectionToReplace, newSection);

// 2. Fix image object position and ensure we can see her pants
const imgToReplace = `<img
          src="/hero_luxury_bg.png"
          alt="Luxury Real Estate"
          className="h-full w-full object-cover object-[75%_15%]"
        />`;
const newImg = `<img
          src="/hero_luxury_bg.png"
          alt="Luxury Real Estate"
          className="h-full w-full object-cover object-[80%_bottom]"
        />`;
code = code.replace(imgToReplace, newImg);

// 3. Let's also adjust the padding of the left content container to center it better in the new shorter height
const containerToReplace = `<div className="container-wide relative z-20 h-full flex flex-col justify-center pt-24 pb-12 lg:pt-32">`;
const newContainer = `<div className="container-wide relative z-20 h-full flex flex-col justify-center py-10 lg:py-16">`;
code = code.replace(containerToReplace, newContainer);

// 4. Decrease size of main heading slightly to fit better
const headingToReplace = `className="font-display text-5xl sm:text-6xl lg:text-[72px] font-extrabold tracking-tight text-white leading-[1.05]"`;
const newHeading = `className="font-display text-4xl sm:text-5xl lg:text-[64px] font-extrabold tracking-tight text-white leading-[1.05]"`;
code = code.replace(headingToReplace, newHeading);

fs.writeFileSync(filePath, code, 'utf8');
console.log('Successfully decreased hero height and adjusted image position.');
