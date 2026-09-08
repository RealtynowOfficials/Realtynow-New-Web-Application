import {
  LayoutDashboard,
  Building2,
  Building,
  Heart,
  MessageSquare,
  Settings,
  Bell,
  Wallet,
  PlusCircle,
  GitCompare,
  Sparkles,
  HelpCircle,
  FileText,
  FileCheck,
  Users,
  UserCheck,
  UserPlus,
  ClipboardList,
  Kanban,
  CalendarClock,
  TrendingUp,
  Briefcase,
  Target,
  Megaphone,
  Star,
  ScrollText,
  ShieldCheck,
  Calendar,
  Image,
  LayoutTemplate,
  Lock,
  Layers,
  Grid3x3,
  Tag,
  HardHat,
  UserCircle,
  Activity,
  Boxes,
  Handshake,
  Eye,
  SlidersHorizontal,
  Award,
  Zap,
  LayoutGrid,
  Inbox,
  DollarSign,
} from 'lucide-react';
import type { NavSection } from '../../components/dashboard-layout';

export const getPortalSections = (t: (key: string, fallback?: string) => string): NavSection[] => [
  {
    items: [
      { to: '/portal', label: t('dashboard.dashboard', 'Dashboard'), icon: LayoutDashboard, end: true },
      { to: '/portal/list-property', label: t('dashboard.listProperty', 'List Property'), icon: PlusCircle, end: true },
      { to: '/portal/bulk-upload', label: t('dashboard.bulkImport', 'Bulk Import'), icon: FileText },
      { to: '/portal/my-properties', label: t('dashboard.myProperties', 'My Properties'), icon: Building2 },
    ],
  },
  {
    heading: t('dashboard.activity', 'Activity'),
    items: [
      { to: '/portal/saved', label: t('dashboard.savedProps', 'Saved Properties'), icon: Heart },
      { to: '/portal/compare', label: t('dashboard.compare', 'Compare'), icon: GitCompare },
      { to: '/portal/enquiries', label: t('dashboard.myEnquiries', 'My Enquiries'), icon: MessageSquare },
      { to: '/portal/notifications', label: t('dashboard.notifications', 'Notifications'), icon: Bell },
    ],
  },
  {
    heading: t('dashboard.account', 'Account'),
    items: [
      { to: '/portal/subscription', label: t('dashboard.subscription', 'Subscription'), icon: Sparkles },
      { to: '/portal/invoices', label: t('dashboard.invoices', 'Invoices'), icon: Wallet },
      { to: '/portal/settings', label: t('dashboard.profileSettings', 'Edit Profile'), icon: Settings },
      { to: '/portal/help', label: t('dashboard.helpCenter', 'Help Center'), icon: HelpCircle },
    ],
  },
];

