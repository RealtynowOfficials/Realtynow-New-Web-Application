import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  Phone,
  MapPin,
  Camera,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  SkipForward,
  CreditCard,
  Sparkles,
  Home,
  Upload,
  X,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { ensureUserProfile } from '../../lib/profile-utils';
import { Button } from '../../components/ui';
import { uploadFile } from '../../lib/storage';
import type { KycIdType } from '../../lib/types';

const KYC_TYPES: { value: KycIdType; label: string }[] = [
  { value: 'aadhaar', label: 'Aadhaar Card' },
  { value: 'pan', label: 'PAN Card' },
  { value: 'passport', label: 'Passport' },
  { value: 'voter_id', label: 'Voter ID' },
  { value: 'driving_license', label: 'Driving License' },
];

const STEPS = [
  { id: 1, label: 'Basic Profile', icon: User, desc: 'Name, phone & photo' },
  { id: 2, label: 'Location', icon: MapPin, desc: 'Your city & address' },
  { id: 3, label: 'KYC (Optional)', icon: ShieldCheck, desc: 'ID verification' },
  { id: 4, label: 'Done!', icon: Sparkles, desc: 'Profile complete' },
];

function StepDot({ s, current }: { s: (typeof STEPS)[number]; current: number }) {
  const done = current > s.id;
  const active = current === s.id;
  return (
    <div className="flex flex-col items-center gap-1 min-w-[64px]">
      <div
        className={`h-10 w-10 rounded-full flex items-center justify-center border-2 transition-all ${done ? 'bg-success-500 border-success-500' : active ? 'bg-gold-400 border-gold-400' : 'bg-transparent border-white/20'}`}
      >
        {done ? (
          <CheckCircle2 className="h-5 w-5 text-white" />
        ) : (
          <s.icon className={`h-5 w-5 ${active ? 'text-white' : 'text-navy-400'}`} />
        )}
      </div>
      <span
        className={`text-[10px] text-center leading-tight ${active ? 'text-gold-300 font-semibold' : done ? 'text-success-400' : 'text-navy-500'}`}
      >
        {s.label}
      </span>
    </div>
  );
}

