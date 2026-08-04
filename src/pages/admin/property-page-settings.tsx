import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { LayoutTemplate, Save, Megaphone } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { DashboardLayout, PageHeader } from '../../components/dashboard-layout';
import { getAdminSections } from '../portal/sections';
import { useLanguageContext } from '../../lib/i18n/language-context';
import { Card, Button, Input, Textarea, Switch } from '../../components/ui';
import { useToast } from '../../components/toast';

interface PageSettings {
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
      const { data } = await supabase.from('property_page_settings').select('*').eq('id', true).maybeSingle();
      return data as PageSettings | null;
    },
  });

  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  const save = async () => {
    if (!form) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('property_page_settings')
        .update({ ...form, updated_at: new Date().toISOString() })
        .eq('id', true);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['admin-property-page-settings'] });
      queryClient.invalidateQueries({ queryKey: ['property-page-settings'] });
      toast.addToast('success', 'Property page settings saved');
    } catch (err) {
      toast.addToast('error', err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const sections = getAdminSections(t);

  return (
    <DashboardLayout sections={sections} title="Property Page Settings">
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
                <div key={s.key} className="flex items-center justify-between rounded-xl border border-navy-100 px-4 py-3">
                  <span className="text-sm font-medium text-navy-800">{s.label}</span>
                  <Switch checked={Boolean(form[s.key])} onChange={(v) => setForm((f) => (f ? { ...f, [s.key]: v } : f))} />
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
