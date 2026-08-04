import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Edit3, Trash2, Send, Eye, Building2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { useLanguageContext } from '../../lib/i18n/language-context';
import { DashboardLayout, PageHeader } from '../../components/dashboard-layout';

import { getPortalSections } from './sections';
import { Button, Card, EmptyState, Modal, Badge } from '../../components/ui';
import { StatusBadge } from '../../components/property-card';
import { DataTable, type Column, BulkActionsBar } from '../../components/data-table';
import { submitPropertyForReview } from '../../lib/properties';
import { mapJoined } from '../../lib/join-helpers';
import { formatPrice, formatDate , generatePropertyUrl} from '../../lib/utils';
import type { Property } from '../../lib/types';

export function PortalMyProperties() {
  const { t } = useLanguageContext();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<string>('all');
  const [toDelete, setToDelete] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const sections = getPortalSections(t);

  const { data, isLoading } = useQuery({
    queryKey: ['portal-my-properties', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('properties')
        .select('*, cities(name), localities(name), property_types(name)')
        .eq('owner_id', user!.id)
        .order('created_at', { ascending: false });
      return (data ?? []).map((p) => mapJoined(p as unknown as Record<string, unknown>)) as unknown as Property[];
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('portal-properties-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'properties' }, () => {
        queryClient.invalidateQueries({ queryKey: ['portal-my-properties'] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  const tabs = [
    { key: 'all', label: t('blog.allCategories', 'All') },
    { key: 'draft', label: t('portal.drafts', 'Drafts') },
    { key: 'pending', label: t('portal.pending', 'Pending') },
    { key: 'published', label: t('portal.published', 'Published') },
    { key: 'rejected', label: t('portal.rejected', 'Rejected') },
  ];

  const getTabCount = (key: string) => {
    return (data ?? []).filter((p) => {
      if (key === 'all') return true;
      if (key === 'draft') return p.status === 'draft';
      if (key === 'pending')
        return ['submitted', 'pending_verification'].includes(p.status) || p.approval_status === 'Pending';
      if (key === 'published') return (p.status === 'published' || p.is_live) && p.status !== 'rejected';
      if (key === 'rejected')
        return ['rejected', 'changes_requested'].includes(p.status) || p.approval_status === 'Rejected';
      return p.status === key;
    }).length;
  };

  const filtered = (data ?? []).filter((p) => {
    if (tab === 'all') return true;
    if (tab === 'draft') return p.status === 'draft';
    if (tab === 'pending')
      return ['submitted', 'pending_verification'].includes(p.status) || p.approval_status === 'Pending';
    if (tab === 'published') return (p.status === 'published' || p.is_live) && p.status !== 'rejected';
    if (tab === 'rejected')
      return ['rejected', 'changes_requested'].includes(p.status) || p.approval_status === 'Rejected';
    return p.status === tab;
  });

  const submitMutation = useMutation({
    mutationFn: (id: string) => submitPropertyForReview(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['portal-my-properties'] }),
  });

  const resubmitMutation = useMutation({
    mutationFn: async (id: string) => {
      const { resubmitProperty } = await import('../../lib/properties');
      return resubmitProperty(id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['portal-my-properties'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from('properties').delete().eq('id', id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portal-my-properties'] });
      setToDelete(null);
    },
  });

  const bulkDelete = async () => {
    await Promise.all([...selected].map((id) => supabase.from('properties').delete().eq('id', id)));
    setSelected(new Set());
    queryClient.invalidateQueries({ queryKey: ['portal-my-properties'] });
  };

  const toggleSelect = (id: string) => {
    setSelected((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const columns: Column<Property>[] = [
    {
      key: 'title',
      header: t('compare.propertyCol', 'Property'),
      sortable: true,
      render: (p) => (
        <div className="flex items-center gap-3">
          <img
            src={p.images?.[0] ?? 'https://images.pexels.com/photos/323780/pexels-photo-323780.jpeg'}
            alt=""
            className="h-12 w-16 rounded-lg object-cover"
          />
          <div>
            <p className="font-medium text-navy-900 line-clamp-1">{p.title}</p>
            <p className="text-xs text-navy-500">
              {p.locality_name}, {p.city_name}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'purpose',
      header: t('search.purposeLabel', 'Purpose'),
      render: (p) => (
        <Badge variant={p.purpose === 'Rent' ? 'info' : 'gold'}>
          {p.purpose === 'Rent' ? t('property.forRent', 'For Rent') : t('property.forSale', 'For Sale')}
        </Badge>
      ),
    },
    {
      key: 'price',
      header: t('property.price', 'Price'),
      sortable: true,
      render: (p) => <span className="font-semibold">{formatPrice(p.price, p.purpose)}</span>,
    },
    {
      key: 'status',
      header: t('portal.workflowProgress', 'Workflow Progress'),
      render: (p) => (
        <div className="space-y-1">
          <StatusBadge status={p.status} />
          <div className="mt-1">
            {p.status === 'rejected' ? (
              <div className="text-[11px] text-red-600 bg-red-50 p-1.5 rounded border border-red-200">
                <span className="font-bold">{t('portal.rejected', 'Rejected')}:</span>{' '}
                {p.rejection_reason || 'Needs corrections'}
              </div>
            ) : (
              <div className="flex items-center gap-1 text-[10px] text-navy-600 font-medium">
                <span
                  className={`px-1.5 py-0.5 rounded ${['submitted', 'pending_verification', 'approved', 'published'].includes(p.status) ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'}`}
                >
                  {t('portal.submitted', 'Submitted')}
                </span>
                <span>→</span>
                <span
                  className={`px-1.5 py-0.5 rounded ${['pending_verification', 'changes_requested', 'approved', 'published'].includes(p.status) ? 'bg-amber-100 text-amber-800 font-bold' : 'bg-gray-100 text-gray-500'}`}
                >
                  {t('portal.underReview', 'Under Review')}
                </span>
                <span>→</span>
                <span
                  className={`px-1.5 py-0.5 rounded ${['approved', 'published'].includes(p.status) || p.is_live ? 'bg-emerald-100 text-emerald-800 font-bold' : 'bg-gray-100 text-gray-500'}`}
                >
                  {p.is_live || p.status === 'published' ? t('portal.live', 'Live') : t('portal.approved', 'Approved')}
                </span>
              </div>
            )}
          </div>
        </div>
      ),
    },
    { key: 'view_count', header: t('property.views', 'Views'), sortable: true },
    {
      key: 'created_at',
      header: t('portal.created', 'Created'),
      sortable: true,
      render: (p) => formatDate(p.created_at),
    },
    {
      key: 'actions',
      header: t('portal.actions', 'Actions'),
      render: (p) => (
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          {p.status === 'draft' && (
            <Button
              size="sm"
              variant="ghost"
              icon={<Send className="h-4 w-4" />}
              onClick={() => submitMutation.mutate(p.id)}
              loading={submitMutation.isPending}
            >
              {t('portal.submit', 'Submit')}
            </Button>
          )}
          {(p.status === 'rejected' || p.status === 'changes_requested') && (
            <Button
              size="sm"
              variant="primary"
              icon={<Send className="h-4 w-4" />}
              onClick={() => resubmitMutation.mutate(p.id)}
              loading={resubmitMutation.isPending}
            >
              {t('portal.resubmit', 'Resubmit')}
            </Button>
          )}
          <Link to={`/portal/list-property?edit=${p.id}`}>
            <Button
              size="sm"
              variant="ghost"
              icon={<Edit3 className="h-4 w-4" />}
              disabled={
                !['draft', 'submitted', 'pending_verification', 'rejected', 'changes_requested'].includes(p.status)
              }
            />
          </Link>
          <Link to={generatePropertyUrl(p)}>
            <Button size="sm" variant="ghost" icon={<Eye className="h-4 w-4" />} />
          </Link>
          <Button
            size="sm"
            variant="ghost"
            className="text-error-600"
            icon={<Trash2 className="h-4 w-4" />}
            onClick={() => setToDelete(p.id)}
            disabled={
              !['draft', 'submitted', 'pending_verification', 'rejected', 'changes_requested'].includes(p.status)
            }
          />
        </div>
      ),
    },
  ];

  return (
    <DashboardLayout sections={sections} title={t('common.saved', 'My Properties')}>
      <PageHeader
        title={t('common.saved', 'My Properties')}
        subtitle={t('portal.manageListingsSub', 'Manage all your listings across every status.')}
        action={
          <Link to="/portal/list-property">
            <button
              type="button"
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-red-600 via-rose-600 to-red-600 text-white font-extrabold text-xs sm:text-sm shadow-md shadow-red-600/25 hover:shadow-red-600/40 hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer"
            >
              <span>{t('forms.postProperty', 'Post Property')}</span>
              <span className="bg-amber-300 text-slate-950 font-black text-[10px] px-1.5 py-0.5 rounded-full uppercase tracking-wider shadow-xs">
                FREE
              </span>
            </button>
          </Link>
        }
      />
      <div className="mb-4 flex gap-2 overflow-x-auto">
        {tabs.map((tItem) => {
          const count = getTabCount(tItem.key);
          return (
            <button
              key={tItem.key}
              onClick={() => setTab(tItem.key)}
              className={`rounded-lg px-3.5 py-2 text-sm font-medium whitespace-nowrap transition flex items-center gap-2 cursor-pointer ${tab === tItem.key ? 'bg-navy-900 text-white shadow-sm' : 'text-navy-600 hover:bg-navy-100'}`}
            >
              {tItem.label}
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-bold ${tab === tItem.key ? 'bg-white/20 text-white' : 'bg-navy-100 text-navy-600'}`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <BulkActionsBar count={selected.size} onDelete={bulkDelete} />
      {filtered.length === 0 && !isLoading ? (
        <Card>
          <EmptyState
            icon={<Building2 className="h-6 w-6" />}
            title={t('portal.noPropertiesTitle', 'No properties here')}
            description={t('portal.noPropertiesDesc', 'List your first property to see it here.')}
            action={
              <Link to="/portal/list-property">
                <Button variant="primary">{t('forms.postProperty', 'List Property')}</Button>
              </Link>
            }
          />
        </Card>
      ) : (
        <DataTable
          columns={columns}
          rows={filtered}
          loading={isLoading}
          getRowId={(p) => p.id}
          selectedIds={selected}
          onToggleSelect={toggleSelect}
          onSelectAll={(ids) =>
            setSelected((s) => {
              const n = new Set(s);
              ids.forEach((id) => (n.has(id) ? n.delete(id) : n.add(id)));
              return n;
            })
          }
          cardRender={(p) => (
            <Card className="p-4 flex flex-col justify-between h-full hover:shadow-md transition-shadow">
              <div>
                <div className="relative aspect-video rounded-xl overflow-hidden mb-3 bg-navy-100">
                  <img
                    src={p.images?.[0] ?? 'https://images.pexels.com/photos/323780/pexels-photo-323780.jpeg'}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute top-2 right-2">
                    <StatusBadge status={p.status} />
                  </div>
                </div>
                <h4 className="font-bold text-navy-900 text-base line-clamp-1">{p.title}</h4>
                <p className="text-xs text-navy-500 mt-0.5">
                  {p.property_type_name ?? 'Property'} {p.locality_name ? `• ${p.locality_name}` : ''}
                </p>
                
                {p.status === 'draft' ? (
                  <div className="mt-3 bg-slate-50 border border-slate-100 p-3 rounded-lg">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-bold text-navy-900">{p.completion_percentage ?? 0}% Complete</span>
                      <span className="text-[10px] text-navy-500 font-medium">Last Saved: {formatDate(p.updated_at || p.created_at)}</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-1.5 mb-2 overflow-hidden">
                      <div className="bg-gradient-to-r from-red-500 to-rose-500 h-1.5 rounded-full" style={{ width: `${p.completion_percentage ?? 0}%` }}></div>
                    </div>
                    <p className="text-[11px] text-navy-600">
                      Current Step: <span className="font-bold">Step {((p.current_step ?? 0) + 1)}</span>
                    </p>
                  </div>
                ) : (
                  <>
                    <p className="font-bold text-navy-900 mt-2 text-lg">{formatPrice(p.price, p.purpose)}</p>
                    <p className="text-xs text-navy-400 mt-1">
                      {t('portal.submitted', 'Submitted')}: {formatDate(p.created_at)}
                    </p>
                    {p.rejection_reason && (
                      <div className="mt-2 p-2 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 font-medium">
                        {t('portal.reason', 'Reason')}: {p.rejection_reason}
                      </div>
                    )}
                  </>
                )}
              </div>
              <div className="mt-4 pt-3 border-t border-navy-100 flex items-center justify-between gap-2">
                {(p.status === 'rejected' || p.status === 'changes_requested') && (
                  <Button
                    size="sm"
                    variant="primary"
                    icon={<Send className="h-4 w-4" />}
                    onClick={() => resubmitMutation.mutate(p.id)}
                    loading={resubmitMutation.isPending}
                  >
                    {t('portal.resubmit', 'Resubmit')}
                  </Button>
                )}
                {p.status === 'draft' ? (
                  <Link to={`/portal/list-property?draft_id=${p.id}`} className="flex-1">
                    <Button
                      size="sm"
                      variant="primary"
                      className="w-full"
                    >
                      Continue Listing
                    </Button>
                  </Link>
                ) : null}
                <div className="flex gap-1 ml-auto">
                  {p.status !== 'draft' && (
                    <Link to={`/portal/list-property?edit=${p.id}`}>
                      <Button
                        size="sm"
                        variant="ghost"
                        icon={<Edit3 className="h-4 w-4" />}
                        disabled={!['submitted', 'pending_verification', 'rejected', 'changes_requested'].includes(p.status)}
                      />
                    </Link>
                  )}
                  <Link to={generatePropertyUrl(p)}>
                    <Button size="sm" variant="ghost" icon={<Eye className="h-4 w-4" />} />
                  </Link>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-error-600"
                    icon={<Trash2 className="h-4 w-4" />}
                    onClick={() => setToDelete(p.id)}
                    disabled={
                      !['draft', 'submitted', 'pending_verification', 'rejected', 'changes_requested'].includes(
                        p.status,
                      )
                    }
                  />
                </div>
              </div>
            </Card>
          )}
        />
      )}

      <Modal
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        title={t('portal.deletePropTitle', 'Delete property')}
        footer={
          <>
            <Button variant="secondary" onClick={() => setToDelete(null)}>
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button
              variant="danger"
              onClick={() => toDelete && deleteMutation.mutate(toDelete)}
              loading={deleteMutation.isPending}
            >
              {t('portal.delete', 'Delete')}
            </Button>
          </>
        }
      >
        <p className="text-sm text-navy-700">
          {t('portal.deleteConfirm', 'Are you sure you want to delete this property? This action cannot be undone.')}
        </p>
      </Modal>
    </DashboardLayout>
  );
}
