# Current State — Aviator's Regiment

A factual snapshot of how the project works **today**. It describes what exists, not what is planned.

| | |
|---|---|
| Snapshot date | 2026-10-02 (second update, after the careers, security and booking-rules round) |
| Branch | `main` (the `v1-build` work was merged and pushed on 2026-10-02; see `git log -1` for the exact commit) |
| How it was verified | Source code read; `npm run lint`, `npm test`, `npm run typecheck` and `npm run build` pass; the live Supabase project was inspected with read-only queries; the n8n workflows were read via its API. Three end-to-end suites passed against a local production build: 15 checks for the admin flow, 4 for booking and 15 for the release check. |
| Legend | **VERIFIED** = confirmed from code, live service or command output. **INFERRED** = reasoned from evidence. **UNKNOWN** = could not be verified. |

---

## 1. Project purpose

Aviator's Regiment is a website for Indian student pilots and aviation professionals. Its first paid service is **renting a CX-3 for one complete DGCA exam session**: OLODE ₹2,000, Regular ₹2,500, no deposit, no refunds.

Around that it offers:
- service lead pages that open WhatsApp;
- a careers directory listing each role's companies and linking to their official careers pages;
- coaching and community pages;
- a Marketplace "coming soon" page;
- aviation news drafted by AI and published only after admin review.

The client's requirements spec exists only in an AI chat transcript dated 2026-10-02 and is **not stored in the repository**.

## 2. Technology stack (VERIFIED)

| Area | Technology |
|---|---|
| Framework | Next.js **15.5.27** (App Router), React **19.3.0**, TypeScript **5.9.3** (strict) |
| Styling | Plain global CSS (`app/globals.css`, `app/globals-header.css`, `app/admin/admin.css`) with CSS custom properties |
| Fonts | `next/font/google`: Manrope, DM Mono and 7 homepage display fonts. The hero headline uses the system font "Freestyle Script", which isn't loaded as a web font. |
| Backend | Route handlers (`app/api/*`) and server actions (`src/modules/*/admin-actions.ts`, `src/modules/users/auth-actions.ts`) |
| Database / Auth / Storage | Supabase (Postgres 17, ap-south-1, project `aviators-regiment`, ref `hybtjlozgwfyezqfvnjp`), `@supabase/supabase-js` 2.117.2, `@supabase/ssr` 0.12.7 |
| Automation | n8n Cloud (`aviatorsregiment.app.n8n.cloud`): 2 workflows, both **inactive** |
| AI | Claude (`claude-sonnet-5`), called only from n8n using gateway credits |
| Tests | **Vitest 5.0.3** (Vite 8.3.2), with 20 unit tests in `tests/unit/` |
| CI | GitHub Actions `.github/workflows/ci.yml`: lint → unit tests → build → typecheck, on pushes to `main` and on PRs |
| Lint | ESLint 9 flat config (`next/core-web-vitals`, `next/typescript`) |

## 3. Architecture

It is a modular monolith: one Next.js app with domain modules under `src/modules/`.

```
Browser ──► Next.js
             ├─ Public pages ── sessions, prices, published news, careers ──► Supabase (publishable key, RLS)
             ├─ /api/bookings, /api/bookings/[code]/payment-proof, /api/track
             │     ├─ rate limit (public.consume_rate_limit, hashed keys)
             │     └─ RPCs + Storage (secret key, server only)
             └─ /admin/* (middleware session refresh) ── server actions ──► Supabase as the signed-in admin (RLS)

Postgres trigger on audit_log ──pg_net + X-AR-Webhook-Secret──► n8n "Booking Alerts" ──► Gmail   [inactive]
n8n "Aviation News" (every 3 h) ──► RSS ──► Supabase RPCs ──► Claude drafts ──► Gmail          [inactive]
```

There are three ways the app reaches Supabase (VERIFIED):

| Client | Key | Used for |
|---|---|---|
| `createPublicClient` | publishable key, no session | public reads |
| `createServiceClient` | `SUPABASE_SECRET_KEY` | the customer API routes and the rate limiter |
| `createAuthClient` | signed-in admin's cookie session, RLS applies | the admin console |

## 4. Directory structure (tracked files, highlights)

