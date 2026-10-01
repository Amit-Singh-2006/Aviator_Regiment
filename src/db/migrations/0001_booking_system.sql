-- Aviator's Regiment V1: CX-3 rental booking system.
--
-- Access model:
--   * The public site (publishable key) can only read open exam sessions and prices.
--   * Customer data (bookings, payments, documents, shipments) is never exposed to
--     the public key. The Next.js server writes it with the secret key, and
--     signed-in admins (listed in admin_users) manage it through RLS policies.

-- Helpers live in a schema the Data API does not expose.
create schema if not exists private;

-- Types -------------------------------------------------------------------------

create type public.session_type as enum ('OLODE', 'REGULAR');
create type public.session_status as enum ('available', 'sold_out', 'temporarily_unavailable', 'hidden');
create type public.booking_status as enum (
  'payment_pending',
  'payment_review',
  'confirmed',
  'cx3_assigned',
  'dispatched',
  'in_transit',
  'out_for_delivery',
  'delivered',
  'return_pickup_scheduled',
  'return_in_transit',
  'cx3_received',
  'closed',
  'cancelled'
);
create type public.payment_method as enum ('upi', 'razorpay');
create type public.payment_status as enum ('awaiting_payment', 'pending_verification', 'verified', 'rejected');
create type public.cx3_unit_status as enum ('available', 'assigned', 'with_customer', 'maintenance', 'retired');
create type public.shipment_direction as enum ('outbound', 'return');
create type public.shipment_status as enum ('pending', 'pickup_scheduled', 'dispatched', 'in_transit', 'out_for_delivery', 'delivered', 'received');

-- Admins ------------------------------------------------------------------------

create table public.admin_users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  created_at timestamptz not null default now()
);

create function private.is_admin() returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.admin_users where user_id = (select auth.uid()));
$$;

create function private.set_updated_at() returns trigger
language plpgsql set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Catalogue: prices per session type and the exam sessions on sale ---------------

create table public.rental_prices (
  session_type public.session_type primary key,
  amount_inr integer not null check (amount_inr > 0),
  updated_at timestamptz not null default now()
);

create table public.exam_sessions (
  id text primary key check (id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null check (char_length(name) between 2 and 60),
  session_type public.session_type not null references public.rental_prices (session_type),
  status public.session_status not null default 'hidden',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index exam_sessions_session_type_idx on public.exam_sessions (session_type);

-- Bookings ------------------------------------------------------------------------

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  booking_code text not null unique check (booking_code ~ '^AR[0-9]{10}$'),
  session_id text not null references public.exam_sessions (id),
  amount_inr integer not null check (amount_inr > 0),
  status public.booking_status not null default 'payment_pending',
  full_name text not null,
  phone text not null check (phone ~ '^[6-9][0-9]{9}$'),
  email text not null,
  delivery_address text not null,
  aadhaar_number text not null check (aadhaar_number ~ '^[2-9][0-9]{11}$'),
  dgca_number text not null,
  photo_path text not null,
  terms_version text not null,
  terms_accepted_at timestamptz not null,
  admin_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index bookings_session_id_idx on public.bookings (session_id);
create index bookings_status_idx on public.bookings (status);
create index bookings_phone_idx on public.bookings (phone);
create index bookings_created_at_idx on public.bookings (created_at desc);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id) on delete cascade,
  method public.payment_method not null,
  status public.payment_status not null,
  amount_inr integer not null check (amount_inr > 0),
  gateway_fee_inr integer not null default 0 check (gateway_fee_inr >= 0),
  screenshot_path text,
  submitted_at timestamptz,
  razorpay_order_id text unique,
  razorpay_payment_id text unique,
  reviewed_by uuid references auth.users (id),
  reviewed_at timestamptz,
  rejection_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index payments_booking_id_idx on public.payments (booking_id);
create index payments_status_idx on public.payments (status);
create index payments_reviewed_by_idx on public.payments (reviewed_by);

-- CX-3 inventory and assignment -----------------------------------------------------

create table public.cx3_units (
  id uuid primary key default gen_random_uuid(),
  unit_code text not null unique,
  status public.cx3_unit_status not null default 'available',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.cx3_assignments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id) on delete cascade,
  unit_id uuid not null references public.cx3_units (id),
  assigned_at timestamptz not null default now(),
  assigned_by uuid references auth.users (id),
  released_at timestamptz
);
-- A unit can only be out on one booking, and a booking holds one unit at a time.
create unique index cx3_assignments_active_unit_idx on public.cx3_assignments (unit_id) where released_at is null;
create unique index cx3_assignments_active_booking_idx on public.cx3_assignments (booking_id) where released_at is null;
create index cx3_assignments_booking_id_idx on public.cx3_assignments (booking_id);
create index cx3_assignments_unit_id_idx on public.cx3_assignments (unit_id);
create index cx3_assignments_assigned_by_idx on public.cx3_assignments (assigned_by);

-- Courier shipments: one outbound and one return per booking ------------------------

