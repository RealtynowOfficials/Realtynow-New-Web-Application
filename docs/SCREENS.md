# RealtyNow — Screen Routing & Page Inventory

This document maps all application screens, routes, layout wrappers, and user authorization requirements.

---

## 1. Route Map & Screen Breakdown

### A. Public Pages (Accessible to All Users)

| Route Path            | Screen Component     | Key Features                                                                                                                 |
| :-------------------- | :------------------- | :--------------------------------------------------------------------------------------------------------------------------- |
| `/`                   | `HomePage`           | Hero section, category quick search, featured properties, AI Assistant drawer, testimonials, PWA install prompt.             |
| `/search`             | `SearchPage`         | Multi-filter sidebar (city, locality, price, BHK, purpose), voice search, interactive Google Maps view, sorting.             |
| `/category/:category` | `CategoryPage`       | Property listings filtered by specific category (Apartments, Villas, Commercial, Plots).                                     |
| `/property/:id`       | `PropertyDetailPage` | Image gallery, price, amenities list, AI price valuation, floorplans, agent contact card, enquiry modal, site visit booking. |
| `/compare`            | `ComparePage`        | Side-by-side feature comparison table for up to 4 selected properties.                                                       |
| `/about`              | `AboutUsPage`        | Company story, statistics, mission, team overview.                                                                           |
| `/blogs`              | `BlogListPage`       | Real estate news, market trend articles, investment guides.                                                                  |
| `/blog/:slug`         | `BlogDetailPage`     | Full blog post with markdown body and author information.                                                                    |
| `/faqs`               | `FaqPage`            | Categorized FAQs with search and accordion expanders.                                                                        |
| `/contact`            | `ContactPage`        | Inquiry form, office addresses, customer support details.                                                                    |

### B. Authentication Pages

| Route Path               | Screen Component      | Key Features                                                     |
| :----------------------- | :-------------------- | :--------------------------------------------------------------- |
| `/auth`                  | `AuthPage`            | Combined Sign In & Sign Up tabbed view for customers.            |
| `/auth/verify-email`     | `VerifyEmailPage`     | Email confirmation screen.                                       |
| `/auth/agent-register`   | `AgentRegisterPage`   | Verified Real Estate Agent registration wizard & license upload. |
| `/auth/builder-register` | `BuilderRegisterPage` | Property Builder / Developer registration wizard & GSTIN upload. |
| `/auth/staff-login`      | `StaffLoginPage`      | Administrative portal login endpoint.                            |

### C. Customer / Property Owner Portal Pages

| Route Path              | Screen Component     | Key Features                                                                  |
| :---------------------- | :------------------- | :---------------------------------------------------------------------------- |
| `/portal`               | `PortalDashboard`    | Account summary, active listings count, enquiry notifications, quick actions. |
| `/portal/my-properties` | `PortalMyProperties` | Manage user-posted listings (view status, edit, resubmit, delete).            |
| `/portal/list-property` | `ListPropertyWizard` | 5-step property post wizard with AI Description Generator.                    |
| `/portal/enquiries`     | `PortalEnquiries`    | Customer enquiries received on posted listings.                               |
| `/portal/saved`         | `PortalSaved`        | Saved favorite properties list.                                               |
| `/portal/subscriptions` | `PortalSubscription` | Active plan overview, tier features, upgrade triggers.                        |

### D. Administrative Portal Pages

| Route Path            | Screen Component         | Key Features                                                                                  |
| :-------------------- | :----------------------- | :-------------------------------------------------------------------------------------------- |
| `/admin`              | `AdminDashboard`         | Platform analytics (total users, active properties, pending queue count, conversion metrics). |
| `/admin/approvals`    | `AdminApprovals`         | Moderation queue to review, approve, reject, or request changes on properties.                |
| `/admin/applications` | `AdminAgentApplications` | Review agent and builder onboarding KYC documents.                                            |
| `/admin/customers`    | `AdminCustomers`         | Manage registered customer accounts.                                                          |
| `/admin/agents`       | `AdminAgents`            | Manage verified agent roster and lead assignments.                                            |
| `/admin/content`      | `AdminContent`           | CMS management (Testimonials, FAQs, Advertisements).                                          |
| `/admin/audit`        | `AdminAuditLogs`         | System security audit trail and user activity log viewer.                                     |