export const getAgentSections = (t: (key: string, fallback?: string) => string): NavSection[] => [
  {
    items: [{ to: '/agent', label: t('dashboard.dashboard', 'Dashboard'), icon: LayoutDashboard, end: true }],
  },
  {
    heading: t('dashboard.salesCrm', 'Sales & CRM'),
    items: [
      { to: '/agent/leads', label: t('dashboard.leads', 'Leads CRM'), icon: MessageSquare },
      { to: '/agent/crm', label: t('dashboard.crm', 'CRM Pipeline'), icon: Activity },
      { to: '/agent/clients', label: t('dashboard.customers', 'Customers'), icon: Users },
      { to: '/agent/appointments', label: t('dashboard.appointmentsHeader', 'Appointments'), icon: Calendar },
      { to: '/agent/appointments?tab=site_visits', label: t('dashboard.siteVisits', 'Site Visits'), icon: Eye },
      { to: '/agent/negotiations', label: t('dashboard.negotiations', 'Negotiations'), icon: Tag },
    ],
  },
  {
    heading: t('dashboard.listings', 'Listings'),
    items: [
      { to: '/agent/list-property', label: t('dashboard.listProperty', 'List Property'), icon: PlusCircle, end: true },
      { to: '/agent/my-properties', label: t('dashboard.myProperties', 'My Properties'), icon: Building2 },
      { to: '/agent/properties', label: t('dashboard.assignedProperties', 'Assigned Properties'), icon: Building },
      { to: '/agent/bulk-upload', label: t('dashboard.bulkImport', 'Bulk Import'), icon: FileText },
    ],
  },
  {
    heading: t('dashboard.operations', 'Operations'),
    items: [
      { to: '/agent/tasks', label: t('dashboard.tasks', 'Tasks'), icon: LayoutTemplate },
      { to: '/agent/documents', label: t('dashboard.documents', 'Documents'), icon: FileText },
      { to: '/agent/commissions', label: t('dashboard.commissions', 'Commissions & Invoices'), icon: Wallet },
    ],
  },
  {
    heading: t('dashboard.marketing', 'Marketing'),
    items: [
      { to: '/agent/marketing', label: t('dashboard.marketing', 'Marketing'), icon: Megaphone },
    ],
  },
  {
    heading: t('dashboard.insights', 'Insights'),
    items: [
      { to: '/agent/analytics', label: t('dashboard.analytics', 'Analytics'), icon: Sparkles },
      { to: '/agent/reports', label: t('dashboard.reports', 'Reports'), icon: ScrollText },
      { to: '/agent/notifications', label: t('dashboard.notifications', 'Notifications'), icon: Bell },
      { to: '/agent/ai-assistant', label: t('dashboard.aiAssistant', 'AI Assistant'), icon: Sparkles },
    ],
  },
  {
    heading: t('dashboard.account', 'Account'),
    items: [
      { to: '/agent/profile', label: t('dashboard.profile', 'Profile'), icon: UserCircle },
      { to: '/agent/settings', label: t('dashboard.settings', 'Settings'), icon: Settings },
    ],
  },
];

