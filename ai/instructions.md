# Instructions for AI Agents — Aviator's Regiment

Read this before changing anything in this repository. Companion files:
- `ai/current-state.md`: how the project works today.
- `ai/decisions.md`: why it is built this way.
- `ai/known-issues.md`: open problems and risks.

This file was written from a read-only audit of `v1-build` @ `385b718` on 2026-10-02, then updated the same day after the second round (careers, security and booking rules), which was merged into `main`. Each rule is labelled:
- **[Convention]**: observed in the existing code, config or docs (evidence given).
- **[Recommended]**: not yet a written project rule; proposed because of a concrete risk described here.

---

## 1. Project context you must know

- **What it is.** The website for *Aviator's Regiment*. CX-3 rental per DGCA exam session is the main paid service (OLODE ₹2,000, Regular ₹2,500, plus a refundable ₹5,000 security deposit since 2 Oct 2026; the rental is **non-refundable**, the deposit is kept if the CX-3 is lost). Around it: WhatsApp lead pages, careers, coaching, community, AI-assisted aviation news, and an admin console.
- **The client's requirements spec is NOT in the repo.** It was pasted into an AI chat on 2026-10-02. Don't assume a requirement unless the code, the README or the user confirms it. Where these docs cite "spec", they mean that transcript.
- **Accounts.** The Supabase project (`aviators-regiment`, ref `hybtjlozgwfyezqfvnjp`, ap-south-1), n8n Cloud (`aviatorsregiment.app.n8n.cloud`) and Vercel belong to the **client** (aviatorsregiment@gmail.com). The Git remote is the developer's GitHub (`Amit-Singh-2006/Aviator_Regiment`).
- **People.** The admins are `amit.panwar2k6@gmail.com` (developer) and `aviatorsregiment@gmail.com` (client).
- **Domain.** None is owned yet. `siteConfig.url` defaults to `https://aviatorsregiment.com`. Don't treat that as live.
- **There is exactly one Supabase project, and local `.env.local` points at it.** Any local run, script, test or migration acts on the **production database**. [Convention: VERIFIED fact] [Recommended: treat every DB action as production.]
- **Branches.** `v1-build` was merged into `main` and `main` was pushed on 2026-10-02. Work from `main`, or from a feature branch off it.
- **The GitHub repository is public** (KI-50). Anything committed is visible to everyone. Never commit secrets, `.env.local` values, the client's private spec, or n8n workflow exports.
- **Business details (set 2026-10-02):** WhatsApp **+91 82769 16762**, WhatsApp group link, UPI ID **8264742088@mbk**, QR at `public/images/upi-qr.png`, couriers **Delhivery, DTDC, Rapido, Uber**. The UPI ID is registered to "Tahasen Rahman" (KI-43).

## 2. Actions that require explicit user approval [Recommended]

The user's standing instruction for this audit was: don't modify code, config, dependencies, environment files, schemas, APIs, UI or behaviour without approval. Until the user says otherwise, get explicit approval before you:

1. **Change the database.** This covers:
   - new or edited migrations, `apply_migration`, DDL;
   - RLS policies, grants, functions, triggers, storage buckets and policies;
   - `private.app_settings`;
   - any `insert`, `update` or `delete` on live tables, including test data.
