import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ImageIcon,
  Plus,
  Trash2,
  Edit2,
  ToggleLeft,
  ToggleRight,
  ExternalLink,
  Search,
  Download,
  MapPin,
  BadgeCheck,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useLanguageContext } from '../../lib/i18n/language-context';
import { DashboardLayout, PageHeader, StatCard } from '../../components/dashboard-layout';
import { getAdminSections } from '../portal/sections';
import { Card, Button, Modal, Input, Textarea, Badge, Skeleton, EmptyState, Select } from '../../components/ui';
import { exportToCsv, formatNumber } from '../../lib/utils';
import { useRealtimeCount } from '../../lib/realtime';
import { uploadFile } from '../../lib/storage';
import type { HeroCampaign } from '../../lib/types';

const initialForm = {
  title: '',
  subtitle: '',
  description: '',
  banner_image: '',
  mobile_banner: '',
  logo: '',
  cta_text: 'Explore Now',
  cta_url: '',
  city_id: '',
  campaign_type: 'Free' as 'Free' | 'Paid',
  priority: 1,
  start_date: new Date().toISOString().slice(0, 16),
  end_date: '',
  order_no: 0,
  status: 'Active' as 'Active' | 'Inactive',
};

export function AdminHeroCampaigns() {
  const { t } = useLanguageContext();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<HeroCampaign | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [page, setPage] = useState(1);
  const pageSize = 9;
  const realtimeTick = useRealtimeCount('hero_campaigns');

  const [form, setForm] = useState(initialForm);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [uploadingMobile, setUploadingMobile] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const { data: cities } = useQuery({
    queryKey: ['cities-dropdown'],
    queryFn: async () => {
      const { data } = await supabase.from('cities').select('id, name').order('name');
      return data ?? [];
    },
  });

  const { data, isLoading } = useQuery({
    queryKey: ['admin-hero-campaigns', realtimeTick],
    queryFn: async () => {
      const { data } = await supabase
        .from('hero_campaigns')
        .select('*, cities(name)')
        .order('order_no', { ascending: true });
      return (data ?? []) as HeroCampaign[];
    },
  });

  const filtered = (data ?? []).filter((c) => {
    const matchesSearch =
      !search ||
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      (c.subtitle && c.subtitle.toLowerCase().includes(search.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || c.status.toLowerCase() === statusFilter;
    const matchesType = typeFilter === 'all' || c.campaign_type.toLowerCase() === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageItems = filtered.slice((page - 1) * pageSize, page * pageSize);
  const activeCount = (data ?? []).filter((c) => c.status === 'Active').length;
  const paidCount = (data ?? []).filter((c) => c.campaign_type === 'Paid').length;

  const save = useMutation({
    mutationFn: async () => {
      if (!form.title.trim()) throw new Error('Campaign Title is required');
      const payload: Record<string, unknown> = {
        title: form.title,
        subtitle: form.subtitle || null,
        description: form.description || null,
        banner_image: form.banner_image || null,
        mobile_banner: form.mobile_banner || null,
        logo: form.logo || null,
        cta_text: form.cta_text || 'Explore Now',
        cta_url: form.cta_url || null,
        city_id: form.city_id || null,
        campaign_type: form.campaign_type,
        priority: Number(form.priority) || 1,
        start_date: form.start_date ? new Date(form.start_date).toISOString() : new Date().toISOString(),
        end_date: form.end_date ? new Date(form.end_date).toISOString() : null,
        order_no: Number(form.order_no) || 0,
        status: form.status,
      };

      if (editing) {
        const { error } = await supabase.from('hero_campaigns').update(payload).eq('id', editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('hero_campaigns').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-hero-campaigns'] });
      setShowForm(false);
      setEditing(null);
      setForm(initialForm);
    },
    onError: (err: Error) => alert(err.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('hero_campaigns').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-hero-campaigns'] }),
  });

  const toggle = useMutation({
    mutationFn: async (c: HeroCampaign) => {
      const { error } = await supabase
        .from('hero_campaigns')
        .update({ status: c.status === 'Active' ? 'Inactive' : 'Active' })
        .eq('id', c.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-hero-campaigns'] }),
  });

  const handleUploadBanner = async (file: File) => {
    setUploadingBanner(true);
    const { url, error } = await uploadFile('advertisements', file);
    if (!error && url) setForm((f) => ({ ...f, banner_image: url }));
    else if (error) alert('Upload failed: ' + error);
    setUploadingBanner(false);
  };

  const handleUploadMobile = async (file: File) => {
    setUploadingMobile(true);
    const { url, error } = await uploadFile('advertisements', file);
    if (!error && url) setForm((f) => ({ ...f, mobile_banner: url }));
    else if (error) alert('Upload failed: ' + error);
    setUploadingMobile(false);
  };

  const handleUploadLogo = async (file: File) => {
    setUploadingLogo(true);
    const { url, error } = await uploadFile('advertisements', file);
    if (!error && url) setForm((f) => ({ ...f, logo: url }));
    else if (error) alert('Upload failed: ' + error);
    setUploadingLogo(false);
  };

  const openEdit = (c: HeroCampaign) => {
    setEditing(c);
    setForm({
      title: c.title ?? '',
      subtitle: c.subtitle ?? '',
      description: c.description ?? '',
      banner_image: c.banner_image ?? '',
      mobile_banner: c.mobile_banner ?? '',
      logo: c.logo ?? '',
      cta_text: c.cta_text ?? 'Explore Now',
      cta_url: c.cta_url ?? '',
      city_id: c.city_id ?? '',
      campaign_type: (c.campaign_type as 'Free' | 'Paid') ?? 'Free',
      priority: c.priority ?? 1,
      start_date: c.start_date ? c.start_date.slice(0, 16) : new Date().toISOString().slice(0, 16),
      end_date: c.end_date ? c.end_date.slice(0, 16) : '',
      order_no: c.order_no ?? 0,
      status: (c.status as 'Active' | 'Inactive') ?? 'Active',
    });
    setShowForm(true);
  };

  const handleExport = () => {
    exportToCsv('hero-campaigns', filtered as unknown as Record<string, unknown>[], [
      { key: 'title', label: 'Title' },
      { key: 'campaign_type', label: 'Type' },
      { key: 'status', label: 'Status' },
      { key: 'priority', label: 'Priority' },
      { key: 'order_no', label: 'Order' },
    ]);
  };

  return (
    <DashboardLayout
      sections={getAdminSections(t)}
      title={t('portal.heroCampaigns', 'Hero Campaigns')}
      badge="Admin"
    >
      <PageHeader
        title="Hero Banner Campaigns"
        subtitle="Manage the homepage hero carousel — dedicated, admin-controlled paid/free campaign banners."
        action={
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" icon={<Download className="h-4 w-4" />} onClick={handleExport}>
              Export CSV
            </Button>
            <Button
              icon={<Plus className="h-4 w-4" />}
              onClick={() => {
                setForm(initialForm);
                setEditing(null);
                setShowForm(true);
              }}
            >
              Add Hero Campaign
            </Button>
          </div>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Campaigns"
          value={(data ?? []).length}
          icon={<ImageIcon className="h-5 w-5" />}
          accent="navy"
        />
        <StatCard
          label="Active Campaigns"
          value={activeCount}
          icon={<ToggleRight className="h-5 w-5" />}
          accent="success"
        />
        <StatCard
          label="Paid Campaigns"
          value={paidCount}
          icon={<BadgeCheck className="h-5 w-5" />}
          accent="gold"
        />
        <StatCard
          label="Total Banners"
          value={formatNumber((data ?? []).length)}
          icon={<ExternalLink className="h-5 w-5" />}
          accent="navy"
        />
      </div>

      <div className="mb-6 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-400" />
          <Input
            placeholder="Search campaigns by title or subtitle..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-9"
          />
        </div>
        <div className="flex w-full sm:w-auto items-center gap-2">
          <Select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setPage(1);
            }}
            className="w-32 text-xs"
          >
            <option value="all">All Types</option>
            <option value="paid">Paid</option>
            <option value="free">Free</option>
          </Select>
          <Select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="w-32 text-xs"
          >
            <option value="all">All Status</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive</option>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-56 rounded-2xl" />
          ))}
        </div>
      ) : pageItems.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {pageItems.map((c) => (
            <Card key={c.id} className="overflow-hidden flex flex-col justify-between hover:shadow-lg transition-all">
              <div>
                <div className="relative h-40 w-full overflow-hidden bg-navy-950">
                  <img
                    src={c.banner_image || 'https://images.pexels.com/photos/323780/pexels-photo-323780.jpeg'}
                    alt={c.title}
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute top-2 left-2 flex gap-1">
                    <Badge variant={c.campaign_type === 'Paid' ? 'gold' : 'default'} className="text-[10px] uppercase font-bold tracking-wide">
                      {c.campaign_type}
                    </Badge>
                    <Badge variant="default" className="text-[10px]">
                      Priority {c.priority ?? 1}
                    </Badge>
                  </div>
                  <div className="absolute top-2 right-2">
                    <Badge variant={c.status === 'Active' ? 'success' : 'default'}>{c.status}</Badge>
                  </div>
                  {c.logo && (
                    <img
                      src={c.logo}
                      alt="logo"
                      className="absolute bottom-2 left-2 h-8 w-auto object-contain bg-white/90 rounded p-1"
                    />
                  )}
                </div>
                <div className="p-4">
                  <h4 className="font-bold text-navy-900 text-base line-clamp-1">{c.title}</h4>
                  {c.subtitle && <p className="text-xs text-navy-500 line-clamp-1 mt-0.5">{c.subtitle}</p>}

                  <div className="mt-3 flex items-center gap-2 text-xs text-navy-600 bg-navy-50/60 p-2.5 rounded-xl">
                    <MapPin className="h-3.5 w-3.5 text-navy-400" />
                    <span className="font-semibold">{c.cities?.name ?? 'All Cities'}</span>
                    <span className="text-navy-300">•</span>
                    <span>Order #{c.order_no ?? 0}</span>
                  </div>

                  {c.cta_url && (
                    <a
                      href={c.cta_url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2.5 inline-flex items-center gap-1 text-xs text-red-600 font-semibold hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" /> {c.cta_text || 'CTA Link'}
                    </a>
                  )}
                </div>
              </div>

              <div className="p-4 pt-0 border-t border-navy-100/60 flex items-center justify-between mt-2">
                <span className="text-[11px] text-navy-400">
                  {c.start_date ? new Date(c.start_date).toLocaleDateString() : '—'} →{' '}
                  {c.end_date ? new Date(c.end_date).toLocaleDateString() : 'No end date'}
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    icon={<Edit2 className="h-4 w-4" />}
                    onClick={() => openEdit(c)}
                    title="Edit Campaign"
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    icon={
                      c.status === 'Active' ? (
                        <ToggleRight className="h-4 w-4 text-success-600" />
                      ) : (
                        <ToggleLeft className="h-4 w-4 text-navy-400" />
                      )
                    }
                    onClick={() => toggle.mutate(c)}
                    title={c.status === 'Active' ? 'Deactivate' : 'Activate'}
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-error-600"
                    icon={<Trash2 className="h-4 w-4" />}
                    onClick={() => {
                      if (confirm('Delete this hero campaign?')) del.mutate(c.id);
                    }}
                    title="Delete"
                  />
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <EmptyState
            icon={<ImageIcon className="h-8 w-8 text-navy-400" />}
            title="No hero campaigns"
            description="Create hero banner campaigns to display on the homepage carousel."
            action={
              <Button
                icon={<Plus className="h-4 w-4" />}
                onClick={() => {
                  setForm(initialForm);
                  setEditing(null);
                  setShowForm(true);
                }}
              >
                Add Hero Campaign
              </Button>
            }
          />
        </Card>
      )}

      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between border-t border-navy-100 px-4 py-3 text-sm">
          <span className="text-navy-500">
            Page {page} of {totalPages}
          </span>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
              Prev
            </Button>
            <Button variant="ghost" size="sm" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>
              Next
            </Button>
          </div>
        </div>
      )}

      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title={editing ? 'Edit Hero Campaign' : 'Create Hero Campaign'}
        footer={
          <div className="flex items-center justify-between w-full">
            <Button variant="secondary" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
            <Button loading={save.isPending || uploadingBanner || uploadingMobile || uploadingLogo} onClick={() => save.mutate()}>
              {editing ? 'Update Campaign' : 'Publish Campaign'}
            </Button>
          </div>
        }
      >
        <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
          <Input
            label="Campaign Title *"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder="e.g. Monsoon Mega Property Fest 2026"
          />
          <Input
            label="Subtitle"
            value={form.subtitle}
            onChange={(e) => setForm((f) => ({ ...f, subtitle: e.target.value }))}
            placeholder="e.g. Zero Brokerage on Verified Luxury Apartments"
          />
          <Textarea
            label="Short Description"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="Short promotional description shown under the subtitle..."
          />

          <div className="pt-3 border-t border-navy-100/80">
            <label className="label font-bold text-xs uppercase tracking-wider text-navy-800 block mb-1">
              Desktop Banner Image *
            </label>
            {form.banner_image && (
              <div className="mb-2.5 relative rounded-xl overflow-hidden border border-navy-200 shadow-sm max-h-32">
                <img src={form.banner_image} alt="Banner preview" className="w-full h-28 object-cover" />
              </div>
            )}
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleUploadBanner(file);
              }}
              className="text-xs text-navy-500 file:mr-2 file:rounded-lg file:border-0 file:bg-navy-900 file:px-3.5 file:py-2 file:text-white file:font-bold hover:file:bg-navy-800 transition-all cursor-pointer"
            />
            {uploadingBanner && <span className="text-xs text-red-600 font-bold animate-pulse block mt-1">Uploading...</span>}
          </div>

          <div>
            <label className="label font-bold text-xs uppercase tracking-wider text-navy-700 block mb-1">
              Mobile Banner Image (Optional)
            </label>
            {form.mobile_banner && (
              <img
                src={form.mobile_banner}
                alt="Mobile preview"
                className="mb-2 h-24 w-40 rounded-xl object-cover border border-navy-200"
              />
            )}
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleUploadMobile(file);
              }}
              className="text-xs text-navy-500 file:mr-2 file:rounded-lg file:border-0 file:bg-navy-900 file:px-3 file:py-2 file:text-white file:font-semibold hover:file:bg-navy-800"
            />
            {uploadingMobile && <span className="text-xs text-red-600 font-bold animate-pulse block mt-1">Uploading...</span>}
          </div>

          <div>
            <label className="label font-bold text-xs uppercase tracking-wider text-navy-700 block mb-1">
              Property / Builder Logo (Optional)
            </label>
            {form.logo && (
              <img
                src={form.logo}
                alt="Logo preview"
                className="mb-2 h-16 w-32 object-contain bg-slate-100 rounded-lg p-2 border border-navy-200"
              />
            )}
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleUploadLogo(file);
              }}
              className="text-xs text-navy-500 file:mr-2 file:rounded-lg file:border-0 file:bg-navy-900 file:px-3 file:py-2 file:text-white file:font-semibold hover:file:bg-navy-800"
            />
            {uploadingLogo && <span className="text-xs text-red-600 font-bold animate-pulse block mt-1">Uploading...</span>}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="CTA Button Text"
              value={form.cta_text}
              onChange={(e) => setForm((f) => ({ ...f, cta_text: e.target.value }))}
              placeholder="e.g. Explore Now"
            />
            <Input
              label="CTA URL"
              value={form.cta_url}
              onChange={(e) => setForm((f) => ({ ...f, cta_url: e.target.value }))}
              placeholder="/search?purpose=Buy or https://..."
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label">Assign to City</label>
              <Select value={form.city_id} onChange={(e) => setForm((f) => ({ ...f, city_id: e.target.value }))}>
                <option value="">All Cities</option>
                {(cities ?? []).map((city) => (
                  <option key={city.id} value={city.id}>
                    {city.name}
                  </option>
                ))}
              </Select>
            </div>
            <Select
              label="Campaign Type"
              value={form.campaign_type}
              onChange={(e) => setForm((f) => ({ ...f, campaign_type: e.target.value as 'Free' | 'Paid' }))}
            >
              <option value="Free">Free</option>
              <option value="Paid">Paid</option>
            </Select>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="Start Date & Time"
              type="datetime-local"
              value={form.start_date}
              onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))}
            />
            <Input
              label="End Date & Time (Optional)"
              type="datetime-local"
              value={form.end_date}
              onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <Input
              label="Display Priority"
              type="number"
              min="1"
              value={form.priority}
              onChange={(e) => setForm((f) => ({ ...f, priority: parseInt(e.target.value) || 1 }))}
            />
            <Input
              label="Carousel Order"
              type="number"
              min="0"
              value={form.order_no}
              onChange={(e) => setForm((f) => ({ ...f, order_no: parseInt(e.target.value) || 0 }))}
            />
            <Select
              label="Status"
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as 'Active' | 'Inactive' }))}
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </Select>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