export function ProfileSetupPage() {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1
  const [firstName, setFirstName] = useState(profile?.first_name ?? '');
  const [lastName, setLastName] = useState(profile?.last_name ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState(profile?.avatar_url ?? '');

  // Step 2
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');

  // Step 3 – KYC
  const [kycType, setKycType] = useState<KycIdType>('aadhaar');
  const [kycNumber, setKycNumber] = useState('');
  const [kycFront, setKycFront] = useState<File | null>(null);
  const [kycBack, setKycBack] = useState<File | null>(null);
  const [skipKyc, setSkipKyc] = useState(false);

  const handleAvatarChange = (f: File | null) => {
    setAvatarFile(f);
    if (f) setAvatarPreview(URL.createObjectURL(f));
  };

  const saveStep1 = async () => {
    if (!firstName.trim()) {
      setError('First name is required');
      return false;
    }
    if (!user) return false;
    setSaving(true);
    setError(null);
    try {
      await ensureUserProfile(user.id);
      let avatar_url = profile?.avatar_url ?? null;
      if (avatarFile) {
        const r = await uploadFile('profile-images', avatarFile, `${user.id}/avatar`);
        if (r.error) throw new Error(r.error);
        avatar_url = r.url;
      }
      const { error: e } = await supabase
        .from('profiles')
        .upsert(
          {
            id: user.id,
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            phone: phone.trim() || null,
            bio: bio.trim() || null,
            avatar_url,
            status: 'active',
          },
          { onConflict: 'id' }
        );
      if (e) throw new Error(e.message);
      await refreshProfile();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const saveStep2 = async () => {
    if (!user) return false;
    setSaving(true);
    setError(null);
    try {
      const { error: e } = await supabase
        .from('profiles')
        .update({
          company: city.trim() || null, // reusing company for city temporarily
        })
        .eq('id', user.id);
      // In a full implementation you'd have a separate address table
      if (e) throw new Error(e.message);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const saveKyc = async () => {
    if (skipKyc) return true;
    if (!user) return false;
    setSaving(true);
    setError(null);
    try {
      let front_url: string | null = null;
      let back_url: string | null = null;

      if (kycFront) {
        const r = await uploadFile('customer-documents', kycFront, `${user.id}/kyc-front`);
        if (r.error) throw new Error(r.error);
        front_url = r.url || r.path;
      }
      if (kycBack) {
        const r = await uploadFile('customer-documents', kycBack, `${user.id}/kyc-back`);
        if (r.error) throw new Error(r.error);
        back_url = r.url || r.path;
      }

      const { error: e } = await supabase.from('kyc_verifications').upsert(
        {
          user_id: user.id,
          id_type: kycType,
          id_number: kycNumber.trim() || null,
          front_url,
          back_url,
          status: 'pending',
        },
        { onConflict: 'user_id' },
      );
      if (e) throw new Error(e.message);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save KYC');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const next = async () => {
    let ok = true;
    if (step === 1) ok = await saveStep1();
    if (step === 2) ok = await saveStep2();
    if (step === 3) ok = await saveKyc();
    if (ok) setStep((s) => s + 1);
  };

  const goToDashboard = () => navigate('/portal');

  return (
    <div className="min-h-screen bg-gradient-to-br from-navy-50 to-white">
      {/* Top bar */}
      <header className="border-b border-navy-100 bg-white/80 backdrop-blur-sm px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <Home className="h-5 w-5 text-navy-400" />
          <span className="text-sm font-medium text-navy-600">Profile Setup</span>
        </div>
        {step < 4 && (
          <button onClick={goToDashboard} className="text-sm text-navy-400 hover:text-navy-700 flex items-center gap-1">
            Skip for now <SkipForward className="h-3.5 w-3.5" />
          </button>
        )}
      </header>

      <div className="max-w-2xl mx-auto px-4 py-10">
        {/* Step indicators */}
        <div className="flex items-center justify-between mb-12 relative">
          {/* connector line */}
          <div className="absolute top-5 left-10 right-10 h-0.5 bg-navy-100 z-0">
            <div
              className="h-full bg-gold-400 transition-all duration-500"
              style={{ width: `${((step - 1) / (STEPS.length - 1)) * 100}%` }}
            />
          </div>
          {STEPS.map((s) => (
            <StepDot key={s.id} s={s} current={step} />
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.3 }}
          >
            {/* STEP 1 – Basic Profile */}
            {step === 1 && (
              <div className="card p-8">
                <h2 className="font-display text-2xl font-bold text-navy-900">Complete your profile</h2>
                <p className="mt-1 text-sm text-navy-500">Add a photo and your basic details to get started</p>

                {/* Avatar */}
                <div className="mt-6 flex flex-col items-center gap-3">
                  <div className="relative">
                    <div className="h-24 w-24 rounded-full bg-navy-100 overflow-hidden border-4 border-white shadow-md">
                      {avatarPreview ? (
                        <img src={avatarPreview} alt="Avatar" className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center">
                          <User className="h-10 w-10 text-navy-400" />
                        </div>
                      )}
                    </div>
                    <label className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full bg-gold-400 flex items-center justify-center cursor-pointer shadow hover:bg-gold-500 transition-colors">
                      <Camera className="h-4 w-4 text-white" />
                      <input
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        onChange={(e) => handleAvatarChange(e.target.files?.[0] ?? null)}
                      />
                    </label>
                  </div>
                  {avatarPreview && (
                    <button
                      onClick={() => {
                        setAvatarFile(null);
                        setAvatarPreview('');
                      }}
                      className="text-xs text-error-500 hover:underline"
                    >
                      Remove photo
                    </button>
                  )}
                </div>

                <div className="mt-6 space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-navy-700 mb-1.5">First Name *</label>
                      <input
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        className="input w-full"
                        placeholder="Priya"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-navy-700 mb-1.5">Last Name</label>
                      <input
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        className="input w-full"
                        placeholder="Sharma"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-navy-700 mb-1.5">
                      <Phone className="inline h-3.5 w-3.5 mr-1" />
                      Mobile Number
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="input w-full"
                      placeholder="+91 98000 00000"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-navy-700 mb-1.5">About You (optional)</label>
                    <textarea
                      rows={2}
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      className="input w-full resize-none"
                      placeholder="Tell us a little about yourself…"
                    />
                  </div>
                </div>
                {error && <p className="mt-3 text-sm text-error-600">{error}</p>}
              </div>
            )}

            {/* STEP 2 – Location */}
            {step === 2 && (
              <div className="card p-8">
                <h2 className="font-display text-2xl font-bold text-navy-900">Your Location</h2>
                <p className="mt-1 text-sm text-navy-500">Help us show properties relevant to you</p>
                <div className="mt-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-navy-700 mb-1.5">
                      <MapPin className="inline h-3.5 w-3.5 mr-1" />
                      City
                    </label>
                    <input
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="input w-full"
                      placeholder="Hyderabad"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-navy-700 mb-1.5">Area / Locality (optional)</label>
                    <input
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="input w-full"
                      placeholder="Banjara Hills"
                    />
                  </div>
                  <div className="rounded-xl border border-navy-100 bg-navy-50 p-4 text-sm text-navy-600">
                    <MapPin className="h-4 w-4 text-gold-500 mb-1" />
                    <p className="font-medium text-navy-800">Why we ask this</p>
                    <p className="mt-0.5 text-xs">
                      We use your location to personalize property recommendations and connect you with local agents.
                    </p>
                  </div>
                </div>
                {error && <p className="mt-3 text-sm text-error-600">{error}</p>}
              </div>
            )}

            {/* STEP 3 – KYC */}
            {step === 3 && (
              <div className="card p-8">
                <div className="flex items-start justify-between gap-3 mb-1">
                  <h2 className="font-display text-2xl font-bold text-navy-900">Identity Verification</h2>
                  <span className="badge bg-navy-100 text-navy-600 text-xs">Optional</span>
                </div>
                <p className="text-sm text-navy-500">
                  Verify your identity to get a trust badge and unlock premium features
                </p>

                {/* Toggle skip */}
                <div className="mt-5 flex items-center gap-3 p-4 rounded-xl border border-navy-100 bg-navy-50">
                  <input
                    type="checkbox"
                    id="skip-kyc"
                    checked={skipKyc}
                    onChange={(e) => setSkipKyc(e.target.checked)}
                    className="h-4 w-4 rounded border-navy-300 text-red-600 focus:ring-red-400 accent-red-600 cursor-pointer"
                  />
                  <label htmlFor="skip-kyc" className="text-sm text-navy-700 cursor-pointer">
                    Skip KYC for now — I'll do this later from my profile settings
                  </label>
                </div>

                {!skipKyc && (
                  <div className="mt-5 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-navy-700 mb-1.5">Document Type</label>
                      <select
                        value={kycType}
                        onChange={(e) => setKycType(e.target.value as KycIdType)}
                        className="input w-full"
                      >
                        {KYC_TYPES.map((t) => (
                          <option key={t.value} value={t.value}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-navy-700 mb-1.5">
                        Document Number (optional)
                      </label>
                      <input
                        value={kycNumber}
                        onChange={(e) => setKycNumber(e.target.value)}
                        className="input w-full"
                        placeholder="Enter your document number"
                      />
                    </div>

                    {/* Front upload */}
                    <div>
                      <label className="block text-sm font-medium text-navy-700 mb-1.5">Upload Front Side *</label>
                      <label className="flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-navy-200 bg-navy-50 px-4 py-5 cursor-pointer hover:border-gold-400 hover:bg-gold-50/30 transition-all">
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          className="sr-only"
                          onChange={(e) => setKycFront(e.target.files?.[0] ?? null)}
                        />
                        {kycFront ? (
                          <div className="flex items-center gap-2 text-success-600">
                            <CheckCircle2 className="h-5 w-5" />
                            <span className="text-sm">{kycFront.name}</span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                setKycFront(null);
                              }}
                              className="text-navy-400 hover:text-error-500"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <>
                            <Upload className="h-5 w-5 text-navy-400" />
                            <span className="text-sm text-navy-500">Click to upload front</span>
                          </>
                        )}
                      </label>
                    </div>

                    {/* Back upload */}
                    <div>
                      <label className="block text-sm font-medium text-navy-700 mb-1.5">
                        Upload Back Side (if applicable)
                      </label>
                      <label className="flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-navy-200 bg-navy-50 px-4 py-5 cursor-pointer hover:border-gold-400 hover:bg-gold-50/30 transition-all">
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          className="sr-only"
                          onChange={(e) => setKycBack(e.target.files?.[0] ?? null)}
                        />
                        {kycBack ? (
                          <div className="flex items-center gap-2 text-success-600">
                            <CheckCircle2 className="h-5 w-5" />
                            <span className="text-sm">{kycBack.name}</span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                setKycBack(null);
                              }}
                              className="text-navy-400 hover:text-error-500"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <>
                            <Upload className="h-5 w-5 text-navy-400" />
                            <span className="text-sm text-navy-500">Click to upload back (optional)</span>
                          </>
                        )}
                      </label>
                    </div>

                    <div className="rounded-xl border border-gold-200 bg-gold-50 p-3 text-xs text-gold-800 flex items-start gap-2">
                      <ShieldCheck className="h-4 w-4 mt-0.5 flex-shrink-0 text-gold-600" />
                      <p>
                        Your documents are encrypted and only accessible by our verification team. KYC review takes 1–2
                        business days.
                      </p>
                    </div>
                  </div>
                )}
                {error && <p className="mt-3 text-sm text-error-600">{error}</p>}
              </div>
            )}

            {/* STEP 4 – Done */}
            {step === 4 && (
              <div className="card p-10 text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                  className="h-24 w-24 mx-auto rounded-full bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center mb-6 shadow-lg"
                >
                  <CheckCircle2 className="h-12 w-12 text-white" />
                </motion.div>
                <h2 className="font-display text-2xl font-bold text-navy-900">Profile Complete! 🎉</h2>
                <p className="mt-2 text-navy-500">
                  You're all set,{' '}
                  <span className="font-semibold text-navy-700">{firstName || profile?.first_name}</span>! Start
                  exploring properties or list your own.
                </p>
                <div className="mt-6 grid grid-cols-3 gap-3">
                  {[
                    { icon: Home, label: 'Browse Properties', to: '/search' },
                    { icon: Sparkles, label: 'AI Recommendations', to: '/portal' },
                    { icon: CreditCard, label: 'Pick a Plan', to: '/portal/subscription' },
                  ].map(({ icon: Icon, label, to }) => (
                    <Link
                      key={to}
                      to={to}
                      className="rounded-xl border border-navy-100 bg-navy-50 p-4 text-center hover:border-gold-300 hover:bg-gold-50/30 transition-all group"
                    >
                      <Icon className="h-6 w-6 text-navy-400 mx-auto mb-2 group-hover:text-gold-500 transition-colors" />
                      <p className="text-xs text-navy-600 font-medium">{label}</p>
                    </Link>
                  ))}
                </div>
                <Button
                  variant="gold"
                  size="lg"
                  className="mt-8 w-full"
                  onClick={goToDashboard}
                  icon={<Sparkles className="h-4 w-4" />}
                >
                  Go to My Dashboard
                </Button>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        {step < 4 && (
          <div className="mt-6 flex items-center justify-between">
            {step > 1 ? (
              <button
                onClick={() => setStep((s) => s - 1)}
                className="flex items-center gap-2 text-sm text-navy-500 hover:text-navy-800 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" /> Back
              </button>
            ) : (
              <div />
            )}
            <Button variant="gold" size="lg" loading={saving} icon={<ArrowRight className="h-4 w-4" />} onClick={next}>
              {step === 3 ? (skipKyc ? 'Complete Setup' : 'Submit KYC') : 'Continue'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
