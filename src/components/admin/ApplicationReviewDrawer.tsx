import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useToast } from '../toast';
import { Modal, Button, Textarea } from '../ui';
import {
  CheckCircle2, XCircle, Clock, FileText, User,
  Building2, Phone, Mail, MapPin, Award, BadgeCheck, AlertCircle,
  ChevronRight, History, ShieldCheck, Eye, AlertTriangle,
  CheckSquare, Calendar, Globe, Briefcase,
} from 'lucide-react';
import { formatDate } from '../../lib/utils';
import type { AgentApplication, BuilderApplication } from '../../lib/types';
import { parseStorageUrl, getDocumentSignedUrl } from '../../lib/storage';

// ─── Types ────────────────────────────────────────────────────────────────────
export interface ApplicationReviewDrawerProps {
  open: boolean;
  onClose: () => void;
  application: AgentApplication | BuilderApplication | null;
  type: 'agent' | 'builder';
}

interface ActivityLog {
  id: string;
  action: string;
  details: string | null;
  created_at: string;
}

// ─── Stage configs per type ───────────────────────────────────────────────────
const AGENT_STAGES = [
  'submitted',
  'pending_review',
  'document_verification',
  'identity_verification',
  'rera_verification',
  'background_verification',
  'final_review',
  'approved',
] as const;

const BUILDER_STAGES = [
  'submitted',
  'pending_review',
  'document_verification',
  'company_verification',
  'rera_verification',
  'project_verification',
  'background_verification',
  'final_review',
  'approved',
] as const;

export const STAGE_LABELS: Record<string, string> = {
  submitted: 'Submitted',
  pending_review: 'Pending Review',
  document_verification: 'Document Verification',
  identity_verification: 'Identity Verification',
  company_verification: 'Company Verification',
  rera_verification: 'RERA Verification',
  project_verification: 'Project Verification',
  background_verification: 'Background Verification',
  final_review: 'Final Review',
  approved: 'Approved',
  rejected: 'Rejected',
  changes_requested: 'Changes Requested',
};

const AGENT_NEXT_BUTTON: Record<string, string> = {
  submitted: 'Start Review',
  pending_review: 'Mark as Reviewed & Next',
  document_verification: 'Verify Documents & Next',
  identity_verification: 'Verify Identity & Next',
  rera_verification: 'Verify RERA & Next',
  background_verification: 'Complete Background Check & Next',
  final_review: 'Approve Application',
};

