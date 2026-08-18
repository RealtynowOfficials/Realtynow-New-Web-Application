import { useState } from 'react';
import { Bell, X } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { useToast } from './toast';
import { enablePushNotifications, getPermissionStatus, isPushSupported } from '../lib/push';
import { cn } from '../lib/utils';

const DISMISS_KEY = 'realtynow_push_prompt_dismissed';

/**
 * Central, reusable "Enable Notifications" prompt.
 *
 * Shows the browser's real native permission dialog (via enablePushNotifications
 * -> Notification.requestPermission()) only after the user explicitly clicks
 * the in-app button below — never automatically on page load. Renders nothing
 * once permission is granted/denied or the user dismisses it, so it never
 * nags on every page/refresh (see requirement: no repeated auto-popups).
 */
export function EnableNotificationsCard({
  context = 'your listings',
  className,
}: {
  /** What this update is about, used in the copy, e.g. "your listings" / "your properties" */
  context?: string;
  className?: string;
}) {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(DISMISS_KEY) === '1');
  const [loading, setLoading] = useState(false);

  if (!user || dismissed || !isPushSupported() || getPermissionStatus() !== 'default') {
    return null;
  }

  const dismiss = () => {
    setDismissed(true);
    localStorage.setItem(DISMISS_KEY, '1');
  };

  const enable = async () => {
    setLoading(true);
    const result = await enablePushNotifications(user.id);
    setLoading(false);
    dismiss();

    if (!result.success) {
      addToast('error', result.error ?? 'Could not enable notifications');
    } else if (result.degraded) {
      addToast('info', 'Notifications enabled for this tab. Background push is not fully configured yet.');
    } else {
      addToast('success', 'Notifications enabled');
    }
  };

  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-2xl border border-red-100 bg-red-50/60 p-4',
        className,
      )}
    >
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-red-600 text-white">
        <Bell className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-display text-sm font-bold text-navy-900">Stay Updated</p>
        <p className="mt-0.5 text-xs text-navy-500">
          Get notified about {context} — approvals, enquiries and important account updates.
        </p>
        <button
          onClick={enable}
          disabled={loading}
          className="mt-2.5 rounded-xl bg-red-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-red-700 disabled:opacity-60 transition"
        >
          {loading ? 'Enabling…' : 'Enable Notifications'}
        </button>
      </div>
      <button
        onClick={dismiss}
        aria-label="Dismiss"
        className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-navy-400 hover:bg-white hover:text-navy-600 transition"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
