import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Images, Plus, Trash2, ArrowUp, ArrowDown, PlayCircle, ImageOff, Video } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { useLanguageContext } from '../../lib/i18n';
import { DashboardLayout, PageHeader, StatCard } from '../../components/dashboard-layout';
import { getBuilderSections } from '../portal/sections';
import { Card, Button, Modal, Input, Select, EmptyState, Skeleton } from '../../components/ui';
import { uploadFile } from '../../lib/storage';
import { logBuilderAudit } from '../../lib/builder-audit';
import { useToast } from '../../components/toast';
import { useRealtimeCount } from '../../lib/realtime';
import type { BuilderMediaGalleryItem, BuilderProject } from '../../lib/types';

interface MediaForm {
  project_id: string;
  media_type: 'image' | 'video';
  caption: string;
}

const emptyForm: MediaForm = { project_id: '', media_type: 'image', caption: '' };

export function BuilderGallery() {
  const { user } = useAuth();
  const { t } = useLanguageContext();
  const builderSections = getBuilderSections(t);
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const realtimeTick = useRealtimeCount('builder_media_gallery');

  const [projectFilter, setProjectFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<MediaForm>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState<BuilderMediaGalleryItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { data: projects } = useQuery({
    queryKey: ['builder-gallery-projects', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('builder_projects')
        .select('id, name')
        .eq('builder_id', user!.id)
        .order('name');
      if (error) throw error;
      return (data ?? []) as Pick<BuilderProject, 'id' | 'name'>[];
    },
    enabled: !!user,
  });

  const projectIds = useMemo(() => (projects ?? []).map((p) => p.id), [projects]);

  const { data: gallery, isLoading, error } = useQuery({
    queryKey: ['builder-gallery', projectIds.join(','), realtimeTick],
    queryFn: async () => {
      if (!projectIds.length) return [] as BuilderMediaGalleryItem[];
      const { data, error } = await supabase
        .from('builder_media_gallery')
        .select('*')
        .in('project_id', projectIds)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return (data ?? []) as BuilderMediaGalleryItem[];
    },
    enabled: projectIds.length > 0,
  });

  const filtered = useMemo(
    () => (gallery ?? []).filter((g) => !projectFilter || g.project_id === projectFilter),
    [gallery, projectFilter],
  );

  const projectName = (id: string) => (projects ?? []).find((p) => p.id === id)?.name ?? '—';

  const openCreate = () => {
    setForm({ ...emptyForm, project_id: projectFilter || projects?.[0]?.id || '' });
    setFile(null);
    setErrors({});
    setShowForm(true);
  };

  const validate = () => {
    const next: Record<string, string> = {};
    if (!form.project_id) next.project_id = 'Project is required';
    if (!file) next.file = 'A file is required';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error('A file is required');
      const res = await uploadFile('builder-media', file);
      if (res.error) throw new Error(res.error);
      const siblingCount = (gallery ?? []).filter((g) => g.project_id === form.project_id).length;
      const payload = {
        project_id: form.project_id,
        media_url: res.url,
        media_type: form.media_type,
        caption: form.caption.trim() || null,
        sort_order: siblingCount,
      };
      const { data, error } = await supabase.from('builder_media_gallery').insert(payload).select('id').single();
      if (error) throw error;
      await logBuilderAudit('create', 'builder_media_gallery', data?.id ?? null, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['builder-gallery'] });
      addToast('success', 'Media added');
      setShowForm(false);
    },
    onError: (e: unknown) => {
      addToast('error', e instanceof Error ? e.message : 'Failed to upload media');
    },
    onSettled: () => setSaving(false),
  });

  const handleSave = () => {
    if (!validate()) return;
    setSaving(true);
    saveMutation.mutate();
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      const { error } = await supabase.from('builder_media_gallery').delete().eq('id', toDelete.id);
      if (error) throw error;
      await logBuilderAudit('delete', 'builder_media_gallery', toDelete.id, { caption: toDelete.caption });
      queryClient.invalidateQueries({ queryKey: ['builder-gallery'] });
      addToast('success', 'Media deleted');
      setToDelete(null);
    } catch (e) {
      addToast('error', e instanceof Error ? e.message : 'Failed to delete media');
    } finally {
      setDeleting(false);
    }
  };

  const moveMutation = useMutation({
    mutationFn: async ({ item, direction }: { item: BuilderMediaGalleryItem; direction: 'up' | 'down' }) => {
      const siblings = (gallery ?? [])
        .filter((g) => g.project_id === item.project_id)
        .sort((a, b) => a.sort_order - b.sort_order);
      const idx = siblings.findIndex((s) => s.id === item.id);
      const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= siblings.length) return;
      const swapWith = siblings[swapIdx];
      const [{ error: e1 }, { error: e2 }] = await Promise.all([
        supabase.from('builder_media_gallery').update({ sort_order: swapWith.sort_order }).eq('id', item.id),
        supabase.from('builder_media_gallery').update({ sort_order: item.sort_order }).eq('id', swapWith.id),
      ]);
      if (e1) throw e1;
      if (e2) throw e2;
      await logBuilderAudit('update', 'builder_media_gallery', item.id, { reordered: true });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['builder-gallery'] }),
    onError: (e: unknown) => addToast('error', e instanceof Error ? e.message : 'Failed to reorder'),
  });

  const stats = useMemo(() => {
    const rows = gallery ?? [];
    return {
      total: rows.length,
      images: rows.filter((r) => r.media_type === 'image').length,
      videos: rows.filter((r) => r.media_type === 'video').length,
      captioned: rows.filter((r) => !!r.caption).length,
    };
  }, [gallery]);

  return (
    <DashboardLayout sections={builderSections} title="Media Gallery" badge="Builder">
      <PageHeader
        title="Media Gallery"
        subtitle="Manage photos and videos shown on your project listings."
        action={
          <Button icon={<Plus className="h-4 w-4" />} onClick={openCreate} disabled={!projects?.length}>
            Add Media
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <StatCard label="Total Media" value={stats.total} icon={<Images className="h-5 w-5" />} accent="navy" />
        <StatCard label="Images" value={stats.images} icon={<Images className="h-5 w-5" />} accent="gold" />
        <StatCard label="Videos" value={stats.videos} icon={<Video className="h-5 w-5" />} accent="navy" />
        <StatCard label="Captioned" value={stats.captioned} icon={<Images className="h-5 w-5" />} accent="success" />
      </div>

      <div className="mb-4 max-w-xs">
        <Select value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)}>
          <option value="">All projects</option>
          {(projects ?? []).map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </Select>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-error-200 bg-error-50 px-4 py-3 text-sm font-medium text-error-700">
          {error instanceof Error ? error.message : 'Failed to load media'}
        </div>
      )}

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-2xl" />
          ))}
        </div>
      ) : !filtered.length ? (
        <Card>
          <EmptyState
            icon={<Images className="h-6 w-6" />}
            title="No media yet"
            description="Add photos or videos to showcase this project."
            action={
              <Button icon={<Plus className="h-4 w-4" />} onClick={openCreate} disabled={!projects?.length}>
                Add Media
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((item, i) => (
            <Card key={item.id} className="overflow-hidden flex flex-col">
              <div className="relative aspect-video bg-navy-100">
                {item.media_type === 'video' ? (
                  <div className="relative h-full w-full">
                    <video src={item.media_url} className="h-full w-full object-cover" />
                    <div className="absolute inset-0 flex items-center justify-center bg-navy-950/20">
                      <PlayCircle className="h-10 w-10 text-white" />
                    </div>
                  </div>
                ) : item.media_url ? (
                  <img src={item.media_url} alt={item.caption ?? ''} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-navy-300">
                    <ImageOff className="h-8 w-8" />
                  </div>
                )}
              </div>
              <div className="p-4 flex-1 flex flex-col justify-between">
                <div>
                  <p className="text-xs text-navy-500">{projectName(item.project_id)}</p>
                  <p className="mt-1 text-sm font-medium text-navy-900 line-clamp-2">{item.caption || '—'}</p>
                </div>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="secondary"
                      icon={<ArrowUp className="h-4 w-4" />}
                      disabled={i === 0}
                      onClick={() => moveMutation.mutate({ item, direction: 'up' })}
                    />
                    <Button
                      size="sm"
                      variant="secondary"
                      icon={<ArrowDown className="h-4 w-4" />}
                      disabled={i === filtered.length - 1}
                      onClick={() => moveMutation.mutate({ item, direction: 'down' })}
                    />
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-error-600"
                    icon={<Trash2 className="h-4 w-4" />}
                    onClick={() => setToDelete(item)}
                  />
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title="Add media"
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} loading={saving}>
              Upload
            </Button>
          </>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Select
            label="Project"
            value={form.project_id}
            error={errors.project_id}
            onChange={(e) => setForm((f) => ({ ...f, project_id: e.target.value }))}
          >
            <option value="">Select project</option>
            {(projects ?? []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
          <Select
            label="Media type"
            value={form.media_type}
            onChange={(e) => setForm((f) => ({ ...f, media_type: e.target.value as 'image' | 'video' }))}
          >
            <option value="image">Image</option>
            <option value="video">Video</option>
          </Select>
          <div className="sm:col-span-2">
            <label className="label">File</label>
            <input
              type="file"
              accept={form.media_type === 'video' ? 'video/*' : 'image/*'}
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="input"
            />
            {errors.file && <p className="mt-1 text-xs text-error-600">{errors.file}</p>}
            {file && !errors.file && <p className="mt-1 text-xs text-navy-400">{file.name}</p>}
          </div>
          <div className="sm:col-span-2">
            <Input
              label="Caption (optional)"
              value={form.caption}
              onChange={(e) => setForm((f) => ({ ...f, caption: e.target.value }))}
            />
          </div>
        </div>
      </Modal>

      <Modal
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        title="Delete media"
        footer={
          <>
            <Button variant="secondary" onClick={() => setToDelete(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDelete} loading={deleting}>
              Delete
            </Button>
          </>
        }
      >
        <p className="text-sm text-navy-700">This will permanently remove this media item. This action cannot be undone.</p>
      </Modal>
    </DashboardLayout>
  );
}
