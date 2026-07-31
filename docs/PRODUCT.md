# RealtyNow — Product Overview & Requirements

RealtyNow is an AI-powered real estate marketplace connecting buyers, renters, property owners, real estate agents, property builders, and platform administrators across India.

---

## 1. Core Vision & Value Proposition

- **AI-Powered Discovery**: Intelligent search assistance, automated property description writing, and instant valuation estimations.
- **Verified Inventory**: Tiered verification for agents, builders, and direct property owners to eliminate spam and duplicate listings.
- **Multi-Portal Ecosystem**: Specialized dashboard experiences tailored for Customers, Agents, Builders, and Administrators.
- **Seamless Transactions**: Direct lead management, site-visit appointment scheduling, and real-time messaging.

---

## 2. User Roles & Personas

| Role                    | Access Level     | Primary Actions                                                                                  |
| :---------------------- | :--------------- | :----------------------------------------------------------------------------------------------- |
| **Guest / Buyer**       | Public           | Search properties, compare listings, save favorites, submit enquiries, use AI assistant.         |
| **Customer / Owner**    | Authenticated    | Post property listings, track enquiries, view property performance, manage subscriptions.        |
| **Real Estate Agent**   | Verified Agent   | Manage assigned customer leads, schedule site visit appointments, handle client communications.  |
| **Builder / Developer** | Verified Builder | Manage multi-unit housing projects, bulk list properties, track project lead analytics.          |
| **Platform Admin**      | Administrator    | Approve/reject property listings, verify agent/builder KYC applications, manage CMS, audit logs. |

---

## 3. Key Feature Modules

### A. Public Discovery & Search

- Multi-filter property search (City, Locality, Purpose, Bedrooms, Price range, Property Type, Amenities).
- Side-by-side property comparison (up to 4 properties).
- Interactive Google Maps location embeds and neighborhood previews.

### B. Property Listing & Approval Workflow

- Multi-step property listing wizard (Basic info -> Location -> Features & Amenities -> Media Upload -> AI Description -> Review).
- Status lifecycle: `draft` -> `pending_verification` -> `published` / `rejected` / `changes_requested`.

### C. Lead Management & Site Visits

- Customer enquiry submission linked to specific listings.
- Scheduled site visit appointments with agent assignment and status tracking (`requested`, `confirmed`, `completed`, `cancelled`).

### D. Subscriptions & Billing

- Free, Pro, and Enterprise subscription tiers.
- Integrated billing records and subscription status management.