const BUILDER_NEXT_BUTTON: Record<string, string> = {
  submitted: 'Start Review',
  pending_review: 'Mark as Reviewed & Next',
  document_verification: 'Verify Documents & Next',
  company_verification: 'Verify Company & Next',
  rera_verification: 'Verify RERA & Next',
  project_verification: 'Verify Projects & Next',
  background_verification: 'Complete Background Check & Next',
  final_review: 'Approve Builder',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getStageIndex(stages: readonly string[], status: string): number {
  const idx = stages.indexOf(status as any);
  return idx === -1 ? 0 : idx;
}

function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

// ─── Shared UI primitives ─────────────────────────────────────────────────────
export function InfoBox({ icon: Icon, label, value }: { icon: any; label: string; value: any }) {
  if (!value) return null;
  return (
    <div className="p-3 bg-navy-50/50 rounded-lg border border-navy-100/50">
      <p className="text-xs text-navy-400 flex items-center gap-1.5 mb-1">
        <Icon className="h-3.5 w-3.5" /> {label}
      </p>
      <p className="text-sm font-medium text-navy-900 break-all" title={value}>{value}</p>
    </div>
  );
}

export function DocLink({ url, bucket, label }: { url?: string | null; bucket: string; label: string }) {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  if (!url) return null;

  const handleOpen = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      let freshUrl = url;
      const parsed = parseStorageUrl(url);

      if (parsed) {
        const { url: newUrl, error } = await getDocumentSignedUrl(parsed.bucket, parsed.path, 600);
        if (error || !newUrl) {
           setErrorMsg('Document file is no longer available. Please ask the user to re-upload.');
           setLoading(false);
           return;
        }
        freshUrl = newUrl;
      } else if (!url.startsWith('http')) {
        const { url: newUrl, error } = await getDocumentSignedUrl(bucket, url, 600);
        if (error || !newUrl) {
           setErrorMsg('Document file is no longer available. Please ask the user to re-upload.');
           setLoading(false);
           return;
        }
        freshUrl = newUrl;
      }

      setPreviewUrl(freshUrl);
      
    } catch (err) {
      console.error(err);
      setErrorMsg('Document preview failed.');
    } finally {
      setLoading(false);
    }
  };

  const isPdf = previewUrl?.toLowerCase().split('?')[0].endsWith('.pdf');
  const isImage = previewUrl && /\.(jpg|jpeg|png|webp|heic|gif)/i.test(previewUrl.split('?')[0]);

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        disabled={loading}
        className="flex items-center gap-2 px-3 py-2 bg-white hover:bg-navy-50 text-navy-700 text-sm font-medium rounded-lg border border-navy-200 transition-colors disabled:opacity-60 w-full"
      >
        <FileText className="h-4 w-4 text-gold-500 shrink-0" />
        <span className="truncate">{loading ? 'Opening document...' : label}</span>
        <Eye className="h-3.5 w-3.5 ml-auto text-navy-400" />
      </button>
      
      {errorMsg && (
        <div className="flex flex-col gap-1 mt-2 p-2 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-xs text-error-700">{errorMsg}</p>
          <button onClick={handleOpen} className="text-xs font-semibold text-error-700 self-start hover:underline">
            Try Again
          </button>
        </div>
      )}

      {/* Preview Modal */}
      <Modal 
        open={!!previewUrl} 
        onClose={() => setPreviewUrl(null)} 
        title={label} 
        size="xl"
        footer={
          <>
            <Button variant="ghost" onClick={() => setPreviewUrl(null)}>Close</Button>
            {previewUrl && (
              <>
                <Button variant="secondary" onClick={() => window.open(previewUrl, '_blank', 'noreferrer')}>
                  Open in New Tab
                </Button>
                <Button variant="primary" onClick={() => {
                  const a = document.createElement('a');
                  a.href = previewUrl;
                  a.download = label;
                  a.target = '_blank';
                  a.click();
                }}>
                  Download
                </Button>
              </>
            )}
          </>
        }
      >
        <div className="flex flex-col items-center justify-center min-h-[400px] bg-navy-50 rounded-xl overflow-hidden relative">
          {previewUrl && (
            <>
              {isPdf ? (
                <iframe src={previewUrl} className="w-full h-[70vh]" title={label} />
              ) : isImage ? (
                <img 
                  src={previewUrl} 
                  alt={label} 
                  className="max-w-full max-h-[70vh] object-contain" 
                  onError={() => {
                    if (retryCount === 0) {
                      setRetryCount(1);
                      handleOpen();
                    } else {
                      setErrorMsg('Unable to open this document. Please try again.');
                      setPreviewUrl(null);
                      setRetryCount(0);
                    }
                  }}
                  onLoad={() => setRetryCount(0)}
                />
              ) : (
                <div className="text-center p-6">
                  <FileText className="h-16 w-16 text-navy-300 mx-auto mb-4" />
                  <p className="text-navy-600 mb-4">Preview is not available for this file type.</p>
                </div>
              )}
            </>
          )}
        </div>
      </Modal>
    </>
  );
}

