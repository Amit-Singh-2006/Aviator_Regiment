# Technical Decisions — Aviator's Regiment

A chronological record of the technical decisions in the project. D-01 to D-23 cover the state at `385b718`; D-24 onwards cover the second round on 2026-10-02, which was merged into `main`.

**How to read "Reason":**
- **VERIFIED** means the reason is written down: in a code comment, the README, a commit message, or the client's requirements text.
- **INFERRED** means the reason is reasoned from the implementation and nobody has stated it.

**About the requirements source:** the client's spec was pasted into an AI chat on 2026-10-02. It is **not stored in the repo**. When this file cites "spec", it means that transcript.

---

### D-01 · Modular monolith on Next.js App Router (2026-09-30)
- **Decision:** a single Next.js app.
  - Pages are in route groups: `app/(marketing)` for public pages, `app/track`, `app/admin` and `app/api`.
  - Domain folders live under `src/modules/*`; shared adapters under `src/lib/*`.
  - Placeholder folders for future domains (leads, payments, returns, shipments, jobs, types, tests).
- **Reason:** VERIFIED. The README says domain boundaries were set up first "so future marketplace capabilities can be added without restructuring the whole application". The spec's §26 asks for modular, scalable V1.
- **Current implementation:** active. Many module folders still contain only `.gitkeep`.
- **Affected:** whole repo structure.
- **Trade-offs:** the empty folders signal intent but add noise. The README's "Planned structure" differs slightly from reality: Supabase clients live in `src/lib/supabase`, not `src/db`.
- **Evidence:** `README.md`; commit `561197f` "Build Aviator's Regiment V1 frontend" (72 files).

### D-02 · Editorial animated hero using a system script font (2026-10-01)
- **Decision:** the homepage hero is an animated headline ("Find your Flight path.") set in `"Freestyle Script", "Brush Script MT", "Segoe Script", cursive`, with photo cut-outs and an animated flight path.
- **Reason:** INFERRED (design direction). It was iterated over 14 commits in one day.
- **Current implementation:** `src/components/landing-hero.tsx`, `app/globals.css` (`.editorial-*` rules, line ~55). The hero images are `public/images/Pasted image 2.jpeg` and `Pasted image 3.jpeg`, referenced from CSS.
- **Trade-offs:** "Freestyle Script" is not loaded with `@font-face` or `next/font`, so devices without it render a fallback. An open question in earlier sessions was choosing a web font. That decision is still pending with the user (per session notes).
- **Evidence:** commits `88a6265` → `03dad4d`; `app/globals.css`.

### D-03 · Toolchain: Next 15.5.27, ESLint 9 flat config, self-hosted fonts (2026-10-02)
- **Decision:**
  - Upgrade to Next 15.5.27 after a truncated SWC binary broke the build.
  - Replace `next lint` with `eslint .` using a flat config (FlatCompat with `next/core-web-vitals` and `next/typescript`) that ignores `.kilo/**`.
  - Load fonts via `next/font/google`.
- **Reason:** VERIFIED (commit message "Toolchain: reinstall truncated SWC binary, replace broken `next lint` with ESLint 9, update Next to 15.5.27, self-host fonts via next/font").
- **Affected:** `package.json`, `package-lock.json`, `eslint.config.mjs`, `app/layout.tsx`, `src/lib/section-fonts.ts`.
- **Trade-offs:** this Next version bundles a PostCSS version that `npm audit` flags. The fix is a major upgrade to Next 16.
- **Evidence:** commit `63a394a`.

### D-04 · Navy and gold brand tokens sampled from the logo (2026-10-02)
- **Decision:**
  - Colour tokens on `:root`: `--navy #0a1b3d`, `--gold #b9852d`, `--gold-light #d6a84f`, `--gold-ink #86601a`, plus neutrals.
  - Gold is used for fills and text on navy; `--gold-ink` is used for text on light backgrounds.
  - The logo appears in the header, footer, admin, icons and share previews.
