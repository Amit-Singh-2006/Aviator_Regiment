# Known Issues and Risks — Aviator's Regiment

These issues were first audited on 2026-10-02 and re-checked the same day, after the careers, security and booking-rules round.

**Severity:**
- **Critical:** data loss or exposure, or the core flow is broken.
- **High:** a launch blocker, or a significant security or compliance risk.
- **Medium:** incorrect behaviour or a meaningful gap.
- **Low:** minor issue or debt.

**Status:**
- **Open:** not addressed.
- **Partly resolved:** some of it was addressed; what remains is described.
- **Resolved:** fixed and verified; kept here for history.

**Evidence labels:**
- **VERIFIED:** seen in code, live service or command output.
- **INFERRED:** reasoned from evidence.
- **UNKNOWN:** could not be checked.

"Spec" means the client requirements pasted into an AI chat on 2026-10-02. It is not in the repo.

## Summary

| ID | Issue | Severity | Status |
|---|---|---|---|
| KI-01 | Razorpay payment option not implemented | High | Resolved in code, test mode (KYC, live keys and live webhook pending) |
| KI-02 | Client business configuration | High | Partly resolved |
| KI-03 | n8n workflows inactive; credentials missing | High | Resolved (both published 2026-10-02; booking alert tested live) |
| KI-04 | No rate limiting on public endpoints | High | Resolved |
| KI-05 | Aadhaar stored in plaintext | High | Partly resolved |
| KI-06 | Development uses the live (only) Supabase project | High | Open |
| KI-07 | Site URL defaults to an unowned domain | Medium | Resolved for production (`NEXT_PUBLIC_SITE_URL` = the vercel.app address); revisit when a domain is bought |
| KI-08 | Deployment not configured or verifiable | Medium | Resolved: live on Vercel (Hobby plan; Pro needed before commercial use) |
| KI-09 | No booking capacity control | Medium | Open |
| KI-10 | No payment screenshot re-upload after the booking flow | Medium | Resolved |
| KI-11 | Unpaid bookings never expire | Medium | Open |
| KI-12 | Manual status changes could desync CX-3 inventory | Medium | Resolved |
| KI-13 | Spec admin features missing | Medium | Partly resolved |
| KI-14 | News search and Marketplace page missing | Medium | Resolved |
| KI-15 | Careers and coaching content generic | Medium | Partly resolved |
| KI-16 | No error pages | Medium | Resolved |
| KI-17 | No security headers | Medium | Resolved (see KI-45) |
| KI-18 | Public sign-up setting unknown; leaked-password protection off | Medium | Partly resolved (sign-ups off, verified via `/auth/v1/settings`; leaked-password protection needs the Pro plan) |
| KI-19 | Booking webhook unauthenticated | Medium | Resolved |
| KI-20 | No automated tests or CI | Medium | Partly resolved |
| KI-21 | `npm audit` PostCSS advisory via Next 15 | Medium | Open (assessed) |
| KI-22 | Supabase plan and backups not verified | Medium | Open |
| KI-23 | Courier list included India Post | Low | Resolved |
| KI-24 | Shipment edge cases | Low | Resolved |
| KI-25 | Non-atomic price update; ignored audit errors | Low | Resolved |
| KI-26 | Public key could read every news column | Low | Resolved |
| KI-27 | Supabase advisor warnings | Low | Open |
| KI-28 | Alert emails contain customer PII | Low | Open |
| KI-29 | Uploads stored before validation | Low | Partly resolved |
| KI-30 | Small, guessable booking code space | Low | Mitigated |
| KI-31 | Hero font not a web font | Low | Open |
| KI-32 | News pipeline edge cases | Low | Open |
| KI-33 | No customer notifications | Low | Open |
| KI-34 | `ActionForm` relied on `FormData(form, submitter)` | Low | Resolved |
| KI-35 | Admin auth UX gaps | Low | Partly resolved |
| KI-36 | Footer year fixed at build time | Low | Open |
| KI-37 | Small tech debt | Low | Partly resolved |
| KI-38 | Generated types maintained by hand | Low | Open |
| KI-39 | Repository state (stray worktree and refs) | Low | Partly resolved |
| KI-40 | Documentation gaps | Low | Partly resolved |
| KI-41 | Performance not measured | Low | Resolved (measured; see KI-44) |
| KI-42 | Structured data only on news | Low | Resolved |
| KI-43 | UPI payee name differs from the brand | Medium | Open (needs decision) |
| KI-44 | Homepage LCP not measurable (hero starts invisible) | Medium | Open (design decision) |
| KI-45 | CSP allows inline scripts | Low | Open |
| KI-46 | Rate limiting depends on proxy IP headers; shared mobile IPs | Medium | Open |
| KI-47 | `submit_payment_proof` parameter named `p_phone` accepts email | Low | Open |
| KI-48 | Careers links can go stale; no link checker | Low | Open |
| KI-49 | End-to-end tests live outside the repo | Medium | Open |
| KI-50 | The GitHub repository is public | Medium | Open (needs decision) |

