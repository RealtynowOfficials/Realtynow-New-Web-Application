import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit3, Trash2, FileText, Eye, Upload, Folder } from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import { DashboardLayout, PageHeader, StatCard } from '../../components/dashboard-layout';
import { getAgentSections } from '../portal/sections';
import { useLanguageContext } from '../../lib/i18n/language-context';
import { DataTable, type Column } from '../../components/data-table';
import { Badge, Button, Modal, Input, Select, EmptyState } from '../../components/ui';
import { useToast } from '../../components/toast';
import { useRealtimeCount } from '../../lib/realtime';
import { uploadFile, deleteFile } from '../../lib/storage';
import { formatDate, cn } from '../../lib/utils';

type DocVisibility = 'private' | 'client' | 'public';

interface AgentDocument {
  id: string;
  title: string;
  category: string;
  visibility: DocVisibility;
  file_url: string;
  file_path: string | null;
  lead_id: string | null;
  property_id: string | null;
  created_at: string;
  properties: { title: string } | null;
}

const CATEGORY_OPTIONS = ['general', 'legal', 'agreement', 'kyc', 'other'];
const VISIBILITY_OPTIONS: DocVisibility[] = ['private', 'client', 'public'];

function makeEmptyForm() {
  return {
    id: '',
    title: '',
    category: 'general',
    property_id: '',
    lead_id: '',
    visibility: 'private' as DocVisibility,
    file_url: '',
    file_path: '',
  };
}

function visibilityVariant(v: DocVisibility): 'default' | 'success' | 'info' {
  if (v === 'public') return 'success';
  if (v === 'client') return 'info';
  return 'default';
}