2. **Change authentication or authorization**: `middleware.ts`, `src/lib/supabase/auth.ts`, `admin_users`, Supabase Auth settings.
3. **Add, remove or upgrade dependencies**, including the Next 16 upgrade suggested by `npm audit`.
4. **Change configuration**: `next.config.ts`, `tsconfig.json`, `eslint.config.mjs`, `package.json` scripts, `.env.example`. Never write `.env.local` without approval.
5. **Change prices, legal text or the terms version**: `src/modules/bookings/terms.ts`, `app/(marketing)/terms`, `app/(marketing)/refund-policy`, `rental_prices`.
6. **Change the client-specified WhatsApp message wording** in `src/lib/whatsapp/index.ts`. Several messages are quoted verbatim from the spec.
7. **Change the Booking ID format** (`AR` + YYYYMM + 4 digits). It is defined by the spec and enforced by a DB check constraint.
8. **Use git beyond committing on the current branch**: push, merge, rebase, force operations, deleting branches or refs, or removing the `.kilo/` worktree. Commit only when asked.
9. **Deploy**, or change Vercel or domain settings.
10. **Activate, publish or edit n8n workflows**, or create credentials in them. They send real email and call the live database.
11. **Delete files, uploaded documents or storage objects.**
12. **Do anything that sends data outside the project**: emails, webhooks, third-party APIs.
13. **Replace the UPI QR image or change the UPI ID.** Payments go wherever the QR points. Decode any new QR and confirm its `pa=` matches the UPI ID the client gave.

**[Convention, observed 2026-10-02]** Destructive SQL in this environment (for example `drop function`, `delete from` on live tables) has been **declined** at the approval prompt. Prefer `create or replace` and other additive migrations. If something destructive is really needed, ask first and explain why.

## 3. Architecture constraints

- **[Convention] Three Supabase access paths. Never mix them.**
  - `createPublicClient()` (publishable key, no session) is only for public reads: open sessions, prices, published news.
  - `createServiceClient()` (`SUPABASE_SECRET_KEY`, bypasses RLS) is only for server-side customer operations in `app/api/*`, and only through the RPC functions `create_booking`, `submit_payment_proof` and `track_booking`.
  - `createAuthClient()` (cookie session, RLS applies) is for everything in the admin console.
  - **Admin actions must never use the service client.** Evidence: `src/lib/supabase/server.ts`, `src/lib/supabase/auth.ts`, migration 0001 header.
- **[Convention] Customer data is never readable with the publishable key.** All customer tables are admin-only under RLS. Keep it that way.
- **[Convention] Every admin page and Server Action starts with `await requireAdmin()`.** The database enforces the same rule through `(select private.is_admin())` in policies and `not_authorized` in the admin functions. Keep both layers.
- **[Convention] Multi-step state changes run in SQL functions** (`admin_review_payment`, `admin_assign_unit`, `admin_save_shipment`, `admin_set_booking_status`). Each is transactional, locks the booking row, and writes `audit_log`. Don't re-implement these as several client-side updates.
- **[Convention] Session availability is decided by the database.** `create_booking` refuses sessions that aren't `available`. The frontend check is only for UX.
- **[Convention] Validation is shared.** `validateBookingInput` (`src/modules/bookings/validation.ts`) runs both in the browser and in `POST /api/bookings`. Change it in one place and keep both callers working.
- **[Convention] Uploads are checked by content.** Use `readImageUpload()` (`src/modules/bookings/uploads.ts`): JPEG, PNG or WebP magic bytes, ≤5 MB. Don't trust the client's MIME type.
- **[Convention] Booking documents are private.** Use the `booking-documents` bucket, written by the server only, and show files to admins through short-lived signed URLs (600 s). Never make that bucket public or log its paths with customer data.
- **[Convention] News is never auto-published.** AI drafts land as `draft`; only an admin action sets `published`. (Spec §14: "I don't want a completely uncontrolled AI system publishing random articles.")
- **[Convention] Article bodies use the safe Markdown subset** in `src/modules/news/markdown.tsx`, rendered as React elements. Don't introduce `dangerouslySetInnerHTML` for article content. The only existing use is the escaped JSON-LD in `app/(marketing)/aviation-news/[slug]/page.tsx`.
- **[Convention] After a mutation, revalidate the affected paths.** Admin actions call `revalidatePath("/admin", "layout")`. News actions also revalidate `/aviation-news`, `/aviation-news/<slug>` (old and new slug) and `/sitemap.xml`.
- **[Convention] Module layout.** Domain logic goes in `src/modules/<domain>/`, shared adapters in `src/lib/`, and Server Actions in `src/modules/<domain>/admin-actions.ts` (`"use server"`). Pages stay thin.
- **[Convention] Public endpoints are rate limited.** Call `isRateLimited([...])` from `src/lib/rate-limit.ts` after validation and before any database writes or uploads, and hash every identifier with `hashIdentifier()`. Any new public endpoint or form action must do the same.
- **[Convention] Booking state rules live in SQL** (migration 0007). Don't bypass them with direct table updates to `bookings`, `cx3_units`, `cx3_assignments` or `shipments` from the app; go through the `admin_*` functions.
- **[Convention] Admin audit entries** go through `recordAudit()` (`src/modules/audit/record.ts`), and every new action label is added to `src/modules/audit/labels.ts`.
- **[Convention] Careers are data, not code.** Roles and companies live in `career_roles` and `career_companies`. Change them through `/admin/careers` or a migration, and revalidate `/careers`, `/careers/<slug>` and `/sitemap.xml` after changes.

