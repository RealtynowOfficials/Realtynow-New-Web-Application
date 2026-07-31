# RealtyNow — Database Architecture & Schema Specification

RealtyNow uses **PostgreSQL** hosted on **Supabase**, leveraging Row Level Security (RLS), custom triggers, database functions (RPCs), and automated timestamp management.

---

## 1. Database Schema Overview (36 Tables + 1 View)

### Catalog & Listings

1. **`properties`**: Core listings with price, rent, bedrooms, bathrooms, area, status, `approval_status`, AI fields, `view_count`.
2. **`cities`**: Cities master data (`id`, `name`, `state`).
3. **`localities`**: Localities master data linked to cities (`id`, `city_id`, `name`).
4. **`property_types`**: Types of real estate (`id`, `name`, `category`).
5. **`amenities`**: Master list of features & amenities (`id`, `name`, `icon`).
6. **`builders`**: Real estate developer companies (`id`, `name`, `logo_url`, `description`).
7. **`projects`**: Housing projects / townships (`id`, `builder_id`, `city_id`, `locality_id`, `name`).
8. **`property_images`**: Listing photos (`id`, `property_id`, `url`, `is_primary`, `sort_order`).
9. **`property_videos`**: Video tours (`id`, `property_id`, `url`, `title`).
10. **`property_documents`**: Floorplans, brochures, & legal docs (`id`, `property_id`, `url`, `type`).
11. **`property_floorplans`**: Floor plan layouts (`id`, `property_id`, `title`, `image_url`, `area_sqft`).
12. **`property_views`**: View analytics log (`id`, `property_id`, `viewer_id`, `viewed_at`).
13. **`draft_properties`**: Property wizard progress drafts (`id`, `owner_id`, `step_data`, `updated_at`).

### Users & Onboarding KYC

14. **`profiles`**: User profiles extending `auth.users` (`id`, `email`, `role`, `first_name`, `last_name`, `phone`, `avatar_url`, `status`).
15. **`agent_applications`**: Agent onboarding KYC applications (`id`, `user_id`, `license_number`, `agency_name`, `status`).
16. **`builder_applications`**: Builder onboarding KYC applications (`id`, `user_id`, `company_name`, `gstin`, `status`).
17. **`kyc_verifications`**: Document verification records (`id`, `user_id`, `document_type`, `document_number`, `status`).

### Leads & Interactions

18. **`enquiries`**: Customer property inquiries (`id`, `property_id`, `customer_id`, `agent_id`, `name`, `email`, `phone`, `message`, `status`).
19. **`appointments`**: Site visit appointments (`id`, `property_id`, `customer_id`, `agent_id`, `scheduled_at`, `status`).
20. **`visits`**: Verified site visit records (`id`, `appointment_id`, `notes`, `visited_at`).
21. **`messages`**: Direct messages (`id`, `sender_id`, `receiver_id`, `property_id`, `content`, `read_at`).
22. **`notifications`**: Real-time user notifications (`id`, `user_id`, `type`, `title`, `body`, `link`, `is_read`).
23. **`reviews`**: Property ratings and customer feedback (`id`, `property_id`, `user_id`, `rating`, `comment`).
24. **`favorites`**: Saved properties (`id`, `user_id`, `property_id`).
25. **`compare`**: Saved property comparisons (`id`, `user_id`, `property_id`).

### Subscriptions & Payments

26. **`subscriptions`**: Subscription tier definitions (`id`, `name`, `price`, `interval`, `features`).
27. **`customer_subscriptions`**: Active user memberships (`id`, `user_id`, `subscription_id`, `starts_at`, `ends_at`, `status`).
28. **`payments`**: Transaction records (`id`, `user_id`, `amount`, `currency`, `payment_method`, `status`).

### CMS, Ads & Audit

29. **`blogs`**: Blog articles (`id`, `title`, `slug`, `content`, `cover_image`, `author_id`, `is_published`).
30. **`cms_pages`**: Static pages (`id`, `title`, `slug`, `content`, `is_published`).
31. **`testimonials`**: Customer success stories (`id`, `name`, `role`, `content`, `avatar_url`, `rating`).
32. **`faqs`**: Frequently asked questions (`id`, `question`, `answer`, `category`, `is_active`, `sort_order`).
33. **`advertisements`**: Banner & sponsored ads (`id`, `title`, `image_url`, `target_url`, `clicks`, `impressions`, `is_active`).
34. **`audit_logs`**: System security audit trail (`id`, `user_id`, `action`, `entity`, `entity_id`, `details`).
35. **`activity_logs`**: User activity tracking (`id`, `user_id`, `activity_type`, `description`).
36. **`property_status_history`**: Listing approval lifecycle audit (`id`, `property_id`, `from_status`, `to_status`, `changed_by`, `reason`).

### Views

- **`vw_published_properties`**: Aggregated view joining `properties`, `cities`, `localities`, and `property_types`.

---

## 2. Key Database RPC Functions

- `notify_user(user_id, type, title, body, link)`: Inserts a row into `notifications`.
- `admin_approve_property(p_property_id, p_admin_id)`: Transitions property status to `published` and records status history.
- `admin_reject_property(p_property_id, p_reason, p_admin_id)`: Rejects a property listing with feedback.
- `customer_resubmit_property(p_property_id)`: Resubmits a property from `changes_requested` back to `pending_verification`.
- `increment_ad_click(p_ad_id)` / `increment_ad_impression(p_ad_id)`: Increments ad metric counters.
