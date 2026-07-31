import fs from 'fs';
const file = 'e:/Realtynow_new/src/pages/public/property-detail.tsx';
let content = fs.readFileSync(file, 'utf8');

let lines = content.split('\n');

// The file is correct up to the Lightbox section ending which is line 944 roughly.
// So let's take lines 0 to 944 (inclusive).
let prefix = lines.slice(0, 944).join('\n');

let modalsMatch = content.match(/\{\/\* Contact modal \*\/\}[\s\S]*/);
let suffix = modalsMatch ? modalsMatch[0] : '';

let middle = `

      {/* Similar properties */}
      {similar && similar.length > 0 && (
        <section className="mt-16">
          <h2 className="font-display text-2xl font-bold text-navy-900">
            {t('property.similarProperties', 'Similar Properties')}
          </h2>
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {similar.map((p) => (
              <PropertyCard key={p.id} property={p as unknown as Parameters<typeof PropertyCard>[0]['property']} />
            ))}
          </div>
        </section>
      )}

      {/* Recently viewed */}
      {recentViews && recentViews.length > 0 && (
        <section className="mt-16">
          <h2 className="font-display text-2xl font-bold text-navy-900">
            {t('property.recentlyViewed', 'Recently Viewed')}
          </h2>
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {recentViews.map((p) => (
              <PropertyCard key={p.id} property={p as unknown as Parameters<typeof PropertyCard>[0]['property']} />
            ))}
          </div>
        </section>
      )}

      `;

let finalContent = prefix + '\n' + middle + suffix;
fs.writeFileSync(file, finalContent);
console.log("Success");