- **Reason:** VERIFIED. The comment in `app/globals.css` says the colours were "Sampled from the logo", gold-ink "stays readable as text on light backgrounds". The user asked for a navy and gold theme from the logo, per the session transcript.
- **Affected:** `app/globals.css`, `app/admin/admin.css`, `app/layout.tsx` (`themeColor`), `src/lib/seo.ts` (`shareImage`).
- **Trade-offs:** none recorded.
- **Evidence:** commit `63a394a`; CSS comment.

### D-05 · Homepage: alternating sections, slide-in, one font per section (2026-10-02)
- **Decision:**
  - Seven homepage sections alternate left and right.
  - Each slides in from its side on first scroll (IntersectionObserver), staying visible without JS or with reduced motion.
  - Each heading uses a different Google display font, with `preload: false`.
  - No section numbers.
  - The Rent CX-3 section is navy.
- **Reason:** VERIFIED as a user request in the session transcript. Implementation reasons appear in code comments (`reveal.tsx`, `section-fonts.ts`).
- **Affected:** `src/components/home-overview.tsx`, `src/components/reveal.tsx`, `src/lib/section-fonts.ts`, `app/globals.css`.
- **Trade-offs:** 7 extra font families, downloaded lazily, add a performance cost (INFERRED).
- **Evidence:** commit `63a394a`.

### D-06 · Business details through public env vars and a central WhatsApp copy module (2026-10-02)
- **Decision:**
  - WhatsApp number, community links, UPI ID, payee and QR, and the site URL come from `NEXT_PUBLIC_*` variables via `src/lib/site-config.ts`.
  - All pre-filled WhatsApp messages live in `src/lib/whatsapp/index.ts`.
  - An empty WhatsApp number produces a number-less `wa.me` link.
  - The site URL defaults to `https://aviatorsregiment.com`.
- **Reason:** VERIFIED. Comments: "Pre-filled WhatsApp messages, kept in one place so the copy is easy to update"; "When unset, WhatsApp links open a share sheet instead of messaging a stranger's number."
- **Affected:** `src/lib/site-config.ts`, `src/lib/whatsapp/index.ts`, `.env.example`, `next.config.ts` (missing-env build warning).
- **Trade-offs:**
  - `NEXT_PUBLIC_*` values are baked in at build time, so changing them requires a rebuild (INFERRED from Next.js behaviour).
  - The default domain is not owned by the client (see known-issues).
- **Evidence:** files above; commit `63a394a`.

### D-07 · Supabase as the backend, with a strict three-path access model (2026-10-02)
- **Decision:**
  - The publishable key can **only** read open sessions and prices; published news was added later.
  - Customer data is written only by the Next.js server using the secret key, through SQL functions only `service_role` may execute.
  - Admins manage data through RLS policies keyed on `public.admin_users`.
- **Reason:** VERIFIED. The header comment of migration 0001 states this access model. The spec requires that Aadhaar and documents be "stored securely and only accessible to authorised admin users".
- **Affected:** `src/db/migrations/0001_booking_system.sql`, `src/lib/supabase/server.ts`, `app/api/*`.
- **Trade-offs:**
  - The secret key bypasses RLS, so the API routes must validate everything themselves.
  - There's a single project with no staging (see known-issues).
- **Evidence:** migration 0001; commit `1ce72f0`.

### D-08 · Booking IDs generated in the database (2026-10-01 → 2026-10-02)
- **Decision:** the format is `AR` + YYYYMM (India time) + 4 random digits. The demo first generated it in the browser; `create_booking` now generates it in Postgres with a unique constraint and up to 25 retries.
- **Reason:** VERIFIED. The spec gives the example `AR202609XXXX`, and `src/modules/bookings/booking-id.ts` says IDs "are generated by the database (public.create_booking)". The commit `1ce72f0` message describes the move to unique DB-generated IDs.
- **Affected:** `create_booking` (migration 0001), `src/modules/bookings/booking-id.ts`.
- **Trade-offs:** there are only 10,000 possible codes per month, and they're random and guessable. Tracking still requires a matching phone or email.
- **Evidence:** commits `4ac0aa9` (demo UPI handoff) and `1ce72f0`.