## 4. Coding conventions (observed)

- **[Convention] TypeScript strict.** Imports use the `@/` alias rooted at the repo, e.g. `@/src/lib/format`.
- **[Convention] Server-only modules begin with `import "server-only"`**: `src/lib/supabase/server.ts`, `auth.ts`, `src/modules/bookings/uploads.ts`, `src/modules/*/queries.ts`. Add it to any new module that touches secrets or the database.
- **[Convention] Use `"use client"` only for interactive components**: booking-form, track-booking, site-header, landing-hero, reveal, and admin `ActionForm` and `AdminNav`.
- **[Convention] Exports.** Components are named exports in kebab-case files (`booking-form.tsx` exports `BookingForm`). Default exports are used only for Next.js route files.
- **[Convention] Server Actions** take `FormData`, return `Promise<ActionResult>` (`{ ok?: string; error?: string }`), validate input themselves, and map database errors through `adminErrorMessage()` (`src/lib/supabase/errors.ts`). SQL functions raise snake_case messages (`booking_not_ready`, …) that `errors.ts` translates.
- **[Convention] Admin forms use `ActionForm`.** Destructive or important buttons carry `data-confirm="…"`.
- **[Convention] Formatting helpers.**
  - Money: `formatInr()` (en-IN, no decimals).
  - Dates: `formatDate` and `formatDateTime` from `src/lib/format.ts`, always in `Asia/Kolkata`.
  - Booking IDs: `normalizeBookingId()` and `BOOKING_ID_PATTERN`.
  - WhatsApp links: `whatsappLink()` plus `whatsappMessages`.
  - Page metadata: `pageMetadata()` from `src/lib/seo.ts`.
- **[Convention] Styling.**
  - Plain global CSS with kebab-case class names.
  - Colours only through the tokens on `:root` in `app/globals.css` (`--navy`, `--gold`, `--gold-light`, `--gold-ink`, …). Text on light backgrounds uses `--gold-ink`, not `--gold` (contrast; see the CSS comment).
  - Admin styles live in `app/admin/admin.css`.
  - No Tailwind or CSS modules.
- **[Convention] Copy** uses Indian or British English ("authorised", "organisation", "colour") and short, friendly user-facing messages. Unexpected server errors go to `console.error` and the user gets a generic message.
- **[Convention] Comments** are short and explain *why*. SQL migrations start with a header comment describing intent.
- **[Convention] SQL migrations.**
  - Named `src/db/migrations/NNNN_snake_case.sql`, sequential, and matching what is applied in Supabase (`list_migrations`).
  - Functions use `set search_path = ''` and fully qualified names.
  - Helpers go in the `private` schema.
  - Callable functions get `revoke all … from public, anon[, authenticated]` followed by explicit grants. (The trigger helper `private.set_updated_at()` has no revoke.)
  - Every table has RLS enabled.
  - Policies use `(select private.is_admin())`.
