import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit3, Trash2, FileText, Eye, Upload, Folder } from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import { DashboardLayout, PageHeader, StatCard } from '../../components/dashboard-layout';
import { getBuilderSections } from '../portal/sections';
import { useLanguageContext } from '../../lib/i18n';
import { DataTable, type Column } from '../../components/data-table';
import { Badge, Button, Modal, Input, Select, EmptyState } from '../../components/ui';
import { useToast } from '../../components/toast';
import { useRealtimeCount } from '../../lib/realtime';
import { logBuilderAudit } from '../../lib/builder-audit';
import { uploadFile, deleteFile } from '../../lib/storage';
import { formatDate, cn } from '../../lib/utils';
import type { BuilderDocument, BuilderDocumentVisibility } from '../../lib/types';

type DocumentRow = BuilderDocument & { builder_projects: { name: string } | null };

interface ProjectOption {
  id: string;
  name: string;
}

type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info' | 'gold';

const CATEGORY_OPTIONS = ['general', 'legal', 'RERA', 'brochure', 'other'];
const VISIBILITY_OPTIONS: BuilderDocumentVisibility[] = ['private', 'customers', 'public'];

function makeEmptyForm() {
  return {
    id: '',
    title: '',
    category: 'general',
    project_id: '',
    visibility: 'private' as BuilderDocumentVisibility,
    file_url: '',
    file_path: '',
  };
}

function visibilityVariant(v: BuilderDocumentVisibility): BadgeVariant {
  if (v === 'public') return 'success';
  if (v === 'customers') return 'info';
  return 'default';
}

export function BuilderDocuments() {
  const { user } = useAuth();
  const { t } = useLanguageContext();
  const builderSections = getBuilderSections(t);
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(makeEmptyForm());
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [toDelete, setToDelete] = useState<DocumentRow | null>(null);

  const realtimeTick = useRealtimeCount('builder_documents');

  const { data: projects } = useQuery({
    queryKey: ['builder-documents-projects', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('builder_projects')
        .select('id, name')
        .eq('builder_id', user!.id)
        .order('name');
      if (error) throw error;
      return (data ?? []) as ProjectOption[];
    },
    enabled: !!user,
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ['builder-documents', user?.id, realtimeTick],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('builder_documents')
        .select('*, builder_projects(name)')
        .eq('builder_id', user!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as DocumentRow[];
    },
    enabled: !!user,
  });

  const categoryStats = useMemo(() => {
    const map = new Map<string, number>();
    (data ?? []).forEach((d) => map.set(d.category, (map.get(d.category) ?? 0) + 1));
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [data]);

  const deleteMutation = useMutation({
    mutationFn: async (doc: DocumentRow) => {
      if (doc.file_path) await deleteFile('builder-documents', doc.file_path);
      const { error } = await supabase.from('builder_documents').delete().eq('id', doc.id);
      if (error) throw error;
      return doc.id;
    },
    onSuccess: async (id) => {
      await logBuilderAudit('delete', 'builder_document', id);
      addToast('success', 'Document deleted');
      setToDelete(null);
      queryClient.invalidateQueries({ queryKey: ['builder-documents'] });
    },
    onError: (err: Error) => addToast('error', err.message || 'Failed to delete document'),
  });

  const openCreate = () => {
    setForm(makeEmptyForm());
    setFormErrors({});
    setModalOpen(true);
  };

  const openEdit = (d: DocumentRow) => {
    setForm({
      id: d.id,
      title: d.title,
      category: d.category,
      project_id: d.project_id ?? '',
      visibility: d.visibility,
      file_url: d.file_url,
      file_path: d.file_path ?? '',
    });
    setFormErrors({});
    setModalOpen(true);
  };

  const handleFileSelect = async (file: File) => {
    setUploading(true);
    const { url, path, error: uploadError } = await uploadFile('builder-documents', file);
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
        builder_id: user!.id,
        title: form.title.trim(),
        category: form.category,
        project_id: form.project_id || null,
        visibility: form.visibility,
        file_url: form.file_url,
        file_path: form.file_path || null,
      };
      if (form.id) {
        const { error } = await supabase.from('builder_documents').update(payload).eq('id', form.id);
        if (error) throw error;
        await logBuilderAudit('update', 'builder_document', form.id, payload);
        addToast('success', 'Document updated');
      } else {
        const { data: inserted, error } = await supabase.from('builder_documents').insert(payload).select('id').single();
        if (error) throw error;
        await logBuilderAudit('create', 'builder_document', inserted?.id ?? null, payload);
        addToast('success', 'Document uploaded');
      }
      setModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['builder-documents'] });
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : 'Failed to save document');
    } finally {
      setSaving(false);
    }
  };

  const columns: Column<DocumentRow>[] = useMemo(
    () => [
      {
        key: 'title',
        header: 'Title',
        sortable: true,
        render: (d) => <span className="font-medium text-navy-900">{d.title}</span>,
      },
      { key: 'category', header: 'Category', render: (d) => <span className="capitalize">{d.category}</span> },
      { key: 'project', header: 'Project', render: (d) => d.builder_projects?.name ?? '—' },
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
    <DashboardLayout sections={builderSections} title="Documents" badge="Builder">
      <PageHeader
        title="Documents"
        subtitle="Manage legal, RERA, and marketing documents for your projects."
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
            description="Upload legal, RERA, or marketing documents to share and organize them."
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
          <Select
            label="Category"
            value={form.category}
            onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
          >
            {CATEGORY_OPTIONS.map((c) => (
              <option key={c} value={c} className="capitalize">
                {c}
              </option>
            ))}
          </Select>
          <Select
            label="Project (optional)"
            value={form.project_id}
            onChange={(e) => setForm((f) => ({ ...f, project_id: e.target.value }))}
          >
            <option value="">No specific project</option>
            {(projects ?? []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
          <Select
            label="Visibility"
            value={form.visibility}
            onChange={(e) => setForm((f) => ({ ...f, visibility: e.target.value as BuilderDocumentVisibility }))}
          >
            {VISIBILITY_OPTIONS.map((v) => (
              <option key={v} value={v} className="capitalize">
                {v}
              </option>
            ))}
          </Select>
          <div className="sm:col-span-2">
            <label className="label">File</label>
            <div className="flex items-center gap-2">
              <input
                type="file"
                id="builder-document-file"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileSelect(file);
                }}
              />
              <label
                htmlFor="builder-document-file"
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