export function AgentDocuments() {
  const { user } = useAuth();
  const { t } = useLanguageContext();
  const agentSections = getAgentSections(t);
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(makeEmptyForm());
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [toDelete, setToDelete] = useState<AgentDocument | null>(null);

  const realtimeTick = useRealtimeCount('agent_documents', { column: 'agent_id', value: user?.id ?? '' });

  const { data: properties } = useQuery({
    queryKey: ['agent-documents-properties', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('properties')
        .select('id, title')
        .eq('assigned_agent_id', user!.id)
        .order('title');
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ['agent-documents', user?.id, realtimeTick],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agent_documents')
        .select('*, properties(title)')
        .eq('agent_id', user!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as AgentDocument[];
    },
    enabled: !!user,
  });

  const categoryStats = useMemo(() => {
    const map = new Map<string, number>();
    (data ?? []).forEach((d) => map.set(d.category, (map.get(d.category) ?? 0) + 1));
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [data]);

  const deleteMutation = useMutation({
    mutationFn: async (doc: AgentDocument) => {
      if (doc.file_path) await deleteFile('agent-documents', doc.file_path);
      const { error } = await supabase.from('agent_documents').delete().eq('id', doc.id);
      if (error) throw error;
    },
    onSuccess: () => {
      addToast('success', 'Document deleted');
      setToDelete(null);
      queryClient.invalidateQueries({ queryKey: ['agent-documents'] });
    },
    onError: (err: Error) => addToast('error', err.message || 'Failed to delete document'),
  });

  const openCreate = () => {
    setForm(makeEmptyForm());
    setFormErrors({});
    setModalOpen(true);
  };

  const openEdit = (d: AgentDocument) => {
    setForm({
      id: d.id,
      title: d.title,
      category: d.category,
      property_id: d.property_id ?? '',
      lead_id: d.lead_id ?? '',
      visibility: d.visibility,
      file_url: d.file_url,
      file_path: d.file_path ?? '',
    });
    setFormErrors({});
    setModalOpen(true);
  };

  const handleFileSelect = async (file: File) => {
    setUploading(true);
    const { url, path, error: uploadError } = await uploadFile('agent-documents', file);
    if (uploadError || !url) {
      addToast('error', uploadError || 'Failed to upload file');
    } else {
      setForm((f) => ({ ...f, file_url: url, file_path: path }));
      addToast('success', 'File uploaded');
    }
    setUploading(false);
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.title.trim()) errs.title = 'Title is required';
    if (!form.file_url) errs.file_url = 'Please upload a file';
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const save = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = {
        agent_id: user!.id,
        title: form.title.trim(),
        category: form.category,
        property_id: form.property_id || null,
        lead_id: form.lead_id || null,
        visibility: form.visibility,
        file_url: form.file_url,
        file_path: form.file_path || null,
      };
      if (form.id) {
        const { error } = await supabase.from('agent_documents').update(payload).eq('id', form.id);
        if (error) throw error;
        addToast('success', 'Document updated');
      } else {
        const { error } = await supabase.from('agent_documents').insert(payload);
        if (error) throw error;
        addToast('success', 'Document uploaded');
      }
      setModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['agent-documents'] });
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : 'Failed to save document');
    } finally {
      setSaving(false);
    }
  };

  const columns: Column<AgentDocument>[] = useMemo(
    () => [
      { key: 'title', header: 'Title', sortable: true, render: (d) => <span className="font-medium text-navy-900">{d.title}</span> },
      { key: 'category', header: 'Category', render: (d) => <span className="capitalize">{d.category}</span> },
      { key: 'property', header: 'Property', render: (d) => d.properties?.title ?? '—' },
      {
        key: 'visibility',
        header: 'Visibility',
        render: (d) => (
          <Badge variant={visibilityVariant(d.visibility)} className="capitalize">
            {d.visibility}
          </Badge>
        ),
      },
      { key: 'created_at', header: 'Uploaded', sortable: true, render: (d) => formatDate(d.created_at) },
      {
        key: 'actions',
        header: 'Actions',
        render: (d) => (
          <div className="flex gap-1">
            <Button size="sm" variant="ghost" icon={<Eye className="h-4 w-4" />} onClick={() => window.open(d.file_url, '_blank')} />
            <Button size="sm" variant="ghost" icon={<Edit3 className="h-4 w-4" />} onClick={() => openEdit(d)} />
            <Button
              size="sm"
              variant="ghost"
              className="text-error-600"
              icon={<Trash2 className="h-4 w-4" />}
              onClick={() => setToDelete(d)}
            />
          </div>
        ),
      },
    ],
    [],
  );

  return (
    <DashboardLayout sections={agentSections} title="Documents" badge="Agent">
      <PageHeader
        title="Documents"
        subtitle="Store agreements, KYC, and other files tied to your leads and listings."
        action={
          <Button icon={<Plus className="h-4 w-4" />} onClick={openCreate}>
            Upload Document
          </Button>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Documents" value={data?.length ?? 0} icon={<FileText className="h-5 w-5" />} accent="navy" />
        {categoryStats.slice(0, 3).map(([category, count]) => (
          <StatCard key={category} label={`${category} docs`} value={count} icon={<Folder className="h-5 w-5" />} accent="gold" />
        ))}
      </div>

      <DataTable
        columns={columns}
        rows={data ?? []}
        loading={isLoading}
        error={error instanceof Error ? error.message : null}
        getRowId={(d) => d.id}
        searchKeys={['title', 'category']}
        emptyState={
          <EmptyState
            icon={<FileText className="h-6 w-6" />}
            title="No documents yet"
            description="Upload agreements, KYC, or other files to keep them organized."
          />
        }
      />

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={form.id ? 'Edit document' : 'Upload document'}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={save} loading={saving}>
              Save
            </Button>
          </>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Input
              label="Title"
              value={form.title}
              error={formErrors.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            />
          </div>
          <Select label="Category" value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}>
            {CATEGORY_OPTIONS.map((c) => (
              <option key={c} value={c} className="capitalize">
                {c}
              </option>
            ))}
          </Select>
          <Select
            label="Visibility"
            value={form.visibility}
            onChange={(e) => setForm((f) => ({ ...f, visibility: e.target.value as DocVisibility }))}
          >
            {VISIBILITY_OPTIONS.map((v) => (
              <option key={v} value={v} className="capitalize">
                {v}
              </option>
            ))}
          </Select>
          <Select
            label="Property (optional)"
            value={form.property_id}
            onChange={(e) => setForm((f) => ({ ...f, property_id: e.target.value }))}
          >
            <option value="">No specific property</option>
            {(properties ?? []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </Select>
          <div className="sm:col-span-2">
            <label className="label">File</label>
            <div className="flex items-center gap-2">
              <input
                type="file"
                id="agent-document-file"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileSelect(file);
                }}
              />
              <label
                htmlFor="agent-document-file"
                className={cn(
                  'inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-navy-900 px-4 py-2 text-xs font-bold text-white shadow transition-all hover:bg-navy-800',
                  uploading && 'pointer-events-none opacity-50',
                )}
              >
                <Upload className="h-3.5 w-3.5" />
                <span>{uploading ? 'Uploading…' : form.file_url ? 'Replace File' : 'Choose File'}</span>
              </label>
              {form.file_url && <span className="text-xs font-bold text-success-600">✓ File ready</span>}
            </div>
            {formErrors.file_url && <p className="mt-1 text-xs text-error-600">{formErrors.file_url}</p>}
          </div>
        </div>
      </Modal>

      <Modal
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        title="Delete document"
        footer={
          <>
            <Button variant="secondary" onClick={() => setToDelete(null)}>
              Cancel
            </Button>
            <Button variant="danger" loading={deleteMutation.isPending} onClick={() => toDelete && deleteMutation.mutate(toDelete)}>
              Delete
            </Button>
          </>
        }
      >
        <p className="text-sm text-navy-700">This will permanently delete this document and its uploaded file.</p>
      </Modal>
    </DashboardLayout>
  );
}
