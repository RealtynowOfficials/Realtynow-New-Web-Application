import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Package, Crown, Star, Zap, Shield, Diamond, Check,
  Edit2, Plus, ToggleLeft, ToggleRight, Users,
  CreditCard, Gift
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { DashboardLayout } from '../../components/dashboard-layout';
import { useLanguageContext } from '../../lib/i18n/language-context';
import { formatNumber } from '../../lib/utils';
import { getAdminSections } from '../portal/sections';

interface PackageData {
  id: string;
  name: string;
  slug: string;
  tier: number;
  description: string | null;
  price_monthly: number;
  price_yearly: number;
  listing_limit: number;
  featured_listings: number;
  sponsored_listings: number;
  banner_credits: number;
  lead_credits: number;
  priority_level: number;
  homepage_visibility: boolean;
  search_boost: boolean;
  crm_access: boolean;
  analytics_access: boolean;
  ai_tools: boolean;
  advanced_reporting: boolean;
  duration_days: number;
  renewal_discount_pct: number;
  color: string;
  badge_text: string | null;
  is_popular: boolean;
  is_active: boolean;
  sort_order: number;
  features: string[];
}

interface PackageStats {
  [packageId: string]: { active: number; total: number; revenue: number };
}

const TIER_ICONS = [null, Crown, Star, Zap, Shield, Diamond];
const TIER_GRADIENTS = [
  '', 
  'from-amber-700 to-orange-600',
  'from-gray-400 to-gray-300',
  'from-yellow-500 to-amber-400',
  'from-slate-300 to-gray-100',
  'from-cyan-400 to-blue-400',
];