### D-09 · SQL hardening conventions (2026-10-02)
- **Decision:**
  - Every function uses `set search_path = ''` with fully qualified names.
  - Helpers live in the `private` schema, which is not exposed by the Data API.
  - Customer RPCs are revoked from `public`, `anon` and `authenticated` and granted only to `service_role`.
  - RLS policies call `(select private.is_admin())`.
- **Reason:** VERIFIED for the private schema (comment: "Helpers live in a schema the Data API does not expose"). The search_path and initplan patterns are INFERRED security and performance practice.
- **Affected:** all migrations.
- **Trade-offs:** functions are more verbose.
- **Evidence:** migrations 0001–0004.

### D-10 · Private document storage with content sniffing (2026-10-02)
- **Decision:**
  - Passport photos and payment screenshots go into the private bucket `booking-documents` (5 MB, jpeg/png/webp). Only the server writes to it; admins read it through signed URLs (600 s).
  - Upload types are detected from the file bytes, not the browser's MIME type.
- **Reason:** VERIFIED (comment in `src/modules/bookings/uploads.ts`: "Identifies JPEG, PNG and WebP files by their content rather than trusting the browser-supplied name or type").
- **Affected:** `src/modules/bookings/uploads.ts`, API routes, admin booking page.
- **Trade-offs:** none recorded.
- **Evidence:** commit `1ce72f0`.

### D-11 · Tracking by Booking ID plus phone or email, with no customer accounts (2026-10-02)
- **Decision:** `/track` calls `POST /api/track`, which calls `track_booking`. Every mismatch returns the same 404 message.
- **Reason:** VERIFIED. The spec §11 allows "Booking ID + phone/email verification" for V1. The route comment says it uses "The same message for every mismatch, so the endpoint never confirms which booking IDs exist."
- **Affected:** `app/api/track/route.ts`, `src/components/track-booking.tsx`, `track_booking`.
- **Trade-offs:** there's no rate limiting, and no customer self-service beyond viewing status.

### D-12 · Versioned acceptance of the terms (2026-10-02)
- **Decision:** each booking stores `terms_version` (from `TERMS_VERSION = "2026-10-02"`) and `terms_accepted_at`.
- **Reason:** VERIFIED. The spec §7 says "This acceptance should be stored against the booking". The comment in `src/modules/bookings/terms.ts` says to "Change both values whenever the legal pages change."
- **Affected:** `src/modules/bookings/terms.ts`, `app/(marketing)/terms`, `app/(marketing)/refund-policy`, `create_booking`.

### D-13 · Price per session type, snapshotted on each booking (2026-10-02)
- **Decision:**
  - `rental_prices` holds one row per session type (OLODE, REGULAR).
  - `exam_sessions.session_type` is a foreign key to it.
  - `bookings.amount_inr` copies the price at booking time.
- **Reason:** VERIFIED (spec prices). The admin UI message says "existing bookings keep the price they were booked at."
- **Trade-offs:** a session can't have its own price override (INFERRED limitation).

### D-14 · Live availability on the rent pages (2026-10-02)
- **Decision:** `/rent-cx3` is `force-dynamic`. The booking page reads sessions on each request, and the database re-checks availability on insert.
- **Reason:** VERIFIED (comment: "Availability is set by admins, so the page always reads the latest sessions"; `validation.ts`: "Whether the session is open for booking is checked by the database.").
- **Trade-offs:** there's a DB round-trip per page view, and an error makes the page fail (no error boundary).

### D-15 · News automation in n8n, with a mandatory human review (2026-10-02)
- **Decision:**
  - n8n collects RSS items every 3 hours and registers them through `ingest_news_item`.
  - Claude drafts the 6 newest non-duplicate items through `save_news_draft`.
  - Admins review and publish in `/admin/news`, and nothing is auto-published.
  - Duplicates are flagged when `pg_trgm` similarity is above 0.55 within 14 days.
  - Sources are configured in the database (`news_sources`), not hard-coded.
