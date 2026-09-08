import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { LayoutTemplate, Save, Megaphone } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { DashboardLayout, PageHeader } from '../../components/dashboard-layout';
import { getAdminSections } from '../portal/sections';
import { useLanguageContext } from '../../lib/i18n/language-context';
import { Card, Button, Input, Textarea, Switch } from '../../components/ui';
import { useToast } from '../../components/toast';

export interface PageSettings {
  show_specifications: boolean;
  show_amenities: boolean;
  show_floor_plans: boolean;
  show_gallery: boolean;
  show_videos: boolean;
  show_virtual_tour: boolean;
  show_location_map: boolean;
  show_nearby: boolean;
  show_price_history: boolean;
  show_reviews: boolean;
  show_faqs: boolean;
  show_similar_properties: boolean;
  show_emi_calculator: boolean;
  promo_banner_title: string | null;
  promo_banner_body: string | null;
  promo_banner_link: string | null;
}

export const DEFAULT_PAGE_SETTINGS: PageSettings = {
  show_specifications: true,
  show_amenities: true,
  show_floor_plans: true,
  show_gallery: true,
  show_videos: true,
  show_virtual_tour: true,
  show_location_map: true,
  show_nearby: true,
  show_price_history: true,
  show_reviews: true,
  show_faqs: true,
  show_similar_properties: true,
  show_emi_calculator: true,
  promo_banner_title: null,
  promo_banner_body: null,
  promo_banner_link: null,
};

const SECTION_TOGGLES: { key: keyof PageSettings; label: string }[] = [
  { key: 'show_specifications', label: 'Specifications tab' },
  { key: 'show_amenities', label: 'Amenities tab' },
  { key: 'show_floor_plans', label: 'Floor Plans tab' },
  { key: 'show_gallery', label: 'Gallery tab' },
  { key: 'show_videos', label: 'Videos tab' },
  { key: 'show_virtual_tour', label: '360° Virtual Tour tab' },
  { key: 'show_location_map', label: 'Location & Map tab' },
  { key: 'show_nearby', label: 'Nearby tab' },
  { key: 'show_price_history', label: 'Price History tab' },
  { key: 'show_reviews', label: 'Reviews tab' },
  { key: 'show_faqs', label: 'FAQs tab' },
  { key: 'show_similar_properties', label: 'Similar Properties tab' },
  { key: 'show_emi_calculator', label: 'EMI calculator (sidebar)' },
];

export function AdminPropertyPageSettings() {
  const { t } = useLanguageContext();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<PageSettings | null>(null);
  const [saving, setSaving] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-property-page-settings'],
    queryFn: async () => {
      const { data, error } = await supabase.from('property_page_settings').select('*').eq('id', true).maybeSingle();
      if (error) {
        console.error('Error loading property page settings:', error);
        return DEFAULT_PAGE_SETTINGS;
      }
      return (data as PageSettings) ?? DEFAULT_PAGE_SETTINGS;
    },
  });

  useEffect(() => {
    if (data) {
      setForm({ ...DEFAULT_PAGE_SETTINGS, ...data });
    }
  }, [data]);

  const save = async () => {
    if (!form) return;
    setSaving(true);
    try {
      // 1. Persist to database
      const { error } = await supabase
        .from('property_page_settings')
        .upsert({
          ...form,
          id: true,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      // 2. Insert Audit Log
      try {
        const { data: auth } = await supabase.auth.getUser();
        if (auth.user) {
          const changedKeys = SECTION_TOGGLES.filter(
            (s) => (data ? data[s.key] : true) !== form[s.key],
          ).map((s) => ({
            setting: s.label,
            old_value: data ? data[s.key] : true,
            new_value: form[s.key],
          }));

          if (changedKeys.length > 0 || (data?.promo_banner_title !== form.promo_banner_title)) {
            await supabase.from('audit_logs').insert({
              actor_id: auth.user.id,
              action: 'UPDATE_PROPERTY_PAGE_SETTINGS',
              entity: 'property_page_settings',
              entity_id: 'global',
              metadata: {
                changes: changedKeys,
                promo_banner_title: form.promo_banner_title,
                timestamp: new Date().toISOString(),
              },
            });
          }
        }
      } catch (auditErr) {
        console.warn('Audit log write skipped:', auditErr);
      }

      // 3. Invalidate React Query caches for immediate UI refresh across all tabs
      await queryClient.invalidateQueries({ queryKey: ['admin-property-page-settings'] });
      await queryClient.invalidateQueries({ queryKey: ['property-page-settings'] });

      toast.addToast('success', 'Property page settings saved');
    } catch (err) {
      toast.addToast('error', err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const sections = getAdminSections(t);

  return (
    <DashboardLayout sections={sections} title="Property Page Settings" badge="Admin">
      <PageHeader
        title="Property Page Settings"
        subtitle="Control which sections appear on every property landing page, site-wide."
        action={
          <Button onClick={save} loading={saving} disabled={!form} icon={<Save className="h-4 w-4" />}>
            Save changes
          </Button>
        }
      />

      {isLoading || !form ? (
        <Card className="p-8 text-center text-navy-400">Loading...</Card>
      ) : (
        <div className="space-y-6">
          <Card className="p-6">
            <h3 className="mb-4 flex items-center gap-2 font-bold text-navy-900">
              <LayoutTemplate className="h-4 w-4 text-red-600" /> Section visibility
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {SECTION_TOGGLES.map((s) => (
                <div
                  key={s.key}
                  className="flex items-center justify-between rounded-xl border border-navy-100 px-4 py-3 bg-white hover:border-navy-200 transition-colors"
                >
                  <span className="text-sm font-medium text-navy-800">{s.label}</span>
                  <Switch
                    checked={Boolean(form[s.key])}
                    onChange={(v) => setForm((f) => (f ? { ...f, [s.key]: v } : f))}
                  />
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 flex items-center gap-2 font-bold text-navy-900">
              <Megaphone className="h-4 w-4 text-red-600" /> Sidebar promo banner
            </h3>
            <p className="mb-4 text-xs text-navy-500">
              Shown on every property page's sidebar, above the loan calculator. Leave the title blank to hide it.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                label="Title"
                value={form.promo_banner_title ?? ''}
                onChange={(e) => setForm((f) => (f ? { ...f, promo_banner_title: e.target.value || null } : f))}
                placeholder="e.g. Home Loans at 8.1% starting rate"
              />
              <Input
                label="Link (optional)"
                value={form.promo_banner_link ?? ''}
                onChange={(e) => setForm((f) => (f ? { ...f, promo_banner_link: e.target.value || null } : f))}
                placeholder="/home-loans"
              />
            </div>
            <div className="mt-3">
              <Textarea
                label="Body"
                value={form.promo_banner_body ?? ''}
                onChange={(e) => setForm((f) => (f ? { ...f, promo_banner_body: e.target.value || null } : f))}
                rows={2}
                placeholder="Short supporting line..."
              />
            </div>
          </Card>
        </div>
      )}
    </DashboardLayout>
  );
}
