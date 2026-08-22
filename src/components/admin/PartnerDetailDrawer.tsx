import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  User, Phone, Mail, Building2, MapPin, Globe, Landmark, FileText,
  CheckCircle2, XCircle, RefreshCw, Eye, EyeOff, Clock,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { useToast } from '../toast';
import { Modal, Button, Badge, Textarea } from '../ui';
import { formatDate } from '../../lib/utils';
import { InfoBox, DocLink } from './ApplicationReviewDrawer';
import type { Partner, PartnerBankAccount, PartnerDocument, PartnerDocumentType } from '../../lib/types';

const BANK_ACCOUNT_COLUMNS =
  'id,user_id,partner_id,account_holder_name,bank_name,account_number_last4,ifsc_code,branch,account_type,verified,created_at,updated_at';

const DOCUMENT_LABELS: Record<PartnerDocumentType, string> = {
  aadhaar: 'Aadhaar Card',
  pan: 'PAN Card',
  govt_id: 'Government ID',
  cancelled_cheque: 'Cancelled Cheque',
  bank_proof: 'Bank Proof',
  passbook: 'Passbook',
  gst_certificate: 'GST Certificate',
  business_registration: 'Business Registration',
  address_proof: 'Address Proof',
  other: 'Other',
};

function DocStatusBadge({ status }: { status: PartnerDocument['status'] }) {
  if (status === 'verified') return <Badge variant="success">Verified</Badge>;
  if (status === 'rejected') return <Badge variant="error">Rejected</Badge>;
  if (status === 'resubmission_required') return <Badge variant="warning">Resubmit</Badge>;
  return <Badge variant="warning">{status === 'under_review' ? 'Under Review' : 'Uploaded'}</Badge>;
}

