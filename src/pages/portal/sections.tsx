import {
  LayoutDashboard,
  Building2,
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
  Users,
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
} from 'lucide-react';
import type { NavSection } from '../../components/dashboard-layout';

export const getPortalSections = (t: (key: string, fallback?: string) => string): NavSection[] => [
  {
    items: [
      { to: '/portal', label: t('dashboard:dashboard', 'Dashboard'), icon: LayoutDashboard, end: true },
      { to: '/portal/list-property', label: t('dashboard:listProperty', 'List Property'), icon: PlusCircle, end: true },
      { to: '/portal/list-property/new', label: 'New Listing (Beta)', icon: Sparkles },
      { to: '/portal/bulk-upload', label: 'Bulk Import', icon: FileText },
      { to: '/portal/my-properties', label: t('dashboard:myProperties', 'My Properties'), icon: Building2 },
    ],
  },
  {
    heading: t('dashboard:activity', 'Activity'),
    items: [
      { to: '/portal/saved', label: t('common:saved', 'Saved Properties'), icon: Heart },
      { to: '/portal/compare', label: t('dashboard:compare', 'Compare'), icon: GitCompare },
      { to: '/portal/enquiries', label: t('dashboard:myEnquiries', 'My Enquiries'), icon: MessageSquare },
      { to: '/portal/notifications', label: t('dashboard:notifications', 'Notifications'), icon: Bell },
    ],
  },
  {
    heading: t('dashboard:account', 'Account'),
    items: [
      { to: '/portal/subscription', label: t('dashboard:subscription', 'Subscription'), icon: Sparkles },
      { to: '/portal/invoices', label: t('dashboard:invoices', 'Invoices'), icon: Wallet },
      { to: '/portal/settings', label: t('common:editProfile', 'Edit Profile'), icon: Settings },
      { to: '/portal/help', label: t('dashboard:helpCenter', 'Help Center'), icon: HelpCircle },
    ],
  },
];

export const getAgentSections = (t: (key: string, fallback?: string) => string): NavSection[] => [
  {
    items: [{ to: '/agent', label: t('dashboard:dashboard', 'Dashboard'), icon: LayoutDashboard, end: true }],
  },
  {
    heading: t('dashboard:salesCrm', 'Sales & CRM'),
    items: [
      { to: '/agent/leads', label: t('dashboard:leads', 'Leads CRM'), icon: MessageSquare },
      { to: '/agent/crm', label: t('dashboard:crm', 'CRM Pipeline'), icon: Activity },
      { to: '/agent/clients', label: t('dashboard:customers', 'Customers'), icon: Users },
      { to: '/agent/appointments', label: t('dashboard:appointmentsHeader', 'Appointments'), icon: Calendar },
      { to: '/agent/appointments?tab=site_visits', label: t('dashboard:siteVisits', 'Site Visits'), icon: Eye },
      { to: '/agent/negotiations', label: t('dashboard:negotiations', 'Negotiations'), icon: Tag },
    ],
  },
  {
    heading: t('dashboard:listings', 'Listings'),
    items: [
      { to: '/agent/list-property', label: t('dashboard:listProperty', 'List Property'), icon: PlusCircle, end: true },
      { to: '/agent/properties', label: t('dashboard:properties', 'Assigned Properties'), icon: Building2 },
      { to: '/agent/bulk-upload', label: 'Bulk Import', icon: FileText },
    ],
  },
  {
    heading: t('dashboard:operations', 'Operations'),
    items: [
      { to: '/agent/tasks', label: t('dashboard:tasks', 'Tasks'), icon: LayoutTemplate },
      { to: '/agent/documents', label: t('dashboard:documents', 'Documents'), icon: FileText },
      { to: '/agent/commissions', label: t('dashboard:commissions', 'Commissions & Invoices'), icon: Wallet },
    ],
  },
  {
    heading: t('dashboard:marketing', 'Marketing'),
    items: [
      { to: '/agent/marketing', label: t('dashboard:marketing', 'Marketing'), icon: Megaphone },
    ],
  },
  {
    heading: t('dashboard:insights', 'Insights'),
    items: [
      { to: '/agent/analytics', label: t('dashboard:analytics', 'Analytics'), icon: Sparkles },
      { to: '/agent/reports', label: t('dashboard:reports', 'Reports'), icon: ScrollText },
      { to: '/agent/notifications', label: t('dashboard:notifications', 'Notifications'), icon: Bell },
      { to: '/agent/ai-assistant', label: t('dashboard:aiAssistant', 'AI Assistant'), icon: Sparkles },
    ],
  },
  {
    heading: t('dashboard:account', 'Account'),
    items: [
      { to: '/agent/profile', label: t('dashboard:profile', 'Profile'), icon: UserCircle },
      { to: '/agent/settings', label: t('common:settings', 'Settings'), icon: Settings },
    ],
  },
];