- **Reason:** VERIFIED. The spec §14 says "AI should prepare the article and put it into the admin panel for approval" and "Sources should be configurable from the admin panel". The user asked for the workflows to be built on n8n (session transcript).
- **Affected:** migration 0002, n8n workflow `SHumI1sc18nqhdSe`, `src/modules/news/*`, `app/admin/(console)/news/*`.
- **Trade-offs:**
  - The workflow runs outside the repo and isn't version-controlled.
  - It depends on n8n credentials and gateway credits.
  - It is currently inactive.

### D-16 · Booking alerts from a database trigger through pg_net to an n8n webhook (2026-10-02)
- **Decision:**
  - An AFTER INSERT trigger on `audit_log` (for `booking.created` and `payment.proof_submitted`) POSTs `{event, bookingCode, occurredAt}` to an n8n webhook.
  - The URL is stored in `private.app_settings`.
  - n8n fetches the booking with the service key and emails both admins.
- **Reason:** INFERRED. It keeps notifications out of the request path (pg_net is asynchronous) and puts the email configuration in n8n. The migration comment confirms only that "pg_net is asynchronous".
- **Affected:** migration 0002, n8n workflow `s4AjfRZJnuFXwzoY`.
- **Trade-offs:**
  - The webhook is protected only by an unguessable path, and that URL is committed in the migration file.
  - Alert emails contain customer PII.
  - Calls fail with 404 while the workflow is inactive.

### D-17 · Admin authentication: Supabase Auth with cookie sessions and user-scoped queries (2026-10-02)
- **Decision:**
  - Admins sign in with email and password.
  - `@supabase/ssr` stores the session in cookies, and middleware refreshes it.
  - `admin_users` grants admin rights.
  - All admin queries run **as the signed-in user** (RLS applies), not with the secret key.
- **Reason:** VERIFIED (comment in `src/lib/supabase/auth.ts`: "every query runs as the signed-in user, so row level security decides what each request can read or change"). The two admin accounts already had passwords (session record).
- **Affected:** `middleware.ts`, `src/lib/supabase/auth.ts`, `src/modules/users/auth-actions.ts`, `app/admin/login`, `app/admin/(console)/layout.tsx`.
- **Trade-offs:**
  - There's no password reset or MFA in the app.
  - Whether public sign-up is enabled is UNKNOWN; it is a Supabase setting.

### D-18 · Multi-step admin operations as transactional SQL functions (2026-10-02)
- **Decision:** `admin_review_payment`, `admin_assign_unit`, `admin_save_shipment` and `admin_set_booking_status`. Each is security invoker, checks `private.is_admin()`, locks the booking row, keeps booking, unit and assignment states in step, and writes `audit_log`.
- **Reason:** VERIFIED (migration 0003 header: "Multi-step admin actions run as single transactions. They execute with the signed-in admin's own permissions (RLS applies) and refuse non-admins.").
- **Trade-offs:** `admin_set_booking_status` allows any transition, so manual corrections can leave the inventory inconsistent (see known-issues).
- **Evidence:** migration 0003. Its behaviour was tested on 2026-10-02 in a rolled-back transaction (session record).

### D-19 · Admin UI: Server Components and Server Actions with a shared ActionForm (2026-10-02)
- **Decision:**
  - Pages are Server Components and mutations are Server Actions returning `{ok|error}`.
  - The client component `ActionForm` submits the form through a transition, so fields **aren't reset on error**.
  - It shows the result and asks for confirmation when the clicked button has `data-confirm`.
- **Reason:** VERIFIED (component comment: "Fields keep what the admin typed when an action fails. A button with data-confirm asks first.").
- **Trade-offs:** the form relies on `new FormData(form, submitter)`, which needs a modern browser.