```
.github/workflows/ci.yml      CI (lint, unit tests, build, typecheck)
app/
  (marketing)/                Public pages (+ error.tsx)
    careers/, careers/[slug]/ Careers directory from the database (ISR, revalidate 3600)
    marketplace/              "Coming soon" page
    aviation-news/ (+ ?category, ?q search), aviation-news/[slug]/
    rent-cx3/, rent-cx3/booking/, services/*, coaching, community, about, terms, refund-policy
  track/                      Customer tracking, including UPI payment and screenshot upload
  admin/(console)/            Overview, bookings, sessions, units, news, news/sources, careers, activity (+ error.tsx)
  admin/login/
  api/                        bookings, bookings/[code]/payment-proof, track
  global-error.tsx, robots.ts, sitemap.ts, not-found.tsx
middleware.ts                 Admin session refresh and login redirect
next.config.ts                Security headers (CSP etc.), 6 MB server-action body limit
vitest.config.mts             Unit test config (@/ alias, React automatic JSX)
src/
  components/                 Public UI, including upi-payment-details.tsx (shared by the booking flow and tracking)
  components/admin/           ActionForm, AdminNav, admin-ui, aadhaar-reveal
  db/migrations/0001–0007     Applied to the live project in this order
  db/database.types.ts        Generated Supabase types (manually refreshed)
  lib/                        supabase/{server,auth,errors}, rate-limit, site-config, seo, format, whatsapp, section-fonts
  modules/
    audit/ (labels, record), bookings/, careers/ (careers, queries, admin-actions), cx3/, exam-sessions/,
    news/ (categories, markdown, queries, search, admin-actions), users/auth-actions
tests/unit/                   validation.test.ts, content.test.ts
public/images/                logo.png, upi-qr.png (business UPI QR), hero images, image.png (unreferenced)
```

The empty `.gitkeep` folders remain: lib/{auth,logging,notifications,razorpay,storage,validation}, modules/{leads,payments,returns,shipments,content}, jobs, types, db/schema, tests/{integration,e2e}. A separate git worktree exists at `.kilo/worktrees/poised-ranunculus`; it's ignored.

## 5. Routes (VERIFIED from the last production build)

### Public

| Route | Rendering | Notes |
|---|---|---|
| `/` | static | Hero, homepage sections, Organization and WebSite JSON-LD |
| `/rent-cx3` | dynamic (`force-dynamic`) | Sessions and prices; errors show the `(marketing)/error.tsx` page |
| `/rent-cx3/booking?session=` | dynamic, noindex | Booking flow |
| `/careers` | ISR (1 h, plus revalidation on admin edits) | 10 roles as unnumbered links |
| `/careers/[slug]` | SSG for 10 slugs + ISR | Companies, each opening its official careers page in a new tab; optional Markdown guide; WhatsApp CTA |
| `/aviation-news` | dynamic | Category filter, **search** (`?q=`), featured lead |
| `/aviation-news/[slug]` | ISR | NewsArticle JSON-LD |
| `/marketplace` | static | Coming soon, with WhatsApp "notify me" and seller CTAs |
| `/track` | static shell, client fetch | Tracking; UPI payment and screenshot upload while awaiting payment |
| `/services/*`, `/coaching`, `/community`, `/about`, `/terms`, `/refund-policy` | static | |
| `/sitemap.xml` | 1 h | Static pages, careers and published news |
| `/robots.txt` | static | Disallows `/admin` and `/api/` |

### Admin (dynamic, noindex)

`/admin/login`, `/admin`, `/admin/bookings`, `/admin/bookings/[code]`, `/admin/sessions`, `/admin/units`, `/admin/news`, `/admin/news/[id]`, `/admin/news/sources`, `/admin/careers`, `/admin/careers/[id]`, `/admin/activity`.

### API (all `POST`, VERIFIED)

| Endpoint | Rate limit (fixed window) | Behaviour |
|---|---|---|
| `/api/bookings` | per IP: 8 per 10 min, 40 per day (counted after validation) | Validates; uploads the photo; RPC `create_booking`; returns 201, 409, 422, 429 or 503 |
| `/api/bookings/[code]/payment-proof` | per IP 10 per 10 min; per booking 6 per hour | Accepts `contact` (phone or email; legacy field `phone`). Checks the booking and contact with `track_booking` **before** uploading, then calls `submit_payment_proof`. |
| `/api/track` | per IP 30 per 10 min; per booking 15 per 10 min | `track_booking`; returns the same 404 for every mismatch |

When limited, the endpoints return 429 with `Retry-After: 600`. If the rate-limit RPC itself errors, the request is allowed and the error is logged.

## 6. Frontend flows (VERIFIED)