export const getAdminSections = (t: (key: string, fallback?: string) => string): NavSection[] => [
  {
    items: [
      { to: '/admin', label: t('dashboard:dashboard', 'Dashboard'), icon: LayoutDashboard, end: true },
      { to: '/admin/properties', label: t('dashboard:listedProperties', 'Listed Properties'), icon: Building2 },
      { to: '/admin/bulk-import', label: 'Bulk Import', icon: FileText },
      { to: '/admin/approvals', label: t('dashboard:approvals', 'Approvals'), icon: FileText },
      { to: '/admin/agent-applications', label: t('dashboard:agentApps', 'Agent Applications'), icon: Users },
      { to: '/admin/builder-applications', label: t('dashboard:builderApps', 'Builder Applications'), icon: Building2 },
      { to: '/admin/partner-applications', label: t('dashboard:partnerApps', 'Partner Applications'), icon: Handshake },
      { to: '/admin/business-partners', label: t('dashboard:businessPartners', 'Business Partners'), icon: Users },
      { to: '/admin/customers', label: t('dashboard:customers', 'Customers'), icon: Heart },
      { to: '/admin/agents', label: t('dashboard:agents', 'Agents'), icon: Users },
      { to: '/admin/invoices', label: t('dashboard:invoices', 'Invoices'), icon: FileText },
      { to: '/admin/notifications', label: t('dashboard:notifications', 'Notifications'), icon: Bell },
    ],
  },
  {
    heading: t('dashboard:content', 'Content'),
    items: [
      { to: '/admin/cms', label: t('dashboard:cms', 'Homepage CMS'), icon: LayoutDashboard },
      { to: '/admin/blogs', label: t('dashboard:blogs', 'Blogs'), icon: FileText },
      { to: '/admin/testimonials', label: t('dashboard:testimonials', 'Testimonials'), icon: Star },
      { to: '/admin/faqs', label: t('dashboard:faqs', 'FAQs'), icon: HelpCircle },
      { to: '/admin/advertisements', label: t('dashboard:advertisements', 'Advertisements'), icon: Megaphone },
      { to: '/admin/hero-campaigns', label: t('dashboard:heroCampaigns', 'Hero Campaigns'), icon: Image },
      { to: '/admin/languages', label: t('dashboard:languages', 'Languages & i18n'), icon: ShieldCheck },
    ],
  },
  {
    heading: t('dashboard:system', 'System'),
    items: [
      { to: '/admin/master', label: t('dashboard:masterData', 'Master Data'), icon: Settings },
      { to: '/admin/audit', label: t('dashboard:auditLogs', 'Audit Logs'), icon: ScrollText },
      { to: '/admin/property-page-settings', label: t('dashboard:propertyPageSettings', 'Property Page Settings'), icon: LayoutTemplate },
      { to: '/admin/settings', label: t('dashboard:settings', 'Settings'), icon: ShieldCheck },
      { to: '/admin/security', label: t('dashboard:security', 'Security'), icon: Lock },
    ],
  },
];

export const getBuilderSections = (t: (key: string, fallback?: string) => string): NavSection[] => [
  {
    items: [{ to: '/builder', label: t('dashboard:dashboard', 'Dashboard'), icon: LayoutDashboard, end: true }],
  },
  {
    heading: t('dashboard:salesCrm', 'Sales & CRM'),
    items: [
      { to: '/builder/leads', label: t('dashboard:leads', 'Leads CRM'), icon: MessageSquare },
      { to: '/builder/crm', label: t('dashboard:crm', 'CRM'), icon: Activity },
      { to: '/builder/bookings', label: t('dashboard:bookings', 'Bookings'), icon: Calendar },
      { to: '/builder/customers', label: t('dashboard:customers', 'Customers'), icon: Heart },
      { to: '/builder/agents', label: t('dashboard:agents', 'Agents'), icon: Users },
    ],
  },
  {
    heading: t('dashboard:inventory', 'Inventory'),
    items: [
      { to: '/builder/projects', label: t('dashboard:projects', 'Projects'), icon: Building2 },
      { to: '/builder/blocks', label: t('dashboard:blocks', 'Blocks'), icon: Layers },
      { to: '/builder/floors', label: t('dashboard:floors', 'Floors'), icon: Grid3x3 },
      { to: '/builder/units', label: t('dashboard:units', 'Units'), icon: Boxes },
      { to: '/builder/pricing', label: t('dashboard:pricing', 'Pricing'), icon: Tag },
      { to: '/builder/floor-plans', label: t('dashboard:floorPlans', 'Floor Plans'), icon: LayoutTemplate },
    ],
  },
  {
    heading: t('dashboard:operations', 'Operations'),
    items: [
      { to: '/builder/construction', label: t('dashboard:construction', 'Construction Progress'), icon: HardHat },
      { to: '/builder/payments', label: t('dashboard:payments', 'Payment Tracking'), icon: Wallet },
      { to: '/builder/invoices', label: t('dashboard:invoices', 'Invoices'), icon: FileText },
      { to: '/builder/documents', label: t('dashboard:documents', 'Documents'), icon: FileText },
    ],
  },
  {
    heading: t('dashboard:marketing', 'Marketing'),
    items: [
      { to: '/builder/marketing', label: t('dashboard:marketing', 'Marketing'), icon: Megaphone },
      { to: '/builder/gallery', label: t('dashboard:gallery', 'Gallery'), icon: Image },
    ],
  },
  {
    heading: t('dashboard:insights', 'Insights'),
    items: [
      { to: '/builder/analytics', label: t('dashboard:analytics', 'Analytics'), icon: Sparkles },
      { to: '/builder/reports', label: t('dashboard:reports', 'Reports'), icon: ScrollText },
      { to: '/builder/notifications', label: t('dashboard:notifications', 'Notifications'), icon: Bell },
      { to: '/builder/ai-assistant', label: t('dashboard:aiAssistant', 'AI Assistant'), icon: Sparkles },
    ],
  },
  {
    heading: t('dashboard:account', 'Account'),
    items: [
      { to: '/builder/profile', label: t('dashboard:profile', 'Profile'), icon: UserCircle },
      { to: '/builder/settings', label: t('common:settings', 'Settings'), icon: Settings },
    ],
  },
];

export const getPartnerSections = (t: (key: string, fallback?: string) => string): NavSection[] => [
  {
    items: [
      { to: '/partner', label: t('dashboard:dashboard', 'Dashboard'), icon: LayoutDashboard, end: true },
      { to: '/partner/profile', label: t('dashboard:profile', 'My Profile'), icon: UserCircle },
    ],
  },
];
