# Aviator's Regiment

The repository is organized as a modular monolith for the V1 aviation rental
platform. Domain boundaries are established before feature implementation so
future marketplace capabilities can be added without restructuring the whole
application.

## Structure

```text
app/
  (marketing)/        Public SEO pages (rent, services, news, careers, marketplace…)
  track/              Customer booking tracking and UPI payment upload
  admin/              Protected operations console
  api/                Route handlers (bookings, payment proof, tracking)

src/
  components/         UI components (admin/ for the console)
  db/                 Schema migrations and generated database types
  modules/            Domain modules (bookings, careers, exam sessions, news…)
  lib/                Shared adapters (Supabase clients, rate limits, SEO…)

tests/
  unit/               Vitest unit tests for pure modules

android/              Android app (Trusted Web Activity wrapping the live site);
                      built with Gradle, see android/README.md
```

The V1 domains are bookings, exam sessions, payments, CX-3 assignments,
shipments, returns, careers, news, users and audit. AI agents working on the
project should read `ai/instructions.md` first.

## Setup

```bash
npm install
cp .env.example .env.local   # fill in the Supabase, WhatsApp, UPI and community values
npm run dev
```

Before pushing, run `npm run lint`, `npm test`, `npm run build` and
`npm run typecheck`. GitHub Actions runs the same checks on `main` and on pull
requests (`.github/workflows/ci.yml`).

Bookings, payments, CX-3 units, shipments, exam sessions, prices, careers and
news live in Supabase. The schema is versioned in `src/db/migrations` (applied
in file order); after changing it, regenerate `src/db/database.types.ts`.
Pre-filled WhatsApp messages live in `src/lib/whatsapp`.

## Admin console

`/admin` is the operations console:

- verify or reject UPI payments
- assign CX-3 units
- record delivery and return couriers (Delhivery, DTDC, Rapido, Uber)
- close bookings
- manage exam sessions, prices and units
- maintain the careers directory (roles and the companies under each)
- review aviation news before it is published

Admins sign in with Supabase Auth (email and password). To add an admin, create
the user in Supabase (Authentication → Users), then insert their user id into
`public.admin_users`. Every admin action runs as that user, so row level
security applies, and changes are recorded in `public.audit_log` (the Activity
page).

## Security

- **Rate limits.** The public booking, payment-proof and tracking endpoints and
  admin sign-in are rate limited in Postgres (`public.consume_rate_limit`).
- **Headers.** Every response carries security headers (CSP, frame blocking,
  HSTS and others) from `next.config.ts`.
- **Aadhaar.** Numbers are shown in full to admins only on request, and each
  view is logged.

## Automations (n8n)

Two n8n workflows run alongside the site:

- **Aviation News: Collect and Draft** reads the active `news_sources` feeds every
  3 hours, registers new stories (`ingest_news_item`), writes an AI draft for each
  (`save_news_draft`) and emails the admins. Nothing is published automatically.
- **Booking Alerts: Email Admins** receives a webhook from the database (pg_net
  trigger on `audit_log`) when a booking is created or a payment screenshot is
  uploaded, and emails the admins. The webhook URL and a shared secret are
  stored in `private.app_settings`. The workflow only runs when the request
  carries that secret in the `X-AR-Webhook-Secret` header. Keep the secret out
  of the repository.
