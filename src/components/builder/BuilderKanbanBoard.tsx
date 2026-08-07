import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Building2, Phone, Mail, Clock, Calendar } from 'lucide-react';
import { formatDate } from '../../lib/utils';
import { Badge } from '../ui';

export const PIPELINE_STAGES = [
  { id: 'new', label: 'New Lead', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { id: 'contacted', label: 'Contacted', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  { id: 'site_visit', label: 'Site Visit', color: 'bg-purple-100 text-purple-700 border-purple-200' },
  { id: 'negotiation', label: 'Negotiation', color: 'bg-orange-100 text-orange-700 border-orange-200' },
  { id: 'won', label: 'Closed Won', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' }
] as const;

type BuilderLead = any;

interface BuilderKanbanBoardProps {
  leads: BuilderLead[];
  onUpdateStatus: (id: string, newStatus: string) => void;
}

export function BuilderKanbanBoard({ leads, onUpdateStatus }: BuilderKanbanBoardProps) {
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);

  const leadsByStage = useMemo(() => {
    const grouped: Record<string, BuilderLead[]> = {};
    PIPELINE_STAGES.forEach(s => grouped[s.id] = []);
    
    leads.forEach(lead => {
      const status = lead.status;
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
    <div className="flex gap-4 overflow-x-auto pb-4 h-[calc(100vh-280px)] min-h-[600px] snap-x">
      {PIPELINE_STAGES.map((stage) => {
        const stageLeads = leadsByStage[stage.id] || [];
        
        return (
          <div 
            key={stage.id}
            className="flex-shrink-0 w-80 bg-gray-50 rounded-xl border border-gray-200 flex flex-col snap-start"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, stage.id)}
          >
            <div className="p-4 border-b border-gray-200 bg-white rounded-t-xl flex justify-between items-center sticky top-0 z-10 shadow-sm">
              <h3 className="font-semibold text-navy-900 flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${stage.color.split(' ')[0]}`}></span>
                {stage.label}
              </h3>
              <Badge variant="secondary" className="font-mono text-xs">
                {stageLeads.length}
              </Badge>
            </div>
            
            <div className="p-3 flex-1 overflow-y-auto space-y-3">
              {stageLeads.map((lead) => (
                <motion.div
                  layoutId={`blead-${lead.id}`}
                  key={lead.id}
                  id={`blead-${lead.id}`}
                  draggable
                  onDragStart={(e) => handleDragStart(e as any, lead.id)}
                  onDragEnd={(e) => handleDragEnd(e as any, lead.id)}
                  className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 cursor-grab active:cursor-grabbing hover:border-primary-300 hover:shadow-md transition group"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-bold text-navy-900 text-sm">{lead.name}</h4>
                  </div>
                  
                  {lead.builder_projects?.name && (
                    <div className="text-xs text-primary-600 flex items-center gap-1 mb-2 font-medium line-clamp-1">
                      <Building2 className="h-3 w-3 flex-shrink-0" /> {lead.builder_projects.name}
                    </div>
                  )}
                  
                  <div className="space-y-1.5 mb-3">
                    {lead.phone && (
                      <a
                        href={`tel:${lead.phone}`}
                        className="text-xs text-navy-600 hover:text-navy-900 flex items-center gap-1.5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Phone className="h-3 w-3 text-navy-400" /> {lead.phone}
                      </a>
                    )}
                    {lead.email && (
                      <div className="text-xs text-navy-600 flex items-center gap-1.5 truncate">
                        <Mail className="h-3 w-3 text-navy-400 flex-shrink-0" /> {lead.email}
                      </div>
                    )}
                  </div>
                  
                  <div className="pt-3 border-t border-gray-100 flex justify-between items-center text-xs">
                    <div className="text-navy-400 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDate(lead.created_at).split(',')[0]}
                    </div>
                  </div>
                </motion.div>
              ))}
              
              {stageLeads.length === 0 && (
                <div className="h-24 border-2 border-dashed border-gray-200 rounded-lg flex items-center justify-center text-navy-300 text-sm font-medium">
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
