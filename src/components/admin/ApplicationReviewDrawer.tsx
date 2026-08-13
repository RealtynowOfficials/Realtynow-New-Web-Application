import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useToast } from '../toast';
import { useLanguageContext } from '../../lib/i18n/language-context';
import { Modal, Button, Textarea } from '../ui';
import {
  CheckCircle2, XCircle, Clock, FileText, User,
  Building2, Phone, Mail, MapPin, Award, BadgeCheck, AlertCircle,
  ChevronRight, History, ShieldCheck, Eye, AlertTriangle,
  CheckSquare, Calendar, Globe, Briefcase,
} from 'lucide-react';
import { formatDate } from '../../lib/utils';
import type { AgentApplication, BuilderApplication, PartnerApplication } from '../../lib/types';
import { parseStorageUrl, getDocumentSignedUrl } from '../../lib/storage';
import { validatePartnerDetailsForSubmission } from '../../lib/partner-validation';

// ─── Types ────────────────────────────────────────────────────────────────────
export interface ApplicationReviewDrawerProps {
  open: boolean;
  onClose: () => void;
  application: AgentApplication | BuilderApplication | PartnerApplication | null;
  type: 'agent' | 'builder' | 'partner';
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

const PARTNER_STAGES = [
  'submitted',
  'pending_review',
  'document_verification',
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

const STAGE_LABEL_KEYS: Record<string, string> = {
  submitted: 'admin.stageSubmitted',
  pending_review: 'admin.stagePendingReview',
  document_verification: 'admin.stageDocumentVerification',
  identity_verification: 'admin.stageIdentityVerification',
  company_verification: 'admin.stageCompanyVerification',
  rera_verification: 'admin.stageReraVerification',
  project_verification: 'admin.stageProjectVerification',
  background_verification: 'admin.stageBackgroundVerification',
  final_review: 'admin.stageFinalReview',
  approved: 'admin.stageApproved',
  rejected: 'admin.stageRejected',
  changes_requested: 'admin.stageChangesRequested',
};

function stageLabel(stage: string, t: (key: string, fallback?: string) => string): string {
  const fallback = STAGE_LABELS[stage] ?? stage;
  const key = STAGE_LABEL_KEYS[stage];
  return key ? t(key, fallback) : fallback;
}

const AGENT_NEXT_BUTTON: Record<string, string> = {
  submitted: 'Start Review',
  pending_review: 'Mark as Reviewed & Next',
  document_verification: 'Verify Documents & Next',
  identity_verification: 'Verify Identity & Next',
  rera_verification: 'Verify RERA & Next',
  background_verification: 'Complete Background Check & Next',
  final_review: 'Approve Application',
};

const AGENT_NEXT_BUTTON_KEYS: Record<string, string> = {
  submitted: 'admin.agentBtnStartReview',
  pending_review: 'admin.agentBtnMarkReviewedNext',
  document_verification: 'admin.agentBtnVerifyDocsNext',
  identity_verification: 'admin.agentBtnVerifyIdentityNext',
  rera_verification: 'admin.agentBtnVerifyReraNext',
  background_verification: 'admin.agentBtnCompleteBackgroundNext',
  final_review: 'admin.agentBtnApproveApplication',
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

const BUILDER_NEXT_BUTTON_KEYS: Record<string, string> = {
  submitted: 'admin.agentBtnStartReview',
  pending_review: 'admin.agentBtnMarkReviewedNext',
  document_verification: 'admin.agentBtnVerifyDocsNext',
  company_verification: 'admin.builderBtnVerifyCompanyNext',
  rera_verification: 'admin.agentBtnVerifyReraNext',
  project_verification: 'admin.builderBtnVerifyProjectsNext',
  background_verification: 'admin.agentBtnCompleteBackgroundNext',
  final_review: 'admin.builderBtnApprove',
};

const PARTNER_NEXT_BUTTON: Record<string, string> = {
  submitted: 'Start Review',
  pending_review: 'Mark as Reviewed & Next',
  document_verification: 'Verify Documents & Next',
  final_review: 'Approve Partner',
};

const PARTNER_NEXT_BUTTON_KEYS: Record<string, string> = {
  submitted: 'admin.agentBtnStartReview',
  pending_review: 'admin.agentBtnMarkReviewedNext',
  document_verification: 'admin.agentBtnVerifyDocsNext',
  final_review: 'admin.partnerBtnApprove',
};

function nextButtonLabel(
  status: string,
  labels: Record<string, string>,
  keys: Record<string, string>,
  t: (key: string, fallback?: string) => string,
): string {
  const fallback = labels[status] ?? 'Mark as Verified & Next';
  const key = keys[status];
  return key ? t(key, fallback) : t('admin.markVerifiedNext', fallback);
}

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
  const { t } = useLanguageContext();
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
           setErrorMsg(t('admin.docNoLongerAvailable', 'Document file is no longer available. Please ask the user to re-upload.'));
           setLoading(false);
           return;
        }
        freshUrl = newUrl;
      } else if (!url.startsWith('http')) {
        const { url: newUrl, error } = await getDocumentSignedUrl(bucket, url, 600);
        if (error || !newUrl) {
           setErrorMsg(t('admin.docNoLongerAvailable', 'Document file is no longer available. Please ask the user to re-upload.'));
           setLoading(false);
           return;
        }
        freshUrl = newUrl;
      }

