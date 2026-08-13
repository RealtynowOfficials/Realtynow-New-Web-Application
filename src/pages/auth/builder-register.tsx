import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2,
  FileText,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  BadgeCheck,
  Landmark,
  Upload,
  X,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/ui';
import { Logo, LogoLight } from '../../components/logo';
import { uploadFile } from '../../lib/storage';
import { uploadProfilePhoto } from '../../lib/profile-photo';
import { getFriendlyErrorMessage } from '../../lib/utils';
import { useServiceStatus, SERVICE_KEYS } from '../../lib/service-status';
import { ServiceUnavailable } from '../../components/service-unavailable';

const STEPS = [
  { id: 1, label: 'Company Info', icon: Building2 },
  { id: 2, label: 'Legal Details', icon: Landmark },
  { id: 3, label: 'Documents', icon: FileText },
  { id: 4, label: 'Review & Submit', icon: CheckCircle2 },
];

interface FormData {
  company_name: string;
  contact_name: string;
  email: string;
  phone: string;
  city: string;
  established_year: string;
  website_url: string;
  description: string;
  gst_number: string;
  rera_number: string;
  pan_number: string;
  gst_doc: File | null;
  rera_doc: File | null;
  pan_doc: File | null;
  logo: File | null;
}

const INITIAL: FormData = {
  company_name: '',
  contact_name: '',
  email: '',
  phone: '',
  city: '',
  established_year: '',
  website_url: '',
  description: '',
  gst_number: '',
  rera_number: '',
  pan_number: '',
  gst_doc: null,
  rera_doc: null,
  pan_doc: null,
  logo: null,
};

function DarkInput({
  label,
  required,
  error,
  hint,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string; required?: boolean; error?: string; hint?: string }) {
  return (
    <div>
      <label className="block text-sm font-medium text-navy-600 mb-1.5">
        {label}
        {required && ' *'}
      </label>
      <input
        {...props}
        className="w-full rounded-lg border border-navy-200 bg-white shadow-sm px-3.5 py-2.5 text-sm text-navy-900 placeholder:text-navy-500 focus:border-gold-500 focus:outline-none focus:ring-2 focus:ring-gold-500/30"
      />
      {hint && <p className="mt-1 text-xs text-navy-500">{hint}</p>}
      {error && <p className="mt-1 text-xs text-error-600">{error}</p>}
    </div>
  );
}

function DocUpload({
  label,
  hint,
  file,
  onChange,
}: {
  label: string;
  hint: string;
  file: File | null;
  onChange: (f: File | null) => void;
}) {
  return (
    <div>
      <p className="text-sm font-medium text-navy-600 mb-1.5">{label}</p>
      <label className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-navy-200 bg-navy-50/50 px-4 py-5 cursor-pointer hover:border-gold-400 hover:bg-gold-500/5 transition-all">
        <input
          type="file"
          accept="image/*,.pdf"
          className="sr-only"
          onChange={(e) => onChange(e.target.files?.[0] ?? null)}
        />
        {file ? (
          <div className="flex items-center gap-2 text-gold-600">
            <CheckCircle2 className="h-5 w-5" />
            <span className="text-sm truncate max-w-[200px]">{file.name}</span>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                onChange(null);
              }}
              className="text-navy-400 hover:text-error-400"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <>
            <Upload className="h-6 w-6 text-navy-400" />
            <span className="text-sm text-navy-600">Click to upload</span>
            <span className="text-xs text-navy-500">{hint}</span>
          </>
        )}
      </label>
    </div>
  );
}

