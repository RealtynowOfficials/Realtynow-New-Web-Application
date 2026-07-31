import fs from 'fs';

const filePath = 'e:/Realtynow_new/src/pages/public/home.tsx';
let content = fs.readFileSync(filePath, 'utf8');

const homePageCode = `
/* ============================================================
   Main HomePage
============================================================ */
export function HomePage() {
  return (
    <div>
      <HeroSection />
      <CategoriesSection />
      <AIAdBannerSection />
      <PostPropertyBanner />
      <FeaturedProperties />
      <LuxuryAdBannersSection />
      <ThreeColumnAdBannersSection />
      <TopAgents />
      <AIFeaturesSection />
      <SignatureCollection />
      <TopCities />
      <TopBuilders />
      <EMIAndTestimonialsSection />
      <ServicesSection />
      <InteriorAndHomeServicesSection />
      <LatestBlogs />
      <AppCTA />
      <PartnersSection />
      <FinalCTA />
    </div>
  );
}
`;

if (!content.includes('export function HomePage')) {
  content += homePageCode;
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Appended HomePage');
} else {
  console.log('HomePage already exists');
}
