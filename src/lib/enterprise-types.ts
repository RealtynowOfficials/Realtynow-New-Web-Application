
// ============================================================
// ENTERPRISE RBAC
// ============================================================
export type EnterpriseRole = 'customer' | 'agent' | 'admin' | 'sales_executive' | 'verification_executive' | 'super_admin' | 'builder';

export interface Permission {
  id: string;
  name: string;
  description: string | null;
  module: string;
  created_at: string;
}

export interface StaffProfile {
  id: string;
  employee_id: string | null;
  department: string | null;
  designation: string | null;
  reporting_to: string | null;
  territory: string[] | null;
  joined_at: string | null;
  can_approve: boolean;
  can_verify: boolean;
  max_leads: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================================
// PACKAGES & SUBSCRIPTIONS
// ============================================================
export interface Package {
  id: string;
  name: string;
  slug: string;
  tier: 1 | 2 | 3 | 4 | 5;
  description: string | null;
  price_monthly: number;
  price_yearly: number;
  price_onetime: number | null;
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
  api_access: boolean;
  duration_days: number;
  renewal_discount_pct: number;
  color: string;
  badge_text: string | null;
  is_popular: boolean;
  is_active: boolean;
  sort_order: number;
  features: string[];
  created_at: string;
  updated_at: string;
}

export interface AgentPackage {
  id: string;
  agent_id: string;
  package_id: string;
  payment_id: string | null;
  status: 'pending' | 'active' | 'expired' | 'cancelled' | 'suspended';
  billing_cycle: 'monthly' | 'yearly' | 'onetime';
  started_at: string | null;
  expires_at: string | null;
  auto_renew: boolean;
  listings_used: number;
  featured_used: number;
  sponsored_used: number;
  banner_used: number;
  leads_used: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
  package?: Package;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  user_id: string;
  payment_id: string | null;
  agent_package_id: string | null;
  billing_name: string | null;
  billing_email: string | null;
  billing_phone: string | null;
  billing_address: string | null;
  billing_gstin: string | null;
  items: Array<{ description: string; quantity: number; unit_price: number; amount: number }>;
  subtotal: number;
  tax_pct: number;
  tax_amount: number;
  discount_amount: number;
  total: number;
  currency: string;
  status: 'draft' | 'issued' | 'paid' | 'overdue' | 'cancelled' | 'refunded';
  issued_at: string | null;
  due_at: string | null;
  paid_at: string | null;
  pdf_url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaymentTransaction {
  id: string;
  user_id: string;
  invoice_id: string | null;
  order_id: string | null; // Razorpay Order ID
  payment_id: string | null; // Razorpay Payment ID
  amount: number;
  currency: string;
  status: 'pending' | 'success' | 'failed' | 'refunded' | 'paid';
  payment_method: string | null;
  payment_gateway: string | null;
  gateway_transaction_id?: string;
  error_code: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface Advertisement {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  cta_text: string;
  cta_link: string;
  image_desktop: string;
  image_mobile?: string;
  banner_tags: string[];
  property_id?: string;
  category_name?: string;
  link_url?: string;
  seo_alt_text?: string;
  image_caption?: string;
  is_active?: boolean;
  approval_status?: 'pending' | 'approved' | 'rejected';
  placement?: string;
  banner_type?: string;
  impressions?: number;
  clicks?: number;
  start_date?: string;
  end_date?: string;
  created_at?: string;
}

export interface PaymentSchedule {
  id: string;
  payment_id: string;
  user_id: string;
  installment_no: number;
  due_date: string;
  amount: number;
  status: 'pending' | 'paid' | 'overdue' | 'waived';
  paid_at: string | null;
  gateway_ref: string | null;
  reminder_sent: boolean;
  notes: string | null;
  created_at: string;
}

export interface Renewal {
  id: string;
  agent_id: string;
  agent_package_id: string;
  package_id: string;
  expires_at: string;
  reminder_sent_30d: boolean;
  reminder_sent_20d: boolean;
  reminder_sent_7d: boolean;
  reminder_sent_1d: boolean;
  lock_in_offer_pct: number;
  lock_in_offer_expires: string | null;
  renewal_status: 'pending' | 'renewed' | 'expired' | 'cancelled';
  renewed_payment_id: string | null;
  renewed_at: string | null;
  created_at: string;
  package?: Package;
}

// ============================================================
// CRM & LEADS
// ============================================================
export type LeadStatus = 'new' | 'assigned' | 'contacted' | 'site_visit' | 'negotiation' | 'won' | 'lost' | 'closed' | 'spam' | 'duplicate';
export type LeadPriority = 'low' | 'medium' | 'high' | 'urgent';
export type LeadSource = 'website' | 'portal' | 'whatsapp' | 'referral' | 'direct' | 'campaign' | 'social' | 'walk_in' | 'call' | 'import';

export interface Lead {
  id: string;
  property_id: string | null;
  customer_id: string | null;
  agent_id: string | null;
  assigned_to: string | null;
  assigned_at: string | null;
  assigned_by: string | null;
  name: string | null;
  email: string | null;
  phone: string | null;
  message: string | null;
  status: string;
  lead_status: LeadStatus;
  priority: LeadPriority;
  source: LeadSource | null;
  campaign_name: string | null;
  budget_min: number | null;
  budget_max: number | null;
  preferred_localities: string[] | null;
  preferred_types: string[] | null;
  preferred_purpose: string | null;
  preferred_bedrooms: number[] | null;
  timeline: string | null;
  follow_up_at: string | null;
  last_contacted_at: string | null;
  contact_count: number;
  closed_at: string | null;
  closure_reason: string | null;
  loss_reason: string | null;
  conversion_value: number | null;
  closed_property_id: string | null;
  tags: string[] | null;
  created_at: string;
  updated_at: string;
  property?: { id: string; title: string };
  assignee?: { id: string; first_name: string; last_name: string; phone: string; email: string };
}

export interface LeadActivity {
  id: string;
  lead_id: string;
  actor_id: string | null;
  activity_type: string;
  title: string;
  description: string | null;
  old_value: string | null;
  new_value: string | null;
  metadata: Record<string, unknown>;
  duration_seconds: number | null;
  is_system: boolean;
  created_at: string;
}

export interface LeadNote {
  id: string;
  lead_id: string;
  author_id: string;
  note: string;
  is_private: boolean;
  pinned: boolean;
  created_at: string;
  updated_at: string;
}

export interface CallLog {
  id: string;
  lead_id: string;
  agent_id: string;
  direction: 'outbound' | 'inbound';
  status: 'completed' | 'missed' | 'busy' | 'failed' | 'voicemail';
  duration_seconds: number | null;
  phone_number: string | null;
  recording_url: string | null;
  notes: string | null;
  called_at: string;
  created_at: string;
}

export interface FollowUp {
  id: string;
  lead_id: string;
  scheduled_by: string;
  assigned_to: string | null;
  scheduled_at: string;
  type: 'call' | 'meeting' | 'email' | 'whatsapp' | 'site_visit' | 'other';
  title: string;
  notes: string | null;
  reminder_sent: boolean;
  completed_at: string | null;
  outcome: string | null;
  outcome_type: 'positive' | 'neutral' | 'negative' | 'no_response' | 'rescheduled' | 'cancelled' | null;
  next_follow_up_at: string | null;
  created_at: string;
}

// ============================================================
// SCORES
// ============================================================
export interface PropertyScore {
  property_id: string;
  seo_score: number;
  image_score: number;
  pricing_score: number;
  description_score: number;
  completeness_score: number;
  location_score: number;
  market_score: number;
  ai_score: number;
  overall_score: number;
  score_breakdown: Record<string, number>;
  recommendations: string[];
  last_calculated_at: string;
}

export interface AgentScore {
  agent_id: string;
  listing_score: number;
  response_time_score: number;
  verification_score: number;
  conversion_score: number;
  rating_score: number;
  renewal_score: number;
  experience_score: number;
  package_score: number;
  overall_score: number;
  total_listings: number;
  published_listings: number;
  total_leads: number;
  converted_leads: number;
  avg_response_hours: number | null;
  avg_rating: number | null;
  total_reviews: number;
  last_calculated_at: string;
}

// ============================================================
// BANNERS & SPONSORED
// ============================================================
export type SponsoredType = 'eye_target' | 'omni_target' | 'featured' | 'top_property' | 'preferred' | 'area_wise' | 'premium';

export interface SponsoredListing {
  id: string;
  property_id: string;
  agent_id: string;
  sponsored_type: SponsoredType;
  locality_id: string | null;
  city_id: string | null;
  budget_amount: number;
  payment_id: string | null;
  status: 'pending' | 'active' | 'paused' | 'expired' | 'cancelled' | 'scheduled' | 'completed';
  starts_at: string;
  ends_at: string | null;
  start_time?: string;
  end_time?: string;
  spot_type?: string;
  spot_index?: number;
  cost?: number;
  leads_generated?: number;
  impressions: number;
  clicks: number;
  priority_score: number;
  notes: string | null;
  created_at: string;
  property?: { id: string; title: string };
  properties?: any;
}

// ============================================================
// ANALYTICS & NOTIFICATIONS
// ============================================================
export interface DailySnapshot {
  snapshot_date: string;
  total_users: number;
  new_users: number;
  total_customers: number;
  total_agents: number;
  active_agents: number;
  total_properties: number;
  published_properties: number;
  new_listings: number;
  expired_listings: number;
  total_leads: number;
  new_leads: number;
  won_leads: number;
  total_revenue: number;
  package_revenue: number;
  transaction_count: number;
  avg_property_score: number | null;
  created_at: string;
}

export interface AdminDashboardStats {
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
  active_subscriptions: number;
  avg_property_score: number | null;
  avg_agent_score: number | null;
  refreshed_at: string;
}

export interface NotificationTemplate {
  id: string;
  key: string;
  name: string;
  title_template: string;
  body_template: string;
  channels: string[];
  action_url_tpl: string | null;
  action_label: string | null;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: string;
  is_active: boolean;
  created_at: string;
}

export interface NotificationPreferences {
  user_id: string;
  in_app: boolean;
  email: boolean;
  sms: boolean;
  whatsapp: boolean;
  push: boolean;
  quiet_hours_enabled: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;
  timezone: string;
  marketing: boolean;
  property_updates: boolean;
  lead_updates: boolean;
  payment_updates: boolean;
  system_alerts: boolean;
}
