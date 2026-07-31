/**
 * CMS Service — typed hooks for every homepage CMS module
 * Backed by Supabase with Realtime subscription support
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
/* eslint-disable react-hooks/rules-of-hooks */
import { supabase } from '../supabase';

// ──────────────────────────────────────────────────────────────
// TYPES
// ──────────────────────────────────────────────────────────────
export interface CMSSection {
  id: string;
  section_key: string;
  title: string;
  description?: string;
  is_visible: boolean;
  sort_order: number;
  status: 'draft' | 'published' | 'scheduled';
}

export interface CMSHero {
  id: string;
  title: string;
  subtitle?: string;
  badge_text?: string;
  bg_image_url?: string;
  bg_video_url?: string;
  desktop_banner_url?: string;
  tablet_banner_url?: string;
  mobile_banner_url?: string;
  ai_image_url?: string;
  primary_btn_text?: string;
  primary_btn_link?: string;
  secondary_btn_text?: string;
  secondary_btn_link?: string;
  stats?: Array<{ label: string; value: number; suffix?: string }>;
  trust_badges?: string[];
  is_visible: boolean;
  status: string;
}

export interface CMSSearchConfig {
  id: string;
  heading?: string;
  sub_heading?: string;
  search_placeholder?: string;
  enable_voice: boolean;
  enable_image_search: boolean;
  popular_searches?: string[];
  trending_searches?: string[];
  search_tabs?: string[];
  is_visible: boolean;
}

export interface CMSCategory {
  id: string;
  name: string;
  icon?: string;
  image_url?: string;
  description?: string;
  slug: string;
  sort_order: number;
  is_visible: boolean;
  status: string;
}

export interface CMSFeaturedConfig {
  id: string;
  section_key: string;
  title: string;
  subtitle?: string;
  display_type: 'auto' | 'manual';
  max_records: number;
  view_all_link?: string;
  view_all_text?: string;
  is_visible: boolean;
  status: string;
}

export interface CMSTrendingLocation {
  id: string;
  name: string;
  city?: string;
  image_url?: string;
  property_count: number;
  growth_pct: number;
  slug?: string;
  sort_order: number;
  is_visible: boolean;
}

export interface CMSTopCity {
  id: string;
  name: string;
  state?: string;
  image_url?: string;
  description?: string;
  property_count: number;
  slug?: string;
  sort_order: number;
  is_visible: boolean;
}

export interface CMSTopAgent {
  id: string;
  profile_id?: string;
  name: string;
  photo_url?: string;
  designation?: string;
  experience_yrs: number;
  rating: number;
  deals_closed: number;
  phone?: string;
  whatsapp?: string;
  email?: string;
  sort_order: number;
  is_visible: boolean;
}

export interface CMSService {
  id: string;
  name: string;
  icon?: string;
  description?: string;
  brand?: string;
  btn_text?: string;
  btn_link?: string;
  color_class?: string;
  sort_order: number;
  is_visible: boolean;
  status: string;
}

export interface CMSInteriorService {
  id: string;
  label: string;
  description?: string;
  icon?: string;
  color?: string;
  link?: string;
  sort_order: number;
  is_visible: boolean;
}

export interface CMSHomeService {
  id: string;
  label: string;
  description?: string;
  icon?: string;
  color?: string;
  bg_class?: string;
  link?: string;
  sort_order: number;
  is_visible: boolean;
}

export interface CMSBanner {
  id: string;
  title: string;
  subtitle?: string;
  desktop_img?: string;
  mobile_img?: string;
  tablet_img?: string;
  btn_text?: string;
  btn_link?: string;
  position: string;
  priority: number;
  start_date?: string;
  end_date?: string;
  is_visible: boolean;
  status: string;
}

export interface CMSDownloadApp {
  id: string;
  title?: string;
  subtitle?: string;
  description?: string;
  bg_image_url?: string;
  phone_mockup?: string;
  qr_code_url?: string;
  play_store_url?: string;
  app_store_url?: string;
  features?: string[];
  stats?: Array<{ value: string; label: string }>;
  is_visible: boolean;
}

export interface CMSCTA {
  id: string;
  title?: string;
  subtitle?: string;
  primary_btn?: string;
  primary_link?: string;
  secondary_btn?: string;
  secondary_link?: string;
  bg_class?: string;
  bg_image_url?: string;
  is_visible: boolean;
}

export interface CMSFooter {
  id: string;
  company_name?: string;
  tagline?: string;
  logo_url?: string;
  phone?: string;
  email?: string;
  address?: string;
  quick_links?: Array<{ label: string; link: string }>;
  popular_searches?: string[];
  cities?: string[];
  social_links?: Record<string, string>;
  newsletter_text?: string;
  copyright?: string;
  is_visible: boolean;
}

export interface CMSSEO {
  id: string;
  page_key: string;
  meta_title?: string;
  meta_description?: string;
  meta_keywords?: string;
  og_title?: string;
  og_description?: string;
  og_image?: string;
  canonical_url?: string;
}

