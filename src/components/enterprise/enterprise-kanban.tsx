import React, { useState } from 'react';
import { useLanguageContext } from '../../lib/i18n/language-context';
import {
  User,
  Phone,
  Plus,
  ShieldCheck,
  MapPin,
  X,
  Mail,
  MessageSquare,
  CheckCircle2,
} from 'lucide-react';

export interface KanbanLeadCard {
  id: string;
  title: string;
  customerName: string;
  phone: string;
  email: string;
  budget: string;
  locality?: string;
  stage: 'new' | 'contacted' | 'site_visit' | 'negotiation' | 'booking' | 'sold' | 'closed';
  priority?: 'High' | 'Medium' | 'Low';
  assignedAgent?: string;
  createdAt: string;
  notes?: string;
}

const STAGES: {
  key: KanbanLeadCard['stage'];
  label: string;
  headerGradient: string;
  headerBadge: string;
  columnBg: string;
  cardLeftBorder: string;
  dropZoneBorder: string;
  dropZoneBg: string;
  dropZoneText: string;
  dotColor: string;
}[] = [
  {
    key: 'new',
    label: 'New Lead',
    headerGradient: 'bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 text-white',
    headerBadge: 'bg-white/20 text-white border border-white/30',
    columnBg: 'bg-blue-50/40 border-blue-200/90',
    cardLeftBorder: 'border-l-4 border-l-blue-600',
    dropZoneBorder: 'border-blue-300',
    dropZoneBg: 'bg-blue-50/60',
    dropZoneText: 'text-blue-600',
    dotColor: 'bg-blue-300',
  },
  {
    key: 'contacted',
    label: 'Contacted',
    headerGradient: 'bg-gradient-to-r from-amber-500 via-amber-600 to-yellow-600 text-white',
    headerBadge: 'bg-white/25 text-white border border-white/30',
    columnBg: 'bg-amber-50/40 border-amber-200/90',
    cardLeftBorder: 'border-l-4 border-l-amber-500',
    dropZoneBorder: 'border-amber-300',
    dropZoneBg: 'bg-amber-50/60',
    dropZoneText: 'text-amber-700',
    dotColor: 'bg-amber-200',
  },
  {
    key: 'site_visit',
    label: 'Site Visit Scheduled',
    headerGradient: 'bg-gradient-to-r from-purple-600 via-purple-700 to-fuchsia-600 text-white',
    headerBadge: 'bg-white/20 text-white border border-white/30',
    columnBg: 'bg-purple-50/40 border-purple-200/90',
    cardLeftBorder: 'border-l-4 border-l-purple-600',
    dropZoneBorder: 'border-purple-300',
    dropZoneBg: 'bg-purple-50/60',
    dropZoneText: 'text-purple-700',
    dotColor: 'bg-purple-300',
  },
  {
    key: 'negotiation',
    label: 'Negotiation',
    headerGradient: 'bg-gradient-to-r from-orange-500 via-orange-600 to-rose-500 text-white',
    headerBadge: 'bg-white/20 text-white border border-white/30',
    columnBg: 'bg-orange-50/40 border-orange-200/90',
    cardLeftBorder: 'border-l-4 border-l-orange-500',
    dropZoneBorder: 'border-orange-300',
    dropZoneBg: 'bg-orange-50/60',
    dropZoneText: 'text-orange-700',
    dotColor: 'bg-orange-200',
  },
  {
    key: 'booking',
    label: 'Booking In Progress',
    headerGradient: 'bg-gradient-to-r from-teal-600 via-teal-700 to-cyan-700 text-white',
    headerBadge: 'bg-white/20 text-white border border-white/30',
    columnBg: 'bg-teal-50/40 border-teal-200/90',
    cardLeftBorder: 'border-l-4 border-l-teal-600',
    dropZoneBorder: 'border-teal-300',
    dropZoneBg: 'bg-teal-50/60',
    dropZoneText: 'text-teal-700',
    dotColor: 'bg-teal-300',
  },
  {
    key: 'sold',
    label: 'Sold / Closed',
    headerGradient: 'bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-600 text-white',
    headerBadge: 'bg-white/20 text-white border border-white/30',
    columnBg: 'bg-emerald-50/40 border-emerald-200/90',
    cardLeftBorder: 'border-l-4 border-l-emerald-600',
    dropZoneBorder: 'border-emerald-300',
    dropZoneBg: 'bg-emerald-50/60',
    dropZoneText: 'text-emerald-700',
    dotColor: 'bg-emerald-200',
  },
  {
    key: 'closed',
    label: 'Archived',
    headerGradient: 'bg-gradient-to-r from-slate-700 via-slate-800 to-slate-900 text-white',
    headerBadge: 'bg-white/20 text-white border border-white/30',
    columnBg: 'bg-slate-100/60 border-slate-300/80',
    cardLeftBorder: 'border-l-4 border-l-slate-700',
    dropZoneBorder: 'border-slate-300',
    dropZoneBg: 'bg-slate-100',
    dropZoneText: 'text-slate-600',
    dotColor: 'bg-slate-400',
  },
];

