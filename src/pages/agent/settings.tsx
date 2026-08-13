import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import { useLanguageContext } from '../../lib/i18n/language-context';
import { DashboardLayout, PageHeader } from '../../components/dashboard-layout';
import { getAgentSections } from '../portal/sections';
import { Card, Badge, Button, Input, Textarea, Avatar } from '../../components/ui';

const AGENT_PROPERTIES_EXPORT_COLUMNS = [
  { key: 'id', label: 'ID' },
  { key: 'title', label: 'Property' },
  { key: 'locality_name', label: 'Locality' },
  { key: 'city_name', label: 'City' },
  { key: 'price', label: 'Price' },
  { key: 'status', label: 'Status' },
  { key: 'view_count', label: 'Views' },
  { key: 'created_at', label: 'Created' },
];

interface AgentPropertiesFilterState {
  status: string;
  city: string;
  type: string;
  minPrice: string;
  maxPrice: string;
}

const LEAD_STATUSES = ['new', 'contacted', 'closed', 'spam'] as const;
const APPT_STATUSES = ['requested', 'confirmed', 'completed', 'cancelled'] as const;

export function AgentSettings() {
  const { t } = useLanguageContext();
  const agentSections = getAgentSections(t);
  const { user, profile, refreshProfile } = useAuth();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    first_name: profile?.first_name ?? '',
    last_name: profile?.last_name ?? '',
    phone: profile?.phone ?? '',
    bio: profile?.bio ?? '',
    company: profile?.company ?? '',
    license_number: profile?.license_number ?? '',
    specialization: profile?.specialization ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const save = async () => {
    setSaving(true);
    await supabase.from('profiles').update(form).eq('id', user!.id);
    await refreshProfile();
    queryClient.invalidateQueries({ queryKey: ['agent-stats'] });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <DashboardLayout sections={agentSections} title="Settings" badge="Agent">
      <PageHeader title="Agent settings" subtitle="Update your professional profile." />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="p-6 lg:col-span-1">
          <div className="flex flex-col items-center text-center">
            <Avatar
              src={profile?.avatar_url}
              name={`${profile?.first_name ?? 'A'} ${profile?.last_name ?? ''}`}
              size={80}
            />
            <p className="mt-3 font-display font-semibold text-navy-900">
              {profile?.first_name} {profile?.last_name}
            </p>
            <p className="text-sm text-navy-500">{profile?.email}</p>
            <Badge variant="success" className="mt-2">
              Agent
            </Badge>
          </div>
        </Card>
        <Card className="p-6 lg:col-span-2">
          <h3 className="font-display font-semibold text-navy-900">Professional profile</h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Input
              label="First name"
              value={form.first_name}
              onChange={(e) => setForm((f) => ({ ...f, first_name: e.target.value }))}
            />
            <Input
              label="Last name"
              value={form.last_name}
              onChange={(e) => setForm((f) => ({ ...f, last_name: e.target.value }))}
            />
            <Input
              label="Phone"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            />
            <Input
              label="Company"
              value={form.company}
              onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
            />
            <Input
              label="License number"
              value={form.license_number}
              onChange={(e) => setForm((f) => ({ ...f, license_number: e.target.value }))}
            />
            <Input
              label="Specialization"
              value={form.specialization}
              onChange={(e) => setForm((f) => ({ ...f, specialization: e.target.value }))}
            />
            <div className="sm:col-span-2">
              <Textarea
                label="Bio"
                value={form.bio}
                onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
              />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <Button onClick={save} loading={saving}>
              Save changes
            </Button>
            {saved && (
              <span className="text-sm text-success-600 flex items-center gap-1">
                <CheckCircle2 className="h-4 w-4" /> Saved!
              </span>
            )}
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}
