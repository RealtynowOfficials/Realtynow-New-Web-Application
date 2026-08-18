import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Users, Home, IndianRupee, TrendingUp, Calendar, ArrowUpRight, Megaphone, Activity } from 'lucide-react';

interface DashboardStats {
  total_users: number;
  total_customers: number;
  active_agents: number;
  new_users_30d: number;
  published_properties: number;
  pending_verification: number;
  submitted_properties: number;
  new_listings_30d: number;
  total_revenue: number;
  revenue_30d: number;
  revenue_7d: number;
  total_leads: number;
  new_leads: number;
  won_leads: number;
  new_leads_30d: number;
  active_banners: number;
  total_ad_clicks: number;
}

export default function AdminAnalyticsPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('mv_admin_dashboard_stats')
        .select('*')
        .single();

      if (error) throw error;
      setStats(data);
    } catch (err: any) {
      console.error('Error fetching dashboard stats:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)} Cr`;
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)} L`;
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Analytics Dashboard</h1>
          <p className="text-gray-500 mt-1">Platform overview and key performance metrics</p>
        </div>
        <div className="flex space-x-3">
          <div className="flex items-center space-x-2 bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg">
            <Calendar className="h-4 w-4" />
            <select className="border-none bg-transparent focus:ring-0 text-sm font-medium">
              <option>Last 30 Days</option>
              <option>Last 7 Days</option>
              <option>This Year</option>
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Revenue Card */}
        <Link
          to="/admin/payments"
          className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 block group hover:shadow-md hover:border-green-300 transition-all cursor-pointer"
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-500 group-hover:text-green-600 transition-colors">Total Revenue (30d)</p>
              <h3 className="text-2xl font-bold text-gray-900 mt-1">{stats ? formatCurrency(stats.revenue_30d) : '₹0'}</h3>
            </div>
            <div className="p-2 bg-green-50 rounded-lg group-hover:scale-110 transition-transform">
              <IndianRupee className="h-5 w-5 text-green-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <ArrowUpRight className="h-4 w-4 text-green-500 mr-1" />
            <span className="text-green-500 font-medium">12.5%</span>
            <span className="text-gray-400 ml-2">vs last month</span>
          </div>
        </Link>

        {/* Users Card */}
        <Link
          to="/admin/applications"
          className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 block group hover:shadow-md hover:border-blue-300 transition-all cursor-pointer"
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-500 group-hover:text-blue-600 transition-colors">Active Agents</p>
              <h3 className="text-2xl font-bold text-gray-900 mt-1">{stats?.active_agents || 0}</h3>
            </div>
            <div className="p-2 bg-blue-50 rounded-lg group-hover:scale-110 transition-transform">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="text-gray-900 font-medium">{stats?.new_users_30d || 0}</span>
            <span className="text-gray-500 ml-1">new users this month</span>
          </div>
        </Link>

        {/* Properties Card */}
        <Link
          to="/admin/manage"
          className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 block group hover:shadow-md hover:border-purple-300 transition-all cursor-pointer"
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-500 group-hover:text-purple-600 transition-colors">Published Listings</p>
              <h3 className="text-2xl font-bold text-gray-900 mt-1">{stats?.published_properties || 0}</h3>
            </div>
            <div className="p-2 bg-purple-50 rounded-lg group-hover:scale-110 transition-transform">
              <Home className="h-5 w-5 text-purple-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="text-gray-900 font-medium">{stats?.pending_verification || 0}</span>
            <span className="text-yellow-600 ml-1">pending verification</span>
          </div>
        </Link>

        {/* Leads Card */}
        <Link
          to="/admin/crm"
          className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 block group hover:shadow-md hover:border-orange-300 transition-all cursor-pointer"
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-500 group-hover:text-orange-600 transition-colors">Platform Leads (30d)</p>
              <h3 className="text-2xl font-bold text-gray-900 mt-1">{stats?.new_leads_30d || 0}</h3>
            </div>
            <div className="p-2 bg-orange-50 rounded-lg group-hover:scale-110 transition-transform">
              <TrendingUp className="h-5 w-5 text-orange-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="text-green-600 font-medium">{stats?.won_leads || 0}</span>
            <span className="text-gray-500 ml-1">leads won total</span>
          </div>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Ads Performance */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900 flex items-center">
              <Megaphone className="h-5 w-5 text-gray-400 mr-2" />
              Ads & Sponsored Performance
            </h2>
            <Link to="/admin/sponsored" className="text-xs font-bold text-red-600 hover:text-red-700">
              Manage Ads →
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Link
              to="/admin/sponsored"
              className="p-4 border border-gray-100 rounded-lg bg-gray-50/50 hover:bg-red-50/30 hover:border-red-200 transition-all block cursor-pointer"
            >
              <p className="text-sm text-gray-500">Active Banners</p>
              <p className="text-xl font-bold text-gray-900 mt-1">{stats?.active_banners || 0}</p>
            </Link>
            <Link
              to="/admin/sponsored"
              className="p-4 border border-gray-100 rounded-lg bg-gray-50/50 hover:bg-red-50/30 hover:border-red-200 transition-all block cursor-pointer"
            >
              <p className="text-sm text-gray-500">Total Ad Clicks</p>
              <p className="text-xl font-bold text-gray-900 mt-1">{stats?.total_ad_clicks || 0}</p>
            </Link>
          </div>
        </div>

        {/* System Health / Overview */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900 flex items-center">
              <Activity className="h-5 w-5 text-gray-400 mr-2" />
              System Overview
            </h2>
            <Link to="/admin/audit" className="text-xs font-bold text-red-600 hover:text-red-700">
              View Audit Logs →
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 border border-gray-100 rounded-lg bg-gray-50/50">
              <p className="text-sm text-gray-500">Active Banners</p>
              <p className="text-xl font-bold text-gray-900 mt-1">{stats?.active_banners || 0}</p>
            </div>
            <div className="p-4 border border-gray-100 rounded-lg bg-gray-50/50">
              <p className="text-sm text-gray-500">Total Ad Clicks</p>
              <p className="text-xl font-bold text-gray-900 mt-1">{stats?.total_ad_clicks || 0}</p>
            </div>
          </div>
        </div>

        {/* System Health / Overview */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900 flex items-center">
              <Activity className="h-5 w-5 text-gray-400 mr-2" />
              System Overview
            </h2>
          </div>
          <div className="space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-gray-100">
              <span className="text-gray-600">Total Registered Users</span>
              <span className="font-semibold text-gray-900">{stats?.total_users || 0}</span>
            </div>
            <div className="flex justify-between items-center pb-3 border-b border-gray-100">
              <span className="text-gray-600">Total Customers</span>
              <span className="font-semibold text-gray-900">{stats?.total_customers || 0}</span>
            </div>
            <div className="flex justify-between items-center pb-3 border-b border-gray-100">
              <span className="text-gray-600">Submitted Properties (Draft)</span>
              <span className="font-semibold text-gray-900">{stats?.submitted_properties || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Total Leads Generated</span>
              <span className="font-semibold text-gray-900">{stats?.total_leads || 0}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
