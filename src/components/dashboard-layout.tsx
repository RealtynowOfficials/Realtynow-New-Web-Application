import { useState, useRef, useLayoutEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, LogOut, Home, Globe } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { useLanguageContext } from '../lib/i18n/language-context';
import { LanguageSelectorModal } from './language-selector-modal';
import { Avatar } from './ui';
import { Logo } from './logo';
import { NotificationBell } from './notification-bell';
import { cn } from '../lib/utils';

export interface NavSection {
  heading?: string;
  items: { to: string; label: string; icon: React.ComponentType<{ className?: string }>; end?: boolean }[];
}

let savedSidebarScrollTop = 0;

export function DashboardLayout({
  children,
  sections,
  title,
  badge,
}: {
  children: React.ReactNode;
  sections: NavSection[];
  title: string;
  badge?: string;
}) {
  const { profile, signOut } = useAuth();
  const { currentLanguage, t } = useLanguageContext();
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [langModalOpen, setLangModalOpen] = useState(false);
  const desktopNavRef = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    if (desktopNavRef.current && savedSidebarScrollTop > 0) {
      desktopNavRef.current.scrollTop = savedSidebarScrollTop;
    }
  }, [location.pathname]);

  const isActive = (to: string, end?: boolean) => (end ? location.pathname === to : location.pathname.startsWith(to));

  return (
    <div className="min-h-screen bg-navy-50/40">
      {/* Sidebar (desktop) */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-navy-100 bg-white lg:flex flex-col">
        <div className="flex h-16 items-center gap-2 border-b border-navy-100 px-5">
          <Logo to="/" size={160} />
        </div>
        <nav
          ref={desktopNavRef}
          onScroll={(e) => {
            savedSidebarScrollTop = e.currentTarget.scrollTop;
          }}
          className="flex-1 overflow-y-auto px-3 py-4"
        >
          {sections.map((section, i) => (
            <div key={i} className="mb-4">
              {section.heading && (
                <p className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-navy-400">
                  {t(section.heading, section.heading)}
                </p>
              )}
              <div className="space-y-0.5">
                {section.items.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={cn('sidebar-link', isActive(item.to, item.end) && 'sidebar-link-active')}
                  >
                    <item.icon className="h-4 w-4" />
                    {t(item.label, item.label)}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </nav>
        <div className="border-t border-navy-100 p-3">
          <button
            onClick={() => {
              const isAdmin = profile?.role === 'admin';
              signOut();
              // Admins land back on their own dedicated login portal, not the public site —
              // keeps the admin auth flow feeling fully separate end-to-end.
              navigate(isAdmin ? '/admin/login' : '/');
            }}
            className="sidebar-link w-full text-left text-error-600 hover:bg-error-50"
          >
            <LogOut className="h-4 w-4" /> {t('common.logout', 'Sign out')}
          </button>
        </div>
      </aside>

      {/* Mobile sidebar */}
      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40 bg-navy-950/40 lg:hidden" onClick={() => setOpen(false)} />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'tween', duration: 0.2 }}
              className="fixed inset-y-0 left-0 z-50 w-64 bg-white lg:hidden flex flex-col"
            >
              <div className="flex h-16 items-center justify-between border-b border-navy-100 px-5">
                <Logo to="/" size={160} />
                <button onClick={() => setOpen(false)}>
                  <X className="h-5 w-5 text-navy-500" />
                </button>
              </div>
              <nav className="flex-1 overflow-y-auto px-3 py-4">
                {sections.map((section, i) => (
                  <div key={i} className="mb-4">
                    {section.heading && (
                      <p className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-navy-400">
                        {t(section.heading, section.heading)}
                      </p>
                    )}
                    <div className="space-y-0.5">
                      {section.items.map((item) => (
                        <Link
                          key={item.to}
                          to={item.to}
                          onClick={() => setOpen(false)}
                          className={cn('sidebar-link', isActive(item.to, item.end) && 'sidebar-link-active')}
                        >
                          <item.icon className="h-4 w-4" /> {t(item.label, item.label)}
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
              </nav>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main content */}
      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-navy-100 bg-white/90 px-4 backdrop-blur sm:px-6">
          <button
            onClick={() => setOpen(true)}
            className="lg:hidden grid place-items-center rounded-lg p-2 text-navy-700 hover:bg-navy-50"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex-1">
            <h1 className="font-display text-lg font-semibold text-navy-900 flex items-center gap-2">
              {t(title, title)}
              {badge && <span className="badge bg-gold-100 text-gold-700">{badge}</span>}
            </h1>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <button
              onClick={() => setLangModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 hover:border-red-500 bg-white hover:bg-red-50/50 text-slate-800 font-bold text-xs transition-all shadow-xs cursor-pointer"
              title={t('common.selectLanguage', 'Select Language')}
            >
              <Globe className="h-4 w-4 text-red-600" />
              <span className="hidden sm:inline">{currentLanguage.nativeName}</span>
              <span className="sm:hidden uppercase font-mono">{currentLanguage.code}</span>
            </button>
            <Link
              to="/"
              className="hidden sm:grid place-items-center rounded-xl p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100/80 transition-colors"
              aria-label="Home"
            >
              <Home className="h-5 w-5" />
            </Link>
            <NotificationBell />
            <Link
              to={
                profile?.role === 'admin'
                  ? '/admin/settings'
                  : profile?.role === 'agent'
                    ? '/agent/settings'
                    : '/portal/settings'
              }
              className="flex items-center justify-center rounded-full p-0.5 ring-2 ring-slate-100 hover:ring-red-300 transition-all ml-0.5"
              aria-label="Settings & Profile"
            >
              <Avatar
                name={`${profile?.first_name ?? ''} ${profile?.last_name ?? ''}`.trim() || (profile?.email ?? 'U')}
                src={profile?.avatar_url}
                size={34}
              />
            </Link>
          </div>
        </header>

        <LanguageSelectorModal isOpen={langModalOpen} onClose={() => setLangModalOpen(false)} />

        <div className="px-4 py-6 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            {children}
          </motion.div>
        </div>
      </div>
    </div>
  );
}

export interface PageHeaderAction {
  label: string;
  onClick: () => void;
  icon?: React.ReactNode;
  primary?: boolean;
}

export function PageHeader({
  title,
  subtitle,
  action,
  actions,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  actions?: PageHeaderAction[];
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 className="font-display text-2xl font-bold text-navy-900">{title}</h2>
        {subtitle && <p className="mt-1 text-sm text-navy-500">{subtitle}</p>}
      </div>
      {action}
      {actions && (
        <div className="flex flex-wrap items-center gap-2">
          {actions.map((a) => (
            <button
              key={a.label}
              onClick={a.onClick}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-semibold transition-colors',
                a.primary
                  ? 'bg-navy-900 text-white hover:bg-navy-800'
                  : 'border border-navy-200 text-navy-700 hover:bg-navy-50',
              )}
            >
              {a.icon}
              {a.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function StatCard({
  label,
  value,
  icon,
  trend,
  accent = 'navy',
  to,
  onClick,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: string;
  accent?: 'navy' | 'gold' | 'success' | 'error';
  to?: string;
  onClick?: () => void;
}) {
  const accentBg = {
    navy: 'bg-navy-50 text-navy-700',
    gold: 'bg-gold-50 text-gold-600',
    success: 'bg-success-50 text-success-600',
    error: 'bg-error-50 text-error-600',
  }[accent];

  const content = (
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm text-navy-500 font-medium group-hover:text-navy-700 transition-colors">{label}</p>
        <p className="mt-2 font-display text-2xl font-bold text-navy-900">{value}</p>
        {trend && <p className="mt-1 text-xs text-success-600 font-semibold">{trend}</p>}
      </div>
      <div
        className={cn(
          'grid h-11 w-11 place-items-center rounded-xl transition-transform group-hover:scale-110',
          accentBg,
        )}
      >
        {icon}
      </div>
    </div>
  );

  if (to) {
    return (
      <Link
        to={to}
        className="card p-5 block group hover:shadow-cardHover hover:border-navy-300 transition-all cursor-pointer"
      >
        {content}
      </Link>
    );
  }

  if (onClick) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        onClick={onClick}
        className="card p-5 block group hover:shadow-cardHover hover:border-navy-300 transition-all cursor-pointer"
      >
        {content}
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="card p-5">
      {content}
    </motion.div>
  );
}
