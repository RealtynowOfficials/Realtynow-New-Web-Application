import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { PageLoader, EmptyState, Button, Input, Textarea } from '../../components/ui';
import { useToast } from '../../components/toast';
import {
  Building2, BadgeCheck, Award, Mail, Phone, ChevronRight, Home as HomeIcon, Send,
} from 'lucide-react';

function ContactBuilderForm({ builderUserId, builderName }: { builderUserId: string; builderName: string }) {
  const { addToast } = useToast();
  const [form, setForm] = useState({ name: '', email: '', phone: '', message: '' });
  const [sent, setSent] = useState(false);

  const submitLead = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('builder_leads').insert({
        builder_id: builderUserId,
        name: form.name.trim(),
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        message: form.message.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setSent(true);
      setForm({ name: '', email: '', phone: '', message: '' });
    },
    onError: (err: any) => addToast('error', err.message ?? 'Could not send your enquiry. Please try again.'),
  });

  if (sent) {
    return (
      <div className="rounded-2xl border border-green-200 bg-green-50 p-6 text-center">
        <p className="text-sm font-semibold text-green-800">Thanks! {builderName} will get back to you shortly.</p>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!form.name.trim() || (!form.email.trim() && !form.phone.trim())) {
          addToast('error', 'Please enter your name and either an email or phone number.');
          return;
        }
        submitLead.mutate();
      }}
      className="rounded-2xl border border-slate-200 bg-slate-50/60 p-6 space-y-3"
    >
      <p className="text-xs font-bold tracking-[0.2em] text-red-600 uppercase mb-1">Contact {builderName}</p>
      <Input
        label="Your name"
        value={form.name}
        onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
        required
      />
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Email"
          type="email"
          value={form.email}
          onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
        />
        <Input
          label="Phone"
          type="tel"
          value={form.phone}
          onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
        />
      </div>
      <Textarea
        label="Message (optional)"
        value={form.message}
        onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
        rows={3}
      />
      <Button type="submit" disabled={submitLead.isPending} className="w-full">
        <Send className="h-4 w-4" /> {submitLead.isPending ? 'Sending…' : 'Send Enquiry'}
      </Button>
    </form>
  );
}