interface EnterpriseKanbanProps {
  initialLeads: KanbanLeadCard[];
  onLeadStageChange?: (leadId: string, newStage: KanbanLeadCard['stage']) => void;
  onLeadClick?: (lead: KanbanLeadCard) => void;
  onAddLead?: () => void;
}

export function EnterpriseKanban({ initialLeads, onLeadStageChange, onLeadClick, onAddLead }: EnterpriseKanbanProps) {
  const { t } = useLanguageContext();
  const [leads, setLeads] = useState<KanbanLeadCard[]>(initialLeads);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [selectedLead, setSelectedLead] = useState<KanbanLeadCard | null>(null);
  const [editNotes, setEditNotes] = useState<string>('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedId(id);
    e.dataTransfer.setData('text/plain', id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, stageKey: KanbanLeadCard['stage']) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain') || draggedId;
    if (!id) return;

    setLeads((prev) => prev.map((lead) => (lead.id === id ? { ...lead, stage: stageKey } : lead)));

    if (onLeadStageChange) {
      onLeadStageChange(id, stageKey);
    }
    setDraggedId(null);
  };

  const handleOpenLead = (lead: KanbanLeadCard) => {
    setSelectedLead(lead);
    setEditNotes(lead.notes || '');
    setSaveSuccess(false);
    if (onLeadClick) onLeadClick(lead);
  };

  const handleSaveLead = () => {
    if (!selectedLead) return;
    setLeads((prev) =>
      prev.map((l) => (l.id === selectedLead.id ? { ...selectedLead, notes: editNotes } : l))
    );
    if (onLeadStageChange) {
      onLeadStageChange(selectedLead.id, selectedLead.stage);
    }
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  return (
    <div className="w-full bg-white rounded-3xl p-6 shadow-md border border-slate-200 font-sans overflow-x-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-black flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-red-500" />
            CRM Lead Pipeline (Kanban Board)
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Drag and drop customer leads across sales pipeline stages or click any lead card to view full details.
          </p>
        </div>
        {onAddLead && (
          <button
            type="button"
            onClick={onAddLead}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-md shadow-red-600/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Lead</span>
          </button>
        )}
      </div>

      {/* Board Columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4 min-w-[1200px]">
        {STAGES.map((stage) => {
          const stageLeads = leads.filter((l) => l.stage === stage.key);
          return (
            <div
              key={stage.key}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, stage.key)}
              className={`flex flex-col ${stage.columnBg} border rounded-2xl p-2.5 min-h-[480px] shadow-xs overflow-hidden`}
            >
              {/* Stage Header with Business Color Gradient and Contrasting White Text */}
              <div
                className={`p-3 rounded-xl ${stage.headerGradient} flex items-center justify-between mb-3 shadow-sm`}
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className={`w-2 h-2 rounded-full ${stage.dotColor} shadow-xs shrink-0 animate-pulse`} />
                  <span className="font-extrabold text-xs tracking-wide truncate">{stage.label}</span>
                </div>
                <span className={`text-xs font-mono font-black px-2 py-0.5 rounded-full ${stage.headerBadge} shadow-2xs shrink-0`}>
                  {stageLeads.length}
                </span>
              </div>

              {/* Cards Container */}
              <div className="flex-1 space-y-3 overflow-y-auto max-h-[600px] pr-1">
                {stageLeads.length === 0 ? (
                  <div className={`h-32 border-2 border-dashed ${stage.dropZoneBorder} ${stage.dropZoneBg} ${stage.dropZoneText} rounded-xl flex items-center justify-center text-xs font-bold`}>
                    Drop lead here
                  </div>
                ) : (
                  stageLeads.map((lead) => (
                    <div
                      key={lead.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, lead.id)}
                      onClick={() => handleOpenLead(lead)}
                      className={`bg-white border border-slate-200/90 ${stage.cardLeftBorder} hover:border-slate-300 rounded-xl p-3.5 shadow-xs hover:shadow-md transition-all cursor-pointer group hover:scale-[1.01]`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span className="text-xs font-bold text-navy-900 group-hover:text-red-600 transition-colors line-clamp-1">
                          {lead.title}
                        </span>
                        {lead.priority && (
                          <span
                            className={`text-[10px] font-black px-1.5 py-0.5 rounded uppercase ${
                              lead.priority === 'High'
                                ? 'bg-red-100 text-red-700 border border-red-200'
                                : lead.priority === 'Medium'
                                  ? 'bg-amber-100 text-amber-700 border border-amber-200'
                                  : 'bg-slate-100 text-slate-600 border border-slate-200'
                            }`}
                          >
                            {lead.priority}
                          </span>
                        )}
                      </div>

                      <div className="space-y-1 text-xs text-slate-500 border-t border-slate-100 pt-2">
                        <div className="flex items-center gap-1.5 font-semibold text-black">
                          <User className="w-3.5 h-3.5 text-red-500" />
                          <span>{lead.customerName}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-600">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{lead.phone}</span>
                        </div>
                        {lead.locality && (
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-600">
                            <MapPin className="w-3 h-3 text-slate-400" />
                            <span>{lead.locality}</span>
                          </div>
                        )}
                        <div className="flex items-center justify-between text-[11px] font-bold text-emerald-700 pt-1">
                          <span>₹ {lead.budget}</span>
                          <span className="text-[10px] text-slate-400 font-normal">{lead.createdAt}</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* LEAD DETAILS MODAL OVERLAY */}
      {selectedLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col max-h-[85vh] sm:max-h-[90vh] overflow-hidden">
            {/* Fixed Modal Header */}
            <div className="flex items-start justify-between p-5 sm:p-6 border-b border-slate-100 bg-white shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center font-bold text-base sm:text-lg shrink-0">
                  {selectedLead.customerName.charAt(0)}
                </div>
                <div className="min-w-0">
                  <h3 className="text-base sm:text-lg font-extrabold text-black leading-tight truncate">
                    {selectedLead.customerName}
                  </h3>
                  <p className="text-xs font-semibold text-slate-500 mt-0.5 truncate">
                    {selectedLead.title}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedLead(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-black hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
                title="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Modal Body */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
              {/* Quick Contact Action Bar */}
              <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
                <a
                  href={`tel:${selectedLead.phone}`}
                  className="flex items-center justify-center gap-2 py-2.5 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs rounded-xl border border-emerald-200 transition-colors cursor-pointer"
                >
                  <Phone className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="truncate">Call Customer</span>
                </a>
                <a
                  href={`https://wa.me/${selectedLead.phone.replace(/[^\d]/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 py-2.5 px-3 bg-green-50 hover:bg-green-100 text-green-700 font-bold text-xs rounded-xl border border-green-200 transition-colors cursor-pointer"
                >
                  <MessageSquare className="w-4 h-4 text-green-600 shrink-0" />
                  <span className="truncate">WhatsApp</span>
                </a>
                <a
                  href={`mailto:${selectedLead.email}`}
                  className="flex items-center justify-center gap-2 py-2.5 px-3 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs rounded-xl border border-blue-200 transition-colors cursor-pointer"
                >
                  <Mail className="w-4 h-4 text-blue-600 shrink-0" />
                  <span className="truncate">Email</span>
                </a>
              </div>

              {/* Lead Meta Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4 bg-slate-50 rounded-2xl p-4 border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-400 font-semibold block mb-0.5">Phone</span>
                  <span className="font-bold text-black">{selectedLead.phone}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold block mb-0.5">Email</span>
                  <span className="font-bold text-black break-all">{selectedLead.email}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold block mb-0.5">Budget / Value</span>
                  <span className="font-extrabold text-emerald-600">₹ {selectedLead.budget}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold block mb-0.5">Locality / City</span>
                  <span className="font-bold text-black">{selectedLead.locality || 'Hyderabad'}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold block mb-0.5">Assigned Agent</span>
                  <span className="font-bold text-black">{selectedLead.assignedAgent || 'Main Admin'}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold block mb-0.5">Inquiry Date</span>
                  <span className="font-bold text-black">{selectedLead.createdAt}</span>
                </div>
              </div>

              {/* Priority Selector */}
              <div>
                <label className="block text-xs font-bold text-black mb-1.5 uppercase tracking-wider">
                  Priority Status
                </label>
                <div className="flex gap-2">
                  {(['High', 'Medium', 'Low'] as const).map((prio) => (
                    <button
                      key={prio}
                      type="button"
                      onClick={() => setSelectedLead((prev) => (prev ? { ...prev, priority: prio } : null))}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                        selectedLead.priority === prio
                          ? prio === 'High'
                            ? 'bg-red-600 text-white border-red-600 shadow-sm'
                            : prio === 'Medium'
                              ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                              : 'bg-slate-700 text-white border-slate-700 shadow-sm'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {prio} Priority
                    </button>
                  ))}
                </div>
              </div>

              {/* Pipeline Stage Selector */}
              <div>
                <label className="block text-xs font-bold text-black mb-1.5 uppercase tracking-wider">
                  Pipeline Stage
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {STAGES.map((stg) => (
                    <button
                      key={stg.key}
                      type="button"
                      onClick={() => setSelectedLead((prev) => (prev ? { ...prev, stage: stg.key } : null))}
                      className={`p-2 rounded-xl text-xs font-bold text-left transition-all border cursor-pointer ${
                        selectedLead.stage === stg.key
                          ? 'bg-black text-white border-black shadow-sm'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {stg.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes / Call Log Textarea */}
              <div>
                <label className="block text-xs font-bold text-black mb-1.5 uppercase tracking-wider">
                  CRM Notes & Requirements
                </label>
                <textarea
                  rows={3}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Add customer requirements, site visit notes, or call logs here..."
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs text-black placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-400 transition-all"
                />
              </div>

              {saveSuccess && (
                <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Lead details saved successfully!</span>
                </div>
              )}
            </div>

            {/* Fixed Footer: Always pinned inside the modal at the bottom */}
            <div className="flex items-center justify-end gap-3 p-4 sm:p-5 border-t border-slate-200 bg-slate-50/90 shrink-0">
              <button
                type="button"
                onClick={() => setSelectedLead(null)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200/80 transition-colors cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleSaveLead}
                className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 active:scale-95 text-white font-bold text-xs shadow-md shadow-red-600/20 transition-all cursor-pointer"
              >
                Save & Update Lead
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