function PackageCard({ pkg, stats, onEdit, onToggle }: {
  pkg: PackageData;
  stats: { active: number; revenue: number };
  onEdit: (pkg: PackageData) => void;
  onToggle: (id: string, active: boolean) => void;
}) {
  const Icon = TIER_ICONS[pkg.tier] ?? Package;
  const gradient = TIER_GRADIENTS[pkg.tier];
  const yearlyDiscount = pkg.price_yearly > 0 ? Math.round((1 - pkg.price_yearly / (pkg.price_monthly * 12)) * 100) : 0;

  return (
    <div className={`relative bg-slate-800/60 border rounded-2xl overflow-hidden transition-all duration-300 hover:scale-[1.02] ${pkg.is_popular ? 'border-blue-500/60 ring-1 ring-blue-500/30' : 'border-slate-700/50'} ${!pkg.is_active ? 'opacity-60' : ''}`}>
      {/* Popular badge */}
      {pkg.is_popular && (
        <div className="absolute top-0 left-0 right-0 bg-blue-600 text-center py-1.5 text-xs font-bold text-white tracking-wide">
          MOST POPULAR
        </div>
      )}

      {/* Header */}
      <div className={`p-6 bg-gradient-to-br ${gradient} ${pkg.is_popular ? 'pt-10' : ''}`}>
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Icon className="w-6 h-6 text-white/90" />
              <span className="text-white font-bold text-xl">{pkg.name}</span>
              {pkg.badge_text && (
                <span className="px-2 py-0.5 rounded-full bg-white/20 text-white text-xs font-medium">{pkg.badge_text}</span>
              )}
            </div>
            <p className="text-white/70 text-sm">{pkg.description}</p>
          </div>
          <div className="flex gap-1.5">
            <button onClick={() => onEdit(pkg)} className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors">
              <Edit2 className="w-4 h-4" />
            </button>
            <button onClick={() => onToggle(pkg.id, !pkg.is_active)} className={`p-2 rounded-xl transition-colors ${pkg.is_active ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-red-500/30 text-red-300'}`}>
              {pkg.is_active ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Price */}
        <div className="flex items-end gap-3">
          <div>
            <span className="text-white text-4xl font-extrabold">₹{formatNumber(pkg.price_monthly)}</span>
            <span className="text-white/60 text-sm ml-1">/mo</span>
          </div>
          {yearlyDiscount > 0 && (
            <div className="mb-1 px-2.5 py-1 rounded-xl bg-green-400/20 border border-green-400/30">
              <p className="text-green-300 text-xs font-semibold">Save {yearlyDiscount}% yearly</p>
            </div>
          )}
        </div>
        <p className="text-white/50 text-xs mt-1">₹{formatNumber(pkg.price_yearly)}/year · {pkg.renewal_discount_pct}% renewal discount</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 divide-x divide-slate-700/50 border-b border-slate-700/50">
        <div className="px-4 py-3 text-center">
          <p className="text-white font-bold text-lg">{stats.active}</p>
          <p className="text-slate-500 text-xs">Active Agents</p>
        </div>
        <div className="px-4 py-3 text-center">
          <p className="text-green-400 font-bold text-lg">₹{formatNumber(stats.revenue)}</p>
          <p className="text-slate-500 text-xs">Revenue</p>
        </div>
      </div>

      {/* Features Grid */}
      <div className="p-4 space-y-3">
        <div className="grid grid-cols-2 gap-2 text-xs">
          {[
            { label: 'Listings', value: pkg.listing_limit, icon: '🏠' },
            { label: 'Featured', value: pkg.featured_listings, icon: '⭐' },
            { label: 'Sponsored', value: pkg.sponsored_listings, icon: '🎯' },
            { label: 'Banners', value: pkg.banner_credits, icon: '📢' },
            { label: 'Lead Credits', value: pkg.lead_credits, icon: '👥' },
            { label: 'Priority', value: `${pkg.priority_level}/10`, icon: '⚡' },
          ].map(f => (
            <div key={f.label} className="flex items-center justify-between p-2 rounded-lg bg-slate-700/30">
              <span className="text-slate-400">{f.icon} {f.label}</span>
              <span className="text-white font-semibold">{f.value}</span>
            </div>
          ))}
        </div>

        {/* Feature toggles */}
        <div className="grid grid-cols-2 gap-1.5">
          {[
            { label: 'CRM', enabled: pkg.crm_access },
            { label: 'Analytics', enabled: pkg.analytics_access },
            { label: 'AI Tools', enabled: pkg.ai_tools },
            { label: 'Homepage', enabled: pkg.homepage_visibility },
            { label: 'Search Boost', enabled: pkg.search_boost },
            { label: 'Reports', enabled: pkg.advanced_reporting },
          ].map(f => (
            <div key={f.label} className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs ${f.enabled ? 'bg-green-500/10 text-green-400' : 'bg-slate-700/20 text-slate-600 line-through'}`}>
              <Check className={`w-3 h-3 ${!f.enabled && 'opacity-0'}`} />
              {f.label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function AdminPackagesPage() {
  const [editingPkg, setEditingPkg] = useState<PackageData | null>(null);
  const [billingView, setBillingView] = useState<'monthly' | 'yearly'>('monthly');
  const qc = useQueryClient();

  const { data: packages = [], isLoading } = useQuery<PackageData[]>({
    queryKey: ['admin-packages'],
    queryFn: async () => {
      const { data, error } = await supabase.from('packages').select('*').order('tier');
      if (error) throw error;
      return (data as unknown as PackageData[]) ?? [];
    },
  });

  const { data: packageStats } = useQuery<PackageStats>({
    queryKey: ['admin-package-stats'],
    queryFn: async () => {
      const { data: agentPkgs } = await supabase.from('agent_packages').select('package_id, status, payment_id');
      const { data: payments } = await supabase.from('payments').select('agent_package_id, amount, status').eq('status', 'paid');

      const stats: PackageStats = {};
      (agentPkgs ?? []).forEach((ap: any) => {
        if (!stats[ap.package_id]) stats[ap.package_id] = { active: 0, total: 0, revenue: 0 };
        stats[ap.package_id].total++;
        if (ap.status === 'active') stats[ap.package_id].active++;
      });
      (payments ?? []).forEach((p: any) => {
        // aggregate revenue by package via agent_package_id
      });
      return stats;
    },
  });

  const togglePackage = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from('packages').update({ is_active: active }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-packages'] }),
  });

  const totalActiveSubscriptions = Object.values(packageStats ?? {}).reduce((s, v) => s + v.active, 0);
  const totalRevenue = Object.values(packageStats ?? {}).reduce((s, v) => s + v.revenue, 0);

  const { t } = useLanguageContext();
  const adminSections = getAdminSections(t);

  return (
    <DashboardLayout sections={adminSections} title="Package Management">
      <div className="mb-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-navy-900">Package Management</h1>
          <p className="text-sm text-navy-500">Manage subscription tiers, pricing, and feature access for agents</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium transition-colors">
          <Plus className="w-4 h-4" /> Add Package
        </button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Packages',       value: packages.length,            icon: <Package className="w-5 h-5" />,     color: 'text-blue-400',   bg: 'bg-blue-500/10' },
          { label: 'Active Subscriptions', value: totalActiveSubscriptions,   icon: <Users className="w-5 h-5" />,      color: 'text-green-400',  bg: 'bg-green-500/10' },
          { label: 'Total Revenue',        value: `₹${formatNumber(totalRevenue)}`, icon: <CreditCard className="w-5 h-5" />, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
          { label: 'Avg Renewal Discount', value: `${Math.round(packages.reduce((s,p)=>s+p.renewal_discount_pct,0)/Math.max(packages.length,1))}%`, icon: <Gift className="w-5 h-5" />, color: 'text-purple-400', bg: 'bg-purple-500/10' },
        ].map(s => (
          <div key={s.label} className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-4 flex items-center gap-4">
            <div className={`p-3 rounded-xl ${s.bg}`}>
              <span className={s.color}>{s.icon}</span>
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{s.value}</p>
              <p className="text-slate-500 text-xs mt-0.5">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Billing Toggle */}
      <div className="flex justify-center mb-8">
        <div className="flex rounded-2xl bg-slate-800/60 border border-slate-700/50 p-1.5 gap-1">
          {(['monthly', 'yearly'] as const).map(cycle => (
            <button
              key={cycle}
              onClick={() => setBillingView(cycle)}
              className={`px-6 py-2 rounded-xl text-sm font-semibold transition-all capitalize flex items-center gap-2 ${billingView === cycle ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
            >
              {cycle}
              {cycle === 'yearly' && <span className="px-1.5 py-0.5 rounded-full bg-green-500/20 text-green-400 text-xs">Save up to 20%</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Package Cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-96 bg-slate-800/40 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {packages.map(pkg => (
            <PackageCard
              key={pkg.id}
              pkg={pkg}
              stats={packageStats?.[pkg.id] ?? { active: 0, revenue: 0 }}
              onEdit={setEditingPkg}
              onToggle={(id, active) => togglePackage.mutate({ id, active })}
            />
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}

export default AdminPackagesPage;