export const getAdminSections = (t: (key: string, fallback?: string) => string): NavSection[] => [
  {
    items: [
      { to: '/admin', label: t('dashboard.dashboard', 'Dashboard'), icon: LayoutDashboard, end: true },
      { to: '/admin/new-leads', label: t('dashboard.newLeads', 'New Leads'), icon: Sparkles },
      { to: '/admin/properties', label: t('dashboard.listedProperties', 'Listed Properties'), icon: Building2 },
      { to: '/admin/bulk-import', label: t('dashboard.bulkImport', 'Bulk Import'), icon: FileText },
      { to: '/admin/approvals', label: t('dashboard.approvals', 'Approvals'), icon: FileCheck },
      { to: '/admin/leads', label: t('dashboard.allLeads', 'All Leads'), icon: Inbox },
    ],
  },
  {
    heading: t('dashboard.promotions', 'PROMOTIONS'),
    items: [
      {
        key: 'paid-campaign',
        label: t('dashboard.paidCampaign', 'PAID CAMPAIGN'),
        icon: Megaphone,
        children: [
          { to: '/admin/paid-campaign', label: t('dashboard.campaignDashboard', 'Campaign Dashboard'), icon: LayoutDashboard, end: true },
          { to: '/admin/paid-campaign/featured-properties', label: t('dashboard.featuredProperties', 'Featured Properties'), icon: Sparkles },
          { to: '/admin/paid-campaign/two-column-slider', label: t('dashboard.curatedLuxuryLiving', 'Curated Luxury Living'), icon: SlidersHorizontal },
          { to: '/admin/paid-campaign/explore-builders', label: t('dashboard.exploreBuilders', 'Explore Builders on RealtyNow'), icon: Building2 },
          { to: '/admin/paid-campaign/signature-collection', label: t('dashboard.signatureCollection', 'Signature Collection'), icon: Award },
          { to: '/admin/paid-campaign/three-column-properties', label: t('dashboard.primeInvestments', 'Prime Investment Opportunities'), icon: LayoutGrid },
          { to: '/admin/paid-campaign/realtynow-exclusive', label: t('dashboard.realtynowExclusive', 'RealtyNow Exclusive'), icon: Zap },
        ],
      },
    ],
  },
  {
    heading: t('dashboard.roleCrm', 'ROLE CRM'),
    items: [
      {
        key: 'agent',
        label: t('dashboard.agent', 'AGENT'),
        icon: Users,
        children: [
          { to: '/admin/agent-applications', label: t('dashboard.agentApps', 'Agent Applications'), icon: ClipboardList },
          { to: '/admin/agent/leads', label: t('dashboard.leads', 'Leads'), icon: UserPlus },
          { to: '/admin/agent/kanban', label: t('dashboard.kanbanFlow', 'Kanban Flow'), icon: Kanban },
          { to: '/admin/agent/directory', label: t('dashboard.agentsDirectory', 'Agents Directory'), icon: Users },
          { to: '/admin/agent/property-assignments', label: t('dashboard.propertyAssignments', 'Property Assignments'), icon: UserCheck },
          { to: '/admin/agent/follow-ups', label: t('dashboard.followUps', 'Follow-ups'), icon: CalendarClock },
          { to: '/admin/agent/performance', label: t('dashboard.performance', 'Performance'), icon: TrendingUp },
          { to: '/admin/agent/documents', label: t('dashboard.documents', 'Documents'), icon: FileText },
        ],
      },
      {
        key: 'builder',
        label: t('dashboard.builder', 'BUILDER'),
        icon: Building2,
        children: [
          { to: '/admin/builder-applications', label: t('dashboard.builderApps', 'Builder Applications'), icon: ClipboardList },
          { to: '/admin/builder/leads', label: t('dashboard.leads', 'Leads'), icon: UserPlus },
          { to: '/admin/builder/kanban', label: t('dashboard.kanbanFlow', 'Kanban Flow'), icon: Kanban },
          { to: '/admin/builder/directory', label: t('dashboard.buildersDirectory', 'Builders Directory'), icon: Building2 },
          { to: '/admin/builder/projects', label: t('dashboard.projects', 'Projects'), icon: Building },
          { to: '/admin/builder/project-approvals', label: t('dashboard.projectApprovals', 'Project Approvals'), icon: ShieldCheck },
          { to: '/admin/builder/assignments', label: t('dashboard.assignments', 'Assignments'), icon: UserCheck },
          { to: '/admin/builder/performance', label: t('dashboard.performance', 'Performance'), icon: TrendingUp },
          { to: '/admin/builder/documents', label: t('dashboard.documents', 'Documents'), icon: FileText },
        ],
      },
      {
        key: 'partner',
        label: t('dashboard.partner', 'PARTNER'),
        icon: Handshake,
        children: [
          { to: '/admin/partner-applications', label: t('dashboard.partnerApps', 'Partner Applications'), icon: ClipboardList },
          { to: '/admin/partner/leads', label: t('dashboard.leads', 'Leads'), icon: UserPlus },
          { to: '/admin/partner/kanban', label: t('dashboard.kanbanFlow', 'Kanban Flow'), icon: Kanban },
          { to: '/admin/partner/directory', label: t('dashboard.partnersDirectory', 'Partners Directory'), icon: Users },
          { to: '/admin/partner/referrals', label: t('dashboard.referrals', 'Referrals'), icon: Handshake },
          { to: '/admin/partner/assignments', label: t('dashboard.assignments', 'Assignments'), icon: UserCheck },
          { to: '/admin/partner/follow-ups', label: t('dashboard.followUps', 'Follow-ups'), icon: CalendarClock },
          { to: '/admin/partner/performance', label: t('dashboard.performance', 'Performance'), icon: TrendingUp },
          { to: '/admin/partner/documents', label: t('dashboard.documents', 'Documents'), icon: FileText },
        ],
      },
      {
        key: 'business-partner',
        label: t('dashboard.businessPartner', 'BUSINESS PARTNER'),
        icon: Briefcase,
        children: [
          { to: '/admin/business-partners', label: t('dashboard.businessPartners', 'Applications'), icon: ClipboardList },
          { to: '/admin/business-partner/leads', label: t('dashboard.leads', 'Leads'), icon: UserPlus },
          { to: '/admin/business-partner/kanban', label: t('dashboard.kanbanFlow', 'Kanban Flow'), icon: Kanban },
          { to: '/admin/business-partner/directory', label: t('dashboard.directory', 'Directory'), icon: Briefcase },
          { to: '/admin/business-partner/opportunities', label: t('dashboard.opportunities', 'Opportunities'), icon: Target },
          { to: '/admin/business-partner/deals', label: t('dashboard.deals', 'Deals'), icon: Tag },
          { to: '/admin/business-partner/assignments', label: t('dashboard.assignments', 'Assignments'), icon: UserCheck },
          { to: '/admin/business-partner/follow-ups', label: t('dashboard.followUps', 'Follow-ups'), icon: CalendarClock },
          { to: '/admin/business-partner/performance', label: t('dashboard.performance', 'Performance'), icon: TrendingUp },
          { to: '/admin/business-partner/payouts', label: t('dashboard.payouts', 'Payouts'), icon: Wallet },
          { to: '/admin/business-partner/documents', label: t('dashboard.documents', 'Documents'), icon: FileText },
        ],
      },
    ],
  },
  {
    items: [
      { to: '/admin/customers', label: t('dashboard.customers', 'Customers'), icon: Heart },
      { to: '/admin/agents', label: t('dashboard.agents', 'Agents'), icon: Users },
      { to: '/admin/subscriptions', label: t('dashboard.subscriptionPlans', 'Subscription Plans'), icon: Sparkles },
      { to: '/admin/invoices', label: t('dashboard.invoices', 'Invoices'), icon: Wallet },
      { to: '/admin/notifications', label: t('dashboard.notifications', 'Notifications'), icon: Bell },
    ],
  },
  {
    heading: t('dashboard.content', 'Content'),
    items: [
      { to: '/admin/cms', label: t('dashboard.cms', 'Homepage CMS'), icon: LayoutDashboard },
      { to: '/admin/blogs', label: t('dashboard.blogs', 'Blogs'), icon: FileText },
      { to: '/admin/testimonials', label: t('dashboard.testimonials', 'Testimonials'), icon: Star },
      { to: '/admin/faqs', label: t('dashboard.faqs', 'FAQs'), icon: HelpCircle },
      { to: '/admin/advertisements', label: t('dashboard.advertisements', 'Advertisements'), icon: Megaphone },
      { to: '/admin/hero-campaigns', label: t('dashboard.heroCampaigns', 'Hero Campaigns'), icon: Image },
      { to: '/admin/languages', label: t('dashboard.languages', 'Languages & i18n'), icon: ShieldCheck },
    ],
  },
  {
    heading: t('dashboard.system', 'System'),
    items: [
      { to: '/admin/master', label: t('dashboard.masterData', 'Master Data'), icon: Settings },
      { to: '/admin/audit', label: t('dashboard.auditLogs', 'Audit Logs'), icon: ScrollText },
      { to: '/admin/property-page-settings', label: t('dashboard.propertyPageSettings', 'Property Page Settings'), icon: LayoutTemplate },
      { to: '/admin/settings', label: t('dashboard.settings', 'Settings'), icon: ShieldCheck },
      { to: '/admin/security', label: t('dashboard.security', 'Security'), icon: Lock },
    ],
  },
];