### D-20 · Public news: a safe Markdown subset, ISR and SEO metadata (2026-10-02)
- **Decision:**
  - Article bodies are a small Markdown subset rendered as React elements; raw HTML is never executed.
  - Article pages use ISR (`revalidate = 3600`) plus `revalidatePath` on publish.
  - They carry NewsArticle JSON-LD, Open Graph `article` metadata and source attribution, and appear in the sitemap.
- **Reason:** VERIFIED. The `markdown.tsx` comment says "raw HTML in an article is shown as text, never run". The spec §14 and §23 call for SEO URLs, metadata and source attribution.
- **Affected:** `src/modules/news/markdown.tsx`, `src/modules/news/queries.ts`, `app/(marketing)/aviation-news/*`, `app/sitemap.ts`.

### D-21 · News images: a public bucket, managed separately from the article form (2026-10-02)
- **Decision:**
  - Admins upload to the public bucket `news-images` or paste an https link.
  - The image is changed only from the editor's image panel.
  - The main article form sends only the alt text and credit.
  - Replaced uploaded files are deleted.
- **Reason:** spec §14 asks to avoid unlicensed images, and the UI shows that warning (VERIFIED). Keeping the image out of the main form is INFERRED: it stops a stale form from overwriting a new image.
- **Affected:** migration 0004, `src/modules/news/admin-actions.ts`, `app/admin/(console)/news/[id]/page.tsx`, `next.config.ts` (6 MB body limit).

### D-22 · Accounts and ownership (2026-10-02)
- **Decision:**
  - Supabase, n8n and Vercel are the client's own accounts (aviatorsregiment@gmail.com).
  - The Git repository is under the developer's GitHub account (`Amit-Singh-2006/Aviator_Regiment`).
  - The admins are `amit.panwar2k6@gmail.com` and `aviatorsregiment@gmail.com`.
- **Reason:** VERIFIED from the session transcript (user instructions). The Supabase project and n8n instance were confirmed via API. The Vercel account is UNKNOWN (the API returned 403).
- **Trade-offs:** repo ownership versus hosting ownership must be settled before connecting Vercel to Git (noted in earlier session records).

### D-23 · Search-engine visibility (2026-10-02)
- **Decision:**
  - `robots.txt` disallows `/admin` and `/api/`.
  - Admin pages, `/track` and `/rent-cx3/booking` are noindex.
  - Every public page sets canonical and Open Graph tags through `pageMetadata()`.
- **Reason:** VERIFIED. The comment in `src/lib/seo.ts` explains why each page sets its own Open Graph tags, and the commit `63a394a` lists the SEO changes.

---

## Second round (2026-10-02)

The user asked for four things in the same message: do the recommended audit items, set the business details, redesign careers as roles → companies → official careers pages, and push to `main`.

### D-24 · Careers directory moved into the database, with an admin editor
- **Decision:**
  - `career_roles` and `career_companies` replace the hard-coded `src/modules/content/careers.ts`.
  - Visitors pick a role, then a company, and go to that company's official careers page for the role in a new tab.
  - Admins manage roles and companies at `/admin/careers`.
  - The public pages use ISR and are revalidated on every admin change.
- **Reason:** VERIFIED. The user asked for "roles → companies → each company's careers section" with unnumbered options styled like their reference screenshot. Spec §22 asks for careers create/edit/categorise/publish in the admin panel. Company links change over time, so the client needs to edit them without a developer (INFERRED).
- **Affected:** migration 0005, `src/modules/careers/*`, `app/(marketing)/careers/*`, `app/admin/(console)/careers/*`, `app/sitemap.ts`, `app/globals.css` (`.option-*`).
- **Trade-offs:** links can go stale (KI-48). Seed links were chosen from official sites and checked in Chrome; Private Pilot lists flying schools, because a PPL isn't a paid job.

