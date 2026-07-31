import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Menu,
  X,
  ChevronDown,
  Search,
  Heart,
  LogOut,
  Globe,
  Phone,
  Mail,
  Facebook,
  Instagram,
  Linkedin,
  Youtube,
  LayoutDashboard,
  MapPin,
  User,
  ChevronRight,
  ArrowRight,
  LogIn,
  UserPlus,
  Home,
  Building,
  Building2,
  Store,
  Landmark,
  Compass,
  Award,
  Calculator,
  TrendingUp,
  Users,
  Key,
  Hammer,
  Sun,
  Star,
  FileText,
  Truck,
  Briefcase,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../lib/auth';
import { useLanguageContext } from '../lib/i18n/language-context';
import { LanguageSelectorModal } from './language-selector-modal';
import { Avatar } from './ui';
import { Logo, LogoLight } from './logo';
import { LocationSelector } from './location-selector';
import { cn } from '../lib/utils';

// Official X (formerly Twitter) SVG Icon
const XTwitterIcon = ({ className = 'h-3.5 w-3.5' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

/* ─── Nav data ──────────────────────────────────────────────── */
type MegaItem = {
  label: string;
  desc: string;
  to: string;
  icon: React.ComponentType<{ className?: string }>;
};

type MegaColumn = {
  title: string;
  items: MegaItem[];
};

type MegaMenu = {
  title: string;
  badge: string;
  columns: MegaColumn[];
};

const getMegaMenuConfig = (t: (key: string, fallback?: string) => string): Record<string, MegaMenu> => ({
  Buy: {
    title: t('menu.buyTitle', 'Buy Properties'),
    badge: t('menu.buyBadge', 'Verified'),
    columns: [
      {
        title: t('menu.residentialBuy', 'Residential Buy'),
        items: [
          {
            label: t('menu.flatsApartments', 'Flats & Apartments'),
            desc: t('menu.flatsDesc', 'Ready & under-construction 1-5 BHK'),
            to: '/search?purpose=Sale&type=Apartment',
            icon: Home,
          },
          {
            label: t('menu.luxuryVillas', 'Luxury Villas'),
            desc: t('menu.villasDesc', 'Gated community & standalone villas'),
            to: '/search?purpose=Sale&type=Villa',
            icon: Landmark,
          },
          {
            label: t('menu.plotLand', 'Plot & Land'),
            desc: t('menu.plotsDesc', 'Residential & commercial plots'),
            to: '/search?purpose=Sale&type=Plots',
            icon: Compass,
          },
        ],
      },
      {
        title: t('menu.commercialBuy', 'Commercial Buy'),
        items: [
          {
            label: t('menu.commercialOffices', 'Commercial Offices'),
            desc: t('menu.officesDesc', 'Grade-A corporate workspaces'),
            to: '/search?purpose=Sale&type=Office+Space',
            icon: Briefcase,
          },
          {
            label: t('menu.retailShops', 'Retail & Shops'),
            desc: t('menu.shopsDesc', 'High footfall retail outlets'),
            to: '/search?purpose=Sale&type=Shop',
            icon: Store,
          },
          {
            label: t('menu.warehouses', 'Warehouses'),
            desc: t('menu.warehousesDesc', 'Logistics & industrial hubs'),
            to: '/search?purpose=Sale&type=Warehouse',
            icon: Building2,
          },
        ],
      },
      {
        title: t('menu.toolsTrends', 'Tools & Trends'),
        items: [
          {
            label: t('menu.emiCalculator', 'Home Loan EMI Calculator'),
            desc: t('menu.emiDesc', 'Calculate monthly payments'),
            to: '/contact?service=Home+Loan+Assistance',
            icon: Calculator,
          },
          {
            label: t('menu.priceTrends', 'Price Trends & ROI'),
            desc: t('menu.trendsDesc', 'High appreciation hotspots'),
            to: '/search?luxury=1',
            icon: TrendingUp,
          },
        ],
      },
    ],
  },
  Rent: {
    title: t('menu.rentTitle', 'Rent Properties'),
    badge: t('menu.rentBadge', 'Trending'),
    columns: [
      {
        title: t('menu.residentialRent', 'Residential Rent'),
        items: [
          {
            label: t('menu.flatsApartments', 'Flats & Apartments'),
            desc: t('menu.rentFlatsDesc', 'Verified furnished rentals'),
            to: '/search?purpose=Rent&type=Apartment',
            icon: Home,
          },
          {
            label: t('menu.independentHouses', 'Independent Houses'),
            desc: t('menu.housesDesc', 'Spacious family homes with yard'),
            to: '/search?purpose=Rent&type=Independent+House',
            icon: Landmark,
          },
          {
            label: t('menu.penthouseSuites', 'Penthouse Suites'),
            desc: t('menu.penthouseDesc', 'Skyline views & luxury specs'),
            to: '/search?purpose=Rent&type=Penthouse',
            icon: Star,
          },
        ],
      },
      {
        title: t('menu.commercialRent', 'Commercial Rent'),
        items: [
          {
            label: t('menu.officeSpaces', 'Office Spaces'),
            desc: t('menu.servicedDesksDesc', 'Fully serviced flexible desks'),
            to: '/search?purpose=Rent&type=Office+Space',
            icon: Briefcase,
          },
          {
            label: t('menu.commercialShops', 'Commercial Shops'),
            desc: t('menu.streetRetailDesc', 'High visibility street retail'),
            to: '/search?purpose=Rent&type=Shop',
            icon: Store,
          },
          {
            label: t('menu.industrialFacilities', 'Industrial Facilities'),
            desc: t('menu.heavyShedsDesc', 'Heavy industrial sheds'),
            to: '/search?purpose=Rent&type=Industrial',
            icon: Building2,
          },
        ],
      },
      {
        title: t('menu.rentingServices', 'Renting Services'),
        items: [
          {
            label: t('menu.rentalAgreement', 'Rental Agreement'),
            desc: t('menu.legalDraftDesc', 'Instant online legal draft'),
            to: '/contact?service=Legal+Services',
            icon: FileText,
          },
          {
            label: t('menu.packersMovers', 'Packers & Movers'),
            desc: t('menu.relocationDesc', 'Stress-free home relocation'),
            to: '/contact?service=Packers+and+Movers',
            icon: Truck,
          },
        ],
      },
    ],
  },
  Commercial: {
    title: t('menu.commercialSpaces', 'Commercial Spaces'),
    badge: t('menu.highRoi', 'High ROI'),
    columns: [
      {
        title: t('menu.commercialBuying', 'Commercial Buying'),
        items: [
          {
            label: t('menu.itParksOffices', 'IT Parks & Offices'),
            desc: t('menu.corporateFloorsDesc', 'Grade-A corporate floors'),
            to: '/commercial?purpose=Sale&type=Office+Space',
            icon: Briefcase,
          },
          {
            label: t('menu.showroomsShops', 'Showrooms & Shops'),
            desc: t('menu.primeRetailDesc', 'Prime main road commercial retail'),
            to: '/commercial?purpose=Sale&type=Shop',
            icon: Store,
          },
          {
            label: t('menu.commercialLand', 'Commercial Land'),
            desc: t('menu.towersPlotDesc', 'Development plots for towers'),
            to: '/commercial?purpose=Sale&type=Land',
            icon: Compass,
          },
        ],
      },
      {
        title: t('menu.commercialRenting', 'Commercial Renting'),
        items: [
          {
            label: t('menu.coworkingDesks', 'Co-Working Desks'),
            desc: t('menu.sharedPassesDesc', 'Flexible shared office passes'),
            to: '/commercial?purpose=Rent&type=Office+Space',
            icon: Users,
          },
          {
            label: t('menu.warehouseStorage', 'Warehouse & Storage'),
            desc: t('menu.hubsDesc', 'Cold storage & distribution hubs'),
            to: '/commercial?purpose=Rent&type=Warehouse',
            icon: Building2,
          },
        ],
      },
    ],
  },
  Projects: {
    title: t('menu.projectsTitle', 'New Projects & Builders'),
    badge: t('menu.exclusiveBadge', 'Exclusive'),
    columns: [
      {
        title: t('menu.projectStatus', 'Project Status'),
        items: [
          {
            label: t('menu.newlyLaunched', 'Newly Launched'),
            desc: t('menu.discountPricingDesc', 'Pre-launch discount pricing'),
            to: '/search?status=Pre-Launch',
            icon: Compass,
          },
          {
            label: t('menu.underConstruction', 'Under Construction'),
            desc: t('menu.possessionDesc', 'Possession in 1-2 years'),
            to: '/search?status=Under+Construction',
            icon: Hammer,
          },
          {
            label: t('menu.readyToMoveIn', 'Ready To Move In'),
            desc: t('menu.ocReceivedDesc', 'Immediate OC received flats'),
            to: '/search?status=Ready+To+Move',
            icon: Key,
          },
        ],
      },
      {
        title: t('menu.featuredBuilders', 'Featured Builders'),
        items: [
          {
            label: 'Prestige Group',
            desc: t('menu.townshipsDesc', 'Luxury gated townships'),
            to: '/search?q=Prestige',
            icon: Landmark,
          },
          {
            label: 'DLF India',
            desc: t('menu.towersDesc', 'Premium high-rise towers'),
            to: '/search?q=DLF',
            icon: Building,
          },
          {
            label: 'Sobha Developers',
            desc: t('menu.precisionDesc', 'German precision quality'),
            to: '/search?q=Sobha',
            icon: Award,
          },
        ],
      },
    ],
  },
  Plots: {
    title: t('menu.plotsTitle', 'Plots & Land'),
    badge: t('menu.plotsBadge', 'HMDA / RERA'),
    columns: [
      {
        title: t('menu.plotCategories', 'Plot Categories'),
        items: [
          {
            label: t('menu.hmdaPlots', 'HMDA Approved Plots'),
            desc: t('menu.clearTitleDesc', 'Clear title layout plots'),
            to: '/search?type=Plots&q=HMDA',
            icon: ShieldCheck,
          },
          {
            label: t('menu.gatedPlots', 'Gated Layout Plots'),
            desc: t('menu.cablingDesc', 'Underground cabling & clubhouse'),
            to: '/search?type=Plots&q=Gated',
            icon: Landmark,
          },
          {
            label: t('menu.agriculturalLand', 'Agricultural Land'),
            desc: t('menu.farmhouseDesc', 'Farmhouse & plantation land'),
            to: '/search?type=Plots&q=Farm',
            icon: Sun,
          },
        ],
      },
      {
        title: t('menu.investmentSpecial', 'Investment Special'),
        items: [
          {
            label: t('menu.highwayLand', 'Highway Facing Land'),
            desc: t('menu.potentialDesc', 'High commercial potential'),
            to: '/search?type=Plots&q=Highway',
            icon: TrendingUp,
          },
          {
            label: t('menu.villaPlots', 'Villa Layout Plots'),
            desc: t('menu.customVillaDesc', 'Build your custom villa'),
            to: '/search?type=Plots&q=Villa+Plot',
            icon: Home,
          },
        ],
      },
    ],
  },
});

/* ─── Topbar ────────────────────────────────────────────────── */
function Topbar({ isTransparent, onOpenLanguageModal }: { isTransparent: boolean; onOpenLanguageModal: () => void }) {
  const { currentLanguage, t } = useLanguageContext();

  return (
    <div
      className={cn(
        'hidden text-xs transition-colors border-b lg:block py-1.5',
        isTransparent ? 'bg-navy-950/80 text-white/80 border-white/10' : 'bg-navy-900 text-navy-200 border-navy-800',
      )}
    >
      <div className="container-wide flex items-center justify-between">
        <div className="flex items-center gap-6">
          <LocationSelector isTransparent={isTransparent} />
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={onOpenLanguageModal}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-red-600/90 hover:bg-red-600 text-white font-bold text-xs shadow-sm transition-all transform active:scale-95 cursor-pointer"
            title={t('common.selectLanguage', 'Change Language')}
          >
            <Globe className="h-3.5 w-3.5" />
            <span>🌐 {currentLanguage.code.toUpperCase()}</span>
            <span className="text-[10px] opacity-80">({currentLanguage.nativeName})</span>
          </button>

          <div className="flex items-center gap-2 text-inherit/70 pl-2 border-l border-white/20">
            <span className="opacity-60 text-[11px]">{t('common.follow', 'Follow:')}</span>
            <a href="#" className="hover:text-white transition">
              <Facebook className="h-3.5 w-3.5" />
            </a>
            <a href="#" className="hover:text-white transition">
              <XTwitterIcon className="h-3.5 w-3.5" />
            </a>
            <a href="#" className="hover:text-white transition">
              <Instagram className="h-3.5 w-3.5" />
            </a>
            <a href="#" className="hover:text-white transition">
              <Linkedin className="h-3.5 w-3.5" />
            </a>
            <a href="#" className="hover:text-white transition">
              <Youtube className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Main layout ───────────────────────────────────────────── */
export function PublicLayout({ children }: { children: React.ReactNode }) {
  const { user, profile, signOut } = useAuth();
  const { t } = useLanguageContext();
  const navigate = useNavigate();
  const location = useLocation();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [hoveredMenu, setHoveredMenu] = useState<string | null>(null);
  const [userMenu, setUserMenu] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [languageModalOpen, setLanguageModalOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setMobileOpen(false);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setHoveredMenu(null);
    setUserMenu(false);
  }, [location.pathname]);

  const dashboardLink =
    profile?.role === 'admin'
      ? '/admin'
      : profile?.role === 'agent'
        ? '/agent'
        : profile?.role === 'builder'
          ? '/builder'
          : '/portal';

  const isTransparent = false;
  const megaMenuConfig = getMegaMenuConfig(t);

  const dynamicNavLinks = [
    { key: 'Buy', label: t('common.sale', 'Buy'), to: '/buy', hasMega: true },
    { key: 'Rent', label: t('common.rent', 'Rent'), to: '/rent', hasMega: true },
    { key: 'Commercial', label: t('common.commercial', 'Commercial'), to: '/commercial', hasMega: true },
    { key: 'Projects', label: t('common.projects', 'Projects'), to: '/projects', hasMega: true },
    { key: 'Plots', label: t('common.plots', 'Plots'), to: '/plots', hasMega: true },
    { key: 'AI Advisor', label: t('home.aiAdvisor', 'AI Advisor'), to: '/ai-property-advisor' },
    // { key: 'Builders', label: t('common.builders', 'Builders'), to: '/builders' },
    // { key: 'Agents', label: t('common.agents', 'Agents'), to: '/agents' },

    { key: 'Blogs', label: t('common.blog', 'Blogs'), to: '/blog' },
    { key: 'Contact', label: t('common.contactUs', 'Contact'), to: '/contact' },
    { key: 'About', label: t('common.aboutUs', 'About Us'), to: '/about-us' },
  ];

  return (
    <div className="flex min-h-screen flex-col">
      <Topbar isTransparent={isTransparent} onOpenLanguageModal={() => setLanguageModalOpen(true)} />
      <LanguageSelectorModal isOpen={languageModalOpen} onClose={() => setLanguageModalOpen(false)} />

      {/* ── Main header ── */}
      <header
        className={cn(
          'sticky top-0 z-50 transition-all duration-300',
          isTransparent
            ? 'bg-transparent text-white border-b border-white/10'
            : 'bg-white text-navy-900 border-b border-navy-100',
        )}
      >
        <div className="container-wide">
          <div className="flex py-2 items-center justify-between gap-2.5 flex-nowrap">
            {/* Compact Logo */}
            {isTransparent ? (
              <LogoLight to="/" size={165} className="shrink-0" />
            ) : (
              <Logo to="/" size={165} className="shrink-0" />
            )}

            {/* Desktop nav */}
            <nav className="hidden items-center xl:flex gap-0.5 whitespace-nowrap shrink-0">
              {dynamicNavLinks.map((item) => {
                const configKey = item.key || item.label;
                const config = megaMenuConfig[configKey];
                if (config) {
                  const isOpen = hoveredMenu === configKey;
                  return (
                    <div
                      key={item.label}
                      className="relative"
                      onMouseEnter={() => setHoveredMenu(configKey)}
                      onMouseLeave={() => setHoveredMenu(null)}
                    >
                      <Link
                        to={item.to}
                        className={cn(
                          'nav-link flex items-center gap-1 py-1.5 px-2.5 rounded-lg text-xs font-bold sm:text-sm transition-all duration-200',
                          isOpen
                            ? 'text-primary-600 bg-primary-50/80 font-semibold'
                            : 'text-navy-700 hover:text-primary-600 hover:bg-navy-50/60',
                        )}
                      >
                        {item.label}
                        <ChevronDown
                          className={cn(
                            'h-3.5 w-3.5 transition-transform duration-200 text-navy-400',
                            isOpen && 'rotate-180 text-primary-600',
                          )}
                        />
                      </Link>

                      <AnimatePresence>
                        {isOpen && (
                          <motion.div
                            initial={{ opacity: 0, y: 8, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 6, scale: 0.98 }}
                            transition={{ duration: 0.18, ease: 'easeOut' }}
                            className="absolute left-0 top-full pt-2 z-50"
                          >
                            <div className="w-[680px] rounded-2xl border border-navy-100 bg-white p-6 shadow-2xl backdrop-blur-md">
                              {/* Header Title & Badge */}
                              <div className="flex items-center justify-between border-b border-navy-100 pb-3 mb-4">
                                <div className="flex items-center gap-2">
                                  <span className="font-display text-base font-bold text-navy-900">{config.title}</span>
                                  <span className="rounded-full bg-primary-100 px-2.5 py-0.5 text-xs font-semibold text-primary-700">
                                    {config.badge}
                                  </span>
                                </div>
                                <span className="text-xs text-navy-400 font-medium">
                                  {t('menu.exploreCurated', 'Explore curated categories')}
                                </span>
                              </div>

                              {/* Columns Grid */}
                              <div
                                className={cn(
                                  'grid gap-6',
                                  config.columns.length === 3 ? 'grid-cols-3' : 'grid-cols-2',
                                )}
                              >
                                {config.columns.map((col) => (
                                  <div key={col.title} className="space-y-3">
                                    <p className="text-[11px] font-bold uppercase tracking-wider text-navy-400 border-b border-navy-50 pb-1">
                                      {col.title}
                                    </p>
                                    <ul className="space-y-2">
                                      {col.items.map((subItem) => {
                                        const ItemIcon = subItem.icon;
                                        return (
                                          <li key={subItem.label}>
                                            <Link
                                              to={subItem.to}
                                              onClick={() => setHoveredMenu(null)}
                                              className="group flex items-start gap-3 rounded-xl p-2 transition-all hover:bg-primary-50/70"
                                            >
                                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-navy-50 text-navy-600 transition-colors group-hover:bg-primary-600 group-hover:text-white">
                                                <ItemIcon className="h-4 w-4" />
                                              </div>
                                              <div>
                                                <p className="text-xs font-semibold text-navy-900 group-hover:text-primary-700">
                                                  {subItem.label}
                                                </p>
                                                <p className="text-[11px] text-navy-500 line-clamp-1">{subItem.desc}</p>
                                              </div>
                                            </Link>
                                          </li>
                                        );
                                      })}
                                    </ul>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                }

                return (
                  <Link
                    key={item.label}
                    to={item.to}
                    className={cn(
                      'nav-link py-1.5 px-2.5 rounded-lg text-xs font-bold sm:text-sm transition-colors text-navy-700 hover:text-primary-600 hover:bg-navy-50/60',
                      location.pathname === item.to && 'text-primary-600 font-semibold',
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            {/* Right actions */}
            <div className="flex items-center gap-2 shrink-0">
              {/* Search toggle */}
              <button
                onClick={() => setSearchOpen((v) => !v)}
                className={cn('icon-btn', isTransparent && '!text-white/90 hover:!text-white hover:!bg-white/10')}
                aria-label="Search"
              >
                <Search className="h-[18px] w-[18px]" />
              </button>

              {/* + Post Property Button with Red BG & Yellow FREE Pill */}
              <Link to="/portal/list-property" className="hidden sm:block">
                <button
                  type="button"
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-red-600 via-rose-600 to-red-600 text-white font-extrabold text-xs sm:text-sm shadow-md shadow-red-600/25 hover:shadow-red-600/40 hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer"
                >
                  <span>{t('forms.postProperty', 'Post Property')}</span>
                  <span className="bg-amber-300 text-slate-950 font-black text-[10px] px-1.5 py-0.5 rounded-full uppercase tracking-wider shadow-xs">
                    FREE
                  </span>
                </button>
              </Link>

              {/* Animated User Icon Button with Dropdown (Placed AFTER + Post Property Button) */}
              <div className="relative">
                <button
                  onClick={() => setUserMenu((v) => !v)}
                  className="group relative flex items-center justify-center p-0.5 rounded-full bg-gradient-to-r from-red-600 via-rose-500 to-amber-500 shadow-md shadow-red-500/20 hover:shadow-red-500/40 hover:scale-105 active:scale-95 transition-all duration-300 cursor-pointer"
                  title={t('common.accountOptions', 'Account & User Options')}
                >
                  {/* Pulsing Glow Ring */}
                  <span className="absolute -inset-0.5 rounded-full bg-gradient-to-r from-red-600 via-rose-500 to-amber-500 opacity-75 blur-xs group-hover:opacity-100 transition duration-300 animate-pulse" />

                  <div className="relative flex items-center justify-center h-8 w-8 rounded-full bg-white text-navy-900 font-bold text-xs shadow-inner overflow-hidden">
                    {user ? (
                      <Avatar
                        name={`${profile?.first_name ?? ''} ${profile?.last_name ?? ''}`.trim() || (user.email ?? 'U')}
                        src={profile?.avatar_url}
                        size={30}
                      />
                    ) : (
                      <User className="h-4 w-4 text-red-600 transition-transform group-hover:scale-110" />
                    )}
                  </div>
                </button>

                {/* Dropdown Menu under Animated User Icon */}
                <AnimatePresence>
                  {userMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.95 }}
                      transition={{ duration: 0.18 }}
                      className="absolute right-0 top-full mt-2.5 w-60 rounded-2xl border border-navy-100 bg-white/95 p-2 shadow-2xl backdrop-blur-xl z-50 text-left"
                    >
                      {user ? (
                        <>
                          <div className="px-3.5 py-2.5 bg-slate-50 rounded-xl mb-1 border border-slate-100">
                            <p className="text-xs font-bold text-navy-900 leading-tight">
                              {profile?.first_name
                                ? `${profile.first_name} ${profile.last_name ?? ''}`
                                : t('common.userAccount', 'User Account')}
                            </p>
                            <p className="truncate text-[11px] font-medium text-navy-500">{user.email}</p>
                          </div>
                          <div className="my-1 h-px bg-navy-100" />
                          <Link
                            to={dashboardLink}
                            onClick={() => setUserMenu(false)}
                            className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-navy-800 hover:bg-red-50 hover:text-red-600 transition"
                          >
                            <LayoutDashboard className="h-4 w-4 text-red-500" /> {t('common.dashboard', 'Dashboard')}
                          </Link>
                          <Link
                            to="/portal/saved"
                            onClick={() => setUserMenu(false)}
                            className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-navy-800 hover:bg-red-50 hover:text-red-600 transition"
                          >
                            <Heart className="h-4 w-4 text-red-500" /> {t('common.saved', 'Saved Properties')}
                          </Link>
                          <Link
                            to="/portal/settings"
                            onClick={() => setUserMenu(false)}
                            className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-navy-800 hover:bg-red-50 hover:text-red-600 transition"
                          >
                            <User className="h-4 w-4 text-red-500" /> {t('common.edit', 'Settings')}
                          </Link>
                          <div className="my-1 h-px bg-navy-100" />
                          <button
                            onClick={() => {
                              signOut();
                              navigate('/');
                              setUserMenu(false);
                            }}
                            className="flex items-center gap-2.5 w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-red-600 hover:bg-red-50 transition"
                          >
                            <LogOut className="h-4 w-4" /> {t('common.logout', 'Sign out')}
                          </button>
                        </>
                      ) : (
                        <>
                          <div className="px-3.5 py-2.5 bg-slate-50 rounded-xl mb-1.5 border border-slate-100">
                            <p className="text-xs font-extrabold text-navy-900">
                              {t('common.welcomeHeader', 'Welcome to RealtyNow')}
                            </p>
                            <p className="text-[10px] text-navy-500 mt-0.5">
                              {t('common.welcomeSub', 'Sign in to access your properties & saved listings')}
                            </p>
                          </div>

                          <Link
                            to="/login"
                            onClick={() => setUserMenu(false)}
                            className="flex items-center justify-between px-3.5 py-2.5 my-1 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 text-white font-bold text-xs shadow-md shadow-red-500/20 hover:scale-[1.02] active:scale-95 transition-all"
                          >
                            <div className="flex items-center gap-2">
                              <LogIn className="h-4 w-4" />
                              <span>{t('common.login', 'Sign In')}</span>
                            </div>
                            <ChevronRight className="h-3.5 w-3.5" />
                          </Link>

                          <Link
                            to="/signup"
                            onClick={() => setUserMenu(false)}
                            className="flex items-center justify-between px-3.5 py-2.5 rounded-xl border border-navy-200 bg-white font-bold text-xs text-navy-800 hover:bg-navy-50 active:scale-95 transition-all"
                          >
                            <div className="flex items-center gap-2">
                              <UserPlus className="h-4 w-4 text-red-600" />
                              <span>{t('common.register', 'Create Account')}</span>
                            </div>
                            <ChevronRight className="h-3.5 w-3.5 text-navy-400" />
                          </Link>
                        </>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Mobile hamburger */}
              <button onClick={() => setMobileOpen((v) => !v)} className="icon-btn xl:hidden">
                {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* ── Mobile menu drawer ── */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden border-t border-navy-100 bg-white xl:hidden"
            >
              <div className="container-wide py-4 space-y-2">
                {dynamicNavLinks.map((item) => (
                  <Link
                    key={item.label}
                    to={item.to}
                    className="block py-2 text-sm font-semibold text-navy-800 hover:text-primary-600"
                  >
                    {item.label}
                  </Link>
                ))}
                <div className="pt-2 border-t border-navy-100 flex flex-col gap-2">
                  {!user && (
                    <>
                      <Link to="/login" className="btn btn-outline w-full text-center">
                        {t('common.login', 'Sign In')}
                      </Link>
                      <Link to="/signup" className="btn btn-primary w-full text-center">
                        {t('common.register', 'Sign Up')}
                      </Link>
                    </>
                  )}
                  <Link
                    to="/portal/list-property"
                    className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 px-4 py-2.5 text-sm font-bold text-white shadow-md"
                  >
                    <span>{t('forms.postProperty', 'Post Property')}</span>
                    <span className="bg-amber-300 text-slate-950 font-black text-[10px] px-1.5 py-0.5 rounded-full uppercase">
                      FREE
                    </span>
                  </Link>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* ── Main content ── */}
      <main className="flex-1">{children}</main>

            {/* ── Footer ── */}
      <footer className="relative overflow-hidden bg-slate-950 text-white border-t border-white/5">
        {/* Background Effects */}
        <div className="absolute inset-0 z-0 pointer-events-none">
          <div className="absolute -top-[30%] -right-[10%] w-[70%] h-[70%] rounded-full bg-red-900/10 blur-[120px]"></div>
          <div className="absolute -bottom-[20%] -left-[10%] w-[60%] h-[60%] rounded-full bg-blue-900/10 blur-[100px]"></div>
        </div>

        {/* Huge Watermark */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full flex justify-center items-center opacity-[0.02] pointer-events-none z-0 overflow-hidden">
          <h1 className="font-display text-[15vw] font-black tracking-tighter whitespace-nowrap leading-none select-none">
            REALTYNOW
          </h1>
        </div>

        <div className="container-wide py-16 sm:py-24 relative z-10">
          {/* Top CTA Row */}
          <div className="flex flex-col md:flex-row items-center justify-between p-8 md:p-12 mb-16 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-md shadow-2xl relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-r from-red-600/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"></div>
            <div className="relative z-10 text-center md:text-left mb-6 md:mb-0">
              <h3 className="font-display text-2xl md:text-3xl font-bold text-white mb-2">Ready to list your property?</h3>
              <p className="text-white/60 max-w-md text-sm md:text-base">Join thousands of property owners who trust India's leading AI-powered real estate platform.</p>
            </div>
            <Link
              to="/portal/list-property"
              className="relative z-10 flex items-center justify-center gap-2 rounded-full bg-red-600 hover:bg-red-500 px-8 py-4 font-bold text-white shadow-[0_0_30px_rgba(220,38,38,0.4)] transition-all hover:scale-105"
            >
              Post Property FREE
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-12">
            {/* Column 1 - Brand */}
            <div className="lg:col-span-4 pr-0 lg:pr-8">
              <LogoLight to="/" size={165} src="/2.png" />
              <p className="mt-6 text-sm leading-relaxed text-white/60 font-light">
                {t(
                  'footer.tagline',
                  "India's AI-powered real estate marketplace. Find, compare, and buy properties with intelligent recommendations, price predictions, and verified listings.",
                )}
              </p>
              
              <div className="mt-8 space-y-3 text-sm text-white/70">
                <div className="flex items-start gap-3 group">
                  <div className="mt-1 h-6 w-6 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-red-500/20 transition-colors">
                    <MapPin className="h-3 w-3 text-red-500" />
                  </div>
                  <span className="flex-1">#19, Road No. 2B, Chandrapuri Colony, LB Nagar, Hyderabad 500074, Telangana</span>
                </div>
                <div className="flex items-center gap-3 group">
                  <div className="h-6 w-6 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-red-500/20 transition-colors">
                    <Phone className="h-3 w-3 text-red-500" />
                  </div>
                  <a href="tel:+919494230774" className="hover:text-white transition-colors">
                    +91 94942 30774
                  </a>
                </div>
                <div className="flex items-center gap-3 group">
                  <div className="h-6 w-6 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-red-500/20 transition-colors">
                    <Mail className="h-3 w-3 text-red-500" />
                  </div>
                  <a href="mailto:info@realtynow.in" className="hover:text-white transition-colors">
                    info@realtynow.in
                  </a>
                </div>
              </div>
            </div>

            {/* Column 2 */}
            <div className="lg:col-span-2 lg:col-start-6">
              <h4 className="font-display text-sm font-bold tracking-widest text-white uppercase flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)]"></div>
                {t('footer.popularSearches', 'Popular Searches')}
              </h4>
              <ul className="mt-6 space-y-4 text-sm text-white/50">
                {[
                  { label: t('footer.flatsForSale', 'Flats for Sale'), path: '/search?purpose=Sale' },
                  { label: t('footer.flatsForRent', 'Flats for Rent'), path: '/search?purpose=Rent' },
                  { label: t('footer.luxuryVillas', 'Luxury Villas'), path: '/search?type=Villa' },
                  { label: t('footer.commercialProps', 'Commercial Properties'), path: '/commercial' },
                  { label: t('footer.plotsLand', 'Plots & Land'), path: '/search?type=Plots' },
                ].map((link, idx) => (
                  <li key={idx}>
                    <Link to={link.path} className="group flex items-center gap-2 hover:text-white transition-colors">
                      <span className="h-px w-0 bg-red-500 transition-all duration-300 group-hover:w-3"></span>
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Column 3 */}
            <div className="lg:col-span-3">
              <h4 className="font-display text-sm font-bold tracking-widest text-white uppercase flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)]"></div>
                {t('footer.topCities', 'Top Cities')}
              </h4>
              <ul className="mt-6 space-y-4 text-sm text-white/50">
                {[
                  { label: t('footer.propsJubileeHills', 'Properties in Jubilee Hills'), path: '/search?q=Jubilee+Hills' },
                  { label: t('footer.propsBanjaraHills', 'Properties in Banjara Hills'), path: '/search?q=Banjara+Hills' },
                  { label: t('footer.propsHitecCity', 'Properties in HITEC City'), path: '/search?q=HITEC+City' },
                  { label: t('footer.propsGachibowli', 'Properties in Gachibowli'), path: '/search?q=Gachibowli' },
                  { label: t('footer.propsKondapur', 'Properties in Kondapur'), path: '/search?q=Kondapur' },
                ].map((link, idx) => (
                  <li key={idx}>
                    <Link to={link.path} className="group flex items-center gap-2 hover:text-white transition-colors">
                      <span className="h-px w-0 bg-red-500 transition-all duration-300 group-hover:w-3"></span>
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Column 4 */}
            <div className="lg:col-span-2">
              <h4 className="font-display text-sm font-bold tracking-widest text-white uppercase flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)]"></div>
                {t('footer.company', 'Company')}
              </h4>
              <ul className="mt-6 space-y-4 text-sm text-white/50">
                {[
                  { label: t('common.aboutUs', 'About Us'), path: '/about' },
                  { label: t('common.blog', 'Blog & News'), path: '/blogs' },
                  { label: t('common.contactUs', 'Contact Us'), path: '/contact' },
                  { label: t('common.terms', 'Terms of Service'), path: '/terms' },
                  { label: t('common.privacy', 'Privacy Policy'), path: '/privacy' },
                ].map((link, idx) => (
                  <li key={idx}>
                    <Link to={link.path} className="group flex items-center gap-2 hover:text-white transition-colors">
                      <span className="h-px w-0 bg-red-500 transition-all duration-300 group-hover:w-3"></span>
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
        
        {/* Bottom Bar */}
        <div className="border-t border-white/10 bg-black/20 backdrop-blur-sm relative z-10">
          <div className="container-wide py-6 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-white/40 font-light">
            <p>
              &copy; {new Date().getFullYear()} Realtynow Properties Private limited. {t('footer.rightsReserved', 'All rights reserved.')}
            </p>
            
            <div className="flex gap-4 items-center">
              {[
                { Icon: Facebook, href: '#' },
                { Icon: XTwitterIcon, href: '#' },
                { Icon: Instagram, href: '#' },
                { Icon: Linkedin, href: '#' },
                { Icon: Youtube, href: '#' },
              ].map(({ Icon, href }, i) => (
                <a
                  key={i}
                  href={href}
                  className="text-white/40 hover:text-red-500 transition-colors"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>

            <p className="flex items-center gap-1.5">{t('footer.madeWithLove', 'Made with')} <span className="text-red-500">❤️</span> for Indian Real Estate</p>
          </div>
        </div>
      </footer>
    </div>
  );
}