export function BuilderProfilePage() {
  const { id } = useParams<{ id: string }>();

  const { data: builder, isLoading, isError } = useQuery({
    queryKey: ['builder-profile', id],
    queryFn: async () => {
      if (!id) return null;
      const { data } = await supabase
        .from('builders')
        .select('*')
        .eq('id', id)
        .eq('status', 'approved')
        .eq('public_visible', true)
        .maybeSingle();
      return data;
    },
    enabled: !!id,
  });

  const { data: projects, isLoading: projectsLoading } = useQuery({
    queryKey: ['builder-projects', id],
    queryFn: async () => {
      if (!id) return [];
      const { data } = await supabase.from('projects').select('*').eq('builder_id', id).order('created_at', { ascending: false });
      return data ?? [];
    },
    enabled: !!id,
  });

  useEffect(() => {
    if (builder) document.title = `${builder.name} | Verified Builder | RealtyNow`;
  }, [builder]);

  if (isLoading) return <PageLoader />;

  if (!builder || isError) {
    return (
      <div className="min-h-screen bg-slate-50 pt-24 pb-12">
        <div className="container-wide">
          <EmptyState
            icon={<HomeIcon className="h-8 w-8 text-slate-400" />}
            title="Builder not found"
            description="This builder profile doesn't exist or is no longer active."
            action={<Link to="/builders"><Button variant="secondary">Browse all builders</Button></Link>}
          />
        </div>
      </div>
    );
  }

  const experienceYears = builder.established_year ? new Date().getFullYear() - builder.established_year : null;

  return (
    <div className="min-h-screen bg-white pb-16">
      <div className="pt-24 pb-2">
        <div className="container-wide">
          <nav className="flex items-center gap-1.5 text-xs text-slate-400">
            <Link to="/" className="hover:text-slate-700 transition-colors">Home</Link>
            <ChevronRight className="h-3 w-3" />
            <Link to="/builders" className="hover:text-slate-700 transition-colors">Builders</Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-slate-600 font-medium">{builder.name}</span>
          </nav>
        </div>
      </div>

      {/* Hero */}
      <div className="container-wide">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative overflow-hidden rounded-[28px] min-h-[220px] sm:min-h-[280px] bg-gradient-to-br from-navy-950 via-navy-900 to-red-950"
        >
          {builder.cover_image && (
            <>
              <img src={builder.cover_image} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/35 to-black/10" />
            </>
          )}
          <div className="relative px-6 sm:px-10 pt-10 pb-10 flex items-center gap-5">
            <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-2xl bg-white border-2 border-white/40 shadow-2xl shrink-0 grid place-items-center overflow-hidden">
              {builder.logo_url ? (
                <img src={builder.logo_url} alt={builder.name} className="h-full w-full object-cover" />
              ) : (
                <Building2 className="h-10 w-10 text-navy-400" />
              )}
            </div>
            <div className="min-w-0">
              <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-white leading-tight">{builder.name}</h1>
              <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-white/10 backdrop-blur border border-white/20 px-2.5 py-1 text-[11px] font-bold text-white">
                <BadgeCheck className="h-3.5 w-3.5 text-gold-400" /> Verified RealtyNow Builder
              </span>
            </div>
          </div>
        </motion.div>
      </div>

      <div className="container-wide mt-8 space-y-10">
        {/* About */}
        <div className="grid lg:grid-cols-[1.4fr,1fr] gap-8">
          <div>
            <h2 className="font-display text-lg font-bold text-slate-900 mb-3">About {builder.name}</h2>
            <p className="text-sm leading-relaxed text-slate-600 whitespace-pre-line">
              {builder.description || `${builder.name} is a verified real estate developer on RealtyNow.`}
            </p>
          </div>
          <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-6">
            <p className="text-xs font-bold tracking-[0.2em] text-red-600 uppercase mb-4">Company Information</p>
            <dl className="space-y-4">
              {experienceYears != null && (
                <div>
                  <dt className="text-xs text-slate-400 uppercase tracking-wide">Experience</dt>
                  <dd className="mt-1 flex items-center gap-1.5 text-sm font-medium text-slate-800">
                    <Award className="h-4 w-4 text-slate-400" /> {experienceYears}+ Years (Est. {builder.established_year})
                  </dd>
                </div>
              )}
              {builder.contact_email && (
                <div>
                  <dt className="text-xs text-slate-400 uppercase tracking-wide">Email</dt>
                  <dd className="mt-1 flex items-center gap-1.5 text-sm font-medium text-slate-800">
                    <Mail className="h-4 w-4 text-slate-400" /> {builder.contact_email}
                  </dd>
                </div>
              )}
              {builder.contact_phone && (
                <div>
                  <dt className="text-xs text-slate-400 uppercase tracking-wide">Phone</dt>
                  <dd className="mt-1 flex items-center gap-1.5 text-sm font-medium text-slate-800">
                    <Phone className="h-4 w-4 text-slate-400" /> {builder.contact_phone}
                  </dd>
                </div>
              )}
            </dl>
            {(builder.contact_phone || builder.contact_email) && (
              <div className="mt-5 flex gap-2">
                {builder.contact_phone && (
                  <a href={`tel:${builder.contact_phone}`} className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-red-600 text-white hover:bg-red-700 transition-colors px-4 py-2.5 text-sm font-semibold">
                    <Phone className="h-4 w-4" /> Contact
                  </a>
                )}
                {builder.contact_email && (
                  <a href={`mailto:${builder.contact_email}`} className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-800 hover:text-white transition-colors px-4 py-2.5 text-sm font-semibold">
                    <Mail className="h-4 w-4" /> Email
                  </a>
                )}
              </div>
            )}
          </div>
          {builder.user_id && <ContactBuilderForm builderUserId={builder.user_id} builderName={builder.name} />}
          </div>
        </div>

        {/* Projects */}
        <div>
          <h2 className="font-display text-lg font-bold text-slate-900 mb-1">Projects</h2>
          <p className="text-sm text-slate-500 mb-5">Developments by {builder.name}.</p>
          {projectsLoading ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-40 rounded-2xl bg-slate-100 animate-pulse" />)}
            </div>
          ) : projects && projects.length > 0 ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {projects.map((p) => (
                <div key={p.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h3 className="font-display font-bold text-slate-900">{p.name}</h3>
                  {p.description && <p className="mt-1.5 text-sm text-slate-500 line-clamp-3">{p.description}</p>}
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon={<Building2 className="h-8 w-8 text-slate-400" />} title="No projects listed yet" />
          )}
        </div>
      </div>
    </div>
  );
}