export const getBuilderSections = (t: (key: string, fallback?: string) => string): NavSection[] => [
  {
    items: [{ to: '/builder', label: t('dashboard.dashboard', 'Dashboard'), icon: LayoutDashboard, end: true }],
  },
  {
    heading: t('dashboard.salesCrm', 'Sales & CRM'),
    items: [
      { to: '/builder/leads', label: t('dashboard.leads', 'Leads CRM'), icon: MessageSquare },
      { to: '/builder/crm', label: t('dashboard.crm', 'CRM'), icon: Activity },
      { to: '/builder/bookings', label: t('dashboard.bookings', 'Bookings'), icon: Calendar },
      { to: '/builder/customers', label: t('dashboard.customers', 'Customers'), icon: Heart },
      { to: '/builder/agents', label: t('dashboard.agents', 'Agents'), icon: Users },
    ],
  },
  {
    heading: t('dashboard.inventory', 'Inventory'),
    items: [
      { to: '/builder/projects', label: t('dashboard.projects', 'Projects'), icon: Building2 },
      { to: '/builder/blocks', label: t('dashboard.blocks', 'Blocks'), icon: Layers },
      { to: '/builder/floors', label: t('dashboard.floors', 'Floors'), icon: Grid3x3 },
      { to: '/builder/units', label: t('dashboard.units', 'Units'), icon: Boxes },
      { to: '/builder/pricing', label: t('dashboard.pricing', 'Pricing'), icon: Tag },
      { to: '/builder/floor-plans', label: t('dashboard.floorPlans', 'Floor Plans'), icon: LayoutTemplate },
    ],
  },
  {
    heading: t('dashboard.operations', 'Operations'),
    items: [
      { to: '/builder/construction', label: t('dashboard.construction', 'Construction Progress'), icon: HardHat },
      { to: '/builder/payments', label: t('dashboard.payments', 'Payment Tracking'), icon: Wallet },
      { to: '/builder/invoices', label: t('dashboard.invoices', 'Invoices'), icon: FileText },
      { to: '/builder/documents', label: t('dashboard.documents', 'Documents'), icon: FileText },
    ],
  },
  {
    heading: t('dashboard.marketing', 'Marketing'),
    items: [
      { to: '/builder/marketing', label: t('dashboard.marketing', 'Marketing'), icon: Megaphone },
      { to: '/builder/gallery', label: t('dashboard.gallery', 'Gallery'), icon: Image },
    ],
  },
  {
    heading: t('dashboard.insights', 'Insights'),
    items: [
      { to: '/builder/analytics', label: t('dashboard.analytics', 'Analytics'), icon: Sparkles },
      { to: '/builder/reports', label: t('dashboard.reports', 'Reports'), icon: ScrollText },
      { to: '/builder/notifications', label: t('dashboard.notifications', 'Notifications'), icon: Bell },
      { to: '/builder/ai-assistant', label: t('dashboard.aiAssistant', 'AI Assistant'), icon: Sparkles },
    ],
  },
  {
    heading: t('dashboard.account', 'Account'),
    items: [
      { to: '/builder/profile', label: t('dashboard.profile', 'Profile'), icon: UserCircle },
      { to: '/builder/settings', label: t('dashboard.settings', 'Settings'), icon: Settings },
    ],
  },
];

