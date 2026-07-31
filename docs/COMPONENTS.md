# RealtyNow — Component Architecture

RealtyNow follows a modular React component architecture built with TypeScript, TailwindCSS, and Lucide React icons.

---

## 1. Directory Layout

```
src/
├── components/
│   ├── ai-assistant.tsx            # Floating AI Assistant Chatbot
│   ├── voice-search-button.tsx     # Voice Search Web Speech API component
│   ├── pwa-install-prompt.tsx      # PWA Install Banner Prompt
│   ├── property-card.tsx           # Property Grid Card Item
│   ├── notification-bell.tsx       # Real-time Header Notification Bell
│   ├── public-layout.tsx           # Navbar, Footer, Mobile Drawer container
│   ├── error-boundary.tsx          # React Error Boundary
│   ├── toast.tsx                   # Toast Notification Provider
│   └── ui/                         # Atomic Reusable UI Elements
│       ├── button.tsx
│       ├── compare-floating-panel.tsx
│       ├── modal.tsx
│       └── page-loader.tsx
├── pages/
│   ├── public/                     # Home, Search, PropertyDetail, Compare, About, Blogs, FAQs
│   ├── auth/                       # Auth, Registration, Email Verification
│   ├── portal/                     # Dashboard, MyProperties, ListProperty, Enquiries
│   └── admin/                      # Approvals, KYC Applications, Manage Users, Audit Logs
└── lib/
    ├── ai.ts                       # Extensible AI Core Service Engine
    ├── auth.tsx                    # Authentication Context
    ├── queryClient.ts              # React Query Client
    ├── storage.ts                  # Supabase Storage helper
    └── supabase.ts                 # Supabase Client Initialization
```

---

## 2. Core Extensible AI Architecture (`src/lib/ai.ts`)

`src/lib/ai.ts` acts as the central AI engine supporting modular task handlers:

- `AITask` type definition allowing seamless plug-and-play task additions.
- Unified prompt dispatcher (`getSystemAndUserPrompt`).
- Automatic fallback from client OpenRouter API key (`VITE_AI_API_KEY`) to Supabase Deno Edge Function (`/functions/v1/ai-assistant`).

---

## 3. Reusable UI Components

- **`PropertyCard`**: Renders property image, badge tags, price, rental details, location, area sqft, and action buttons (_Favorite_, _Compare_, _Enquire_).
- **`AIAssistant`**: Floating AI chatbot with collapsible drawer, message history, suggested prompts, and voice input integration.
- **`PwaInstallPrompt`**: Bottom-right install banner for desktop and mobile PWA installation.
- **`CompareFloatingPanel`**: Fixed bottom bar allowing users to compare up to 4 selected properties.
