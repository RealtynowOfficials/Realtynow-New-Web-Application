# RealtyNow — API & Backend Architecture

RealtyNow communicates with Supabase via **PostgREST RESTful APIs**, **Database RPC Functions**, and **Supabase Deno Edge Functions**.

---

## 1. REST API Specification (PostgREST)

Every PostgreSQL table in the `public` schema is accessible over standard RESTful HTTP endpoints:

### Endpoint Format

$$\text{\texttt{GET /rest/v1/<table\_name>?<filter\_query>}}$$

### Key Headers

- `apikey`: `VITE_SUPABASE_ANON_KEY`
- `Authorization`: `Bearer <user_jwt_access_token>`
- `Content-Type`: `application/json`
- `Prefer`: `return=representation`

### Core Table Endpoints

#### Properties (`/rest/v1/properties`)

- `GET /rest/v1/properties?status=eq.published&order=created_at.desc`: Fetch published listings.
- `POST /rest/v1/properties`: Create a new property listing.
- `PATCH /rest/v1/properties?id=eq.<id>`: Update property details.

#### Profiles (`/rest/v1/profiles`)

- `GET /rest/v1/profiles?id=eq.<id>`: Retrieve logged-in user profile.
- `PATCH /rest/v1/profiles?id=eq.<id>`: Update avatar, phone, or biography.

#### Enquiries (`/rest/v1/enquiries`)

- `POST /rest/v1/enquiries`: Submit a customer inquiry for a property.
- `GET /rest/v1/enquiries?agent_id=eq.<id>`: Fetch enquiries assigned to an agent.

#### Appointments (`/rest/v1/appointments`)

- `POST /rest/v1/appointments`: Book a site-visit appointment.

---

## 2. Database RPC Functions (Callable via `/rest/v1/rpc/<func>`)

| RPC Function Name            | HTTP Method | Arguments                                 | Purpose                                    |
| :--------------------------- | :---------- | :---------------------------------------- | :----------------------------------------- |
| `admin_approve_property`     | `POST`      | `p_property_id`, `p_admin_id`             | Approves and publishes a pending listing.  |
| `admin_reject_property`      | `POST`      | `p_property_id`, `p_reason`, `p_admin_id` | Rejects listing with explicit feedback.    |
| `customer_resubmit_property` | `POST`      | `p_property_id`                           | Resubmits listing after owner corrections. |
| `increment_ad_click`         | `POST`      | `p_ad_id`                                 | Tracks ad click conversions.               |
| `increment_ad_impression`    | `POST`      | `p_ad_id`                                 | Tracks ad view impressions.                |

---

## 3. Supabase Edge Functions (`/functions/v1/ai-assistant`)

- **URL**: `https://<project-ref>.supabase.co/functions/v1/ai-assistant`
- **Method**: `POST`
- **Payload**:
  ```json
  {
    "task": "chat" | "generate_description" | "estimate_price" | "parse_search",
    "payload": { ... }
  }
  ```
- **Response**:
  ```json
  {
    "result": "Generated text or JSON structure"
  }
  ```
- **Fallback**: Direct client fetch to `https://openrouter.ai/api/v1/chat/completions` using `VITE_AI_API_KEY` if configured.
