# Aviator's Regiment

The repository is organized as a modular monolith for the V1 aviation rental
platform. Domain boundaries are established before feature implementation so
future marketplace capabilities can be added without restructuring the whole
application.

## Planned structure

```text
app/
  (marketing)/        Public SEO pages
  track/              Customer booking tracking
  admin/              Protected operations dashboard
  api/                Route handlers and integrations

src/
  db/                 Database client, schema, and migrations
  modules/            Domain modules
  jobs/               Scheduled and durable background work
  lib/                Shared infrastructure adapters
  types/              Shared type definitions

tests/
  unit/
  integration/
  e2e/
```

The initial V1 domains are bookings, exam sessions, payments, CX-3
assignments, shipments, returns, leads, content, news, users, and audit.

## Setup

```bash
npm install
cp .env.example .env.local   # fill in the WhatsApp, UPI and community values
npm run dev
```

Before pushing, run `npm run lint`, `npm run typecheck` and `npm run build`.

Bookings, payments, CX-3 units, shipments, exam sessions and prices live in
Supabase. The schema is versioned in `src/db/migrations`; after changing it,
regenerate `src/db/database.types.ts`. Pre-filled WhatsApp messages live in
`src/lib/whatsapp`.

## Admin console

`/admin` is the operations console: verify UPI payments, assign CX-3 units,
record delivery and return couriers, close bookings, manage exam sessions,
prices and units, and review aviation news before it is published. Admins sign
in with Supabase Auth (email and password). To add an admin, create the user in
Supabase (Authentication → Users), then insert their user id into
`public.admin_users`. Every admin action runs as that user, so row level
security applies, and it is recorded in `public.audit_log` (the Activity page).

## Automations (n8n)

Two n8n workflows run alongside the site:

- **Aviation News: Collect and Draft** reads the active `news_sources` feeds every
  3 hours, registers new stories (`ingest_news_item`), writes an AI draft for each
  (`save_news_draft`) and emails the admins. Nothing is published automatically.
- **Booking Alerts: Email Admins** receives a webhook from the database (pg_net
  trigger on `audit_log`) when a booking is created or a payment screenshot is
  uploaded, and emails the admins. The webhook URL is stored in
  `private.app_settings`.