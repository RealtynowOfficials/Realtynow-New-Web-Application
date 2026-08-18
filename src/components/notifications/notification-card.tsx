import { motion } from 'framer-motion';
import {
  Home,
  ShieldCheck,
  CheckCircle2,
  MessageSquare,
  CalendarClock,
  RefreshCw,
  Wallet,
  Settings,
  Megaphone,
  Bell,
  Check,
  Archive,
  Trash2,
  ExternalLink,
} from 'lucide-react';
import type { Notification } from '../../lib/types';
import { Badge } from '../ui';
import { cn, relativeTime } from '../../lib/utils';
import { categorize, toUiPriority, priorityBadgeVariant, statusOf, type NotificationCategory } from './notification-utils';

const CATEGORY_ICON: Record<NotificationCategory, typeof Home> = {
  Property: Home,
  'AI Verification': ShieldCheck,
  Approval: CheckCircle2,
  Enquiry: MessageSquare,
  Appointment: CalendarClock,
  Subscription: RefreshCw,
  Payment: Wallet,
  System: Settings,
  Promotions: Megaphone,
};

const CATEGORY_TINT: Record<NotificationCategory, string> = {
  Property: 'bg-navy-100 text-navy-600',
  'AI Verification': 'bg-purple-100 text-purple-600',
  Approval: 'bg-success-100 text-success-700',
  Enquiry: 'bg-sky-100 text-sky-600',
  Appointment: 'bg-amber-100 text-amber-700',
  Subscription: 'bg-indigo-100 text-indigo-600',
  Payment: 'bg-emerald-100 text-emerald-700',
  System: 'bg-navy-100 text-navy-500',
  Promotions: 'bg-rose-100 text-rose-600',
};

export function NotificationCard({
  notif,
  selected,
  onToggleSelect,
  onView,
  onMarkRead,
  onArchive,
  onDelete,
}: {
  notif: Notification;
  selected: boolean;
  onToggleSelect: (checked: boolean) => void;
  onView: () => void;
  onMarkRead: () => void;
  onArchive: () => void;
  onDelete: () => void;
}) {
  const category = categorize(notif);
  const Icon = CATEGORY_ICON[category] ?? Bell;
  const priority = toUiPriority(notif);
  const status = statusOf(notif);
  const link = notif.action_url || notif.link;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2 }}
      className={cn(
        'group relative flex items-start gap-3 rounded-2xl border p-4 transition-colors sm:gap-4',
        status === 'Unread'
          ? 'border-red-100 bg-red-50/40 dark:border-red-900/40 dark:bg-red-950/10'
          : 'border-navy-100 bg-white dark:border-navy-800 dark:bg-navy-900',
        status === 'Archived' && 'opacity-60',
        'hover:shadow-sm dark:hover:shadow-none',
      )}
    >
      <input
        type="checkbox"
        checked={selected}
        onChange={(e) => onToggleSelect(e.target.checked)}
        className="mt-1.5 h-4 w-4 shrink-0 cursor-pointer rounded border-navy-300 text-red-600 focus:ring-red-400 accent-red-600"
        aria-label="Select notification"
      />

      <div className={cn('mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-xl', CATEGORY_TINT[category])}>
        <Icon className="h-4.5 w-4.5" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
          <p className={cn('text-sm text-navy-900 dark:text-white', status === 'Unread' ? 'font-bold' : 'font-semibold')}>
            {notif.title}
          </p>
          <span className="shrink-0 text-xs text-navy-400 dark:text-navy-500">{relativeTime(notif.created_at)}</span>
        </div>
        {notif.body && <p className="mt-0.5 text-sm text-navy-600 dark:text-navy-300 line-clamp-2">{notif.body}</p>}

        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <Badge variant="default" className="text-[10px]">
            {category}
          </Badge>
          <Badge variant={priorityBadgeVariant(priority)} className="text-[10px]">
            {priority}
          </Badge>
          {status === 'Unread' && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-red-600">
              <span className="h-1.5 w-1.5 rounded-full bg-red-600" /> Unread
            </span>
          )}
          {status === 'Archived' && (
            <span className="text-[10px] font-bold uppercase tracking-wide text-navy-400">Archived</span>
          )}
        </div>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1 opacity-100 sm:flex-row sm:items-center sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100">
        {link && (
          <button
            type="button"
            onClick={onView}
            title="View"
            className="grid h-8 w-8 place-items-center rounded-lg text-navy-400 hover:bg-navy-100 hover:text-navy-700 dark:hover:bg-navy-800"
          >
            <ExternalLink className="h-4 w-4" />
          </button>
        )}
        {status === 'Unread' && (
          <button
            type="button"
            onClick={onMarkRead}
            title="Mark as read"
            className="grid h-8 w-8 place-items-center rounded-lg text-navy-400 hover:bg-success-50 hover:text-success-600"
          >
            <Check className="h-4 w-4" />
          </button>
        )}
        {status !== 'Archived' && (
          <button
            type="button"
            onClick={onArchive}
            title="Archive"
            className="grid h-8 w-8 place-items-center rounded-lg text-navy-400 hover:bg-navy-100 hover:text-navy-700 dark:hover:bg-navy-800"
          >
            <Archive className="h-4 w-4" />
          </button>
        )}
        <button
          type="button"
          onClick={onDelete}
          title="Delete"
          className="grid h-8 w-8 place-items-center rounded-lg text-navy-400 hover:bg-error-50 hover:text-error-600"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </motion.div>
  );
}
