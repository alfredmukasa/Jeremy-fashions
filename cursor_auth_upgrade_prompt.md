# Cursor Authentication Upgrade Prompt — Luxury Fashion E-Commerce

## Reference Inspiration

Use this authentication flow as visual inspiration only:

https://www.saksfifthavenue.com/account/login?action=register

Do NOT clone directly.

Maintain the existing dark luxury fashion aesthetic:
- minimalist
- premium
- editorial
- monochrome
- Balenciaga-inspired
- smooth transitions
- elegant typography

---

# PRIMARY OBJECTIVE

Build a complete authentication system using Supabase Auth.

Requirements:
- signup
- login
- logout
- session persistence
- protected routes
- auth-aware navigation
- responsive design
- scalable architecture
- production-ready behavior

---

# IMPLEMENTATION PRIORITY

Implement in this exact order:

1. Supabase auth configuration
2. Auth context/provider
3. Signup page
4. Login page
5. Session persistence
6. Protected routes
7. User profile handling
8. Auth-aware navbar
9. Loading states
10. Error handling
11. Route protection
12. Sensitive page security

Do NOT redesign the full public website yet.

Focus first on:
- account pages
- checkout
- wishlist
- profile
- orders
- admin-sensitive flows

---

# DESIGN SYSTEM

Theme:
- charcoal
- black
- muted grey
- off-white
- thin borders
- subtle shadows

Typography:
- Inter
- Space Grotesk
- Satoshi

UI style:
- premium spacing
- editorial layout
- smooth hover transitions
- elegant form styling
- minimal buttons
- clean inputs

---

# REQUIRED PAGES

Create:

```bash
/src/pages/auth/Login.jsx
/src/pages/auth/Register.jsx
/src/pages/auth/ForgotPassword.jsx
```

---

# REQUIRED COMPONENTS

Create reusable components:

```bash
/src/components/auth/AuthLayout.jsx
/src/components/auth/AuthInput.jsx
/src/components/auth/AuthButton.jsx
/src/components/auth/AuthGuard.jsx
/src/components/auth/AuthLoader.jsx
```

Requirements:
- reusable
- accessible
- responsive
- scalable
- clean architecture

---

# SUPABASE AUTH SETUP

Use Supabase Auth only.

Implement:
- email/password signup
- email/password login
- secure logout
- session persistence
- auth state listener

Create:

```bash
/src/context/AuthContext.jsx
```

Use:
- onAuthStateChange
- getSession
- signInWithPassword
- signUp
- signOut

Requirements:
- central auth state management
- no prop drilling
- avoid duplicate listeners
- global loading handling
- automatic session restoration

---

# ROUTE PROTECTION

Protect these routes:
- /account
- /wishlist
- /checkout
- /orders
- /profile
- /admin

Create:

```bash
/src/routes/ProtectedRoute.jsx
```

Requirements:
- redirect unauthenticated users
- preserve intended destination
- avoid redirect loops

---

# LOGIN PAGE

Layout:
- left side editorial image/banner
- right side login form

Fields:
- email
- password

Features:
- remember me
- forgot password
- loading state
- error handling
- redirect after login

---

# REGISTER PAGE

Fields:
- first name
- last name
- email
- password
- confirm password

Validation:
- password match
- email validation
- duplicate account handling
- secure password rules

UX:
- inline validation
- elegant transitions
- responsive layout

---

# SESSION PERSISTENCE

Critical requirement:
Users must remain logged in after:
- refresh
- route change
- tab reopen

Avoid:
- auth flickering
- blank screens
- double rendering
- flashing logged-out state

---

# SECURITY REQUIREMENTS

Implement:
- protected routes
- secure auth validation
- sanitized forms
- scalable auth structure

Never expose:
- sensitive data
- private routes
- admin logic
- keys

---

# LOADING + ERROR HANDLING

Never allow white screens.

Add:
- auth loaders
- fallback UI
- inline validation
- loading skeletons
- graceful error states

---

# PERFORMANCE REQUIREMENTS

Optimize:
- route lazy loading
- auth state updates
- rerenders
- Supabase requests

Avoid:
- duplicate API calls
- unnecessary context updates

---

# MOBILE RESPONSIVENESS

Must work perfectly on:
- mobile
- tablet
- desktop

Requirements:
- responsive spacing
- touch-friendly UI
- clean mobile forms

---

# TESTING REQUIREMENTS

Verify:

## Signup
- account creation works
- validation works
- duplicate prevention works

## Login
- login works
- invalid credentials handled

## Sessions
- session persists correctly
- refresh works
- route transitions work

## Protected Routes
- unauthorized users blocked
- redirects work properly

## UI
- no white screens
- no crashes
- smooth transitions

Fix all discovered issues automatically.

---

# FINAL GOAL

The authentication system should feel like:
- luxury fashion platform
- premium editorial storefront
- enterprise-grade experience

NOT:
- generic dashboard
- plain SaaS login page
- default template UI

Maintain the existing luxury fashion branding across all auth-related pages.

---

## Implementation map — this repository (`fashion-store`)

The following aligns this prompt with the **TypeScript + Vite** codebase without changing the spec above. Paths use `.tsx` and existing folder casing (`Auth`, not `auth`).

| Prompt reference | Implemented as |
|------------------|----------------|
| `AuthContext.jsx` | `src/context/AuthContext.tsx` — `getSession`, `onAuthStateChange`, `signIn`, `signUp`, `signOut`, `resetPasswordForEmail` |
| `Login.jsx` | `src/pages/Auth/LoginPage.tsx` — editorial `AuthLayout`, redirect preserves `location.state.from` |
| `Register.jsx` | `src/pages/Auth/RegisterPage.tsx` — confirm password, min length + letter/number rules |
| `ForgotPassword.jsx` | `src/pages/Auth/ForgotPasswordPage.tsx` |
| `AuthLayout.jsx` | `src/components/auth/AuthLayout.tsx` |
| `AuthInput.jsx` / `AuthButton.jsx` | `src/components/auth/AuthInput.tsx`, `AuthButton.tsx` |
| `AuthLoader.jsx` | `src/components/auth/AuthLoader.tsx` |
| `AuthGuard.jsx` | `src/components/auth/AuthGuard.tsx` (children wrapper) |
| `ProtectedRoute.jsx` | `src/routes/ProtectedRoute.tsx` — nested `<Route element={<ProtectedRoute />}>` + `<Outlet />` |
| Session persistence | `src/lib/supabase.ts` — `persistSession`, `autoRefreshToken`, `detectSessionInUrl` |
| Provider placement | `src/App.tsx` — `<BrowserRouter><AuthProvider>…` |
| Protected URLs | `/account`, `/checkout`, `/orders`, `/profile`, `/saved` (signed-in wishlist; guests still use ` /shop?wishlist=1 ` locally) |
| Staff admin | Unchanged: `VITE_ADMIN_PORTAL_ENABLED` + `RequireAdmin` / `ROUTES.admin` (separate from customer `AuthContext`) |
| Typography | `Space Grotesk` added in `src/index.css` for auth UI; serif/Inter unchanged globally |

Customer auth screens use **full-viewport `AuthLayout`** (no main `Navbar`). Storefront pages keep `MainLayout` + auth-aware `Navbar` / `MobileMenu`.
