import re

with open('e:/Realtynow_new/src/pages/public/static.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

replacement = """const DETAILED_BLOGS = [
  {
    id: '1',
    slug: 'future-of-real-estate-ai',
    title: 'The Future of Real Estate: How AI is Transforming Property Search',
    excerpt: 'Artificial intelligence is reshaping the way we find, buy, and sell properties. Discover the next generation of real estate technology.',
    cover_image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80',
    tags: ['Technology', 'AI', 'Trends'],
    author_name: 'Sarah Jenkins',
    published_at: '2026-07-25T10:00:00Z',
    content: `
      <div class="space-y-6">
        <p class="text-lg leading-relaxed text-navy-700">The real estate industry has always been a cornerstone of the global economy, but it has traditionally been slow to adopt new technologies. However, with the advent of advanced Artificial Intelligence (AI), the landscape is shifting dramatically.</p>
        
        <h2 class="text-2xl font-bold text-navy-900 mt-8 mb-4">1. Smart Property Matching</h2>
        <p class="leading-relaxed text-navy-700">Gone are the days of endlessly scrolling through irrelevant listings. AI algorithms now analyze your past behavior, preferences, and even life events to curate a personalized list of properties. This means buyers can find their dream homes faster, and sellers can connect with genuinely interested buyers.</p>
        <img src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80" alt="Smart Property Matching" class="rounded-xl w-full h-auto my-6 shadow-md" />

        <h2 class="text-2xl font-bold text-navy-900 mt-8 mb-4">2. Predictive Pricing Models</h2>
        <p class="leading-relaxed text-navy-700">Understanding the fair market value of a property is crucial. AI models utilize hundreds of data points, including neighborhood trends, historical prices, and economic indicators to predict property values with unprecedented accuracy. This helps investors make data-driven decisions.</p>

        <h2 class="text-2xl font-bold text-navy-900 mt-8 mb-4">3. Virtual Reality and AI Tours</h2>
        <p class="leading-relaxed text-navy-700">When AI is combined with machine learning algorithms that enhance image resolution and map 3D spaces, VR gives buyers an unprecedented feel for a home without leaving their living room. AI can even stage empty rooms dynamically based on the buyer's style preferences.</p>

        <blockquote class="border-l-4 border-primary-500 pl-4 italic text-navy-600 bg-primary-50 p-4 rounded-r-lg my-6">
          "The real estate agent of the future is an AI-empowered advisor, spending less time on paperwork and more time on human connection."
        </blockquote>

        <h2 class="text-2xl font-bold text-navy-900 mt-8 mb-4">Conclusion</h2>
        <p class="leading-relaxed text-navy-700">The integration of AI in real estate is not just a passing trend; it's a fundamental shift. As these technologies mature, we can expect a more transparent, efficient, and user-centric real estate market.</p>
      </div>
    `
  },
  {
    id: '2',
    slug: 'top-10-investment-hotspots-2026',
    title: 'Top 10 Emerging Real Estate Investment Hotspots for 2026',
    excerpt: 'Looking to maximize your ROI? We analyze the data to bring you the top 10 most promising neighborhoods and cities for property investment this year.',
    cover_image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80',
    tags: ['Investment', 'Market Analysis', 'Growth'],
    author_name: 'David Chen',
    published_at: '2026-07-20T14:30:00Z',
    content: `
      <div class="space-y-6">
        <p class="text-lg leading-relaxed text-navy-700">Finding the right location is the golden rule of real estate investment. As urban landscapes evolve and remote work continues to influence migration patterns, new hotspots are emerging across the country.</p>
        
        <h2 class="text-2xl font-bold text-navy-900 mt-8 mb-4">The Shift to Sub-Urban Tech Hubs</h2>
        <p class="leading-relaxed text-navy-700">With major tech companies establishing satellite offices outside traditional metropolitan areas, we are seeing a massive surge in property values in what used to be considered "tier-2" cities. These areas offer a lower cost of living while maintaining high salaries, driving up housing demand.</p>
        
        <ul class="list-disc pl-6 space-y-3 text-navy-700">
          <li><strong class="text-navy-900">Infrastructure Development:</strong> Areas with newly announced metro lines or highway expansions are seeing a 15-20% higher appreciation rate.</li>
          <li><strong class="text-navy-900">Green Spaces:</strong> Post-2020, properties adjacent to large parks or nature reserves command a significant premium.</li>
          <li><strong class="text-navy-900">Commercial Proximity:</strong> Mixed-use developments where people can live, work, and play within a 15-minute radius are highly sought after.</li>
        </ul>

        <h2 class="text-2xl font-bold text-navy-900 mt-8 mb-4">Top Picks for 2026</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 my-6">
          <div class="bg-navy-50 p-4 rounded-xl border border-navy-100">
            <h3 class="font-bold text-navy-900 text-lg">1. West Corridor, Tech City</h3>
            <p class="text-sm text-navy-600 mt-2">Expected ROI: 12-15% annually. Driven by the new international airport expansion.</p>
          </div>
          <div class="bg-navy-50 p-4 rounded-xl border border-navy-100">
            <h3 class="font-bold text-navy-900 text-lg">2. North Hills Lake District</h3>
            <p class="text-sm text-navy-600 mt-2">Expected ROI: 10-14% annually. High demand for luxury waterfront villas.</p>
          </div>
        </div>

        <p class="leading-relaxed text-navy-700">Investors should focus on areas with strong local governance and proactive urban planning. Remember, while historical data is helpful, understanding future infrastructure plans is the key to unlocking massive returns.</p>
      </div>
    `
  },
  {
    id: '3',
    slug: 'sustainable-homes-eco-friendly-living',
    title: 'The Rise of Sustainable Homes: Why Eco-Friendly Living is the New Luxury',
    excerpt: 'From solar panels to smart climate control, discover why modern buyers are willing to pay a premium for green, sustainable properties.',
    cover_image: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80',
    tags: ['Architecture', 'Sustainability', 'Luxury'],
    author_name: 'Elena Rodriguez',
    published_at: '2026-07-15T09:15:00Z',
    content: `
      <div class="space-y-6">
        <p class="text-lg leading-relaxed text-navy-700">Luxury in real estate used to mean marble floors and sprawling square footage. Today, it means zero-carbon footprints, energy independence, and harmony with nature. Sustainable homes are no longer a niche market; they are the new standard of premium living.</p>
        
        <h2 class="text-2xl font-bold text-navy-900 mt-8 mb-4">What Makes a Home "Sustainable"?</h2>
        <p class="leading-relaxed text-navy-700">A truly eco-friendly home goes beyond just having a recycling bin. It encompasses the entire lifecycle of the building, from the materials used during construction to the energy consumed during its lifespan.</p>
        
        <div class="my-8 rounded-2xl overflow-hidden shadow-lg border border-navy-100">
          <img src="https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80" alt="Sustainable modern home" class="w-full h-64 object-cover" />
          <div class="bg-white p-6">
            <h3 class="font-bold text-navy-900 text-xl mb-2">Key Features of Green Homes</h3>
            <ul class="space-y-2 text-navy-700">
              <li class="flex items-center gap-2"><span class="w-2 h-2 rounded-full bg-green-500"></span> Passive solar design for natural heating and cooling</li>
              <li class="flex items-center gap-2"><span class="w-2 h-2 rounded-full bg-green-500"></span> Rainwater harvesting and greywater recycling systems</li>
              <li class="flex items-center gap-2"><span class="w-2 h-2 rounded-full bg-green-500"></span> Smart energy grids with battery storage</li>
              <li class="flex items-center gap-2"><span class="w-2 h-2 rounded-full bg-green-500"></span> Use of reclaimed or highly renewable materials like bamboo</li>
            </ul>
          </div>
        </div>

        <h2 class="text-2xl font-bold text-navy-900 mt-8 mb-4">The Financial Benefits</h2>
        <p class="leading-relaxed text-navy-700">While sustainable homes often have a higher upfront cost, the long-term savings are substantial. Homeowners see drastically reduced utility bills, and in many regions, they benefit from significant tax incentives. Furthermore, data shows that green homes sell 20% faster and at a 5-10% premium compared to conventional homes.</p>

        <p class="leading-relaxed text-navy-700">Investing in sustainability is not just about saving the planet; it's a sound financial decision that future-proofs your property against rising energy costs and changing environmental regulations.</p>
      </div>
    `
  }
];

export function BlogListPage() {
  const { t } = useLanguageContext();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const pageSize = 9;

  const data = DETAILED_BLOGS.filter(b => {
    if (search && !b.title.toLowerCase().includes(search.toLowerCase()) && !b.tags.join(' ').toLowerCase().includes(search.toLowerCase())) return false;
    if (category && !b.tags.includes(category)) return false;
    return true;
  });

  const allTags = Array.from(new Set(DETAILED_BLOGS.flatMap(b => b.tags)));

  const totalPages = Math.ceil(data.length / pageSize);
  const paginatedData = data.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="container-page py-12">
      <h1 className="font-display text-4xl font-bold text-navy-900">{t('common.blog', 'RealtyNow Blog')}</h1>
      <p className="mt-3 text-lg text-navy-600 max-w-2xl">{t('blog.subtitle', 'Insights, trends, and guides on real estate. Stay informed with our latest updates and expert analysis.')}</p>
      
      <div className="mt-8 flex flex-wrap items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border border-navy-100">
        <div className="relative flex-1 min-w-[250px]">
          <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-navy-400" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder={t('blog.searchPlaceholder', 'Search articles, topics, keywords...')}
            className="w-full bg-slate-50 border-none rounded-xl py-3 pl-12 pr-4 text-sm focus:ring-2 focus:ring-primary-500 transition-all outline-none"
          />
        </div>
        {allTags && allTags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setCategory('')}
              className={cn(
                'rounded-xl px-4 py-2 text-sm font-semibold transition-all',
                !category ? 'bg-navy-900 text-white shadow-md' : 'bg-slate-50 text-navy-600 hover:bg-slate-100',
              )}
            >
              {t('blog.allCategories', 'All Topics')}
            </button>
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => setCategory(tag === category ? '' : tag)}
                className={cn(
                  'rounded-xl px-4 py-2 text-sm font-semibold transition-all',
                  category === tag ? 'bg-primary-600 text-white shadow-md shadow-primary-500/20' : 'bg-slate-50 text-navy-600 hover:bg-slate-100',
                )}
              >
                {tag}
              </button>
            ))}
          </div>
        )}
      </div>

      {paginatedData.length > 0 ? (
        <>
          <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {paginatedData.map((b) => (
              <Card key={b.id} className="group overflow-hidden p-0 border-none shadow-sm hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 bg-white rounded-3xl">
                <Link to={`/blog/${b.slug ?? b.id}`}>
                  <div className="aspect-[4/3] overflow-hidden bg-navy-100 relative">
                    <img
                      src={b.cover_image ?? 'https://images.pexels.com/photos/323780/pexels-photo-323780.jpeg'}
                      alt={b.title}
                      className="h-full w-full object-cover transition duration-700 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-navy-900/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  </div>
                  <div className="p-6">
                    {b.tags && b.tags.length > 0 && (
                      <span className="inline-block px-3 py-1 bg-primary-50 text-primary-600 text-[10px] font-bold uppercase tracking-wider rounded-full mb-3">
                        {b.tags[0]}
                      </span>
                    )}
                    <h2 className="font-display text-xl font-bold text-navy-900 group-hover:text-primary-600 transition-colors leading-tight">
                      {b.title}
                    </h2>
                    <p className="mt-3 text-sm text-navy-500 line-clamp-2 leading-relaxed">{b.excerpt}</p>
                    <div className="mt-6 pt-6 border-t border-navy-50 flex items-center justify-between text-xs font-medium text-navy-400">
                      <span className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-lg">
                        <Calendar className="h-3.5 w-3.5" />{' '}
                        {new Date(b.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                      <span className="flex items-center gap-1.5 text-navy-600">
                        <div className="w-5 h-5 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-[10px]">
                          {b.author_name.charAt(0)}
                        </div>
                        {b.author_name}
                      </span>
                    </div>
                  </div>
                </Link>
              </Card>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="mt-16 flex justify-center gap-2">
              <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-xl">
                {t('common.prev', 'Prev')}
              </Button>
              {Array.from({ length: totalPages }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setPage(i + 1)}
                  className={cn(
                    'h-10 w-10 rounded-xl text-sm font-bold transition-all',
                    page === i + 1 ? 'bg-navy-900 text-white shadow-md' : 'text-navy-600 hover:bg-slate-100',
                  )}
                >
                  {i + 1}
                </button>
              ))}
              <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="rounded-xl">
                {t('common.next', 'Next')}
              </Button>
            </div>
          )}
        </>
      ) : (
        <Card className="mt-10 py-24 border-none shadow-sm bg-white rounded-3xl text-center">
          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <SearchIcon className="w-10 h-10 text-slate-400" />
          </div>
          <h3 className="text-2xl font-bold text-navy-900 mb-2">{t('blog.noArticles', 'No articles found')}</h3>
          <p className="text-navy-500 mb-8">{t('blog.noArticlesDesc', 'Try searching for something else or reset your filters.')}</p>
          <Button onClick={() => {setSearch(''); setCategory('');}} variant="secondary" className="rounded-xl">Clear Filters</Button>
        </Card>
      )}
    </div>
  );
}

export function BlogDetailPage() {
  const { t } = useLanguageContext();
  const { slug } = useParams();
  
  const blog = DETAILED_BLOGS.find(b => b.slug === slug || b.id === slug);

  if (!blog)
    return (
      <div className="container-page py-24 min-h-[60vh] flex flex-col items-center justify-center text-center">
        <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-6">
          <SearchIcon className="w-10 h-10 text-red-500" />
        </div>
        <h2 className="text-3xl font-display font-bold text-navy-900 mb-4">{t('blog.notFound', 'Article not found')}</h2>
        <p className="text-navy-600 mb-8">The blog post you're looking for doesn't exist or has been removed.</p>
        <Link to="/blog">
          <Button size="lg" className="rounded-xl">{t('blog.backToBlog', 'Back to Blog')}</Button>
        </Link>
      </div>
    );

  return (
    <article className="bg-slate-50 min-h-screen pb-24">
      {/* Hero Section */}
      <div className="bg-navy-900 text-white pt-24 pb-32 px-4 relative overflow-hidden">
        <div className="absolute inset-0 z-0 opacity-20">
          <img src={blog.cover_image} alt="Background" className="w-full h-full object-cover blur-sm" />
          <div className="absolute inset-0 bg-navy-900/80"></div>
        </div>
        <div className="container-page max-w-4xl relative z-10">
          <Link
            to="/blog"
            className="inline-flex items-center gap-2 text-sm font-bold text-white/70 hover:text-white mb-8 transition-colors bg-white/10 px-4 py-2 rounded-full backdrop-blur-md hover:bg-white/20"
          >
            <ArrowLeft className="h-4 w-4" /> {t('blog.backToArticles', 'Back to all articles')}
          </Link>
          
          <div className="flex flex-wrap items-center gap-3 mb-6">
            {blog.tags && blog.tags.map(tag => (
              <span key={tag} className="inline-block rounded-full bg-red-600 px-4 py-1.5 text-xs font-bold text-white uppercase tracking-wider shadow-sm">
                {tag}
              </span>
            ))}
          </div>
          
          <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-extrabold text-white leading-tight mb-6">
            {blog.title}
          </h1>
          
          <p className="text-xl text-white/80 max-w-3xl leading-relaxed mb-10 font-light">
            {blog.excerpt}
          </p>

          <div className="flex items-center gap-6 text-sm text-white/90">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white text-navy-900 flex items-center justify-center font-bold text-lg shadow-lg">
                {blog.author_name.charAt(0)}
              </div>
              <div className="flex flex-col">
                <span className="font-bold">{blog.author_name}</span>
                <span className="text-white/60 text-xs">Author</span>
              </div>
            </div>
            <div className="h-10 w-px bg-white/20"></div>
            <div className="flex flex-col justify-center">
              <span className="font-bold">{new Date(blog.published_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
              <span className="flex items-center gap-1.5 text-white/60 text-xs mt-0.5">
                <Clock className="h-3 w-3" /> 5 min read
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className="container-page max-w-4xl -mt-16 relative z-20">
        <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-8 md:p-12 lg:p-16">
          <div className="aspect-[21/9] overflow-hidden rounded-2xl bg-slate-100 mb-12 shadow-sm">
            <img src={blog.cover_image} alt={blog.title} className="h-full w-full object-cover" />
          </div>
          
          {/* Detailed Content rendered as HTML */}
          <div 
            className="prose prose-lg prose-slate max-w-none prose-headings:font-display prose-headings:font-bold prose-p:text-navy-700 prose-p:leading-relaxed prose-a:text-primary-600 prose-img:rounded-2xl"
            dangerouslySetInnerHTML={{ __html: blog.content }} 
          />
          
        </div>
      </div>
    </article>
  );
}"""

header_match = re.match(r'(.*?)(?=export function BlogListPage)', content, flags=re.DOTALL)
footer_match = re.search(r'(export function FaqPage.*)', content, flags=re.DOTALL)

if header_match and footer_match:
    new_content = header_match.group(1) + replacement + '\n\n' + footer_match.group(1)
    with open('e:/Realtynow_new/src/pages/public/static.tsx', 'w', encoding='utf-8') as f:
        f.write(new_content)
    print('Updated successfully.')
else:
    print('Could not find boundaries.')
