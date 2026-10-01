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

Exam sessions, prices and availability live in
`src/modules/exam-sessions/sessions.ts` until the admin panel is connected to
the database. Pre-filled WhatsApp messages live in `src/lib/whatsapp`.