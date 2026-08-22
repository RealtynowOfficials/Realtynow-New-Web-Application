import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  User, Mail, Phone, Building2, MapPin, Landmark, FileText,
  ShieldCheck, Save, CheckCircle2, Clock, XCircle, RefreshCw,
} from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import { useLanguageContext } from '../../lib/i18n/language-context';
import { DashboardLayout, PageHeader } from '../../components/dashboard-layout';
import { getPartnerSections } from '../portal/sections';
import { Card, Input, Select, Button, Badge, Skeleton } from '../../components/ui';
import { useToast } from '../../components/toast';
import { DocumentUploadArea } from '../../components/uploader/document-upload-area';
import { uploadFile } from '../../lib/storage';
import {
  validateGSTIN, validatePAN, validateWebsiteUrl, validateCompanyName,
  validateIFSC, validateBankAccountNumber,
} from '../../lib/partner-validation';
import type { Partner, PartnerBankAccount, PartnerDocument, PartnerDocumentType } from '../../lib/types';

const BANK_ACCOUNT_COLUMNS =
  'id,user_id,partner_id,account_holder_name,bank_name,account_number_last4,ifsc_code,branch,account_type,verified,created_at,updated_at';

const DOCUMENT_TYPES: { type: PartnerDocumentType; label: string }[] = [
  { type: 'aadhaar', label: 'Aadhaar Card' },
  { type: 'pan', label: 'PAN Card' },
  { type: 'govt_id', label: 'Government ID' },
  { type: 'gst_certificate', label: 'GST Certificate' },
  { type: 'business_registration', label: 'Business Registration' },
  { type: 'address_proof', label: 'Address Proof' },
  { type: 'cancelled_cheque', label: 'Cancelled Cheque' },
  { type: 'bank_proof', label: 'Bank Proof' },
  { type: 'passbook', label: 'Passbook' },
  { type: 'other', label: 'Other' },
];

function DocStatusBadge({ status }: { status: PartnerDocument['status'] }) {
  if (status === 'verified') return <Badge variant="success"><CheckCircle2 className="h-3 w-3 mr-1 inline" />Verified</Badge>;
  if (status === 'rejected') return <Badge variant="error"><XCircle className="h-3 w-3 mr-1 inline" />Rejected</Badge>;
  if (status === 'resubmission_required') return <Badge variant="warning"><RefreshCw className="h-3 w-3 mr-1 inline" />Resubmit</Badge>;
  return <Badge variant="warning"><Clock className="h-3 w-3 mr-1 inline" />{status === 'under_review' ? 'Under Review' : 'Uploaded'}</Badge>;
}

