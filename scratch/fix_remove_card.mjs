import fs from 'fs';

const filePath = 'e:/Realtynow_new/src/pages/public/home.tsx';
let code = fs.readFileSync(filePath, 'utf8');

// 1. Remove the floating card from HeroSection
const cardStartRegex = /{\/\* Floating Right Side Card \*\/\}/;
const match = code.match(cardStartRegex);
if (match) {
  const startIndex = match.index;
  // Find the end of this motion.div block
  // I will just look for the end of the block manually since it's tricky with regex
  // Let's find `<div className="absolute top-8 right-8` or something similar? No, I will just replace the specific text
  console.log('Found floating card start');
}

// Actually, let's use a simpler replace strategy for the card HTML
const cardHtmlStart = `{/* Floating Right Side Card */}`;
// We can just use string matching for the block since it's static
const blockToReplace = `{/* Floating Right Side Card */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="hidden lg:block absolute bottom-12 right-12 z-20"
        >
          <div className="bg-[#B91C1C] rounded-2xl p-6 shadow-2xl w-[320px] text-white backdrop-blur-xl border border-red-500/20">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <Home className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-lg leading-tight">Post Property</h3>
                <p className="text-red-200 text-xs font-bold uppercase tracking-wider">It's Free!</p>
              </div>
            </div>
            <p className="text-sm text-red-50 mb-5 leading-relaxed">
              List your property now and reach millions of verified buyers and tenants.
            </p>
            <Link
              to="/post-property"
              className="w-full py-3 bg-white text-[#B91C1C] rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-red-50 transition-colors"
            >
              Post Now <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </motion.div>`;

if (code.includes(blockToReplace)) {
  code = code.replace(blockToReplace, '');
  console.log('Removed floating card.');
} else {
  console.log('Floating card block not found exactly as expected.');
}

// 2. Add PostPropertyBanner to HomePage
if (!code.includes('import { PostPropertyBanner }')) {
  // Add import
  code = code.replace(
    /import \{ Link, useNavigate \} from 'react-router-dom';/,
    `import { Link, useNavigate } from 'react-router-dom';\nimport { PostPropertyBanner } from '@/components/post-property-banner';`
  );
}

if (!code.includes('<PostPropertyBanner />')) {
  // Add below CategoriesSection
  code = code.replace(
    /<CategoriesSection \/>/,
    `<CategoriesSection />\n      <PostPropertyBanner />`
  );
  console.log('Added PostPropertyBanner below CategoriesSection.');
}

fs.writeFileSync(filePath, code, 'utf8');
console.log('Update complete.');
