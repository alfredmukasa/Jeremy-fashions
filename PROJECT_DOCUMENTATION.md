# KREWNOX — Full Project Documentation

> Complete technical documentation for the **KREWNOX** fashion e-commerce application
> (formerly branded "Jeremy Atelier"). This document is the result of a full
> line-by-line review of the codebase — every source file, server route, database
> migration, configuration, script, and seed entry — and is intended as the
> single source of truth for how the application works.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Technology Stack](#2-technology-stack)
3. [System Architecture](#3-system-architecture)
4. [Repository Layout](#4-repository-layout)
5. [Environment Variables](#5-environment-variables)
6. [Local Setup & Development](#6-local-setup--development)
7. [Routing](#7-routing)
8. [Data Model & Database Schema](#8-data-model--database-schema)
9. [Database Policies & Security](#9-database-policies--security)
10. [Server API (Express)](#10-server-api-express)
11. [Checkout & Stripe Payment Flow](#11-checkout--stripe-payment-flow)
12. [Authentication & Authorization](#12-authentication--authorization)
13. [Admin Panel](#13-admin-panel)
14. [Storefront Feature Guide](#14-storefront-feature-guide)
15. [Waitlist Mode](#15-waitlist-mode)
16. [Caching & Client Data Layer](#16-caching--client-data-layer)
17. [Search & Product Discovery](#17-search--product-discovery)
18. [Theming](#18-theming)
19. [SEO, Sitemap & Social Previews](#19-seo-sitemap--social-previews)
20. [Security](#20-security)
21. [Deployment](#21-deployment)
22. [Build & Scripts](#22-build--scripts)
23. [Seed Data](#23-seed-data)
24. [Known Limitations, Notes & Inconsistencies](#24-known-limitations-notes--inconsistencies)

---

## 1. Project Overview

**KREWNOX** is a direct-to-consumer luxury fashion storefront. It is a fully
client-side rendered React single-page application backed by:

- **Supabase** — PostgreSQL database, Row-Level Security (RLS), authentication
  (email/password + Google OAuth, PKCE flow), storage (product images), and
  Realtime (live waitlist-mode toggling).
- **Stripe** — payment intents, card payments, and webhook-driven order/payment
  status updates.
- **A Node.js/Express API** — payment intent creation, order status lookup,
  Stripe webhooks, and bot-only social preview prerendering. Served under `/api`.

| Attribute | Value |
|---|---|
| Brand | **KREWNOX** |
| Live site | `https://krewnox.ca` |
| Store currency (checkout) | **USD** (nav shows a "CAD" badge — see [Known Limitations](#24-known-limitations-notes--inconsistencies)) |
| Shipping | Free over **$250**, otherwise flat **$12** |
| Tax | **8%** flat rate |
| Auth | Supabase Auth (email/password, Google OAuth, PKCE) |
| Payments | Stripe Payment Intents |
| Admin panel | `/krewnox-admin` (alias `/admin` redirects) |

### Repo history highlights (most recent first)

1. **Waitlist mode** — `global_settings.waitlist_mode` singleton gates the whole storefront to `/waitlist`; live Realtime toggling.
2. **SEO** — prebuild sitemap generator, bot UA social-preview prerendering server, robots.txt, JSON-LD structured data.
3. **Stripe payments** — payment intents, webhooks, order lifecycle, payment activity audit trail.
4. **Admin team management** — role-based admin panel, ownership transfer RPCs, audit logging.
5. **Rebrand** — "Jeremy Atelier" → **KREWNOX**.

> ⚠️ **Note:** [`PROJECT_SETUP.md`](./PROJECT_SETUP.md) is **outdated** — it still describes the
> original MVP spec ("no backend / no database / no auth / no payments"). [`README.md`](./README.md)
> is still the default Vite template. **This document supersedes both.**

---

## 2. Technology Stack

### Frontend

| Layer | Library | Version |
|---|---|---|
| UI framework | React | 19.2.5 |
| Build tool | Vite | 8.0 |
| Language | TypeScript | ~6.0.2 |
| Styling | Tailwind CSS 4 (`@tailwindcss/vite` plugin) | 4.2 |
| Routing | React Router (DOM) | 7.18 |
| Animation | Framer Motion | 12.38 |
| State (global UI) | Zustand | 5.0 |
| Server-state | TanStack Query + `@tanstack/react-query-persist-client` + `query-sync-storage-persister` | 5.100 |
| Forms | react-hook-form | 7.75 |
| Validation | zod | 4.4 |
| HTTP | axios | (legacy placeholder) |
| Icons | react-icons (hi2, fa6, fc) | 5.6 |
| Toasts | react-hot-toast | — |
| Country/region data | country-region-data | 4.1 |
| Class utils | clsx | — |

### Payments & Backend Services

| Service | Package | Version |
|---|---|---|
| Stripe (browser) | `@stripe/stripe-js` | 8.9 |
| Stripe (React) | `@stripe/react-stripe-js` | 5.6 |
| Supabase (client) | `@supabase/supabase-js` | 2.105 |
| Node server | Express | 5.1 |
| Server middleware | helmet, compression, cors, express-rate-limit, dotenv | — |
| Stripe (server) | `stripe` | 19.1.0 |

### Tooling

| Tool | Version |
|---|---|
| ESLint (flat config) | 10 |
| Prettier | — |
| Playwright (dev-only) | 1.62 |
| npm workspaces-style root + `server/` packages | — |

---

## 3. System Architecture

```
┌────────────────────────────────────────────────────────────────────┐
│                            BROWSER (SPA)                            │
│  React 19 + Vite + Tailwind 4 + Framer Motion + Zustand + RQ        │
│                                                                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐  │
│  │  Storefront  │  │ Auth pages   │  │ Admin (conditional mount)│  │
│  │  (MainLayout)│  │ (AuthLayout) │  │ /krewnox-admin           │  │
│  └──────┬───────┘  └──────┬───────┘  └────────────┬─────────────┘  │
│         │                 │                       │                │
│         ▼                 ▼                       ▼                │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  Services layer (src/services) + lib/ (supabase, stripe,    │   │
│  │  paymentApi, auth*, admin*, productCategoryConfig, etc.)    │   │
│  └───────┬───────────────────────────┬─────────────────────────┘   │
└──────────┼───────────────────────────┼─────────────────────────────┘
           │                           │
           │ supabase-js               │ fetch (VITE_PAYMENTS_API_URL or /api)
           ▼                           ▼
┌──────────────────────┐   ┌───────────────────────────────────────┐
│      SUPABASE        │   │   EXPRESS API (server/, port 4242)    │
│  ┌────────────────┐  │   │  /api/health                          │
│  │ PostgreSQL + RLS│  │   │  /api/payments/create-payment-intent │
│  │ Auth (PKCE)     │  │   │  /api/orders/:id/status              │
│  │ Storage bucket  │  │   │  /api/webhooks/stripe                │
│  │  'product-images'│  │   │  /api/social-preview?path=          │
│  │ Realtime        │  │   └───────────────┬───────────────────────┘
│  └────────────────┘  │                   │ stripe SDK
└──────────────────────┘                   ▼
                                  ┌─────────────────┐
                                  │      STRIPE     │
                                  └─────────────────┘
```

### Key architectural decisions

- **Single-page app with lazy loading.** Every route page is `lazy()`-imported and
  wrapped in `<ErrorBoundary>` + `<Suspense>` with a branded loader fallback.
- **Catalog data layer (`useCatalog`)** — a custom promise/data cache with
  localStorage stale-while-revalidate hydration and a tiny pub/sub revalidation
  bus, seeded eagerly from `main.tsx` via `preloadCatalog()`.
- **TanStack Query for everything else** — account data, orders, admin data, and
  the public waitlist flag. Query cache is persisted to localStorage **only for
  `['public', ...]`-keyed queries** (privacy: nothing user-specific is persisted).
- **Server is thin and payment-focused** — all catalog and account reads go
  directly from the browser to Supabase; the Express server exists for Stripe
  secret-key operations, webhooks, guest order lookups, and bot prerendering.
- **Price authority lives on the server.** Client prices are treated as
  untrusted; the server re-fetches products from Supabase and computes totals
  itself.
- **Waitlist mode is a global kill-switch** enforced at the layout level plus
  per-auth-route gates, driven by a Realtime-synced singleton row.

---

## 4. Repository Layout

```
├── .env.example                  # Frontend env template
├── .gitattributes
├── .gitignore
├── eslint.config.js              # Flat ESLint config (JS + TS + react-hooks + react-refresh)
├── index.html                    # App shell: theme bootstrap, fonts, preconnects, OG meta
├── package.json                  # Root: scripts + all frontend deps
├── package-lock.json
├── PROJECT_SETUP.md              # ⚠️ OUTDATED original MVP spec — see Section 24
├── README.md                     # ⚠️ Default Vite template — see Section 24
├── tsconfig.json                 # Solution-style references
├── tsconfig.app.json             # App TS config (es2023, bundler resolution, react-jsx)
├── tsconfig.node.json            # Node-side config (vite.config.ts only)
├── vercel.json                   # Vercel rewrites, headers, CSP, bot prerender routing
├── vite.config.ts                # Dev /api proxy + manualChunks code splitting
│
├── api/
│   └── server.ts                 # Vercel serverless entry: re-exports server/dist/app.js
│
├── src/                          # Frontend application
│   ├── main.tsx                  # Entry: preloadCatalog() then render <App/>
│   ├── App.tsx                   # Providers + route table
│   ├── index.css                 # Tailwind 4 + design tokens (CSS variables)
│   ├── components/
│   │   ├── account/              # ShippingAddressForm/Manager, dashboard/
│   │   │   └── dashboard/        # accountSections.ts, AccountSidebar, AdminTransferBanner,
│   │   │                         # DashboardHeader, DashboardSkeleton, EmptyState, LogoutModal,
│   │   │                         # OrderCard, OrderHistoryTable, PaymentStatusBadge,
│   │   │                         # StatusBadge, UserProfileCard
│   │   ├── admin/                # AdminLayout, AdminPageHeader, AdminProductCategoryFields,
│   │   │                         # AdminProductMediaFields, AdminProductPreview,
│   │   │                         # AdminSessionContext, AdminSidebar, AdminStatCard,
│   │   │                         # RequireAdmin, RequireAdminPermission, TransferControlModal
│   │   ├── auth/                 # AuthButton, AuthGuard, AuthInput, AuthLayout,
│   │   │                         # AuthLoader, GoogleAuthButton (+ AuthDivider)
│   │   ├── checkout/             # CheckoutAddressFields, CheckoutCartSummary,
│   │   │                         # CheckoutConfirmation, CheckoutShippingSelector,
│   │   │                         # CheckoutTestCards, StripePaymentForm
│   │   ├── common/               # Badge, BrandLoader, BrandLogo, Button, ErrorBoundary,
│   │   │                         # Input (FieldLabel/Textarea), SectionHeading (+FadeIn),
│   │   │                         # ThemeToggle
│   │   ├── home/                 # CategoryTiles, HeroSection, LookbookGrid,
│   │   │                         # NewsletterSection, ProductShowcase (+TrendingStrip)
│   │   ├── layout/               # AdminTransferNotification, AnnouncementBar, CartDrawer,
│   │   │                         # Container, Footer, MobileMenu, Navbar
│   │   ├── product/              # FilterSidebar, ProductCard, ProductGallery, ProductGrid
│   │   ├── search/               # ProductSearchField (combobox, inline + icon + overlay)
│   │   ├── seo/                  # Seo.tsx (per-route <head> management)
│   │   └── waitlist/             # WaitlistPublicGate
│   ├── constants/
│   │   ├── index.ts              # BRAND, ROUTES (full table), SORT_OPTIONS
│   │   ├── brandAssets.ts        # BRAND_LOGO mark path + aspect ratio
│   │   └── siteContent.ts        # site-setting keys, defaults for hero/banner/social
│   ├── context/
│   │   ├── AuthContext.tsx       # Session lifecycle, signIn/Up, Google, password reset
│   │   ├── ThemeContext.tsx      # Appearance mode + per-user profile sync
│   │   └── WaitlistModeContext.tsx # Waitlist flag + Realtime subscription
│   ├── hooks/
│   │   ├── useAdminTransferInbox.ts # Transfer offer polling + accept/decline
│   │   ├── useBodyScrollLock.ts  # Scroll lock helper (drawers/modals)
│   │   ├── useCatalog.ts         # Catalog data layer (caches, SWR, pub/sub, preload)
│   │   ├── useDebouncedValue.ts  # Generic debounce helper
│   │   ├── useMediaQuery.ts      # Responsive breakpoint hook
│   │   └── useProductSearch.ts   # 250ms-debounced product search
│   ├── layouts/
│   │   └── MainLayout.tsx        # Storefront chrome: AnnouncementBar, Navbar, MobileMenu,
│   │                             # CartDrawer, animated <Outlet/>, Footer + waitlist gate
│   ├── lib/
│   │   ├── adminAuth.ts          # isAdminUser, isAppOwner, email allowlist
│   │   ├── adminPermissions.ts   # ADMIN_ROLES + ROLE_PERMISSIONS matrix (11 perms)
│   │   ├── adminPortal.ts        # isAdminPortalMounted, getAdminBasePath
│   │   ├── authErrors.ts         # friendlyAuthError mapping
│   │   ├── authRedirect.ts       # callback/login redirects, sanitizeNextPath
│   │   ├── authStorage.ts        # localStorage→sessionStorage→memory auth storage chain
│   │   ├── countryRegionData.ts  # country-region-data wrappers
│   │   ├── geolocation.ts        # detectLocation() via geojs.io (best-effort)
│   │   ├── orderStatus.ts        # ORDER_STATUSES enum/labels/tones/normalize
│   │   ├── paymentApi.ts         # createPaymentIntent, getGuestOrderStatus, PaymentApiError
│   │   ├── paymentStatus.ts      # PAYMENT_STATUSES + readPaymentActivity (stripe_events)
│   │   ├── productCategoryConfig.ts # product kinds, size presets, attribute fields
│   │   ├── queryClient.ts        # RQ config + public-only localStorage persistence
│   │   ├── seo.ts                # SITE_NAME/SITE_URL/DEFAULT_META_DESCRIPTION/absoluteUrl
│   │   ├── stripe.ts             # getStripe() lazy singleton, isStripeConfigured
│   │   ├── structuredData.ts     # organization/website/breadcrumb/product JSON-LD
│   │   ├── supabase.ts           # Client-side Supabase (PKCE, persistSession, authStorage)
│   │   └── theme.ts              # AppearanceMode, apply/read/write cache helpers
│   ├── pages/
│   │   ├── Home/HomePage.tsx
│   │   ├── Shop/ShopPage.tsx
│   │   ├── Product/ProductPage.tsx
│   │   ├── Cart/CartPage.tsx
│   │   ├── Checkout/CheckoutPage.tsx        # 3-step Stripe checkout (523 lines)
│   │   ├── Account/AccountDashboardPage.tsx # hash-sectioned dashboard (522 lines)
│   │   ├── Auth/                            # Login, Register, ForgotPassword, ResetPassword,
│   │   │                                    # AuthCallbackPage (PKCE race fix)
│   │   ├── Waitlist/WaitlistPage.tsx
│   │   ├── Legal/                           # Terms, PrivacyPolicy, RefundPolicy
│   │   └── Admin/                           # 16 files: login, entry, 11 pages, helpers
│   │       ├── AdminProtectedEntry.tsx      # RequireAdmin + admin sub-routes
│   │       ├── adminProductForm.ts          # payload<->form<->preview converters
│   │       ├── adminLoginLockout.ts         # 8-failure / 5-min sessionStorage lockout
│   │       └── Admin*.tsx                   # Overview, Products, Categories, Orders,
│   │                                        # Waitlist, Users, Team, Discounts, Settings,
│   │                                        # SiteContent, Security
│   ├── routes/
│   │   ├── AdminLegacyRedirect.tsx          # /admin/* → configured base path
│   │   └── ProtectedRoute.tsx               # auth guard for account routes
│   ├── services/
│   │   ├── adminOwnershipService.ts         # team RPC wrappers
│   │   ├── adminService.ts                  # all admin CRUD + dashboard stats (15.7 KB)
│   │   ├── api.client.ts                    # legacy placeholder axios client
│   │   ├── globalSettingsService.ts         # fetchPublicWaitlistMode
│   │   ├── mappers.ts                       # ProductRow/CategoryRow → domain types
│   │   ├── orderService.ts                  # customer order queries w/ nested items
│   │   ├── productImageService.ts           # storage uploads (10 MB, sanitized names)
│   │   ├── productService.ts                # public catalog queries (+retry/backoff)
│   │   ├── profileService.ts                # theme preference read/write
│   │   ├── shippingAddressService.ts        # address CRUD
│   │   ├── siteContentService.ts            # hero/banner/social parse + defaults
│   │   └── waitlistService.ts               # joinWaitlist (duplicate-safe)
│   ├── store/
│   │   ├── cartStore.ts                     # persisted cart w/ line snapshots (v2)
│   │   ├── uiStore.ts                       # cartOpen, mobileNavOpen, shopFiltersOpen
│   │   └── wishlistStore.ts                 # persisted 'noir-wishlist' (v1)
│   ├── types/index.ts                       # Product, Category, CartLine, ShippingAddress,
│   │                                        # WaitlistEntry, ProductKind, Gender, attributes
│   └── utils/
│       ├── checkoutTotals.ts                # shipping/tax constants + calculator
│       ├── cn.ts                            # clsx + tailwind-merge
│       ├── formatPrice.ts                   # USD Intl + "X.XX CAD" variant
│       ├── passwordValidation.ts            # MIN_PASSWORD=8, letter+number rule
│       ├── productPricing.ts                # getSellingPrice, roundMoney
│       ├── productSearch.ts                 # haystack builder + filter
│       ├── productSort.ts                   # 5 sort modes, new-arrival window
│       └── shippingAddress.ts               # checkout<->address conversions
│
├── server/                      # Express payment API
│   ├── package.json
│   ├── .env.example
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts             # bootstraps app on PORT
│       ├── app.ts               # helmet/compression/cors, rate limiters, routes
│       ├── config.ts            # env parsing (required()/optional())
│       ├── types.ts             # shared server types
│       ├── lib/
│       │   ├── stripe.ts        # Stripe SDK instance
│       │   └── supabase.ts      # supabaseAnon + requireSupabaseAdmin()
│       ├── middleware/
│       │   ├── auth.ts          # optional bearer auth for signed-in checkout
│       │   └── validateCheckout.ts # zod checkout payload validation
│       ├── routes/
│       │   ├── orders.ts        # GET /api/orders/:id/status
│       │   ├── payments.ts      # POST /api/payments/create-payment-intent
│       │   ├── socialPreview.ts # bot-only prerender (389 lines)
│       │   └── webhooks.ts      # Stripe webhook verification + 4 handlers
│       └── services/
│           └── orderService.ts  # totals, validation, order lifecycle, CheckoutError
│
├── supabase/
│   ├── migrations/              # 15 SQL migrations (0001–0014; two 0010 files)
│   └── seed.sql                 # 5 categories, 23 products, 3 discount codes
│
├── scripts/
│   └── generate-sitemap.mjs     # prebuild sitemap generator (fails safe)
│
└── public/
    ├── brand/logo.png           # brand mark
    ├── robots.txt               # crawl rules + sitemap ref
    ├── sitemap.xml              # generated (6 static + 23 product URLs)
    └── vite.svg
```

---

## 5. Environment Variables

### Frontend (`.env` at repo root — template in `.env.example`)

| Variable | Required | Description |
|---|---|---|
| `VITE_SUPABASE_URL` | Yes* | Supabase project URL. *Required unless Supabase is disabled (then storefront runs without data). |
| `VITE_SUPABASE_ANON_KEY` | Yes* | Supabase anon/publishable key (RLS still protects data). |
| `VITE_ADMIN_PORTAL_ENABLED` | No | `'false'` disables the admin portal entirely (default: enabled — `isAdminPortalMounted()` returns `VITE_ADMIN_PORTAL_ENABLED !== 'false'`). |
| `VITE_ADMIN_BASE_PATH` | No | Staff base path (default `/krewnox-admin`). `/admin` always redirects to it. |
| `VITE_ADMIN_ALLOWED_EMAILS` | No | Comma-separated email allowlist for admin sign-in (checked alongside Supabase role). |
| `VITE_STRIPE_PUBLISHABLE_KEY` | No | Stripe publishable key (checkout disabled gracefully when absent — `isStripeConfigured`). |
| `VITE_PAYMENTS_API_URL` | No | Base URL for the payment API (default `/api` — same-origin via Vercel rewrite / Vite proxy). |

### Server (`server/.env` — template in `server/.env.example`)

| Variable | Required | Description |
|---|---|---|
| `PORT` | No | Express port (default `4242`). |
| `CLIENT_ORIGIN` | No | Comma-separated allowed CORS origins. Combined with `VERCEL_URL` (auto-`https://`). Falls back to `https://krewnox.ca`. |
| `STRIPE_SECRET_KEY` | **Yes** | Stripe secret key (server only). |
| `STRIPE_WEBHOOK_SECRET` | No | `whsec_...` for webhook signature verification. Without it, webhook handler skips verification (local dev). |
| `SUPABASE_URL` | **Yes** | Supabase project URL (server-side). |
| `SUPABASE_ANON_KEY` | **Yes** | Supabase anon key (server uses it for public product re-fetch). |
| `SUPABASE_SERVICE_ROLE_KEY` | No* | **Required for webhooks and guest checkout** — used by `requireSupabaseAdmin()` to bypass RLS. The `optional()` helper discards placeholder values containing `your-`. |

---

## 6. Local Setup & Development

### Prerequisites

- Node.js 20+ (Vite 8 / React 19)
- A Supabase project (free tier is fine)
- A Stripe account (test mode)
- npm

### Steps

```bash
# 1. Install root dependencies (frontend)
npm install

# 2. Install server dependencies
cd server && npm install && cd ..

# 3. Configure environment
#    - Copy .env.example → .env  (root)   and fill in Supabase + Stripe values
#    - Copy server/.env.example → server/.env

# 4. Set up the database
#    Apply supabase/migrations/*.sql to your Supabase project (SQL Editor or
#    `supabase db push` if using the CLI), then run supabase/seed.sql.

# 5. Start everything (frontend + payment server together)
npm run dev:all
#    Frontend:  http://localhost:5173  (Vite)
#    API:       http://localhost:4242  (Express, proxied at /api by Vite)

# 6. (Optional) Forward Stripe webhooks locally
stripe listen --forward-to localhost:4242/api/webhooks/stripe
#    Then set STRIPE_WEBHOOK_SECRET to the printed whsec_ value.
```

### Common dev commands

| Command | Purpose |
|---|---|
| `npm run dev` | Vite dev server only |
| `npm run dev:server` | Express API with `tsx watch` on port 4242 |
| `npm run dev:all` | Both concurrently (`concurrently -k`) |
| `npm run build` | Sitemap prebuild → server build → `tsc -b` → Vite build |
| `npm run lint` | ESLint over the repo |
| `npm run preview` | Preview the built app |
| `npm run sitemap` | Regenerate `public/sitemap.xml` |

---

## 7. Routing

All routes are defined in [`src/App.tsx`](./src/App.tsx) using
`ROUTES` from [`src/constants/index.ts`](./src/constants/index.ts).

### 7.1 Public storefront (wrapped in `MainLayout`)

| Path | Page | Notes |
|---|---|---|
| `/` | HomePage | Hero, featured products, category tiles, lookbook, newsletter |
| `/shop` | ShopPage | Grid + filters (`?q=`, `?category=`, `?sort=`, `?min=`, `?max=` supported) |
| `/product/:slug` | ProductPage | `decodeURIComponent(slug)`; 404/error states |
| `/cart` | CartPage | Bag list, qty steppers, coupon UI (placeholder), summary |
| `/checkout` | CheckoutPage | 3-step details → payment → confirmation |
| `/waitlist` | WaitlistPage | Public waitlist form (also the only public page in waitlist mode) |
| `/terms` | TermsPage | Legal |
| `/privacy` | PrivacyPolicyPage | Legal |
| `/refund-policy` | RefundPolicyPage | Legal |
| `*` | → redirect to `/` | Wildcard fallback |

### 7.2 Auth routes (outside `MainLayout`)

| Path | Page | Notes |
|---|---|---|
| `/login` | LoginPage | Behind `WaitlistPublicGate` |
| `/register` | RegisterPage | Behind `WaitlistPublicGate`; `emailRedirectTo` = callback?type=signup |
| `/forgot-password` | ForgotPasswordPage | Behind `WaitlistPublicGate` |
| `/reset-password` | ResetPasswordPage | Consumes recovery token from callback |
| `/auth/callback` | AuthCallbackPage | PKCE code exchange (double-exchange race fix) |

### 7.3 Account routes (protected by `ProtectedRoute`)

`ProtectedRoute` shows `AuthLoader` while auth is loading and redirects to
`/login` with `state.from` when signed out.

| Path | Behavior |
|---|---|
| `/account` | AccountDashboardPage — hash-based sections: `#dashboard`, `#orders`, `#addresses`, `#wishlist`, `#settings`, `#security` |
| `/orders` | → redirect to `/account#orders` |
| `/profile` | → redirect to `/account#settings` |
| `/saved` | → redirect to `/account#wishlist` |

### 7.4 Admin routes

Mounted **only when `isAdminPortalMounted()`** (`VITE_ADMIN_PORTAL_ENABLED !== 'false'`).
`ROUTES.admin` = `getAdminBasePath()` (default `/krewnox-admin`).

| Path | Page |
|---|---|
| `/admin/*` | `AdminLegacyRedirect` → `{base}/*` (preserves path, search, hash) |
| `{base}/login` | AdminLoginPage |
| `{base}` (index) | AdminOverviewPage (dashboard stats) |
| `{base}/products` | AdminProductsPage (CRUD + live storefront preview + audit log) |
| `{base}/categories` | AdminCategoriesPage |
| `{base}/orders` | AdminOrdersPage |
| `{base}/waitlist` | AdminWaitlistPage |
| `{base}/users` | AdminUsersPage |
| `{base}/team` | AdminTeamPage (grant roles, ownership transfer) |
| `{base}/discounts` | AdminDiscountsPage |
| `{base}/settings` | AdminSettingsPage |
| `{base}/site-content` | AdminSiteContentPage (hero slides, top banner, footer social) |
| `{base}/security` | AdminSecurityPage |
| `{base}/*` | → redirect to `{base}` |

---

## 8. Data Model & Database Schema

All tables live in the `public` schema. 15 migration files (`0001`–`0014`; note
there are **two** `0010_*` files). Primary keys are `uuid` with
`gen_random_uuid()` defaults unless noted.

### `categories`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `name` | text | |
| `slug` | text unique | e.g. `hoodies`, `t-shirts`, `jackets`, `sneakers`, `accessories` |
| `description` | text | |
| `image_url` | text | |
| `product_kind` | text | check: `apparel` / `footwear` / `accessories` (added in 0006) |

### `products`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `created_at` | timestamptz | |
| `title` | text | maps to `Product.name` client-side |
| `slug` | text **unique** | route key `/product/:slug` |
| `description` | text | |
| `price` | numeric | selling price (authoritative server-side) |
| `compare_price` | numeric nullable | "original" price → sale display when set |
| `category` | text FK → `categories.slug` | |
| `brand` | text | |
| `stock_quantity` | int | |
| `featured` | boolean | |
| `rating` | numeric | 0–5 |
| `image_url` | text | primary image |
| `gallery_images` | text[] | additional images |
| `tags` | text[] | |
| `sku` | text **unique** | |
| `status` | text | `active` / `draft` / `archived` — **only `active` is public** |
| `gender` | text | `men` / `women` / `unisex` |
| `sizes` | text[] | |
| `colors` | jsonb | `[{ "name": string, "hex": string }]` |
| `attributes` | jsonb | kind-specific: `material`, `upperMaterial`, `outsole`, `width`, `heelHeight`, `closure`, `fit`, `fabric`, `lining`, `dimensions`, `care`; **GIN-indexed** |

### `waitlist`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `created_at` | timestamptz | |
| `email` | text **unique** | duplicate insert → PG 23505 handled in `waitlistService` |
| `full_name` | text | falls back to email local-part |
| `phone` | text | |
| `instagram` | text | |
| `interested_product` | uuid nullable FK → `products.id` | |
| `status` | text | e.g. `pending` |
| `discount_code_sent` | boolean | admin flag |

### `discount_codes`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `created_at` | timestamptz | |
| `code` | text unique | e.g. `WELCOME10` |
| `percentage` | numeric | |
| `active` | boolean | |
| `expires_at` | timestamptz nullable | |

> Note: discount codes are managed in admin and seeded, but **checkout does not
> yet apply them** — the cart coupon input is UI-only (MVP placeholder).

### `profiles` (mirrors `auth.users`)

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK = `auth.users.id` | |
| `created_at` | timestamptz | |
| `email` | text | |
| `full_name` | text | |
| `is_admin` | boolean | admin flag |
| `admin_role` | text | one of 5 roles (0005) |
| `is_owner` | boolean | single-owner **partial unique index** |
| `suspended` | boolean | |
| `account_status` | text | `active` / `suspended` / `banned` |
| `theme_preference` | text | per-user theme (0009/0010) |
| `appearance_mode` | text | `light` / `dark` |
| `theme_updated_at` | timestamptz | |

### `orders`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `created_at` / `updated_at` | timestamptz | |
| `user_id` | uuid nullable FK | null = guest checkout |
| `email` | text | |
| `status` | text | `pending` / `paid` / `processing` / `shipped` / `delivered` / `cancelled` |
| `payment_status` | text | `unpaid` / `processing` / `paid` / `failed` / `refunded` / `partial_refund` |
| `total_amount` | numeric | |
| `currency` | text | default `USD` |
| `shipping_address` | jsonb | snapshot |
| `billing_address` | jsonb | snapshot |
| `payment_metadata` | jsonb | `stripe_events[]` (capped at 20) + PI details |
| `idempotency_key` | text | **partial unique index** (non-null) — dedupe |
| `stripe_payment_intent_id` | text | **partial unique index** (non-null) |
| `notes` | text nullable | admin |

### `order_items`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `order_id` | uuid FK → `orders.id` | |
| `product_id` | uuid FK → `products.id` | |
| `product_slug` | text | snapshot |
| `product_name` | text | snapshot |
| `product_image` | text | snapshot |
| `size` | text | snapshot |
| `color_name` | text | snapshot |
| `quantity` | int | |
| `unit_price` | numeric | snapshot |

### `audit_logs`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `created_at` | timestamptz | |
| `actor_id` | uuid nullable | |
| `actor_email` | text nullable | |
| `action` | text | e.g. `product.create`, `product.update` |
| `entity_type` | text nullable | |
| `entity_id` | text nullable | |
| `metadata` | jsonb | change payload |

### `site_settings`

| Column | Type | Notes |
|---|---|---|
| `key` | text PK | `hero_slides`, `footer_social`, `top_banner` |
| `value` | jsonb | parsed client-side with defaults |

### `global_settings` (singleton)

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | fixed `00000000-0000-0000-0000-000000000001` |
| `waitlist_mode` | boolean | **waitlist kill-switch** |

### `user_shipping_addresses`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `created_at` / `updated_at` | timestamptz | |
| `user_id` | uuid FK | |
| `label` | text nullable | e.g. "Home" |
| `full_name` / `line1` / `line2` / `city` / `region` / `postal_code` / `country` | text | |
| `is_default` | boolean | **partial unique index** per user; DB triggers sync/promote defaults |

### `admin_ownership_transfers`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `created_at` | timestamptz | |
| `from_user_id` | uuid | current owner |
| `to_user_id` | uuid | target |
| `from_email` / `to_email` | text | display |
| `note` | text nullable | |
| `status` | text | `pending` / `accepted` / `declined` / `cancelled` |
| `responded_at` | timestamptz nullable | |

---

## 9. Database Policies & Security

### Row-Level Security (RLS) highlights

| Table | Public (anon) | Authenticated (user) | Admin |
|---|---|---|---|
| `products` | **SELECT only `status='active'`** | same as public | full CRUD |
| `categories` | SELECT | SELECT | full CRUD |
| `waitlist` | **INSERT only** (public signup) | — | SELECT/UPDATE/DELETE all |
| `orders` | — | SELECT own (user_id = auth.uid()); INSERT own unpaid; UPDATE own unpaid/failed | all |
| `order_items` | — | via order RLS | all |
| `profiles` | — | SELECT/UPDATE own (privileged columns protected by trigger) | admin |
| `site_settings` | SELECT for keys `hero_slides`, `footer_social`, `top_banner` | same | all |
| `global_settings` | SELECT (waitlist_mode) | same | UPDATE |
| `user_shipping_addresses` | — | full CRUD own | all |
| `discount_codes` | — | — | all |
| `audit_logs` | — | — | all (admin) |
| `admin_ownership_transfers` | — | SELECT/respond own | — |

### `protect_profile_privileged_columns` trigger

A `BEFORE UPDATE` trigger on `profiles` that **reverts** `is_admin`, `admin_role`,
`is_owner`, `suspended`, and `account_status` to their existing values when the
updater is not an admin — a self-escalation guard. It distinguishes admins by
`current_user` (the database role) rather than JWT claims.

### SECURITY DEFINER functions (migration 0014)

All `SECURITY DEFINER` (execute with definer privileges), all `GRANT EXECUTE` to
`authenticated`:

| Function | Purpose |
|---|---|
| `is_app_owner()` | Returns whether `auth.uid()` is the store owner (`is_owner=true`) |
| `admin_grant_admin_role(target_email, role)` | **Owner only**; sets `is_admin=true` + one of 5 roles |
| `admin_request_ownership_transfer(target_email, note)` | Owner creates a `pending` transfer |
| `admin_cancel_ownership_transfer(transfer_id)` | Owner cancels their own pending transfer |
| `admin_respond_ownership_transfer(transfer_id, accept)` | Target accepts (owner demoted to regular admin, caller promoted to `SUPER_ADMIN` + `is_owner=true`) or declines |

### Storage

- Bucket: **`product-images`**
- Public read for images; **admin-only write**
- Constraints: max **10 MB**, types `jpeg` / `png` / `webp` / `gif`
- Client upload path: `Date.now() + '-' + uuid` with a sanitized filename
  (`productImageService.ts`)

### Seed data promotion

- Migration `0004` promotes **Alfred Mukasa** to admin.
- Migration `0014` seeds: the earliest admin becomes **owner** (`SUPER_ADMIN`, `is_owner=true`).

---

## 10. Server API (Express)

The server lives in [`server/`](./server) (own `package.json`, port 4242). In
production it runs as a single serverless function on Vercel via
[`api/server.ts`](./api/server.ts) (`import app from '../server/dist/app.js'`).

### Middleware stack (`server/src/app.ts`)

1. **Helmet** — security headers
2. **Compression** — gzip
3. **CORS** — origin from `CLIENT_ORIGIN` (comma-separated) + `VERCEL_URL`; default `https://krewnox.ca`
4. **Rate limiters** (express-rate-limit):

| Limiter | Window | Limit | Applied to |
|---|---|---|---|
| `socialPreviewLimiter` | 60 s | 30 | social-preview paths (bot + `?social-preview-path=`) |
| `apiLimiter` | 60 s | 60 | all `/api/*` |
| `paymentsLimiter` | 60 s | 12 | `POST /api/payments/create-payment-intent` |
| `orderLookupLimiter` | 60 s | 20 | `GET /api/orders/:id/status` |

5. **Bot middleware** — global `?social-preview-path=` handling (also wired in
   `vercel.json` at the edge)
6. **Raw body** for `/api/webhooks/stripe` (signature verification needs the
   exact payload)
7. `trust proxy` = 1 (correct client IP behind Vercel)

### Endpoints

#### `GET /api/health`
Health check. `{ ok: true }`.

#### `POST /api/payments/create-payment-intent`
Creates a pending order + Stripe PaymentIntent. See [Section 11](#11-checkout--stripe-payment-flow).
Body validated by `validateCheckout.ts` (zod). Optional `Authorization: Bearer`
for signed-in users (order tied to their account via user-scoped Supabase client).

#### `GET /api/orders/:id/status`
Guest order status lookup. Body/query carries `email`. Rate-limited. Used by
`CheckoutConfirmation` polling.

#### `POST /api/webhooks/stripe`
Stripe webhook receiver. Verifies `stripe-signature` with `STRIPE_WEBHOOK_SECRET`
(when configured). Handlers:

| Event | Behavior |
|---|---|
| `payment_intent.processing` | order → `processing` payment_status |
| `payment_intent.succeeded` | `markOrderPaidFromIntent`: order → `paid`/`paid` payment_status; stores `stripe_payment_intent_id`, `status`, `amount_received`, `currency`, `payment_method`, `latest_charge`, `paid_at`; appends to `payment_metadata.stripe_events` |
| `payment_intent.payment_failed` | order payment_status → `failed` |
| `charge.refunded` | payment_status → `refunded` if `amount_refunded === amount_total`, else `partial_refund` |

All status transitions are guarded with `.neq()` / `.in()` filters to prevent
regressions (e.g. a paid order can't be moved back to unpaid).

#### `GET /api/social-preview?path=...`
Bot-only prerender (see [Section 19](#19-seo-sitemap--social-previews)).

### Server service — `orderService.ts`

- **Totals** (authoritative, duplicated client-side — see Section 24):
  - `SHIPPING_THRESHOLD = 250` (USD) → free shipping
  - `SHIPPING_FLAT = 12`
  - `TAX_RATE = 0.08`
- Validates each item: product must exist, be `status='active'`, quantity integer 1–20, stock sufficient.
- Unit price = `getSellingPrice(price, compare_price)` → `compare_price ?? price`, **server-fetched; client prices ignored**.
- `createPendingOrder(...)` inserts `orders` (`pending`/`unpaid`) + `order_items` with **rollback on failure**.
- PG unique violation `23505` → HTTP 409 (idempotency key / PI id collision).
- **Idempotent retry**: same `idempotencyKey` (≥8 chars) → returns existing PI if `client_secret` is retrievable; stale PI cleared via `clearOrderPaymentIntent`.
- **Paid order** → 409 (can't re-charge).
- Stripe PI: `automatic_payment_methods`, `receipt_email`, metadata `{ order_id, user_id | 'guest', idempotency_key }`, Stripe idempotencyKey = checkout idempotencyKey, minimum amount **$0.50**.
- Signed-in users: `body.email` must equal the account email.

---

## 11. Checkout & Stripe Payment Flow

`CheckoutPage.tsx` implements a 3-step flow: **Details → Payment → Confirmation**.

### Step 1 — Details
- zod schema with a `superRefine` for billing address validation
- Billing/shipping fields (`CheckoutAddressFields`)
- Shipping method selector (`CheckoutShippingSelector`)
- **Geolocation autofill** via `detectLocation()` (best-effort; `get.geojs.io/v1/ip/geo.json`)
- Signed-in users can pick a **saved shipping address** (queryKey
  `['customer','shipping-addresses',user?.id]`) and save new ones
- Cart prices are reconciled against the live catalog
  (`reconcileCatalogPrices`) on load
- Guest checkout supported (order `user_id` null; webhook/guest-status flow uses
  service role)

### Step 2 — Payment
- Stripe Elements via `<StripePaymentForm>` (`@stripe/react-stripe-js`)
- `createPaymentIntent` (`lib/paymentApi.ts`) posts to
  `VITE_PAYMENTS_API_URL || '/api'` with:
  - items, email, addresses, shipping method
  - **`idempotencyKey`** = `crypto.randomUUID()` (client)
  - optional `accessToken` when signed in
- Returns `{ clientSecret }` → `stripe.confirmPayment(...)`
- DEV-only `CheckoutTestCards` component shows Stripe test cards:
  - `4242 4242 4242 4242` — success
  - `4000 0000 0000 0002` — declined
  - `4000 0027 6000 3184` — 3DS challenge

### Step 3 — Confirmation
- Reads `payment_intent` + `redirect_status` from the URL
- Stores `krewnox-checkout-order-id` / `krewnox-checkout-email` in sessionStorage
- `CheckoutConfirmation` **polls** `getCustomerOrderPaymentStatus` (signed-in) or
  `getGuestOrderStatus` (guest) with a **2 s refetchInterval** until `paid`/`failed`
- On success: cart cleared, order confirmation shown

### Order totals (client mirror — `utils/checkoutTotals.ts`)
- `subtotal` = Σ snapshot.unitPrice × qty
- `shipping` = 0 if subtotal ≥ 250 else 12
- `tax` = round(subtotal × 0.08)
- `total` = subtotal + shipping + tax (rounded to cents)

> The server recomputes all of this itself; client numbers are display-only.

### Stripe integration summary
- Client: lazy `getStripe()` singleton from publishable key
- Server: `stripe` SDK v19.1.0 with secret key
- PI lifecycle managed entirely server-side; webhooks drive order state
- `payment_metadata.stripe_events` array (capped at 20) = audit trail of
  `{ type, at, stripe_status, amount, currency }`

---

## 12. Authentication & Authorization

### Supabase client configuration (`lib/supabase.ts`)
- **PKCE flow** (code verifier/challenge — no implicit tokens)
- `persistSession: true`, `detectSessionInUrl: true`
- Custom **auth storage adapter** (`lib/authStorage.ts`):
  `localStorage → sessionStorage → in-memory` fallback chain (Safari
  private-mode / ITP resilience)
- Storage key: `krewnox-auth`
- Custom `x-client-info` header

### Auth pages
- **Login** — email/password or Google (OAuth with `redirectTo` = callback?next=/account)
- **Register** — creates account with `full_name` in user metadata; `emailRedirectTo` = callback?type=signup
- **Forgot password** — `resetPasswordForEmail` with redirect to callback?type=recovery&next=/reset-password
- **Reset password** — consumes recovery session, `updateUser({ password })`
- **AuthCallback** (`AuthCallbackPage`) — exchanges the PKCE `code`. Includes a
  **double-exchange race fix**: guards against Supabase's own
  `detectSessionInUrl` also trying to exchange the same code (token already used
  errors are swallowed/redirected cleanly). Non-callback pages that arrive with
  auth params (`code`, `access_token`, `error`) are redirected to `/auth/callback`
  via `AuthContext`.
- **AuthLayout** — editorial split layout (Unsplash background), `noindex` via `Seo`

### Redirect safety (`lib/authRedirect.ts`)
- `getAuthCallbackUrl()` builds callback URLs with `next`/`type` params
- `sanitizeNextPath()` blocks redirect targets of `login`, `register`,
  `auth/callback`, `reset-password` (open-redirect protection)

### Error mapping (`lib/authErrors.ts`)
Friendly messages for: expired/invalid token, email not confirmed, storage
unavailable, network errors, provider errors.

### Guards
- **`ProtectedRoute`** — account routes (see 7.3)
- **`AuthGuard`** — component-level guard for auth-only UI bits
- **`RequireAdmin` / `RequireAdminPermission`** — admin panel (see Section 13)
- **`WaitlistPublicGate`** — wraps login/register/forgot-password so those
  routes redirect to `/waitlist` when waitlist mode is on

### Admin authentication
- Email allowlist: `VITE_ADMIN_ALLOWED_EMAILS`
- `isAdminUser` = `app_metadata.role === 'admin'`
- `isAppOwner` = `app_metadata.is_owner === true`
- **Brute-force lockout** (`adminLoginLockout.ts`): 8 failed attempts →
  5-minute lockout tracked in sessionStorage
- Non-admin signed-in users hitting admin get a **blocking session** screen
- `AdminSessionContext` revalidates admin status on session refresh

---

## 13. Admin Panel

### Roles (`lib/adminPermissions.ts`)

| Role | Permissions granted |
|---|---|
| `SUPER_ADMIN` | **all 11** permissions |
| `PRODUCT_MANAGER` | dashboard, products, categories, discounts |
| `ORDER_MANAGER` | dashboard, orders |
| `CONTENT_MANAGER` | dashboard, products, categories, site_content |
| `SUPPORT_ADMIN` | dashboard, waitlist, users, orders |

Unknown roles default to `SUPER_ADMIN` (defensive). 11 permission types:
dashboard, products, categories, orders, waitlist, users, discounts, settings,
site_content, security, team (exact names as wired in `RequireAdminPermission`).

### Pages (see route table 7.4)

| Page | Highlights |
|---|---|
| **Overview** | Stat cards: product count, waitlist count, user count, pending orders, pending waitlist, low stock, revenue total |
| **Products** | Full CRUD; kind-aware fields (sizes presets per category, attribute fields per kind); image upload (featured + gallery, multi-file, URL paste); **live storefront preview** (`AdminProductPreview`: hover image swap, compare-price strikethrough, size chips, gallery grid); **audit logging** |
| **Categories** | CRUD with `product_kind` resolution |
| **Orders** | Status/payment-status badges, order detail incl. `readPaymentActivity` timeline |
| **Waitlist** | Entries, status management, `discount_code_sent` flag |
| **Users** | Profiles: suspend/ban (`account_status`), role visibility |
| **Team** | Grant roles (owner-only via RPC), **ownership transfer** (`TransferControlModal`), incoming-transfer notifications (navbar bell + account banner) |
| **Discounts** | Code CRUD (active/expiry/percentage) |
| **Settings** | Global settings incl. waitlist-mode toggle (Realtime-propagated) |
| **Site Content** | `hero_slides`, `top_banner`, `footer_social` editors |
| **Security** | Ownership/audit tooling |

### Admin transfer UX
- `useAdminTransferInbox` polls `listMyIncomingTransfer` every **60 s**
  (staleTime 30 s)
- `useRespondAdminTransfer`: accept → refresh session + navigate to admin
- `AdminTransferBanner` (account page) + `AdminTransferNotification` (navbar bell)
  surface the offer

---

## 14. Storefront Feature Guide

### Home (`HomePage`)
- `HeroSection` — full-bleed editorial hero (slides from `site_settings.hero_slides` or defaults)
- `ProductShowcase` — featured products + `TrendingStrip`
- `CategoryTiles` — category cards
- `LookbookGrid` — imagery grid
- `NewsletterSection` — email capture

### Shop (`ShopPage`)
- `ProductGrid` (2/3/4-col responsive)
- `FilterSidebar` — category, price range, gender, sizes
- Sorting via `utils/productSort.ts`: `newest`, `featured`, `price-asc`,
  `price-desc`, `rating`
- New arrivals: `NEW_ARRIVAL_WINDOW_DAYS = 45`
- URL params: `?q=`, `?category=`, `?sort=`, `?min=`, `?max=`

### Product detail (`ProductPage`)
- `ProductGallery` (main + thumbnails)
- Size/color selectors, qty stepper, add to cart (snapshot line)
- Compare-price sale display, attributes list, related products
- Mobile **sticky add-to-cart bar**
- 404 / load-failed states; `decodeURIComponent(slug)`

### Cart (`CartPage`)
- Line items from persisted snapshots (survives product removal)
- Qty steppers, remove, subtotal, shipping/tax preview
- **Coupon input is UI-only** (MVP placeholder, no validation)
- `Seo` with `noindex`

### Wishlist ("Saved pieces")
- Zustand store persisted as **`noir-wishlist`** (legacy key), versioned v1
  with `migrate`/`merge` normalization
- Auth users see `/account#wishlist`; guests get a local filter in the shop

### Search (`ProductSearchField`)
- Combobox with full ARIA (`listboxId`, `aria-activedescendant`, `aria-selected`)
- Keyboard nav: `ArrowDown`/`ArrowUp` cycling, `Escape` closes
- 250 ms debounce (`useProductSearch`), max 6 suggestions default
- Inline + icon variants; **mobile overlay portal** (z-45 backdrop, z-50 panel
  positioned under header offset)
- Syncs with `/shop?q=`; "View all results" → `/shop?q=term`
- Haystack: name, description, category, slug (spaces), brand, sku, tags

### Guest vs signed-in
- Guests: local cart/wishlist, guest checkout, `getGuestOrderStatus` polling
- Signed-in: saved addresses, order history (nested items via
  `listCustomerOrdersDetailed`), theme persistence

---

## 15. Waitlist Mode

- Toggle lives in `global_settings.waitlist_mode` (singleton row
  `00000000-0000-0000-0000-000000000001`)
- `WaitlistModeProvider` (React Query key `['public','waitlistMode']`, staleTime
  20 s, refetchOnWindowFocus) + **Supabase Realtime** subscription on
  `global_settings` UPDATE → invalidates the query → live toggling
- `MainLayout`: while waiting for first read → branded boot loader (no redirect
  flash); if `waitlistMode` and not on `/waitlist` → `<Navigate to="/waitlist">`
- Auth routes (`/login`, `/register`, `/forgot-password`) wrapped in
  `WaitlistPublicGate` → redirect to `/waitlist`
- **Admin routes stay available** in waitlist mode
- `Navbar`, `AnnouncementBar`, `Footer`, `HomePage` are all waitlist-aware
- `WaitlistPage` form → `joinWaitlist` (duplicate-safe via 23505 handling;
  `full_name` falls back to email local-part; optional `instagram`,
  `interested_product`)

---

## 16. Caching & Client Data Layer

### TanStack Query (`lib/queryClient.ts`)
- `staleTime: 60_000`, `gcTime: 5 min`, `refetchOnWindowFocus: false`, `retry: 1`
- **Persistence** (`query-sync-storage-persister`) to localStorage key
  **`krewnox-query-cache-v1`** — **only `['public', ...]`-keyed queries** are
  persisted (catalog, waitlist flag, site content). Account/order/admin/checkout
  queries are never persisted (privacy).
- 24 h max age for cached entries

### useCatalog data layer (`hooks/useCatalog.ts`)
- Keys: `products:all`, `categories:all`, `products:slug:<slug>`
- In-memory `dataCache` + `promiseCache` (dedupes concurrent fetches)
- localStorage **stale-while-revalidate**: prefix `krewnox:catalog:v1:`, 24 h max
  age; only products/categories written (never user data)
- **Module-load hydration** — returning visitors paint real catalog data on the
  very first render
- Pub/sub `notify()`/`subscribe()` — background revalidation pushes fresh data
  into already-mounted components
- `preloadCatalog()` called from `main.tsx` before first render; kicks off
  fetch in parallel with lazy chunk download
- `invalidateCatalog(prefix?)` for admin/test invalidation

### Zustand stores
- `uiStore` — ephemeral UI flags (cart drawer, mobile nav, shop filters)
- `cartStore` — persisted `noir-cart` **v2** (migrate drops v1 lines lacking
  snapshots); line key = `productId::size::colorName`; `reconcileCatalogPrices`
  refreshes snapshots from live catalog
- `wishlistStore` — persisted `noir-wishlist` v1

---

## 17. Search & Product Discovery

Covered in [Section 14](#14-storefront-feature-guide). Search is fully
client-side over the loaded catalog (no separate search index). Sort helpers in
`utils/productSort.ts`; pricing helpers in `utils/productPricing.ts`
(`getSellingPrice` = `salePrice ?? price`; `roundMoney`).

---

## 18. Theming

- Appearance modes: `light` / `dark` (`lib/theme.ts`)
- Bootstrap: inline script in `index.html` reads localStorage
  `krewnox-appearance` → sets `document.documentElement.dataset.theme` +
  `color-scheme` before paint (no FOUC); light is default
- `ThemeContext`: guest theme cached in localStorage
- **Signed-in users**: theme synced to `profiles.theme_preference` /
  `appearance_mode` / `theme_updated_at` (`profileService`), optimistic update,
  silent failure; `canPersistTheme = Boolean(user)`
- `ThemeToggle` gates persistence on `canPersistTheme`
- CSS variables power the design tokens (`--text-primary`, `--surface-base`,
  `--border-subtle`, `--motion-ease`, announcement height, header offset, etc.)

---

## 19. SEO, Sitemap & Social Previews

### `Seo` component (`components/seo/Seo.tsx`)
Per-route `<head>` management: title, meta description, canonical, OG tags,
JSON-LD (`lib/structuredData.ts`: `organizationJsonLd`, `websiteJsonLd`,
`breadcrumbJsonLd`, `productJsonLd` — price = `salePrice ?? price`,
`STORE_CURRENCY = 'USD'`, availability InStock/OutOfStock, **AggregateRating
intentionally omitted**).

### Sitemap (`scripts/generate-sitemap.mjs`)
- Runs **prebuild** (`prebuild` script)
- `STATIC_PAGES` (`/`, `/shop`, `/waitlist`, `/terms`, `/privacy`,
  `/refund-policy`) + **active products** from Supabase
- XML escaping; **fails safe** — keeps existing sitemap on error
- Uses `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` (falls back to
  `SUPABASE_*` envs)
- Current `public/sitemap.xml`: 29 URLs (6 static + 23 products)

### robots.txt
- `Disallow`: `/admin`, `/cart`, `/checkout`, `/account`, `/orders`,
  `/profile`, `/saved`, `/login`, `/register`, `/forgot-password`,
  `/reset-password`, `/auth/callback`
- `Sitemap: https://krewnox.ca/sitemap.xml`

### Social preview prerender (`server/src/routes/socialPreview.ts`, 389 lines)
- Bot-only (UA detection in `vercel.json` rewrite + middleware)
- Handles `/`, `/product/:slug`, `/shop`, `/waitlist`, `/terms`, `/privacy`,
  `/refund-policy`
- `PRIVATE_FIRST_SEGMENTS`: `cart`, `checkout`, `account`, `orders`, `profile`,
  `saved`, `login`, `register`, `forgot-password`, `reset-password`, `auth`,
  `admin`, `krewnox-admin` + `VITE_ADMIN_BASE_PATH`
- Fetches hero image from `site_settings.hero_slides` (4 s timeout)
- JSON-LD breadcrumbs + Product (offer price = `compare_price ?? price`)
- `escapeHtml` + JSON-LD `</` replacement (XSS-safe)
- `Cache-Control: public, max-age=300, s-maxage=600, stale-while-revalidate=86400`

### index.html baseline meta
- OG/SEO defaults, `theme-color: #0a0a0a`, preconnects (Google Fonts,
  Supabase, Stripe), fonts: **Cormorant Garamond** + **Inter** + **Space Grotesk**

---

## 20. Security

| Area | Control |
|---|---|
| Headers | Helmet + CSP in `vercel.json` (`script-src 'self'` + inline theme-bootstrap sha256 + `https://js.stripe.com`; `frame-src` js.stripe.com + hooks.stripe.com; `upgrade-insecure-requests`) |
| Auth | Supabase PKCE; `authStorage` fallback for private mode; admin email allowlist; admin lockout (8 fails / 5 min) |
| Privilege escalation | `protect_profile_privileged_columns` trigger reverts admin flags for non-admins |
| Database | RLS everywhere; SECURITY DEFINER functions restricted to owner; single-owner partial unique index |
| Payments | Server-side price authority (client prices ignored); idempotency keys; status-transition guards (`.neq`/`.in`); webhook signature verification; rate limits (12/min on PI creation) |
| Guest data | Query cache persistence restricted to public keys; catalog localStorage limited to products/categories |
| Redirects | `sanitizeNextPath` blocks auth-route open redirects |
| Bot prerender | XSS-safe escaping; private segments blocked; rate-limited (30/min) |
| Uploads | 10 MB cap, image-only MIME allowlist, sanitized object keys |
| Secrets | `required()`/`optional()` env parsing rejects placeholder values; `server/.env` git-ignored; service-role key server-only |

---

## 21. Deployment

### Vercel (`vercel.json`)
- `installCommand`: `npm install --prefix server && npm install`
- `buildCommand`: `npm run build`
- **Rewrites**:
  - `/api/(.*)` → `/api/server`
  - Bot user agents → `/api/server?social-preview-path=/$1`
  - Everything else → `/index.html`
- `api/server.ts`: `maxDuration: 30`
- **Headers**:
  - Built assets: `Cache-Control: public, max-age=31536000, immutable`
  - Images/fonts: 7 d + stale-while-revalidate
  - `index.html`: no-cache
  - Security headers incl. CSP (see Section 20)

### Supabase
- Apply migrations in order (`0001` → `0014`), then `seed.sql`
- Configure Auth (URL redirects: `https://krewnox.ca/auth/callback` +
  localhost for dev), Google provider
- Create `product-images` bucket with the RLS from migration 0006

### Environment setup (production)
- Frontend vars in Vercel project settings (see Section 5)
- Server vars in Vercel (function) settings: `STRIPE_SECRET_KEY`,
  `STRIPE_WEBHOOK_SECRET`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`,
  `SUPABASE_SERVICE_ROLE_KEY`, `CLIENT_ORIGIN=https://krewnox.ca`

---

## 22. Build & Scripts

Root `package.json` scripts:

| Script | Runs |
|---|---|
| `dev` | `vite` |
| `dev:server` | `npm run dev --prefix server` (tsx watch on 4242) |
| `dev:all` | `concurrently -k "npm:dev" "npm:dev:server"` |
| `prebuild` | `node scripts/generate-sitemap.mjs` |
| `build` | `npm run build --prefix server && tsc -b && vite build` |
| `build:server` | server-only build |
| `sitemap` | sitemap generator |
| `lint` | `eslint .` |
| `preview` | `vite preview` |

`vite.config.ts`:
- Dev proxy: `/api` → `http://localhost:4242`
- `manualChunks`: `vendor-react`, `vendor-motion`, `vendor-supabase`,
  `vendor-stripe`, `vendor-state`, `vendor-forms`, `vendor-icons`, `vendor`

TypeScript: `tsconfig.json` (references) → `tsconfig.app.json` (es2023,
`moduleResolution: bundler`, `jsx: react-jsx`, `noUnusedLocals`/`noUnusedParameters`,
`erasableSyntaxOnly`) + `tsconfig.node.json` (Vite config only).

---

## 23. Seed Data

`supabase/seed.sql` (idempotent — `ON CONFLICT ... DO UPDATE`):

- **5 categories**: Hoodies, T-Shirts, Jackets, Sneakers, Accessories
- **23 products** (all images `cdn.pixabay.com`), prices $48–$780, featuring:
  - Arc Mono Hoodie ($168, compare $148, bestseller/new)
  - Linear Zip Hoodie ($182, men, limited)
  - Velour Crew Hoodie ($156, women)
  - …plus sneakers, jackets, t-shirts, and accessories
  - Realistic sizes arrays, colors jsonb, sku `JA-*-*` format, status `active`
- **3 discount codes**:
  - `WELCOME10` — 10%, active, +180 d
  - `STUDIO15` — 15%, active, +90 d
  - `ARCHIVE20` — 20%, **inactive**, +30 d

---

## 24. Known Limitations, Notes & Inconsistencies

1. **`PROJECT_SETUP.md` is outdated** — still describes the original MVP ("no
   backend / no database / no auth / no payments"). This document supersedes it.
2. **`README.md` is the default Vite template** — not customized for the project.
3. **Currency mismatch**: checkout totals are **USD** while the nav shows a
   **"CAD" badge**; `formatPriceMertra` exists for "X.XX CAD" display. No FX
   conversion exists — the "CAD" badge is cosmetic.
4. **Coupon UI is a placeholder** — cart coupon input does no validation and no
   discounts are applied at checkout, even though `discount_codes` exists and is
   seeded/admin-managed.
5. **Duplicated pricing constants**: `SHIPPING_THRESHOLD=250`, `SHIPPING_FLAT=12`,
   `TAX_RATE=0.08` exist in both `src/utils/checkoutTotals.ts` (client) and
   `server/src/services/orderService.ts` (server). Server is authoritative; keep
   them in sync manually.
6. **Duplicate migration filenames**: `0010_stripe_payment_activity.sql` and
   `0010_user_theme_preference.sql` both use the `0010_` prefix (15 files, 14
   numeric prefixes).
7. **Query-key inconsistency**: `AdminProductsPage` uses
   `['admin','categories']` while `AdminCategoriesPage` uses
   `['admin','categories','rows']` for category queries — invalidations of one
   may not refresh the other.
8. **`AdminProductPreview` semantic mapping**: form `compare_price` is displayed
   as `salePrice` in the preview (strikethrough shows when compare_price set).
9. **Legacy naming**: localStorage keys `noir-cart`, `noir-wishlist`, and the
   query-cache key `krewnox-query-cache-v1` retain pre-rebrand names; cart store
   is versioned v2 with a v1→v2 migration.
10. **`api.client.ts` is a legacy placeholder** (axios + `healthCheckPlaceholder`)
    — unused by real flows.
11. **Server `SUPABASE_SERVICE_ROLE_KEY` is optional at boot** but required at
    runtime for webhooks and guest checkout; misconfiguration surfaces as
    runtime errors, not startup errors.
12. **Rating is static data** — `rating` is a column admins set; no customer
    review system exists (JSON-LD intentionally omits AggregateRating).
13. **Search is client-side only** — depends on the full catalog being loaded;
    no server-side search endpoint.
14. **Sitemap lastmod** is generated from data freshness; verify bot behavior on
    Vercel preview deployments (social preview hits the function, which needs
    `SUPABASE_*` envs).

---

*Documentation generated from a full review of the repository at commit time of
writing. For any discrepancy between this document and the code, the code wins.*
