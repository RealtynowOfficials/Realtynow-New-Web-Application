import React from 'react';
import { Link } from 'react-router-dom';
import {
  MapPin,
  Phone,
  Mail,
  ArrowRight,
  Facebook,
  Instagram,
  Linkedin,
  Youtube
} from 'lucide-react';
import { LogoLight } from './logo';
import { PostPropertyLink } from './post-property-link';
import { useLanguageContext } from '../lib/i18n/language-context';
import { APP_VERSION, BUILD_TIME } from '../lib/version';

const XTwitterIcon = ({ className = 'h-3.5 w-3.5' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

export function PublicFooter() {
  const { t } = useLanguageContext();

  return (
    <footer className="relative overflow-hidden bg-slate-950 text-white border-t border-white/5">
      {/* Background Effects */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute -top-[30%] -right-[10%] w-[70%] h-[70%] rounded-full bg-red-900/10 blur-[120px]" />
        <div className="absolute -bottom-[20%] -left-[10%] w-[60%] h-[60%] rounded-full bg-blue-900/10 blur-[100px]" />
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
          <div className="absolute inset-0 bg-gradient-to-r from-red-600/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
          <div className="relative z-10 text-center md:text-left mb-6 md:mb-0">
            <h3 className="font-display text-2xl md:text-3xl font-bold text-white mb-2">Ready to list your property?</h3>
            <p className="text-white/60 max-w-md text-sm md:text-base">Join thousands of property owners who trust India's leading AI-powered real estate platform.</p>
          </div>
          <PostPropertyLink
            to="/portal/list-property"
            className="relative z-10 flex items-center justify-center gap-2 rounded-full bg-red-600 hover:bg-red-500 px-8 py-4 font-bold text-white shadow-[0_0_30px_rgba(220,38,38,0.4)] transition-all hover:scale-105"
          >
            Post Property FREE
            <ArrowRight className="h-4 w-4" />
          </PostPropertyLink>
        </div>

        <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-12">
          {/* Column 1 - Brand */}
          <div className="lg:col-span-4 pr-0 lg:pr-8">
            <LogoLight to="/" size={165} src="/2.png" />
            <p className="mt-6 text-sm leading-relaxed text-white/60 font-light">
              {t(
                'footer.tagline',
                "India's AI-powered real estate marketplace. Find, compare, and buy properties with intelligent recommendations, price predictions, and verified listings."
              )}
            </p>

            <div className="mt-8 space-y-3 text-sm text-white/70">
              <div className="flex items-start gap-3 group">
                <div className="mt-1 h-6 w-6 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-red-500/20 transition-colors">
                  <MapPin className="h-3 w-3 text-red-500" />
                </div>
                <span className="flex-1">#19, Road No. 2B, Chandrapuri Colony, LB Nagar, Hyderabad - 500081, Telangana, India</span>
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
              <div className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)]" />
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
                  <Link
                    to={link.path}
                    onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                    className="group flex items-center gap-2 hover:text-white transition-colors"
                  >
                    <span className="h-px w-0 bg-red-500 transition-all duration-300 group-hover:w-3" />
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3 */}
          <div className="lg:col-span-3">
            <h4 className="font-display text-sm font-bold tracking-widest text-white uppercase flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)]" />
              {t('footer.topCities', 'Top Cities')}
            </h4>
            <ul className="mt-6 space-y-4 text-sm text-white/50">
              {[
                { label: t('footer.propsJubileeHills', 'Properties in Jubilee Hills'), path: '/search?city=Hyderabad&locality=Jubilee+Hills' },
                { label: t('footer.propsBanjaraHills', 'Properties in Banjara Hills'), path: '/search?city=Hyderabad&locality=Banjara+Hills' },
                { label: t('footer.propsHitecCity', 'Properties in HITEC City'), path: '/search?city=Hyderabad&locality=HITEC+City' },
                { label: t('footer.propsGachibowli', 'Properties in Gachibowli'), path: '/search?city=Hyderabad&locality=Gachibowli' },
                { label: t('footer.propsKondapur', 'Properties in Kondapur'), path: '/search?city=Hyderabad&locality=Kondapur' },
              ].map((link, idx) => (
                <li key={idx}>
                  <Link
                    to={link.path}
                    onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                    className="group flex items-center gap-2 hover:text-white transition-colors"
                  >
                    <span className="h-px w-0 bg-red-500 transition-all duration-300 group-hover:w-3" />
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 4 - Company & Legal Policies */}
          <div className="lg:col-span-2">
            <h4 className="font-display text-sm font-bold tracking-widest text-white uppercase flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)]" />
              {t('footer.legalPolicies', 'Company & Legal')}
            </h4>
            <ul className="mt-6 space-y-3 text-xs sm:text-sm text-white/50">
              {[
                { label: t('common.aboutUs', 'About Us'), path: '/about-us' },
                { label: t('common.contactUs', 'Contact Us'), path: '/contact' },
                { label: t('footer.privacy', 'Privacy Policy'), path: '/privacy' },
                { label: t('footer.terms', 'Terms & Conditions'), path: '/terms' },
                { label: t('footer.refundPolicy', 'Refund & Cancellation Policy'), path: '/refund-policy' },
                { label: t('footer.listingPolicy', 'Property Listing Policy'), path: '/listing-policy' },
                { label: t('footer.userAgreement', 'User Agreement'), path: '/user-agreement' },
                { label: t('footer.cookiePolicy', 'Cookie Policy'), path: '/cookie-policy' },
                { label: t('footer.securityStatement', 'Security Statement'), path: '/security-statement' },
              ].map((link, idx) => (
                <li key={idx}>
                  <Link to={link.path} className="group flex items-center gap-2 hover:text-white transition-colors">
                    <span className="h-px w-0 bg-red-500 transition-all duration-300 group-hover:w-3" />
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
          <div className="flex flex-col gap-2">
            <p>
              &copy; {new Date().getFullYear()} Realtynow Properties Private limited. {t('footer.rightsReserved', 'All rights reserved.')}
            </p>
            <div className="flex flex-wrap items-center gap-3 text-[11px] text-white/40">
              <Link to="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
              <span>•</span>
              <Link to="/terms" className="hover:text-white transition-colors">Terms & Conditions</Link>
              <span>•</span>
              <Link to="/refund-policy" className="hover:text-white transition-colors">Refund & Cancellation</Link>
              <span>•</span>
              <Link to="/listing-policy" className="hover:text-white transition-colors">Listing Policy</Link>
              <span>•</span>
              <Link to="/user-agreement" className="hover:text-white transition-colors">User Agreement</Link>
              <span>•</span>
              <Link to="/cookie-policy" className="hover:text-white transition-colors">Cookie Policy</Link>
              <span>•</span>
              <Link to="/security-statement" className="hover:text-white transition-colors">Security Statement</Link>
              <span>•</span>
              <span
                className="font-mono text-[11px] text-white/30 cursor-default select-all hover:text-white/60 transition-colors"
                title={`Build: ${BUILD_TIME}`}
              >
                v{APP_VERSION}
              </span>
            </div>
          </div>

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

          <p className="flex items-center gap-1.5">
            {t('footer.madeWithLove', 'Made with')} <span className="text-red-500">❤️</span> for Indian Real Estate
          </p>
        </div>
      </div>
    </footer>
  );
}