---

## Open and partly resolved issues

### KI-01 · Razorpay not implemented
- **Severity:** High. Spec §6B; V1 priority #4.
- **Evidence:** VERIFIED.
  - `src/lib/razorpay/` is empty.
  - `create_booking` always records a UPI payment.
  - The `payment_method` enum and `payments.razorpay_*` columns are unused.
- **Current behaviour:** UPI is the only payment option.
- **Expected behaviour:** spec: Razorpay checkout showing the final amount including the gateway fee, with the status updated by webhook.
- **Possible impact:** a missing payment option and more manual verification.
- **Resolution (2026-10-02, VERIFIED in test mode):** Razorpay Standard Checkout on the booking payment step and the tracking page; order, verify and webhook endpoints; migration 0008 (D-36). A real test-mode netbanking payment confirmed a test booking, signed webhook replays were idempotent, and the n8n "paid online" alert ran. The test booking was deleted afterwards.
- **Still open:** Razorpay account activation (KYC, which needs the live site with Privacy, Contact and Shipping pages), live keys in the hosting settings, and the webhook in the Razorpay dashboard (needs the public URL). Webhooks can't reach a laptop, so the webhook was only tested with locally signed requests.

### KI-02 · Client business configuration (partly resolved)
- **Severity:** High.
- **Done (VERIFIED):**
  - WhatsApp number, community group link, UPI ID and QR are set in `.env.local`.
  - The QR is in `public/images/upi-qr.png`; it decodes to `pa=8264742088@mbk`.
