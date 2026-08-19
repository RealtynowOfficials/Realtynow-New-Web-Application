import { useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion, type Variants } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { PageLoader, EmptyState, Button } from '../../components/ui';
import { PropertyCard } from '../../components/property-card';
import { formatCompactPrice, generatePropertyUrl } from '../../lib/utils';
import {
  Star, Phone, MessageCircle, Mail, Building2, MapPin, BadgeCheck,
  Home as HomeIcon, ChevronRight, ShieldCheck, Sparkles, Bed, Ruler, Car,
} from 'lucide-react';
import type { Profile, Property } from '../../lib/types';
import { getPropertyCoverImage, handleImageError, DEFAULT_PROPERTY_IMAGE } from '../../lib/property-images';

interface AgentReview {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  reviewer_name: string;
}

// Real-estate/architecture photography already used (and verified working) elsewhere
// in this app — src/pages/public/home.tsx, about.tsx, admin/cms.tsx.
const HERO_BACKGROUNDS = [
  'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1600&q=80',
  'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1600&q=80',
  'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=1600&q=80',
  'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1600&q=80',
  'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1600&q=80',
];

// Deterministic per-agent pick (not re-randomized on every visit) so an agent's
// hero photo stays consistent across page loads while differing between agents.
function pickHeroBackground(agentId: string): string {
  let hash = 0;
  for (let i = 0; i < agentId.length; i++) {
    hash = (hash * 31 + agentId.charCodeAt(i)) >>> 0;
  }
  return HERO_BACKGROUNDS[hash % HERO_BACKGROUNDS.length];
}

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' as const } },
};

function SectionKicker({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-bold tracking-[0.2em] text-red-600 uppercase mb-2">{children}</p>
  );
}

