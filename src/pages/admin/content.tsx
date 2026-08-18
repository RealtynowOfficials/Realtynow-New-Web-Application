import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Star,
  HelpCircle,
  Megaphone,
  Plus,
  Trash2,
  Edit2,
  ToggleLeft,
  ToggleRight,
  ExternalLink,
  ChevronUp,
  ChevronDown,
  Search,
  Download,
  Eye,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useLanguageContext } from '../../lib/i18n/language-context';
import { DashboardLayout, PageHeader, StatCard } from '../../components/dashboard-layout';
import { getAdminSections } from '../portal/sections';
import { Card, Button, Modal, Input, Textarea, Badge, Skeleton, EmptyState, Select } from '../../components/ui';
import { BulkActionsBar } from '../../components/data-table';
import { cn, exportToCsv, formatNumber , generatePropertyUrl} from '../../lib/utils';
import { useRealtimeCount } from '../../lib/realtime';
import { uploadFile } from '../../lib/storage';
import { useToast } from '../../components/toast';
import type { Advertisement } from '../../lib/types';

interface Testimonial {
  id: string;
  name: string;
  role: string;
  company: string;
  avatar_url: string | null;
  rating: number;
  body: string;
  is_active: boolean;
  created_at: string;
}
interface Faq {
  id: string;
  question: string;
  answer: string;
  category: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

export function AdminTestimonials() {
  const { t } = useLanguageContext();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<Testimonial | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: '',
    role: '',
    company: '',
    rating: 5,
    body: '',
    is_active: true,
    avatar_url: '',
  });
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const realtimeTick = useRealtimeCount('testimonials');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-testimonials', realtimeTick],
    queryFn: async () => {
      const { data } = await supabase.from('testimonials').select('*').order('created_at', { ascending: false });
      return (data ?? []) as Testimonial[];
    },
  });

  const filtered = (data ?? []).filter(
    (t) =>
      !search ||
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.company.toLowerCase().includes(search.toLowerCase()),
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageItems = filtered.slice((page - 1) * pageSize, page * pageSize);

  const handleUpload = async (file: File) => {
    setUploading(true);
    const { url, error } = await uploadFile('profile-images', file);
    if (!error && url) setForm((f) => ({ ...f, avatar_url: url }));
    setUploading(false);
  };

  const save = useMutation({
    mutationFn: async () => {
      const payload = { ...form, avatar_url: form.avatar_url || null };
      if (editing) await supabase.from('testimonials').update(payload).eq('id', editing.id);
      else await supabase.from('testimonials').insert(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-testimonials'] });
      setShowForm(false);
      setEditing(null);
      resetForm();
    },
  });

  const toggle = useMutation({
    mutationFn: async (t: Testimonial) => {
      await supabase.from('testimonials').update({ is_active: !t.is_active }).eq('id', t.id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-testimonials'] }),
  });

  const bulkToggle = async () => {
    const ids = [...selected];
    await Promise.all(
      ids.map((id) =>
        supabase
          .from('testimonials')
          .update({ is_active: !testimonials.find((t) => t.id === id)?.is_active })
          .eq('id', id),
      ),
    );
    setSelected(new Set());
    queryClient.invalidateQueries({ queryKey: ['admin-testimonials'] });
  };

  const bulkDelete = async () => {
    await Promise.all([...selected].map((id) => supabase.from('testimonials').delete().eq('id', id)));
    setSelected(new Set());
    queryClient.invalidateQueries({ queryKey: ['admin-testimonials'] });
  };

  const del = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from('testimonials').delete().eq('id', id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-testimonials'] }),
  });

  const resetForm = () =>
    setForm({ name: '', role: '', company: '', rating: 5, body: '', is_active: true, avatar_url: '' });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const testimonials = data ?? [];

  const openEdit = (t: Testimonial) => {
    setEditing(t);
    setForm({
      name: t.name,
      role: t.role,
      company: t.company,
      rating: t.rating,
      body: t.body,
      is_active: t.is_active,
      avatar_url: t.avatar_url ?? '',
    });
    setShowForm(true);
  };

  const handleExport = () => {
    exportToCsv('testimonials', testimonials as unknown as Record<string, unknown>[], [
      { key: 'name', label: 'Name' },
      { key: 'role', label: 'Role' },
      { key: 'company', label: 'Company' },
      { key: 'rating', label: 'Rating' },
      { key: 'body', label: 'Body' },
      { key: 'is_active', label: 'Active' },
    ]);
  };

  return (
    <DashboardLayout sections={getAdminSections(t)} title={t('portal.testimonials', 'Testimonials')} badge="Admin">
      <PageHeader
        title="Testimonials"
        subtitle="Manage customer testimonials displayed on the homepage."
        action={
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" icon={<Download className="h-4 w-4" />} onClick={handleExport}>
              Export
            </Button>
            <Button
              icon={<Plus className="h-4 w-4" />}
              onClick={() => {
                resetForm();
                setEditing(null);
                setShowForm(true);
              }}
            >
              Add testimonial
            </Button>
          </div>
        }
      />
      <div className="mb-4 flex items-center gap-2">
        <div className="relative max-w-xs flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-400" />
          <Input
            placeholder="Search testimonials..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-9"
          />
        </div>
      </div>
      {selected.size > 0 && (
        <BulkActionsBar
          count={selected.size}
          onDelete={bulkDelete}
          actions={
            <Button size="sm" variant="secondary" onClick={bulkToggle}>
              Toggle active
            </Button>
          }
        />
      )}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      ) : pageItems.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {pageItems.map((t) => (
            <Card key={t.id} className="p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selected.has(t.id)}
                      onChange={() =>
                        setSelected((s) => {
                          const n = new Set(s);
                          n.has(t.id) ? n.delete(t.id) : n.add(t.id);
                          return n;
                        })
                      }
                      className="rounded border-navy-300 text-red-600 focus:ring-red-400 accent-red-600 cursor-pointer"
                    />
                    <Badge variant={t.is_active ? 'success' : 'default'}>{t.is_active ? 'Active' : 'Hidden'}</Badge>
                  </div>
                  <div className="flex items-center text-gold-400">
                    {Array.from({ length: t.rating }).map((_, i) => (
                      <Star key={i} className="h-3.5 w-3.5 fill-current" />
                    ))}
                  </div>
                </div>
                <p className="mt-3 text-sm text-navy-700 italic">"{t.body}"</p>
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-navy-100 pt-3">
                <div className="flex items-center gap-2">
                  {t.avatar_url ? (
                    <img src={t.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover" />
                  ) : (
                    <div className="grid h-8 w-8 place-items-center rounded-full bg-navy-100 text-xs font-bold text-navy-600">
                      {t.name[0]}
                    </div>
                  )}
                  <div>
                    <p className="text-xs font-semibold text-navy-900">{t.name}</p>
                    <p className="text-[10px] text-navy-500">
                      {t.role}
                      {t.company ? `, ${t.company}` : ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button size="sm" variant="ghost" icon={<Edit2 className="h-4 w-4" />} onClick={() => openEdit(t)} />
                  <Button
                    size="sm"
                    variant="ghost"
                    icon={t.is_active ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
                    onClick={() => toggle.mutate(t)}
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-error-600"
                    icon={<Trash2 className="h-4 w-4" />}
                    onClick={() => del.mutate(t.id)}
                  />
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <EmptyState
            icon={<Star className="h-6 w-6" />}
            title="No testimonials"
            description="Add customer reviews to build trust."
          />
        </Card>
      )}

      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title={editing ? 'Edit Testimonial' : 'Add Testimonial'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
            <Button loading={save.isPending} onClick={() => save.mutate()}>
              {editing ? 'Save' : 'Create'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="Name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Role / Title"
              placeholder="e.g. Home Buyer"
              value={form.role}
              onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
            />
            <Input
              label="Company"
              placeholder="Optional"
              value={form.company}
              onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
            />
          </div>
          <div>
            <label className="label">Rating</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, rating: star }))}
                  className="p-1"
                >
                  <Star
                    className={`h-6 w-6 ${star <= form.rating ? 'fill-gold-400 text-gold-400' : 'text-navy-300'}`}
                  />
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="label">Avatar image</label>
            {form.avatar_url && (
              <img src={form.avatar_url} alt="" className="mb-2 h-16 w-16 rounded-full object-cover" />
            )}
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleUpload(f);
              }}
              className="text-sm text-navy-500 file:mr-2 file:rounded file:border-0 file:bg-navy-700 file:px-3 file:py-1.5 file:text-white"
            />
          </div>
          <Textarea
            label="Testimonial text"
            value={form.body}
            onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
              className="rounded border-navy-300 text-red-600 focus:ring-red-400 accent-red-600 cursor-pointer"
            />
            Active (visible on website)
          </label>
        </div>
      </Modal>
    </DashboardLayout>
  );
}

export function AdminFaqs() {
  const { t } = useLanguageContext();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [editing, setEditing] = useState<Faq | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ question: '', answer: '', category: 'General', is_active: true });
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const realtimeTick = useRealtimeCount('faqs');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-faqs', realtimeTick],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('faqs')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: false });
      if (error) console.error('Error fetching FAQs:', error);
      return (data ?? []) as Faq[];
    },
  });

  const categories = Array.from(new Set((data ?? []).map((f) => f.category).filter(Boolean)));

  const filtered = (data ?? []).filter(
    (f) =>
      !search ||
      f.question.toLowerCase().includes(search.toLowerCase()) ||
      f.category.toLowerCase().includes(search.toLowerCase()),
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageItems = filtered.slice((page - 1) * pageSize, page * pageSize);

  const save = useMutation({
    mutationFn: async () => {
      if (!form.question.trim() || !form.answer.trim()) {
        throw new Error('Question and Answer are required');
      }
      if (editing) {
        const { error } = await supabase.from('faqs').update(form).eq('id', editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('faqs').insert({ ...form, sort_order: data?.length ?? 0 });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-faqs'] });
      queryClient.invalidateQueries({ queryKey: ['faqs'] });
      setShowForm(false);
      setEditing(null);
      setForm({ question: '', answer: '', category: 'General', is_active: true });
      toast.addToast('success', editing ? 'FAQ updated live!' : 'FAQ created & live!');
    },
    onError: (err: Error) => {
      toast.addToast('error', err.message || 'Failed to save FAQ');
    },
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('faqs').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-faqs'] });
      queryClient.invalidateQueries({ queryKey: ['faqs'] });
      toast.addToast('success', 'FAQ deleted');
    },
    onError: (err: Error) => {
      toast.addToast('error', err.message);
    },
  });

  const reorder = async (id: string, dir: 1 | -1) => {
    const idx = (data ?? []).findIndex((f) => f.id === id);
    const target = (data ?? [])[idx + dir];
    if (!target) return;
    await supabase.from('faqs').update({ sort_order: target.sort_order }).eq('id', id);
    await supabase
      .from('faqs')
      .update({ sort_order: (data ?? [])[idx].sort_order })
      .eq('id', target.id);
    queryClient.invalidateQueries({ queryKey: ['admin-faqs'] });
    queryClient.invalidateQueries({ queryKey: ['faqs'] });
  };

  const toggle = useMutation({
    mutationFn: async (f: Faq) => {
      const { error } = await supabase.from('faqs').update({ is_active: !f.is_active }).eq('id', f.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-faqs'] });
      queryClient.invalidateQueries({ queryKey: ['faqs'] });
      toast.addToast('success', 'FAQ status updated');
    },
    onError: (err: Error) => {
      toast.addToast('error', err.message);
    },
  });

  const seedDefaultFaqs = async () => {
    try {
      const defaults = [
        {
          question: 'How do I schedule a property site visit?',
          answer:
            'You can click on "Book Visit" or "Schedule Appointment" on any property listing page to choose your preferred date and time. An agent will confirm your visit.',
          category: 'General',
          is_active: true,
          sort_order: 1,
        },
        {
          question: 'What documents are required to buy a property in India?',
          answer:
            'Standard documents include identity proof (Aadhaar/Passport), PAN card, address proof, income documents (for home loans), and passport-size photographs.',
          category: 'Buying',
          is_active: true,
          sort_order: 2,
        },
        {
          question: 'How does RealtyNow verify listed properties?',
          answer:
            'Our team conducts thorough legal title checks, physical verification of construction status, RERA registration checks, and builder credentials verification.',
          category: 'Buying',
          is_active: true,
          sort_order: 3,
        },
        {
          question: 'How can I list my property for sale or rent?',
          answer:
            'Sign in to your account, click on "Post Property" in your dashboard, enter property details, upload photos, and hit submit. Our team will verify and make it live.',
          category: 'Selling',
          is_active: true,
          sort_order: 4,
        },
        {
          question: 'What are the typical home loan interest rates?',
          answer:
            'Home loan interest rates currently start around 8.35% to 9.50% depending on your credit score, loan amount, and employment type. Use our EMI Calculator to estimate payments.',
          category: 'Home Loans',
          is_active: true,
          sort_order: 5,
        },
        {
          question: 'Is RERA registration mandatory for all new projects?',
          answer:
            'Yes, under the RERA Act, all residential and commercial real estate projects where land area exceeds 500 sq. meters or 8 apartments must be registered with RERA.',
          category: 'General',
          is_active: true,
          sort_order: 6,
        },
      ];
      const { error } = await supabase.from('faqs').insert(defaults);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['admin-faqs'] });
      queryClient.invalidateQueries({ queryKey: ['faqs'] });
      toast.addToast('success', 'Seeded default FAQs successfully!');
    } catch (err) {
      toast.addToast('error', err instanceof Error ? err.message : 'Failed to seed FAQs');
    }
  };

  const openEdit = (f: Faq) => {
    setEditing(f);
    setForm({ question: f.question, answer: f.answer, category: f.category, is_active: f.is_active });
    setShowForm(true);
  };

  return (
    <DashboardLayout sections={getAdminSections(t)} title={t('footer.faqs', 'FAQs')} badge="Admin">
      <PageHeader
        title="FAQs"
        subtitle="Manage frequently asked questions with real-time updates."
        action={
          <div className="flex gap-2">
            {(!data || data.length === 0) && (
              <Button variant="secondary" onClick={seedDefaultFaqs}>
                Load Standard FAQs
              </Button>
            )}
            <Button
              icon={<Plus className="h-4 w-4" />}
              onClick={() => {
                setForm({ question: '', answer: '', category: 'General', is_active: true });
                setEditing(null);
                setShowForm(true);
              }}
            >
              Add FAQ
            </Button>
          </div>
        }
      />
      <div className="mb-4 flex items-center gap-2">
        <div className="relative max-w-xs flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-400" />
          <Input
            placeholder="Search FAQs..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-9"
          />
        </div>
      </div>
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      ) : pageItems.length > 0 ? (
        <Card className="divide-y divide-navy-50">
          {pageItems.map((f) => (
            <div key={f.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="default">{f.category}</Badge>
                    <Badge variant={f.is_active ? 'success' : 'default'}>{f.is_active ? 'Active' : 'Hidden'}</Badge>
                  </div>
                  <p className="mt-2 font-bold text-navy-900 text-base">{f.question}</p>
                  <p className="mt-1 text-sm text-navy-600 leading-relaxed">{f.answer}</p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => reorder(f.id, -1)}
                    disabled={(data ?? []).findIndex((x) => x.id === f.id) === 0}
                    icon={<ChevronUp className="h-4 w-4" />}
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => reorder(f.id, 1)}
                    disabled={(data ?? []).findIndex((x) => x.id === f.id) === (data ?? []).length - 1}
                    icon={<ChevronDown className="h-4 w-4" />}
                  />
                  <Button size="sm" variant="ghost" icon={<Edit2 className="h-4 w-4" />} onClick={() => openEdit(f)} />
                  <Button
                    size="sm"
                    variant="ghost"
                    icon={f.is_active ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
                    onClick={() => toggle.mutate(f)}
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-error-600"
                    icon={<Trash2 className="h-4 w-4" />}
                    onClick={() => del.mutate(f.id)}
                  />
                </div>
              </div>
            </div>
          ))}
        </Card>
      ) : (
        <Card>
          <EmptyState
            icon={<HelpCircle className="h-6 w-6" />}
            title="No FAQs yet"
            description="Add questions and answers or seed standard real estate FAQs for your portal."
            action={
              <div className="flex flex-wrap gap-2 justify-center">
                <Button
                  onClick={() => {
                    setForm({ question: '', answer: '', category: 'General', is_active: true });
                    setEditing(null);
                    setShowForm(true);
                  }}
                  icon={<Plus className="h-4 w-4" />}
                >
                  Add FAQ
                </Button>
                <Button variant="secondary" onClick={seedDefaultFaqs}>
                  Load Standard FAQs
                </Button>
              </div>
            }
          />
        </Card>
      )}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between border-t border-navy-100 px-4 py-3 text-sm">
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
        title={editing ? 'Edit FAQ' : 'Add FAQ'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
            <Button loading={save.isPending} onClick={() => save.mutate()}>
              {editing ? 'Save' : 'Create'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Question"
            value={form.question}
            onChange={(e) => setForm((f) => ({ ...f, question: e.target.value }))}
          />
          <Textarea
            label="Answer"
            value={form.answer}
            onChange={(e) => setForm((f) => ({ ...f, answer: e.target.value }))}
          />
          <Select
            label="Category"
            value={form.category}
            onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
          >
            {categories.length > 0
              ? categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))
              : ['General', 'Buying', 'Selling', 'Renting', 'Home Loans'].map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
          </Select>
          <Input
            label="New category"
            placeholder="Or type new category..."
            value={form.category === categories.find((c) => c === form.category) ? '' : form.category}
            onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
              className="rounded border-navy-300 text-red-600 focus:ring-red-400 accent-red-600 cursor-pointer"
            />
            Active
          </label>
        </div>
      </Modal>
    </DashboardLayout>
  );
}