export function PartnerDetailDrawer({
  open,
  onClose,
  partner,
}: {
  open: boolean;
  onClose: () => void;
  partner: Partner;
}) {
  const { user: adminUser } = useAuth();
  const { addToast } = useToast();
  const queryClient = useQueryClient();
  const [revealed, setRevealed] = useState<string | null>(null);
  const [revealing, setRevealing] = useState(false);
  const [rejectingDoc, setRejectingDoc] = useState<PartnerDocument | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectMode, setRejectMode] = useState<'rejected' | 'resubmission_required'>('rejected');

  const { data: bankAccount } = useQuery({
    queryKey: ['admin-partner-bank-account', partner.user_id],
    queryFn: async () => {
      const { data } = await supabase
        .from('partner_bank_accounts')
        .select(BANK_ACCOUNT_COLUMNS)
        .eq('user_id', partner.user_id)
        .maybeSingle();
      return data as unknown as PartnerBankAccount | null;
    },
    enabled: open,
  });

  const { data: documents } = useQuery({
    queryKey: ['admin-partner-documents', partner.user_id],
    queryFn: async () => {
      const { data } = await supabase
        .from('partner_documents')
        .select('*')
        .eq('user_id', partner.user_id)
        .order('uploaded_at', { ascending: false });
      return (data ?? []) as PartnerDocument[];
    },
    enabled: open,
  });

  const reveal = async () => {
    if (!bankAccount) return;
    setRevealing(true);
    try {
      const { data, error } = await supabase.rpc('admin_reveal_partner_bank_account_number', {
        p_bank_account_id: bankAccount.id,
      });
      if (error) throw new Error(error.message);
      setRevealed(data as string);
    } catch (e: any) {
      addToast('error', e?.message || 'Failed to reveal account number.');
    } finally {
      setRevealing(false);
    }
  };

  const updateDocStatus = useMutation({
    mutationFn: async ({ doc, status, reason }: { doc: PartnerDocument; status: PartnerDocument['status']; reason?: string }) => {
      const { error } = await supabase.from('partner_documents').update({
        status,
        rejection_reason: reason || null,
        reviewed_by: adminUser?.id || null,
        reviewed_at: new Date().toISOString(),
      }).eq('id', doc.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-partner-documents', partner.user_id] });
      addToast('success', 'Document status updated.');
      setRejectingDoc(null);
      setRejectReason('');
    },
    onError: (e: any) => addToast('error', e?.message || 'Failed to update document.'),
  });

  const latestByType = (type: PartnerDocumentType) => documents?.find((d) => d.document_type === type) ?? null;
  const seenTypes = Array.from(new Set((documents ?? []).map((d) => d.document_type)));

  return (
    <Modal open={open} onClose={onClose} title={`${partner.full_name} — ${partner.partner_code ?? ''}`} size="xl">
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Badge variant={partner.status === 'active' ? 'success' : 'error'}>{partner.status}</Badge>
          {partner.verification_status && <Badge variant="gold">{partner.verification_status}</Badge>}
        </div>

        <section>
          <h4 className="text-sm font-bold text-navy-900 mb-2 flex items-center gap-2"><User className="h-4 w-4" /> Business</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <InfoBox icon={Phone} label="Mobile" value={partner.mobile_number} />
            <InfoBox icon={Mail} label="Email" value={partner.email} />
            <InfoBox icon={Building2} label="Company" value={partner.company_name} />
            <InfoBox icon={Globe} label="Website" value={partner.website} />
            <InfoBox icon={FileText} label="GST Number" value={partner.gst_number} />
            <InfoBox icon={FileText} label="PAN Number" value={partner.pan_number} />
            <InfoBox icon={FileText} label="Business Registration No." value={partner.business_registration_number} />
          </div>
        </section>

        <section>
          <h4 className="text-sm font-bold text-navy-900 mb-2 flex items-center gap-2"><MapPin className="h-4 w-4" /> Address</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <InfoBox icon={MapPin} label="Address" value={[partner.address_line_1, partner.address_line_2].filter(Boolean).join(', ')} />
            <InfoBox icon={MapPin} label="City / State" value={[partner.city, partner.state].filter(Boolean).join(', ')} />
            <InfoBox icon={MapPin} label="District" value={partner.district} />
            <InfoBox icon={MapPin} label="Pincode" value={partner.pincode} />
          </div>
        </section>

        <section>
          <h4 className="text-sm font-bold text-navy-900 mb-2 flex items-center gap-2"><Landmark className="h-4 w-4" /> Banking</h4>
          {bankAccount ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <InfoBox icon={User} label="Account Holder" value={bankAccount.account_holder_name} />
              <InfoBox icon={Landmark} label="Bank" value={`${bankAccount.bank_name}${bankAccount.branch ? ` — ${bankAccount.branch}` : ''}`} />
              <InfoBox icon={FileText} label="IFSC" value={bankAccount.ifsc_code} />
              <div className="p-3 bg-navy-50/50 rounded-lg border border-navy-100/50">
                <p className="text-xs text-navy-400 flex items-center gap-1.5 mb-1"><Landmark className="h-3.5 w-3.5" /> Account Number</p>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-mono font-medium text-navy-900">
                    {revealed ? revealed : `•••• ${bankAccount.account_number_last4}`}
                  </p>
                  <button
                    type="button"
                    onClick={() => (revealed ? setRevealed(null) : reveal())}
                    disabled={revealing}
                    className="text-navy-400 hover:text-navy-700"
                    title={revealed ? 'Hide' : 'Reveal (audited)'}
                  >
                    {revealed ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-navy-500">No bank details submitted yet.</p>
          )}
        </section>

        <section>
          <h4 className="text-sm font-bold text-navy-900 mb-2 flex items-center gap-2"><FileText className="h-4 w-4" /> Documents</h4>
          {seenTypes.length === 0 ? (
            <p className="text-sm text-navy-500">No documents on file.</p>
          ) : (
            <div className="space-y-3">
              {seenTypes.map((type) => {
                const doc = latestByType(type);
                if (!doc) return null;
                return (
                  <div key={type} className="p-3 rounded-lg border border-navy-100/70 bg-white">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-sm font-medium text-navy-900">{DOCUMENT_LABELS[type]}</span>
                      <DocStatusBadge status={doc.status} />
                    </div>
                    <DocLink url={doc.storage_path} bucket="partner-documents" label={DOCUMENT_LABELS[type]} />
                    {doc.rejection_reason && (
                      <p className="text-xs text-error-600 mt-1.5">{doc.rejection_reason}</p>
                    )}
                    <p className="text-xs text-navy-400 mt-1.5 flex items-center gap-1"><Clock className="h-3 w-3" /> {formatDate(doc.uploaded_at)}</p>
                    <div className="mt-2 flex gap-2">
                      <Button size="sm" variant="ghost" icon={<CheckCircle2 className="h-3.5 w-3.5" />}
                        disabled={doc.status === 'verified'}
                        onClick={() => updateDocStatus.mutate({ doc, status: 'verified' })}>
                        Verify
                      </Button>
                      <Button size="sm" variant="ghost" icon={<XCircle className="h-3.5 w-3.5" />}
                        onClick={() => { setRejectingDoc(doc); setRejectMode('rejected'); }}>
                        Reject
                      </Button>
                      <Button size="sm" variant="ghost" icon={<RefreshCw className="h-3.5 w-3.5" />}
                        onClick={() => { setRejectingDoc(doc); setRejectMode('resubmission_required'); }}>
                        Request Resubmission
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {rejectingDoc && (
          <div className="p-4 rounded-lg border border-red-200 bg-red-50/50">
            <p className="text-sm font-semibold text-navy-900 mb-2">
              {rejectMode === 'rejected' ? 'Reject' : 'Request resubmission for'} {DOCUMENT_LABELS[rejectingDoc.document_type]}
            </p>
            <Textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Reason (shown to the partner)"
              rows={2}
            />
            <div className="mt-2 flex justify-end gap-2">
              <Button size="sm" variant="ghost" onClick={() => { setRejectingDoc(null); setRejectReason(''); }}>Cancel</Button>
              <Button
                size="sm"
                variant="danger"
                loading={updateDocStatus.isPending}
                onClick={() => updateDocStatus.mutate({ doc: rejectingDoc, status: rejectMode, reason: rejectReason.trim() })}
              >
                Confirm
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
