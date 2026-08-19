import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Building2, Phone, Mail, Clock, Sparkles, MessageCircle } from 'lucide-react';
import { formatDate, buildWhatsAppUrl } from '../../lib/utils';

export interface KanbanStageTheme {
  id: string;
  label: string;
  headerGradient: string;
  headerText: string;
  headerBadge: string;
  columnBg: string;
  cardLeftBorder: string;
  cardHoverBorder: string;
  nameHoverText: string;
  dropZoneBorder: string;
  dropZoneBg: string;
  dropZoneText: string;
  dotColor: string;
}

export const PIPELINE_STAGES: KanbanStageTheme[] = [
  {
    id: 'new',
    label: 'New Lead',
    headerGradient: 'bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700',
    headerText: 'text-white',
    headerBadge: 'bg-white/20 text-white border border-white/30',
    columnBg: 'bg-blue-50/40 border-blue-200/90',
    cardLeftBorder: 'border-l-4 border-l-blue-600',
    cardHoverBorder: 'hover:border-blue-400 hover:shadow-blue-500/10',
    nameHoverText: 'group-hover:text-blue-600',
    dropZoneBorder: 'border-blue-300',
    dropZoneBg: 'bg-blue-50/60',
    dropZoneText: 'text-blue-600',
    dotColor: 'bg-blue-300',
  },
  {
    id: 'contacted',
    label: 'Contacted',
    headerGradient: 'bg-gradient-to-r from-amber-500 via-amber-600 to-yellow-600',
    headerText: 'text-white',
    headerBadge: 'bg-white/25 text-white border border-white/30',
    columnBg: 'bg-amber-50/40 border-amber-200/90',
    cardLeftBorder: 'border-l-4 border-l-amber-500',
    cardHoverBorder: 'hover:border-amber-400 hover:shadow-amber-500/10',
    nameHoverText: 'group-hover:text-amber-600',
    dropZoneBorder: 'border-amber-300',
    dropZoneBg: 'bg-amber-50/60',
    dropZoneText: 'text-amber-700',
    dotColor: 'bg-amber-200',
  },
  {
    id: 'site_visit',
    label: 'Site Visit',
    headerGradient: 'bg-gradient-to-r from-purple-600 via-purple-700 to-fuchsia-600',
    headerText: 'text-white',
    headerBadge: 'bg-white/20 text-white border border-white/30',
    columnBg: 'bg-purple-50/40 border-purple-200/90',
    cardLeftBorder: 'border-l-4 border-l-purple-600',
    cardHoverBorder: 'hover:border-purple-400 hover:shadow-purple-500/10',
    nameHoverText: 'group-hover:text-purple-600',
    dropZoneBorder: 'border-purple-300',
    dropZoneBg: 'bg-purple-50/60',
    dropZoneText: 'text-purple-700',
    dotColor: 'bg-purple-300',
  },
  {
    id: 'negotiation',
    label: 'Negotiation',
    headerGradient: 'bg-gradient-to-r from-orange-500 via-orange-600 to-rose-500',
    headerText: 'text-white',
    headerBadge: 'bg-white/20 text-white border border-white/30',
    columnBg: 'bg-orange-50/40 border-orange-200/90',
    cardLeftBorder: 'border-l-4 border-l-orange-500',
    cardHoverBorder: 'hover:border-orange-400 hover:shadow-orange-500/10',
    nameHoverText: 'group-hover:text-orange-600',
    dropZoneBorder: 'border-orange-300',
    dropZoneBg: 'bg-orange-50/60',
    dropZoneText: 'text-orange-700',
    dotColor: 'bg-orange-200',
  },
  {
    id: 'won',
    label: 'Closed Won',
    headerGradient: 'bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-600',
    headerText: 'text-white',
    headerBadge: 'bg-white/20 text-white border border-white/30',
    columnBg: 'bg-emerald-50/40 border-emerald-200/90',
    cardLeftBorder: 'border-l-4 border-l-emerald-600',
    cardHoverBorder: 'hover:border-emerald-400 hover:shadow-emerald-500/10',
    nameHoverText: 'group-hover:text-emerald-600',
    dropZoneBorder: 'border-emerald-300',
    dropZoneBg: 'bg-emerald-50/60',
    dropZoneText: 'text-emerald-700',
    dotColor: 'bg-emerald-200',
  },
  {
    id: 'lost',
    label: 'Lost / Closed',
    headerGradient: 'bg-gradient-to-r from-rose-600 via-rose-700 to-red-700',
    headerText: 'text-white',
    headerBadge: 'bg-white/20 text-white border border-white/30',
    columnBg: 'bg-rose-50/40 border-rose-200/90',
    cardLeftBorder: 'border-l-4 border-l-rose-600',
    cardHoverBorder: 'hover:border-rose-400 hover:shadow-rose-500/10',
    nameHoverText: 'group-hover:text-rose-600',
    dropZoneBorder: 'border-rose-300',
    dropZoneBg: 'bg-rose-50/60',
    dropZoneText: 'text-rose-700',
    dotColor: 'bg-rose-200',
  },
] as const;

type BuilderLead = any;

interface BuilderKanbanBoardProps {
  leads: BuilderLead[];
  onUpdateStatus: (id: string, newStatus: string) => void;
  onOpenLead?: (lead: BuilderLead) => void;
}

