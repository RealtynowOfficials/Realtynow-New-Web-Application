import { lazy, Suspense, useEffect, useState } from 'react';
import { createBrowserRouter, RouterProvider, Navigate, Outlet, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/auth';
import { AdminAuthProvider } from './contexts/admin-auth-context';
import { AdminProtectedRoute } from './components/admin-protected-route';
import { queryClient } from './lib/queryClient';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { PublicLayout } from './components/public-layout';
import { AIAssistant } from './components/ai-assistant';
import { PwaInstallPrompt } from './components/pwa-install-prompt';
import { CompareFloatingPanel } from './components/ui/compare-floating-panel';
import { PageLoader } from './components/ui';
import { ErrorBoundary } from './components/error-boundary';
import { ToastProvider } from './components/toast';
import { ScrollToTop } from './components/scroll-to-top';
import type { UserRole } from './lib/types';
import { LanguageProvider } from './lib/i18n/language-context';
import { LocationProvider } from './contexts/location-context';
import { GlobalAppLoader } from './components/global-app-loader';
import { GlobalNotificationListener } from './components/global-notification-listener';

const HomePage = lazy(() => import('./pages/public/home').then((m) => ({ default: m.HomePage })));
const SearchPage = lazy(() => import('./pages/public/search').then((m) => ({ default: m.SearchPage })));
const CategoryPage = lazy(() => import('./pages/public/search').then((m) => ({ default: m.CategoryPage })));
const PropertyDetailPage = lazy(() =>
  import('./pages/public/property-detail').then((m) => ({ default: m.PropertyDetailPage })),
);
const BlogListPage = lazy(() => import('./pages/public/static').then((m) => ({ default: m.BlogListPage })));
const BlogDetailPage = lazy(() => import('./pages/public/static').then((m) => ({ default: m.BlogDetailPage })));
const FaqPage = lazy(() => import('./pages/public/static').then((m) => ({ default: m.FaqPage })));
const ContactPage = lazy(() => import('./pages/public/static').then((m) => ({ default: m.ContactPage })));
const StaticPage = lazy(() => import('./pages/public/static').then((m) => ({ default: m.StaticPage })));
const NotFoundPage = lazy(() => import('./pages/public/static').then((m) => ({ default: m.NotFoundPage })));
const PrivacyPolicyPage = lazy(() =>
  import('./pages/public/privacy-policy').then((m) => ({ default: m.PrivacyPolicyPage })),
);
const TermsAndConditionsPage = lazy(() =>
  import('./pages/public/terms-and-conditions').then((m) => ({ default: m.TermsAndConditionsPage })),
);
const RefundPolicyPage = lazy(() =>
  import('./pages/public/refund-policy').then((m) => ({ default: m.RefundPolicyPage })),
);
const PropertyListingPolicyPage = lazy(() =>
  import('./pages/public/listing-policy').then((m) => ({ default: m.PropertyListingPolicyPage })),
);
const UserAgreementPage = lazy(() =>
  import('./pages/public/user-agreement').then((m) => ({ default: m.UserAgreementPage })),
);
const CookiePolicyPage = lazy(() =>
  import('./pages/public/cookie-policy').then((m) => ({ default: m.CookiePolicyPage })),
);
const SecurityStatementPage = lazy(() =>
  import('./pages/public/security-statement').then((m) => ({ default: m.SecurityStatementPage })),
);
const AboutUsPage = lazy(() => import('./pages/public/about').then((m) => ({ default: m.AboutUsPage })));
const ComparePage = lazy(() => import('./pages/public/compare').then((m) => ({ default: m.ComparePage })));
const AIHubPage = lazy(() => import('./pages/public/ai-hub').then((m) => ({ default: m.AIHubPage })));
const AgentsPage = lazy(() => import('./pages/public/agents').then((m) => ({ default: m.AgentsPage })));
const AgentProfilePage = lazy(() =>
  import('./pages/public/agent-profile').then((m) => ({ default: m.AgentProfilePage })),
);
const BuildersPage = lazy(() => import('./pages/public/builders').then((m) => ({ default: m.BuildersPage })));
const BuilderProfilePage = lazy(() =>
  import('./pages/public/builder-profile').then((m) => ({ default: m.BuilderProfilePage })),
);
const EMICalculatorPage = lazy(() =>
  import('./pages/public/emi-calculator').then((m) => ({ default: m.EMICalculatorPage })),
);
const HyderabadLocalitiesPage = lazy(() =>
  import('./pages/public/hyderabad-localities').then((m) => ({ default: m.HyderabadLocalitiesPage })),
);
const BorewellServicesPage = lazy(() =>
  import('./pages/public/borewell-services').then((m) => ({ default: m.BorewellServicesPage })),
);
const HomeLoansPage = lazy(() => import('./pages/public/home-loans').then((m) => ({ default: m.HomeLoansPage })));

const OtpLoginPage = lazy(() => import('./pages/auth/otp-login').then((m) => ({ default: m.OtpLoginPage })));
const AdminLoginPage = lazy(() => import('./pages/auth/admin-login').then((m) => ({ default: m.AdminLoginPage })));
const AgentRegisterPage = lazy(() =>
  import('./pages/auth/agent-register').then((m) => ({ default: m.AgentRegisterPage })),
);
const BuilderRegisterPage = lazy(() =>
  import('./pages/auth/builder-register').then((m) => ({ default: m.BuilderRegisterPage })),
);
const PartnerRegisterPage = lazy(() =>
  import('./pages/auth/partner-register').then((m) => ({ default: m.PartnerRegisterPage })),
);

const PortalDashboard = lazy(() => import('./pages/portal/portal').then((m) => ({ default: m.PortalDashboard })));
const ProfileSetupPage = lazy(() =>
  import('./pages/portal/profile-setup').then((m) => ({ default: m.ProfileSetupPage })),
);
const PortalSaved = lazy(() => import('./pages/portal/saved-properties'));
const PortalCompare = lazy(() => import('./pages/portal/portal').then((m) => ({ default: m.PortalCompare })));
const PortalSubscription = lazy(() => import('./pages/portal/portal').then((m) => ({ default: m.PortalSubscription })));
const PortalNotifications = lazy(() =>
  import('./pages/portal/notifications').then((m) => ({ default: m.PortalNotifications })),
);
const PortalInvoices = lazy(() => import('./pages/portal/portal').then((m) => ({ default: m.PortalInvoices })));
const PortalMyProperties = lazy(() =>
  import('./pages/portal/my-properties').then((m) => ({ default: m.PortalMyProperties })),
);
const ListPropertyWizard = lazy(() =>
  import('./pages/portal/list-property').then((m) => ({ default: m.ListPropertyWizard })),
);
const NewListingWizard = lazy(() =>
  import('./pages/portal/dynamic-listing').then((m) => ({ default: m.NewListingWizard })),
);
const BulkUpload = lazy(() => import('./pages/portal/bulk-upload').then((m) => ({ default: m.BulkUpload })));
const AdminBulkImport = lazy(() => import('./pages/admin/bulk-import').then((m) => ({ default: m.AdminBulkImport })));
const PortalEnquiries = lazy(() =>
  import('./pages/portal/enquiries-settings').then((m) => ({ default: m.PortalEnquiries })),
);
const PortalHelp = lazy(() => import('./pages/portal/enquiries-settings').then((m) => ({ default: m.PortalHelp })));
const PortalSettings = lazy(() =>
  import('./pages/portal/enquiries-settings').then((m) => ({ default: m.PortalSettings })),
);

const AdminDashboard = lazy(() => import('./pages/admin/dashboard').then((m) => ({ default: m.AdminDashboard })));
const AdminProperties = lazy(() => import('./pages/admin/approvals').then((m) => ({ default: m.AdminProperties })));
const AdminApprovals = lazy(() => import('./pages/admin/approvals').then((m) => ({ default: m.AdminApprovals })));
const AdminAgentApplications = lazy(() =>
  import('./pages/admin/applications').then((m) => ({ default: m.AdminAgentApplications })),
);
const AdminBuilderApplications = lazy(() =>
  import('./pages/admin/applications').then((m) => ({ default: m.AdminBuilderApplications })),
);
const AdminPartnerApplications = lazy(() =>
  import('./pages/admin/applications').then((m) => ({ default: m.AdminPartnerApplications })),
);
const AdminCustomers = lazy(() => import('./pages/admin/manage').then((m) => ({ default: m.AdminCustomers })));
const AdminPropertyEditor = lazy(() => import('./pages/admin/admin-property-editor').then((m) => ({ default: m.AdminPropertyEditor })));
const AdminAgents = lazy(() => import('./pages/admin/manage').then((m) => ({ default: m.AdminAgents })));
const AdminBlogs = lazy(() => import('./pages/admin/manage').then((m) => ({ default: m.AdminBlogs })));
const AdminMasterData = lazy(() => import('./pages/admin/manage').then((m) => ({ default: m.AdminMasterData })));
const AdminTestimonials = lazy(() => import('./pages/admin/content').then((m) => ({ default: m.AdminTestimonials })));
const AdminFaqs = lazy(() => import('./pages/admin/content').then((m) => ({ default: m.AdminFaqs })));
const AdminAdvertisements = lazy(() =>
  import('./pages/admin/content').then((m) => ({ default: m.AdminAdvertisements })),
);
const AdminHeroCampaigns = lazy(() =>
  import('./pages/admin/hero-campaigns').then((m) => ({ default: m.AdminHeroCampaigns })),
);
const AdminSecuritySettings = lazy(() =>
  import('./pages/admin/security-settings').then((m) => ({ default: m.AdminSecuritySettings })),
);
const AdminAuditLogs = lazy(() => import('./pages/admin/audit').then((m) => ({ default: m.AdminAuditLogs })));
const AdminSettings = lazy(() => import('./pages/admin/settings').then((m) => ({ default: m.AdminSettings })));
const AdminPropertyPageSettings = lazy(() =>
  import('./pages/admin/property-page-settings').then((m) => ({ default: m.AdminPropertyPageSettings })),
);
const AdminLanguages = lazy(() => import('./pages/admin/languages').then((m) => ({ default: m.AdminLanguagesPage })));
const AdminHomepageCMS = lazy(() => import('./pages/admin/cms').then((m) => ({ default: m.AdminHomepageCMS })));
const AdminCRMDashboard = lazy(() => import('./pages/admin/crm').then((m) => ({ default: m.default })));
const AdminPackagesPage = lazy(() => import('./pages/admin/packages').then((m) => ({ default: m.default })));
const AdminPaymentsPage = lazy(() => import('./pages/admin/payments').then((m) => ({ default: m.default })));
const AdminReportsPage = lazy(() => import('./pages/admin/reports').then((m) => ({ default: m.default })));
const AdminAnalyticsPage = lazy(() => import('./pages/admin/analytics').then((m) => ({ default: m.default })));
const AdminSponsoredPage = lazy(() => import('./pages/admin/sponsored').then((m) => ({ default: m.default })));
const AdminInvoicesPage = lazy(() => import('./pages/admin/invoices').then((m) => ({ default: m.default })));

const AgentDashboard = lazy(() => import('./pages/agent/dashboard').then((m) => ({ default: m.AgentDashboard })));
const AgentProperties = lazy(() => import('./pages/agent/properties').then((m) => ({ default: m.AgentProperties })));
const AgentLeads = lazy(() => import('./pages/agent/leads').then((m) => ({ default: m.AgentLeads })));
const AgentAppointments = lazy(() => import('./pages/agent/appointments').then((m) => ({ default: m.AgentAppointments })));
const AgentAnalytics = lazy(() => import('./pages/agent/analytics').then((m) => ({ default: m.AgentAnalytics })));
const AgentSettings = lazy(() => import('./pages/agent/settings').then((m) => ({ default: m.AgentSettings })));
const AgentClients = lazy(() => import('./pages/agent/clients').then((m) => ({ default: m.AgentClients })));
const AgentCrm = lazy(() => import('./pages/agent/crm').then((m) => ({ default: m.AgentCrm })));
const AgentNegotiations = lazy(() => import('./pages/agent/negotiations').then((m) => ({ default: m.AgentNegotiations })));
const AgentCommissions = lazy(() => import('./pages/agent/commissions').then((m) => ({ default: m.AgentCommissions })));
const AgentDocuments = lazy(() => import('./pages/agent/documents').then((m) => ({ default: m.AgentDocuments })));
const AgentTasks = lazy(() => import('./pages/agent/tasks').then((m) => ({ default: m.AgentTasks })));
const AgentMarketing = lazy(() => import('./pages/agent/marketing').then((m) => ({ default: m.AgentMarketing })));
const AgentReports = lazy(() => import('./pages/agent/reports').then((m) => ({ default: m.AgentReports })));
const AgentProfile = lazy(() => import('./pages/agent/profile').then((m) => ({ default: m.AgentProfile })));
const AgentAiAssistant = lazy(() => import('./pages/agent/ai-assistant').then((m) => ({ default: m.AgentAiAssistant })));

const PartnerDashboard = lazy(() => import('./pages/partner/dashboard').then((m) => ({ default: m.PartnerDashboard })));

const BuilderDashboard = lazy(() => import('./pages/builder/dashboard').then((m) => ({ default: m.BuilderDashboard })));
const BuilderProjects = lazy(() => import('./pages/builder/projects').then((m) => ({ default: m.BuilderProjects })));
const BuilderLeads = lazy(() => import('./pages/builder/leads').then((m) => ({ default: m.BuilderLeads })));
const BuilderAnalytics = lazy(() => import('./pages/builder/analytics').then((m) => ({ default: m.BuilderAnalytics })));
const BuilderSettings = lazy(() => import('./pages/builder/settings').then((m) => ({ default: m.BuilderSettings })));
const BuilderInventory = lazy(() => import('./pages/builder/inventory').then((m) => ({ default: m.BuilderInventory })));
const BuilderBlocks = lazy(() => import('./pages/builder/blocks').then((m) => ({ default: m.BuilderBlocks })));
const BuilderFloors = lazy(() => import('./pages/builder/floors').then((m) => ({ default: m.BuilderFloors })));
const BuilderUnits = lazy(() => import('./pages/builder/units').then((m) => ({ default: m.BuilderUnits })));
const BuilderPricing = lazy(() => import('./pages/builder/pricing').then((m) => ({ default: m.BuilderPricing })));
const BuilderBookings = lazy(() => import('./pages/builder/bookings').then((m) => ({ default: m.BuilderBookings })));
const BuilderCustomers = lazy(() => import('./pages/builder/customers').then((m) => ({ default: m.BuilderCustomers })));
const BuilderAgents = lazy(() => import('./pages/builder/agents').then((m) => ({ default: m.BuilderAgents })));
const BuilderCrm = lazy(() => import('./pages/builder/crm').then((m) => ({ default: m.BuilderCrm })));
const BuilderConstruction = lazy(() => import('./pages/builder/construction').then((m) => ({ default: m.BuilderConstruction })));
const BuilderPayments = lazy(() => import('./pages/builder/payments').then((m) => ({ default: m.BuilderPayments })));
const BuilderInvoices = lazy(() => import('./pages/builder/invoices').then((m) => ({ default: m.BuilderInvoices })));
const BuilderDocuments = lazy(() => import('./pages/builder/documents').then((m) => ({ default: m.BuilderDocuments })));
const BuilderFloorPlans = lazy(() => import('./pages/builder/floor-plans').then((m) => ({ default: m.BuilderFloorPlans })));
const BuilderGallery = lazy(() => import('./pages/builder/gallery').then((m) => ({ default: m.BuilderGallery })));
const BuilderMarketing = lazy(() => import('./pages/builder/marketing').then((m) => ({ default: m.BuilderMarketing })));
const BuilderReports = lazy(() => import('./pages/builder/reports').then((m) => ({ default: m.BuilderReports })));
const BuilderNotifications = lazy(() => import('./pages/builder/notifications').then((m) => ({ default: m.BuilderNotifications })));
const BuilderProfile = lazy(() => import('./pages/builder/profile').then((m) => ({ default: m.BuilderProfile })));
const BuilderAiAssistant = lazy(() => import('./pages/builder/ai-assistant').then((m) => ({ default: m.BuilderAiAssistant })));

function RootLayout() {
  return (
    <ErrorBoundary>
      <Outlet />
      <CompareFloatingPanel />
      <AIAssistant />
      <PwaInstallPrompt />
      <GlobalNotificationListener />
    </ErrorBoundary>
  );
}

function PublicRoute() {
  return (
    <PublicLayout>
      <ErrorBoundary>
        <ScrollToTop />
        <Suspense fallback={<PageLoader />}>
          <Outlet />
        </Suspense>
      </ErrorBoundary>
    </PublicLayout>
  );
}

const ADMIN_IDLE_TIMEOUT_MS = 3 * 60 * 60 * 1000; // 3 hours of inactivity

function ProtectedRoute({ allowRoles }: { allowRoles?: UserRole[] }) {
  const { user, profile, loading, signOut } = useAuth();
  const location = useLocation();
  const isAdminRoute = !!allowRoles?.includes('admin');


  // Admin sessions auto-logout after 3h of *inactivity* (not just time since login).
  // Previously this only checked once on mount, so an admin left on one page for
  // hours never got logged out; now activity resets the timer and a periodic
  // check catches idle sessions even without navigation.
  useEffect(() => {
    if (profile?.role !== 'admin') {
      localStorage.removeItem('adminSessionActivity');
      return;
    }

    const forceLogout = () => {
      localStorage.removeItem('adminSessionActivity');
      signOut().then(() => {
        window.location.href = '/login?expired=true';
      });
    };

    const touch = () => {
      const now = Date.now();
      const last = localStorage.getItem('adminSessionActivity');
      if (!last || now - parseInt(last, 10) > 30_000) {
        localStorage.setItem('adminSessionActivity', now.toString());
      }
    };

    const lastActivity = localStorage.getItem('adminSessionActivity');
    if (!lastActivity) {
      touch();
    } else if (Date.now() - parseInt(lastActivity, 10) > ADMIN_IDLE_TIMEOUT_MS) {
      forceLogout();
      return;
    }

    const activityEvents = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    activityEvents.forEach((evt) => window.addEventListener(evt, touch, { passive: true }));

    const interval = setInterval(() => {
      const last = localStorage.getItem('adminSessionActivity');
      if (last && Date.now() - parseInt(last, 10) > ADMIN_IDLE_TIMEOUT_MS) {
        forceLogout();
      }
    }, 60_000);

    return () => {
      activityEvents.forEach((evt) => window.removeEventListener(evt, touch));
      clearInterval(interval);
    };
  }, [profile, signOut]);
  if (loading) return <PageLoader />;
  if (!user) {
    // Admin routes bounce to the dedicated admin portal login, not the general one.
    const loginPath = isAdminRoute ? '/admin/login' : '/login';
    return <Navigate to={`${loginPath}?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  }
  if (allowRoles && profile && !allowRoles.includes(profile.role)) {
    const home =
      profile.role === 'admin'
        ? '/admin'
        : profile.role === 'agent'
          ? '/agent'
          : profile.role === 'builder'
            ? '/builder'
            : profile.role === 'partner'
              ? '/partner'
              : '/portal';
    return <Navigate to={home} replace />;
  }

  return (
    <ErrorBoundary>
      <Suspense fallback={<PageLoader />}>
        <Outlet />
      </Suspense>
    </ErrorBoundary>
  );
}

function AppRoutes() {
  return (
    <RouterProvider
      router={createBrowserRouter([
        {
          element: <RootLayout />,
          children: [
            {
              element: <PublicRoute />,
              children: [
                { path: '/', element: <HomePage /> },
                { path: '/search', element: <SearchPage /> },
                { path: '/buy', element: <CategoryPage category="buy" /> },
                { path: '/rent', element: <CategoryPage category="rent" /> },
                { path: '/commercial', element: <CategoryPage category="commercial" /> },
                { path: '/projects', element: <CategoryPage category="commercial" /> },
                { path: '/plots', element: <CategoryPage category="plots" /> },
                { path: '/luxury', element: <CategoryPage category="luxury" /> },
                { path: '/property/:id', element: <PropertyDetailPage /> },
                { path: '/blog', element: <BlogListPage /> },
                { path: '/blog/:slug', element: <BlogDetailPage /> },
                { path: '/about', element: <AboutUsPage /> },
                { path: '/about-us', element: <AboutUsPage /> },
                { path: '/terms', element: <TermsAndConditionsPage /> },
                { path: '/terms-and-conditions', element: <TermsAndConditionsPage /> },
                { path: '/privacy', element: <PrivacyPolicyPage /> },
                { path: '/privacy-policy', element: <PrivacyPolicyPage /> },
                { path: '/refund-policy', element: <RefundPolicyPage /> },
                { path: '/listing-policy', element: <PropertyListingPolicyPage /> },
                { path: '/user-agreement', element: <UserAgreementPage /> },
                { path: '/cookie-policy', element: <CookiePolicyPage /> },
                { path: '/security-statement', element: <SecurityStatementPage /> },
                { path: '/security', element: <SecurityStatementPage /> },
                { path: '/faq', element: <FaqPage /> },
                { path: '/contact', element: <ContactPage /> },
                { path: '/compare', element: <ComparePage /> },
                { path: '/ai-advisor', element: <AIHubPage /> },
                { path: '/ai-property-advisor', element: <AIHubPage /> },
                { path: '/ai_property_advisor', element: <AIHubPage /> },
                { path: '/ai-hub', element: <AIHubPage /> },
                { path: '/agents', element: <AgentsPage /> },
                { path: '/agents/:id', element: <AgentProfilePage /> },
                { path: '/builders', element: <BuildersPage /> },
                { path: '/builders/:id', element: <BuilderProfilePage /> },
                { path: '/hyderabad-localities', element: <HyderabadLocalitiesPage /> },
                { path: '/emi-calculator', element: <EMICalculatorPage /> },
                { path: '/borewell-services', element: <BorewellServicesPage /> },
                { path: '/home-loans', element: <HomeLoansPage /> },
                // Common aliases and redirects to prevent 404s
                { path: '/post-property', element: <Navigate to="/portal/list-property" replace /> },
                { path: '/properties', element: <Navigate to="/search" replace /> },
                { path: '/register', element: <Navigate to="/signup" replace /> },
              ],
            },
            {
              // Same OTP login page for every role — role is whatever the
              // matched/created profile already has, never chosen at login.
              // ProtectedRoute's allowRoles still gates dashboard access.
              path: '/login',
              element: (
                <Suspense fallback={<PageLoader />}>
                  <OtpLoginPage />
                </Suspense>
              ),
            },
            { path: '/signup', element: <Navigate to="/login" replace /> },
            { path: '/forgot-password', element: <Navigate to="/login" replace /> },
            { path: '/verify-email', element: <Navigate to="/login" replace /> },
            { path: '/agent/login', element: <Navigate to="/login" replace /> },
            { path: '/builder/login', element: <Navigate to="/login" replace /> },
            {
              // Dedicated, isolated admin entry point — deliberately separate route and UI
              // from /login (see src/pages/auth/admin-login.tsx for why the session
              // mechanism is still shared under the hood).
              path: '/admin/login',
              element: (
                <Suspense fallback={<PageLoader />}>
                  <AdminLoginPage />
                </Suspense>
              ),
            },
            {
              path: '/agent/register',
              element: (
                <Suspense fallback={<PageLoader />}>
                  <AgentRegisterPage />
                </Suspense>
              ),
            },
            {
              path: '/builder/register',
              element: (
                <Suspense fallback={<PageLoader />}>
                  <BuilderRegisterPage />
                </Suspense>
              ),
            },
            {
              path: '/partner/register',
              element: (
                <Suspense fallback={<PageLoader />}>
                  <PartnerRegisterPage />
                </Suspense>
              ),
            },
            {
              path: '/portal/saved',
              element: (
                <Suspense fallback={<PageLoader />}>
                  <PortalSaved />
                </Suspense>
              ),
            },
            {
              path: '/portal/compare',
              element: (
                <Suspense fallback={<PageLoader />}>
                  <PortalCompare />
                </Suspense>
              ),
            },
            {
              element: <ProtectedRoute allowRoles={['customer']} />,
              children: [
                { path: '/portal', element: <PortalDashboard /> },
                { path: '/portal/profile-setup', element: <ProfileSetupPage /> },
                { path: '/portal/list-property', element: <ListPropertyWizard /> },
                { path: '/portal/list-property/new', element: <NewListingWizard /> },
                { path: '/portal/bulk-upload', element: <BulkUpload /> },
                { path: '/portal/my-properties', element: <PortalMyProperties /> },
                { path: '/portal/enquiries', element: <PortalEnquiries /> },
                { path: '/portal/subscription', element: <PortalSubscription /> },
                { path: '/portal/invoices', element: <PortalInvoices /> },
                { path: '/portal/help', element: <PortalHelp /> },
                { path: '/portal/settings', element: <PortalSettings /> },
              ],
            },
            {
              element: <ProtectedRoute allowRoles={['agent']} />,
              children: [
                { path: '/agent', element: <AgentDashboard /> },
                { path: '/agent/properties', element: <AgentProperties /> },
                { path: '/agent/leads', element: <AgentLeads /> },
                { path: '/agent/clients', element: <AgentClients /> },
                { path: '/agent/crm', element: <AgentCrm /> },
                { path: '/agent/appointments', element: <AgentAppointments /> },
                { path: '/agent/negotiations', element: <AgentNegotiations /> },
                { path: '/agent/commissions', element: <AgentCommissions /> },
                { path: '/agent/documents', element: <AgentDocuments /> },
                { path: '/agent/tasks', element: <AgentTasks /> },
                { path: '/agent/marketing', element: <AgentMarketing /> },
                { path: '/agent/reports', element: <AgentReports /> },
                { path: '/agent/profile', element: <AgentProfile /> },
                { path: '/agent/ai-assistant', element: <AgentAiAssistant /> },
                { path: '/agent/analytics', element: <AgentAnalytics /> },
                { path: '/agent/settings', element: <AgentSettings /> },
                { path: '/agent/notifications', element: <PortalNotifications /> },
                { path: '/agent/bulk-upload', element: <BulkUpload /> },
              ],
            },
            { path: '/agents', element: <Navigate to="/agent/login" replace /> },
            {
              element: <ProtectedRoute allowRoles={['partner']} />,
              children: [{ path: '/partner', element: <PartnerDashboard /> }],
            },
            {
              element: <ProtectedRoute allowRoles={['builder']} />,
              children: [
                { path: '/builder', element: <BuilderDashboard /> },
                { path: '/builder/projects', element: <BuilderProjects /> },
                { path: '/builder/leads', element: <BuilderLeads /> },
                { path: '/builder/analytics', element: <BuilderAnalytics /> },
                { path: '/builder/settings', element: <BuilderSettings /> },
                { path: '/builder/inventory', element: <BuilderInventory /> },
                { path: '/builder/blocks', element: <BuilderBlocks /> },
                { path: '/builder/floors', element: <BuilderFloors /> },
                { path: '/builder/units', element: <BuilderUnits /> },
                { path: '/builder/pricing', element: <BuilderPricing /> },
                { path: '/builder/bookings', element: <BuilderBookings /> },
                { path: '/builder/customers', element: <BuilderCustomers /> },
                { path: '/builder/agents', element: <BuilderAgents /> },
                { path: '/builder/crm', element: <BuilderCrm /> },
                { path: '/builder/crm/:leadId', element: <BuilderCrm /> },
                { path: '/builder/construction', element: <BuilderConstruction /> },
                { path: '/builder/payments', element: <BuilderPayments /> },
                { path: '/builder/invoices', element: <BuilderInvoices /> },
                { path: '/builder/documents', element: <BuilderDocuments /> },
                { path: '/builder/floor-plans', element: <BuilderFloorPlans /> },
                { path: '/builder/gallery', element: <BuilderGallery /> },
                { path: '/builder/marketing', element: <BuilderMarketing /> },
                { path: '/builder/reports', element: <BuilderReports /> },
                { path: '/builder/notifications', element: <BuilderNotifications /> },
                { path: '/builder/profile', element: <BuilderProfile /> },
                { path: '/builder/ai-assistant', element: <BuilderAiAssistant /> },
              ],
            },
            {
              element: <AdminProtectedRoute />,
              children: [
                { path: '/admin', element: <AdminDashboard /> },
                { path: '/admin/properties', element: <AdminProperties /> },
                { path: '/admin/properties/edit/:id', element: <AdminPropertyEditor /> },
                { path: '/admin/bulk-import', element: <AdminBulkImport /> },
                { path: '/admin/approvals', element: <AdminApprovals /> },
                { path: '/admin/agent-applications', element: <AdminAgentApplications /> },
                { path: '/admin/builder-applications', element: <AdminBuilderApplications /> },
                { path: '/admin/partner-applications', element: <AdminPartnerApplications /> },
                { path: '/admin/customers', element: <AdminCustomers /> },
                { path: '/admin/agents', element: <AdminAgents /> },
                { path: '/admin/blogs', element: <AdminBlogs /> },
                { path: '/admin/testimonials', element: <AdminTestimonials /> },
                { path: '/admin/faqs', element: <AdminFaqs /> },
                { path: '/admin/advertisements', element: <AdminAdvertisements /> },
                { path: '/admin/hero-campaigns', element: <AdminHeroCampaigns /> },
                { path: '/admin/security', element: <AdminSecuritySettings /> },
                { path: '/admin/master', element: <AdminMasterData /> },
                { path: '/admin/audit', element: <AdminAuditLogs /> },
                { path: '/admin/languages', element: <AdminLanguages /> },
                { path: '/admin/cms', element: <AdminHomepageCMS /> },
                { path: '/admin/crm', element: <AdminCRMDashboard /> },
                { path: '/admin/packages', element: <AdminPackagesPage /> },
                { path: '/admin/payments', element: <AdminPaymentsPage /> },
                { path: '/admin/reports', element: <AdminReportsPage /> },
                { path: '/admin/analytics', element: <AdminAnalyticsPage /> },
                { path: '/admin/sponsored', element: <AdminSponsoredPage /> },
                { path: '/admin/invoices', element: <AdminInvoicesPage /> },
                { path: '/admin/settings', element: <AdminSettings /> },
                { path: '/admin/property-page-settings', element: <AdminPropertyPageSettings /> },
                { path: '/admin/notifications', element: <PortalNotifications /> },
              ],
            },
            {
              element: <ProtectedRoute />,
              children: [{ path: '/portal/notifications', element: <PortalNotifications /> }],
            },
            {
              path: '*',
              element: (
                <Suspense fallback={<PageLoader />}>
                  <NotFoundPage />
                </Suspense>
              ),
            },
          ],
        },
      ])}
    />
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <AuthProvider>
          <AdminAuthProvider>
            <LanguageProvider>
              <LocationProvider>
                <GlobalAppLoader>
                  <AppRoutes />
                </GlobalAppLoader>
              </LocationProvider>
            </LanguageProvider>
          </AdminAuthProvider>
        </AuthProvider>
      </ToastProvider>
      {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
}
