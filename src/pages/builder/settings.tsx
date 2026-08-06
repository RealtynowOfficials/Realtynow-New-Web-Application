import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import { DashboardLayout, PageHeader } from '../../components/dashboard-layout';
import { getBuilderSections } from '../portal/sections';
import { useLanguageContext } from '../../lib/i18n';
import { Card, Input, Button } from '../../components/ui';
import { addToast } from '../../components/ui/toast';
import { Save } from 'lucide-react';

export function BuilderSettings() {
  const { user, profile, refreshProfile } = useAuth();
  const { t } = useLanguageContext();
  const builderSections = getBuilderSections(t);
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    first_name: profile?.first_name ?? '',
    last_name: profile?.last_name ?? '',
    phone: profile?.phone ?? '',
    company: profile?.company ?? '',
    bio: profile?.bio ?? '',
  });

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: form.first_name,
          last_name: form.last_name,
          phone: form.phone,
          company: form.company,
          bio: form.bio,
        })
        .eq('id', user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      refreshProfile();
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      addToast('success', 'Profile updated successfully.');
    },
    onError: (err: any) => addToast('error', err.message),
  });

  return (
    <DashboardLayout sections={builderSections} title="Settings" badge="Builder">
      <PageHeader title="Builder Settings" subtitle="Update your profile and company details." />

      <Card className="max-w-2xl p-6 mt-6">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate();
          }}
          className="space-y-5"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="First Name"
              value={form.first_name}
              onChange={(e) => setForm({ ...form, first_name: e.target.value })}
              required
            />
            <Input
              label="Last Name"
              value={form.last_name}
              onChange={(e) => setForm({ ...form, last_name: e.target.value })}
              required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Phone Number"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              required
            />
            <Input
              label="Company Name"
              value={form.company}
              onChange={(e) => setForm({ ...form, company: e.target.value })}
              required
            />
          </div>

          <Input
            label="Bio / Description"
            value={form.bio}
            onChange={(e) => setForm({ ...form, bio: e.target.value })}
            as="textarea"
            rows={4}
          />

          <div className="flex justify-end pt-4 border-t">
            <Button type="submit" loading={save.isPending} icon={<Save className="h-4 w-4" />}>
              Save Changes
            </Button>
          </div>
        </form>
      </Card>
    </DashboardLayout>
  );
}