create table public.shipments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id) on delete cascade,
  direction public.shipment_direction not null,
  status public.shipment_status not null default 'pending',
  courier text,
  awb_number text,
  tracking_url text check (tracking_url is null or tracking_url ~ '^https?://'),
  dispatch_date date,
  pickup_date date,
  expected_delivery_date date,
  received_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (booking_id, direction)
);

-- Audit trail -------------------------------------------------------------------------

create table public.audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users (id) on delete set null,
  action text not null,
  entity text not null,
  entity_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index audit_log_entity_idx on public.audit_log (entity, entity_id);
create index audit_log_actor_id_idx on public.audit_log (actor_id);

-- updated_at triggers ----------------------------------------------------------------

create trigger rental_prices_updated_at before update on public.rental_prices for each row execute function private.set_updated_at();
create trigger exam_sessions_updated_at before update on public.exam_sessions for each row execute function private.set_updated_at();
create trigger bookings_updated_at before update on public.bookings for each row execute function private.set_updated_at();
create trigger payments_updated_at before update on public.payments for each row execute function private.set_updated_at();
create trigger cx3_units_updated_at before update on public.cx3_units for each row execute function private.set_updated_at();
create trigger shipments_updated_at before update on public.shipments for each row execute function private.set_updated_at();

-- Row level security ---------------------------------------------------------------------

alter table public.admin_users enable row level security;
alter table public.rental_prices enable row level security;
alter table public.exam_sessions enable row level security;
alter table public.bookings enable row level security;
alter table public.payments enable row level security;
alter table public.cx3_units enable row level security;
alter table public.cx3_assignments enable row level security;
alter table public.shipments enable row level security;
alter table public.audit_log enable row level security;

grant usage on schema private to anon, authenticated, service_role;
revoke all on function private.is_admin() from public;
grant execute on function private.is_admin() to anon, authenticated, service_role;

grant select on public.rental_prices, public.exam_sessions to anon, authenticated;
grant insert, update, delete on public.rental_prices, public.exam_sessions to authenticated;
grant select, insert, update, delete on public.bookings, public.payments, public.cx3_units,
  public.cx3_assignments, public.shipments, public.audit_log, public.admin_users to authenticated;
grant all on all tables in schema public to service_role;

-- Public catalogue: anyone sees sessions that are not hidden; admins see and edit all.
create policy "Catalogue prices are public" on public.rental_prices
  for select to anon, authenticated using (true);
create policy "Admins insert prices" on public.rental_prices
  for insert to authenticated with check ((select private.is_admin()));
create policy "Admins update prices" on public.rental_prices
  for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "Admins delete prices" on public.rental_prices
  for delete to authenticated using ((select private.is_admin()));

create policy "Open sessions are public" on public.exam_sessions
  for select to anon, authenticated using (status <> 'hidden' or (select private.is_admin()));
create policy "Admins insert sessions" on public.exam_sessions
  for insert to authenticated with check ((select private.is_admin()));
create policy "Admins update sessions" on public.exam_sessions
  for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "Admins delete sessions" on public.exam_sessions
  for delete to authenticated using ((select private.is_admin()));

-- Customer and operations data: admins only.
create policy "Admins manage bookings" on public.bookings
  for all to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "Admins manage payments" on public.payments
  for all to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "Admins manage CX-3 units" on public.cx3_units
  for all to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "Admins manage CX-3 assignments" on public.cx3_assignments
  for all to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "Admins manage shipments" on public.shipments
  for all to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "Admins read the audit log" on public.audit_log
  for select to authenticated using ((select private.is_admin()));
create policy "Admins write the audit log" on public.audit_log
  for insert to authenticated with check ((select private.is_admin()));
-- Admin accounts are added from the Supabase dashboard (service role), never from the app.
create policy "Admins see admin accounts" on public.admin_users
  for select to authenticated using ((select private.is_admin()));

-- Server-side booking operations (secret key only) -----------------------------------------

-- Creates a booking for an open session with a unique AR + YYYYMM (IST) + 4-digit code,
-- plus its UPI payment record, in one transaction.
create function public.create_booking(
  p_session_id text,
  p_full_name text,
  p_phone text,
  p_email text,
  p_delivery_address text,
  p_aadhaar_number text,
  p_dgca_number text,
  p_photo_path text,
  p_terms_version text
) returns table (booking_code text, amount_inr integer, session_name text)
language plpgsql set search_path = ''
as $$
#variable_conflict use_column
declare
  v_session public.exam_sessions;
  v_amount integer;
  v_code text;
  v_booking_id uuid;
  v_month text := to_char(now() at time zone 'Asia/Kolkata', 'YYYYMM');
