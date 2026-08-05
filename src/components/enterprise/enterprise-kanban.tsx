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
  Calendar,
  CheckCircle2,
  Tag,
  FileText,
  UserCheck,
  ExternalLink,
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

const STAGES: { key: KanbanLeadCard['stage']; label: string; color: string; bg: string }[] = [
  { key: 'new', label: 'New Lead', color: 'border-blue-500 text-blue-700', bg: 'bg-blue-50' },
  { key: 'contacted', label: 'Contacted', color: 'border-indigo-500 text-indigo-700', bg: 'bg-indigo-50' },
  { key: 'site_visit', label: 'Site Visit Scheduled', color: 'border-amber-500 text-amber-700', bg: 'bg-amber-50' },
  { key: 'negotiation', label: 'Negotiation', color: 'border-purple-500 text-purple-700', bg: 'bg-purple-50' },
  { key: 'booking', label: 'Booking In Progress', color: 'border-emerald-500 text-emerald-700', bg: 'bg-emerald-50' },
  { key: 'sold', label: 'Sold / Closed', color: 'border-green-600 text-green-800', bg: 'bg-green-100' },
  { key: 'closed', label: 'Archived', color: 'border-slate-400 text-slate-600', bg: 'bg-slate-100' },
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
              className="flex flex-col bg-slate-50 border border-slate-200 rounded-2xl p-3 min-h-[450px]"
            >
              {/* Stage Header */}
              <div
                className={`p-2.5 rounded-xl border-l-4 ${stage.color} ${stage.bg} flex items-center justify-between mb-3 shadow-sm`}
              >
                <span className="font-bold text-xs text-black">{stage.label}</span>
                <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-full bg-white text-black border border-slate-200 shadow-xs">
                  {stageLeads.length}
                </span>
              </div>

              {/* Cards Container */}
              <div className="flex-1 space-y-3 overflow-y-auto max-h-[600px] pr-1">
                {stageLeads.length === 0 ? (
                  <div className="h-32 border-2 border-dashed border-slate-300 rounded-xl flex items-center justify-center text-slate-400 text-xs font-semibold">
                    Drop lead here
                  </div>
                ) : (
                  stageLeads.map((lead) => (
                    <div
                      key={lead.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, lead.id)}
                      onClick={() => handleOpenLead(lead)}
                      className="bg-white border border-slate-200 hover:border-red-500 rounded-xl p-3.5 shadow-sm hover:shadow-md transition-all cursor-pointer group hover:scale-[1.01]"
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span className="text-xs font-bold text-black group-hover:text-red-600 transition-colors line-clamp-1">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 overflow-y-auto max-h-[90vh]">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center font-bold text-lg">
                  {selectedLead.customerName.charAt(0)}
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-black leading-tight">
                    {selectedLead.customerName}
                  </h3>
                  <p className="text-xs font-semibold text-slate-500 mt-0.5">
                    {selectedLead.title}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedLead(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-black hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Contact Action Bar */}
            <div className="grid grid-cols-3 gap-3 my-4">
              <a
                href={`tel:${selectedLead.phone}`}
                className="flex items-center justify-center gap-2 py-2.5 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs rounded-xl border border-emerald-200 transition-colors"
              >
                <Phone className="w-4 h-4 text-emerald-600" />
                <span>Call Customer</span>
              </a>
              <a
                href={`https://wa.me/${selectedLead.phone.replace(/[^\d]/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 py-2.5 px-3 bg-green-50 hover:bg-green-100 text-green-700 font-bold text-xs rounded-xl border border-green-200 transition-colors"
              >
                <MessageSquare className="w-4 h-4 text-green-600" />
                <span>WhatsApp</span>
              </a>
              <a
                href={`mailto:${selectedLead.email}`}
                className="flex items-center justify-center gap-2 py-2.5 px-3 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs rounded-xl border border-blue-200 transition-colors"
              >
                <Mail className="w-4 h-4 text-blue-600" />
                <span>Email</span>
              </a>
            </div>

            {/* Lead Meta Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 rounded-2xl p-4 border border-slate-200 text-xs my-4">
              <div>
                <span className="text-slate-400 font-semibold block mb-0.5">Phone</span>
                <span className="font-bold text-black">{selectedLead.phone}</span>
              </div>
              <div>
                <span className="text-slate-400 font-semibold block mb-0.5">Email</span>
                <span className="font-bold text-black">{selectedLead.email}</span>
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
            <div className="mb-4">
              <label className="block text-xs font-bold text-black mb-1.5 uppercase tracking-wider">
                Priority Status
              </label>
              <div className="flex gap-2">
                {(['High', 'Medium', 'Low'] as const).map((prio) => (
                  <button
                    key={prio}
                    type="button"
                    onClick={() => setSelectedLead((prev) => (prev ? { ...prev, priority: prio } : null))}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
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
            <div className="mb-4">
              <label className="block text-xs font-bold text-black mb-1.5 uppercase tracking-wider">
                Pipeline Stage
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {STAGES.map((stg) => (
                  <button
                    key={stg.key}
                    type="button"
                    onClick={() => setSelectedLead((prev) => (prev ? { ...prev, stage: stg.key } : null))}
                    className={`p-2 rounded-xl text-xs font-bold text-left transition-all border ${
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
            <div className="mb-4">
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
              <div className="mb-4 p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Lead details saved successfully!</span>
              </div>
            )}

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setSelectedLead(null)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleSaveLead}
                className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 active:scale-95 text-white font-bold text-xs shadow-md shadow-red-600/20 transition-all"
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

