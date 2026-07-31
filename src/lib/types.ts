export type UserRole = 'customer' | 'agent' | 'admin' | 'builder';

export type PropertyStatus =
  | 'draft'
  | 'submitted'
  | 'pending_verification'
  | 'changes_requested'
  | 'approved'
  | 'published'
  | 'rejected'
  | 'archived';

export type PropertyPurpose = 'Sale' | 'Rent';

export type Furnishing = 'Unfurnished' | 'Semi-Furnished' | 'Fully Furnished';

export interface Profile {
  id: string;
  email: string;
  role: UserRole;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  status: string;
  agent_id: string | null;
  bio: string | null;
  company: string | null;
  license_number: string | null;
  assigned_areas: string[] | null;
  specialization: string | null;
  two_factor_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface City {
  id: string;
  name: string;
  state: string | null;
  country: string;
  created_at: string;
}

export interface Locality {
  id: string;
  city_id: string;
  name: string;
  pincode: string | null;
  created_at: string;
}

export interface PropertyType {
  id: string;
  name: string;
  category: string;
  icon: string | null;
  created_at: string;
}

export interface Amenity {
  id: string;
  name: string;
  icon: string | null;
  created_at: string;
}

export interface Builder {
  id: string;
  name: string;
  logo_url: string | null;
  description: string | null;
  established_year: number | null;
}

export interface Property {
  id: string;
  owner_id: string;
  title: string;
  description: string | null;
  property_type_id: string | null;
  purpose: PropertyPurpose;
  city_id: string | null;
  locality_id: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  price: number;
  rent_amount: number | null;
  security_deposit: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  balconies: number | null;
  floor_number: number | null;
  total_floors: number | null;
  built_up_area: number | null;
  carpet_area: number | null;
  plot_area: number | null;
  facing: string | null;
  furnishing: Furnishing | null;
  parking: number;
  age_of_property: number | null;
  ownership_type: string | null;
  legal_approved: boolean;
  amenities: string[] | null;
  features: Record<string, unknown> | null;
  images: string[] | null;
  videos: string[] | null;
  floor_plans: string[] | null;
  documents: string[] | null;
  builder_id: string | null;
  project_id: string | null;
  status: PropertyStatus;
  approval_status?: 'Pending' | 'Under Review' | 'Approved' | 'Rejected' | 'Changes Requested' | null;
  is_live?: boolean;
  approved_by?: string | null;
  approved_at?: string | null;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  is_featured: boolean;
  is_luxury: boolean;
  view_count: number;
  ai_description: string | null;
  ai_seo: string | null;
  ai_tags: string[] | null;
  assigned_agent_id: string | null;
  rejection_reason: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  // joined fields (from view)
  city_name?: string;
  locality_name?: string;
  property_type_name?: string;
  // 360° Virtual Tour fields
  has_virtual_tour?: boolean;
  virtual_tour_cover?: string | null;
  virtual_tour_count?: number;
  virtual_tours?: VirtualTour[];
  current_step?: number;
  completed_steps?: number[];
  draft_data?: Record<string, any> | null;
  completion_percentage?: number;
  is_draft?: boolean;
  last_saved_at?: string | null;
}

export interface VirtualTour {
  id: string;
  property_id: string;
  room_name: string;
  title: string | null;
  image_url: string;
  thumbnail_url: string | null;
  sort_order: number;
  is_cover: boolean;
  floor_number: number;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface VirtualTourUploadItem {
  file: File;
  preview: string;
  room_name: string;
  title: string;
  floor_number: number;
  is_cover: boolean;
  sort_order: number;
  uploading?: boolean;
  uploaded?: boolean;
  error?: string;
  url?: string;
  thumbnail_url?: string;
}

export interface Enquiry {
  id: string;
  property_id: string | null;
  customer_id: string | null;
  agent_id: string | null;
  name: string | null;
  email: string | null;
  phone: string | null;
  message: string | null;
  status: string;
  created_at: string;
  property?: Pick<Property, 'id' | 'title'>;
}

export interface Appointment {
  id: string;
  property_id: string | null;
  customer_id: string;
  agent_id: string | null;
  scheduled_at: string;
  status: string;
  notes: string | null;
  created_at: string;
  property?: Pick<Property, 'id' | 'title'>;
}

export interface Message {
  id: string;
  thread_id: string;
  sender_id: string;
  receiver_id: string;
  property_id: string | null;
  body: string;
  read_at: string | null;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string | null;
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
}

export interface Favorite {
  id: string;
  user_id: string;
  property_id: string;
  created_at: string;
  property?: Property;
}

export interface Subscription {
  id: string;
  name: string;
  price: number;
  interval: string;
  features: string[] | null;
  is_active: boolean;
}

export interface CustomerSubscription {
  id: string;
  user_id: string;
  subscription_id: string | null;
  status: string;
  started_at: string;
  ends_at: string | null;
  subscription?: Subscription;
}

export interface Payment {
  id: string;
  user_id: string;
  amount: number;
  currency: string;
  status: string;
  reference: string | null;
  invoice_number: string | null;
  created_at: string;
}

export interface Blog {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  body: string;
  cover_image: string | null;
  author_id: string | null;
  tags: string[] | null;
  published: boolean;
  published_at: string | null;
  created_at: string;
}

export interface CmsPage {
  id: string;
  title: string;
  slug: string;
  body: string;
  published: boolean;
  created_at: string;
}

export interface Testimonial {
  id: string;
  name: string;
  role: string | null;
  company: string | null;
  avatar_url: string | null;
  rating: number;
  body: string;
  is_active: boolean;
}

export interface Faq {
  id: string;
  question: string;
  answer: string;
  category: string | null;
  is_active: boolean;
}

export interface Advertisement {
  id: string;
  title: string;
  subtitle?: string | null;
  description?: string | null;
  banner_type?: string | null;
  placement: string;
  image_url: string | null;
  image_desktop?: string | null;
  image_mobile?: string | null;
  video_url?: string | null;
  html_content?: string | null;
  button_text?: string | null;
  cta_text?: string | null;
  cta_link?: string | null;
  link_url?: string | null;
  redirect_type?: string | null;
  property_id?: string | null;
  category_name?: string | null;
  company_logo?: string | null;
  priority?: number;
  display_order?: number;
  start_date?: string | null;
  end_date?: string | null;
  starts_at?: string | null;
  ends_at?: string | null;
  is_active: boolean;
  auto_publish?: boolean;
  schedule_publishing?: boolean;
  target_audience?: string | null;
  city_targeting?: string | null;
  device_targeting?: string | null;
  impression_limit?: number;
  impressions?: number;
  clicks?: number;
  seo_alt_text?: string | null;
  image_caption?: string | null;
  banner_tags?: string[] | null;
  internal_comments?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface AuditLog {
  id: string;
  actor_id: string | null;
  action: string;
  entity: string | null;
  entity_id: string | null;
  metadata: Record<string, unknown> | null;
  ip: string | null;
  created_at: string;
}

export interface PropertyStatusHistory {
  id: string;
  property_id: string;
  from_status: string | null;
  to_status: string;
  changed_by: string | null;
  reason: string | null;
  created_at: string;
}

export interface PropertyImage {
  id: string;
  property_id: string;
  url: string;
  caption: string | null;
  position: number;
}

export type ApplicationStatus = 'pending' | 'approved' | 'rejected';

export interface AgentApplication {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  license_number: string | null;
  specialization: string | null;
  assigned_areas: string[] | null;
  experience_years: number | null;
  company: string | null;
  bio: string | null;
  id_doc_url: string | null;
  license_doc_url: string | null;
  status: ApplicationStatus;
  rejection_reason: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface BuilderApplication {
  id: string;
  company_name: string;
  contact_name: string;
  email: string;
  phone: string;
  gst_number: string | null;
  rera_number: string | null;
  established_year: number | null;
  city: string | null;
  description: string | null;
  website_url: string | null;
  logo_url: string | null;
  gst_doc_url: string | null;
  rera_doc_url: string | null;
  pan_doc_url: string | null;
  status: ApplicationStatus;
  rejection_reason: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export type KycIdType = 'aadhaar' | 'pan' | 'passport' | 'voter_id' | 'driving_license';
export type KycStatus = 'pending' | 'verified' | 'rejected';

export interface KycVerification {
  id: string;
  user_id: string;
  id_type: KycIdType;
  id_number: string | null;
  front_url: string | null;
  back_url: string | null;
  selfie_url: string | null;
  status: KycStatus;
  rejection_reason: string | null;
  verified_by: string | null;
  verified_at: string | null;
  created_at: string;
  updated_at: string;
}
