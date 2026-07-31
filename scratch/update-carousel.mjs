import fs from 'fs';

const filePath = 'e:/Realtynow_new/src/pages/public/home.tsx';
let content = fs.readFileSync(filePath, 'utf8');

const replacement = `      <div className="container-wide">
        <div className="relative overflow-hidden rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-slate-100 min-h-[220px] sm:min-h-[280px] group bg-white flex">

          {/* Slides */}
          <AnimatePresence initial={false} custom={direction} mode="popLayout">
            <motion.div
              key={activeAd.id || currentIndex}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.65, ease: [0.32, 0.72, 0, 1] }}
              className="absolute inset-0 flex justify-end"
            >
              <div className="relative w-full lg:w-[70%] h-full">
                {/* Gradient overlay to smoothly blend image into the white background on the left */}
                <div className="absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-white via-white/80 to-transparent z-10 pointer-events-none" />
                <motion.img
                  src={activeAd.image_desktop || defaultBanners[0].image_desktop}
                  alt={activeAd.seo_alt_text || activeAd.title}
                  className="absolute inset-0 h-full w-full object-cover object-center"
                  initial={{ scale: 1.05 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 6, ease: 'easeOut' }}
                />
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Content */}
          <div className="relative z-10 flex flex-col justify-center min-h-[220px] sm:min-h-[280px] p-6 sm:p-10 lg:px-14 w-full lg:w-[55%]">
            <motion.div
              key={\`badge-\${currentIndex}\`}
              custom={0}
              variants={textVariants}
              initial="hidden"
              animate="visible"
              className="mb-4"
            >
              <span className="inline-flex items-center gap-1.5 bg-red-500 text-white text-[11px] font-bold px-3 py-1 rounded-md shadow-sm">
                <Star className="h-3.5 w-3.5 fill-current text-yellow-300" />
                Featured
              </span>
            </motion.div>

            {/* Title */}
            <motion.h2
              key={\`title-\${currentIndex}\`}
              custom={1}
              variants={textVariants}
              initial="hidden"
              animate="visible"
              className="font-display text-3xl sm:text-4xl lg:text-5xl font-extrabold text-navy-900 tracking-tight leading-[1.1]"
            >
              {(() => {
                const titleStr = activeAd.title || '';
                const words = titleStr.split(' ');
                if (words.length > 1) {
                  const last = words.pop();
                  return (
                    <>
                      {words.join(' ')} <br className="hidden sm:block" />
                      <span className="text-red-600">{last}</span>
                    </>
                  );
                }
                return titleStr;
              })()}
            </motion.h2>

            {/* Subtitle / Description */}
            {(activeAd.subtitle || activeAd.description) && (
              <motion.p
                key={\`desc-\${currentIndex}\`}
                custom={2}
                variants={textVariants}
                initial="hidden"
                animate="visible"
                className="mt-4 text-sm sm:text-base text-slate-500 font-medium leading-relaxed max-w-sm"
              >
                {activeAd.subtitle || activeAd.description}
              </motion.p>
            )}

            {/* CTA */}
            <motion.div
              key={\`cta-\${currentIndex}\`}
              custom={3}
              variants={textVariants}
              initial="hidden"
              animate="visible"
              className="mt-6"
            >
              {targetLink.startsWith('http') ? (
                <a
                  href={targetLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => handleBannerClick(activeAd)}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#E60000] px-6 py-2.5 text-sm font-semibold text-white transition-all hover:bg-red-700 hover:shadow-lg hover:shadow-red-600/30"
                >
                  {activeAd.cta_text || 'Explore Now'}
                  <ArrowRight className="h-4 w-4" />
                </a>
              ) : (
                <Link
                  to={targetLink}
                  onClick={() => handleBannerClick(activeAd)}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#E60000] px-6 py-2.5 text-sm font-semibold text-white transition-all hover:bg-red-700 hover:shadow-lg hover:shadow-red-600/30"
                >
                  {activeAd.cta_text || 'Explore Now'}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              )}
            </motion.div>
          </div>

          {/* Progress Bar (Hidden in this clean design, or subtle) */}
          {!isPaused && bannerItems.length > 1 && (
            <div className="absolute bottom-0 left-0 right-0 z-20 h-1 bg-slate-100">
              <motion.div
                className="h-full bg-red-500"
                initial={{ width: '0%' }}
                animate={{ width: \`\${progress}%\` }}
                transition={{ ease: 'linear' }}
              />
            </div>
          )}

          {/* Dots Indicator */}
          {bannerItems.length > 1 && (
            <div className="absolute bottom-6 left-1/2 sm:left-[70%] -translate-x-1/2 z-30 flex gap-2">
              {bannerItems.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setDirection(idx > currentIndex ? 1 : -1);
                    setCurrentIndex(idx);
                    setProgress(0);
                  }}
                  className={\`h-2 transition-all rounded-full \${idx === currentIndex ? 'w-6 bg-red-600' : 'w-2 bg-white/70 hover:bg-white border border-slate-200'}\`}
                  aria-label={\`Go to slide \${idx + 1}\`}
                />
              ))}
            </div>
          )}`;

const startIndex = content.indexOf('<div className="container-wide">');
const endIndex = content.indexOf('</section>', startIndex);

if (startIndex !== -1 && endIndex !== -1) {
  const before = content.slice(0, startIndex);
  // We need to keep the </div> of container-wide and </section>
  const endSection = content.slice(content.indexOf('</div>\\n    </section>', startIndex));
  
  const newContent = before + replacement + '\\n    ' + endSection;
  fs.writeFileSync(filePath, newContent);
  console.log('Successfully updated the carousel layout.');
} else {
  console.log('Could not find the bounds to replace.');
}