      setPreviewUrl(freshUrl);

    } catch (err) {
      console.error(err);
      setErrorMsg(t('admin.docPreviewFailed', 'Document preview failed.'));
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
        <span className="truncate">{loading ? t('admin.openingDocument', 'Opening document...') : label}</span>
        <Eye className="h-3.5 w-3.5 ml-auto text-navy-400" />
      </button>

      {errorMsg && (
        <div className="flex flex-col gap-1 mt-2 p-2 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-xs text-error-700">{errorMsg}</p>
          <button onClick={handleOpen} className="text-xs font-semibold text-error-700 self-start hover:underline">
            {t('admin.tryAgain', 'Try Again')}
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
            <Button variant="ghost" onClick={() => setPreviewUrl(null)}>{t('admin.close', 'Close')}</Button>
            {previewUrl && (
              <>
                <Button variant="secondary" onClick={() => window.open(previewUrl, '_blank', 'noreferrer')}>
                  {t('admin.openInNewTab', 'Open in New Tab')}
                </Button>
                <Button variant="primary" onClick={() => {
                  const a = document.createElement('a');
                  a.href = previewUrl;
                  a.download = label;
                  a.target = '_blank';
                  a.click();
                }}>
                  {t('admin.download', 'Download')}
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
                      setErrorMsg(t('admin.unableToOpenDocument', 'Unable to open this document. Please try again.'));
                      setPreviewUrl(null);
                      setRetryCount(0);
                    }
                  }}
                  onLoad={() => setRetryCount(0)}
                />
              ) : (
                <div className="text-center p-6">
                  <FileText className="h-16 w-16 text-navy-300 mx-auto mb-4" />
                  <p className="text-navy-600 mb-4">{t('admin.previewNotAvailable', 'Preview is not available for this file type.')}</p>
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
  const { t } = useLanguageContext();
  const isRejected = currentStatus === 'rejected';
  const currentIdx = getStageIndex(stages, currentStatus);

  return (
    <div className="space-y-1">
      <h3 className="text-xs font-semibold text-navy-500 uppercase tracking-wider mb-3">
        {t('admin.verificationProgress', 'Verification Progress')}
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
            const isClickable = true;

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
                disabled={stage === 'approved' && currentStatus !== 'approved'}
                onClick={() => isClickable && onSelectStep(stage)}
                className={cn(
                  'flex items-center gap-2.5 w-full text-left px-1 py-1.5 rounded-lg transition-colors',
                  isSelected && 'bg-navy-50',
                  isClickable && !isSelected && 'hover:bg-navy-50',
                  stage === 'approved' && currentStatus !== 'approved' && 'opacity-40 cursor-not-allowed',
                )}
              >
                <div className={cn('z-10 h-7 w-7 rounded-full flex items-center justify-center shrink-0 transition-all', dotClass)}>
                  {dotContent ?? <span className="text-[10px] font-bold text-navy-300">{idx + 1}</span>}
                </div>
                <span className={cn('text-xs transition-colors leading-snug', textClass, isSelected && 'text-navy-900 font-semibold')}>
                  {stageLabel(stage, t)}
                </span>
                {isCurrent && (
                  <span className="ml-auto text-[10px] font-semibold text-red-600 bg-red-50 px-1.5 py-0.5 rounded-full border border-red-100 shrink-0">
                    {t('admin.now', 'Now')}
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
              <span className="text-xs text-red-600 font-semibold">{stageLabel('rejected', t)}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Verification History ─────────────────────────────────────────────────────
function VerificationHistory({ applicationId }: { applicationId: string }) {
  const { t } = useLanguageContext();
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

  if (isLoading) return <div className="text-xs text-navy-400 py-2">{t('admin.loadingHistory', 'Loading history…')}</div>;
  if (!logs?.length) return <div className="text-xs text-navy-400 py-2">{t('admin.noActivityRecorded', 'No activity recorded yet.')}</div>;

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
  const { t } = useLanguageContext();
  switch (stage) {
    case 'submitted':
      return (
        <div className="space-y-4">
          <div className="p-4 bg-success-50 border border-success-200 rounded-xl flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-success-600 shrink-0" />
            <div>
              <p className="font-semibold text-success-800 text-sm">{t('admin.applicationReceived', 'Application Received')}</p>
              <p className="text-xs text-success-600">{t('admin.submittedOn', 'Submitted on {{date}}').replace('{{date}}', formatDate(app.created_at))}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <InfoBox icon={User} label={t('admin.applicantNameLabel', 'Applicant Name')} value={`${app.first_name} ${app.last_name}`} />
            <InfoBox icon={Mail} label={t('admin.emailLabel', 'Email')} value={app.email} />
            <InfoBox icon={Phone} label={t('admin.mobileLabel', 'Mobile')} value={app.phone} />
            <InfoBox icon={Calendar} label={t('admin.appliedDateLabel', 'Applied Date')} value={formatDate(app.created_at)} />
            <div className="col-span-2 p-3 bg-navy-50 rounded-lg border border-navy-100">
              <p className="text-xs text-navy-400 mb-1">{t('admin.applicationIdLabel', 'Application ID')}</p>
              <p className="text-xs font-mono text-navy-600 break-all">{app.id}</p>
            </div>
          </div>
        </div>
      );

    case 'pending_review':
      return (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-navy-900 flex items-center gap-2"><User className="h-4 w-4 text-navy-400" /> {t('admin.generalInformation', 'General Information')}</h4>
          <div className="grid grid-cols-2 gap-3">
            <InfoBox icon={Mail} label={t('admin.emailLabel', 'Email')} value={app.email} />
            <InfoBox icon={Phone} label={t('admin.phoneLabel', 'Phone')} value={app.phone} />
            <InfoBox icon={Award} label={t('admin.specializationLabel', 'Specialization')} value={app.specialization} />
            <InfoBox icon={Clock} label={t('admin.experienceLabel', 'Experience')} value={app.experience_years ? t('admin.yrsValue', '{{count}} yrs').replace('{{count}}', String(app.experience_years)) : null} />
            <InfoBox icon={BadgeCheck} label={t('admin.reraLicenseNoLabel', 'RERA / License No.')} value={app.license_number} />
            <InfoBox icon={MapPin} label={t('admin.serviceAreasLabel', 'Service Areas')} value={app.assigned_areas?.join(', ')} />
            {app.bio && (
              <div className="col-span-2 p-3 bg-navy-50 rounded-lg border border-navy-100">
                <p className="text-xs text-navy-400 mb-1">{t('admin.bioDescriptionLabel', 'Bio / Description')}</p>
                <p className="text-sm text-navy-800">{app.bio}</p>
              </div>
            )}
          </div>
        </div>
      );

    case 'document_verification':
      return (
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-navy-900 flex items-center gap-2"><FileText className="h-4 w-4 text-navy-400" /> {t('admin.submittedDocuments', 'Submitted Documents')}</h4>
          {!app.id_doc_url && !app.license_doc_url ? (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
              <p className="text-sm text-amber-800">{t('admin.noDocumentsUploadedApplicant', 'No documents uploaded by the applicant.')}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {app.id_doc_url && <div className="p-3 bg-white border border-navy-100 rounded-xl"><DocLink url={app.id_doc_url} bucket="agent-documents" label={t('admin.docGovtIdAadhaar', 'Govt ID / Aadhaar')} /></div>}
              {app.license_doc_url && <div className="p-3 bg-white border border-navy-100 rounded-xl"><DocLink url={app.license_doc_url} bucket="agent-documents" label={t('admin.docLicenseReraCertificate', 'License / RERA Certificate')} /></div>}
            </div>
          )}
        </div>
      );

    case 'identity_verification':
      return (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-navy-900 flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-navy-400" /> {t('admin.identityVerificationHeading', 'Identity Verification')}</h4>
          <p className="text-xs text-navy-500">{t('admin.verifyIdentityMatch', "Verify the applicant's identity matches the submitted documents.")}</p>
          <div className="grid grid-cols-2 gap-3">
            <InfoBox icon={User} label={t('admin.fullNameLabel', 'Full Name')} value={`${app.first_name} ${app.last_name}`} />
            <InfoBox icon={Phone} label={t('admin.phoneLabel', 'Phone')} value={app.phone} />
            <InfoBox icon={Mail} label={t('admin.emailLabel', 'Email')} value={app.email} />
            <InfoBox icon={BadgeCheck} label={t('admin.licenseReraNoLabel', 'License / RERA No.')} value={app.license_number} />
          </div>
          {app.id_doc_url && <div className="p-3 bg-white border border-navy-100 rounded-xl"><DocLink url={app.id_doc_url} bucket="agent-documents" label={t('admin.viewGovernmentId', 'View Government ID')} /></div>}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-700">
            {t('admin.confirmIdMatchNote', '✓ Confirm name, phone, email match the submitted ID document before proceeding.')}
          </div>
        </div>
      );

    case 'rera_verification': {
      const hasRera = !!app.license_number;
      return (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-navy-900 flex items-center gap-2"><BadgeCheck className="h-4 w-4 text-navy-400" /> {t('admin.reraVerificationHeading', 'RERA Verification')}</h4>
          {hasRera ? (
            <>
              <InfoBox icon={BadgeCheck} label={t('admin.reraLicenseNumberLabel', 'RERA / License Number')} value={app.license_number} />
              {app.license_doc_url && <div className="p-3 bg-white border border-navy-100 rounded-xl"><DocLink url={app.license_doc_url} bucket="agent-documents" label={t('admin.viewReraCertificate', 'View RERA Certificate')} /></div>}
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-700">
                {t('admin.crossCheckReraNote', '✓ Cross-check the RERA number with the official RERA portal before marking as verified.')}
              </div>
            </>
          ) : (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-amber-800">{t('admin.noReraInfoProvided', 'No RERA Information Provided')}</p>
                <p className="text-xs text-amber-600">{t('admin.applicantNoReraNote', 'Applicant has not submitted a RERA license number. Determine if RERA is applicable.')}</p>
              </div>
            </div>
          )}
        </div>
      );
    }

    case 'background_verification':
      return (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-navy-900 flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-navy-400" /> {t('admin.backgroundVerificationHeading', 'Background Verification')}</h4>
          <p className="text-xs text-navy-500">{t('admin.completeBackgroundChecksNote', 'Complete all background checks before proceeding.')}</p>
          <div className="space-y-2">
            {[
              t('admin.checkCriminalRecord', 'Criminal record check completed'),
              t('admin.checkEmploymentHistory', 'Employment history verified'),
              t('admin.checkProfessionalReferences', 'Professional references checked'),
              t('admin.checkNoAdverseFindings', 'No adverse findings'),
            ].map((c) => (
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
          <h4 className="text-sm font-semibold text-navy-900 flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-success-500" /> {t('admin.finalReviewSummary', 'Final Review Summary')}</h4>
          <div className="space-y-2">
            {allStages.map((s) => (
              <div key={s} className="flex items-center gap-3 p-3 bg-success-50 border border-success-200 rounded-xl">
                <CheckCircle2 className="h-4 w-4 text-success-600 shrink-0" />
                <span className="text-sm font-medium text-success-800">{stageLabel(s, t)}</span>
                <span className="ml-auto text-xs text-success-600 font-semibold">{t('admin.verifiedCheckmark', '✓ Verified')}</span>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-navy-100">
            <InfoBox icon={User} label={t('admin.applicantLabel', 'Applicant')} value={`${app.first_name} ${app.last_name}`} />
            <InfoBox icon={Mail} label={t('admin.emailLabel', 'Email')} value={app.email} />
            <InfoBox icon={Phone} label={t('admin.phoneLabel', 'Phone')} value={app.phone} />
            <InfoBox icon={Award} label={t('admin.specializationLabel', 'Specialization')} value={app.specialization} />
          </div>
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
            {t('admin.approvingProvisionsAgentAccount', '⚠ Approving will provision an Agent Portal account linked to the registered mobile number ({{phone}}).').replace('{{phone}}', app.phone ?? '')}
          </div>
        </div>
      );
    }

    case 'approved':
      return (
        <div className="space-y-4">
          <div className="p-5 bg-success-50 border border-success-200 rounded-xl text-center">
            <CheckCircle2 className="h-10 w-10 text-success-600 mx-auto mb-2" />
            <p className="font-bold text-success-800 text-lg">{t('admin.applicationApproved', 'Application Approved')}</p>
            <p className="text-xs text-success-600 mt-1">{app.reviewed_at ? t('admin.approvedOn', 'Approved on {{date}}').replace('{{date}}', formatDate(app.reviewed_at)) : t('admin.approvalComplete', 'Approval complete')}</p>
          </div>
          <div className="p-3 bg-success-50 border border-success-200 rounded-xl flex items-center gap-3">
            <ShieldCheck className="h-5 w-5 text-success-600 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-success-800">{t('admin.agentPortalAccessEnabled', 'Agent Portal Access Enabled')}</p>
              <p className="text-xs text-success-600">{t('admin.loginViaOtpOn', 'Login via OTP on: {{phone}}').replace('{{phone}}', app.phone ?? '')}</p>
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
  const { t } = useLanguageContext();
  switch (stage) {
    case 'submitted':
      return (
        <div className="space-y-4">
          <div className="p-4 bg-success-50 border border-success-200 rounded-xl flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-success-600 shrink-0" />
            <div>
              <p className="font-semibold text-success-800 text-sm">{t('admin.builderApplicationReceived', 'Builder Application Received')}</p>
              <p className="text-xs text-success-600">{t('admin.submittedOn', 'Submitted on {{date}}').replace('{{date}}', formatDate(app.created_at))}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <InfoBox icon={Building2} label={t('admin.companyNameLabel', 'Company Name')} value={app.company_name} />
            <InfoBox icon={User} label={t('admin.contactPersonLabel', 'Contact Person')} value={app.contact_name} />
            <InfoBox icon={Mail} label={t('admin.emailLabel', 'Email')} value={app.email} />
            <InfoBox icon={Phone} label={t('admin.mobileLabel', 'Mobile')} value={app.phone} />
            <InfoBox icon={MapPin} label={t('admin.cityLabel2', 'City')} value={app.city} />
            <InfoBox icon={Calendar} label={t('admin.appliedDateLabel', 'Applied Date')} value={formatDate(app.created_at)} />
            <div className="col-span-2 p-3 bg-navy-50 rounded-lg border border-navy-100">
              <p className="text-xs text-navy-400 mb-1">{t('admin.applicationIdLabel', 'Application ID')}</p>
              <p className="text-xs font-mono text-navy-600 break-all">{app.id}</p>
            </div>
          </div>
        </div>
      );

    case 'pending_review':
      return (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-navy-900 flex items-center gap-2"><Building2 className="h-4 w-4 text-navy-400" /> {t('admin.builderInformation', 'Builder Information')}</h4>
          <div className="grid grid-cols-2 gap-3">
            <InfoBox icon={Building2} label={t('admin.companyNameLabel', 'Company Name')} value={app.company_name} />
            <InfoBox icon={User} label={t('admin.contactPersonLabel', 'Contact Person')} value={app.contact_name} />
            <InfoBox icon={Mail} label={t('admin.emailLabel', 'Email')} value={app.email} />
            <InfoBox icon={Phone} label={t('admin.phoneLabel', 'Phone')} value={app.phone} />
            <InfoBox icon={MapPin} label={t('admin.cityLabel2', 'City')} value={app.city} />
            <InfoBox icon={BadgeCheck} label={t('admin.reraNumberLabel', 'RERA Number')} value={app.rera_number} />
            <InfoBox icon={Briefcase} label={t('admin.gstNumberLabel2', 'GST Number')} value={app.gst_number} />
            <InfoBox icon={Calendar} label={t('admin.establishedYearLabel', 'Established Year')} value={app.established_year?.toString()} />
            {app.website_url && <InfoBox icon={Globe} label={t('admin.websiteLabel2', 'Website')} value={app.website_url} />}
            {app.description && (
              <div className="col-span-2 p-3 bg-navy-50 rounded-lg border border-navy-100">
                <p className="text-xs text-navy-400 mb-1">{t('admin.companyDescriptionLabel', 'Company Description')}</p>
                <p className="text-sm text-navy-800">{app.description}</p>
              </div>
            )}
          </div>
        </div>
      );

    case 'document_verification': {
      const docs = [
        { url: app.gst_doc_url, label: t('admin.docGstCertificate', 'GST Certificate') },
        { url: app.rera_doc_url, label: t('admin.docReraCertificate', 'RERA Certificate') },
        { url: app.pan_doc_url, label: t('admin.docPanCard', 'PAN Card') },
      ].filter((d) => d.url);
      return (
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-navy-900 flex items-center gap-2"><FileText className="h-4 w-4 text-navy-400" /> {t('admin.builderDocuments', 'Builder Documents')}</h4>
          {docs.length === 0 ? (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
              <p className="text-sm text-amber-800">{t('admin.noDocumentsUploadedBuilder', 'No documents uploaded by the builder.')}</p>
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
          <h4 className="text-sm font-semibold text-navy-900 flex items-center gap-2"><Briefcase className="h-4 w-4 text-navy-400" /> {t('admin.companyBusinessVerification', 'Company / Business Verification')}</h4>
          <p className="text-xs text-navy-500">{t('admin.verifyCompanyIdentityNote', 'Verify that the company identity, registration, and business information is valid.')}</p>
          <div className="grid grid-cols-2 gap-3">
            <InfoBox icon={Building2} label={t('admin.companyNameLabel', 'Company Name')} value={app.company_name} />
            <InfoBox icon={User} label={t('admin.contactPersonLabel', 'Contact Person')} value={app.contact_name} />
            <InfoBox icon={Briefcase} label={t('admin.gstNumberLabel2', 'GST Number')} value={app.gst_number} />
            <InfoBox icon={MapPin} label={t('admin.cityLocationLabel', 'City / Location')} value={app.city} />
            <InfoBox icon={Calendar} label={t('admin.establishedYearLabel', 'Established Year')} value={app.established_year?.toString()} />
            {app.website_url && <InfoBox icon={Globe} label={t('admin.websiteLabel2', 'Website')} value={app.website_url} />}
          </div>
          {app.gst_doc_url && (
            <div className="p-3 bg-white border border-navy-100 rounded-xl">
              <p className="text-xs text-navy-500 mb-2 font-medium">{t('admin.gstRegistrationDocument', 'GST / Registration Document')}</p>
              <DocLink url={app.gst_doc_url} bucket="builder-documents" label={t('admin.viewGstCertificate', 'View GST Certificate')} />
            </div>
          )}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-700">
            {t('admin.verifyCompanyMcaGstNote', '✓ Verify the company name on official MCA/GST portal before proceeding.')}
          </div>
        </div>
      );

    case 'rera_verification': {
      const hasRera = !!app.rera_number;
      return (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-navy-900 flex items-center gap-2"><BadgeCheck className="h-4 w-4 text-navy-400" /> {t('admin.reraVerificationHeading', 'RERA Verification')}</h4>
          {hasRera ? (
            <>
              <InfoBox icon={BadgeCheck} label={t('admin.reraNumberLabel', 'RERA Number')} value={app.rera_number} />
              {app.rera_doc_url && (
                <div className="p-3 bg-white border border-navy-100 rounded-xl">
                  <DocLink url={app.rera_doc_url} bucket="builder-documents" label={t('admin.viewReraCertificate', 'View RERA Certificate')} />
                </div>
              )}
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-700">
                {t('admin.crossCheckReraStateNote', '✓ Cross-check RERA registration with the state RERA portal before approving.')}
              </div>
            </>
          ) : (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-amber-800">{t('admin.noReraNumberProvided', 'No RERA Number Provided')}</p>
                <p className="text-xs text-amber-600">{t('admin.determineReraMandatoryNote', 'Determine if RERA registration is mandatory for this builder. If not applicable, note the reason.')}</p>
              </div>
            </div>
          )}
        </div>
      );
    }

    case 'project_verification':
      return (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-navy-900 flex items-center gap-2"><Building2 className="h-4 w-4 text-navy-400" /> {t('admin.projectBuilderVerification', 'Project / Builder Verification')}</h4>
          <p className="text-xs text-navy-500">{t('admin.verifyProjectsPortfolioNote', "Verify the builder's listed projects and portfolio information.")}</p>
          <div className="p-4 bg-navy-50 border border-navy-100 rounded-xl space-y-2">
            <p className="text-sm font-medium text-navy-700">{t('admin.verificationChecklist', 'Verification Checklist')}</p>
            {[
              t('admin.checkBuilderCredentials', 'Builder credentials verified'),
              t('admin.checkCompanyNameMatchesRera', 'Company name matches RERA records'),
              t('admin.checkProjectLocations', 'Project locations verified'),
              t('admin.checkNoPendingLegalDisputes', 'No pending legal disputes found'),
            ].map((c) => (
              <div key={c} className="flex items-center gap-2 p-2 bg-white rounded-lg border border-navy-100">
                <CheckSquare className="h-4 w-4 text-navy-400 shrink-0" />
                <span className="text-sm text-navy-700">{c}</span>
              </div>
            ))}
          </div>
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-700">
            {t('admin.checkBuilderProjectHistoryNote', "✓ Check builder's project history and ensure listed projects are legitimate before proceeding.")}
          </div>
        </div>
      );

    case 'background_verification':
      return (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-navy-900 flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-navy-400" /> {t('admin.backgroundVerificationHeading', 'Background Verification')}</h4>
          <p className="text-xs text-navy-500">{t('admin.completeBackgroundChecksBuilderNote', 'Complete all background checks for the builder and company.')}</p>
          <div className="space-y-2">
            {[
              t('admin.checkCompanyCriminalRecord', 'Company criminal/legal record check'),
              t('admin.checkDirectorBackground', 'Director/promoter background verified'),
              t('admin.checkFinancialHealth', 'Financial health check completed'),
              t('admin.checkNoActiveLegalDisputes', 'No active legal disputes'),
              t('admin.checkNoReraBlacklist', 'No RERA blacklist matches'),
            ].map((c) => (
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
          <h4 className="text-sm font-semibold text-navy-900 flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-success-500" /> {t('admin.finalReviewSummary', 'Final Review Summary')}</h4>
          <div className="space-y-2">
            {allStages.map((s) => (
              <div key={s} className="flex items-center gap-3 p-3 bg-success-50 border border-success-200 rounded-xl">
                <CheckCircle2 className="h-4 w-4 text-success-600 shrink-0" />
                <span className="text-sm font-medium text-success-800">{stageLabel(s, t)}</span>
                <span className="ml-auto text-xs text-success-600 font-semibold">{t('admin.verifiedCheckmark', '✓ Verified')}</span>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-navy-100">
            <InfoBox icon={Building2} label={t('admin.companyNameLabel', 'Company Name')} value={app.company_name} />
            <InfoBox icon={User} label={t('admin.contactPersonLabel', 'Contact Person')} value={app.contact_name} />
            <InfoBox icon={Mail} label={t('admin.emailLabel', 'Email')} value={app.email} />
            <InfoBox icon={Phone} label={t('admin.phoneLabel', 'Phone')} value={app.phone} />
          </div>
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
            {t('admin.approvingProvisionsBuilderAccount', '⚠ Approving will provision a Builder Portal account linked to the registered mobile number ({{phone}}).').replace('{{phone}}', app.phone ?? '')}
          </div>
        </div>
      );
    }

    case 'approved':
      return (
        <div className="space-y-4">
          <div className="p-5 bg-success-50 border border-success-200 rounded-xl text-center">
            <CheckCircle2 className="h-10 w-10 text-success-600 mx-auto mb-2" />
            <p className="font-bold text-success-800 text-lg">{t('admin.builderApplicationApproved', 'Builder Application Approved')}</p>
            <p className="text-xs text-success-600 mt-1">{app.reviewed_at ? t('admin.approvedOn', 'Approved on {{date}}').replace('{{date}}', formatDate(app.reviewed_at)) : t('admin.approvalComplete', 'Approval complete')}</p>
          </div>
          <div className="p-3 bg-success-50 border border-success-200 rounded-xl flex items-center gap-3">
            <ShieldCheck className="h-5 w-5 text-success-600 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-success-800">{t('admin.builderPortalAccessEnabled', 'Builder Portal Access Enabled')}</p>
              <p className="text-xs text-success-600">{`${app.company_name} — ${t('admin.loginViaOtpOn', 'Login via OTP on: {{phone}}').replace('{{phone}}', app.phone ?? '')}`}</p>
            </div>
          </div>
        </div>
      );

    default:
      return null;
  }
}

// ─── Partner step panels ───────────────────────────────────────────────────────
function PartnerStepContent({ stage, app }: { stage: string; app: PartnerApplication }) {
  const { t } = useLanguageContext();
  switch (stage) {
    case 'submitted':
      return (
        <div className="space-y-4">
          <div className="p-4 bg-success-50 border border-success-200 rounded-xl flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-success-600 shrink-0" />
            <div>
              <p className="font-semibold text-success-800 text-sm">{t('admin.partnerApplicationReceived', 'Partner Application Received')}</p>
              <p className="text-xs text-success-600">{t('admin.submittedOn', 'Submitted on {{date}}').replace('{{date}}', formatDate(app.created_at))}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <InfoBox icon={User} label={t('admin.fullNameLabel', 'Full Name')} value={app.full_name} />
            <InfoBox icon={Briefcase} label={t('admin.partnerTypeLabel2', 'Partner Type')} value={app.partner_type} />
            <InfoBox icon={Mail} label={t('admin.emailLabel', 'Email')} value={app.email} />
            <InfoBox icon={Phone} label={t('admin.mobileLabel', 'Mobile')} value={app.mobile_number} />
            <InfoBox icon={Calendar} label={t('admin.appliedDateLabel', 'Applied Date')} value={formatDate(app.created_at)} />
            {app.application_number && (
              <div className="col-span-2 p-3 bg-navy-50 rounded-lg border border-navy-100">
                <p className="text-xs text-navy-400 mb-1">{t('admin.applicationNumberLabel', 'Application Number')}</p>
                <p className="text-xs font-mono text-navy-600 break-all">{app.application_number}</p>
              </div>
            )}
          </div>
        </div>
      );

    case 'pending_review':
      return (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-navy-900 flex items-center gap-2"><User className="h-4 w-4 text-navy-400" /> {t('admin.partnerInformation', 'Partner Information')}</h4>
          <div className="grid grid-cols-2 gap-3">
            <InfoBox icon={Mail} label={t('admin.emailLabel', 'Email')} value={app.email} />
            <InfoBox icon={Phone} label={t('admin.mobileLabel', 'Mobile')} value={app.mobile_number} />
            <InfoBox icon={Building2} label={t('admin.companyLabel', 'Company')} value={app.company_name} />
            <InfoBox icon={Briefcase} label={t('admin.gstNumberLabel2', 'GST Number')} value={app.gst_number} />
            <InfoBox icon={BadgeCheck} label={t('admin.panNumberLabel2', 'PAN Number')} value={app.pan_number} />
            <InfoBox icon={MapPin} label={t('admin.cityStateLabel', 'City / State')} value={app.city ? `${app.city}, ${app.state ?? ''}` : null} />
            <InfoBox icon={Award} label={t('admin.yearsOfExperienceLabel2', 'Years of Experience')} value={app.years_of_experience ? t('admin.yrsValue', '{{count}} yrs').replace('{{count}}', String(app.years_of_experience)) : null} />
            {app.preferred_property_types && app.preferred_property_types.length > 0 && (
              <InfoBox icon={Building2} label={t('admin.preferredPropertyTypesLabel2', 'Preferred Property Types')} value={app.preferred_property_types.join(', ')} />
            )}
            {app.description && (
              <div className="col-span-2 p-3 bg-navy-50 rounded-lg border border-navy-100">
                <p className="text-xs text-navy-400 mb-1">{t('admin.aboutLabel', 'About')}</p>
                <p className="text-sm text-navy-800">{app.description}</p>
              </div>
            )}
          </div>
        </div>
      );

    case 'document_verification': {
      const docs = [
        { url: app.pan_doc_url, label: t('admin.docPanCard', 'PAN Card') },
        { url: app.id_doc_url, label: t('admin.docAadhaar', 'Aadhaar / Government ID') },
        { url: app.gst_doc_url, label: t('admin.docGstCertificate', 'GST Certificate') },
        { url: app.business_reg_doc_url, label: t('admin.docBusinessRegCertificate', 'Business Registration Certificate') },
        { url: app.address_proof_doc_url, label: t('admin.docAddressProof', 'Address Proof') },
      ].filter((d) => d.url);
      return (
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-navy-900 flex items-center gap-2"><FileText className="h-4 w-4 text-navy-400" /> {t('admin.submittedDocuments', 'Submitted Documents')}</h4>
          {docs.length === 0 ? (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
              <p className="text-sm text-amber-800">{t('admin.noDocumentsUploadedApplicant', 'No documents uploaded by the applicant.')}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {docs.map((doc) => (
                <div key={doc.label} className="p-3 bg-white border border-navy-100 rounded-xl">
                  <DocLink url={doc.url} bucket="partner-documents" label={doc.label} />
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    case 'final_review': {
      const allStages = PARTNER_STAGES.slice(1, -1);
      return (
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-navy-900 flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-success-500" /> {t('admin.finalReviewSummary', 'Final Review Summary')}</h4>
          <div className="space-y-2">
            {allStages.map((s) => (
              <div key={s} className="flex items-center gap-3 p-3 bg-success-50 border border-success-200 rounded-xl">
                <CheckCircle2 className="h-4 w-4 text-success-600 shrink-0" />
                <span className="text-sm font-medium text-success-800">{stageLabel(s, t)}</span>
                <span className="ml-auto text-xs text-success-600 font-semibold">{t('admin.verifiedCheckmark', '✓ Verified')}</span>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-navy-100">
            <InfoBox icon={User} label={t('admin.partnerLabel', 'Partner')} value={app.full_name} />
            <InfoBox icon={Mail} label={t('admin.emailLabel', 'Email')} value={app.email} />
            <InfoBox icon={Phone} label={t('admin.mobileLabel', 'Mobile')} value={app.mobile_number} />
            <InfoBox icon={Briefcase} label={t('admin.partnerTypeLabel2', 'Partner Type')} value={app.partner_type} />
          </div>
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
            {t('admin.approvingProvisionsPartnerAccount', '⚠ Approving will provision a Partner Portal account linked to the registered mobile number ({{phone}}).').replace('{{phone}}', app.mobile_number ?? '')}
          </div>
        </div>
      );
    }

    case 'approved':
      return (
        <div className="space-y-4">
          <div className="p-5 bg-success-50 border border-success-200 rounded-xl text-center">
            <CheckCircle2 className="h-10 w-10 text-success-600 mx-auto mb-2" />
            <p className="font-bold text-success-800 text-lg">{t('admin.partnerApplicationApproved', 'Partner Application Approved')}</p>
            <p className="text-xs text-success-600 mt-1">{app.reviewed_at ? t('admin.approvedOn', 'Approved on {{date}}').replace('{{date}}', formatDate(app.reviewed_at)) : t('admin.approvalComplete', 'Approval complete')}</p>
          </div>
          <div className="p-3 bg-success-50 border border-success-200 rounded-xl flex items-center gap-3">
            <ShieldCheck className="h-5 w-5 text-success-600 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-success-800">{t('admin.partnerPortalAccessEnabled', 'Partner Portal Access Enabled')}</p>
              <p className="text-xs text-success-600">{`${app.full_name} — ${t('admin.loginViaOtpOn', 'Login via OTP on: {{phone}}').replace('{{phone}}', app.mobile_number ?? '')}`}</p>
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
  const { t } = useLanguageContext();

  const isAgent = type === 'agent';
  const isBuilder = type === 'builder';
  const isPartner = type === 'partner';
  const stages = isAgent ? AGENT_STAGES : isBuilder ? BUILDER_STAGES : PARTNER_STAGES;

  const currentStatus = application?.status || 'pending_review';
  const currentIdx = getStageIndex(stages, currentStatus);
  const isTerminal = currentStatus === 'approved' || currentStatus === 'rejected';
  const isProvisioningFailed = (application as any)?.provisioning_status === 'PROVISIONING_FAILED';

  const [selectedStep, setSelectedStep] = useState<string>(currentStatus);
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
  }, [open, application?.id]);

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
        let errorBody = null;
        try {
          if ((error as any).context && typeof (error as any).context.json === 'function') {
            errorBody = await (error as any).context.json();
          }
        } catch (e) {
          console.error('Unable to parse Edge Function error:', e);
        }
        
        const msg = errorBody?.error || errorBody?.message || error.message || '';
        if (msg.toLowerCase().includes('failed to send') || msg.toLowerCase().includes('fetch')) {
          throw new Error(t('admin.unableToConnectVerification', 'Unable to connect to the verification service. Please check your connection.'));
        }
        throw new Error(msg || t('admin.verificationFailedRetry', 'Verification failed. Please try again.'));
      }
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (_, payload) => {
      queryClient.invalidateQueries({ queryKey: [`admin-${type}-applications`] });
      queryClient.invalidateQueries({ queryKey: ['app-activity-logs', application?.id] });
      if (payload.action === 'approve') {
        const who = isAgent ? t('admin.agentLabel', 'Agent') : isBuilder ? t('admin.builderLabel', 'Builder') : t('admin.partnerLabel', 'Partner');
        addToast('success', t('admin.applicationApprovedProvisioned', '{{who}} application approved. Portal access provisioned.').replace('{{who}}', who));
        onClose();
      } else if (payload.action === 'reject') {
        addToast('success', t('admin.applicationRejectedToast', 'Application rejected.'));
        onClose();
      } else if (payload.action === 'stage_change' && payload.new_stage) {
        const label = stageLabel(payload.new_stage, t);
        addToast('success', t('admin.verificationCompletedMovedTo', 'Verification completed. Moved to {{stage}}.').replace('{{stage}}', label));
        setSelectedStep(payload.new_stage);
        setNotes('');
      }
    },
    onError: (e: any) => {
      console.error('Application action error:', e);
      addToast('error', e.message || t('admin.verificationFailedRetry', 'Verification failed. Please try again.'));
    },
  });

  if (!application) return null;

  const title = isAgent
    ? `${(application as AgentApplication).first_name} ${(application as AgentApplication).last_name}`
    : isBuilder
      ? (application as BuilderApplication).company_name
      : (application as PartnerApplication).full_name;

  const handleNextStage = () => {
    const nextIdx = currentIdx + 1;
    if (nextIdx >= stages.length) return;
    const nextStage = stages[nextIdx];
    if (nextStage === 'approved') {
      // ── Partner approval guard ─────────────────────────────────────────────
      // Before approving a partner application, re-validate the stored field
      // values using the same rules as the registration form. This prevents
      // approving applications that somehow bypassed frontend validation.
      if (isPartner) {
        const partnerApp = application as PartnerApplication;
        const validationErrs = validatePartnerDetailsForSubmission({
          partner_type: partnerApp.partner_type ?? '',
          full_name: partnerApp.full_name ?? '',
          mobile_number: partnerApp.mobile_number ?? '',
          email: partnerApp.email ?? '',
          company_name: partnerApp.company_name ?? '',
          years_of_experience: partnerApp.years_of_experience != null ? String(partnerApp.years_of_experience) : '',
          gst_number: partnerApp.gst_number ?? '',
          pan_number: partnerApp.pan_number ?? '',
          website: partnerApp.website ?? '',
          state: partnerApp.state ?? '',
        });
        if (Object.keys(validationErrs).length > 0) {
          const errorFields = Object.keys(validationErrs).join(', ');
          addToast(
            'error',
            t('admin.cannotApproveInvalidFields', 'Cannot approve: Partner application has invalid field values ({{fields}}). Ask the applicant to resubmit with corrected details.').replace('{{fields}}', errorFields)
          );
          return;
        }
      }
      actionMutation.mutate({ action: 'approve', remarks: notes || t('admin.approvedAfterFinalReview', 'Approved after final review.') });
    } else {
      actionMutation.mutate({ action: 'stage_change', new_stage: nextStage, remarks: notes || t('admin.advancedToStage', 'Advanced to {{stage}}').replace('{{stage}}', stageLabel(nextStage, t)) });
    }
  };

  const handleReject = () => {
    if (!rejectReason.trim()) { addToast('error', t('admin.rejectionReasonRequired', 'Rejection reason is required.')); return; }
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
            <p className="font-semibold text-red-800">{t('admin.applicationRejectedTitle', 'Application Rejected')}</p>
            <p className="text-sm text-red-600 mt-1">{application.rejection_reason || t('admin.noReasonProvided', 'No reason provided.')}</p>
          </div>
        </div>
      );
    }
    if (isAgent) {
      return <AgentStepContent stage={selectedStep} app={application as AgentApplication} />;
    }
    if (isBuilder) {
      return <BuilderStepContent stage={selectedStep} app={application as BuilderApplication} />;
    }
    return <PartnerStepContent stage={selectedStep} app={application as PartnerApplication} />;
  };

  const renderFooter = () => {
    return (
      <div className="flex flex-col gap-3">
        {/* Reject panel */}
        {showReject && !isTerminal && (
          <div className="p-4 bg-red-50 rounded-xl border border-red-200 space-y-3">
            <p className="text-sm font-semibold text-red-800 flex items-center gap-2">
              <XCircle className="h-4 w-4" /> {t('admin.rejectApplicationHeading', 'Reject Application')}
            </p>
            <Textarea
              label={t('admin.reasonForRejectionLabel', 'Reason for Rejection *')}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder={t('admin.rejectionReasonPlaceholder', 'E.g. Invalid documents, RERA mismatch...')}
              rows={2}
            />
            <div className="flex gap-2">
              <Button size="sm" variant="danger" onClick={handleReject}
                loading={actionMutation.isPending && actionMutation.variables?.action === 'reject'}>
                {t('admin.confirmRejection', 'Confirm Rejection')}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowReject(false)}>{t('admin.cancel', 'Cancel')}</Button>
            </div>
          </div>
        )}

        {/* Action bar */}
        {!isTerminal && (
          <div className="flex flex-wrap items-center gap-2 w-full">
            {!showReject && (
              <Button size="sm" variant="ghost" className="text-red-600 hover:bg-red-50"
                icon={<XCircle className="h-3.5 w-3.5" />}
                onClick={() => setShowReject(true)}>
                {t('admin.reject', 'Reject')}
              </Button>
            )}

            {isProvisioningFailed && (
              <div className="flex-1 px-3 py-1.5 ml-2 bg-red-50 text-red-700 text-xs font-medium rounded-lg border border-red-200 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {t('admin.provisioningFailedRetry', 'Account provisioning failed. Please retry.')}
              </div>
            )}

            <div className="ml-auto flex gap-2">
              {selectedStep !== stages[0] && (
                <Button size="sm" variant="secondary"
                  onClick={() => {
                    const prevIdx = stages.indexOf(selectedStep as any) - 1;
                    if (prevIdx >= 0) setSelectedStep(stages[prevIdx]);
                  }}>
                  {t('admin.previousStep', '← Previous')}
                </Button>
              )}
              {stages.indexOf(selectedStep as any) < stages.length - 2 && (
                <Button size="sm" variant="secondary"
                  onClick={() => {
                    const nextIdx = stages.indexOf(selectedStep as any) + 1;
                    if (nextIdx < stages.length) setSelectedStep(stages[nextIdx]);
                  }}>
                  {t('admin.nextStep', 'Next →')}
                </Button>
              )}
              {canAdvance && (
                <Button
                  onClick={handleNextStage}
                  loading={actionMutation.isPending}
                  icon={<ChevronRight className="h-4 w-4" />}
                  className={isProvisioningFailed ? "bg-red-600 text-white hover:bg-red-700" : "bg-navy-700 text-white hover:bg-navy-800"}
                >
                  {isProvisioningFailed
                    ? t('admin.retryProvisioning', 'Retry Provisioning')
                    : nextButtonLabel(
                        currentStatus,
                        isAgent ? AGENT_NEXT_BUTTON : isBuilder ? BUILDER_NEXT_BUTTON : PARTNER_NEXT_BUTTON,
                        isAgent ? AGENT_NEXT_BUTTON_KEYS : isBuilder ? BUILDER_NEXT_BUTTON_KEYS : PARTNER_NEXT_BUTTON_KEYS,
                        t,
                      )}
                </Button>
              )}
            </div>
          </div>
        )}

        {application.status === 'approved' && (
          <div className="p-3 bg-success-50 text-success-700 text-sm rounded-xl border border-success-200 flex gap-2 items-center w-full">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{t('admin.applicationApprovedProvisionedNote', 'Application approved. Portal access has been provisioned.')}</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <Modal open={open} onClose={onClose} title={`${t('admin.reviewColon', 'Review:')} ${title}`} size="xl" footer={renderFooter()}>
      <div className="flex flex-col lg:flex-row gap-6 min-h-[520px]">

        {/* ── LEFT: Step workspace ──────────────────────────────────────── */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Step header */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <span className="text-[10px] text-navy-400 uppercase tracking-wider">
                {`${isAgent ? t('admin.agentLabel', 'Agent') : isBuilder ? t('admin.builderLabel', 'Builder') : t('admin.partnerLabel', 'Partner')} ${t('admin.applicationCurrentStep', 'Application — Current Step')}`}
              </span>
              <h3 className="font-bold text-navy-900 text-base leading-tight">
                {stageLabel(selectedStep, t)}
              </h3>
            </div>
            <button
              onClick={() => setShowHistory((v) => !v)}
              className="flex items-center gap-1.5 text-xs text-navy-500 hover:text-navy-900 transition-colors px-2 py-1.5 rounded-lg hover:bg-navy-50 border border-transparent hover:border-navy-100"
            >
              <History className="h-3.5 w-3.5" />
              {t('admin.historyLabel', 'History')}
            </button>
          </div>

          {showHistory && (
            <div className="mb-4 p-3 bg-navy-50 rounded-xl border border-navy-100">
              <h4 className="text-xs font-semibold text-navy-600 mb-2 flex items-center gap-1.5">
                <History className="h-3 w-3" /> {t('admin.verificationActivity', 'Verification Activity')}
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
                label={t('admin.verificationNotesOptional', 'Verification Notes (optional)')}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t('admin.addNotesPlaceholder', 'Add notes for this verification step...')}
                rows={2}
              />
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
