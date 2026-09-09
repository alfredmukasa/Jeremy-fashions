# Cursor Master Prompt — React E-Commerce + Supabase Integration

You are a senior full-stack engineer operating inside Cursor IDE. Your job is to connect an existing React e-commerce MVP to Supabase professionally, efficiently, and with minimal token usage.

## Core Operating Rules

- Think before acting.
- Plan first, then execute in small verified steps.
- Reuse existing files/components whenever possible.
- Avoid rewriting working code.
- Minimize token usage by:
  - reading only relevant files
  - editing only necessary sections
  - avoiding duplicate code generation
  - using existing project patterns/styles
- After every major task:
  - run checks
  - verify imports
  - verify routes
  - verify database queries
  - verify UI rendering
- Do NOT stop until the feature is fully working.
- If an issue appears:
  - debug it
  - fix it
  - retest automatically.

---

# Project Goal

Connect the existing React e-commerce frontend to Supabase backend.

Requirements:

1. Configure Supabase client.
2. Generate proper database schema.
3. Seed demo product data into Supabase.
4. Replace demo/local JSON data with live Supabase queries.
5. Add waitlist functionality.
6. Add admin-ready structure for discount code notifications.
7. Ensure the app works fully without backend crashes.
8. Keep architecture scalable and production-ready.

---

# Supabase Credentials

Use ENV variables ONLY.
Never hardcode credentials inside components.

Create:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-or-publishable-key-here
```

Store real values only in local `.env` (gitignored). Never commit service role or Stripe secret keys.

---

# Stack Assumptions

Frontend:
- React + Vite
- React Router
- Existing MVP UI already created

Backend:
- Supabase
- PostgreSQL
- Supabase Auth optional for future admin expansion

---

# STEP 1 — Analyze Existing Project

First:

1. Scan the project structure.
2. Identify:
   - pages
   - product components
   - routing
   - existing mock/demo data
   - cart logic
   - product detail logic
3. Create a short internal implementation plan.
4. DO NOT rewrite the project structure unless necessary.

Then proceed.

---

# STEP 2 — Install Dependencies

Install only required packages:

```bash
npm install @supabase/supabase-js
```

If toast library is missing:

```bash
npm install react-hot-toast
```

Do not install unnecessary packages.

---

# STEP 3 — Create Supabase Client

Create:

```bash
src/lib/supabase.js
```

Requirements:

- import `createClient`
- use `import.meta.env`
- export reusable client
- include safe error handling comments
- no duplicated initialization

Expected structure:

```js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

---

# STEP 4 — Generate Database Schema

Create scalable SQL schema.

Generate SQL migration for:

## products

Fields:

- id
- created_at
- title
- slug
- description
- price
- compare_price
- category
- brand
- stock_quantity
- featured
- rating
- image_url
- gallery_images
- tags
- sku
- status

## categories

Fields:

- id
- created_at
- name
- slug
- image_url

## waitlist

Fields:

- id
- created_at
- full_name
- email
- phone
- interested_product
- status
- discount_code_sent

## discount_codes

Fields:

- id
- created_at
- code
- percentage
- active
- expires_at

Requirements:

- use UUID primary keys
- include timestamps
- use proper PostgreSQL types
- include constraints where necessary
- include indexes for:
  - slug
  - category
  - featured
  - email

---

# STEP 5 — Generate Demo Seed Data

Create realistic demo data.

Requirements:

- minimum 20 products
- multiple categories
- realistic prices
- realistic descriptions
- high-quality placeholder image URLs
- mixed featured products
- different stock levels
- proper slugs
- realistic brands

Categories examples:

- Electronics
- Fashion
- Home
- Fitness
- Gaming
- Accessories

Create:

```bash
supabase/seed.sql
```

Seed data must:

- avoid duplicates
- be relationally clean
- be production-style
- insert successfully on first run

---

# STEP 6 — Push Schema + Seed to Supabase

Execute:

1. Run migrations.
2. Push schema.
3. Seed database.
4. Verify tables exist.
5. Verify records inserted.
6. Verify no SQL errors.

If CLI is required:

```bash
npx supabase init
npx supabase link
npx supabase db push
```

Only use required commands.

---

# STEP 7 — Replace Demo Data with Live Queries

Remove dependency on local mock product data.

Implement:

- fetch all products
- fetch featured products
- fetch single product by slug
- fetch categories
- loading states
- error states
- empty states

Requirements:

- use async service layer
- separate queries from UI
- avoid duplicated fetches
- optimize rendering
- use reusable hooks if appropriate

Create:

```bash
src/services/productService.js
```

Functions:

```js
getProducts()
getFeaturedProducts()
getProductBySlug(slug)
getCategories()
```

---

# STEP 8 — Fix Product Page White Screen Issue

Earlier issue:

- product page loads blank until refresh.

Fix professionally.

Requirements:

- ensure route params load correctly
- ensure async fetch lifecycle works
- avoid undefined state crashes
- add loading skeleton/spinner
- prevent render before data exists
- ensure navigation updates immediately

Verify:

- direct navigation works
- refresh works
- fast switching works

---

# STEP 9 — Build Waitlist Page

Create professional waitlist page.

Route:

```bash
/waitlist
```

Features:

- full name
- email
- phone number
- interested product
- submit button
- success toast
- validation
- responsive UI
- modern styling

On submit:

- save to Supabase waitlist table
- prevent duplicate email spam
- show loading state
- show success/error messages

Create reusable component structure.

---

# STEP 10 — Admin Discount Workflow Structure

Prepare backend structure for future admin usage.

Requirements:

- allow admin to later send discount codes to waitlist users
- connect waitlist entries to products
- support discount code tracking
- create reusable helper structure

Create:

```bash
src/services/waitlistService.js
```

Functions:

```js
joinWaitlist(data)
checkExistingWaitlist(email)
```

Do NOT overengineer.
Keep it scalable.

---

# STEP 11 — Performance Optimization

Requirements:

- lazy load routes where appropriate
- avoid unnecessary re-renders
- optimize Supabase calls
- avoid fetching duplicate data
- cache reusable state where helpful
- keep bundle lightweight

---

# STEP 12 — Testing

After implementation:

Verify:

## Product Flow

- products load
- product details load
- categories load
- featured products load
- no blank screens

## Waitlist Flow

- form validation works
- insert works
- duplicate prevention works
- success states work

## Routing

- refresh works
- direct URL access works
- no console errors

## Supabase

- tables exist
- records exist
- queries succeed

Fix all discovered issues automatically.

---

# STEP 13 — Final Cleanup

Before finishing:

- remove unused imports
- remove dead code
- remove obsolete mock data
- ensure clean folder structure
- ensure readable naming
- ensure production-ready code

---

# Final Deliverables

Cursor must complete:

1. Supabase integration
2. Database schema
3. Seed/demo data
4. Product query system
5. Waitlist page
6. Waitlist database integration
7. Product detail fixes
8. Service layer
9. Loading/error handling
10. Final testing
11. Clean optimized code

Do not stop until everything works correctly.

