import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Mail, MessageSquareText, Smartphone, Bell as BellIcon } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { useToast } from '../toast';
import { Modal, Button } from '../ui';
import type { NotificationPreferences } from '../../lib/types';

const CHANNELS: { key: keyof NotificationPreferences; label: string; icon: typeof Mail; hint: string }[] = [
  { key: 'in_app', label: 'In-app', icon: BellIcon, hint: 'Notification bell + this page' },
  { key: 'email', label: 'Email', icon: Mail, hint: 'Sent to your account email' },
  { key: 'sms', label: 'SMS', icon: MessageSquareText, hint: 'Sent to your registered mobile' },
  { key: 'whatsapp', label: 'WhatsApp', icon: MessageSquareText, hint: 'Sent via WhatsApp Business' },
  { key: 'push', label: 'Push', icon: Smartphone, hint: 'Browser / PWA push notifications' },
];

const CATEGORY_TOGGLES: { key: keyof NotificationPreferences; label: string }[] = [
  { key: 'property_updates', label: 'Property updates' },
  { key: 'lead_updates', label: 'Enquiries & leads' },
  { key: 'payment_updates', label: 'Payments & invoices' },
  { key: 'system_alerts', label: 'System alerts' },
  { key: 'marketing', label: 'Promotions & offers' },
];

export function NotificationPreferencesModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [prefs, setPrefs] = useState<Partial<NotificationPreferences>>({});
  const [saving, setSaving] = useState(false);

  const { data } = useQuery({
    queryKey: ['notification-preferences', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('notification_preferences').select('*').eq('user_id', user!.id).maybeSingle();
      return data as NotificationPreferences | null;
    },
    enabled: !!user && open,
  });

  useEffect(() => {
    if (data) setPrefs(data);
    else if (open) {
      setPrefs({
        in_app: true,
        email: true,
        sms: true,
        whatsapp: false,
        push: true,
        marketing: true,
        property_updates: true,
        lead_updates: true,
        payment_updates: true,
        system_alerts: true,
      });
    }
  }, [data, open]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('notification_preferences').upsert({ ...prefs, user_id: user!.id });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.addToast('success', 'Preferences saved');
      queryClient.invalidateQueries({ queryKey: ['notification-preferences'] });
      onClose();
    },
    onError: (err: Error) => toast.addToast('error', err.message),
  });

  const toggle = (key: keyof NotificationPreferences) => setPrefs((p) => ({ ...p, [key]: !p[key] }));

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Notification Preferences"
      footer={
        <div className="flex w-full items-center justify-between">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            loading={saving || saveMutation.isPending}
            onClick={() => {
              setSaving(true);
              saveMutation.mutate(undefined, { onSettled: () => setSaving(false) });
            }}
          >
            Save Preferences
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-navy-400">Delivery channels</p>
          <div className="space-y-2">
            {CHANNELS.map(({ key, label, icon: Icon, hint }) => (
              <label
                key={key}
                className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-navy-100 p-3 dark:border-navy-700"
              >
                <div className="flex items-center gap-3">
                  <Icon className="h-4 w-4 text-navy-400" />
                  <div>
                    <p className="text-sm font-semibold text-navy-900 dark:text-white">{label}</p>
                    <p className="text-xs text-navy-400">{hint}</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={!!prefs[key]}
                  onChange={() => toggle(key)}
                  className="h-4 w-4 rounded border-navy-300 text-red-600 focus:ring-red-400"
                />
              </label>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-navy-400">Categories</p>
          <div className="space-y-1.5">
            {CATEGORY_TOGGLES.map(({ key, label }) => (
              <label key={key} className="flex cursor-pointer items-center justify-between gap-3 py-1">
                <span className="text-sm text-navy-700 dark:text-navy-200">{label}</span>
                <input
                  type="checkbox"
                  checked={!!prefs[key]}
                  onChange={() => toggle(key)}
                  className="h-4 w-4 rounded border-navy-300 text-red-600 focus:ring-red-400"
                />
              </label>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}
