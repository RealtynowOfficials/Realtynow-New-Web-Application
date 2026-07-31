import fs from 'fs';

const filePath = 'e:/Realtynow_new/src/pages/public/home.tsx';
let code = fs.readFileSync(filePath, 'utf8');

const heroStart = code.indexOf('function HeroSection');
const trustStart = code.indexOf('/* ============================================================', heroStart + 10);

if (heroStart === -1 || trustStart === -1) {
  console.log('Could not find HeroSection or next section boundaries');
  process.exit(1);
}

const replacement = `function HeroSection() {
  const { t } = useLanguageContext();
  const [activeTab, setActiveTab] = useState('Buy');

  const tabs = [
    { name: 'Buy', icon: Home },
    { name: 'Rent', icon: KeyRound },
    { name: 'Commercial', icon: Briefcase },
    { name: 'Plots', icon: MapPin },
    { name: 'Projects', icon: Building2 },
  ];

  const features = [
    { title: 'Verified Properties', subtitle: '100%', icon: ShieldCheck },
    { title: 'AI Property Advisor', subtitle: 'Smart Suggestions', icon: Bot },
    { title: 'Secure & Trusted', subtitle: 'Safe Transactions', icon: BadgeCheck },
    { title: 'Wide Range', subtitle: 'Best Options', icon: Sparkles },
  ];

  return (
    <section className="relative overflow-hidden w-full min-h-[760px] h-[100vh] bg-[#071526]">
      {/* Cinematic Background */}
      <div className="absolute inset-0 z-0">
        <motion.img
          initial={{ scale: 1.05 }}
          animate={{ scale: 1 }}
          transition={{ duration: 15, ease: 'easeOut' }}
          src="/hero_luxury_bg.png"
          alt="Luxury Real Estate"
          className="h-full w-full object-cover object-center"
        />
        {/* Dark Gradient Overlay */}
        <div 
          className="absolute inset-0 z-10" 
          style={{
            background: 'linear-gradient(90deg, rgba(7,15,30,.86) 0%, rgba(7,15,30,.55) 45%, rgba(7,15,30,.15) 75%, transparent 100%)'
          }} 
        />
      </div>

      <div className="container-wide relative z-20 h-full flex flex-col justify-center pt-24 pb-12 lg:pt-32">
        <div className="grid lg:grid-cols-12 gap-8 items-center h-full">
          
          {/* Left Content */}
          <div className="lg:col-span-8 xl:col-span-7 flex flex-col justify-center">
            
            {/* Top Glass Badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 backdrop-blur-md w-fit mb-6"
            >
              <ShieldCheck className="h-4 w-4 text-white" />
              <span className="text-sm font-semibold tracking-wide text-white">
                {t('home.heroBadge', "India's Most Trusted Real Estate Platform")}
              </span>
            </motion.div>

            {/* Main Heading */}
            <motion.h1
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="font-display text-5xl sm:text-6xl lg:text-[72px] font-extrabold tracking-tight text-white leading-[1.05]"
            >
              Find. Buy. Sell. <br />
              Rent Smarter.
            </motion.h1>

            {/* Sub Heading */}
            <motion.p
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="mt-6 text-lg sm:text-xl text-slate-300 font-medium leading-relaxed max-w-[600px]"
            >
              Smart tools, verified listings, and expert support to help you move forward with confidence.
            </motion.p>

            {/* Search Card */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.5 }}
              className="mt-10 rounded-[24px] border border-white/10 bg-[#0F172A]/80 p-4 sm:p-5 shadow-[0_40px_100px_rgba(0,0,0,0.4)] backdrop-blur-2xl max-w-[850px]"
            >
              {/* Tabs */}
              <div className="flex flex-wrap items-center gap-2 mb-4">
                {tabs.map((tab) => {
                  const isActive = activeTab === tab.name;
                  return (
                    <button
                      key={tab.name}
                      onClick={() => setActiveTab(tab.name)}
                      className={\`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold transition-all \${
                        isActive
                          ? 'bg-[#D8232A] text-white shadow-lg shadow-red-500/40'
                          : 'text-slate-300 hover:bg-white/10 hover:text-white'
                      }\`}
                    >
                      <tab.icon className="h-4 w-4" />
                      {tab.name}
                    </button>
                  );
                })}
              </div>

              {/* Search Inputs */}
              <div className="flex flex-col sm:flex-row items-center gap-3 bg-white rounded-xl p-1.5 mb-5">
                <div className="flex-1 flex items-center gap-3 px-4 w-full border-b sm:border-b-0 sm:border-r border-slate-200 pb-3 sm:pb-0 h-12">
                  <Search className="h-5 w-5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by location, property type or project"
                    className="w-full bg-transparent text-sm font-medium text-slate-900 placeholder:text-slate-500 focus:outline-none h-full"
                  />
                </div>
                
                <div className="flex items-center gap-2 px-3 w-full sm:w-auto min-w-[140px] h-12">
                  <MapPin className="h-5 w-5 text-slate-400" />
                  <select className="bg-transparent text-sm font-bold text-slate-800 focus:outline-none w-full appearance-none cursor-pointer h-full">
                    <option>Hyderabad</option>
                    <option>Mumbai</option>
                    <option>Bengaluru</option>
                  </select>
                  <ChevronDown className="h-4 w-4 text-slate-400" />
                </div>

                <Link
                  to={\`/search?purpose=\${activeTab}\`}
                  className="w-full sm:w-auto rounded-lg bg-[#D8232A] px-8 h-12 flex items-center justify-center text-sm font-bold text-white shadow-lg shadow-red-500/30 transition-all hover:bg-red-700 hover:shadow-red-500/50"
                >
                  Search
                </Link>
              </div>

              {/* Bottom Features row inside search card */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 border-t border-white/10 pt-4">
                {features.map((feat) => (
                  <div key={feat.title} className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/5 border border-white/10 text-slate-300">
                      <feat.icon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-[12px] font-bold text-white leading-tight">{feat.title}</p>
                      <p className="text-[10px] font-medium text-slate-400 mt-0.5">{feat.subtitle}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
            
            {/* Social Proof (Bottom Left) */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, delay: 1 }}
              className="mt-8 flex items-center gap-4"
            >
              <div className="flex -space-x-2">
                <img className="inline-block h-10 w-10 rounded-full border-2 border-[#071526] object-cover" src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=64&h=64" alt="" />
                <img className="inline-block h-10 w-10 rounded-full border-2 border-[#071526] object-cover" src="https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=64&h=64" alt="" />
                <img className="inline-block h-10 w-10 rounded-full border-2 border-[#071526] object-cover" src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=64&h=64" alt="" />
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-300 flex items-center gap-1.5">
                  Trusted by <span className="text-white font-bold">2M+ users</span> across India
                </div>
                <div className="flex items-center gap-1 mt-0.5">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star key={i} className="h-3.5 w-3.5 fill-current text-amber-400" />
                  ))}
                </div>
              </div>
            </motion.div>

          </div>

          {/* Right Side Empty space to let background show through (Model is part of BG) */}
          <div className="hidden lg:block lg:col-span-4 xl:col-span-5 h-full relative pointer-events-none">
             {/* Floating Post Property CTA */}
             <motion.div
               initial={{ opacity: 0, y: 50 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ duration: 0.8, delay: 0.8 }}
               className="absolute bottom-10 right-0 w-72 rounded-[24px] bg-gradient-to-b from-[#8B1519] to-[#600A0D] p-5 shadow-2xl border border-red-900/50 pointer-events-auto overflow-hidden group"
             >
               <div className="relative z-10">
                 <div className="flex items-center gap-3 mb-4">
                   <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-md">
                     <Home className="h-5 w-5" />
                   </div>
                   <div>
                     <h3 className="text-base font-bold text-white">Post Property</h3>
                     <p className="text-xs font-bold text-amber-400 tracking-wide uppercase mt-0.5">It's FREE!</p>
                   </div>
                 </div>
                 <p className="text-xs text-red-100/80 font-medium mb-5 leading-relaxed">
                   List your property now and reach millions of verified buyers and tenants.
                 </p>
                 <Link
                   to="/post-property"
                   className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-[#8B1519] transition-all hover:bg-slate-50"
                 >
                   Post Now
                   <ArrowRight className="h-4 w-4" />
                 </Link>
               </div>
             </motion.div>
          </div>

        </div>
      </div>
    </section>
  );
}
`;

const before = code.substring(0, heroStart);
const after = code.substring(trustStart);

fs.writeFileSync(filePath, before + replacement + '\n' + after, 'utf8');
console.log('Successfully replaced HeroSection!');
