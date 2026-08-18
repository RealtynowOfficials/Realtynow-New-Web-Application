import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Building2, Phone, Mail, Clock, Calendar } from 'lucide-react';
import { formatDate } from '../../lib/utils';
import { Badge } from '../../components/ui';
import { generatePropertyUrl } from '../../lib/utils';

export const PIPELINE_STAGES = [
  { id: 'new', label: 'New Lead', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { id: 'contacted', label: 'Contacted', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  { id: 'site_visit', label: 'Site Visit', color: 'bg-purple-100 text-purple-700 border-purple-200' },
  { id: 'negotiation', label: 'Negotiation', color: 'bg-orange-100 text-orange-700 border-orange-200' },
  { id: 'won', label: 'Closed Won', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' }
] as const;

type Lead = any;

interface AgentKanbanBoardProps {
  leads: Lead[];
  onStatusChange: (id: string, newStatus: string) => void;
  onOpenLead?: (lead: Lead) => void;
}

export function AgentKanbanBoard({ leads, onStatusChange, onOpenLead }: AgentKanbanBoardProps) {
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);

  const leadsByStage = useMemo(() => {
    const grouped: Record<string, Lead[]> = {};
    PIPELINE_STAGES.forEach((s) => (grouped[s.id] = []));

    leads.forEach((lead) => {
      const status = lead.lead_status || lead.status;
      if (grouped[status]) {
        grouped[status].push(lead);
      } else if (status === 'lost' || status === 'closed') {
        if (status === 'closed') grouped['won']?.push(lead);
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
      const el = document.getElementById(`lead-${id}`);
      if (el) el.classList.add('opacity-50');
    }, 0);
  };

  const handleDragEnd = (e: React.DragEvent, id: string) => {
    setDraggedLeadId(null);
    const el = document.getElementById(`lead-${id}`);
    if (el) el.classList.remove('opacity-50');
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetStatus: string) => {
    e.preventDefault();
    const leadId = e.dataTransfer.getData('text/plain');
    if (leadId) {
      onStatusChange(leadId, targetStatus);
    }
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 h-[calc(100vh-280px)] min-h-[600px] snap-x">
      {PIPELINE_STAGES.map((stage) => {
        const stageLeads = leadsByStage[stage.id] || [];

        return (
          <div
            key={stage.id}
            className="flex-shrink-0 w-80 bg-slate-50/70 rounded-2xl border border-slate-200/80 flex flex-col snap-start"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, stage.id)}
          >
            <div className="p-4 border-b border-slate-200/80 bg-white rounded-t-2xl flex justify-between items-center sticky top-0 z-10 shadow-2xs">
              <h3 className="font-bold text-navy-900 text-sm flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${stage.color.split(' ')[0]}`} />
                {stage.label}
              </h3>
              <Badge variant="default" className="font-mono text-xs">
                {stageLeads.length}
              </Badge>
            </div>

            <div className="p-3 flex-1 overflow-y-auto space-y-3">
              {stageLeads.map((lead) => (
                <motion.div
                  layoutId={`lead-${lead.id}`}
                  key={lead.id}
                  id={`lead-${lead.id}`}
                  draggable
                  onDragStart={(e) => handleDragStart(e as any, lead.id)}
                  onDragEnd={(e) => handleDragEnd(e as any, lead.id)}
                  onClick={() => onOpenLead?.(lead)}
                  className="bg-white p-4 rounded-xl shadow-xs border border-slate-200/80 cursor-pointer hover:border-slate-300 hover:shadow-md transition-all group"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-bold text-navy-900 text-sm group-hover:text-red-600 transition-colors">
                      {lead.name || 'Anonymous Customer'}
                    </h4>
                    {lead.priority === 'high' || lead.priority === 'urgent' ? (
                      <span className="text-[10px] uppercase font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded">
                        {lead.priority}
                      </span>
                    ) : null}
                  </div>

                  {lead.property?.title && (
                    <div className="flex items-center gap-2 mb-2 p-2 bg-slate-50 rounded-lg border border-slate-100">
                      {lead.property.images?.[0] && (
                        <img
                          src={lead.property.images[0]}
                          alt=""
                          className="w-7 h-7 rounded object-cover shrink-0"
                        />
                      )}
                      <p className="text-xs font-semibold text-navy-900 truncate">
                        {lead.property.title}
                      </p>
                    </div>
                  )}

                  <div className="space-y-1.5 mb-3">
                    {lead.phone && (
                      <div className="text-xs text-slate-600 flex items-center gap-1.5 font-medium">
                        <Phone className="h-3 w-3 text-slate-400" /> {lead.phone}
                      </div>
                    )}
                    {lead.email && (
                      <div className="text-xs text-slate-500 flex items-center gap-1.5 truncate">
                        <Mail className="h-3 w-3 text-slate-400 shrink-0" /> {lead.email}
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex justify-between items-center text-xs">
                    <div className="text-slate-400 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDate(lead.created_at)}
                    </div>
                    {lead.follow_up_at && (
                      <div className="text-orange-600 flex items-center gap-1 font-medium bg-orange-50 px-1.5 py-0.5 rounded">
                        <Calendar className="h-3 w-3" />
                        Follow up
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}

              {stageLeads.length === 0 && (
                <div className="h-24 border-2 border-dashed border-slate-200 rounded-xl flex items-center justify-center text-slate-300 text-xs font-medium">
                  Drop leads here
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