export interface CMSSetting {
  id: string;
  key: string;
  value?: string;
  value_json?: unknown;
  label?: string;
  description?: string;
  type: string;
}

export interface CMSEmiConfig {
  id: string;
  heading?: string;
  description?: string;
  bg_image_url?: string;
  default_amount?: number;
  default_rate?: number;
  default_years?: number;
  cta_text?: string;
  cta_link?: string;
  is_visible: boolean;
}

export interface CMSDiscoveryFeature {
  id: string;
  title: string;
  description?: string;
  icon?: string;
  link?: string;
  color?: string;
  sort_order: number;
  is_visible: boolean;
}

// ──────────────────────────────────────────────────────────────
// GENERIC CRUD HELPERS
// ──────────────────────────────────────────────────────────────
async function cmsGet<T>(table: string, query?: Record<string, unknown>): Promise<T[]> {
  let q = supabase.from(table).select('*');
  if (query?.is_visible !== undefined) q = (q as any).eq('is_visible', query.is_visible);
  if (query?.status) q = (q as any).eq('status', query.status);
  if (query?.orderBy) q = (q as any).order(query.orderBy as string, { ascending: true });
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as T[];
}

async function cmsGetOne<T>(table: string, id?: string): Promise<T | null> {
  const q = id
    ? supabase.from(table).select('*').eq('id', id).single()
    : supabase.from(table).select('*').limit(1).single();
  const { data, error } = await q;
  if (error && error.code !== 'PGRST116') throw error;
  return (data ?? null) as T | null;
}

async function cmsUpsert<T>(table: string, payload: Partial<T>, id?: string): Promise<T> {
  const q = id
    ? supabase.from(table).update(payload as any).eq('id', id).select().single()
    : supabase.from(table).insert(payload as any).select().single();
  const { data, error } = await q;
  if (error) throw error;
  return data as T;
}

async function cmsDelete(table: string, id: string): Promise<void> {
  const { error } = await supabase.from(table).delete().eq('id', id);
  if (error) throw error;
}

// ──────────────────────────────────────────────────────────────
// REALTIME HOOK
// ──────────────────────────────────────────────────────────────
export function useCMSRealtime(tables: string[], onRefresh: () => void) {
  useEffect(() => {
    const subs = tables.map((t) =>
      supabase
        .channel(`cms_${t}_changes`)
        .on('postgres_changes', { event: '*', schema: 'public', table: t }, onRefresh)
        .subscribe(),
    );
    return () => {
      subs.forEach((s) => supabase.removeChannel(s));
    };
  }, [tables.join(',')]);
}

// ──────────────────────────────────────────────────────────────
// PUBLIC READ HOOKS (for homepage — cached, realtime-refreshed)
// ──────────────────────────────────────────────────────────────
export function useCMSSections() {
  return useQuery({
    queryKey: ['cms_sections'],
    queryFn: () => cmsGet<CMSSection>('cms_sections', { is_visible: true, orderBy: 'sort_order' }),
    staleTime: 30_000,
  });
}

export function useCMSHero() {
  return useQuery({
    queryKey: ['cms_hero'],
    queryFn: () => cmsGetOne<CMSHero>('cms_hero'),
    staleTime: 60_000,
  });
}

export function useCMSSearchConfig() {
  return useQuery({
    queryKey: ['cms_search_config'],
    queryFn: () => cmsGetOne<CMSSearchConfig>('cms_search_config'),
    staleTime: 60_000,
  });
}

export function useCMSCategories() {
  return useQuery({
    queryKey: ['cms_categories'],
    queryFn: () => cmsGet<CMSCategory>('cms_categories', { is_visible: true, orderBy: 'sort_order' }),
    staleTime: 60_000,
  });
}

export function useCMSFeaturedConfig(sectionKey: string) {
  return useQuery({
    queryKey: ['cms_featured_config', sectionKey],
    queryFn: async () => {
      const { data } = await supabase.from('cms_featured_config').select('*').eq('section_key', sectionKey).single();
      return data as CMSFeaturedConfig | null;
    },
    staleTime: 60_000,
  });
}

export function useCMSTrendingLocations() {
  return useQuery({
    queryKey: ['cms_trending_locations'],
    queryFn: () => cmsGet<CMSTrendingLocation>('cms_trending_locations', { is_visible: true, orderBy: 'sort_order' }),
    staleTime: 60_000,
  });
}

export function useCMSTopCities() {
  return useQuery({
    queryKey: ['cms_top_cities'],
    queryFn: () => cmsGet<CMSTopCity>('cms_top_cities', { is_visible: true, orderBy: 'sort_order' }),
    staleTime: 60_000,
  });
}

export function useCMSTopAgents() {
  return useQuery({
    queryKey: ['cms_top_agents'],
    queryFn: () => cmsGet<CMSTopAgent>('cms_top_agents', { is_visible: true, orderBy: 'sort_order' }),
    staleTime: 60_000,
  });
}

export function useCMSServices() {
  return useQuery({
    queryKey: ['cms_services'],
    queryFn: () => cmsGet<CMSService>('cms_services', { is_visible: true, orderBy: 'sort_order' }),
    staleTime: 60_000,
  });
}