export function PartnerProfile() {
  const { t } = useLanguageContext();
  const sections = getPartnerSections(t);
  const { user } = useAuth();
  const { addToast } = useToast();
  const queryClient = useQueryClient();

  const { data: partner, isLoading: partnerLoading } = useQuery({
    queryKey: ['partner-profile', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase.from('partners').select('*').eq('user_id', user.id).maybeSingle();
      return data as Partner | null;
    },
    enabled: !!user,
  });

  const { data: bankAccount, isLoading: bankLoading } = useQuery({
    queryKey: ['partner-bank-account', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from('partner_bank_accounts')
        .select(BANK_ACCOUNT_COLUMNS)
        .eq('user_id', user.id)
        .maybeSingle();
      return data as unknown as PartnerBankAccount | null;
    },
    enabled: !!user,
  });

  const { data: documents } = useQuery({
    queryKey: ['partner-documents', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from('partner_documents')
        .select('*')
        .eq('user_id', user.id)
        .order('uploaded_at', { ascending: false });
      return (data ?? []) as PartnerDocument[];
    },
    enabled: !!user,
  });

  const latestByType = (type: PartnerDocumentType) => documents?.find((d) => d.document_type === type) ?? null;

  // ── Business form ──────────────────────────────────────────────────────
  const [businessForm, setBusinessForm] = useState({
    company_name: '', gst_number: '', pan_number: '', website: '', business_registration_number: '',
  });
  const [businessErrors, setBusinessErrors] = useState<Record<string, string>>({});
  const [savingBusiness, setSavingBusiness] = useState(false);

  // ── Address form ───────────────────────────────────────────────────────
  const [addressForm, setAddressForm] = useState({
    address_line_1: '', address_line_2: '', country: 'India', state: '', city: '', district: '', pincode: '',
  });
  const [addressErrors, setAddressErrors] = useState<Record<string, string>>({});
  const [savingAddress, setSavingAddress] = useState(false);

  // ── Bank form ──────────────────────────────────────────────────────────
  const [bankForm, setBankForm] = useState({
    account_holder_name: '', bank_name: '', account_number: '', confirm_account_number: '', ifsc_code: '', branch: '', account_type: 'savings',
  });
  const [bankErrors, setBankErrors] = useState<Record<string, string>>({});
  const [editingBank, setEditingBank] = useState(false);
  const [savingBank, setSavingBank] = useState(false);

  const [uploadingType, setUploadingType] = useState<PartnerDocumentType | null>(null);

  useEffect(() => {
    if (partner) {
      setBusinessForm({
        company_name: partner.company_name || '',
        gst_number: partner.gst_number || '',
        pan_number: partner.pan_number || '',
        website: partner.website || '',
        business_registration_number: partner.business_registration_number || '',
      });
      setAddressForm({
        address_line_1: partner.address_line_1 || '',
        address_line_2: partner.address_line_2 || '',
        country: partner.country || 'India',
        state: partner.state || '',
        city: partner.city || '',
        district: partner.district || '',
        pincode: partner.pincode || '',
      });
    }
  }, [partner]);

  useEffect(() => {
    if (bankAccount) {
      setBankForm({
        account_holder_name: bankAccount.account_holder_name,
        bank_name: bankAccount.bank_name,
        account_number: '',
        confirm_account_number: '',
        ifsc_code: bankAccount.ifsc_code,
        branch: bankAccount.branch || '',
        account_type: bankAccount.account_type,
      });
    }
  }, [bankAccount]);

  const saveBusiness = async () => {
    if (!partner) return;
    const errs: Record<string, string> = {};
    const companyErr = validateCompanyName(businessForm.company_name, true);
    if (companyErr) errs.company_name = companyErr;
    const gstErr = validateGSTIN(businessForm.gst_number, false);
    if (gstErr) errs.gst_number = gstErr;
    const panErr = validatePAN(businessForm.pan_number, false);
    if (panErr) errs.pan_number = panErr;
    if (businessForm.website) {
      const webErr = validateWebsiteUrl(businessForm.website);
      if (webErr) errs.website = webErr;
    }
    setBusinessErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSavingBusiness(true);
    try {
      const { error } = await supabase.from('partners').update({
        company_name: businessForm.company_name.trim(),
        gst_number: businessForm.gst_number.trim().toUpperCase() || null,
        pan_number: businessForm.pan_number.trim().toUpperCase() || null,
        website: businessForm.website.trim() || null,
        business_registration_number: businessForm.business_registration_number.trim() || null,
      }).eq('id', partner.id);
      if (error) throw new Error(error.message);
      addToast('success', 'Business details updated.');
      queryClient.invalidateQueries({ queryKey: ['partner-profile', user?.id] });
    } catch (e: any) {
      addToast('error', e?.message || 'Failed to save business details.');
    } finally {
      setSavingBusiness(false);
    }
  };

  const saveAddress = async () => {
    if (!partner) return;
    const errs: Record<string, string> = {};
    if (!addressForm.address_line_1.trim()) errs.address_line_1 = 'Address is required.';
    if (!addressForm.state.trim()) errs.state = 'State is required.';
    if (!addressForm.city.trim()) errs.city = 'City is required.';
    if (!/^\d{6}$/.test(addressForm.pincode.trim())) errs.pincode = 'Enter a valid 6-digit PIN code.';
    setAddressErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSavingAddress(true);
    try {
      const { error } = await supabase.from('partners').update({
        address_line_1: addressForm.address_line_1.trim(),
        address_line_2: addressForm.address_line_2.trim() || null,
        country: addressForm.country.trim() || 'India',
        state: addressForm.state.trim(),
        city: addressForm.city.trim(),
        district: addressForm.district.trim() || null,
        pincode: addressForm.pincode.trim(),
      }).eq('id', partner.id);
      if (error) throw new Error(error.message);
      addToast('success', 'Address updated.');
      queryClient.invalidateQueries({ queryKey: ['partner-profile', user?.id] });
    } catch (e: any) {
      addToast('error', e?.message || 'Failed to save address.');
    } finally {
      setSavingAddress(false);
    }
  };

  const saveBank = async () => {
    if (!user) return;
    const errs: Record<string, string> = {};
    if (!bankForm.account_holder_name.trim()) errs.account_holder_name = 'Account holder name is required.';
    if (!bankForm.bank_name.trim()) errs.bank_name = 'Bank name is required.';
    const acctErr = validateBankAccountNumber(bankForm.account_number);
    if (acctErr) errs.account_number = acctErr;
    else if (bankForm.account_number !== bankForm.confirm_account_number) {
      errs.confirm_account_number = 'Account numbers do not match.';
    }
    const ifscErr = validateIFSC(bankForm.ifsc_code);
    if (ifscErr) errs.ifsc_code = ifscErr;
    setBankErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSavingBank(true);
    try {
      const { error } = await supabase.from('partner_bank_accounts').upsert({
        user_id: user.id,
        partner_id: partner?.id || null,
        account_holder_name: bankForm.account_holder_name.trim(),
        bank_name: bankForm.bank_name.trim(),
        account_number: bankForm.account_number.trim(),
        ifsc_code: bankForm.ifsc_code.trim().toUpperCase(),
        branch: bankForm.branch.trim() || null,
        account_type: bankForm.account_type,
        verified: false,
      }, { onConflict: 'user_id' });
      if (error) throw new Error(error.message);
      addToast('success', 'Bank details saved. RealtyNow will verify them shortly.');
      setEditingBank(false);
      queryClient.invalidateQueries({ queryKey: ['partner-bank-account', user.id] });
    } catch (e: any) {
      addToast('error', e?.message || 'Failed to save bank details.');
    } finally {
      setSavingBank(false);
    }
  };

  const uploadDocument = async (type: PartnerDocumentType, file: File | null) => {
    if (!file || !user || !partner) return;
    setUploadingType(type);
    try {
      const path = `partners/${partner.id}/${type}-${crypto.randomUUID()}-${file.name}`;
      const { path: storedPath, error: uploadErr } = await uploadFile('partner-documents', file, path);
      if (uploadErr) throw new Error(uploadErr);
      const { error } = await supabase.from('partner_documents').insert({
        partner_id: partner.id,
        user_id: user.id,
        document_type: type,
        storage_path: storedPath,
        status: 'uploaded',
      });
      if (error) throw new Error(error.message);
      addToast('success', 'Document uploaded and pending review.');
      queryClient.invalidateQueries({ queryKey: ['partner-documents', user.id] });
    } catch (e: any) {
      addToast('error', e?.message || 'Failed to upload document.');
    } finally {
      setUploadingType(null);
    }
  };

  if (partnerLoading) {
    return (
      <DashboardLayout sections={sections} title={t('dashboard:profile', 'My Profile')}>
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-2xl" />)}
        </div>
      </DashboardLayout>
    );
  }

  if (!partner) {
    return (
      <DashboardLayout sections={sections} title={t('dashboard:profile', 'My Profile')}>
        <Card className="p-6">
          <p className="text-sm text-navy-500">Your partner profile could not be loaded.</p>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout sections={sections} title={t('dashboard:profile', 'My Profile')}>
      <PageHeader
        title={partner.full_name}
        subtitle={partner.partner_code ? `Partner Code: ${partner.partner_code}` : 'RealtyNow Partner'}
      />

      {/* Personal (read-only) */}
      <Card className="p-6 mb-4">
        <h3 className="font-display text-lg font-bold text-navy-900 mb-4 flex items-center gap-2">
          <User className="h-5 w-5 text-navy-400" /> Personal
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-3 bg-navy-50/50 rounded-lg border border-navy-100/50">
            <p className="text-xs text-navy-400 flex items-center gap-1.5 mb-1"><Phone className="h-3.5 w-3.5" /> Mobile</p>
            <p className="text-sm font-medium text-navy-900">{partner.mobile_number}</p>
          </div>
          {partner.email && (
            <div className="p-3 bg-navy-50/50 rounded-lg border border-navy-100/50">
              <p className="text-xs text-navy-400 flex items-center gap-1.5 mb-1"><Mail className="h-3.5 w-3.5" /> Email</p>
              <p className="text-sm font-medium text-navy-900">{partner.email}</p>
            </div>
          )}
          <div className="p-3 bg-navy-50/50 rounded-lg border border-navy-100/50">
            <p className="text-xs text-navy-400 flex items-center gap-1.5 mb-1"><ShieldCheck className="h-3.5 w-3.5" /> Status</p>
            <Badge variant={partner.status === 'active' ? 'success' : 'error'}>{partner.status}</Badge>
          </div>
        </div>
      </Card>

      {/* Business */}
      <Card className="p-6 mb-4">
        <h3 className="font-display text-lg font-bold text-navy-900 mb-4 flex items-center gap-2">
          <Building2 className="h-5 w-5 text-navy-400" /> Business
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Company / Business Name" value={businessForm.company_name} error={businessErrors.company_name}
            onChange={(e) => setBusinessForm((f) => ({ ...f, company_name: e.target.value }))} />
          <Input label="Business Registration Number" value={businessForm.business_registration_number}
            onChange={(e) => setBusinessForm((f) => ({ ...f, business_registration_number: e.target.value }))} />
          <Input label="GST Number" value={businessForm.gst_number} error={businessErrors.gst_number}
            onChange={(e) => setBusinessForm((f) => ({ ...f, gst_number: e.target.value.toUpperCase() }))} />
          <Input label="PAN Number" value={businessForm.pan_number} error={businessErrors.pan_number}
            onChange={(e) => setBusinessForm((f) => ({ ...f, pan_number: e.target.value.toUpperCase() }))} />
          <Input label="Website" value={businessForm.website} error={businessErrors.website}
            onChange={(e) => setBusinessForm((f) => ({ ...f, website: e.target.value }))} />
        </div>
        <div className="mt-4 flex justify-end">
          <Button variant="primary" icon={<Save className="h-4 w-4" />} loading={savingBusiness} onClick={saveBusiness}>Save Business Details</Button>
        </div>
      </Card>

      {/* Address */}
      <Card className="p-6 mb-4">
        <h3 className="font-display text-lg font-bold text-navy-900 mb-4 flex items-center gap-2">
          <MapPin className="h-5 w-5 text-navy-400" /> Address
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Address Line 1" value={addressForm.address_line_1} error={addressErrors.address_line_1}
            onChange={(e) => setAddressForm((f) => ({ ...f, address_line_1: e.target.value }))} />
          <Input label="Address Line 2" value={addressForm.address_line_2}
            onChange={(e) => setAddressForm((f) => ({ ...f, address_line_2: e.target.value }))} />
          <Input label="State" value={addressForm.state} error={addressErrors.state}
            onChange={(e) => setAddressForm((f) => ({ ...f, state: e.target.value }))} />
          <Input label="City" value={addressForm.city} error={addressErrors.city}
            onChange={(e) => setAddressForm((f) => ({ ...f, city: e.target.value }))} />
          <Input label="District" value={addressForm.district}
            onChange={(e) => setAddressForm((f) => ({ ...f, district: e.target.value }))} />
          <Input label="Pincode" value={addressForm.pincode} error={addressErrors.pincode} maxLength={6}
            onChange={(e) => setAddressForm((f) => ({ ...f, pincode: e.target.value.replace(/\D/g, '') }))} />
        </div>
        <div className="mt-4 flex justify-end">
          <Button variant="primary" icon={<Save className="h-4 w-4" />} loading={savingAddress} onClick={saveAddress}>Save Address</Button>
        </div>
      </Card>

      {/* Banking */}
      <Card className="p-6 mb-4">
        <h3 className="font-display text-lg font-bold text-navy-900 mb-4 flex items-center gap-2">
          <Landmark className="h-5 w-5 text-navy-400" /> Banking
        </h3>
        {!bankLoading && bankAccount && !editingBank ? (
          <div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3 bg-navy-50/50 rounded-lg border border-navy-100/50">
                <p className="text-xs text-navy-400 mb-1">Account Holder</p>
                <p className="text-sm font-medium text-navy-900">{bankAccount.account_holder_name}</p>
              </div>
              <div className="p-3 bg-navy-50/50 rounded-lg border border-navy-100/50">
                <p className="text-xs text-navy-400 mb-1">Bank</p>
                <p className="text-sm font-medium text-navy-900">{bankAccount.bank_name}{bankAccount.branch ? ` — ${bankAccount.branch}` : ''}</p>
              </div>
              <div className="p-3 bg-navy-50/50 rounded-lg border border-navy-100/50">
                <p className="text-xs text-navy-400 mb-1">Account Number</p>
                <p className="text-sm font-mono font-medium text-navy-900">•••• {bankAccount.account_number_last4}</p>
              </div>
              <div className="p-3 bg-navy-50/50 rounded-lg border border-navy-100/50">
                <p className="text-xs text-navy-400 mb-1">IFSC</p>
                <p className="text-sm font-mono font-medium text-navy-900">{bankAccount.ifsc_code}</p>
              </div>
              <div className="p-3 bg-navy-50/50 rounded-lg border border-navy-100/50">
                <p className="text-xs text-navy-400 mb-1">Verification</p>
                <Badge variant={bankAccount.verified ? 'success' : 'warning'}>{bankAccount.verified ? 'Verified' : 'Pending Verification'}</Badge>
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <Button variant="secondary" onClick={() => setEditingBank(true)}>Update Bank Details</Button>
            </div>
          </div>
        ) : (
          <div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="Account Holder Name" value={bankForm.account_holder_name} error={bankErrors.account_holder_name}
                onChange={(e) => setBankForm((f) => ({ ...f, account_holder_name: e.target.value }))} />
              <Input label="Bank Name" value={bankForm.bank_name} error={bankErrors.bank_name}
                onChange={(e) => setBankForm((f) => ({ ...f, bank_name: e.target.value }))} />
              <Input label="Account Number" type="password" value={bankForm.account_number} error={bankErrors.account_number}
                onChange={(e) => setBankForm((f) => ({ ...f, account_number: e.target.value.replace(/\D/g, '') }))} />
              <Input label="Confirm Account Number" type="password" value={bankForm.confirm_account_number} error={bankErrors.confirm_account_number}
                onChange={(e) => setBankForm((f) => ({ ...f, confirm_account_number: e.target.value.replace(/\D/g, '') }))} />
              <Input label="IFSC Code" value={bankForm.ifsc_code} error={bankErrors.ifsc_code}
                onChange={(e) => setBankForm((f) => ({ ...f, ifsc_code: e.target.value.toUpperCase() }))} />
              <Input label="Branch" value={bankForm.branch}
                onChange={(e) => setBankForm((f) => ({ ...f, branch: e.target.value }))} />
              <Select label="Account Type" value={bankForm.account_type}
                onChange={(e) => setBankForm((f) => ({ ...f, account_type: e.target.value }))}>
                <option value="savings">Savings</option>
                <option value="current">Current</option>
              </Select>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              {bankAccount && (
                <Button variant="ghost" onClick={() => setEditingBank(false)}>Cancel</Button>
              )}
              <Button variant="primary" icon={<Save className="h-4 w-4" />} loading={savingBank} onClick={saveBank}>Save Bank Details</Button>
            </div>
          </div>
        )}
      </Card>

      {/* Documents */}
      <Card className="p-6">
        <h3 className="font-display text-lg font-bold text-navy-900 mb-4 flex items-center gap-2">
          <FileText className="h-5 w-5 text-navy-400" /> Documents
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {DOCUMENT_TYPES.map(({ type, label }) => {
            const latest = latestByType(type);
            return (
              <div key={type}>
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-sm font-medium text-navy-600">{label}</p>
                  {latest && <DocStatusBadge status={latest.status} />}
                </div>
                {latest?.status === 'rejected' && latest.rejection_reason && (
                  <p className="text-xs text-error-600 mb-1.5">{latest.rejection_reason}</p>
                )}
                <DocumentUploadArea
                  label=""
                  hint="JPG, PNG or PDF — max 10MB"
                  file={null}
                  onChange={(f) => uploadDocument(type, f)}
                />
                {uploadingType === type && <p className="text-xs text-navy-400 mt-1">Uploading…</p>}
              </div>
            );
          })}
        </div>
      </Card>
    </DashboardLayout>
  );
}