- **[Convention] Generated types.** After a schema change, regenerate `src/db/database.types.ts` (Supabase type generator); keep the header comment and the helper types.
- **[Convention] Commits.** Imperative subject, bullet body. AI-assisted commits carry a `Co-Authored-By` trailer (see `63a394a`, `1ce72f0`, `385b718`).
- **[Note]** Code style isn't uniform. Older marketing pages put compact JSX on one line; newer files are multi-line. Match the file you're editing.

## 5. Files and areas that need extra caution

| Path | Why |
|---|---|
| `src/db/migrations/*.sql` | Already applied to the live database. **Never edit an applied migration**; add a new numbered file. |
| `src/lib/supabase/server.ts` | Holds the secret-key client. The key must never reach client code or a `NEXT_PUBLIC_` variable. |
| `src/lib/supabase/auth.ts`, `middleware.ts`, `src/modules/users/auth-actions.ts`, `app/admin/(console)/layout.tsx` | Admin authentication and authorization. |
| `app/api/**` | Public, unauthenticated endpoints that use the secret key. They have no rate limiting (KI-04). |
| `src/modules/bookings/validation.ts` | Shared client and server validation (Aadhaar Verhoeff checksum, phone, PIN). |
| `src/modules/bookings/terms.ts` and the legal pages | `TERMS_VERSION` is stored with every booking as a legal record. Change it together with the legal text. |
| `src/modules/bookings/booking-id.ts` | Must match the DB check constraint `^AR[0-9]{10}$` and the spec. |
| `src/lib/whatsapp/index.ts` | Spec-mandated pre-filled messages. |
| `app/admin/(console)/bookings/[code]/page.tsx` | Displays customer PII: Aadhaar, documents, address. |
| `src/db/database.types.ts` | Generated; don't hand-edit types that should come from the schema. |
| `next.config.ts` | Server Action body limit (6 MB) used by image upload; build-time env warning. |
| `.env.local` | Contains `SUPABASE_SECRET_KEY`. **Never print, read aloud, log or commit its values.** Check only whether a variable is set. It is gitignored (`.env*` with `!.env.example`). |
| `.kilo/` | A separate git worktree from another tool. Don't edit it or run commands inside it. |
| `src/lib/rate-limit.ts`, migration 0006 | Abuse protection for public endpoints and sign-in. It fails open by design. Limits are tuned for shared Indian mobile IPs (KI-46). |
| `private.app_settings` (`booking_events_webhook_url`, `booking_events_webhook_secret`) and the n8n "Booking Alerts" workflow | The secret exists **only** in the database and in the n8n `onlyRunIf` expression. Never commit it, print it in docs, or export that workflow into the repo. |
| `public/images/upi-qr.png` | The real payment QR; see approval item 13. |
| Migrations 0005–0010 | Applied in this order: careers, security_hardening, booking_rules, razorpay_payments, security_deposit, deposit_only_when_charged. The file numbers match. |
| `SECURITY_DEPOSIT_INR` (`src/modules/bookings/terms.ts`) and `rental_prices.deposit_inr` | The legal pages state the constant; bookings are charged the database value. Change both together, and bump `TERMS_VERSION` whenever the Terms or Refund Policy change. |
| `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, `src/lib/razorpay/`, `confirm_razorpay_payment` | Only the server may mark a Razorpay payment paid, and only after a signature check. Never expose the secrets to the browser or relax the HMAC comparison. Test keys stay local; live keys go only into the hosting settings. |
| n8n workflows `SHumI1sc18nqhdSe` and `s4AjfRZJnuFXwzoY` | Live external automation that isn't version-controlled. Their webhook URL is stored in `private.app_settings`. |

## 6. Security-sensitive areas

- **Secrets.**
  - [Convention] `SUPABASE_SECRET_KEY` is server-only.
  - [Recommended] Never paste secrets into chat, code, commits or test output. Verify a key's presence or format without printing its value.
- **PII.**
  - Aadhaar is stored in plaintext in `bookings.aadhaar_number` (KI-05).
  - Passport photos and payment screenshots are in the private bucket.
  - [Recommended] Don't log, export or email PII. Don't widen any RLS policy or grant on customer tables.
- **Public endpoints** have no rate limiting or bot protection (KI-04).
- **Admin console** has no security headers (KI-17). The `public.rls_auto_enable()` SECURITY DEFINER function is callable by anon (KI-27). Don't add more SECURITY DEFINER functions in `public` that anon can call.
- **The booking webhook** is protected only by an unguessable URL (KI-19).
- **Published news** exposes every column to the public key (KI-26). Don't add sensitive columns to `news_articles`.

## 7. Testing and validation expectations

- **[Convention, README]** Run `npm run lint`, `npm test`, `npm run build` and `npm run typecheck` before pushing. CI (`.github/workflows/ci.yml`) runs them in that order.
- **[Convention]** Unit tests (Vitest) live in `tests/unit/` and only cover pure, client-safe modules. Modules that import `server-only` can't be imported in Node tests, so put testable logic in a separate file (as with `src/modules/news/search.ts`). There are no integration or end-to-end tests in the repo; don't claim coverage that doesn't exist.
- **[Recommended]** Stop any running `next dev` before `next build`; both use `.next/`.
- **[Recommended]** End-to-end checks against the live database must:
  - create only clearly labelled test data;
  - clean up everything afterwards (bookings, payments, storage objects, audit rows, units, articles, temporary auth users);
  - verify the cleanup with a read-only query.

  Booking inserts fire the n8n webhook through pg_net. Once n8n is active, that sends real emails.
- **[Recommended]** After any DDL, run the Supabase security and performance advisors and compare them with KI-27.
- **[Recommended]** Report results faithfully. If something wasn't run or failed, say so.

## 8. Deployment and release precautions [Recommended]

- No deployment is configured in the repo, and the Vercel state is UNKNOWN (KI-08). Confirm the target, plan and team with the user first.
- Set `SUPABASE_SECRET_KEY` as a server-only variable. Set `NEXT_PUBLIC_SITE_URL` to the domain actually serving the site (KI-07). `NEXT_PUBLIC_*` values are inlined at build time, so redeploy after changing them.
- Set the business values in the hosting environment too: `NEXT_PUBLIC_WHATSAPP_NUMBER`, `NEXT_PUBLIC_WHATSAPP_COMMUNITY_URL`, `NEXT_PUBLIC_UPI_ID`, `NEXT_PUBLIC_UPI_QR_IMAGE` and `NEXT_PUBLIC_UPI_PAYEE_NAME`. `NEXT_PUBLIC_TELEGRAM_URL` is still missing.
- Confirm the host sets `x-forwarded-for` (Vercel does). Otherwise all visitors share one rate-limit bucket (KI-46).
- Production and development share one Supabase project (KI-06). Coordinate migrations with the user, apply them during quiet periods, and keep the repo migration list identical to `list_migrations`.
- Before launch, confirm with the user: Supabase plan and backups (KI-22), Auth sign-ups disabled (KI-18), n8n credentials and activation (KI-03), and the Vercel plan for commercial use.

## 9. How to work on this project [Recommended]

1. Read `ai/current-state.md` and the relevant sections of `ai/known-issues.md` first.
2. Inspect the real code and live state with read-only commands and queries before proposing changes. Don't rely on these docs alone; they describe 2026-10-02.
3. Mark anything you can't verify as UNKNOWN instead of guessing.
4. Keep changes small and in the existing style. Don't refactor unrelated code.
5. Update `ai/current-state.md`, `ai/decisions.md` and `ai/known-issues.md` when your approved change alters what they describe.
