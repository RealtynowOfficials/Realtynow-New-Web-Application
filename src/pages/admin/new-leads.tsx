import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search,
  Download,
  Eye,
  Clock,
  CheckCircle2,
  RotateCcw,
  LayoutList,
  LayoutGrid,
  MessageCircle,
  Activity,
  Layers,
  Trash2,
  Sparkles,
  RefreshCw,
  Plus,
  Tag,
  Home,
  MapPin,
  FileSpreadsheet,
  Check,
  Copy,
  PhoneCall
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { useToast } from '../../components/toast';
import { Button, Input, Select, Modal, Textarea } from '../../components/ui';
import { DashboardLayout } from '../../components/dashboard-layout';
import { getAdminSections } from '../portal/sections';
import { useLanguageContext } from '../../lib/i18n/language-context';
import {
  formatDateTime,
  buildWhatsAppUrl,
  exportToCsv,
  exportToExcel,
  cn,
} from '../../lib/utils';
import {
  ServiceLead,
  ServiceLeadDetailDrawer,
  LEAD_STATUS_CONFIG,
  PRIORITY_CONFIG,
} from '../../components/admin/leads/ServiceLeadDetailDrawer';

export function AdminNewLeadsPage() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const { t } = useLanguageContext();
  const queryClient = useQueryClient();

  const adminSections = useMemo(() => getAdminSections(t), [t]);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [intentFilter, setIntentFilter] = useState<'ALL' | 'sell' | 'rent'>('ALL');
  const [propertyTypeFilter, setPropertyTypeFilter] = useState('ALL');
  const [cityFilter, setCityFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [assigneeFilter, setAssigneeFilter] = useState('ALL');
  const [dateRangeFilter, setDateRangeFilter] = useState('ALL');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

  // Sorting
  const [sortField, setSortField] = useState<'created_at' | 'name' | 'lead_status'>('created_at');
  const [sortAsc, setSortAsc] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Multi-selection
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);

  // Drawer state
  const [selectedLeadIdForDrawer, setSelectedLeadIdForDrawer] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Create Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '',
    phone: '',
    email: '',
    intent: 'sell',
    propertyType: 'Apartment / Flat',
    subType: '2 BHK Flat',
    location: '',
    city: 'Hyderabad',
    pincode: '',
    contactTime: 'Anytime',
    priority: 'high',
    notes: '',
  });

  // Copied ref feedback
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // 1. Fetch Staff/Agents for assignment
  const { data: staffMembers = [] } = useQuery({
    queryKey: ['staff-team-members'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email, role')
        .in('role', ['admin', 'staff', 'manager', 'executive', 'agent', 'support'])
        .order('first_name', { ascending: true });
      if (error) return [];
      return data ?? [];
    },
  });

  // 2. Fetch Free Property Listing Leads
  const {
    data: rawLeads = [],
    isLoading,
    isRefetching,
    refetch,
  } = useQuery<ServiceLead[]>({
    queryKey: ['admin-new-property-leads'],
    queryFn: async () => {
      // Query enquiries that are free property listings OR have tags related to free listing
      const { data, error } = await supabase
        .from('enquiries')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching new leads:', error);
        throw error;
      }

      // Filter to property listing leads or general website inquiries without property ID
      const all = (data as ServiceLead[]) ?? [];
      return all.filter((enq: any) => {
        const isFreeType = enq.service_type === 'FREE_LIST_PROPERTY';
        const hasTag = enq.tags?.some((tg: string) =>
          ['free-listing', 'FREE_LIST_PROPERTY', 'property-listing'].includes(tg)
        );
        const hasServiceData = enq.service_data && (enq.service_data.intent || enq.service_data.property_type);
        const isFreeSource = enq.source?.includes('free_list');
        // Include matching leads, or all if dataset is small
        return isFreeType || hasTag || hasServiceData || isFreeSource;
      });
    },
  });

  // 3. Realtime synchronization
  useEffect(() => {
    const channel = supabase
      .channel('admin-new-leads-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'enquiries' },
        () => {
          refetch();
          queryClient.invalidateQueries({ queryKey: ['admin-all-service-leads'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetch, queryClient]);

  // Enrich leads with assignee profile info
  const allLeads = useMemo(() => {
    const staffMap = new Map((staffMembers || []).map((m: any) => [m.id, m]));
    return rawLeads.map((lead: any) => ({
      ...lead,
      assignee: lead.assigned_to ? staffMap.get(lead.assigned_to) || null : null,
    }));
  }, [rawLeads, staffMembers]);

  // Summary Metrics
  const stats = useMemo(() => {
    const total = allLeads.length;
    const sellCount = allLeads.filter(
      (l: any) => (l.service_data?.intent || '').toLowerCase() === 'sell' || l.tags?.includes('sell')
    ).length;
    const rentCount = allLeads.filter(
      (l: any) => (l.service_data?.intent || '').toLowerCase() === 'rent' || l.tags?.includes('rent')
    ).length;
    const newCount = allLeads.filter(
      (l) => (l.lead_status || l.status || 'new') === 'new'
    ).length;
    const contactedCount = allLeads.filter((l) =>
      ['contacted', 'follow_up', 'in_progress', 'qualified'].includes(l.lead_status || '')
    ).length;
    const convertedCount = allLeads.filter((l) =>
      ['converted', 'won'].includes(l.lead_status || '')
    ).length;

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayCount = allLeads.filter(
      (l) => new Date(l.created_at) >= todayStart
    ).length;

    return { total, sellCount, rentCount, newCount, contactedCount, convertedCount, todayCount };
  }, [allLeads]);

  // Filtered & Sorted Leads
  const filteredLeads = useMemo(() => {
    return allLeads.filter((lead: any) => {
      const sData = lead.service_data || {};
      const intent = (sData.intent || '').toLowerCase();
      const pType = sData.property_type || sData.propertyType || '';
      const loc = lead.location || sData.location || '';
      const city = lead.city || sData.city || '';
      const pin = sData.pincode || '';
      const name = lead.name || '';
      const phone = lead.phone || '';
      const email = lead.email || '';
      const lNum = lead.lead_number || '';

      // Text Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match =
          name.toLowerCase().includes(q) ||
          phone.toLowerCase().includes(q) ||
          email.toLowerCase().includes(q) ||
          loc.toLowerCase().includes(q) ||
          city.toLowerCase().includes(q) ||
          pin.toLowerCase().includes(q) ||
          lNum.toLowerCase().includes(q) ||
          pType.toLowerCase().includes(q);
        if (!match) return false;
      }

      // Intent filter
      if (intentFilter !== 'ALL') {
        if (intent !== intentFilter.toLowerCase() && !lead.tags?.includes(intentFilter.toLowerCase())) {
          return false;
        }
      }

      // Property Type filter
      if (propertyTypeFilter !== 'ALL') {
        if (!pType.toLowerCase().includes(propertyTypeFilter.toLowerCase())) {
          return false;
        }
      }

      // City filter
      if (cityFilter !== 'ALL') {
        if (!city.toLowerCase().includes(cityFilter.toLowerCase())) {
          return false;
        }
      }

      // Status filter
      if (statusFilter !== 'ALL') {
        const st = lead.lead_status || lead.status || 'new';
        if (st !== statusFilter) return false;
      }

      // Priority filter
      if (priorityFilter !== 'ALL') {
        if ((lead.priority || 'medium') !== priorityFilter) return false;
      }

      // Assignee filter
      if (assigneeFilter !== 'ALL') {
        if (assigneeFilter === 'UNASSIGNED') {
          if (lead.assigned_to) return false;
        } else if (lead.assigned_to !== assigneeFilter) {
          return false;
        }
      }

      // Date Range filter
      if (dateRangeFilter !== 'ALL') {
        const leadDate = new Date(lead.created_at);
        const now = new Date();
        if (dateRangeFilter === 'TODAY') {
          const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          if (leadDate < start) return false;
        } else if (dateRangeFilter === 'YESTERDAY') {
          const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
          const end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          if (leadDate < start || leadDate >= end) return false;
        } else if (dateRangeFilter === '7DAYS') {
          const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
          if (leadDate < start) return false;
        } else if (dateRangeFilter === '30DAYS') {
          const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30);
          if (leadDate < start) return false;
        }
      }

      return true;
    }).sort((a, b) => {
      let comparison = 0;
      if (sortField === 'created_at') {
        comparison = new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      } else if (sortField === 'name') {
        comparison = (a.name || '').localeCompare(b.name || '');
      } else if (sortField === 'lead_status') {
        comparison = (a.lead_status || '').localeCompare(b.lead_status || '');
      }
      return sortAsc ? -comparison : comparison;
    });
  }, [
    allLeads,
    searchQuery,
    intentFilter,
    propertyTypeFilter,
    cityFilter,
    statusFilter,
    priorityFilter,
    assigneeFilter,
    dateRangeFilter,
    sortField,
    sortAsc,
  ]);

  // Paginated Leads
  const totalPages = Math.ceil(filteredLeads.length / pageSize) || 1;
  const paginatedLeads = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredLeads.slice(start, start + pageSize);
  }, [filteredLeads, page, pageSize]);

  // Status Update Mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ leadId, status }: { leadId: string; status: string }) => {
      const { error } = await supabase
        .from('enquiries')
        .update({
          lead_status: status,
          status: status === 'won' ? 'closed' : status === 'new' ? 'new' : 'contacted',
          updated_at: new Date().toISOString(),
        })
        .eq('id', leadId);
      if (error) throw error;

      // Activity log
      try {
        await supabase.from('lead_activities').insert({
          lead_id: leadId,
          activity_type: 'status_changed',
          title: `Status set to ${status}`,
          actor_id: user?.id ?? null,
        });
      } catch {
        /* Ignore activity log insertion errors */
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-new-property-leads'] });
      addToast('success', 'Lead status updated');
    },
    onError: (err: any) => {
      addToast('error', `Failed to update status: ${err.message}`);
    },
  });

  // Assignee Update Mutation
  const updateAssigneeMutation = useMutation({
    mutationFn: async ({ leadId, assigneeId }: { leadId: string; assigneeId: string }) => {
      const { error } = await supabase
        .from('enquiries')
        .update({
          assigned_to: assigneeId || null,
          assigned_at: assigneeId ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', leadId);
      if (error) throw error;

      try {
        await supabase.from('lead_activities').insert({
          lead_id: leadId,
          activity_type: 'assigned',
          title: assigneeId ? 'Assigned to team member' : 'Unassigned',
          actor_id: user?.id ?? null,
        });
      } catch {
        /* Ignore activity log insertion errors */
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-new-property-leads'] });
      addToast('success', 'Lead assigned successfully');
    },
    onError: (err: any) => {
      addToast('error', `Failed to assign lead: ${err.message}`);
    },
  });

  // Delete Lead Mutation
  const deleteLeadMutation = useMutation({
    mutationFn: async (leadId: string) => {
      const { error } = await supabase.from('enquiries').delete().eq('id', leadId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-new-property-leads'] });
      addToast('success', 'Lead deleted');
    },
    onError: (err: any) => {
      addToast('error', `Failed to delete lead: ${err.message}`);
    },
  });

  // Create Manual Lead Mutation
  const createLeadMutation = useMutation({
    mutationFn: async (payload: typeof createForm) => {
      const intentLabel = payload.intent === 'sell' ? 'Sell' : 'Rent';
      const msg = `Free Listing Request: Looking to ${intentLabel} ${payload.propertyType} (${payload.subType}) in ${payload.location}, ${payload.city} - ${payload.pincode}. Preferred time: ${payload.contactTime}. Notes: ${payload.notes}`;

      const serviceData = {
        intent: payload.intent,
        property_type: payload.propertyType,
        sub_type: payload.subType,
        location: payload.location,
        city: payload.city,
        pincode: payload.pincode,
        contact_time: payload.contactTime,
        notes: payload.notes,
        created_manually: true,
      };

      const { data, error } = await supabase.rpc('submit_contact_enquiry', {
        p_name: payload.name.trim(),
        p_phone: payload.phone.trim(),
        p_email: payload.email.trim() || null,
        p_message: msg,
        p_source: 'portal',
        p_customer_id: user?.id ?? null,
        p_property_id: null,
        p_tags: ['free-listing', 'FREE_LIST_PROPERTY', payload.intent, payload.propertyType],
        p_service_type: 'FREE_LIST_PROPERTY',
        p_service_data: serviceData,
        p_city: payload.city,
        p_location: `${payload.location} - ${payload.pincode}`,
        p_alternate_phone: null,
      });

      if (error) {
        // fallback direct insert
        const { error: insErr } = await supabase.from('enquiries').insert({
          name: payload.name.trim(),
          phone: payload.phone.trim(),
          email: payload.email.trim() || null,
          message: msg,
          service_request: `Free Listing: ${intentLabel} ${payload.propertyType}`,
          source: 'portal',
          tags: ['free-listing', 'FREE_LIST_PROPERTY', payload.intent],
          service_type: 'FREE_LIST_PROPERTY',
          service_data: serviceData,
          city: payload.city,
          location: `${payload.location} - ${payload.pincode}`,
          status: 'new',
          lead_status: 'new',
          priority: payload.priority,
        });
        if (insErr) throw insErr;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-new-property-leads'] });
      setShowCreateModal(false);
      setCreateForm({
        name: '',
        phone: '',
        email: '',
        intent: 'sell',
        propertyType: 'Apartment / Flat',
        subType: '2 BHK Flat',
        location: '',
        city: 'Hyderabad',
        pincode: '',
        contactTime: 'Anytime',
        priority: 'high',
        notes: '',
      });
      addToast('success', 'New lead created successfully');
    },
    onError: (err: any) => {
      addToast('error', `Failed to create lead: ${err.message}`);
    },
  });

  // Copy reference ID
  const handleCopyRef = (refId: string) => {
    navigator.clipboard.writeText(refId);
    setCopiedId(refId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Export handlers
  const handleExportCsv = () => {
    const rows = filteredLeads.map((l: any) => {
      const s = l.service_data || {};
      return {
        'Lead ID': l.lead_number || l.id,
        'Date': formatDateTime(l.created_at),
        'Customer Name': l.name || '',
        'Phone': l.phone || '',
        'Email': l.email || '',
        'Looking To': (s.intent || 'sell').toUpperCase(),
        'Property Type': s.property_type || s.propertyType || '',
        'Sub Type': s.sub_type || s.subType || '',
        'Location': l.location || s.location || '',
        'City': l.city || s.city || '',
        'Pincode': s.pincode || '',
        'Preferred Contact Time': s.contact_time || s.preferred_time || '',
        'Lead Status': l.lead_status || l.status || 'new',
        'Priority': l.priority || 'medium',
        'Assigned To': l.assignee ? `${l.assignee.first_name || ''} ${l.assignee.last_name || ''}`.trim() : 'Unassigned',
      };
    });
    exportToCsv(rows, `realtynow-new-leads-${new Date().toISOString().slice(0, 10)}.csv`);
    addToast('success', 'Exported leads to CSV');
  };

  const handleExportExcel = () => {
    const rows = filteredLeads.map((l: any) => {
      const s = l.service_data || {};
      return {
        'Lead ID': l.lead_number || l.id,
        'Date': formatDateTime(l.created_at),
        'Customer Name': l.name || '',
        'Phone': l.phone || '',
        'Email': l.email || '',
        'Looking To': (s.intent || 'sell').toUpperCase(),
        'Property Type': s.property_type || s.propertyType || '',
        'Sub Type': s.sub_type || s.subType || '',
        'Location': l.location || s.location || '',
        'City': l.city || s.city || '',
        'Pincode': s.pincode || '',
        'Preferred Contact Time': s.contact_time || s.preferred_time || '',
        'Lead Status': l.lead_status || l.status || 'new',
        'Priority': l.priority || 'medium',
        'Assigned To': l.assignee ? `${l.assignee.first_name || ''} ${l.assignee.last_name || ''}`.trim() : 'Unassigned',
      };
    });
    exportToExcel(rows, `realtynow-new-leads-${new Date().toISOString().slice(0, 10)}`);
    addToast('success', 'Exported leads to Excel');
  };

  return (
    <DashboardLayout sections={adminSections} title="New Leads" badge="Admin">
      <div className="space-y-6 pb-12">
        {/* ================================================================= */}
        {/* TOP HEADER & ACTIONS */}
        {/* ================================================================= */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="w-10 h-10 rounded-xl bg-[#D8232A]/10 text-[#D8232A] flex items-center justify-center font-bold">
                <Sparkles className="w-5 h-5" />
              </span>
              <div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                  <span>New Leads</span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-red-100 text-[#D8232A] font-extrabold">
                    {filteredLeads.length} Available
                  </span>
                </h1>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Direct customer submissions from the Free Property Listing portal. Real-time synchronized.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => refetch()}
              disabled={isRefetching}
              className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
            >
              <RefreshCw className={cn('w-3.5 h-3.5', isRefetching && 'animate-spin')} />
              <span>Refresh</span>
            </button>

            <button
              onClick={handleExportCsv}
              className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={handleExportExcel}
              className="px-3.5 py-2 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Excel</span>
            </button>

            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 rounded-xl bg-[#D8232A] hover:bg-[#b81d23] text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-[#D8232A]/20 transition cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Add Lead</span>
            </button>
          </div>
        </div>

        {/* ================================================================= */}
        {/* EXECUTIVE KPI STATS CARDS */}
        {/* ================================================================= */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Leads</span>
              <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
                <Layers className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900 mt-2">{stats.total}</div>
            <div className="text-[10px] text-slate-400 font-semibold mt-0.5">All Property Inquiries</div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-red-200/80 bg-gradient-to-br from-white to-red-50/30 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-red-600 uppercase tracking-wider">Looking to Sell</span>
              <div className="w-7 h-7 rounded-lg bg-red-100 text-red-600 flex items-center justify-center">
                <Tag className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-2xl font-black text-red-700 mt-2">{stats.sellCount}</div>
            <div className="text-[10px] text-red-500 font-semibold mt-0.5">Direct Sellers</div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-blue-200/80 bg-gradient-to-br from-white to-blue-50/30 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">Looking to Rent</span>
              <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                <Home className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-2xl font-black text-blue-700 mt-2">{stats.rentCount}</div>
            <div className="text-[10px] text-blue-500 font-semibold mt-0.5">Direct Lessors</div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-amber-200/80 bg-gradient-to-br from-white to-amber-50/30 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-amber-600 uppercase tracking-wider">New / Pending</span>
              <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center">
                <Clock className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-2xl font-black text-amber-700 mt-2">{stats.newCount}</div>
            <div className="text-[10px] text-amber-600 font-semibold mt-0.5">Requires First Contact</div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-purple-200/80 bg-gradient-to-br from-white to-purple-50/30 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-purple-600 uppercase tracking-wider">In Follow-Up</span>
              <div className="w-7 h-7 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center">
                <Activity className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-2xl font-black text-purple-700 mt-2">{stats.contactedCount}</div>
            <div className="text-[10px] text-purple-600 font-semibold mt-0.5">Active Discussions</div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-emerald-200/80 bg-gradient-to-br from-white to-emerald-50/30 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">Today's Inquiries</span>
              <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-2xl font-black text-emerald-700 mt-2">{stats.todayCount}</div>
            <div className="text-[10px] text-emerald-600 font-semibold mt-0.5">Received Today</div>
          </div>
        </div>

        {/* ================================================================= */}
        {/* COMPREHENSIVE FILTER & SEARCH TOOLBAR */}
        {/* ================================================================= */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3.5">
          <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
            {/* Search Input */}
            <div className="relative w-full md:w-96">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                placeholder="Search name, phone, email, area, city, ref..."
                className="w-full h-10 pl-9 pr-4 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 bg-white focus:outline-none focus:border-[#D8232A] focus:ring-2 focus:ring-[#D8232A]/20 transition"
              />
            </div>

            {/* View Mode & Quick Reset */}
            <div className="flex items-center gap-2 self-end md:self-auto">
              {(searchQuery ||
                intentFilter !== 'ALL' ||
                propertyTypeFilter !== 'ALL' ||
                cityFilter !== 'ALL' ||
                statusFilter !== 'ALL' ||
                priorityFilter !== 'ALL' ||
                assigneeFilter !== 'ALL' ||
                dateRangeFilter !== 'ALL') && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setIntentFilter('ALL');
                    setPropertyTypeFilter('ALL');
                    setCityFilter('ALL');
                    setStatusFilter('ALL');
                    setPriorityFilter('ALL');
                    setAssigneeFilter('ALL');
                    setDateRangeFilter('ALL');
                    setPage(1);
                  }}
                  className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1 px-2.5 py-1.5 rounded-lg hover:bg-rose-50 transition cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Filters</span>
                </button>
              )}

              <div className="border border-slate-200 rounded-xl p-0.5 bg-slate-100 flex items-center">
                <button
                  onClick={() => setViewMode('table')}
                  className={cn(
                    'p-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition cursor-pointer',
                    viewMode === 'table' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                  )}
                  title="Tabular Form"
                >
                  <LayoutList className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('cards')}
                  className={cn(
                    'p-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition cursor-pointer',
                    viewMode === 'cards' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                  )}
                  title="Card View"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Filter Dropdowns Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2.5 pt-1 border-t border-slate-100">
            {/* 1. Intent */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Intent</label>
              <select
                value={intentFilter}
                onChange={(e) => {
                  setIntentFilter(e.target.value as any);
                  setPage(1);
                }}
                className="w-full h-8 px-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 bg-white focus:outline-none focus:border-[#D8232A] cursor-pointer"
              >
                <option value="ALL">All (Sell &amp; Rent)</option>
                <option value="sell">Sell Only</option>
                <option value="rent">Rent Only</option>
              </select>
            </div>

            {/* 2. Property Type */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Property Type</label>
              <select
                value={propertyTypeFilter}
                onChange={(e) => {
                  setPropertyTypeFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full h-8 px-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 bg-white focus:outline-none focus:border-[#D8232A] cursor-pointer"
              >
                <option value="ALL">All Property Types</option>
                <option value="Apartment">Apartment / Flat</option>
                <option value="House">Independent House</option>
                <option value="Villa">Villa</option>
                <option value="Plot">Plot / Land</option>
                <option value="Commercial">Commercial</option>
                <option value="Office">Office Space</option>
                <option value="Shop">Shop</option>
                <option value="Warehouse">Warehouse</option>
              </select>
            </div>

            {/* 3. City */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">City</label>
              <select
                value={cityFilter}
                onChange={(e) => {
                  setCityFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full h-8 px-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 bg-white focus:outline-none focus:border-[#D8232A] cursor-pointer"
              >
                <option value="ALL">All Cities</option>
                <option value="Hyderabad">Hyderabad</option>
                <option value="Bengaluru">Bengaluru</option>
                <option value="Mumbai">Mumbai</option>
                <option value="Pune">Pune</option>
                <option value="Delhi">Delhi NCR</option>
                <option value="Chennai">Chennai</option>
              </select>
            </div>

            {/* 4. Status */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full h-8 px-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 bg-white focus:outline-none focus:border-[#D8232A] cursor-pointer"
              >
                <option value="ALL">All Statuses</option>
                <option value="new">New</option>
                <option value="contacted">Contacted</option>
                <option value="follow_up">Follow-up</option>
                <option value="in_progress">In Progress</option>
                <option value="qualified">Qualified</option>
                <option value="converted">Converted / Won</option>
                <option value="closed">Closed</option>
                <option value="lost">Lost</option>
              </select>
            </div>

            {/* 5. Priority */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Priority</label>
              <select
                value={priorityFilter}
                onChange={(e) => {
                  setPriorityFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full h-8 px-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 bg-white focus:outline-none focus:border-[#D8232A] cursor-pointer"
              >
                <option value="ALL">All Priorities</option>
                <option value="urgent">Urgent</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>

            {/* 6. Assignee */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Assigned Staff</label>
              <select
                value={assigneeFilter}
                onChange={(e) => {
                  setAssigneeFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full h-8 px-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 bg-white focus:outline-none focus:border-[#D8232A] cursor-pointer"
              >
                <option value="ALL">All Team</option>
                <option value="UNASSIGNED">Unassigned</option>
                {staffMembers.map((m: any) => (
                  <option key={m.id} value={m.id}>
                    {m.first_name || ''} {m.last_name || ''} ({m.role})
                  </option>
                ))}
              </select>
            </div>

            {/* 7. Date Range */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Date</label>
              <select
                value={dateRangeFilter}
                onChange={(e) => {
                  setDateRangeFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full h-8 px-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 bg-white focus:outline-none focus:border-[#D8232A] cursor-pointer"
              >
                <option value="ALL">All Time</option>
                <option value="TODAY">Today</option>
                <option value="YESTERDAY">Yesterday</option>
                <option value="7DAYS">Last 7 Days</option>
                <option value="30DAYS">Last 30 Days</option>
              </select>
            </div>
          </div>
        </div>

        {/* ================================================================= */}
        {/* MAIN DATA TABLE / TABULAR VIEW */}
        {/* ================================================================= */}
        {isLoading ? (
          <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-3 shadow-xs">
            <div className="w-10 h-10 border-4 border-[#D8232A] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm font-bold text-slate-700">Loading New Leads Data...</p>
          </div>
        ) : filteredLeads.length === 0 ? (
          <div className="bg-white p-12 rounded-2xl border border-dashed border-slate-300 text-center space-y-3 shadow-xs">
            <div className="w-14 h-14 mx-auto rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
              <Sparkles className="w-7 h-7" />
            </div>
            <h3 className="text-base font-extrabold text-slate-800">No New Leads Found</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              No customer submissions match your current filters. Test by submitting a form on{' '}
              <a href="/free_list_property" target="_blank" className="text-[#D8232A] font-bold underline">
                /free_list_property
              </a>{' '}
              or click "Add Lead" above.
            </p>
          </div>
        ) : viewMode === 'table' ? (
          /* ======================== TABULAR FORM ======================== */
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/90 border-b border-slate-200 text-[11px] font-black uppercase tracking-wider text-slate-500 select-none">
                    <th className="py-3 px-4 w-12">
                      <input
                        type="checkbox"
                        checked={selectedLeadIds.length === paginatedLeads.length && paginatedLeads.length > 0}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedLeadIds(paginatedLeads.map((l) => l.id));
                          } else {
                            setSelectedLeadIds([]);
                          }
                        }}
                        className="rounded border-slate-300 text-[#D8232A] focus:ring-[#D8232A] cursor-pointer"
                      />
                    </th>
                    <th className="py-3 px-4">Lead Ref / Date</th>
                    <th className="py-3 px-4">Customer Details</th>
                    <th className="py-3 px-4">Connect</th>
                    <th className="py-3 px-4">Intent</th>
                    <th className="py-3 px-4">Property Type &amp; Sub-Type</th>
                    <th className="py-3 px-4">Location &amp; Pincode</th>
                    <th className="py-3 px-4">Preferred Time</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Assigned To</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                  {paginatedLeads.map((lead: any) => {
                    const sData = lead.service_data || {};
                    const isSell = (sData.intent || '').toLowerCase() === 'sell' || lead.tags?.includes('sell');
                    const intentLabel = isSell ? 'Sell' : 'Rent';
                    const propType = sData.property_type || sData.propertyType || lead.service_request || 'Property';
                    const subType = sData.sub_type || sData.subType || '';
                    const location = lead.location || sData.location || 'Hyderabad';
                    const city = lead.city || sData.city || 'Hyderabad';
                    const pincode = sData.pincode || '';
                    const contactTime = sData.contact_time || sData.contactTime || sData.preferred_time || 'Anytime';
                    const leadNumber = lead.lead_number || `RN-LEAD-${lead.id.substring(0, 6).toUpperCase()}`;

                    const cleanPhone = (lead.phone || '').replace(/\D/g, '');
                    const waText = `Hello ${lead.name || 'Sir/Madam'}, regarding your property listing on RealtyNow (${intentLabel} ${propType} in ${location}, Ref: ${leadNumber}):`;
                    const waUrl = buildWhatsAppUrl(cleanPhone, waText);

                    const stKey = lead.lead_status || lead.status || 'new';
                    const stCfg = LEAD_STATUS_CONFIG[stKey] || LEAD_STATUS_CONFIG.new;
                    const prCfg = PRIORITY_CONFIG[lead.priority || 'medium'] || PRIORITY_CONFIG.medium;

                    return (
                      <tr
                        key={lead.id}
                        className="hover:bg-slate-50/80 transition group"
                      >
                        {/* Checkbox */}
                        <td className="py-3.5 px-4">
                          <input
                            type="checkbox"
                            checked={selectedLeadIds.includes(lead.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedLeadIds((prev) => [...prev, lead.id]);
                              } else {
                                setSelectedLeadIds((prev) => prev.filter((id) => id !== lead.id));
                              }
                            }}
                            className="rounded border-slate-300 text-[#D8232A] focus:ring-[#D8232A] cursor-pointer"
                          />
                        </td>

                        {/* Ref ID & Date */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-xs font-black text-slate-900 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md">
                              {leadNumber}
                            </span>
                            <button
                              onClick={() => handleCopyRef(leadNumber)}
                              className="text-slate-400 hover:text-slate-600 transition cursor-pointer p-0.5"
                              title="Copy Reference"
                            >
                              {copiedId === leadNumber ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                          <div className="text-[11px] text-slate-400 font-semibold mt-1">
                            {formatDateTime(lead.created_at)}
                          </div>
                        </td>

                        {/* Customer */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2.5 min-w-[170px]">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-800 to-slate-900 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-xs">
                              {(lead.name || 'C').charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <div className="font-extrabold text-slate-900 truncate">
                                {lead.name || 'Anonymous Customer'}
                              </div>
                              {lead.email && (
                                <a
                                  href={`mailto:${lead.email}`}
                                  className="text-[11px] text-slate-400 hover:text-slate-600 truncate block transition"
                                >
                                  {lead.email}
                                </a>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Quick Connect (Call & WhatsApp) */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            {lead.phone ? (
                              <>
                                <a
                                  href={`tel:${cleanPhone}`}
                                  className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 transition cursor-pointer"
                                  title={`Call ${lead.phone}`}
                                >
                                  <PhoneCall className="w-3.5 h-3.5" />
                                </a>
                                <a
                                  href={waUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition cursor-pointer"
                                  title="WhatsApp Chat"
                                >
                                  <MessageCircle className="w-3.5 h-3.5" />
                                </a>
                                <span className="font-bold text-slate-800 text-xs ml-1">{lead.phone}</span>
                              </>
                            ) : (
                              <span className="text-slate-400 text-xs italic">No phone</span>
                            )}
                          </div>
                        </td>

                        {/* Intent */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {isSell ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-50 text-[#D8232A] border border-red-200 font-extrabold text-[11px]">
                              <Tag className="w-3 h-3" />
                              <span>SELL</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-extrabold text-[11px]">
                              <Home className="w-3 h-3" />
                              <span>RENT</span>
                            </span>
                          )}
                        </td>

                        {/* Property Details */}
                        <td className="py-3.5 px-4 min-w-[160px]">
                          <div className="font-extrabold text-slate-900">{propType}</div>
                          {subType && (
                            <div className="text-[11px] font-semibold text-slate-500 mt-0.5">
                              {subType}
                            </div>
                          )}
                        </td>

                        {/* Location */}
                        <td className="py-3.5 px-4 min-w-[170px]">
                          <div className="flex items-start gap-1 font-semibold text-slate-800 text-xs">
                            <MapPin className="w-3.5 h-3.5 text-[#D8232A] shrink-0 mt-0.5" />
                            <span className="truncate">{location}</span>
                          </div>
                          <div className="text-[11px] text-slate-400 font-semibold ml-4.5">
                            {city} {pincode ? `• PIN ${pincode}` : ''}
                          </div>
                        </td>

                        {/* Preferred Time */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 text-slate-600 bg-slate-50 border border-slate-200 px-2 py-1 rounded-md text-[11px] font-bold">
                            <Clock className="w-3 h-3 text-slate-400" />
                            <span>{contactTime}</span>
                          </span>
                        </td>

                        {/* Status (Inline update dropdown) */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <select
                            value={lead.lead_status || lead.status || 'new'}
                            onChange={(e) =>
                              updateStatusMutation.mutate({ leadId: lead.id, status: e.target.value })
                            }
                            className={cn(
                              'text-[11px] font-extrabold px-2.5 py-1 rounded-full border appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#D8232A]',
                              stCfg.bg,
                              stCfg.color,
                              stCfg.border
                            )}
                          >
                            <option value="new">New</option>
                            <option value="contacted">Contacted</option>
                            <option value="follow_up">Follow Up</option>
                            <option value="in_progress">In Progress</option>
                            <option value="qualified">Qualified</option>
                            <option value="converted">Won / Converted</option>
                            <option value="closed">Closed</option>
                            <option value="lost">Lost</option>
                          </select>
                        </td>

                        {/* Assignee (Inline update dropdown) */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <select
                            value={lead.assigned_to || ''}
                            onChange={(e) =>
                              updateAssigneeMutation.mutate({ leadId: lead.id, assigneeId: e.target.value })
                            }
                            className="text-xs font-semibold px-2 py-1 rounded-lg border border-slate-200 bg-white text-slate-800 cursor-pointer focus:outline-none focus:border-[#D8232A]"
                          >
                            <option value="">Unassigned</option>
                            {staffMembers.map((m: any) => (
                              <option key={m.id} value={m.id}>
                                {m.first_name || ''} {m.last_name || ''}
                              </option>
                            ))}
                          </select>
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => {
                                setSelectedLeadIdForDrawer(lead.id);
                                setIsDrawerOpen(true);
                              }}
                              className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                              title="View Full Details Drawer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>View</span>
                            </button>

                            <button
                              onClick={() => {
                                if (confirm(`Are you sure you want to delete lead #${leadNumber}?`)) {
                                  deleteLeadMutation.mutate(lead.id);
                                }
                              }}
                              className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                              title="Delete Lead"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Table Footer & Pagination */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 font-semibold">
              <div>
                Showing {(page - 1) * pageSize + 1} to{' '}
                {Math.min(page * pageSize, filteredLeads.length)} of {filteredLeads.length} leads
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-bold cursor-pointer"
                >
                  Previous
                </button>
                <span className="font-extrabold text-slate-800">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-bold cursor-pointer"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* ======================== CARD VIEW ======================== */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {paginatedLeads.map((lead: any) => {
              const sData = lead.service_data || {};
              const isSell = (sData.intent || '').toLowerCase() === 'sell' || lead.tags?.includes('sell');
              const intentLabel = isSell ? 'Sell' : 'Rent';
              const propType = sData.property_type || sData.propertyType || lead.service_request || 'Property';
              const subType = sData.sub_type || sData.subType || '';
              const location = lead.location || sData.location || 'Hyderabad';
              const city = lead.city || sData.city || 'Hyderabad';
              const pincode = sData.pincode || '';
              const contactTime = sData.contact_time || sData.contactTime || sData.preferred_time || 'Anytime';
              const leadNumber = lead.lead_number || `RN-LEAD-${lead.id.substring(0, 6).toUpperCase()}`;

              const cleanPhone = (lead.phone || '').replace(/\D/g, '');
              const waText = `Hello ${lead.name || 'Sir/Madam'}, regarding your property listing on RealtyNow (${intentLabel} ${propType} in ${location}, Ref: ${leadNumber}):`;
              const waUrl = buildWhatsAppUrl(cleanPhone, waText);

              const stKey = lead.lead_status || lead.status || 'new';
              const stCfg = LEAD_STATUS_CONFIG[stKey] || LEAD_STATUS_CONFIG.new;

              return (
                <div
                  key={lead.id}
                  className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:shadow-md transition space-y-3.5 flex flex-col justify-between"
                >
                  <div>
                    {/* Card Top Row */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs font-black text-slate-900 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md">
                        {leadNumber}
                      </span>
                      {isSell ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-50 text-[#D8232A] border border-red-200 font-extrabold text-[10px]">
                          <Tag className="w-3 h-3" /> SELL
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-extrabold text-[10px]">
                          <Home className="w-3 h-3" /> RENT
                        </span>
                      )}
                    </div>

                    {/* Customer Info */}
                    <div className="mt-3">
                      <h4 className="font-extrabold text-slate-900 text-sm">{lead.name || 'Anonymous Customer'}</h4>
                      <p className="text-xs text-slate-500 font-semibold">{lead.phone || 'No phone provided'}</p>
                      {lead.email && <p className="text-[11px] text-slate-400 truncate">{lead.email}</p>}
                    </div>

                    {/* Property Details */}
                    <div className="mt-3 p-2.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                      <div className="text-xs font-black text-slate-800">
                        {propType} {subType ? `• ${subType}` : ''}
                      </div>
                      <div className="text-xs text-slate-500 flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-[#D8232A] shrink-0" />
                        <span className="truncate">
                          {location}, {city} {pincode ? `(${pincode})` : ''}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>Prefers: {contactTime}</span>
                      </div>
                    </div>
                  </div>

                  {/* Card Bottom Controls */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      {lead.phone && (
                        <>
                          <a
                            href={`tel:${cleanPhone}`}
                            className="p-2 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 transition"
                            title="Call"
                          >
                            <PhoneCall className="w-3.5 h-3.5" />
                          </a>
                          <a
                            href={waUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition"
                            title="WhatsApp"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                          </a>
                        </>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          setSelectedLeadIdForDrawer(lead.id);
                          setIsDrawerOpen(true);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition cursor-pointer"
                      >
                        View Details
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ================================================================= */}
      {/* SERVICE LEAD DETAIL DRAWER */}
      {/* ================================================================= */}
      <ServiceLeadDetailDrawer
        leadId={selectedLeadIdForDrawer}
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setSelectedLeadIdForDrawer(null);
        }}
        onLeadUpdated={() => {
          refetch();
        }}
      />

      {/* ================================================================= */}
      {/* MANUAL CREATE LEAD MODAL */}
      {/* ================================================================= */}
      {showCreateModal && (
        <Modal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          title="Add New Property Listing Lead"
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!createForm.name.trim() || !createForm.phone.trim()) {
                addToast('error', 'Name and Phone are required.');
                return;
              }
              createLeadMutation.mutate(createForm);
            }}
            className="space-y-4 pt-2"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Full Name *</label>
                <Input
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  placeholder="Customer Full Name"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number *</label>
                <Input
                  value={createForm.phone}
                  onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value.replace(/\D/g, '') })}
                  placeholder="10-digit mobile number"
                  maxLength={10}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
                <Input
                  type="email"
                  value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                  placeholder="Email (optional)"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Looking to *</label>
                <Select
                  value={createForm.intent}
                  onChange={(e) => setCreateForm({ ...createForm, intent: e.target.value })}
                >
                  <option value="sell">Sell</option>
                  <option value="rent">Rent</option>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Property Type</label>
                <Select
                  value={createForm.propertyType}
                  onChange={(e) => setCreateForm({ ...createForm, propertyType: e.target.value })}
                >
                  <option value="Apartment / Flat">Apartment / Flat</option>
                  <option value="Independent House">Independent House</option>
                  <option value="Villa">Villa</option>
                  <option value="Plot / Land">Plot / Land</option>
                  <option value="Commercial Property">Commercial Property</option>
                  <option value="Office Space">Office Space</option>
                  <option value="Shop">Shop</option>
                  <option value="Warehouse">Warehouse</option>
                </Select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Sub Type</label>
                <Input
                  value={createForm.subType}
                  onChange={(e) => setCreateForm({ ...createForm, subType: e.target.value })}
                  placeholder="e.g. 2 BHK, 3 BHK Villa"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">Location / Area</label>
                <Input
                  value={createForm.location}
                  onChange={(e) => setCreateForm({ ...createForm, location: e.target.value })}
                  placeholder="Colony, street, or landmark"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">City</label>
                <Input
                  value={createForm.city}
                  onChange={(e) => setCreateForm({ ...createForm, city: e.target.value })}
                  placeholder="City name"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Pincode</label>
                <Input
                  value={createForm.pincode}
                  onChange={(e) => setCreateForm({ ...createForm, pincode: e.target.value.replace(/\D/g, '') })}
                  placeholder="6-digit pincode"
                  maxLength={6}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Preferred Contact Time</label>
                <Select
                  value={createForm.contactTime}
                  onChange={(e) => setCreateForm({ ...createForm, contactTime: e.target.value })}
                >
                  <option value="Anytime">Anytime</option>
                  <option value="Morning (9 AM - 12 PM)">Morning (9 AM - 12 PM)</option>
                  <option value="Afternoon (12 PM - 4 PM)">Afternoon (12 PM - 4 PM)</option>
                  <option value="Evening (4 PM - 8 PM)">Evening (4 PM - 8 PM)</option>
                  <option value="Weekends Only">Weekends Only</option>
                </Select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Notes / Description</label>
              <Textarea
                rows={2}
                value={createForm.notes}
                onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })}
                placeholder="Optional notes or details from caller..."
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createLeadMutation.isPending}>
                {createLeadMutation.isPending ? 'Saving...' : 'Save Lead'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </DashboardLayout>
  );
}

export default AdminNewLeadsPage;