begin
  select * into v_session from public.exam_sessions s where s.id = p_session_id for share;
  if not found or v_session.status <> 'available' then
    raise exception 'session_not_bookable' using errcode = 'P0001';
  end if;

  select rp.amount_inr into v_amount from public.rental_prices rp where rp.session_type = v_session.session_type;

  for attempt in 1..25 loop
    v_code := 'AR' || v_month || lpad(floor(random() * 10000)::int::text, 4, '0');
    begin
      insert into public.bookings (booking_code, session_id, amount_inr, full_name, phone, email,
        delivery_address, aadhaar_number, dgca_number, photo_path, terms_version, terms_accepted_at)
      values (v_code, v_session.id, v_amount, p_full_name, p_phone, p_email,
        p_delivery_address, p_aadhaar_number, p_dgca_number, p_photo_path, p_terms_version, now())
      returning id into v_booking_id;
      exit;
    exception when unique_violation then
      v_booking_id := null;
    end;
  end loop;

  if v_booking_id is null then
    raise exception 'booking_code_unavailable' using errcode = 'P0001';
  end if;

  insert into public.payments (booking_id, method, status, amount_inr)
  values (v_booking_id, 'upi', 'awaiting_payment', v_amount);

  insert into public.audit_log (action, entity, entity_id, details)
  values ('booking.created', 'booking', v_code, jsonb_build_object('session_id', v_session.id));

  return query select v_code, v_amount, v_session.name;
end;
$$;

-- Records the customer's UPI payment screenshot and moves the booking to payment review.
-- The phone number must match the booking.
create function public.submit_payment_proof(p_booking_code text, p_phone text, p_screenshot_path text)
returns public.booking_status
language plpgsql set search_path = ''
as $$
declare
  v_booking public.bookings;
begin
  select * into v_booking from public.bookings b
  where b.booking_code = p_booking_code and b.phone = p_phone
  for update;
  if not found then
    raise exception 'booking_not_found' using errcode = 'P0001';
  end if;
  if v_booking.status not in ('payment_pending', 'payment_review') then
    raise exception 'payment_already_processed' using errcode = 'P0001';
  end if;

  update public.payments
  set screenshot_path = p_screenshot_path, status = 'pending_verification', submitted_at = now()
  where booking_id = v_booking.id and method = 'upi' and status <> 'verified';

  update public.bookings set status = 'payment_review' where id = v_booking.id;

  insert into public.audit_log (action, entity, entity_id)
  values ('payment.proof_submitted', 'booking', p_booking_code);

  return 'payment_review';
end;
$$;

-- Customer-safe tracking view: only returned when the phone or email matches.
create function public.track_booking(p_booking_code text, p_contact text)
returns jsonb
language sql stable set search_path = ''
as $$
  select jsonb_build_object(
    'bookingCode', b.booking_code,
    'status', b.status,
    'sessionName', s.name,
    'amountInr', b.amount_inr,
    'createdAt', b.created_at,
    'paymentStatus', (
      select p.status from public.payments p where p.booking_id = b.id order by p.created_at desc limit 1
    ),
    'cx3Unit', (
      select u.unit_code from public.cx3_assignments a
      join public.cx3_units u on u.id = a.unit_id
      where a.booking_id = b.id and a.released_at is null
      limit 1
    ),
    'shipments', coalesce((
      select jsonb_agg(jsonb_build_object(
        'direction', sh.direction,
        'status', sh.status,
        'courier', sh.courier,
        'awbNumber', sh.awb_number,
        'trackingUrl', sh.tracking_url,
        'dispatchDate', sh.dispatch_date,
        'pickupDate', sh.pickup_date,
        'expectedDeliveryDate', sh.expected_delivery_date,
        'receivedDate', sh.received_date
      ))
      from public.shipments sh where sh.booking_id = b.id
    ), '[]'::jsonb)
  )
  from public.bookings b
  join public.exam_sessions s on s.id = b.session_id
  where b.booking_code = upper(p_booking_code)
    and (b.phone = p_contact or lower(b.email) = lower(p_contact));
$$;

revoke all on function public.create_booking(text, text, text, text, text, text, text, text, text) from public, anon, authenticated;
revoke all on function public.submit_payment_proof(text, text, text) from public, anon, authenticated;
revoke all on function public.track_booking(text, text) from public, anon, authenticated;
grant execute on function public.create_booking(text, text, text, text, text, text, text, text, text) to service_role;
grant execute on function public.submit_payment_proof(text, text, text) to service_role;
grant execute on function public.track_booking(text, text) to service_role;

-- Private document storage (passport photos, payment screenshots) ---------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('booking-documents', 'booking-documents', false, 5242880, array['image/jpeg', 'image/png', 'image/webp']);

-- Uploads happen on the server with the secret key; admins can view files.
create policy "Admins read booking documents" on storage.objects
  for select to authenticated using (bucket_id = 'booking-documents' and (select private.is_admin()));

-- Starting catalogue (admins manage these from the dashboard afterwards) ----------------------

insert into public.rental_prices (session_type, amount_inr) values ('OLODE', 2000), ('REGULAR', 2500);
insert into public.exam_sessions (id, name, session_type, status, sort_order) values
  ('fc-olode-03', 'FC OLODE 03', 'OLODE', 'available', 1),
  ('fc-regular-04', 'FC Regular 04', 'REGULAR', 'available', 2);