### D-25 · Rate limits counted in Postgres
- **Decision:** `consume_rate_limit` uses fixed windows in `private.rate_limits`. Keys are HMAC-hashed (keyed with the server secret) so no raw IPs, phone numbers or emails are stored. If the check itself fails, the request is allowed.
- **Reason:** INFERRED. The app runs serverless, so in-memory counters wouldn't hold across instances, and no paid edge firewall is confirmed (Vercel access is UNKNOWN). Failing open was chosen so a database hiccup doesn't block bookings (code comment, VERIFIED).
- **Affected:** migration 0006, `src/lib/rate-limit.ts`, the three API routes, the `signIn` action.
- **Trade-offs:** it depends on proxy IP headers (KI-46), and each check is an extra database round-trip.

### D-26 · Booking state rules enforced in SQL
- **Decision:**
  - A booking can be cancelled only before dispatch, and closed only after `cx3_received`.
  - Delivery statuses require an assigned unit, and the unit's status follows the booking.
  - Delivery edits stop changing the booking once the return starts.
  - A return can be recorded only after delivery.
- **Reason:** VERIFIED. This was the audit recommendation for KI-12 and KI-24: cancelling after dispatch used to free a CX-3 that was still with the customer.
- **Affected:** migration 0007, `src/lib/supabase/errors.ts` (new messages), the booking admin page (Cancel shown only when allowed).

### D-27 · Payment screenshot from the tracking page, matched by phone or email
- **Decision:**
  - `/track` shows the UPI details and a screenshot upload while payment is pending, plus the rejection reason (`paymentNote`).
  - The API accepts phone or email and checks the booking before uploading.
  - `submit_payment_proof` keeps the parameter name `p_phone` but also matches the email.
- **Reason:** VERIFIED. This was recommended for KI-10. The parameter name stayed because a drop-and-recreate migration was **declined** when proposed; `CREATE OR REPLACE` can't rename parameters.
- **Affected:** migration 0007, `app/api/bookings/[code]/payment-proof/route.ts`, `src/components/track-booking.tsx`, `src/components/upi-payment-details.tsx` (shared with the booking form).

### D-28 · Shared secret on the booking-alerts webhook
- **Decision:**
  - `private.notify_booking_event` adds `X-AR-Webhook-Secret` from `private.app_settings`.
  - The n8n webhook's `onlyRunIf` checks it.
  - The secret is stored only in the database and in n8n, never in the repo.
- **Reason:** VERIFIED. This was recommended for KI-19, because the webhook URL is committed in migration 0002.

### D-29 · Security headers with a pragmatic CSP
- **Decision:** CSP with `'unsafe-inline'` scripts (no nonces), `frame-ancestors 'none'`, images from any HTTPS host, plus X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy and HSTS.
- **Reason:** INFERRED. Nonce-based CSP would make every page dynamic and lose static rendering. News images and signed document links need HTTPS image sources.
- **Trade-offs:** see KI-45. Verified to cause no CSP violations on 9 public pages and the admin flows.

### D-30 · Full Aadhaar only on request, with logging
- **Decision:** the admin page renders only the masked number. `revealAadhaar` returns the full number on request and logs `booking.aadhaar_viewed`.
- **Reason:** VERIFIED. This was the KI-05 recommendation (an access log); encryption and minimisation were left for a legal decision.

### D-31 · Unit tests with Vitest, and GitHub Actions CI
- **Decision:**
  - Vitest 5 runs tests on pure modules only. Modules marked `server-only` can't be imported in Node tests, so the search cleaning moved to `src/modules/news/search.ts`.
  - CI runs lint → test → build → typecheck.
- **Reason:** VERIFIED. This was the KI-20 recommendation. Typecheck runs after the build because `next-env.d.ts` references generated route types.

### D-32 · Couriers and order IDs
- **Decision:**
  - The courier list is Delhivery, DTDC, Rapido and Uber.
  - A shipment needs a courier plus an AWB/order ID **or** a tracking link; Rapido and Uber trips don't have AWBs.
- **Reason:** VERIFIED. The user named these couriers; the spec says no India Post.