export const getPartnerSections = (t: (key: string, fallback?: string) => string): NavSection[] => [
  {
    items: [
      { to: '/partner', label: t('dashboard.dashboard', 'Dashboard'), icon: LayoutDashboard, end: true },
    ],
  },
  {
    heading: t('dashboard.referralsAndSales', 'REFERRALS & SALES'),
    items: [
      { to: '/partner/referrals', label: t('dashboard.referrals', 'My Referrals'), icon: Handshake },
      { to: '/partner/referrals/new', label: t('dashboard.submitReferral', 'Submit Referral'), icon: PlusCircle },
      { to: '/partner/leads', label: t('dashboard.leadsPipeline', 'Leads Pipeline'), icon: UserPlus },
      { to: '/partner/kanban', label: t('dashboard.kanbanFlow', 'Kanban Flow'), icon: Kanban },
    ],
  },
  {
    heading: t('dashboard.financesAndCommissions', 'FINANCES & COMMISSIONS'),
    items: [
      { to: '/partner/earnings', label: t('dashboard.earnings', 'Earnings & Wallet'), icon: Wallet },
      { to: '/partner/payouts', label: t('dashboard.payoutRequests', 'Payout Requests'), icon: DollarSign },
      { to: '/partner/invoices', label: t('dashboard.commissionInvoices', 'Commission Invoices'), icon: FileText },
    ],
  },
  {
    heading: t('dashboard.operations', 'OPERATIONS'),
    items: [
      { to: '/partner/assignments', label: t('dashboard.assignedAgents', 'Assigned Agents'), icon: UserCheck },
      { to: '/partner/follow-ups', label: t('dashboard.followUpsAndTasks', 'Follow-ups & Tasks'), icon: CalendarClock },
      { to: '/partner/documents', label: t('dashboard.documentsAndKyc', 'Documents & KYC'), icon: FileText },
    ],
  },
  {
    heading: t('dashboard.growthAndTools', 'GROWTH & TOOLS'),
    items: [
      { to: '/partner/tools', label: t('dashboard.referralLinkAndQr', 'Referral Link & QR'), icon: Sparkles },
      { to: '/partner/analytics', label: t('dashboard.analytics', 'Analytics'), icon: TrendingUp },
      { to: '/partner/notifications', label: t('dashboard.notifications', 'Notifications'), icon: Bell },
    ],
  },
  {
    heading: t('dashboard.account', 'Account'),
    items: [
      { to: '/partner/profile', label: t('dashboard.profile', 'My Profile'), icon: UserCircle },
      { to: '/partner/settings', label: t('dashboard.settings', 'Settings'), icon: Settings },
    ],
  },
];
