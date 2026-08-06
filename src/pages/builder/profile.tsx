import { useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Building2, ShieldCheck, Upload } from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import { uploadFile } from '../../lib/storage';
import { logBuilderAudit } from '../../lib/builder-audit';
import { DashboardLayout, PageHeader, StatCard } from '../../components/dashboard-layout';
import { getBuilderSections } from '../portal/sections';
import { useLanguageContext } from '../../lib/i18n/language-context';
import { Card, Input, Button, Avatar, EmptyState, Skeleton, Badge } from '../../components/ui';
import { useToast } from '../../components/toast';

interface BuilderProjectSummary {
  id: string;
  name: string;
  rera_id: string | null;
  status: string;
}

export function BuilderProfile() {
  const { user, profile, refreshProfile } = useAuth();
  const { t } = useLanguageContext();
  const builderSections = getBuilderSections(t);
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [company, setCompany] = useState(profile?.company ?? '');
  const [logoUrl, setLogoUrl] = useState(profile?.company_logo_url ?? '');
  const [uploading, setUploading] = useState(false);

  const { data: projects, isLoading } = useQuery({
    queryKey: ['builder-profile-projects', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('builder_projects')
        .select('id, name, rera_id, status')
        .eq('builder_id', user!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as BuilderProjectSummary[];
    },
    enabled: !!user,
  });

  const reraCount = (projects ?? []).filter((p) => !!p.rera_id).length;

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { url, error } = await uploadFile('builder-media', file);
      if (error) throw new Error(error);
      setLogoUrl(url);
      addToast('success', 'Logo uploaded. Click Save to apply.');
    } catch (err: any) {
      addToast('error', err.message || 'Failed to upload logo.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('profiles')
        .update({ company, company_logo_url: logoUrl })
        .eq('id', user!.id);
      if (error) throw error;
      await logBuilderAudit('update_company_profile', 'profile', user!.id, { company, company_logo_url: logoUrl });
    },
    onSuccess: () => {
      refreshProfile();
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      addToast('success', 'Company profile updated.');
    },
    onError: (err: any) => addToast('error', err.message),
  });

  return (
    <DashboardLayout sections={builderSections} title="Company Profile" badge="Builder">
      <PageHeader title="Company Profile" subtitle="Manage how your company is publicly represented on RealtyNow." />

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 mb-6">
        <StatCard label="RERA-Registered Projects" value={reraCount} icon={<ShieldCheck className="h-5 w-5" />} accent="success" />
        <StatCard label="Total Projects" value={projects?.length ?? 0} icon={<Building2 className="h-5 w-5" />} accent="navy" />
      </div>

      <Card className="max-w-2xl p-6">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate();
          }}
          className="space-y-5"
        >
          <div className="flex items-center gap-4">
            <Avatar src={logoUrl} name={company || 'Company'} size={64} />
            <div>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                loading={uploading}
                icon={<Upload className="h-4 w-4" />}
                onClick={() => fileInputRef.current?.click()}
              >
                Upload Logo
              </Button>
              <p className="mt-1 text-xs text-navy-500">Shown on your public project listings.</p>
            </div>
          </div>

          <Input label="Company Name" value={company} onChange={(e) => setCompany(e.target.value)} required />

          <div className="flex justify-end pt-4 border-t">
            <Button type="submit" loading={save.isPending}>
              Save Changes
            </Button>
          </div>
        </form>
      </Card>

      <Card className="max-w-2xl p-6 mt-6">
        <h3 className="text-lg font-bold text-navy-900 mb-1">RERA Registration Summary</h3>
        <p className="text-sm text-navy-500 mb-4">A read-only view of what's publicly represented for your projects.</p>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : !projects || projects.length === 0 ? (
          <EmptyState icon={<Building2 className="h-8 w-8" />} title="No projects yet" description="Once you add projects, their RERA details will appear here." />
        ) : (
          <div className="divide-y divide-navy-100">
            {projects.map((p) => (
              <div key={p.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium text-navy-900">{p.name}</p>
                  <p className="text-xs text-navy-500">RERA ID: {p.rera_id || 'Not registered'}</p>
                </div>
                <Badge variant={p.rera_id ? 'success' : 'warning'}>{p.rera_id ? 'Registered' : 'Pending'}</Badge>
              </div>
            ))}
          </div>
        )}
      </Card>
    </DashboardLayout>
  );
}
