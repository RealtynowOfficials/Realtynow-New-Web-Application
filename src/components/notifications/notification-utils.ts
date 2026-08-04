import type { Notification } from '../../lib/types';

export type NotificationCategory =
  | 'Property'
  | 'AI Verification'
  | 'Approval'
  | 'Enquiry'
  | 'Appointment'
  | 'Subscription'
  | 'Payment'
  | 'System'
  | 'Promotions';

export const CATEGORIES: NotificationCategory[] = [
  'Property',
  'AI Verification',
  'Approval',
  'Enquiry',
  'Appointment',
  'Subscription',
  'Payment',
  'System',
  'Promotions',
];

export type UiPriority = 'Critical' | 'High' | 'Medium' | 'Low';
export const PRIORITIES: UiPriority[] = ['Critical', 'High', 'Medium', 'Low'];

export type NotifStatus = 'Unread' | 'Read' | 'Archived';

// notification_templates.category is one of: property | crm | payment | renewal | system.
// Ad-hoc notify_user() calls (no template) only ever set `type`, so those are matched by
// substring against the vocabulary actually used across the migrations/edge functions.
export function categorize(notif: Notification): NotificationCategory {
  const key = (notif.template_key ?? '').toLowerCase();
  const type = (notif.type ?? '').toLowerCase();

  if (key.startsWith('appointment')) return 'Appointment';
  if (type.includes('appointment')) return 'Appointment';
  if (type === 'property_verification' || type.includes('ai_verif')) return 'AI Verification';
  if (type.includes('approv') || key.includes('approv') || type.includes('kyc')) return 'Approval';
  if (key.startsWith('lead_') || type.startsWith('lead_') || type.includes('follow_up')) return 'Enquiry';
  if (key === 'renewal' || type.includes('renewal') || type.includes('subscription')) return 'Subscription';
  if (key === 'payment' || type.includes('payment') || type.includes('invoice')) return 'Payment';
  if (type.includes('promo') || type.includes('marketing')) return 'Promotions';
  if (key === 'property' || type.startsWith('property_')) return 'Property';
  return 'System';
}

export function toUiPriority(notif: Notification): UiPriority {
  switch (notif.priority) {
    case 'urgent':
      return 'Critical';
    case 'high':
      return 'High';
    case 'low':
      return 'Low';
    default:
      return 'Medium';
  }
}

export function statusOf(notif: Notification): NotifStatus {
  if (notif.is_dismissed) return 'Archived';
  return notif.read_at ? 'Read' : 'Unread';
}

export function priorityBadgeVariant(p: UiPriority): 'error' | 'warning' | 'info' | 'default' {
  if (p === 'Critical') return 'error';
  if (p === 'High') return 'warning';
  if (p === 'Medium') return 'info';
  return 'default';
}

type DateGroup = 'Today' | 'Yesterday' | 'This Week' | 'Earlier';

export function dateGroupOf(iso: string): DateGroup {
  const date = new Date(iso);
  const now = new Date();
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const today = startOfDay(now);
  const day = startOfDay(date);
  const diffDays = Math.round((today - day) / 86_400_000);

  if (diffDays <= 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays <= 7) return 'This Week';
  return 'Earlier';
}

export const DATE_GROUP_ORDER: DateGroup[] = ['Today', 'Yesterday', 'This Week', 'Earlier'];

export function groupByDate(items: Notification[]): { group: DateGroup; items: Notification[] }[] {
  const buckets = new Map<DateGroup, Notification[]>();
  for (const n of items) {
    const g = dateGroupOf(n.created_at);
    if (!buckets.has(g)) buckets.set(g, []);
    buckets.get(g)!.push(n);
  }
  return DATE_GROUP_ORDER.filter((g) => buckets.has(g)).map((g) => ({ group: g, items: buckets.get(g)! }));
}
