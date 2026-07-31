import React, { useState } from 'react';
import { useLanguageContext } from '../../lib/i18n/language-context';
import {
  User,
  Phone,
  Plus,
  ShieldCheck,
  MapPin,
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
  onAddLead?: () => void;
}

export function EnterpriseKanban({ initialLeads, onLeadStageChange, onAddLead }: EnterpriseKanbanProps) {
  const { t } = useLanguageContext();
  const [leads, setLeads] = useState<KanbanLeadCard[]>(initialLeads);
  const [draggedId, setDraggedId] = useState<string | null>(null);

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

  return (
    <div className="w-full bg-slate-900 rounded-3xl p-6 shadow-xl border border-slate-800 text-white font-sans overflow-x-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-red-500" />
            CRM Lead Pipeline (Kanban Board)
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Drag and drop customer leads across sales pipeline stages in real-time.
          </p>
        </div>
        {onAddLead && (
          <button
            type="button"
            onClick={onAddLead}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-lg shadow-red-600/30 transition-all cursor-pointer"
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
              className="flex flex-col bg-slate-800/60 border border-slate-700/60 rounded-2xl p-3 min-h-[450px]"
            >
              {/* Stage Header */}
              <div
                className={`p-2.5 rounded-xl border-l-4 ${stage.color} ${stage.bg} flex items-center justify-between mb-3 shadow-sm`}
              >
                <span className="font-bold text-xs text-slate-900">{stage.label}</span>
                <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-full bg-white text-slate-900 shadow-xs">
                  {stageLeads.length}
                </span>
              </div>

              {/* Cards Container */}
              <div className="flex-1 space-y-3 overflow-y-auto max-h-[600px] pr-1">
                {stageLeads.length === 0 ? (
                  <div className="h-32 border-2 border-dashed border-slate-700/60 rounded-xl flex items-center justify-center text-slate-500 text-xs font-semibold">
                    Drop lead here
                  </div>
                ) : (
                  stageLeads.map((lead) => (
                    <div
                      key={lead.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, lead.id)}
                      className="bg-slate-900 border border-slate-700 hover:border-red-500 rounded-xl p-3.5 shadow-md hover:shadow-lg transition-all cursor-grab active:cursor-grabbing group"
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span className="text-xs font-bold text-white group-hover:text-red-400 transition-colors line-clamp-1">
                          {lead.title}
                        </span>
                        {lead.priority && (
                          <span
                            className={`text-[10px] font-black px-1.5 py-0.5 rounded uppercase ${
                              lead.priority === 'High'
                                ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                : lead.priority === 'Medium'
                                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                  : 'bg-slate-700 text-slate-300'
                            }`}
                          >
                            {lead.priority}
                          </span>
                        )}
                      </div>

                      <div className="space-y-1 text-xs text-slate-400 border-t border-slate-800/80 pt-2">
                        <div className="flex items-center gap-1.5 font-medium text-slate-200">
                          <User className="w-3.5 h-3.5 text-red-500" />
                          <span>{lead.customerName}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px]">
                          <Phone className="w-3 h-3 text-slate-500" />
                          <span>{lead.phone}</span>
                        </div>
                        {lead.locality && (
                          <div className="flex items-center gap-1.5 text-[11px]">
                            <MapPin className="w-3 h-3 text-slate-500" />
                            <span>{lead.locality}</span>
                          </div>
                        )}
                        <div className="flex items-center justify-between text-[11px] font-bold text-emerald-400 pt-1">
                          <span>₹ {lead.budget}</span>
                          <span className="text-[10px] text-slate-500 font-normal">{lead.createdAt}</span>
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
    </div>
  );
}
