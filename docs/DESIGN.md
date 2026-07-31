# RealtyNow — Design System & UI Architecture

This document details the visual design system, UI guidelines, color tokens, typography, and responsive layout standards used across the **RealtyNow** application.

---

## 1. Design Philosophy

RealtyNow follows a **Modern, Premium, and AI-Centric** visual language. The goal is to provide a sleek, high-trust user experience that feels state-of-the-art while delivering maximum usability across mobile and desktop.

### Core Principles

- **High Visual Impact**: Deep navy & dark slate foundations paired with energetic brand red (`#DC2626`) accents and cyan highlights.
- **Glassmorphism & Depth**: Multi-layered card elevation using translucent dark panels (`bg-slate-900/90 backdrop-blur-md`) with subtle border glows.
- **Micro-Animations**: Smooth hover transitions, interactive scale effects, bouncing install banners, and loading skeleton pulse states.
- **Data Clarity**: High contrast text hierarchy, status-coded badges (Green = Approved, Amber = Pending, Red = Rejected), and clean data tables.

---

## 2. Color Palette & Tokens

### Primary Brand Colors

| Token Name             | Hex Code              | Purpose                                                                      |
| :--------------------- | :-------------------- | :--------------------------------------------------------------------------- |
| **Brand Red**          | `#DC2626` / `#E50914` | Primary brand accent, PWA app theme, call-to-action buttons, key highlights. |
| **Navy Background**    | `#0B132B`             | Core app dark background foundation.                                         |
| **Slate Card Surface** | `#142642` / `#1E293B` | Card surfaces, modal backgrounds, and drawer containers.                     |
| **Cyan Accent**        | `#06B6D4`             | AI Assistant highlights, status badges, secondary interactive focus rings.   |

### Functional Status Colors

| State                  | Light/Dark Color Token  | Usage                                                          |
| :--------------------- | :---------------------- | :------------------------------------------------------------- |
| **Success / Approved** | `#10B981` (Emerald-500) | Published properties, verified badges, positive toasts.        |
| **Warning / Pending**  | `#F59E0B` (Amber-500)   | Pending verification queue, draft properties, review requests. |
| **Error / Rejected**   | `#EF4444` (Red-500)     | Rejected listings, form errors, destructive actions.           |
| **Info / Neutral**     | `#3B82F6` (Blue-500)    | Information banners, active tab indicators, neutral badges.    |

---

## 3. Typography

RealtyNow uses **Inter** from Google Fonts as its primary typeface, ensuring crisp legibility on both mobile screens and high-DPI desktop displays.

### Font Hierarchy

- **Display Headings (`h1`)**: `text-4xl lg:text-5xl font-extrabold tracking-tight text-white`
- **Section Headers (`h2`)**: `text-2xl lg:text-3xl font-bold text-white`
- **Card Titles (`h3`)**: `text-lg font-semibold text-slate-100`
- **Body Text**: `text-sm lg:text-base text-slate-300 leading-relaxed`
- **Subtext / Captions**: `text-xs text-slate-400 font-medium`

---

## 4. Layout & Grid Standards

The layout relies on standard Tailwind CSS breakpoints:

| Breakpoint | Min Width | Target Viewport              |
| :--------- | :-------- | :--------------------------- |
| **`sm`**   | `640px`   | Large Mobile / Small Tablets |
| **`md`**   | `768px`   | Tablets                      |
| **`lg`**   | `1024px`  | Small Laptops / Desktops     |
| **`xl`**   | `1280px`  | Large Desktop Displays       |
| **`2xl`**  | `1536px`  | Ultra-wide Screens           |

### Global Layout Containers

- **Max Width Container**: `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8`
- **Grid Layouts**: `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6`

---

## 5. UI Components & Micro-Interactions

1. **Property Cards**: Elevated container featuring lazy-loaded thumbnail imagery, price badge, location subtitle, bedroom/bathroom metrics, and one-click Favorite/Compare actions.
2. **Buttons & CTAs**: Gradient backgrounds (`bg-gradient-to-r from-red-600 to-red-700`), hover scaling (`hover:scale-[1.02]`), and active depression state (`active:scale-95`).
3. **Status Badges**: Rounded pill tags (`px-2.5 py-0.5 rounded-full text-xs font-semibold`) with subtle background opacity.
4. **PWA Install Prompt**: Floating toast banner pinned at `bottom-5 right-5` with backdrop blur and smooth entrance animation (`animate-bounce-in`).
