import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Layout,
  Sparkles,
  Save,
  CheckCircle,
  Eye,
  Globe,
  ToggleLeft,
  ToggleRight,
  Sliders,
  Search,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useLanguageContext } from '../../lib/i18n/language-context';
import { DashboardLayout, PageHeader } from '../../components/dashboard-layout';
import { getAdminSections } from '../portal/sections';
import { Button, Input, Textarea, Skeleton, EmptyState } from '../../components/ui';

export function AdminHomepageCMS() {
  const { t } = useLanguageContext();
  const queryClient = useQueryClient();
  const sections = getAdminSections(t);
  const [activeTab, setActiveTab] = useState<'hero' | 'sections' | 'search' | 'categories' | 'seo'>('hero');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  // 1. Fetch Hero CMS Config
  const { data: heroData, isLoading: heroLoading } = useQuery({
    queryKey: ['admin-cms-hero'],
    queryFn: async () => {
      const { data } = await supabase.from('cms_hero').select('*').limit(1).single();
      return (
        data ?? {
          title: 'Find Your Perfect Place to Call Home',
          subtitle: 'Search smarter, decide faster, and move ahead with AI insights.',
          badge_text: 'AI-Powered Real Estate Platform',
          bg_image_url: '',
          bg_video_url: '',
          primary_btn_text: 'Search Properties',
          primary_btn_link: '/search',
          secondary_btn_text: 'AI Advisor',
          secondary_btn_link: '/ai-advisor',
          is_visible: true,
        }
      );
    },
  });

  const [heroForm, setHeroForm] = useState<any>(null);

  React.useEffect(() => {
    if (heroData) setHeroForm(heroData);
  }, [heroData]);

  // 2. Fetch CMS Sections (Master control)
  const { data: cmsSections, isLoading: sectionsLoading } = useQuery({
    queryKey: ['admin-cms-sections'],
    queryFn: async () => {
      const { data } = await supabase.from('cms_sections').select('*').order('sort_order', { ascending: true });
      return data ?? [];
    },
  });

  // 3. Fetch Search Config
  const { data: searchConfig, isLoading: searchLoading } = useQuery({
    queryKey: ['admin-cms-search'],
    queryFn: async () => {
      const { data } = await supabase.from('cms_search_config').select('*').limit(1).single();
      return (
        data ?? {
          heading: 'AI-Powered Property Search',
          sub_heading: 'Find your perfect property with intelligent search',
          search_placeholder: 'Search by city, locality, project or builder...',
          enable_voice: true,
          enable_image_search: true,
        }
      );
    },
  });

  const [searchForm, setSearchForm] = useState<any>(null);
  React.useEffect(() => {
    if (searchConfig) setSearchForm(searchConfig);
  }, [searchConfig]);

  // Save Hero Mutation
  const saveHeroMutation = useMutation({
    mutationFn: async (formData: any) => {
      const { error } = await supabase.from('cms_hero').upsert({
        ...formData,
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-cms-hero'] });
      showNotification('Hero section configuration saved successfully!');
    },
    onError: (err: any) => {
      showNotification(`Error saving hero: ${err.message}`);
    },
  });

  // Save Search Config Mutation
  const saveSearchMutation = useMutation({
    mutationFn: async (formData: any) => {
      const { error } = await supabase.from('cms_search_config').upsert({
        ...formData,
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-cms-search'] });
      showNotification('AI Search configuration saved successfully!');
    },
    onError: (err: any) => {
      showNotification(`Error saving search config: ${err.message}`);
    },
  });

  // Toggle Section Visibility Mutation
  const toggleSectionMutation = useMutation({
    mutationFn: async ({ id, is_visible }: { id: string; is_visible: boolean }) => {
      const { error } = await supabase
        .from('cms_sections')
        .update({ is_visible, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-cms-sections'] });
      showNotification('Section visibility updated.');
    },
  });

  // Fetch SEO Config
  const { data: seoConfig, isLoading: seoLoading } = useQuery({
    queryKey: ['admin-cms-seo'],
    queryFn: async () => {
      const { data } = await supabase.from('cms_seo').select('*').eq('page_key', 'home').single();
      return (
        data ?? {
          page_key: 'home',
          meta_title: 'RealtyNow - AI-Powered Real Estate & Property Search Platform',
          meta_description: 'Find verified properties for sale and rent in top Indian cities. Powered by AI search.',
          meta_keywords: 'real estate, apartments in Hyderabad, villas for sale, 3BHK flats',
        }
      );
    },
  });

  const [seoForm, setSeoForm] = useState<any>(null);
  React.useEffect(() => {
    if (seoConfig) setSeoForm(seoConfig);
  }, [seoConfig]);

  // Save SEO Mutation
  const saveSeoMutation = useMutation({
    mutationFn: async (formData: any) => {
      const { error } = await supabase.from('cms_seo').upsert({
        ...formData,
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-cms-seo'] });
      showNotification('SEO metadata saved successfully!');
    },
    onError: (err: any) => {
      showNotification(`Error saving SEO: ${err.message}`);
    },
  });

  return (
    <DashboardLayout sections={sections} title={t('admin.cms', 'Homepage CMS Console')} badge="Master Control">
      <div className="space-y-6">
        {/* Notification Toast */}
        {toastMsg && (
          <div className="fixed top-6 right-6 z-50 bg-red-600 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-2 text-sm font-semibold animate-bounce-in">
            <CheckCircle className="w-5 h-5 text-white" /> {toastMsg}
          </div>
        )}

        {/* Header */}
        <PageHeader
          title="Homepage CMS & Layout Builder"
          subtitle="Configure dynamic homepage sections, AI search options, hero banners, and SEO metadata in real-time."
          action={
            <div className="flex items-center gap-2">
              <a
                href="/"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white border border-slate-200 hover:border-red-500 text-slate-700 font-bold text-xs shadow-xs transition-all"
              >
                <Eye className="w-4 h-4 text-red-600" /> Preview Homepage
              </a>
            </div>
          }
        />

        {/* CMS Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
          {[
            { key: 'hero', label: 'Hero Banner & Media', icon: Sparkles },
            { key: 'sections', label: 'Master Sections Manager', icon: Layout },
            { key: 'search', label: 'AI Search Bar Config', icon: Search },
            { key: 'categories', label: 'Property Categories', icon: Sliders },
            { key: 'seo', label: 'SEO & Metadata', icon: Globe },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-red-600 text-white shadow-md shadow-red-600/30'
                    : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab 1: Hero Banner Config */}
        {activeTab === 'hero' && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6 max-w-4xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-red-600" /> Hero Banner Configuration
                </h3>
                <p className="text-xs text-slate-500">
                  Edit titles, subtitles, background images, and call-to-action buttons.
                </p>
              </div>
              {heroLoading && <Skeleton className="h-6 w-24 rounded-lg" />}
            </div>

            {heroForm && (
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Badge Text</label>
                  <Input
                    value={heroForm.badge_text || ''}
                    onChange={(e) => setHeroForm({ ...heroForm, badge_text: e.target.value })}
                    placeholder="e.g. AI-Powered Real Estate Platform"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Main Heading (H1)</label>
                  <Input
                    value={heroForm.title || ''}
                    onChange={(e) => setHeroForm({ ...heroForm, title: e.target.value })}
                    placeholder="Find Your Perfect Place to Call Home"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Sub-heading Description</label>
                  <Textarea
                    rows={3}
                    value={heroForm.subtitle || ''}
                    onChange={(e) => setHeroForm({ ...heroForm, subtitle: e.target.value })}
                    placeholder="Search smarter, decide faster, and move ahead with AI insights."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Background Image URL</label>
                    <Input
                      value={heroForm.bg_image_url || ''}
                      onChange={(e) => setHeroForm({ ...heroForm, bg_image_url: e.target.value })}
                      placeholder="https://images.pexels.com/..."
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Background Video URL (Optional MP4)
                    </label>
                    <Input
                      value={heroForm.bg_video_url || ''}
                      onChange={(e) => setHeroForm({ ...heroForm, bg_video_url: e.target.value })}
                      placeholder="https://cdn.site.com/video.mp4"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-4">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Primary CTA Button Label</label>
                    <Input
                      value={heroForm.primary_btn_text || ''}
                      onChange={(e) => setHeroForm({ ...heroForm, primary_btn_text: e.target.value })}
                      placeholder="Search Properties"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Primary CTA Link</label>
                    <Input
                      value={heroForm.primary_btn_link || ''}
                      onChange={(e) => setHeroForm({ ...heroForm, primary_btn_link: e.target.value })}
                      placeholder="/search"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end pt-4">
                  <Button
                    onClick={() => saveHeroMutation.mutate(heroForm)}
                    loading={saveHeroMutation.isPending}
                    icon={<Save className="w-4 h-4" />}
                  >
                    Save Hero Settings
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Master Sections Manager */}
        {activeTab === 'sections' && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
            <div className="space-y-1 border-b border-slate-100 pb-4">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Layout className="w-5 h-5 text-red-600" /> Master Homepage Sections Control
              </h3>
              <p className="text-xs text-slate-500">
                Enable or disable homepage components and reorder them on the homepage in real-time.
              </p>
            </div>

            <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden bg-white">
              {sectionsLoading ? (
                <div className="p-6">
                  <Skeleton className="h-12 w-full rounded-xl" />
                </div>
              ) : (cmsSections ?? []).length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-sm">
                  No sections initialized. Default sections are active.
                </div>
              ) : (
                (cmsSections ?? []).map((sec: any) => (
                  <div
                    key={sec.id}
                    className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-xl bg-slate-100 font-mono font-bold text-xs flex items-center justify-center text-slate-700">
                        #{sec.sort_order}
                      </span>
                      <div>
                        <h4 className="font-bold text-sm text-slate-900">{sec.title}</h4>
                        <span className="text-xs font-mono text-slate-400">key: {sec.section_key}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => toggleSectionMutation.mutate({ id: sec.id, is_visible: !sec.is_visible })}
                        className="flex items-center gap-2 cursor-pointer focus:outline-none"
                      >
                        {sec.is_visible ? (
                          <ToggleRight className="w-7 h-7 text-emerald-600" />
                        ) : (
                          <ToggleLeft className="w-7 h-7 text-slate-400" />
                        )}
                        <span className={`text-xs font-bold ${sec.is_visible ? 'text-emerald-600' : 'text-slate-400'}`}>
                          {sec.is_visible ? 'Visible' : 'Hidden'}
                        </span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Tab 3: AI Search Configuration */}
        {activeTab === 'search' && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6 max-w-3xl">
            <div className="border-b border-slate-100 pb-4">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Search className="w-5 h-5 text-red-600" /> AI Property Search Bar Configuration
              </h3>
              <p className="text-xs text-slate-500">
                Customize search placeholder, voice search enablement, and popular search tags.
              </p>
            </div>

            {searchForm && (
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Search Section Title</label>
                  <Input
                    value={searchForm.heading || ''}
                    onChange={(e) => setSearchForm({ ...searchForm, heading: e.target.value })}
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Search Input Placeholder</label>
                  <Input
                    value={searchForm.search_placeholder || ''}
                    onChange={(e) => setSearchForm({ ...searchForm, search_placeholder: e.target.value })}
                  />
                </div>

                <div className="flex items-center gap-6 pt-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={searchForm.enable_voice ?? true}
                      onChange={(e) => setSearchForm({ ...searchForm, enable_voice: e.target.checked })}
                      className="rounded text-red-600 focus:ring-red-500"
                    />
                    <span className="text-sm font-bold text-slate-800">Enable AI Voice Search</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={searchForm.enable_image_search ?? true}
                      onChange={(e) => setSearchForm({ ...searchForm, enable_image_search: e.target.checked })}
                      className="rounded text-red-600 focus:ring-red-500"
                    />
                    <span className="text-sm font-bold text-slate-800">Enable AI Visual Image Search</span>
                  </label>
                </div>

                <div className="flex items-center justify-end pt-4">
                  <Button
                    onClick={() => saveSearchMutation.mutate(searchForm)}
                    loading={saveSearchMutation.isPending}
                    icon={<Save className="w-4 h-4" />}
                  >
                    Save Search Bar Config
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Property Categories */}
        {activeTab === 'categories' && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6 max-w-4xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-red-600" /> Property Categories Layout
                </h3>
                <p className="text-xs text-slate-500">
                  Manage which property categories appear on the homepage.
                </p>
              </div>
            </div>
            <EmptyState
              icon={<Sliders className="w-8 h-8" />}
              title="Categories Configuration is coming soon"
              description="This module is currently being connected to the dynamic database categories table."
              action={
                <Button variant="secondary" onClick={() => setActiveTab('sections')}>
                  Back to Master Layout
                </Button>
              }
            />
          </div>
        )}

        {/* Tab 5: SEO & Metadata */}
        {activeTab === 'seo' && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6 max-w-3xl">
            <div className="border-b border-slate-100 pb-4">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Globe className="w-5 h-5 text-red-600" /> Search Engine Optimization (SEO) & OpenGraph
              </h3>
              <p className="text-xs text-slate-500">
                Configure global metadata tags for Google search index and social sharing.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Meta Title</label>
                <Input 
                  value={seoForm?.meta_title || ''}
                  onChange={(e) => setSeoForm({ ...seoForm, meta_title: e.target.value })}
                  placeholder="RealtyNow - AI-Powered Real Estate"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Meta Description</label>
                <Textarea
                  rows={3}
                  value={seoForm?.meta_description || ''}
                  onChange={(e) => setSeoForm({ ...seoForm, meta_description: e.target.value })}
                  placeholder="Find verified properties for sale..."
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Target Keywords (comma-separated)</label>
                <Input 
                  value={seoForm?.meta_keywords || ''}
                  onChange={(e) => setSeoForm({ ...seoForm, meta_keywords: e.target.value })}
                  placeholder="real estate, apartments in Hyderabad..."
                />
              </div>

              <div className="flex items-center justify-end pt-4">
                <Button
                  icon={<Save className="w-4 h-4" />}
                  onClick={() => saveSeoMutation.mutate(seoForm)}
                  loading={saveSeoMutation.isPending}
                >
                  Save Meta Tags
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