### D-33 · Marketplace as a "coming soon" page
- **Decision:** `/marketplace` with planned categories, a WhatsApp "notify me" link and a seller CTA, linked from the footer. There is no marketplace admin.
- **Reason:** VERIFIED. Spec §13: "For V1 this can simply be a Marketplace / Coming Soon section". The user asked how to run the marketplace as an admin; the answer was that it doesn't exist yet.

### D-34 · Business details kept in environment variables, QR verified by decoding
- **Decision:**
  - The WhatsApp number, group link, UPI ID and QR path live in `.env.local`, and in the hosting settings later.
  - The QR is a cropped copy of the image the user supplied, at `public/images/upi-qr.png`.
  - It was decoded to confirm the payee address before use.
- **Reason:** VERIFIED. This follows the existing convention (D-06). Decoding showed the payee name "Tahasen Rahman" (KI-43).

### D-35 · Error pages
- **Decision:** `(marketing)/error.tsx` (inside the site header and footer, with a WhatsApp CTA), `admin/(console)/error.tsx` and `global-error.tsx`.
- **Reason:** VERIFIED. This was the KI-16 recommendation.

### D-36 · Razorpay Standard Checkout with the fee passed to the customer
- **Decision:**
  - Online payment sits next to UPI on the booking payment step and the tracking page; UPI stays fee-free.
  - The online amount is `ceil(rental / (1 − 0.0236))` (Razorpay 2% + 18% GST), e.g. ₹2,049 and ₹2,561, so the full rental is received. The rate is one constant in `src/lib/razorpay/fee.ts`.
  - Each Razorpay order is its own `payments` row (method `razorpay`, `gateway_fee_inr`, `razorpay_order_id`); an unpaid order for the same amount is reused.
  - A booking is marked paid only by the server after an HMAC check: the checkout signature (`order_id|payment_id`, key secret) or the webhook signature (raw body, webhook secret). `confirm_razorpay_payment` is idempotent, so both paths can run.
  - The REST Orders API is called with `fetch`, not the `razorpay` npm SDK, to avoid a dependency for one call.
  - Admin UPI reviews only touch UPI rows, and rejecting a UPI screenshot keeps a booking that was paid online. The payment shown (tracking and admin) is a verified one first, otherwise the most recently updated.
- **Reason:** VERIFIED. Spec §6B asks for the fee shown up front and a webhook-driven status; the user supplied test keys on 2026-10-02 after the recommended fee table was proposed.
- **Affected:** migration 0008, `src/lib/razorpay/`, `app/api/bookings/[code]/razorpay/{order,verify}`, `app/api/razorpay/webhook`, `src/components/razorpay-checkout.tsx`, the booking form, tracking, the admin booking pages, the CSP (scripts from `checkout.razorpay.com` and `cdn.razorpay.com`, frames, `connect-src https://*.razorpay.com`), Permissions-Policy `payment`, and the n8n booking-alert workflow (event `payment.razorpay_paid`).
- **Trade-offs:** `/track` is a static page, so its online option appears only if the Razorpay keys were set when the site was built. Razorpay ignores obvious dummy phone numbers in the prefill and asks for one.

---

## Open or pending decisions (not yet made)

| Topic | State | Source |
|---|---|---|
| Hero web font to replace "Freestyle Script" | awaiting the user's choice | session notes |
| Homepage hero animation that keeps LCP measurable | proposed, not approved (KI-44) | Lighthouse, 2026-10-02 |
| UPI payee name shown on the site (brand or registered name) or a business UPI ID | needs the user or client (KI-43) | QR decode, 2026-10-02 |
| Razorpay go-live (KYC, live keys, live webhook) | built and tested in test mode (D-36) | spec §6B |
| Hosting (Vercel plan, project) and domain | domain not owned yet; Vercel state UNKNOWN | user message, 2026-10-02 |
| Repo ownership (developer versus client GitHub) | undecided | session notes |
| Aadhaar storage (plaintext under RLS, encryption or minimisation) | access logging added; storage needs a legal decision | KI-05 |
| Staging database | not created (KI-06) | audit |