export function AgentProfilePage() {
  const { id } = useParams<{ id: string }>();

  const { data: agent, isLoading: agentLoading, isError: agentError } = useQuery({
    queryKey: ['agent-profile', id],
    queryFn: async () => {
      if (!id) return null;
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .eq('role', 'agent')
        .maybeSingle();
      return data as Profile | null;
    },
    enabled: !!id,
  });

  const { data: listings, isLoading: listingsLoading } = useQuery({
    queryKey: ['agent-listings', id],
    queryFn: async () => {
      if (!id) return [];
      const { data } = await supabase
        .from('v_properties_search')
        .select('*')
        .or(`assigned_agent_id.eq.${id},owner_id.eq.${id}`)
        .or('status.eq.published,is_live.eq.true')
        .order('created_at', { ascending: false })
        .limit(24);
      return (data ?? []) as Property[];
    },
    enabled: !!id,
  });

  const { data: reviews } = useQuery({
    queryKey: ['agent-reviews', id, listings?.map((l) => l.id).join(',')],
    queryFn: async () => {
      if (!listings || listings.length === 0) return [];
      const propertyIds = listings.map((l) => l.id);
      const { data } = await supabase
        .from('reviews')
        .select('id, rating, comment, created_at, profiles(first_name, last_name)')
        .in('property_id', propertyIds)
        .order('created_at', { ascending: false })
        .limit(6);
      return (data ?? []).map((r: any) => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        created_at: r.created_at,
        reviewer_name: `${r.profiles?.first_name ?? ''} ${r.profiles?.last_name ?? ''}`.trim() || 'RealtyNow User',
      })) as AgentReview[];
    },
    enabled: !!listings && listings.length > 0,
  });

  const name = agent ? (`${agent.first_name ?? ''} ${agent.last_name ?? ''}`.trim() || 'Agent') : '';

  useEffect(() => {
    if (agent) {
      document.title = `${name} | Verified Real Estate Agent | RealtyNow`;
    }
  }, [agent, name]);

  if (agentLoading) return <PageLoader />;

  if (!agent || agentError) {
    return (
      <div className="min-h-screen bg-slate-50 pt-24 pb-12">
        <div className="container-wide">
          <EmptyState
            icon={<HomeIcon className="h-8 w-8 text-slate-400" />}
            title="Agent not found"
            description="This agent profile doesn't exist or is no longer active."
            action={<Link to="/agents"><Button variant="secondary">Browse all agents</Button></Link>}
          />
        </div>
      </div>
    );
  }

  const specializations = agent.specialization
    ? agent.specialization.split(',').map((s) => s.trim()).filter(Boolean)
    : [];
  const isVerified = agent.status === 'active';
  const allListings = listings ?? [];
  const featured = allListings.find((p) => (p as any).is_featured);
  const restListings = featured ? allListings.filter((p) => p.id !== featured.id) : allListings;
  const verifiedListingsCount = allListings.filter((p) => !!(p as any).verified_status).length;
  const avgRating = reviews && reviews.length > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : null;

  const whatsappHref = `https://wa.me/${(agent.phone ?? '').replace(/[^0-9]/g, '')}`;
  const telHref = `tel:${agent.phone ?? ''}`;
  const mailHref = `mailto:${agent.email ?? ''}`;

  const stats: { value: string; label: string }[] = [];
  if (allListings.length > 0) stats.push({ value: `${allListings.length}+`, label: 'Properties Listed' });
  if (avgRating != null) stats.push({ value: avgRating.toFixed(1), label: 'Agent Rating' });
  if (reviews && reviews.length > 0) stats.push({ value: `${reviews.length}`, label: 'Verified Reviews' });
  if (verifiedListingsCount > 0) stats.push({ value: `${verifiedListingsCount}`, label: 'AI Verified Listings' });
  if (agent.rera_verified) stats.push({ value: '✓ VERIFIED', label: 'RERA Status' });

  return (
    <div className="min-h-screen bg-white pb-24 sm:pb-16">
      {/* Breadcrumb */}
      <div className="py-3.5">
        <div className="container-wide">
          <nav className="flex items-center gap-1.5 text-xs text-slate-400">
            <Link to="/" className="hover:text-slate-700 transition-colors">Home</Link>
            <ChevronRight className="h-3 w-3" />
            <Link to="/agents" className="hover:text-slate-700 transition-colors">Agents</Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-slate-600 font-medium">{name}</span>
          </nav>
        </div>
      </div>

      {/* Cinematic Hero */}
      <div className="container-wide">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="relative overflow-hidden rounded-[28px] min-h-[320px] sm:min-h-[380px] bg-navy-950"
        >
          {/* Cinematic real-estate background photo, unique per agent */}
          <div className="absolute inset-0 bg-gradient-to-br from-navy-950 via-navy-900 to-red-950" />
          <img
            src={pickHeroBackground(agent.id)}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/35 to-black/10" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

          <div className="relative px-6 sm:px-10 pt-10 pb-24 sm:pb-28">
            <div className="flex items-center gap-5">
              {agent.avatar_url ? (
                <motion.img
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4 }}
                  src={agent.avatar_url}
                  alt={name}
                  className="h-[110px] w-[110px] sm:h-[170px] sm:w-[170px] rounded-[22px] object-cover border-[3px] border-white shadow-2xl shrink-0"
                />
              ) : (
                <div className="h-[110px] w-[110px] sm:h-[170px] sm:w-[170px] rounded-[22px] bg-gradient-to-br from-red-500 to-red-800 text-white flex items-center justify-center text-4xl sm:text-6xl font-bold shadow-2xl border-[3px] border-white shrink-0">
                  {agent.first_name?.[0] ?? 'A'}
                </div>
              )}
              <div className="min-w-0">
                <h1 className="font-display text-2xl sm:text-4xl font-extrabold text-white leading-tight">{name}</h1>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.4, delay: 0.15 }}
                  className="mt-2 flex flex-wrap items-center gap-2"
                >
                  {isVerified ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-white/10 backdrop-blur border border-white/20 px-2.5 py-1 text-[11px] font-bold text-white">
                      <BadgeCheck className="h-3.5 w-3.5 text-gold-400" /> Verified RealtyNow Agent
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-white/10 backdrop-blur border border-white/20 px-2.5 py-1 text-[11px] font-bold text-navy-200">
                      Pending Verification
                    </span>
                  )}
                  {agent.rera_verified ? (
                    <span
                      title="RERA registration verified by RealtyNow."
                      aria-label="RERA Certified Agent"
                      className="inline-flex items-center gap-1 rounded-full bg-white border border-red-100 px-2.5 py-1 text-[11px] font-bold text-red-700 shadow-sm"
                    >
                      <BadgeCheck className="h-3.5 w-3.5 text-red-600" /> RERA Certified Agent
                    </span>
                  ) : agent.rera_verification_status === 'pending' || agent.rera_verification_status === 'under_review' ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-white/10 backdrop-blur border border-white/20 px-2.5 py-1 text-[11px] font-bold text-navy-200">
                      RERA Verification Pending
                    </span>
                  ) : agent.rera_verification_status === 'rejected' ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-white/10 backdrop-blur border border-white/20 px-2.5 py-1 text-[11px] font-bold text-navy-300">
                      RERA Verification Failed
                    </span>
                  ) : null}
                </motion.div>
                <p className="mt-2 flex items-center gap-1.5 text-sm text-navy-200">
                  <Building2 className="h-4 w-4" /> {agent.company || 'Independent Agent'}
                </p>
                {agent.assigned_areas && agent.assigned_areas.length > 0 && (
                  <p className="mt-1 flex items-center gap-1.5 text-sm text-navy-300">
                    <MapPin className="h-4 w-4" /> {agent.assigned_areas.slice(0, 3).join(' • ')}
                  </p>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Floating identity/CTA card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="relative -mt-16 sm:-mt-14 mx-3 sm:mx-8 rounded-2xl bg-white shadow-[0_12px_40px_rgba(15,23,42,0.12)] border border-slate-100 px-5 sm:px-8 py-5 sm:py-6"
        >
          <div className="flex flex-col sm:flex-row sm:items-center gap-5">
            {stats.length > 0 && (
              <div className="flex-1 grid grid-cols-2 sm:flex sm:items-center gap-x-8 gap-y-4">
                {stats.map((s) => (
                  <div key={s.label}>
                    <p className="font-display text-xl sm:text-2xl font-extrabold text-slate-900">{s.value}</p>
                    <p className="text-[11px] text-slate-500 font-medium uppercase tracking-wide">{s.label}</p>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2 shrink-0">
              <a href={telHref} className="flex items-center gap-2 rounded-xl bg-red-600 text-white hover:bg-red-700 transition-colors px-4 py-2.5 text-sm font-semibold shadow-sm">
                <Phone className="h-4 w-4" /> Contact Agent
              </a>
              <a href={whatsappHref} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-xl bg-emerald-500 text-white hover:bg-emerald-600 transition-colors px-4 py-2.5 text-sm font-semibold shadow-sm">
                <MessageCircle className="h-4 w-4" /> WhatsApp
              </a>
              <a href={mailHref} className="hidden sm:flex items-center gap-2 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-800 hover:text-white transition-colors px-4 py-2.5 text-sm font-semibold">
                <Mail className="h-4 w-4" /> Email
              </a>
            </div>
          </div>
        </motion.div>
      </div>

      <div className="container-wide mt-10 space-y-14">
        {/* About + Professional Info */}
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-80px' }}
          variants={fadeUp}
          className="grid lg:grid-cols-[1.4fr,1fr] gap-8"
        >
          <div>
            <SectionKicker>About the Agent</SectionKicker>
            <h2 className="font-display text-xl font-bold text-slate-900 mb-3">{name}</h2>
            <p className="text-sm leading-relaxed text-slate-600 whitespace-pre-line">
              {agent.bio || `${name} is a real estate professional on RealtyNow, ready to help you find your next home.`}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-6">
            <SectionKicker>Professional Information</SectionKicker>
            <dl className="space-y-4">
              {specializations.length > 0 && (
                <div>
                  <dt className="text-xs text-slate-400 uppercase tracking-wide">Specialization</dt>
                  <dd className="mt-1 flex flex-wrap gap-1.5">
                    {specializations.map((spec) => (
                      <span key={spec} className="bg-white text-slate-600 text-xs px-2.5 py-1 rounded-full font-medium border border-slate-200">
                        {spec}
                      </span>
                    ))}
                  </dd>
                </div>
              )}
              {agent.assigned_areas && agent.assigned_areas.length > 0 && (
                <div>
                  <dt className="text-xs text-slate-400 uppercase tracking-wide">Service Areas</dt>
                  <dd className="mt-1 text-sm font-medium text-slate-800">{agent.assigned_areas.join(', ')}</dd>
                </div>
              )}
              {agent.license_number && (
                <div>
                  <dt className="text-xs text-slate-400 uppercase tracking-wide">RERA / License Number</dt>
                  <dd className="mt-1 text-sm font-mono font-medium text-slate-800">{agent.license_number}</dd>
                </div>
              )}
            </dl>
          </div>
        </motion.div>

        {/* Service Areas chips */}
        {agent.assigned_areas && agent.assigned_areas.length > 0 && (
          <motion.div initial="hidden" whileInView="show" viewport={{ once: true, margin: '-80px' }} variants={fadeUp}>
            <SectionKicker>Areas We Serve</SectionKicker>
            <div className="flex flex-wrap gap-2 mt-2">
              {agent.assigned_areas.map((area) => (
                <span key={area} className="inline-flex items-center gap-1.5 rounded-xl bg-white border border-slate-200 shadow-sm px-4 py-2 text-sm font-medium text-slate-700">
                  <MapPin className="h-3.5 w-3.5 text-red-500" /> {area}
                </span>
              ))}
            </div>
          </motion.div>
        )}

        {/* Featured Property */}
        {featured && (
          <motion.div initial="hidden" whileInView="show" viewport={{ once: true, margin: '-80px' }} variants={fadeUp}>
            <SectionKicker>Featured Listing</SectionKicker>
            <div className="grid lg:grid-cols-2 rounded-3xl overflow-hidden border border-slate-200 shadow-sm">
              <div className="relative h-64 lg:h-full min-h-[280px] overflow-hidden group">
                <img
                  src={getPropertyCoverImage(featured)}
                  alt={featured.title}
                  onError={(e) => handleImageError(e, DEFAULT_PROPERTY_IMAGE)}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </div>
              <div className="p-6 sm:p-8 flex flex-col justify-center bg-white">
                <h3 className="font-display text-2xl font-bold text-slate-900">{featured.title}</h3>
                <p className="mt-1.5 flex items-center gap-1.5 text-sm text-slate-500">
                  <MapPin className="h-4 w-4" /> {featured.locality_name || featured.city_name}
                </p>
                <p className="mt-4 font-display text-2xl font-extrabold text-red-600">
                  {formatCompactPrice(featured.price ?? featured.rent_amount, featured.purpose ?? undefined)}
                </p>
                <div className="mt-3 flex items-center gap-4 text-sm text-slate-600">
                  {featured.bedrooms != null && (
                    <span className="flex items-center gap-1.5"><Bed className="h-4 w-4" /> {featured.bedrooms} BHK</span>
                  )}
                  {featured.built_up_area != null && (
                    <span className="flex items-center gap-1.5"><Ruler className="h-4 w-4" /> {featured.built_up_area} Sq Ft</span>
                  )}
                  {featured.parking > 0 && (
                    <span className="flex items-center gap-1.5"><Car className="h-4 w-4" /> {featured.parking} Parking</span>
                  )}
                </div>
                {featured.description && (
                  <p className="mt-4 text-sm text-slate-500 line-clamp-3">{featured.description}</p>
                )}
                <Link to={generatePropertyUrl(featured)} className="mt-6">
                  <Button variant="primary">View Property</Button>
                </Link>
              </div>
            </div>
          </motion.div>
        )}

        {/* Property Collection */}
        <motion.div initial="hidden" whileInView="show" viewport={{ once: true, margin: '-80px' }} variants={fadeUp}>
          <SectionKicker>Property Collection</SectionKicker>
          <h2 className="font-display text-xl font-bold text-slate-900 mb-1">
            {allListings.length > 0 ? `Listings by ${name}` : 'Listings'}
          </h2>
          <p className="text-sm text-slate-500 mb-5">Explore properties currently managed by this agent.</p>
          {listingsLoading ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-72 rounded-2xl bg-slate-100 animate-pulse" />
              ))}
            </div>
          ) : restListings.length > 0 ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {restListings.map((property) => (
                <PropertyCard key={property.id} property={property} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<HomeIcon className="h-8 w-8 text-slate-400" />}
              title="No properties currently listed by this agent"
            />
          )}
        </motion.div>

        {/* Trust Section */}
        <motion.div initial="hidden" whileInView="show" viewport={{ once: true, margin: '-80px' }} variants={fadeUp}>
          <SectionKicker>Why Choose This Agent</SectionKicker>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              isVerified && { icon: ShieldCheck, label: 'Verified Identity' },
              verifiedListingsCount > 0 && { icon: Sparkles, label: `${verifiedListingsCount} AI Verified Listings` },
              agent.assigned_areas && agent.assigned_areas.length > 0 && { icon: MapPin, label: 'Local Market Expertise' },
              isVerified && { icon: BadgeCheck, label: 'RealtyNow Verified' },
            ].filter(Boolean).map((item: any) => (
              <div key={item.label} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-4">
                <div className="h-9 w-9 rounded-xl bg-red-50 text-red-600 grid place-items-center shrink-0">
                  <item.icon className="h-4.5 w-4.5" />
                </div>
                <span className="text-sm font-semibold text-slate-700">{item.label}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Client Reviews */}
        <motion.div initial="hidden" whileInView="show" viewport={{ once: true, margin: '-80px' }} variants={fadeUp}>
          <SectionKicker>Client Reviews</SectionKicker>
          {reviews && reviews.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {reviews.map((r) => (
                <div key={r.id} className="rounded-2xl border border-slate-200 p-5 bg-white shadow-sm">
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} className={`h-3.5 w-3.5 ${s <= r.rating ? 'fill-gold-400 text-gold-400' : 'text-slate-200'}`} />
                    ))}
                  </div>
                  {r.comment && <p className="mt-3 text-sm text-slate-600 line-clamp-4">{r.comment}</p>}
                  <p className="mt-3 text-xs font-semibold text-slate-800">{r.reviewer_name}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">No reviews yet. Be the first to review this agent.</p>
          )}
        </motion.div>
      </div>

      {/* Cinematic Contact CTA */}
      <div className="container-wide mt-16">
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-80px' }}
          variants={fadeUp}
          className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-navy-950 via-navy-900 to-red-950 px-6 sm:px-12 py-12 sm:py-16 text-center"
        >
          <svg className="absolute inset-0 h-full w-full opacity-[0.07]" preserveAspectRatio="none">
            <defs>
              <pattern id="agent-cta-grid" width="48" height="48" patternUnits="userSpaceOnUse">
                <path d="M 48 0 L 0 0 0 48" fill="none" stroke="white" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#agent-cta-grid)" />
          </svg>
          <h2 className="relative font-display text-2xl sm:text-3xl font-extrabold text-white">
            Looking for your next property?
          </h2>
          <p className="relative mt-2 text-sm sm:text-base text-navy-200 max-w-xl mx-auto">
            Connect with {name} and discover properties matched to your requirements.
          </p>
          <div className="relative mt-6 flex items-center justify-center gap-3">
            <a href={telHref} className="flex items-center gap-2 rounded-xl bg-red-600 text-white hover:bg-red-500 transition-colors px-5 py-3 text-sm font-semibold">
              <Phone className="h-4 w-4" /> Contact Agent
            </a>
            <a href={whatsappHref} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-xl bg-white/10 backdrop-blur border border-white/20 text-white hover:bg-white/20 transition-colors px-5 py-3 text-sm font-semibold">
              <MessageCircle className="h-4 w-4" /> WhatsApp
            </a>
          </div>
        </motion.div>
      </div>

      {/* Sticky mobile CTA */}
      <div className="sm:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-slate-200 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] px-3 py-2.5 flex gap-2">
        <a href={telHref} className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-slate-100 text-slate-700 py-2.5 text-xs font-bold">
          <Phone className="h-3.5 w-3.5" /> Call
        </a>
        <a href={whatsappHref} target="_blank" rel="noreferrer" className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-emerald-500 text-white py-2.5 text-xs font-bold">
          <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
        </a>
        <a href={mailHref} className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-red-600 text-white py-2.5 text-xs font-bold">
          <Mail className="h-3.5 w-3.5" /> Contact
        </a>
      </div>
    </div>
  );
}
