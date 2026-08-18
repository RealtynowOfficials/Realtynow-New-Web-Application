import React from 'react';
import { Link } from 'react-router-dom';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { useLanguageContext } from '../../lib/i18n/language-context';
import { TrendingUp, DollarSign, Users, Building2, Sparkles } from 'lucide-react';

const REVENUE_DATA = [
  { month: 'Jan', revenue: 4200000, sales: 24, leads: 180 },
  { month: 'Feb', revenue: 5800000, sales: 32, leads: 240 },
  { month: 'Mar', revenue: 7100000, sales: 41, leads: 310 },
  { month: 'Apr', revenue: 6400000, sales: 38, leads: 290 },
  { month: 'May', revenue: 8900000, sales: 52, leads: 420 },
  { month: 'Jun', revenue: 10500000, sales: 64, leads: 510 },
];

const CITY_DISTRIBUTION = [
  { name: 'Hyderabad', value: 45, color: '#dc2626' },
  { name: 'Bengaluru', value: 25, color: '#2563eb' },
  { name: 'Mumbai', value: 15, color: '#059669' },
  { name: 'Chennai', value: 10, color: '#d97706' },
  { name: 'Delhi NCR', value: 5, color: '#9333ea' },
];

const PROPERTY_TYPE_SALES = [
  { type: 'Apartment', sold: 120, rent: 85 },
  { type: 'Villa', sold: 45, rent: 15 },
  { type: 'Commercial', sold: 30, rent: 40 },
  { type: 'Plot', sold: 75, rent: 5 },
];

export function EnterpriseCharts() {
  const { t } = useLanguageContext();

  return (
    <div className="space-y-6 font-sans">
      {/* Metric Stat Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link
          to="/admin/payments"
          className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-between group hover:shadow-md hover:border-red-300 transition-all cursor-pointer"
        >
          <div>
            <p className="text-xs font-semibold text-slate-500 group-hover:text-red-600 transition-colors">Gross Sales Value</p>
            <h3 className="text-xl font-extrabold text-slate-900 mt-1">₹ 4.29 Cr</h3>
            <p className="text-[11px] font-bold text-emerald-600 mt-1 flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" /> +18.4% vs last month
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center font-bold group-hover:scale-110 transition-transform">
            <DollarSign className="w-6 h-6" />
          </div>
        </Link>

        <Link
          to="/admin/crm"
          className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-between group hover:shadow-md hover:border-blue-300 transition-all cursor-pointer"
        >
          <div>
            <p className="text-xs font-semibold text-slate-500 group-hover:text-blue-600 transition-colors">Total Verified Leads</p>
            <h3 className="text-xl font-extrabold text-slate-900 mt-1">1,950</h3>
            <p className="text-[11px] font-bold text-emerald-600 mt-1 flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" /> +24% growth
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold group-hover:scale-110 transition-transform">
            <Users className="w-6 h-6" />
          </div>
        </Link>

        <Link
          to="/admin/manage"
          className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-between group hover:shadow-md hover:border-emerald-300 transition-all cursor-pointer"
        >
          <div>
            <p className="text-xs font-semibold text-slate-500 group-hover:text-emerald-600 transition-colors">Active Listings</p>
            <h3 className="text-xl font-extrabold text-slate-900 mt-1">4,820</h3>
            <p className="text-[11px] font-bold text-slate-500 mt-1">across 12 major cities</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold group-hover:scale-110 transition-transform">
            <Building2 className="w-6 h-6" />
          </div>
        </Link>

        <Link
          to="/admin/analytics"
          className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-between group hover:shadow-md hover:border-purple-300 transition-all cursor-pointer"
        >
          <div>
            <p className="text-xs font-semibold text-slate-500 group-hover:text-purple-600 transition-colors">AI Conversion Rate</p>
            <h3 className="text-xl font-extrabold text-slate-900 mt-1">14.8%</h3>
            <p className="text-[11px] font-bold text-purple-600 mt-1 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" /> High Lead Quality
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold group-hover:scale-110 transition-transform">
            <Sparkles className="w-6 h-6" />
          </div>
        </Link>
      </div>

      {/* Chart Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Growth Trend Area Chart */}
        <div className="lg:col-span-2 p-6 rounded-3xl bg-white border border-slate-200 shadow-md">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Revenue & Lead Growth Trend</h3>
              <p className="text-xs text-slate-500">Monthly breakdown of gross sales and customer inquiries</p>
            </div>
            <span className="text-xs font-bold text-red-600 bg-red-50 px-2.5 py-1 rounded-full border border-red-100">
              Live Sync
            </span>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={REVENUE_DATA} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#dc2626" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#dc2626" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#dc2626"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorRev)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* City Distribution Pie Chart */}
        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-md">
          <div className="mb-4">
            <h3 className="text-base font-bold text-slate-900">City-Wise Market Share</h3>
            <p className="text-xs text-slate-500">Regional distribution of active listings</p>
          </div>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={CITY_DISTRIBUTION}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {CITY_DISTRIBUTION.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 mt-2">
            {CITY_DISTRIBUTION.map((c) => (
              <span key={c.name} className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.color }} />
                {c.name} ({c.value}%)
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
