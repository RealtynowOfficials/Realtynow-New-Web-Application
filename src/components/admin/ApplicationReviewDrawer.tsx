import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useToast } from '../toast';
import { Modal, Button, Badge, Textarea } from '../ui';
import { 
  CheckCircle2, XCircle, Clock, FileText, User, 
  Building2, Phone, Mail, MapPin, Award, BadgeCheck, AlertCircle
} from 'lucide-react';
import { formatDate } from '../../lib/utils';
import type { AgentApplication, BuilderApplication } from '../../lib/types';

interface ApplicationReviewDrawerProps {
  open: boolean;
  onClose: () => void;
  application: AgentApplication | BuilderApplication | null;
  type: 'agent' | 'builder';
}

const STAGES = [
  'submitted',
  'pending_review',
  'document_verification',
  'identity_verification',
  'rera_verification',
  'background_verification',
  'final_review',
  'approved',
  'rejected'
];

export function ApplicationReviewDrawer({ open, onClose, application, type }: ApplicationReviewDrawerProps) {
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  
  const [rejectReason, setRejectReason] = useState('');
  const [remarks, setRemarks] = useState('');
  const [showReject, setShowReject] = useState(false);

  const actionMutation = useMutation({
    mutationFn: async (payload: { action: 'approve' | 'reject' | 'stage_change'; new_stage?: string; remarks?: string }) => {
      if (!application) return;
      const { data, error } = await supabase.functions.invoke('process-application', {
        body: {
          application_id: application.id,
          type,
          ...payload
        }
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (_, payload) => {
      queryClient.invalidateQueries({ queryKey: [`admin-${type}-applications`] });
      addToast('success', `Application updated successfully!`);
      if (payload.action === 'approve' || payload.action === 'reject') {
        onClose();
      }
    },
    onError: (e: any) => addToast('error', e.message || 'Action failed'),
  });

  if (!application) return null;

  const currentStageIdx = STAGES.indexOf(application.status || 'pending_review');
  const isAgent = type === 'agent';
  const agentApp = application as AgentApplication;
  const builderApp = application as BuilderApplication;

  const title = isAgent ? `${agentApp.first_name} ${agentApp.last_name}` : builderApp.company_name;
  
  const nextStage = () => {
    if (currentStageIdx < STAGES.length - 3) {
      actionMutation.mutate({ 
        action: 'stage_change', 
        new_stage: STAGES[currentStageIdx + 1],
        remarks: 'Moved to next verification stage.'
      });
    }
  };

  const handleApprove = () => {
    actionMutation.mutate({ action: 'approve', remarks: 'Approved after final review.' });
  };

  const handleReject = () => {
    if (!rejectReason.trim()) {
      addToast('error', 'Rejection reason is required.');
      return;
    }
    actionMutation.mutate({ action: 'reject', remarks: rejectReason });
  };

  const isFinalReview = application.status === 'final_review';
  const isTerminal = application.status === 'approved' || application.status === 'rejected';

  return (
    <Modal open={open} onClose={onClose} title={`Review: ${title}`} size="xl">
      <div className="grid grid-cols-3 gap-6">
        
        {/* Left Col: Info */}
        <div className="col-span-2 space-y-6">
          <div className="bg-white rounded-xl border border-navy-100 p-5">
            <h3 className="font-semibold text-navy-900 mb-4 flex items-center gap-2">
              <User className="h-5 w-5 text-navy-400" /> General Information
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <InfoBox icon={Mail} label="Email" value={application.email} />
              <InfoBox icon={Phone} label="Phone" value={application.phone} />
              {isAgent ? (
                <>
                  <InfoBox icon={Award} label="Specialization" value={agentApp.specialization} />
                  <InfoBox icon={Clock} label="Experience" value={agentApp.experience_years ? `${agentApp.experience_years} yrs` : null} />
                  <InfoBox icon={BadgeCheck} label="RERA" value={agentApp.license_number} />
                  <InfoBox icon={MapPin} label="Areas" value={agentApp.assigned_areas?.join(', ')} />
                </>
              ) : (
                <>
                  <InfoBox icon={User} label="Contact Person" value={builderApp.contact_name} />
                  <InfoBox icon={MapPin} label="City" value={builderApp.city} />
                  <InfoBox icon={BadgeCheck} label="GST No" value={builderApp.gst_number} />
                  <InfoBox icon={Award} label="RERA No" value={builderApp.rera_number} />
                </>
              )}
            </div>
            
            {(isAgent ? agentApp.bio : builderApp.description) && (
               <div className="mt-4 p-3 bg-navy-50 rounded-lg">
                 <p className="text-xs text-navy-500 font-medium mb-1">Description / Bio</p>
                 <p className="text-sm text-navy-800">{isAgent ? agentApp.bio : builderApp.description}</p>
               </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-navy-100 p-5">
            <h3 className="font-semibold text-navy-900 mb-4 flex items-center gap-2">
              <FileText className="h-5 w-5 text-navy-400" /> Documents
            </h3>
            <div className="flex flex-wrap gap-3">
              {isAgent ? (
                <>
                  <DocLink url={agentApp.id_doc_url} label="Govt ID" />
                  <DocLink url={agentApp.license_doc_url} label="License/RERA" />
                </>
              ) : (
                <>
                  <DocLink url={builderApp.gst_doc_url} label="GST Cert" />
                  <DocLink url={builderApp.rera_doc_url} label="RERA Cert" />
                  <DocLink url={builderApp.pan_doc_url} label="PAN Card" />
                </>
              )}
              {!agentApp.id_doc_url && !builderApp.gst_doc_url && (
                <span className="text-sm text-navy-400">No documents uploaded.</span>
              )}
            </div>
          </div>
        </div>

        {/* Right Col: Timeline & Actions */}
        <div className="col-span-1 space-y-6">
          <div className="bg-white rounded-xl border border-navy-100 p-5">
            <h3 className="font-semibold text-navy-900 mb-4 flex items-center gap-2">
              <Clock className="h-5 w-5 text-navy-400" /> Verification Status
            </h3>
            
            <div className="space-y-4 relative before:absolute before:inset-0 before:ml-2 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-navy-100 before:to-transparent">
              {STAGES.map((stage, idx) => {
                const isPast = idx < currentStageIdx;
                const isCurrent = idx === currentStageIdx;
                if(stage === 'rejected' && application.status !== 'rejected') return null;
                
                return (
                  <div key={stage} className={`relative flex items-center gap-3 ${isPast ? 'opacity-50' : ''}`}>
                    <div className={`z-10 h-4 w-4 rounded-full flex-shrink-0 border-2 ${
                      isPast ? 'bg-success-500 border-success-500' : 
                      isCurrent ? 'bg-gold-500 border-gold-500 shadow-[0_0_0_3px_rgba(212,175,55,0.2)]' : 
                      'bg-white border-navy-200'
                    }`} />
                    <span className={`text-sm font-medium ${isCurrent ? 'text-navy-900' : 'text-navy-500'}`}>
                      {stage.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </span>
                  </div>
                )
              })}
            </div>

            {!isTerminal && (
              <div className="mt-8 space-y-3">
                {isFinalReview ? (
                  <>
                    <Button 
                      className="w-full" 
                      variant="primary" 
                      onClick={handleApprove}
                      loading={actionMutation.isPending && actionMutation.variables?.action === 'approve'}
                    >
                      Approve & Create Account
                    </Button>
                    <Button 
                      className="w-full" 
                      variant="danger" 
                      onClick={() => setShowReject(true)}
                    >
                      Reject
                    </Button>
                  </>
                ) : (
                  <>
                    <Button 
                      className="w-full" 
                      variant="secondary" 
                      onClick={nextStage}
                      loading={actionMutation.isPending && actionMutation.variables?.action === 'stage_change'}
                    >
                      Mark as Verified & Next
                    </Button>
                    <Button 
                      className="w-full text-error-600 hover:text-error-700 bg-error-50 hover:bg-error-100" 
                      variant="ghost" 
                      onClick={() => setShowReject(true)}
                    >
                      Reject Early
                    </Button>
                  </>
                )}
              </div>
            )}

            {showReject && !isTerminal && (
              <div className="mt-4 p-4 bg-error-50 rounded-lg border border-error-100">
                <label className="text-xs font-medium text-error-900 mb-1 block">Reason for Rejection</label>
                <Textarea 
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="E.g. Document mismatch..."
                  rows={2}
                  className="mb-2 text-sm bg-white border-error-200"
                />
                <div className="flex gap-2">
                  <Button size="sm" variant="danger" onClick={handleReject} loading={actionMutation.isPending && actionMutation.variables?.action === 'reject'}>Confirm</Button>
                  <Button size="sm" variant="ghost" onClick={() => setShowReject(false)}>Cancel</Button>
                </div>
              </div>
            )}
            
            {application.status === 'rejected' && (
              <div className="mt-4 p-3 bg-error-50 text-error-700 text-sm rounded-lg border border-error-100 flex gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold block">Rejected</span>
                  {application.rejection_reason || 'No reason provided.'}
                </div>
              </div>
            )}
            
            {application.status === 'approved' && (
              <div className="mt-4 p-3 bg-success-50 text-success-700 text-sm rounded-lg border border-success-100 flex gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold block">Approved</span>
                  Account provisioned successfully.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}

function InfoBox({ icon: Icon, label, value }: { icon: any, label: string, value: any }) {
  if (!value) return null;
  return (
    <div className="p-3 bg-navy-50/50 rounded-lg border border-navy-100/50">
      <p className="text-xs text-navy-400 flex items-center gap-1.5 mb-1">
        <Icon className="h-3.5 w-3.5" /> {label}
      </p>
      <p className="text-sm font-medium text-navy-900 truncate" title={value}>{value}</p>
    </div>
  );
}

function DocLink({ url, label }: { url?: string | null, label: string }) {
  if (!url) return null;
  return (
    <a 
      href={url} 
      target="_blank" 
      rel="noreferrer"
      className="flex items-center gap-2 px-3 py-2 bg-navy-50 hover:bg-navy-100 text-navy-700 text-sm font-medium rounded-lg border border-navy-200 transition-colors"
    >
      <FileText className="h-4 w-4 text-gold-500" /> {label}
    </a>
  );
}
