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
  LayoutTemplate,
} from 'lucide-react';
import type { NavSection } from '../../components/dashboard-layout';

export const getPortalSections = (t: (key: string, fallback?: string) => string): NavSection[] => [
  {
    items: [
      { to: '/portal', label: t('dashboard:dashboard', 'Dashboard'), icon: LayoutDashboard, end: true },
      { to: '/portal/list-property', label: t('dashboard:listProperty', 'List Property'), icon: PlusCircle },
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
    items: [
      { to: '/agent', label: t('dashboard:dashboard', 'Dashboard'), icon: LayoutDashboard, end: true },
      { to: '/agent/properties', label: t('dashboard:assignedProperties', 'Assigned Properties'), icon: Building2 },
      { to: '/agent/leads', label: t('dashboard:leads', 'Leads'), icon: MessageSquare },
      { to: '/agent/appointments', label: t('dashboard:appointmentsHeader', 'Appointments'), icon: Calendar },
      { to: '/portal/notifications', label: t('dashboard:notifications', 'Notifications'), icon: Bell },
    ],
  },
  {
    heading: t('dashboard:performance', 'Performance'),
    items: [
      { to: '/agent/analytics', label: t('dashboard:analytics', 'Analytics'), icon: Sparkles },
      { to: '/agent/settings', label: t('common:editProfile', 'Edit Profile'), icon: Settings },
    ],
  },
];

export const getAdminSections = (t: (key: string, fallback?: string) => string): NavSection[] => [
  {
    items: [
      { to: '/admin', label: t('dashboard:dashboard', 'Dashboard'), icon: LayoutDashboard, end: true },
      { to: '/admin/properties', label: t('dashboard:listProperty', 'Properties'), icon: Building2 },
      { to: '/admin/approvals', label: t('dashboard:approvals', 'Approvals'), icon: FileText },
      { to: '/admin/agent-applications', label: t('dashboard:agentApps', 'Agent Applications'), icon: Users },
      { to: '/admin/builder-applications', label: t('dashboard:builderApps', 'Builder Applications'), icon: Building2 },
      { to: '/admin/customers', label: t('dashboard:customers', 'Customers'), icon: Heart },
      { to: '/admin/agents', label: t('dashboard:agents', 'Agents'), icon: Users },
      { to: '/admin/invoices', label: t('dashboard:invoices', 'Invoices'), icon: FileText },
      { to: '/portal/notifications', label: t('dashboard:notifications', 'Notifications'), icon: Bell },
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
    ],
  },
];