export function useCMSInteriorServices() {
  return useQuery({
    queryKey: ['cms_interior_services'],
    queryFn: () => cmsGet<CMSInteriorService>('cms_interior_services', { is_visible: true, orderBy: 'sort_order' }),
    staleTime: 60_000,
  });
}

export function useCMSHomeServices() {
  return useQuery({
    queryKey: ['cms_home_services'],
    queryFn: () => cmsGet<CMSHomeService>('cms_home_services', { is_visible: true, orderBy: 'sort_order' }),
    staleTime: 60_000,
  });
}

export function useCMSBanners(position: string) {
  return useQuery({
    queryKey: ['cms_banners', position],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const { data } = await supabase
        .from('cms_banners')
        .select('*')
        .eq('position', position)
        .eq('is_visible', true)
        .eq('status', 'published')
        .or(`start_date.is.null,start_date.lte.${today}`)
        .or(`end_date.is.null,end_date.gte.${today}`)
        .order('priority', { ascending: false });
      return (data ?? []) as CMSBanner[];
    },
    staleTime: 60_000,
  });
}

export function useCMSDownloadApp() {
  return useQuery({
    queryKey: ['cms_download_app'],
    queryFn: () => cmsGetOne<CMSDownloadApp>('cms_download_app'),
    staleTime: 60_000,
  });
}

export function useCMSCTA() {
  return useQuery({
    queryKey: ['cms_cta'],
    queryFn: () => cmsGetOne<CMSCTA>('cms_cta'),
    staleTime: 60_000,
  });
}

export function useCMSFooter() {
  return useQuery({
    queryKey: ['cms_footer'],
    queryFn: () => cmsGetOne<CMSFooter>('cms_footer'),
    staleTime: 60_000,
  });
}

export function useCMSSEO(pageKey = 'home') {
  return useQuery({
    queryKey: ['cms_seo', pageKey],
    queryFn: async () => {
      const { data } = await supabase.from('cms_seo').select('*').eq('page_key', pageKey).single();
      return data as CMSSEO | null;
    },
    staleTime: 300_000,
  });
}

export function useCMSEmiConfig() {
  return useQuery({
    queryKey: ['cms_emi_config'],
    queryFn: () => cmsGetOne<CMSEmiConfig>('cms_emi_config'),
    staleTime: 60_000,
  });
}

export function useCMSDiscoveryFeatures() {
  return useQuery({
    queryKey: ['cms_discovery_features'],
    queryFn: () => cmsGet<CMSDiscoveryFeature>('cms_discovery_features', { is_visible: true, orderBy: 'sort_order' }),
    staleTime: 60_000,
  });
}

export function useCMSSettings() {
  return useQuery({
    queryKey: ['cms_settings'],
    queryFn: () => cmsGet<CMSSetting>('cms_settings'),
    staleTime: 300_000,
  });
}

// ──────────────────────────────────────────────────────────────
// ADMIN CRUD HOOKS
// ──────────────────────────────────────────────────────────────
export function useAdminCMS() {
  const qc = useQueryClient();

  const invalidate = (...keys: string[]) => keys.forEach((k) => qc.invalidateQueries({ queryKey: [k] }));

  // Generic save (upsert)
  const save = (table: string, qkey: string) =>
    useMutation({
      mutationFn: ({ payload, id }: { payload: Record<string, unknown>; id?: string }) => cmsUpsert(table, payload, id),
      onSuccess: () => invalidate(qkey),
    });

  // Generic delete
  const remove = (table: string, qkey: string) =>
    useMutation({
      mutationFn: (id: string) => cmsDelete(table, id),
      onSuccess: () => invalidate(qkey),
    });

  // Reorder (batch update sort_order)
  const reorder = (table: string, qkey: string) =>
    useMutation({
      mutationFn: async (items: Array<{ id: string; sort_order: number }>) => {
        for (const item of items) {
          await supabase.from(table).update({ sort_order: item.sort_order }).eq('id', item.id);
        }
      },
      onSuccess: () => invalidate(qkey),
    });

  // Toggle visibility
  const toggleVisible = (table: string, qkey: string) =>
    useMutation({
      mutationFn: async ({ id, is_visible }: { id: string; is_visible: boolean }) =>
        await supabase.from(table).update({ is_visible } as any).eq('id', id),
      onSuccess: () => invalidate(qkey),
    });

  // Publish / Unpublish
  const setStatus = (table: string, qkey: string) =>
    useMutation({
      mutationFn: async ({ id, status }: { id: string; status: string }) =>
        await supabase.from(table).update({ status } as any).eq('id', id),
      onSuccess: () => invalidate(qkey),
    });

  return { save, remove, reorder, toggleVisible, setStatus };
}

// CMS Audit log writer
export async function writeCMSAudit(
  table_name: string,
  record_id: string,
  action: string,
  old_data?: unknown,
  new_data?: unknown,
) {
  await supabase.from('cms_audit_log').insert({
    table_name,
    record_id,
    action,
    old_data: old_data ?? null,
    new_data: new_data ?? null,
  });
}