export function AdminAdvertisements() {
  const { t } = useLanguageContext();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<Advertisement | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [modalTab, setModalTab] = useState<'info' | 'media' | 'redirection' | 'schedule' | 'preview'>('info');
  const [search, setSearch] = useState('');
  const [placementFilter, setPlacementFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const pageSize = 9;
  const realtimeTick = useRealtimeCount('advertisements');

  // Fetch properties for property selector
  const { data: properties } = useQuery({
    queryKey: ['properties-dropdown'],
    queryFn: async () => {
      const { data } = await supabase
        .from('properties')
        .select('id, title, purpose, price')
        .eq('status', 'published')
        .order('title');
      return data ?? [];
    },
  });

  const initialForm = {
    title: '',
    subtitle: '',
    description: '',
    banner_type: 'Homepage',
    placement: 'Middle',
    image_url: '',
    image_desktop: '',
    image_mobile: '',
    video_url: '',
    cta_text: 'Explore Properties',
    cta_link: '',
    redirect_type: 'External URL',
    property_id: '',
    category_name: 'Buy',
    priority: 1,
    display_order: 0,
    start_date: new Date().toISOString().slice(0, 16),
    end_date: '',
    is_active: true,
    auto_publish: true,
    schedule_publishing: false,
    target_audience: 'All Users',
    city_targeting: 'All Cities',
    device_targeting: 'All Devices',
    impression_limit: 0,
    seo_alt_text: '',
    image_caption: '',
    banner_tags: '',
    internal_comments: '',
    html_content: '',
    button_text: 'Learn More',
    company_logo: '',
    price_text: '',
    location_text: '',
  };

  const [form, setForm] = useState(initialForm);
  const [uploadingDesktop, setUploadingDesktop] = useState(false);
  const [uploadingMobile, setUploadingMobile] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-ads', realtimeTick],
    queryFn: async () => {
      const { data } = await supabase.from('advertisements').select('*').order('created_at', { ascending: false });
      return (data ?? []) as Advertisement[];
    },
  });

  const filtered = (data ?? []).filter((a) => {
    const matchesSearch =
      !search ||
      a.title.toLowerCase().includes(search.toLowerCase()) ||
      (a.subtitle && a.subtitle.toLowerCase().includes(search.toLowerCase())) ||
      a.placement.toLowerCase().includes(search.toLowerCase());
    const matchesPlacement = placementFilter === 'all' || a.placement.toLowerCase() === placementFilter.toLowerCase();
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && a.is_active) ||
      (statusFilter === 'inactive' && !a.is_active);
    return matchesSearch && matchesPlacement && matchesStatus;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageItems = filtered.slice((page - 1) * pageSize, page * pageSize);

  const totalImpressions = (data ?? []).reduce((acc, a) => acc + (a.impressions ?? 0), 0);
  const totalClicks = (data ?? []).reduce((acc, a) => acc + (a.clicks ?? 0), 0);
  const avgCtr = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(1) : '0.0';

  const save = useMutation({
    mutationFn: async () => {
      if (!form.title.trim()) throw new Error('Banner Title is required');
      const payload: Record<string, unknown> = {
        title: form.title,
        subtitle: form.subtitle,
        description: form.description,
        company_logo: form.company_logo,
        price_text: form.price_text,
        location_text: form.location_text,
        banner_type: form.banner_type,
        placement: form.placement,
        image_url:
          form.image_desktop || form.image_url || 'https://images.pexels.com/photos/323780/pexels-photo-323780.jpeg',
        image_desktop: form.image_desktop || form.image_url,
        image_mobile: form.image_mobile || form.image_desktop || form.image_url,
        video_url: form.video_url,
        cta_text: form.cta_text,
        cta_link:
          form.redirect_type === 'Property' && form.property_id
            ? generatePropertyUrl({ id: form.property_id })
            : form.redirect_type === 'Category'
              ? `/search?purpose=${form.category_name}`
              : form.cta_link,
        link_url: form.cta_link,
        redirect_type: form.redirect_type,
        property_id: form.property_id || null,
        category_name: form.category_name,
        priority: Number(form.priority) || 1,
        display_order: Number(form.display_order) || 0,
        start_date: form.start_date ? new Date(form.start_date).toISOString() : new Date().toISOString(),
        starts_at: form.start_date ? new Date(form.start_date).toISOString() : new Date().toISOString(),
        end_date: form.end_date ? new Date(form.end_date).toISOString() : null,
        ends_at: form.end_date ? new Date(form.end_date).toISOString() : null,
        is_active: form.is_active,
        auto_publish: form.auto_publish,
        schedule_publishing: form.schedule_publishing,
        target_audience: form.target_audience,
        city_targeting: form.city_targeting,
        device_targeting: form.device_targeting,
        impression_limit: Number(form.impression_limit) || 0,
        seo_alt_text: form.seo_alt_text || form.title,
        image_caption: form.image_caption,
        banner_tags: form.banner_tags ? form.banner_tags.split(',').map((t) => t.trim()) : [],
        internal_comments: form.internal_comments,
        html_content: form.html_content,
        button_text: form.button_text,
        ad_type: form.banner_type,
        position: form.placement,
        redirect_url: form.cta_link,
        target_page: form.redirect_type,
        device_type: form.device_targeting,
      };

      if (editing) {
        const { error } = await supabase.from('advertisements').update(payload).eq('id', editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('advertisements').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-ads'] });
      setShowForm(false);
      setEditing(null);
      setForm(initialForm);
    },
    onError: (err: Error) => alert(err.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('advertisements').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-ads'] }),
  });

  const toggle = useMutation({
    mutationFn: async (a: Advertisement) => {
      const { error } = await supabase.from('advertisements').update({ is_active: !a.is_active }).eq('id', a.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-ads'] }),
  });

  const handleUploadDesktop = async (file: File) => {
    setUploadingDesktop(true);
    const { url, error } = await uploadFile('advertisements', file);
    if (!error && url) {
      setForm((f) => ({ ...f, image_desktop: url, image_url: url }));
    } else if (error) {
      alert('Upload failed: ' + error);
    }
    setUploadingDesktop(false);
  };

  const handleUploadMobile = async (file: File) => {
    setUploadingMobile(true);
    const { url, error } = await uploadFile('advertisements', file);
    if (!error && url) {
      setForm((f) => ({ ...f, image_mobile: url }));
    } else if (error) {
      alert('Upload failed: ' + error);
    }
    setUploadingMobile(false);
  };

  const handleUploadLogo = async (file: File) => {
    setUploadingLogo(true);
    const { url, error } = await uploadFile('advertisements', file);
    if (!error && url) {
      setForm((f) => ({ ...f, company_logo: url }));
    } else if (error) {
      alert('Upload failed: ' + error);
    }
    setUploadingLogo(false);
  };

  const openEdit = (a: Advertisement) => {
    setEditing(a);
    setForm({
      title: a.title ?? '',
      subtitle: a.subtitle ?? '',
      description: a.description ?? '',
      banner_type: a.banner_type ?? 'Homepage',
      placement: a.placement ?? 'Middle',
      image_url: a.image_url ?? '',
      image_desktop: a.image_desktop ?? a.image_url ?? '',
      image_mobile: a.image_mobile ?? '',
      video_url: a.video_url ?? '',
      company_logo: a.company_logo ?? '',
      price_text: a.price_text ?? '',
      location_text: a.location_text ?? '',
      cta_text: a.cta_text ?? 'Explore Properties',
      cta_link: a.cta_link ?? a.link_url ?? '',
      redirect_type: a.redirect_type ?? 'External URL',
      property_id: a.property_id ?? '',
      category_name: a.category_name ?? 'Buy',
      priority: a.priority ?? 1,
      display_order: a.display_order ?? 0,
      start_date: a.start_date
        ? a.start_date.slice(0, 16)
        : a.starts_at
          ? a.starts_at.slice(0, 16)
          : new Date().toISOString().slice(0, 16),
      end_date: a.end_date ? a.end_date.slice(0, 16) : a.ends_at ? a.ends_at.slice(0, 16) : '',
      is_active: a.is_active ?? true,
      auto_publish: a.auto_publish ?? true,
      schedule_publishing: a.schedule_publishing ?? false,
      target_audience: a.target_audience ?? 'All Users',
      city_targeting: a.city_targeting ?? 'All Cities',
      device_targeting: a.device_targeting ?? 'All Devices',
      impression_limit: a.impression_limit ?? 0,
      seo_alt_text: a.seo_alt_text ?? '',
      image_caption: a.image_caption ?? '',
      banner_tags: a.banner_tags ? a.banner_tags.join(', ') : '',
      internal_comments: a.internal_comments ?? '',
      html_content: a.html_content ?? '',
      button_text: a.button_text ?? a.cta_text ?? 'Learn More',
    });
    setModalTab('info');
    setShowForm(true);
  };

  const handleExport = () => {
    exportToCsv('advertisements', filtered as unknown as Record<string, unknown>[], [
      { key: 'title', label: 'Title' },
      { key: 'banner_type', label: 'Type' },
      { key: 'placement', label: 'Placement' },
      { key: 'is_active', label: 'Active' },
      { key: 'priority', label: 'Priority' },
      { key: 'impressions', label: 'Impressions' },
      { key: 'clicks', label: 'Clicks' },
    ]);
  };

  return (
    <DashboardLayout
      sections={getAdminSections(t)}
      title={t('portal.advertisements', 'Advertisements & Banners')}
      badge="Admin"
    >
      <PageHeader
        title="Advertisement Banners"
        subtitle="Manage dynamic promotional banners across Home Page, Hero, Sidebar, Footer, and Category placements."
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
                setModalTab('info');
                setShowForm(true);
              }}
            >
              Add Banner
            </Button>
          </div>
        }
      />

      {/* Analytics Overview Cards */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Banners"
          value={(data ?? []).length}
          icon={<Megaphone className="h-5 w-5" />}
          accent="navy"
        />
        <StatCard
          label="Active Banners"
          value={(data ?? []).filter((a) => a.is_active).length}
          icon={<ToggleRight className="h-5 w-5" />}
          accent="success"
        />
        <StatCard
          label="Total Impressions"
          value={formatNumber(totalImpressions)}
          icon={<Eye className="h-5 w-5" />}
          accent="gold"
        />
        <StatCard
          label="Total Clicks (CTR)"
          value={`${totalClicks} (${avgCtr}%)`}
          icon={<ExternalLink className="h-5 w-5" />}
          accent="navy"
        />
      </div>

      {/* Filter and Search Bar */}
      <div className="mb-6 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-400" />
          <Input
            placeholder="Search banners by title or tag..."
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
            value={placementFilter}
            onChange={(e) => {
              setPlacementFilter(e.target.value);
              setPage(1);
            }}
            className="w-40 text-xs"
          >
            <option value="all">All Placements</option>
            <option value="Hero">Hero Banner</option>
            <option value="Middle">Middle Banner</option>
            <option value="Sidebar">Sidebar Banner</option>
            <option value="Footer">Footer Banner</option>
            <option value="Category">Category Banner</option>
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

      {/* Banner Cards Grid */}
      {isLoading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-56 rounded-2xl" />
          ))}
        </div>
      ) : pageItems.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {pageItems.map((a) => (
            <Card key={a.id} className="overflow-hidden flex flex-col justify-between hover:shadow-lg transition-all">
              <div>
                <div className="relative h-40 w-full overflow-hidden bg-navy-950">
                  <img
                    src={
                      a.image_desktop ||
                      a.image_url ||
                      'https://images.pexels.com/photos/323780/pexels-photo-323780.jpeg'
                    }
                    alt={a.title}
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute top-2 left-2 flex gap-1">
                    <Badge variant="default" className="text-[10px] uppercase font-bold tracking-wide">
                      {a.placement} Banner
                    </Badge>
                    <Badge variant="gold" className="text-[10px]">
                      Priority {a.priority ?? 1}
                    </Badge>
                  </div>
                  <div className="absolute top-2 right-2">
                    <Badge variant={a.is_active ? 'success' : 'default'}>{a.is_active ? 'Active' : 'Paused'}</Badge>
                  </div>
                </div>
                <div className="p-4">
                  <h4 className="font-bold text-navy-900 text-base line-clamp-1">{a.title}</h4>
                  {a.subtitle && <p className="text-xs text-navy-500 line-clamp-1 mt-0.5">{a.subtitle}</p>}

                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-navy-600 bg-navy-50/60 p-2.5 rounded-xl">
                    <div>
                      <span className="text-slate-500 mr-2">Views:</span>
                      <span className="font-bold">{a.impressions ?? 0}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 mr-2">Clicks:</span>
                      <span className="font-bold">{a.clicks ?? 0}</span>
                    </div>
                  </div>

                  {a.cta_link && (
                    <a
                      href={a.cta_link}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2.5 inline-flex items-center gap-1 text-xs text-red-600 font-semibold hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" /> {a.cta_text || 'CTA Link'} ({a.redirect_type || 'URL'})
                    </a>
                  )}
                </div>
              </div>

              <div className="p-4 pt-0 border-t border-navy-100/60 flex items-center justify-between mt-2">
                <span className="text-[11px] text-navy-400">Audience: {a.target_audience || 'All'}</span>
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    icon={<Edit2 className="h-4 w-4" />}
                    onClick={() => openEdit(a)}
                    title="Edit Banner"
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    icon={
                      a.is_active ? (
                        <ToggleRight className="h-4 w-4 text-success-600" />
                      ) : (
                        <ToggleLeft className="h-4 w-4 text-navy-400" />
                      )
                    }
                    onClick={() => toggle.mutate(a)}
                    title={a.is_active ? 'Deactivate' : 'Activate'}
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-error-600"
                    icon={<Trash2 className="h-4 w-4" />}
                    onClick={() => del.mutate(a.id)}
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
            icon={<Megaphone className="h-8 w-8 text-navy-400" />}
            title="No advertisement banners"
            description="Create promotional banners to display on Home Page, Hero, Sidebar, or Footer."
            action={
              <Button
                icon={<Plus className="h-4 w-4" />}
                onClick={() => {
                  setForm(initialForm);
                  setEditing(null);
                  setShowForm(true);
                }}
              >
                Add Banner
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

      {/* Enterprise Multi-Tab Banner Modal */}
      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title={editing ? 'Edit Advertisement Banner' : 'Create Enterprise Advertisement Banner'}
        footer={
          <div className="flex items-center justify-between w-full">
            <Button variant="secondary" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
            <Button loading={save.isPending || uploadingDesktop || uploadingMobile} onClick={() => save.mutate()}>
              {editing ? 'Update Banner' : 'Publish Banner'}
            </Button>
          </div>
        }
      >
        <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
          {/* Modal Tab Navigation Header */}
          <div className="flex flex-wrap gap-1 border-b border-navy-100 pb-2 mb-4">
            <button
              type="button"
              onClick={() => setModalTab('info')}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-bold transition-all',
                modalTab === 'info' ? 'bg-navy-900 text-white' : 'text-navy-600 hover:bg-navy-100',
              )}
            >
              1. Basic Info
            </button>
            <button
              type="button"
              onClick={() => setModalTab('media')}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-bold transition-all',
                modalTab === 'media' ? 'bg-navy-900 text-white' : 'text-navy-600 hover:bg-navy-100',
              )}
            >
              2. Media & Upload
            </button>
            <button
              type="button"
              onClick={() => setModalTab('redirection')}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-bold transition-all',
                modalTab === 'redirection' ? 'bg-navy-900 text-white' : 'text-navy-600 hover:bg-navy-100',
              )}
            >
              3. CTA & Redirection
            </button>
            <button
              type="button"
              onClick={() => setModalTab('schedule')}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-bold transition-all',
                modalTab === 'schedule' ? 'bg-navy-900 text-white' : 'text-navy-600 hover:bg-navy-100',
              )}
            >
              4. Schedule & Targeting
            </button>
            <button
              type="button"
              onClick={() => setModalTab('preview')}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-bold transition-all',
                modalTab === 'preview' ? 'bg-red-600 text-white' : 'text-red-600 hover:bg-red-50',
              )}
            >
              ✨ Live Preview
            </button>
          </div>

          {/* TAB 1: BASIC INFO */}
          {modalTab === 'info' && (
            <div className="space-y-3">
              <Input
                label="Banner Title *"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="e.g. Exclusive 3BHK Luxury Apartments 20% Off"
              />
              <Input
                label="Banner Subtitle"
                value={form.subtitle}
                onChange={(e) => setForm((f) => ({ ...f, subtitle: e.target.value }))}
                placeholder="e.g. Premium High-Rise Gated Community in Gachibowli"
              />
              <Textarea
                label="Banner Description"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Detailed promotional content for users..."
              />

              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  label="Price / Offer (for Hero slides)"
                  value={form.price_text}
                  onChange={(e) => setForm((f) => ({ ...f, price_text: e.target.value }))}
                  placeholder="e.g. ₹85L onwards"
                />
                <Input
                  label="Location (for Hero slides)"
                  value={form.location_text}
                  onChange={(e) => setForm((f) => ({ ...f, location_text: e.target.value }))}
                  placeholder="e.g. Gachibowli, Hyderabad"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Select
                  label="Advertisement Type"
                  value={form.banner_type}
                  onChange={(e) => setForm((f) => ({ ...f, banner_type: e.target.value }))}
                >
                  <option value="Banner Image">Banner Image</option>
                  <option value="HTML Advertisement">HTML / Custom Advertisement</option>
                  <option value="Popup">Popup Interstitial</option>
                </Select>

                <Select
                  label="Display Location / Position *"
                  value={form.placement}
                  onChange={(e) => setForm((f) => ({ ...f, placement: e.target.value }))}
                >
                  <option value="RIGHT_SIDEBAR_TOP">Right Sidebar (Top)</option>
                  <option value="RIGHT_SIDEBAR_MIDDLE">Right Sidebar (Middle)</option>
                  <option value="BETWEEN_LISTINGS">Between Listings (Mobile Inline)</option>
                  <option value="Middle">Home Page Middle Section</option>
                  <option value="Hero">Hero Section</option>
                </Select>
              </div>

              {form.banner_type === 'HTML Advertisement' && (
                <Textarea
                  label="Raw HTML Content *"
                  value={form.html_content}
                  onChange={(e) => setForm((f) => ({ ...f, html_content: e.target.value }))}
                  placeholder="<div><h1>Special Offer</h1></div>"
                  rows={5}
                />
              )}

              {/* Banner Image File Upload Field directly on Tab 1 */}
              <div className="pt-3 border-t border-navy-100/80">
                <label className="label font-bold text-xs uppercase tracking-wider text-navy-800 block mb-1">
                  Upload Banner Image *
                </label>
                {form.image_desktop && (
                  <div className="mb-2.5 relative rounded-xl overflow-hidden border border-navy-200 shadow-sm max-h-32">
                    <img src={form.image_desktop} alt="Banner preview" className="w-full h-28 object-cover" />
                    <span className="absolute bottom-2 right-2 bg-navy-900/80 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
                      Image Uploaded ✓
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleUploadDesktop(file);
                    }}
                    className="text-xs text-navy-500 file:mr-2 file:rounded-lg file:border-0 file:bg-navy-900 file:px-3.5 file:py-2 file:text-white file:font-bold hover:file:bg-navy-800 transition-all cursor-pointer"
                  />
                  {uploadingDesktop && (
                    <span className="text-xs text-red-600 font-bold animate-pulse">Uploading image...</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: MEDIA & UPLOAD */}
          {modalTab === 'media' && (
            <div className="space-y-4">
              <div>
                <label className="label font-bold text-xs uppercase tracking-wider text-navy-700">
                  Desktop Banner Image (Drag & Drop or Upload)
                </label>
                {form.image_desktop && (
                  <img
                    src={form.image_desktop}
                    alt="Desktop preview"
                    className="mb-2 h-28 w-full rounded-xl object-cover border border-navy-200"
                  />
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleUploadDesktop(file);
                  }}
                  className="text-xs text-navy-500 file:mr-2 file:rounded-lg file:border-0 file:bg-navy-900 file:px-3 file:py-2 file:text-white file:font-semibold hover:file:bg-navy-800"
                />
              </div>

              <div>
                <label className="label font-bold text-xs uppercase tracking-wider text-navy-700">
                  Mobile Banner Image (Optional)
                </label>
                {form.image_mobile && (
                  <img
                    src={form.image_mobile}
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
              </div>

              <div>
                <label className="label font-bold text-xs uppercase tracking-wider text-navy-700">
                  Property / Company Logo (Optional)
                </label>
                {form.company_logo && (
                  <img
                    src={form.company_logo}
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
                {uploadingLogo && (
                  <span className="text-xs text-red-600 font-bold animate-pulse block mt-1">Uploading logo...</span>
                )}
              </div>

              <Input
                label="Video URL (Optional animated banner MP4)"
                value={form.video_url}
                onChange={(e) => setForm((f) => ({ ...f, video_url: e.target.value }))}
                placeholder="https://cdn.example.com/promo.mp4"
              />

              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  label="SEO Alt Text"
                  value={form.seo_alt_text}
                  onChange={(e) => setForm((f) => ({ ...f, seo_alt_text: e.target.value }))}
                  placeholder="Alt text for screen readers..."
                />
                <Input
                  label="Image Caption"
                  value={form.image_caption}
                  onChange={(e) => setForm((f) => ({ ...f, image_caption: e.target.value }))}
                  placeholder="Caption under banner..."
                />
              </div>
            </div>
          )}

          {/* TAB 3: CTA & REDIRECTION */}
          {modalTab === 'redirection' && (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  label="CTA Button Text"
                  value={form.button_text}
                  onChange={(e) => setForm((f) => ({ ...f, button_text: e.target.value }))}
                  placeholder="e.g. Explore Properties"
                />
                <Select
                  label="Redirect Type"
                  value={form.redirect_type}
                  onChange={(e) => setForm((f) => ({ ...f, redirect_type: e.target.value }))}
                >
                  <option value="External URL">External URL / Custom Link</option>
                  <option value="Property">Direct Property Listing</option>
                  <option value="Category">Property Purpose / Category</option>
                  <option value="Custom Page">Custom Promotional Landing Page</option>
                </Select>
              </div>

              {form.redirect_type === 'Property' && (
                <div>
                  <label className="label">Select Property Listing</label>
                  <Select
                    value={form.property_id}
                    onChange={(e) => setForm((f) => ({ ...f, property_id: e.target.value }))}
                  >
                    <option value="">-- Choose Live Property --</option>
                    {(properties ?? []).map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title} ({p.purpose} - ₹{p.price})
                      </option>
                    ))}
                  </Select>
                </div>
              )}

              {form.redirect_type === 'Category' && (
                <div>
                  <label className="label">Select Category / Purpose</label>
                  <Select
                    value={form.category_name}
                    onChange={(e) => setForm((f) => ({ ...f, category_name: e.target.value }))}
                  >
                    <option value="Buy">Buy Properties</option>
                    <option value="Rent">Rent Properties</option>
                    <option value="Commercial">Commercial Spaces</option>
                    <option value="Plots">Plots & Lands</option>
                    <option value="Projects">Builder Projects</option>
                  </Select>
                </div>
              )}

              <Input
                label="Redirect Link URL"
                value={form.cta_link}
                onChange={(e) => setForm((f) => ({ ...f, cta_link: e.target.value }))}
                placeholder="https://realtynow.in/promotions/monsoon-deals"
              />
            </div>
          )}

          {/* TAB 4: SCHEDULE & TARGETING */}
          {modalTab === 'schedule' && (
            <div className="space-y-4">
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
                  label="Banner Priority (1-5)"
                  type="number"
                  min="1"
                  max="5"
                  value={form.priority}
                  onChange={(e) => setForm((f) => ({ ...f, priority: parseInt(e.target.value) || 1 }))}
                />
                <Input
                  label="Display Order"
                  type="number"
                  min="0"
                  value={form.display_order}
                  onChange={(e) => setForm((f) => ({ ...f, display_order: parseInt(e.target.value) || 0 }))}
                />
                <Input
                  label="Impression Limit (0 = Unlimited)"
                  type="number"
                  min="0"
                  value={form.impression_limit}
                  onChange={(e) => setForm((f) => ({ ...f, impression_limit: parseInt(e.target.value) || 0 }))}
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <Select
                  label="Target Audience"
                  value={form.target_audience}
                  onChange={(e) => setForm((f) => ({ ...f, target_audience: e.target.value }))}
                >
                  <option value="All Users">All Users</option>
                  <option value="Buyers">Buyers Only</option>
                  <option value="Sellers">Sellers Only</option>
                  <option value="Agents">Agents Only</option>
                  <option value="Guests">Guests / Visitors</option>
                </Select>

                <Select
                  label="City Targeting"
                  value={form.city_targeting}
                  onChange={(e) => setForm((f) => ({ ...f, city_targeting: e.target.value }))}
                >
                  <option value="All Cities">All Cities</option>
                  <option value="Hyderabad">Hyderabad</option>
                  <option value="Bangalore">Bangalore</option>
                  <option value="Mumbai">Mumbai</option>
                  <option value="Delhi NCR">Delhi NCR</option>
                </Select>

                <Select
                  label="Device Targeting"
                  value={form.device_targeting}
                  onChange={(e) => setForm((f) => ({ ...f, device_targeting: e.target.value }))}
                >
                  <option value="All Devices">All Devices</option>
                  <option value="Desktop Only">Desktop Only</option>
                  <option value="Mobile Only">Mobile Only</option>
                </Select>
              </div>

              <div className="flex flex-wrap gap-4 pt-2">
                <label className="flex items-center gap-2 text-xs font-bold text-navy-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
                    className="h-4 w-4 rounded border-navy-300 text-red-600 focus:ring-red-500"
                  />
                  Is Active & Live
                </label>
                <label className="flex items-center gap-2 text-xs font-bold text-navy-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.auto_publish}
                    onChange={(e) => setForm((f) => ({ ...f, auto_publish: e.target.checked }))}
                    className="h-4 w-4 rounded border-navy-300 text-red-600 focus:ring-red-500"
                  />
                  Auto Publish Immediately
                </label>
              </div>

              <Input
                label="Banner Tags (comma-separated)"
                value={form.banner_tags}
                onChange={(e) => setForm((f) => ({ ...f, banner_tags: e.target.value }))}
                placeholder="luxury, discount, hyderabad, monsoon"
              />
              <Textarea
                label="Internal Comments / Notes"
                value={form.internal_comments}
                onChange={(e) => setForm((f) => ({ ...f, internal_comments: e.target.value }))}
                placeholder="Notes for admin team..."
              />
            </div>
          )}

          {/* TAB 5: REAL-TIME LIVE PREVIEW */}
          {modalTab === 'preview' && (
            <div className="space-y-4 bg-slate-900 p-4 rounded-2xl text-white">
              <p className="text-xs font-bold text-red-400 uppercase tracking-wider">
                ✨ Real-Time Banner Preview on Home Page
              </p>

              <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-red-950 via-slate-900 to-navy-950 p-6 sm:p-8 border border-white/10 shadow-2xl">
                {form.image_desktop && (
                  <img
                    src={form.image_desktop}
                    alt="Preview background"
                    className="absolute inset-0 h-full w-full object-cover opacity-30 mix-blend-overlay"
                  />
                )}
                <div className="relative z-10 max-w-xl">
                  <span className="inline-block rounded-full bg-red-600 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-white mb-2 shadow-md">
                    Featured Advertisement
                  </span>
                  <h3 className="font-display text-2xl sm:text-3xl font-extrabold text-white leading-tight">
                    {form.title || 'Your Banner Title Here'}
                  </h3>
                  {form.subtitle && <p className="mt-1.5 text-sm font-medium text-slate-300">{form.subtitle}</p>}
                  {form.description && <p className="mt-2 text-xs text-slate-400 line-clamp-2">{form.description}</p>}
                  <div className="mt-5">
                    <button
                      type="button"
                      className="rounded-xl bg-gradient-to-r from-red-600 to-rose-600 px-6 py-3 text-xs font-bold text-white shadow-lg shadow-red-600/40 hover:scale-105 transition-all"
                    >
                      {form.cta_text || 'Explore Properties'} →
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </DashboardLayout>
  );
}