- **Booking.** Details → review → payment → pending.
  - The payment step uses `UpiPaymentDetails`, which shows the amount, the QR from `NEXT_PUBLIC_UPI_QR_IMAGE` and a copyable UPI ID.
  - The screenshot is sent as `contact`.
- **Tracking.** The customer enters the Booking ID plus phone or email and sees:
  - the status, summary and delivery and return timelines;
  - courier details: the label reads "AWB / tracking / order ID", and there's a "Track shipment" button.

  While the booking is `payment_pending`, a payment panel appears with UPI details, the rejection reason (`paymentNote`) if the payment was rejected, a screenshot upload and a WhatsApp share link. A successful upload refreshes the status to "Payment under review".
- **Careers.** The `/careers` grid of roles leads to a role page with company cards. Each card opens the company's careers page (`target="_blank"`, `rel="noopener noreferrer"`) and shows a disclaimer about official applications.
- **News.** A search box and category chips. Search terms are cleaned by `cleanNewsSearch`.
- **Marketplace.** Static coming-soon content.

## 7. Backend flow

- **Customer writes:** API routes using the service client, which call service-role-only RPCs.
- **Admin writes:** server actions using the auth client (RLS).
  - Multi-step changes use SQL functions: `admin_review_payment`, `admin_assign_unit`, `admin_save_shipment`, `admin_set_booking_status`.
  - Simple edits are table updates: notes, sessions (create/edit/**delete**), prices (single **upsert**), units, news (save, review, approve, publish, unpublish, reject, restore, **delete**), news sources, careers (roles and companies).
  - Admin-side audit entries go through `recordAudit()`, which logs failures instead of throwing.
- **Aadhaar:** the admin booking page renders only the masked number. "Show full number" calls the `revealAadhaar` server action, which returns the number and writes a `booking.aadhaar_viewed` audit entry.

## 8. Database (VERIFIED: 7 migrations applied, in this order)

| Version | Name | Repo file |
|---|---|---|
| 20261001234223 | booking_system | 0001 |
| 20261002001635 | news_and_booking_alerts | 0002 |
| 20261002002703 | admin_operations | 0003 |
| 20261002003218 | news_images | 0004 |
| 20261002045651 | careers | 0005 |
| 20261002045733 | security_hardening | 0006 |
| 20261002045832 | booking_rules | 0007 |

**Changes since the first snapshot:**
- **New tables:**
  - `career_roles`: slug, name, summary, optional Markdown guide, enquiry, sort_order, published.
  - `career_companies`: role_id, name, careers_url (https), note, sort_order, published; unique (role_id, name).
  - Both are publicly readable when published; admins have full access.
  - `private.rate_limits` (key, window_start, hits): RLS with no policies, access revoked.
- **New function:** `consume_rate_limit(p_key, p_limit, p_window_seconds)`. It's SECURITY DEFINER and executable only by `service_role`, and it occasionally deletes windows older than 2 days.
- **Booking rules (migration 0007)**, in the replaced functions `admin_set_booking_status` and `admin_save_shipment`:
  - A booking can be cancelled only before dispatch.
  - It can be closed only from `cx3_received`.
  - Delivery statuses need an assigned unit.
  - Unit status follows the booking: assigned → with_customer → available.
  - Setting the outbound shipment back to pending reverts the booking to `cx3_assigned`.
  - During the return, outbound edits must keep the "delivered" status.
  - A return can only be recorded after delivery, and can't be changed once received.
- **Payment proof:** `submit_payment_proof(p_booking_code, p_phone, p_screenshot_path)`. The `p_phone` parameter now accepts the booking's phone **or email**; the name was kept because a drop-and-recreate was declined.
- **Tracking:** `track_booking` adds `paymentNote`, the rejection reason when the latest payment is rejected.
- **Booking alerts:** `private.notify_booking_event` sends the header `X-AR-Webhook-Secret` when `private.app_settings` has `booking_events_webhook_secret`. That value is set in the database only and is **not in the repo**.
- **News privacy:** anon may select only the display columns of `news_articles` (column-level grant). `reviewed_by`, `ai_model`, `source_summary` and similar are not exposed.

**Live data (after the test cleanup):**
- 2 exam sessions (available), prices 2000 and 2500.
- 6 news sources.
- 10 career roles with 67 companies; each link was checked in a browser on 2026-10-02.
- 0 bookings, units, news articles and audit rows.
- 2 admins and 2 auth users.
- `private.rate_limits` holds a few rows from test runs, with hashed keys only.

**Advisors (2026-10-02):**
- Security WARN: pg_net in `public`; `public.rls_auto_enable()` executable by anon and authenticated (a platform function that isn't in our migrations); leaked-password protection disabled.
- Security INFO: `private.app_settings` and `private.rate_limits` have RLS with no policies. This is intentional.

## 9. Authentication and authorization (VERIFIED)

- **Customers** have no accounts. They identify themselves with a Booking ID plus phone or email, for both tracking and screenshot upload.
- **Admins** sign in with Supabase Auth email and password at `/admin/login`.
  - Sign-in is rate limited: 10 attempts per 10 minutes per IP and 8 per 10 minutes per email.
  - The middleware refreshes the session.
  - `public.admin_users` grants admin rights, and `requireAdmin()` guards every page and action.
  - RLS and `private.is_admin()` enforce the same rules in the database.
  - A signed-in non-admin can sign out from the login page.
- **Auth settings:** whether public sign-up is enabled, and the email provider, are **UNKNOWN**. The advisor reports leaked-password protection as disabled.

## 10. External services and integrations

| Service | State |
|---|---|
| Supabase | Live and healthy; the **only** project, also used by local development |
| n8n | Both workflows **inactive**, with no credentials in n8n. The booking-alerts webhook now runs only if `x-ar-webhook-secret` matches (`onlyRunIf`). |
| Gmail / Claude via n8n | Not connected or not running yet |
| WhatsApp | `wa.me` links to **+91 82769 16762** (918276916762); community button → `https://chat.whatsapp.com/GNoTiftyW20G54WwqP7p6S` |
| UPI | ID **8264742088@mbk**. The QR (`/images/upi-qr.png`) decodes to `upi://pay?pa=8264742088@mbk&pn=Tahasen Rahman`, so the payee name in UPI apps differs from the site label "Aviator's Regiment". |
| Vercel | **UNKNOWN**: the connector returned 403 and no teams are visible |
| GitHub | `origin` = `github.com/Amit-Singh-2006/Aviator_Regiment`; `main` is pushed; visibility UNKNOWN |
| Razorpay | Not implemented |

## 11. Environment and configuration

Local `.env.local` (values not read, except non-secret business values set on request):

| Variable | Status |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY` | SET |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | `918276916762` |
| `NEXT_PUBLIC_WHATSAPP_COMMUNITY_URL` | WhatsApp group link (see above) |
| `NEXT_PUBLIC_UPI_ID` | `8264742088@mbk` |
| `NEXT_PUBLIC_UPI_QR_IMAGE` | `/images/upi-qr.png` |
| `NEXT_PUBLIC_UPI_PAYEE_NAME` | SET (`"Aviator's Regiment"`) |
| `NEXT_PUBLIC_TELEGRAM_URL` | **EMPTY**, so the Telegram button is hidden |
| `NEXT_PUBLIC_SITE_URL` | **not set**; defaults to `https://aviatorsregiment.com`, which isn't owned yet |

These values must also be set in the hosting environment. `NEXT_PUBLIC_*` values are inlined at build time.

`next.config.ts` sends these headers on every route:

| Header | Value |
|---|---|
| CSP | `default-src 'self'`; `script-src 'self' 'unsafe-inline'` (+ `'unsafe-eval'` in development); `style-src 'self' 'unsafe-inline'`; `img-src 'self' data: blob: https:`; `font-src 'self'`; `connect-src 'self'` (+ ws in development); `frame-ancestors 'none'`; `base-uri 'self'`; `form-action 'self'`; `object-src 'none'` |
| X-Frame-Options | DENY |
| X-Content-Type-Options | nosniff |
| Referrer-Policy | strict-origin-when-cross-origin |
| Permissions-Policy | locks down camera, microphone, geolocation, payment and USB |
| HSTS | 1 year, includeSubDomains |

## 12. Build, test and run

- **Scripts:** `dev`, `build`, `start`, `lint`, `typecheck`, `test` (`vitest run`).
- **CI order:** lint → test → build → typecheck. Typecheck runs after the build because `next-env.d.ts` references `.next/types/routes.d.ts`.
- **Status (2026-10-02):** lint, 20/20 unit tests, typecheck and the production build all pass.
- **Lighthouse** (local production build, mobile):

  | Page | Performance | Accessibility | Best practices | SEO |
  |---|---|---|---|---|
  | `/rent-cx3`, `/careers/commercial-pilot`, `/aviation-news`, `/track` | 95–98 | 100 | 100 | 100 (`/track` 69, noindex by design) |
  | `/rent-cx3/booking` | 95 | 96 → fixed (links in the checkbox now underlined) | 100 | 69 (noindex by design) |
  | `/` | **not measurable** (NO_LCP: the hero headline starts invisible and animates in) | 100 | 100 | 100 |

- **End-to-end scripts:** `admin-flow.mjs`, `live-booking.mjs` and `release-check.mjs` live in the AI session's temporary folder, **not in the repo**. They create a temporary admin and test data on the live database and remove them afterwards.
- **`npm audit --omit=dev`:** one high-severity PostCSS advisory via `next` 15. PostCSS only processes this project's own CSS at build time; the fix requires Next 16.

## 13. Deployment setup

There's no deployment configuration in the repo. Vercel state, plan, domains and environment variables are **UNKNOWN**. No domain is owned yet.

## 14. Important workflows

1. **Booking lifecycle:**
   1. `payment_pending`: the customer uploads a screenshot in the booking flow or on `/track`.
   2. `payment_review`: the admin verifies, or rejects with a reason; a rejection sends the booking back to `payment_pending`, and the customer sees the reason on `/track` and can re-upload.
   3. `confirmed`, then `cx3_assigned`, then delivery: `dispatched`, `in_transit`, `out_for_delivery`, `delivered`.
   4. Return: `return_pickup_scheduled`, `return_in_transit`, `cx3_received`.
   5. `closed`.

   Cancelling is allowed only before dispatch. Couriers offered: Delhivery, DTDC, Rapido, Uber. A shipment needs a courier plus an AWB/order ID **or** a tracking link.
2. **Careers maintenance:** `/admin/careers` lets admins add, edit, hide and order roles; edit the slug, summary, WhatsApp enquiry and Markdown guide; add, edit, hide, order and remove companies; and delete a role (its companies go with it). Public pages refresh straight away.
3. **News:** n8n drafts arrive (once activated). Admins save, send for review, approve, publish, unpublish, reject or delete; public search covers titles and summaries.
4. **Sessions:** create, edit or set status; delete only sessions without bookings.
5. **Booking alerts:** trigger → pg_net POST with the secret header → n8n (inactive).
6. **Schema changes:** add a numbered migration, apply it, then regenerate `database.types.ts`. Non-destructive SQL is preferred; destructive statements were declined in this environment.

## 15. Feature status against the client spec

| Area | Status |
|---|---|
| Homepage, navigation, session rental, 4 availability states, booking details, Booking ID, ₹0 deposit, No-Refund acceptance | Implemented |
| UPI: ID, QR, screenshot upload (booking flow and tracking page), WhatsApp share, manual verification | Implemented and configured locally |
| **Razorpay** | **Not implemented** |
| CX-3 assignment, shipping, returns, tracking | Implemented with enforced transitions |
| Rent Your CX-3 | Implemented |
| Marketplace / Coming Soon | Implemented (page + footer link) |
| News: sources, AI drafts, duplicates, review statuses, edit, approve, publish/unpublish, reject, **delete**, images, SEO, categories, featured, related, **search** | Implemented (n8n inactive); **managing categories** isn't implemented (they're a DB enum) |
| Careers: roles → companies → official careers links; admin create/edit/categorise/publish | Implemented; per-role guide content is optional and empty |
| Services and Coaching content management | Not implemented (hard-coded copy) |
| Community (WhatsApp group configured; Telegram link missing), About + "Join the Regiment" | Implemented |
| Admin: create/edit/**delete** sessions, prices, availability, bookings, documents, payments, assignment, couriers, returns, close | Implemented; viewing Razorpay status is N/A |
| SEO: metadata, sitemap (incl. careers and news), robots, alt text, NewsArticle + Organization/WebSite JSON-LD | Implemented |

## 16. Dependencies

- **Runtime:** `next`, `react`, `react-dom`, `@supabase/supabase-js`, `@supabase/ssr`, `server-only`.
- **Dev:** `typescript`, `eslint`, `eslint-config-next`, `@eslint/eslintrc`, `@types/*`, **`vitest`** (and its peer `vite`).

## 17. Known limitations (details in `known-issues.md`)

- Razorpay is missing.
- n8n is inactive (credentials missing).
- The site URL defaults to an unowned domain, and deployment is unknown.
- Development uses the only (production) database.
- Aadhaar is stored in plaintext, though now revealed only on request and logged.
- There's no capacity control or unpaid-booking expiry.
- The homepage LCP can't be measured.
- The CSP allows inline scripts.
- The end-to-end tests aren't in the repo.
- The UPI payee name differs from the brand.