function AvatarUploadArea({
  file,
  onChange,
}: {
  file: File | null;
  onChange: (f: File | null) => void;
}) {
  const previewUrl = file ? URL.createObjectURL(file) : null;
  return (
    <div>
      <p className="text-sm font-medium text-navy-600 mb-1.5">Company Logo / Profile Photo (optional)</p>
      <div className="flex items-center gap-4">
        <label className="relative h-20 w-20 rounded-full border-2 border-dashed border-navy-200 bg-navy-50/50 grid place-items-center cursor-pointer hover:border-gold-400 hover:bg-gold-500/5 transition-all overflow-hidden shrink-0">
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={(e) => onChange(e.target.files?.[0] ?? null)}
          />
          {previewUrl ? (
            <img src={previewUrl} alt="Logo preview" className="h-full w-full object-cover" />
          ) : (
            <Upload className="h-6 w-6 text-navy-400" />
          )}
        </label>
        <div className="flex-1">
          <p className="text-xs text-navy-500">JPG, PNG or WEBP — max 5MB — displayed on your profile</p>
          {file && (
            <button
              type="button"
              onClick={() => onChange(null)}
              className="mt-1 flex items-center gap-1 text-xs text-navy-400 hover:text-error-400"
            >
              <X className="h-3.5 w-3.5" /> Remove
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function BuilderRegisterPage() {
  const { isActive: builderServiceActive, loading: builderServiceLoading } = useServiceStatus(SERVICE_KEYS.BUILDER);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormData>(INITIAL);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  // Synchronous guard against double-submit — see agent-register.tsx for why
  // React state alone isn't enough here.
  const submittingRef = useRef(false);

  const set = (key: keyof FormData, val: string | File | null) => setForm((f) => ({ ...f, [key]: val }));

  const validateStep = () => {
    const errs: Partial<Record<keyof FormData, string>> = {};
    if (step === 1) {
      if (!form.company_name.trim()) errs.company_name = 'Required';
      if (!form.contact_name.trim()) errs.contact_name = 'Required';
      if (!form.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) errs.email = 'Valid email required';
      if (form.phone.replace(/\D/g, '').length < 10) errs.phone = 'Valid phone required';
    }
    if (step === 2) {
      if (!form.gst_number.trim()) errs.gst_number = 'GST number required';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const next = () => {
    if (validateStep()) setStep((s) => s + 1);
  };
  const prev = () => setStep((s) => s - 1);

  const submit = async () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setLoading(true);
    setServerError(null);
    try {
      let gst_doc_url: string | null = null;
      let rera_doc_url: string | null = null;
      let pan_doc_url: string | null = null;
      let logo_url: string | null = null;

      // Store the permanent storage PATH, not the temporary signed URL —
      // the admin portal generates fresh signed URLs on-demand when previewing.
      // crypto.randomUUID() (not Date.now()) guarantees a unique path even if two
      // uploads race (e.g. a fast double-click on Submit) — storage.objects has a
      // unique (bucket_id, name) constraint, and a timestamp-only path let two
      // concurrent uploads collide on it.
      const uploadDoc = async (file: File | null, prefix: string) => {
        if (!file) return null;
        const r = await uploadFile('builder-documents', file, `applications/${prefix}-${crypto.randomUUID()}-${file.name}`);
        if (r.error) throw new Error(r.error);
        return r.path || null;
      };

      gst_doc_url = await uploadDoc(form.gst_doc, 'gst');
      rera_doc_url = await uploadDoc(form.rera_doc, 'rera');
      pan_doc_url = await uploadDoc(form.pan_doc, 'pan');

      if (form.logo) {
        // Best-effort: logo upload failure must never block submission of the
        // (required) application itself.
        const r = await uploadProfilePhoto(form.logo, 'builder');
        if (!r.error) logo_url = r.url;
        else console.warn('Logo upload failed:', r.error);
      }

      const { error } = await supabase.from('builder_applications').insert({
        // Explicit, not relying on the column default — a prior mismatch between
        // the default ('pending') and the status CHECK constraint (pipeline
        // stages starting at 'submitted') made every insert fail silently.
        status: 'submitted',
        company_name: form.company_name.trim(),
        contact_name: form.contact_name.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim(),
        city: form.city.trim() || null,
        established_year: form.established_year ? Number(form.established_year) : null,
        website_url: form.website_url.trim() || null,
        description: form.description.trim() || null,
        gst_number: form.gst_number.trim() || null,
        rera_number: form.rera_number.trim() || null,
        gst_doc_url,
        rera_doc_url,
        pan_doc_url,
        logo_url,
      });
      if (error) throw new Error(error.message);
      setSubmitted(true);
    } catch (e: unknown) {
      setServerError(getFriendlyErrorMessage(e));
    } finally {
      submittingRef.current = false;
      setLoading(false);
    }
  };

  if (!builderServiceLoading && !builderServiceActive) {
    return <ServiceUnavailable serviceName="Builder Service" />;
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-navy-50 flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md text-center"
        >
          <div className="h-24 w-24 mx-auto rounded-full bg-gold-500/20 flex items-center justify-center mb-6">
            <CheckCircle2 className="h-12 w-12 text-gold-600" />
          </div>
          <h1 className="font-display text-3xl font-bold text-navy-900">Application Received!</h1>
          <p className="mt-3 text-navy-600">
            Thank you, <span className="text-gold-300 font-semibold">{form.company_name}</span>! We'll verify your
            company and GST details. Expect to hear from us at <span className="text-gold-300">{form.email}</span>{' '}
            within 3–5 business days.
          </p>
          <div className="mt-6 grid grid-cols-3 gap-3">
            {[
              { icon: Building2, label: 'Company Verified' },
              { icon: BadgeCheck, label: 'GST Verified' },
              { icon: ShieldCheck, label: 'RERA Checked' },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="rounded-xl border border-navy-200 bg-navy-50/50 p-3 text-center">
                <Icon className="h-5 w-5 text-gold-600 mx-auto mb-1" />
                <p className="text-xs text-navy-500">{label}</p>
              </div>
            ))}
          </div>
          <Link to="/" className="mt-8 inline-block">
            <Button variant="primary" size="lg">
              Back to Home
            </Button>
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-navy-50">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 right-0 h-96 w-96 rounded-full bg-gold-500/10 blur-3xl" />
        <div className="absolute bottom-0 -left-20 h-96 w-96 rounded-full bg-navy-700/20 blur-3xl" />
      </div>

      <div className="relative grid lg:grid-cols-[360px,1fr] min-h-screen">
        {/* LEFT PANEL */}
        <div className="hidden lg:flex flex-col justify-between bg-gradient-to-br from-navy-950 via-navy-900 to-navy-800 border-r border-navy-800 p-10 relative overflow-hidden z-10">
          <LogoLight to="/" size={220} />
          <div>
            <div className="h-14 w-14 rounded-2xl bg-gold-400/20 grid place-items-center mb-4">
              <Building2 className="h-7 w-7 text-gold-400" />
            </div>
            <h2 className="font-display text-3xl font-bold text-white leading-tight">
              Register Your Real Estate Company
            </h2>
            <p className="mt-3 text-navy-200 text-sm leading-relaxed">
              List your projects, manage leads, and grow your developer brand on RealtyNow.
            </p>
            <ul className="mt-8 space-y-3">
              {[
                'Showcase unlimited projects & units',
                'Verified builder badge & trust seal',
                'Priority search placement',
                'Dedicated relationship manager',
                'Real-time lead analytics',
              ].map((t) => (
                <li key={t} className="flex items-center gap-2 text-sm text-navy-200">
                  <CheckCircle2 className="h-4 w-4 text-gold-400 flex-shrink-0" /> {t}
                </li>
              ))}
            </ul>
          </div>
          <div className="space-y-2">
            <p className="text-xs text-navy-400 uppercase tracking-wide font-semibold">Progress</p>
            {STEPS.map((s) => (
              <div
                key={s.id}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all ${step === s.id ? 'bg-gold-400/20 text-gold-300' : step > s.id ? 'text-success-400' : 'text-navy-500'}`}
              >
                <s.icon className="h-4 w-4 flex-shrink-0" />
                <span className="text-sm">{s.label}</span>
                {step > s.id && <CheckCircle2 className="h-3.5 w-3.5 ml-auto" />}
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div className="flex items-start justify-center px-6 py-12 overflow-y-auto">
          <div className="w-full max-w-lg">
            <div className="lg:hidden flex justify-center mb-8">
              <Logo to="/" size={220} />
            </div>
            <div className="lg:hidden flex gap-2 mb-6 justify-center">
              {STEPS.map((s) => (
                <div
                  key={s.id}
                  className={`h-2 rounded-full transition-all ${step === s.id ? 'w-8 bg-gold-500' : step > s.id ? 'w-4 bg-success-500' : 'w-4 bg-white/20'}`}
                />
              ))}
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
              >
                {step === 1 && (
                  <div>
                    <h1 className="font-display text-2xl font-bold text-navy-900">Company Information</h1>
                    <p className="mt-1 text-sm text-navy-500">Basic details about your organization</p>
                    <div className="mt-6 space-y-4">
                      <DarkInput
                        label="Company / Developer Name"
                        required
                        value={form.company_name}
                        onChange={(e) => set('company_name', e.target.value)}
                        placeholder="Prestige Estates Pvt Ltd"
                        error={errors.company_name}
                      />
                      <DarkInput
                        label="Primary Contact Name"
                        required
                        value={form.contact_name}
                        onChange={(e) => set('contact_name', e.target.value)}
                        placeholder="Rahul Mehta"
                        error={errors.contact_name}
                      />
                      <div className="grid grid-cols-2 gap-3">
                        <DarkInput
                          label="Business Email"
                          required
                          type="email"
                          value={form.email}
                          onChange={(e) => set('email', e.target.value)}
                          placeholder="info@company.com"
                          error={errors.email}
                        />
                        <DarkInput
                          label="Phone"
                          required
                          type="tel"
                          value={form.phone}
                          onChange={(e) => set('phone', e.target.value)}
                          placeholder="+91 90000 00000"
                          error={errors.phone}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <DarkInput
                          label="City / HQ"
                          value={form.city}
                          onChange={(e) => set('city', e.target.value)}
                          placeholder="Hyderabad"
                        />
                        <DarkInput
                          label="Established Year"
                          type="number"
                          value={form.established_year}
                          onChange={(e) => set('established_year', e.target.value)}
                          placeholder="2005"
                        />
                      </div>
                      <DarkInput
                        label="Website"
                        type="url"
                        value={form.website_url}
                        onChange={(e) => set('website_url', e.target.value)}
                        placeholder="https://www.company.com"
                      />
                      <div>
                        <label className="block text-sm font-medium text-navy-600 mb-1.5">Company Description</label>
                        <textarea
                          rows={3}
                          value={form.description}
                          onChange={(e) => set('description', e.target.value)}
                          className="w-full rounded-lg border border-navy-200 bg-white shadow-sm px-3.5 py-2.5 text-sm text-navy-900 placeholder:text-navy-500 focus:border-gold-500 focus:outline-none focus:ring-2 focus:ring-gold-500/30 resize-none"
                          placeholder="Tell buyers about your company, portfolio, and signature projects…"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {step === 2 && (
                  <div>
                    <h1 className="font-display text-2xl font-bold text-navy-900">Legal & Compliance</h1>
                    <p className="mt-1 text-sm text-navy-500">Government registration numbers for verification</p>
                    <div className="mt-6 space-y-4">
                      <DarkInput
                        label="GST Number"
                        required
                        value={form.gst_number}
                        onChange={(e) => set('gst_number', e.target.value)}
                        placeholder="27AABCU9603R1ZX"
                        hint="15-digit GST Identification Number"
                        error={errors.gst_number}
                      />
                      <DarkInput
                        label="RERA Registration Number"
                        value={form.rera_number}
                        onChange={(e) => set('rera_number', e.target.value)}
                        placeholder="RERA/AP/PROJ/XXXXXX"
                        hint="Real Estate Regulatory Authority project/company registration"
                      />
                      <DarkInput
                        label="PAN Number"
                        value={form.pan_number}
                        onChange={(e) => set('pan_number', e.target.value)}
                        placeholder="AABCU9603R"
                        hint="Company PAN (10 characters)"
                      />
                      <div className="rounded-xl border border-gold-200 bg-gold-500/5 p-4 text-xs text-navy-500">
                        <BadgeCheck className="h-4 w-4 text-gold-600 mb-1.5" />
                        <p className="text-navy-900 font-semibold">Why we collect this?</p>
                        <p className="mt-1">
                          These details are required to verify your legal business entity and display the "Verified
                          Builder" badge on your listings.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {step === 3 && (
                  <div>
                    <h1 className="font-display text-2xl font-bold text-navy-900">Supporting Documents</h1>
                    <p className="mt-1 text-sm text-navy-500">Upload supporting documents for verification</p>
                    <div className="mt-6 space-y-5">
                      <DocUpload
                        label="GST Certificate *"
                        hint="PDF or image — max 10MB"
                        file={form.gst_doc}
                        onChange={(f) => set('gst_doc', f)}
                      />
                      <DocUpload
                        label="RERA Registration Certificate (if applicable)"
                        hint="PDF or image — max 10MB"
                        file={form.rera_doc}
                        onChange={(f) => set('rera_doc', f)}
                      />
                      <DocUpload
                        label="PAN Card / Company PAN (optional)"
                        hint="PDF or image — max 10MB"
                        file={form.pan_doc}
                        onChange={(f) => set('pan_doc', f)}
                      />
                      <AvatarUploadArea file={form.logo} onChange={(f) => set('logo', f)} />
                    </div>
                  </div>
                )}

                {step === 4 && (
                  <div>
                    <h1 className="font-display text-2xl font-bold text-navy-900">Review & Submit</h1>
                    <p className="mt-1 text-sm text-navy-500">Please confirm all details are correct</p>
                    <div className="mt-5 space-y-2">
                      {[
                        { label: 'Company', value: form.company_name },
                        { label: 'Contact', value: form.contact_name },
                        { label: 'Email', value: form.email },
                        { label: 'Phone', value: form.phone },
                        { label: 'City', value: form.city || '—' },
                        { label: 'Website', value: form.website_url || '—' },
                        { label: 'GST No.', value: form.gst_number || '—' },
                        { label: 'RERA No.', value: form.rera_number || '—' },
                        { label: 'GST Doc', value: form.gst_doc?.name ?? 'Not uploaded' },
                        { label: 'RERA Doc', value: form.rera_doc?.name ?? 'Not uploaded' },
                      ].map(({ label, value }) => (
                        <div
                          key={label}
                          className="flex justify-between items-start gap-4 rounded-lg border border-navy-200 bg-navy-50/50 px-4 py-2.5"
                        >
                          <span className="text-xs text-navy-500 w-24 flex-shrink-0">{label}</span>
                          <span className="text-sm text-navy-900 text-right break-all">{value}</span>
                        </div>
                      ))}
                    </div>
                    {serverError && (
                      <div className="mt-4 rounded-lg border border-error-500/30 bg-error-500/10 px-3 py-2 text-sm text-error-300">
                        {serverError}
                      </div>
                    )}
                    <p className="mt-4 text-xs text-navy-500">
                      By submitting, you agree to our{' '}
                      <Link to="/terms" className="text-gold-600 hover:underline">
                        Terms
                      </Link>{' '}
                      and{' '}
                      <Link to="/privacy" className="text-gold-600 hover:underline">
                        Privacy Policy
                      </Link>
                      .
                    </p>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            <div className="mt-8 flex items-center justify-between">
              {step > 1 ? (
                <button
                  onClick={prev}
                  className="flex items-center gap-2 text-sm text-navy-500 hover:text-navy-900 transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" /> Back
                </button>
              ) : (
                <Link to="/builder/login" className="text-sm text-navy-500 hover:text-navy-900 transition-colors">
                  Already registered?
                </Link>
              )}
              {step < 4 ? (
                <Button variant="primary" size="lg" icon={<ArrowRight className="h-4 w-4" />} onClick={next}>
                  Continue
                </Button>
              ) : (
                <Button
                  variant="primary"
                  size="lg"
                  loading={loading}
                  icon={<CheckCircle2 className="h-4 w-4" />}
                  onClick={submit}
                >
                  Submit Application
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