- **Still open:**
  - Only the 2 seed sessions exist. The 3 CX-3 units (DEMO-01 to DEMO-03, added 2026-10-02 at the user's request) are dummies; customers see the unit ID on tracking.
- **Done since:** the Telegram link is set, and the values are set in Vercel production (2026-10-02).
- **Recommended next step:** add the real sessions and units in the admin panel, then retire the DEMO units.

### KI-03 · n8n workflows inactive, credentials missing
- **Severity:** High.
- **Evidence:** VERIFIED.
  - Both workflows show `active: false`.
  - `list_credentials` returns 0.
  - The `pg_net` responses from test bookings are 404.
- **Current behaviour:** no admin emails and no news collection.
- **Recommended next step:**
  1. Create `Supabase - Aviator's Regiment` (with a dedicated secret key) and `Gmail - Aviator's Regiment` in n8n.
  2. Attach them to the nodes.
  3. Run one supervised execution of each workflow.
  4. Publish both.

  The booking webhook already checks the secret header (KI-19).

### KI-05 · Aadhaar stored in plaintext (partly resolved)
- **Severity:** High (compliance).
- **Done (VERIFIED):** the admin page shows only the masked number. The full number is fetched by `revealAadhaar` on request, and each view is logged as `booking.aadhaar_viewed`. It is no longer present in the page HTML.
- **Still open:** `bookings.aadhaar_number` is still plaintext, protected by RLS and the secret key. The legal requirements haven't been reviewed (UNKNOWN).
- **Recommended next step:** get legal guidance, then decide between keeping only the last 4 digits, application-level encryption with a managed key, or a retention limit.

### KI-06 · Development uses the only (production) database
- **Severity:** High.
- **Evidence:** VERIFIED: `list_projects` returns one project, and `.env.local` points at it. All test runs create and remove data there.
- **Recommended next step:** add a staging project or Supabase branching before real customers arrive.

### KI-07 · Site URL defaults to an unowned domain
- **Severity:** Medium.
- **Evidence:** VERIFIED: `siteConfig.url` defaults to `https://aviatorsregiment.com`, and `NEXT_PUBLIC_SITE_URL` isn't set. The user says no domain is owned yet.
- **Impact:** canonicals, the sitemap, Open Graph and JSON-LD point to that domain.
- **Recommended next step:** set `NEXT_PUBLIC_SITE_URL` per environment.
- **Update (2026-10-02):** production sets it to `https://aviators-regiment.vercel.app`; the sitemap was checked. Change it (and redeploy) when a domain is connected.

### KI-08 · Deployment not configured or verifiable
- **Severity:** Medium.
- **Evidence:** VERIFIED: no Vercel config in the repo, and the Vercel connector returns 403 with no teams visible.
- **Recommended next step:** re-authenticate the Vercel connector to the client account, create the project, set the environment variables (the secret key must be server-only), and confirm the plan for commercial use.
- **Update (2026-10-02, VERIFIED):** project `aviators-regiment` in team `aviatorsregiment` (Hobby), deployed with the Vercel CLI from the local folder (no Git connection). Production URL `https://aviators-regiment.vercel.app`; functions run in `bom1` (Mumbai). Still open: Hobby forbids commercial use (upgrade to Pro before launch), and pushes to GitHub don't deploy automatically.

### KI-09 · No booking capacity control
- **Severity:** Medium.
- **Evidence:** VERIFIED: no capacity column; sessions stay bookable until an admin marks them Sold out. Manual control is what the spec asks for.
- **Recommended next step:** confirm with the client whether manual Sold out is enough.

### KI-11 · Unpaid bookings never expire
- **Severity:** Medium.
- **Evidence:** VERIFIED: `src/jobs/` is empty and there are no scheduled jobs.
- **Recommended next step:** agree a policy, then add a scheduled job (pg_cron or n8n).

### KI-13 · Spec admin features missing (partly resolved)
- **Severity:** Medium.
- **Done (VERIFIED):** delete exam sessions (only those without bookings), delete news articles, a "Send for review" status, and a full careers admin.
- **Still open:**
  - News categories are a database enum, so they can't be managed from the admin panel.
  - Services and coaching page content is hard-coded.
- **Recommended next step:** confirm with the client whether categories or service copy need to be editable.

### KI-15 · Careers and coaching content (partly resolved)
- **Severity:** Medium.
- **Done:** careers are now a role → companies directory with 67 verified links, plus an optional Markdown "career guide" per role, editable in the admin panel.
- **Still open:** the guides are empty, and the coaching page has no courses, subjects or faculty (spec §15, §19).
- **Recommended next step:** get content from the client.

### KI-18 · Auth settings
- **Severity:** Medium.
- **Evidence:** whether public sign-up is enabled is **UNKNOWN**. Leaked-password protection is disabled (advisor, VERIFIED).
- **Recommended next step:** in the Supabase dashboard (Authentication → Sign In / Providers), turn off "Allow new users to sign up" and enable leaked-password protection if the plan allows. Consider MFA for admins.

### KI-20 · Automated tests and CI (partly resolved)
- **Severity:** Medium.
- **Done (VERIFIED):** Vitest with 20 unit tests (validation, booking IDs, the Markdown renderer including XSS cases, news and careers helpers), and a GitHub Actions CI workflow.
- **Also done:** the first GitHub Actions run passed on `374e78d` (2026-10-02).
- **Still open:** there are no integration or end-to-end tests in the repo (see KI-49).

### KI-21 · `npm audit` PostCSS advisory
- **Severity:** Medium (assessed as low exploitability).
- **Evidence:** VERIFIED: `postcss` ≤ 8.5.22, bundled with `next` 15.5.27. PostCSS only processes this project's own CSS at build time, and no untrusted CSS is processed (INFERRED from the code).
- **Recommended next step:** a planned, tested upgrade to Next 16 (needs approval).

### KI-22 · Supabase plan and backups
- **Severity:** Medium.
- **Evidence:** UNKNOWN; earlier notes say "free plan".
- **Recommended next step:** confirm the plan and backups before taking real payments.

### KI-27 · Supabase advisor warnings
- **Severity:** Low.
- **Evidence:** VERIFIED:
  - WARN: `pg_net` is in the `public` schema.
  - WARN: `public.rls_auto_enable()` is SECURITY DEFINER and executable by anon and authenticated. It isn't in our migrations; it's probably a platform function.
  - INFO: `private.app_settings` and `private.rate_limits` have RLS with no policies. This is intentional; access is revoked.
- **Recommended next step:** confirm what `rls_auto_enable` is before changing it.

### KI-28 · Alert emails contain customer PII
- **Severity:** Low.
- **Evidence:** VERIFIED: the n8n alert email includes phone, email and address.
- **Recommended next step:** consider sending only the Booking ID plus a link to the admin page.

### KI-29 · Uploads stored before validation (partly resolved)
- **Severity:** Low.
- **Done:** the payment-proof route now checks the booking and contact (`track_booking`) before uploading.
- **Still open:** `POST /api/bookings` uploads the passport photo before the database confirms the session is still bookable; the photo is removed if the booking fails.

### KI-30 · Booking code space (mitigated)
- **Severity:** Low.
- **Evidence:** the code is random 4 digits per month. Tracking now requires the contact and is rate limited per booking (15 per 10 minutes) and per IP.

### KI-31 · Hero font not a web font
- **Severity:** Low.
- **Evidence:** VERIFIED: "Freestyle Script" has no `@font-face`.
- **Status:** awaiting the user's choice of font.

### KI-32 · News pipeline edge cases
- **Severity:** Low.
- **Evidence:** INFERRED from the workflow graph:
  - Google News items keep news.google.com redirect links.
  - Drafting runs only after at least one new item is registered in that run.
  - Failed drafts are retried on every run.
  - The AI credit balance is UNKNOWN.
- **Recommended next step:** supervise the first run.

### KI-33 · No customer notifications
- **Severity:** Low.
- **Evidence:** VERIFIED: no email or SMS provider.
- **Recommended next step:** decide with the client.

### KI-35 · Admin auth UX (partly resolved)
- **Severity:** Low.
- **Done:** a signed-in non-admin can sign out from the login page, and sign-in is rate limited.
- **Still open:** there's no password reset or MFA in the app; passwords are reset through the Supabase dashboard.

### KI-36 · Footer year fixed at build time
- **Severity:** Low.
- **Evidence:** VERIFIED: `new Date().getFullYear()` runs on static pages, so the year is correct only until the next rebuild.

### KI-37 · Small tech debt (partly resolved)
- **Severity:** Low.
- **Done:** removed the unused careers CSS and the old content module.
- **Still open:**
  - `public/images/image.png` is unreferenced.
  - `.gitkeep`-only folders remain.
  - The tracking page has its own date formatter.

### KI-38 · Generated types maintained by hand
- **Severity:** Low.
- **Evidence:** VERIFIED: `src/db/database.types.ts` is updated by pasting the generator's output; there's no script.

### KI-39 · Repository state (partly resolved)
- **Severity:** Low.
- **Done:** `v1-build` was merged into `main` and pushed on 2026-10-02.
- **Still open:** the `.kilo/worktrees/poised-ranunculus` worktree and the `refs/agents/*` checkpoint refs remain. Remove them only with approval.

### KI-40 · Documentation gaps (partly resolved)
- **Severity:** Low.
- **Done:** the `ai/` documents and README describe the system.
- **Still open:** the client spec and the n8n workflow exports aren't in the repo. The booking-alerts workflow contains the webhook secret, so don't commit its export.

### KI-43 · UPI payee name differs from the brand
- **Severity:** Medium (customer trust).
- **Evidence:** VERIFIED: the QR decodes to `upi://pay?pa=8264742088@mbk&pn=Tahasen Rahman`, but the site labels the payee "Aviator's Regiment" (`NEXT_PUBLIC_UPI_PAYEE_NAME`).
- **Current behaviour:** customers see a person's name in their UPI app after scanning a QR labelled with the brand.
- **Possible impact:** hesitation or support queries from customers who think something is wrong.
- **Recommended next step:** decide whether to show the registered name on the site, or move to a business UPI ID registered to the brand.

### KI-44 · Homepage LCP not measurable
- **Severity:** Medium (performance and SEO).
- **Evidence:** VERIFIED: Lighthouse reports `NO_LCP` on `/` and a performance score of 0. The hero words start at `opacity: 0` and animate in one after another (`.editorial-word-text`).
- **Possible impact:** Core Web Vitals for the homepage may be poor or missing.
- **Recommended next step:** change the hero so its first frame shows visible content, for example by animating position only rather than opacity. This changes a design the user tuned, so it needs their approval.

### KI-45 · CSP allows inline scripts
- **Severity:** Low.
- **Evidence:** VERIFIED: `script-src 'self' 'unsafe-inline'`. Next.js inline scripts need either this or nonces; nonces would make every page dynamic.
- **Impact:** weaker protection if HTML injection were ever possible. React escaping and the Markdown renderer prevent that today.
- **Recommended next step:** consider nonce-based CSP once performance trade-offs are acceptable.

### KI-46 · Rate limiting depends on proxy IP headers
- **Severity:** Medium.
- **Evidence:** VERIFIED: `clientIp()` reads `x-forwarded-for` or `x-real-ip`. Without those headers, every visitor shares the key `unknown`. Indian mobile networks put many users behind shared IPs (CGNAT; INFERRED).
- **Possible impact:** on a host that doesn't set the headers, one busy period could rate-limit everyone. The per-IP limits (for example 8 bookings per 10 minutes) could affect users on shared mobile IPs during a rush.
- **Recommended next step:** confirm Vercel sets `x-forwarded-for` (expected), and review the limits after watching real traffic.

### KI-47 · `submit_payment_proof` parameter name
- **Severity:** Low.
- **Evidence:** VERIFIED: the parameter is still named `p_phone` but accepts phone or email. Renaming it needs a drop-and-recreate, which was declined in this environment.
- **Recommended next step:** rename it in a future approved migration.

### KI-48 · Careers links can go stale
- **Severity:** Low.
- **Evidence:** the 67 links were verified in Chrome on 2026-10-02. Several are government portals that change between recruitment cycles; for example `afcat.cdac.in` returned 404 and wasn't used. There's no automated link checker.
- **Recommended next step:** check the links periodically, either manually through the admin "Open link" buttons or with a scheduled job.

### KI-49 · End-to-end tests live outside the repo
- **Severity:** Medium.
- **Evidence:** VERIFIED: `admin-flow.mjs`, `live-booking.mjs` and `release-check.mjs` are in the AI session's temporary folder. They need `puppeteer-core`, a local Chrome and the secret key, and they write to the only database.
- **Recommended next step:** move them into `tests/e2e` once a staging database exists (KI-06).

### KI-50 · The GitHub repository is public
- **Severity:** Medium.
- **Evidence:** VERIFIED: `api.github.com/repos/Amit-Singh-2006/Aviator_Regiment` answered without authentication on 2026-10-02.
- **What this exposes:** the full source, the SQL schema and RLS policies, the n8n booking-webhook URL (migration 0002; protected by the secret header since migration 0006), the Supabase project ref, and the admin email addresses in `ai/` docs and commit metadata. No secrets were found in tracked files; the staged diff was scanned before the push.
- **Possible impact:** attackers can study the code paths, and the client's business logic is public.
- **Recommended next step:** decide with the client whether the repo should be private. Either way, never commit secrets, the client spec or n8n exports.

## Resolved issues (history)

| ID | What changed | Evidence |
|---|---|---|
| KI-04 | Fixed-window rate limits in Postgres (`consume_rate_limit`, keys hashed with HMAC) on booking, payment-proof, tracking and admin sign-in | Migration 0006, `src/lib/rate-limit.ts`; the release check returned a 429 on the 16th tracking attempt |
| KI-10 | `/track` shows the UPI details, the rejection reason and a screenshot upload while payment is pending; the API accepts phone or email | `track-booking.tsx`, migration 0007; release check |
| KI-12 | `admin_set_booking_status` rules: no cancelling after dispatch, close only after receipt, unit status kept in step | Migration 0007; rolled-back SQL test and release check |
| KI-14 | Public news search (`?q=`) and the `/marketplace` page | Release check |
| KI-16 | `(marketing)/error.tsx`, `admin/(console)/error.tsx`, `global-error.tsx` | Files present |
| KI-17 | CSP, X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy, HSTS | `next.config.ts`; release check; no CSP violations on 9 public pages |
| KI-19 | Database sends `X-AR-Webhook-Secret` (value in `private.app_settings`); the n8n webhook `onlyRunIf` checks it | Migration 0006; n8n workflow version "Require shared secret header on booking webhook" |
| KI-23 | Couriers: Delhivery, DTDC, Rapido, Uber; a tracking link can replace the AWB | `src/modules/bookings/admin.ts`; release check |
| KI-24 | `admin_save_shipment` phase rules (outbound vs return) | Migration 0007; rolled-back SQL test |
| KI-25 | Prices saved in one upsert; audit writes go through `recordAudit()` | Code |
| KI-26 | Anon has a column-level select grant on `news_articles` | Migration 0006; rolled-back SQL test |
| KI-34 | `ActionForm` adds the submitter's value when the browser doesn't | `action-form.tsx` |
| KI-41 | Lighthouse measured on 6 pages (see `current-state.md` §12) | Lighthouse JSON (session folder) |
| KI-42 | Organization and WebSite JSON-LD on the homepage | Release check |