// ─── Vertical Stepper ─────────────────────────────────────────────────────────
function VerificationStepper({
  stages,
  currentStatus,
  selectedStep,
  onSelectStep,
}: {
  stages: readonly string[];
  currentStatus: string;
  selectedStep: string;
  onSelectStep: (stage: string) => void;
}) {
  const isRejected = currentStatus === 'rejected';
  const currentIdx = getStageIndex(stages, currentStatus);

  return (
    <div className="space-y-1">
      <h3 className="text-xs font-semibold text-navy-500 uppercase tracking-wider mb-3">
        Verification Progress
      </h3>
      <div className="relative">
        <div className="absolute left-3.5 top-4 bottom-4 w-0.5 bg-navy-100" />
        <div className="space-y-1.5 relative">
          {stages.map((stage, idx) => {
            const isPast    = idx < currentIdx;
            const isCurrent = stage === currentStatus && !isRejected;
            const isUpcoming = idx > currentIdx && !isRejected;
            const isSelected = stage === selectedStep;

            let dotClass = 'bg-white border-2 border-navy-200';
            let dotContent = null;
            let textClass = 'text-navy-400';
            let isClickable = !isUpcoming;

            if (isPast) {
              dotClass = 'bg-success-500 border-success-500';
              dotContent = <CheckCircle2 className="h-3.5 w-3.5 text-white" />;
              textClass = 'text-navy-600';
            } else if (isCurrent) {
              dotClass = 'bg-red-600 border-red-600 shadow-[0_0_0_3px_rgba(220,38,38,0.2)]';
              dotContent = <div className="h-2 w-2 rounded-full bg-white" />;
              textClass = 'text-navy-900 font-semibold';
            }

            return (
              <button
                key={stage}
                type="button"
                disabled={isUpcoming}
                onClick={() => isClickable && onSelectStep(stage)}
                className={cn(
                  'flex items-center gap-2.5 w-full text-left px-1 py-1.5 rounded-lg transition-colors',
                  isSelected && 'bg-navy-50',
                  isClickable && !isSelected && 'hover:bg-navy-50',
                  isUpcoming && 'opacity-40 cursor-not-allowed',
                )}
              >
                <div className={cn('z-10 h-7 w-7 rounded-full flex items-center justify-center shrink-0 transition-all', dotClass)}>
                  {dotContent ?? <span className="text-[10px] font-bold text-navy-300">{idx + 1}</span>}
                </div>
                <span className={cn('text-xs transition-colors leading-snug', textClass, isSelected && 'text-navy-900 font-semibold')}>
                  {STAGE_LABELS[stage] ?? stage}
                </span>
                {isCurrent && (
                  <span className="ml-auto text-[10px] font-semibold text-red-600 bg-red-50 px-1.5 py-0.5 rounded-full border border-red-100 shrink-0">
                    Now
                  </span>
                )}
              </button>
            );
          })}

          {isRejected && (
            <div className="flex items-center gap-2.5 px-1 py-1.5">
              <div className="z-10 h-7 w-7 rounded-full flex items-center justify-center shrink-0 bg-red-500">
                <XCircle className="h-3.5 w-3.5 text-white" />
              </div>
              <span className="text-xs text-red-600 font-semibold">Rejected</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Verification History ─────────────────────────────────────────────────────
function VerificationHistory({ applicationId }: { applicationId: string }) {
  const { data: logs, isLoading } = useQuery({
    queryKey: ['app-activity-logs', applicationId],
    queryFn: async () => {
      const { data } = await supabase
        .from('application_activity_logs')
        .select('id, action, details, created_at')
        .eq('application_id', applicationId)
        .order('created_at', { ascending: false });
      return (data ?? []) as ActivityLog[];
    },
  });

  if (isLoading) return <div className="text-xs text-navy-400 py-2">Loading history…</div>;
  if (!logs?.length) return <div className="text-xs text-navy-400 py-2">No activity recorded yet.</div>;

  return (
    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
      {logs.map((log) => (
        <div key={log.id} className="flex gap-3 text-xs">
          <div className="h-2 w-2 rounded-full bg-navy-300 mt-1.5 shrink-0" />
          <div>
            <p className="font-medium text-navy-700">{log.action}</p>
            {log.details && <p className="text-navy-400">{log.details}</p>}
            <p className="text-navy-300 mt-0.5">{formatDate(log.created_at)}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Agent step panels ────────────────────────────────────────────────────────
function AgentStepContent({ stage, app }: { stage: string; app: AgentApplication }) {
  switch (stage) {
    case 'submitted':
      return (
        <div className="space-y-4">
          <div className="p-4 bg-success-50 border border-success-200 rounded-xl flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-success-600 shrink-0" />
            <div>
              <p className="font-semibold text-success-800 text-sm">Application Received</p>
              <p className="text-xs text-success-600">Submitted on {formatDate(app.created_at)}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <InfoBox icon={User} label="Applicant Name" value={`${app.first_name} ${app.last_name}`} />
            <InfoBox icon={Mail} label="Email" value={app.email} />
            <InfoBox icon={Phone} label="Mobile" value={app.phone} />
            <InfoBox icon={Calendar} label="Applied Date" value={formatDate(app.created_at)} />
            <div className="col-span-2 p-3 bg-navy-50 rounded-lg border border-navy-100">
              <p className="text-xs text-navy-400 mb-1">Application ID</p>
              <p className="text-xs font-mono text-navy-600 break-all">{app.id}</p>
            </div>
          </div>
        </div>
      );

    case 'pending_review':
      return (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-navy-900 flex items-center gap-2"><User className="h-4 w-4 text-navy-400" /> General Information</h4>
          <div className="grid grid-cols-2 gap-3">
            <InfoBox icon={Mail} label="Email" value={app.email} />
            <InfoBox icon={Phone} label="Phone" value={app.phone} />
            <InfoBox icon={Award} label="Specialization" value={app.specialization} />
            <InfoBox icon={Clock} label="Experience" value={app.experience_years ? `${app.experience_years} yrs` : null} />
            <InfoBox icon={BadgeCheck} label="RERA / License No." value={app.license_number} />
            <InfoBox icon={MapPin} label="Service Areas" value={app.assigned_areas?.join(', ')} />
            {app.bio && (
              <div className="col-span-2 p-3 bg-navy-50 rounded-lg border border-navy-100">
                <p className="text-xs text-navy-400 mb-1">Bio / Description</p>
                <p className="text-sm text-navy-800">{app.bio}</p>
              </div>
            )}
          </div>
        </div>
      );

    case 'document_verification':
      return (
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-navy-900 flex items-center gap-2"><FileText className="h-4 w-4 text-navy-400" /> Submitted Documents</h4>
          {!app.id_doc_url && !app.license_doc_url ? (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
              <p className="text-sm text-amber-800">No documents uploaded by the applicant.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {app.id_doc_url && <div className="p-3 bg-white border border-navy-100 rounded-xl"><DocLink url={app.id_doc_url} bucket="agent-documents" label="Govt ID / Aadhaar" /></div>}
              {app.license_doc_url && <div className="p-3 bg-white border border-navy-100 rounded-xl"><DocLink url={app.license_doc_url} bucket="agent-documents" label="License / RERA Certificate" /></div>}
            </div>
          )}
        </div>
      );

    case 'identity_verification':
      return (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-navy-900 flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-navy-400" /> Identity Verification</h4>
          <p className="text-xs text-navy-500">Verify the applicant's identity matches the submitted documents.</p>
          <div className="grid grid-cols-2 gap-3">
            <InfoBox icon={User} label="Full Name" value={`${app.first_name} ${app.last_name}`} />
            <InfoBox icon={Phone} label="Phone" value={app.phone} />
            <InfoBox icon={Mail} label="Email" value={app.email} />
            <InfoBox icon={BadgeCheck} label="License / RERA No." value={app.license_number} />
          </div>
          {app.id_doc_url && <div className="p-3 bg-white border border-navy-100 rounded-xl"><DocLink url={app.id_doc_url} bucket="agent-documents" label="View Government ID" /></div>}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-700">
            ✓ Confirm name, phone, email match the submitted ID document before proceeding.
          </div>
        </div>
      );

    case 'rera_verification': {
      const hasRera = !!app.license_number;
      return (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-navy-900 flex items-center gap-2"><BadgeCheck className="h-4 w-4 text-navy-400" /> RERA Verification</h4>
          {hasRera ? (
            <>
              <InfoBox icon={BadgeCheck} label="RERA / License Number" value={app.license_number} />
              {app.license_doc_url && <div className="p-3 bg-white border border-navy-100 rounded-xl"><DocLink url={app.license_doc_url} bucket="agent-documents" label="View RERA Certificate" /></div>}
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-700">
                ✓ Cross-check the RERA number with the official RERA portal before marking as verified.
              </div>
            </>
          ) : (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-amber-800">No RERA Information Provided</p>
                <p className="text-xs text-amber-600">Applicant has not submitted a RERA license number. Determine if RERA is applicable.</p>
              </div>
            </div>
          )}
        </div>
      );
    }

    case 'background_verification':
      return (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-navy-900 flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-navy-400" /> Background Verification</h4>
          <p className="text-xs text-navy-500">Complete all background checks before proceeding.</p>
          <div className="space-y-2">
            {['Criminal record check completed', 'Employment history verified', 'Professional references checked', 'No adverse findings'].map((c) => (
              <div key={c} className="flex items-center gap-2 p-2.5 bg-navy-50 rounded-lg border border-navy-100">
                <CheckSquare className="h-4 w-4 text-navy-400 shrink-0" />
                <span className="text-sm text-navy-700">{c}</span>
              </div>
            ))}
          </div>
        </div>
      );

    case 'final_review': {
      const allStages = AGENT_STAGES.slice(1, -1);
      return (
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-navy-900 flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-success-500" /> Final Review Summary</h4>
          <div className="space-y-2">
            {allStages.map((s) => (
              <div key={s} className="flex items-center gap-3 p-3 bg-success-50 border border-success-200 rounded-xl">
                <CheckCircle2 className="h-4 w-4 text-success-600 shrink-0" />
                <span className="text-sm font-medium text-success-800">{STAGE_LABELS[s]}</span>
                <span className="ml-auto text-xs text-success-600 font-semibold">✓ Verified</span>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-navy-100">
            <InfoBox icon={User} label="Applicant" value={`${app.first_name} ${app.last_name}`} />
            <InfoBox icon={Mail} label="Email" value={app.email} />
            <InfoBox icon={Phone} label="Phone" value={app.phone} />
            <InfoBox icon={Award} label="Specialization" value={app.specialization} />
          </div>
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
            ⚠ Approving will provision an Agent Portal account linked to the registered mobile number ({app.phone}).
          </div>
        </div>
      );
    }

    case 'approved':
      return (
        <div className="space-y-4">
          <div className="p-5 bg-success-50 border border-success-200 rounded-xl text-center">
            <CheckCircle2 className="h-10 w-10 text-success-600 mx-auto mb-2" />
            <p className="font-bold text-success-800 text-lg">Application Approved</p>
            <p className="text-xs text-success-600 mt-1">{app.reviewed_at ? `Approved on ${formatDate(app.reviewed_at)}` : 'Approval complete'}</p>
          </div>
          <div className="p-3 bg-success-50 border border-success-200 rounded-xl flex items-center gap-3">
            <ShieldCheck className="h-5 w-5 text-success-600 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-success-800">Agent Portal Access Enabled</p>
              <p className="text-xs text-success-600">Login via OTP on: {app.phone}</p>
            </div>
          </div>
        </div>
      );

    default:
      return null;
  }
}

// ─── Builder step panels ──────────────────────────────────────────────────────
function BuilderStepContent({ stage, app }: { stage: string; app: BuilderApplication }) {
  switch (stage) {
    case 'submitted':
      return (
        <div className="space-y-4">
          <div className="p-4 bg-success-50 border border-success-200 rounded-xl flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-success-600 shrink-0" />
            <div>
              <p className="font-semibold text-success-800 text-sm">Builder Application Received</p>
              <p className="text-xs text-success-600">Submitted on {formatDate(app.created_at)}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <InfoBox icon={Building2} label="Company Name" value={app.company_name} />
            <InfoBox icon={User} label="Contact Person" value={app.contact_name} />
            <InfoBox icon={Mail} label="Email" value={app.email} />
            <InfoBox icon={Phone} label="Mobile" value={app.phone} />
            <InfoBox icon={MapPin} label="City" value={app.city} />
            <InfoBox icon={Calendar} label="Applied Date" value={formatDate(app.created_at)} />
            <div className="col-span-2 p-3 bg-navy-50 rounded-lg border border-navy-100">
              <p className="text-xs text-navy-400 mb-1">Application ID</p>
              <p className="text-xs font-mono text-navy-600 break-all">{app.id}</p>
            </div>
          </div>
        </div>
      );

    case 'pending_review':
      return (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-navy-900 flex items-center gap-2"><Building2 className="h-4 w-4 text-navy-400" /> Builder Information</h4>
          <div className="grid grid-cols-2 gap-3">
            <InfoBox icon={Building2} label="Company Name" value={app.company_name} />
            <InfoBox icon={User} label="Contact Person" value={app.contact_name} />
            <InfoBox icon={Mail} label="Email" value={app.email} />
            <InfoBox icon={Phone} label="Phone" value={app.phone} />
            <InfoBox icon={MapPin} label="City" value={app.city} />
            <InfoBox icon={BadgeCheck} label="RERA Number" value={app.rera_number} />
            <InfoBox icon={Briefcase} label="GST Number" value={app.gst_number} />
            <InfoBox icon={Calendar} label="Established Year" value={app.established_year?.toString()} />
            {app.website_url && <InfoBox icon={Globe} label="Website" value={app.website_url} />}
            {app.description && (
              <div className="col-span-2 p-3 bg-navy-50 rounded-lg border border-navy-100">
                <p className="text-xs text-navy-400 mb-1">Company Description</p>
                <p className="text-sm text-navy-800">{app.description}</p>
              </div>
            )}
          </div>
        </div>
      );

    case 'document_verification': {
      const docs = [
        { url: app.gst_doc_url, label: 'GST Certificate' },
        { url: app.rera_doc_url, label: 'RERA Certificate' },
        { url: app.pan_doc_url, label: 'PAN Card' },
      ].filter((d) => d.url);
      return (
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-navy-900 flex items-center gap-2"><FileText className="h-4 w-4 text-navy-400" /> Builder Documents</h4>
          {docs.length === 0 ? (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
              <p className="text-sm text-amber-800">No documents uploaded by the builder.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {docs.map((doc) => (
                <div key={doc.label} className="p-3 bg-white border border-navy-100 rounded-xl">
                  <DocLink url={doc.url} bucket="builder-documents" label={doc.label} />
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    case 'company_verification':
      return (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-navy-900 flex items-center gap-2"><Briefcase className="h-4 w-4 text-navy-400" /> Company / Business Verification</h4>
          <p className="text-xs text-navy-500">Verify that the company identity, registration, and business information is valid.</p>
          <div className="grid grid-cols-2 gap-3">
            <InfoBox icon={Building2} label="Company Name" value={app.company_name} />
            <InfoBox icon={User} label="Contact Person" value={app.contact_name} />
            <InfoBox icon={Briefcase} label="GST Number" value={app.gst_number} />
            <InfoBox icon={MapPin} label="City / Location" value={app.city} />
            <InfoBox icon={Calendar} label="Established Year" value={app.established_year?.toString()} />
            {app.website_url && <InfoBox icon={Globe} label="Website" value={app.website_url} />}
          </div>
          {app.gst_doc_url && (
            <div className="p-3 bg-white border border-navy-100 rounded-xl">
              <p className="text-xs text-navy-500 mb-2 font-medium">GST / Registration Document</p>
              <DocLink url={app.gst_doc_url} bucket="builder-documents" label="View GST Certificate" />
            </div>
          )}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-700">
            ✓ Verify the company name on official MCA/GST portal before proceeding.
          </div>
        </div>
      );

    case 'rera_verification': {
      const hasRera = !!app.rera_number;
      return (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-navy-900 flex items-center gap-2"><BadgeCheck className="h-4 w-4 text-navy-400" /> RERA Verification</h4>
          {hasRera ? (
            <>
              <InfoBox icon={BadgeCheck} label="RERA Number" value={app.rera_number} />
              {app.rera_doc_url && (
                <div className="p-3 bg-white border border-navy-100 rounded-xl">
                  <DocLink url={app.rera_doc_url} bucket="builder-documents" label="View RERA Certificate" />
                </div>
              )}
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-700">
                ✓ Cross-check RERA registration with the state RERA portal before approving.
              </div>
            </>
          ) : (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-amber-800">No RERA Number Provided</p>
                <p className="text-xs text-amber-600">Determine if RERA registration is mandatory for this builder. If not applicable, note the reason.</p>
              </div>
            </div>
          )}
        </div>
      );
    }

    case 'project_verification':
      return (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-navy-900 flex items-center gap-2"><Building2 className="h-4 w-4 text-navy-400" /> Project / Builder Verification</h4>
          <p className="text-xs text-navy-500">Verify the builder's listed projects and portfolio information.</p>
          <div className="p-4 bg-navy-50 border border-navy-100 rounded-xl space-y-2">
            <p className="text-sm font-medium text-navy-700">Verification Checklist</p>
            {['Builder credentials verified', 'Company name matches RERA records', 'Project locations verified', 'No pending legal disputes found'].map((c) => (
              <div key={c} className="flex items-center gap-2 p-2 bg-white rounded-lg border border-navy-100">
                <CheckSquare className="h-4 w-4 text-navy-400 shrink-0" />
                <span className="text-sm text-navy-700">{c}</span>
              </div>
            ))}
          </div>
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-700">
            ✓ Check builder's project history and ensure listed projects are legitimate before proceeding.
          </div>
        </div>
      );

    case 'background_verification':
      return (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-navy-900 flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-navy-400" /> Background Verification</h4>
          <p className="text-xs text-navy-500">Complete all background checks for the builder and company.</p>
          <div className="space-y-2">
            {['Company criminal/legal record check', 'Director/promoter background verified', 'Financial health check completed', 'No active legal disputes', 'No RERA blacklist matches'].map((c) => (
              <div key={c} className="flex items-center gap-2 p-2.5 bg-navy-50 rounded-lg border border-navy-100">
                <CheckSquare className="h-4 w-4 text-navy-400 shrink-0" />
                <span className="text-sm text-navy-700">{c}</span>
              </div>
            ))}
          </div>
        </div>
      );

    case 'final_review': {
      const allStages = BUILDER_STAGES.slice(1, -1);
      return (
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-navy-900 flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-success-500" /> Final Review Summary</h4>
          <div className="space-y-2">
            {allStages.map((s) => (
              <div key={s} className="flex items-center gap-3 p-3 bg-success-50 border border-success-200 rounded-xl">
                <CheckCircle2 className="h-4 w-4 text-success-600 shrink-0" />
                <span className="text-sm font-medium text-success-800">{STAGE_LABELS[s]}</span>
                <span className="ml-auto text-xs text-success-600 font-semibold">✓ Verified</span>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-navy-100">
            <InfoBox icon={Building2} label="Company Name" value={app.company_name} />
            <InfoBox icon={User} label="Contact Person" value={app.contact_name} />
            <InfoBox icon={Mail} label="Email" value={app.email} />
            <InfoBox icon={Phone} label="Phone" value={app.phone} />
          </div>
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
            ⚠ Approving will provision a Builder Portal account linked to the registered mobile number ({app.phone}).
          </div>
        </div>
      );
    }

    case 'approved':
      return (
        <div className="space-y-4">
          <div className="p-5 bg-success-50 border border-success-200 rounded-xl text-center">
            <CheckCircle2 className="h-10 w-10 text-success-600 mx-auto mb-2" />
            <p className="font-bold text-success-800 text-lg">Builder Application Approved</p>
            <p className="text-xs text-success-600 mt-1">{app.reviewed_at ? `Approved on ${formatDate(app.reviewed_at)}` : 'Approval complete'}</p>
          </div>
          <div className="p-3 bg-success-50 border border-success-200 rounded-xl flex items-center gap-3">
            <ShieldCheck className="h-5 w-5 text-success-600 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-success-800">Builder Portal Access Enabled</p>
              <p className="text-xs text-success-600">{app.company_name} — Login via OTP on: {app.phone}</p>
            </div>
          </div>
        </div>
      );

    default:
      return null;
  }
}

// ─── Main Drawer ──────────────────────────────────────────────────────────────
export function ApplicationReviewDrawer({
  open,
  onClose,
  application,
  type,
}: ApplicationReviewDrawerProps) {
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  const isAgent = type === 'agent';
  const stages = isAgent ? AGENT_STAGES : BUILDER_STAGES;
  const nextButtonLabels = isAgent ? AGENT_NEXT_BUTTON : BUILDER_NEXT_BUTTON;

  const currentStatus = application?.status || 'pending_review';
  const currentIdx = getStageIndex(stages, currentStatus);
  const isTerminal = currentStatus === 'approved' || currentStatus === 'rejected';

  const [selectedStep, setSelectedStep] = useState(currentStatus);
  const [showReject, setShowReject] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [notes, setNotes] = useState('');
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    if (open && application) {
      setSelectedStep(application.status || 'pending_review');
      setShowReject(false);
      setRejectReason('');
      setNotes('');
      setShowHistory(false);
    }
  }, [open, application?.status]);

  // ── Mutation ────────────────────────────────────────────────────────────────
  const actionMutation = useMutation({
    mutationFn: async (payload: {
      action: 'approve' | 'reject' | 'stage_change';
      new_stage?: string;
      remarks?: string;
    }) => {
      if (!application) return;
      const { data, error } = await supabase.functions.invoke('process-application', {
        body: { application_id: application.id, type, ...payload },
      });
      if (error) {
        console.error('Edge Function error:', error);
        const msg = error.message?.toLowerCase() || '';
        if (msg.includes('failed to send') || msg.includes('fetch')) {
          throw new Error('Unable to connect to the verification service. Please check your connection.');
        }
        throw new Error(error.message || 'Verification failed. Please try again.');
      }
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (_, payload) => {
      queryClient.invalidateQueries({ queryKey: [`admin-${type}-applications`] });
      queryClient.invalidateQueries({ queryKey: ['app-activity-logs', application?.id] });
      if (payload.action === 'approve') {
        addToast('success', `${isAgent ? 'Agent' : 'Builder'} application approved. Portal access provisioned.`);
        onClose();
      } else if (payload.action === 'reject') {
        addToast('success', 'Application rejected.');
        onClose();
      } else if (payload.action === 'stage_change' && payload.new_stage) {
        const label = STAGE_LABELS[payload.new_stage] ?? payload.new_stage;
        addToast('success', `Verification completed. Moved to ${label}.`);
        setSelectedStep(payload.new_stage);
        setNotes('');
      }
    },
    onError: (e: any) => {
      console.error('Application action error:', e);
      addToast('error', e.message || 'Verification failed. Please try again.');
    },
  });

  if (!application) return null;

  const title = isAgent
    ? `${(application as AgentApplication).first_name} ${(application as AgentApplication).last_name}`
    : (application as BuilderApplication).company_name;

  const handleNextStage = () => {
    const nextIdx = currentIdx + 1;
    if (nextIdx >= stages.length) return;
    const nextStage = stages[nextIdx];
    if (nextStage === 'approved') {
      actionMutation.mutate({ action: 'approve', remarks: notes || 'Approved after final review.' });
    } else {
      actionMutation.mutate({ action: 'stage_change', new_stage: nextStage, remarks: notes || `Advanced to ${STAGE_LABELS[nextStage]}` });
    }
  };

  const handleReject = () => {
    if (!rejectReason.trim()) { addToast('error', 'Rejection reason is required.'); return; }
    actionMutation.mutate({ action: 'reject', remarks: rejectReason });
  };

  const isViewingCurrentStep = selectedStep === currentStatus;
  const canAdvance = !isTerminal && isViewingCurrentStep && currentIdx < stages.length - 1;

  const renderStepContent = () => {
    if (currentStatus === 'rejected') {
      return (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
          <XCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-red-800">Application Rejected</p>
            <p className="text-sm text-red-600 mt-1">{application.rejection_reason || 'No reason provided.'}</p>
          </div>
        </div>
      );
    }
    if (isAgent) {
      return <AgentStepContent stage={selectedStep} app={application as AgentApplication} />;
    }
    return <BuilderStepContent stage={selectedStep} app={application as BuilderApplication} />;
  };

  return (
    <Modal open={open} onClose={onClose} title={`Review: ${title}`} size="xl">
      <div className="flex flex-col lg:flex-row gap-6 min-h-[520px]">

        {/* ── LEFT: Step workspace ──────────────────────────────────────── */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Step header */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <span className="text-[10px] text-navy-400 uppercase tracking-wider">
                {isAgent ? 'Agent' : 'Builder'} Application — Current Step
              </span>
              <h3 className="font-bold text-navy-900 text-base leading-tight">
                {STAGE_LABELS[selectedStep] ?? selectedStep}
              </h3>
            </div>
            <button
              onClick={() => setShowHistory((v) => !v)}
              className="flex items-center gap-1.5 text-xs text-navy-500 hover:text-navy-900 transition-colors px-2 py-1.5 rounded-lg hover:bg-navy-50 border border-transparent hover:border-navy-100"
            >
              <History className="h-3.5 w-3.5" />
              History
            </button>
          </div>

          {showHistory && (
            <div className="mb-4 p-3 bg-navy-50 rounded-xl border border-navy-100">
              <h4 className="text-xs font-semibold text-navy-600 mb-2 flex items-center gap-1.5">
                <History className="h-3 w-3" /> Verification Activity
              </h4>
              <VerificationHistory applicationId={application.id} />
            </div>
          )}

          {/* Step content */}
          <div className="flex-1">{renderStepContent()}</div>

          {/* Notes */}
          {canAdvance && currentStatus !== 'submitted' && (
            <div className="mt-4 pt-4 border-t border-navy-100">
              <Textarea
                label="Verification Notes (optional)"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add notes for this verification step..."
                rows={2}
              />
            </div>
          )}

          {/* Reject panel */}
          {showReject && !isTerminal && (
            <div className="mt-3 p-4 bg-red-50 rounded-xl border border-red-200 space-y-3">
              <p className="text-sm font-semibold text-red-800 flex items-center gap-2">
                <XCircle className="h-4 w-4" /> Reject Application
              </p>
              <Textarea
                label="Reason for Rejection *"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="E.g. Invalid documents, RERA mismatch..."
                rows={2}
              />
              <div className="flex gap-2">
                <Button size="sm" variant="danger" onClick={handleReject}
                  loading={actionMutation.isPending && actionMutation.variables?.action === 'reject'}>
                  Confirm Rejection
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setShowReject(false)}>Cancel</Button>
              </div>
            </div>
          )}

          {/* Action bar */}
          {!isTerminal && (
            <div className="mt-4 flex flex-wrap items-center gap-2 pt-3 border-t border-navy-100">
              {!showReject && (
                <Button size="sm" variant="ghost" className="text-red-600 hover:bg-red-50"
                  icon={<XCircle className="h-3.5 w-3.5" />}
                  onClick={() => setShowReject(true)}>
                  Reject
                </Button>
              )}
              <div className="ml-auto flex gap-2">
                {selectedStep !== stages[0] && (
                  <Button size="sm" variant="secondary"
                    onClick={() => {
                      const prevIdx = stages.indexOf(selectedStep as any) - 1;
                      if (prevIdx >= 0) setSelectedStep(stages[prevIdx]);
                    }}>
                    ← Previous
                  </Button>
                )}
                {canAdvance && (
                  <Button
                    onClick={handleNextStage}
                    loading={actionMutation.isPending}
                    icon={<ChevronRight className="h-4 w-4" />}
                    className="bg-navy-700 text-white hover:bg-navy-800"
                  >
                    {nextButtonLabels[currentStatus] ?? 'Mark as Verified & Next'}
                  </Button>
                )}
              </div>
            </div>
          )}

          {application.status === 'approved' && (
            <div className="mt-4 p-3 bg-success-50 text-success-700 text-sm rounded-xl border border-success-200 flex gap-2 items-center">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>Application approved. Portal access has been provisioned.</span>
            </div>
          )}
        </div>

        {/* ── RIGHT: Stepper ──────────────────────────────────────────────── */}
        <div className="lg:w-52 shrink-0 border-t lg:border-t-0 lg:border-l border-navy-100 lg:pl-5 pt-4 lg:pt-0">
          <VerificationStepper
            stages={stages}
            currentStatus={currentStatus}
            selectedStep={selectedStep}
            onSelectStep={(stage) => { setSelectedStep(stage); setShowReject(false); }}
          />
        </div>
      </div>
    </Modal>
  );
}