export function BuilderKanbanBoard({ leads, onUpdateStatus, onOpenLead }: BuilderKanbanBoardProps) {
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);

  const leadsByStage = useMemo(() => {
    const grouped: Record<string, BuilderLead[]> = {};
    PIPELINE_STAGES.forEach((s) => (grouped[s.id] = []));

    leads.forEach((lead) => {
      const status = lead.status;
      if (grouped[status]) {
        grouped[status].push(lead);
      } else if (status === 'closed') {
        grouped['won']?.push(lead);
      } else if (status === 'lost') {
        grouped['lost']?.push(lead);
      } else {
        grouped['new']?.push(lead);
      }
    });
    return grouped;
  }, [leads]);

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedLeadId(id);
    e.dataTransfer.setData('text/plain', id);
    setTimeout(() => {
      const el = document.getElementById(`blead-${id}`);
      if (el) el.classList.add('opacity-50');
    }, 0);
  };

  const handleDragEnd = (e: React.DragEvent, id: string) => {
    setDraggedLeadId(null);
    const el = document.getElementById(`blead-${id}`);
    if (el) el.classList.remove('opacity-50');
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetStatus: string) => {
    e.preventDefault();
    const leadId = e.dataTransfer.getData('text/plain');
    if (leadId) {
      onUpdateStatus(leadId, targetStatus);
    }
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-6 h-[calc(100vh-260px)] min-h-[620px] snap-x">
      {PIPELINE_STAGES.map((stage) => {
        const stageLeads = leadsByStage[stage.id] || [];

        return (
          <div
            key={stage.id}
            className={`flex-shrink-0 w-80 rounded-2xl border ${stage.columnBg} flex flex-col snap-start shadow-xs transition-colors overflow-hidden`}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, stage.id)}
          >
            {/* Business Gradient Header with High-Contrast White Text & Badge */}
            <div
              className={`p-4 ${stage.headerGradient} ${stage.headerText} flex justify-between items-center sticky top-0 z-10 shadow-md`}
            >
              <h3 className="font-extrabold text-sm flex items-center gap-2 tracking-wide">
                <span className={`w-2 h-2 rounded-full ${stage.dotColor} shadow-xs animate-pulse`} />
                <span>{stage.label}</span>
              </h3>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-black ${stage.headerBadge} shadow-2xs`}
              >
                {stageLeads.length}
              </span>
            </div>

            {/* Lead Cards List Container */}
            <div className="p-3 flex-1 overflow-y-auto space-y-3">
              {stageLeads.map((lead) => {
                const leadName = lead.name || 'Anonymous Lead';
                return (
                  <motion.div
                    layoutId={`blead-${lead.id}`}
                    key={lead.id}
                    id={`blead-${lead.id}`}
                    draggable
                    onDragStart={(e) => handleDragStart(e as any, lead.id)}
                    onDragEnd={(e) => handleDragEnd(e as any, lead.id)}
                    onClick={() => onOpenLead?.(lead)}
                    className={`bg-white p-4 rounded-xl shadow-xs border border-slate-200/90 ${stage.cardLeftBorder} cursor-pointer ${stage.cardHoverBorder} hover:shadow-md transition-all group`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h4
                        className={`font-bold text-navy-900 text-sm ${stage.nameHoverText} transition-colors`}
                      >
                        {leadName}
                      </h4>
                      {lead.priority && (
                        <span
                          className={`text-[9px] uppercase font-extrabold px-1.5 py-0.5 rounded ${
                            lead.priority === 'urgent' || lead.priority === 'high'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {lead.priority}
                        </span>
                      )}
                    </div>

                    {lead.builder_projects?.name && (
                      <div className="text-xs text-navy-700 flex items-center gap-1.5 mb-2.5 font-semibold bg-slate-50 p-1.5 rounded-lg border border-slate-100 line-clamp-1">
                        <Building2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{lead.builder_projects.name}</span>
                      </div>
                    )}

                    <div className="space-y-1.5 mb-3 text-xs">
                      {lead.phone && (
                        <div className="flex items-center justify-between">
                          <a
                            href={`tel:${lead.phone}`}
                            className="text-slate-600 hover:text-navy-900 flex items-center gap-1.5 font-medium"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Phone className="h-3 w-3 text-slate-400" /> {lead.phone}
                          </a>
                          <a
                            href={buildWhatsAppUrl(lead.phone, `Hello ${leadName}, regarding your property inquiry:`)}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="p-1 rounded bg-green-50 text-green-700 hover:bg-green-100 transition-colors"
                            title="WhatsApp"
                          >
                            <MessageCircle className="h-3 w-3" />
                          </a>
                        </div>
                      )}
                      {lead.email && (
                        <a
                          href={`mailto:${lead.email}`}
                          className="text-slate-500 hover:text-navy-900 flex items-center gap-1.5 truncate block"
                          onClick={(e) => e.stopPropagation()}
                          title={lead.email}
                        >
                          <Mail className="h-3 w-3 text-slate-400 shrink-0" />
                          <span className="truncate">{lead.email}</span>
                        </a>
                      )}
                    </div>

                    <div className="pt-2.5 border-t border-slate-100 flex justify-between items-center text-[11px] text-slate-400">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>{formatDate(lead.created_at)}</span>
                      </div>
                      <span className="font-semibold text-slate-500 group-hover:underline">Details →</span>
                    </div>
                  </motion.div>
                );
              })}

              {stageLeads.length === 0 && (
                <div
                  className={`h-28 border-2 border-dashed ${stage.dropZoneBorder} ${stage.dropZoneBg} ${stage.dropZoneText} rounded-xl flex flex-col items-center justify-center text-xs font-bold gap-1 transition-all`}
                >
                  <Sparkles className="h-4 w-4 opacity-50" />
                  <span>Drop leads here</span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
