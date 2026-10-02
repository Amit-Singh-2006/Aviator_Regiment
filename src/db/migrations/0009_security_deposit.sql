-- Aviator's Regiment V1: refundable security deposit and the rental period.
--
-- * Every booking includes a refundable security deposit (₹5,000, the default in
--   rental_prices.deposit_inr), paid together with the rental. The booking keeps
--   its own copy, so a later change doesn't affect existing bookings. The amount
--   must match SECURITY_DEPOSIT_INR in src/modules/bookings/terms.ts (Terms).
-- * The deposit is held once the payment is verified. An admin refunds it after
--   the CX-3 is back (or after a cancellation before dispatch), or keeps it when
--   the CX-3 is lost, which also closes the booking and retires the unit.
-- * Customers keep the CX-3 until the day after their last exam, so bookings
--   record that date.

create type public.deposit_status as enum ('unpaid', 'held', 'refunded', 'forfeited');

alter table public.rental_prices
  add column deposit_inr integer not null default 5000 check (deposit_inr >= 0);

alter table public.bookings
  add column deposit_inr integer not null default 0 check (deposit_inr >= 0),
  add column deposit_status public.deposit_status not null default 'unpaid',
  add column deposit_settled_at timestamptz,
  add column deposit_note text,
  add column last_exam_date date;

-- Same signature as before; the booking now stores the deposit, and the UPI payment
-- record covers the rental plus the deposit.
create or replace function public.create_booking(
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
  v_deposit integer;
  v_code text;
  v_booking_id uuid;
  v_month text := to_char(now() at time zone 'Asia/Kolkata', 'YYYYMM');
begin
  select * into v_session from public.exam_sessions s where s.id = p_session_id for share;
  if not found or v_session.status <> 'available' then
    raise exception 'session_not_bookable' using errcode = 'P0001';
  end if;

  select rp.amount_inr, rp.deposit_inr into v_amount, v_deposit
  from public.rental_prices rp where rp.session_type = v_session.session_type;

  for attempt in 1..25 loop
    v_code := 'AR' || v_month || lpad(floor(random() * 10000)::int::text, 4, '0');
    begin
      insert into public.bookings (booking_code, session_id, amount_inr, deposit_inr, full_name, phone, email,
        delivery_address, aadhaar_number, dgca_number, photo_path, terms_version, terms_accepted_at)
      values (v_code, v_session.id, v_amount, v_deposit, p_full_name, p_phone, p_email,
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
  values (v_booking_id, 'upi', 'awaiting_payment', v_amount + v_deposit);

  insert into public.audit_log (action, entity, entity_id, details)
  values ('booking.created', 'booking', v_code, jsonb_build_object('session_id', v_session.id));

  return query select v_code, v_amount, v_session.name;
end;
$$;

-- Verifying a UPI payment also marks the deposit as held; rejecting it (when nothing
-- was paid online) marks it unpaid again.
create or replace function public.admin_review_payment(p_booking_code text, p_approve boolean, p_reason text default null)
returns public.booking_status
language plpgsql set search_path = ''
as $$
declare
  v_booking public.bookings;
  v_status public.booking_status;
  v_paid_online boolean;
begin
  if not (select private.is_admin()) then
    raise exception 'not_authorized' using errcode = '42501';
  end if;
  select * into v_booking from public.bookings where booking_code = p_booking_code for update;
  if not found then
    raise exception 'booking_not_found' using errcode = 'P0001';
  end if;
  if v_booking.status in ('closed', 'cancelled') then
    raise exception 'booking_closed' using errcode = 'P0001';
  end if;

  update public.payments set
    status = case when p_approve then 'verified'::public.payment_status else 'rejected'::public.payment_status end,
    reviewed_by = auth.uid(),
    reviewed_at = now(),
    rejection_reason = case when p_approve then null else nullif(trim(p_reason), '') end
  where booking_id = v_booking.id and method = 'upi';

  select exists (
    select 1 from public.payments where booking_id = v_booking.id and method = 'razorpay' and status = 'verified'
  ) into v_paid_online;

  v_status := case
    when not p_approve and not v_paid_online then 'payment_pending'::public.booking_status
    when p_approve and v_booking.status in ('payment_pending', 'payment_review') then 'confirmed'::public.booking_status
    else v_booking.status
  end;
  update public.bookings set
    status = v_status,
    deposit_status = case
      when p_approve and deposit_status = 'unpaid' then 'held'::public.deposit_status
      when not p_approve and not v_paid_online and deposit_status = 'held' then 'unpaid'::public.deposit_status
      else deposit_status
    end
  where id = v_booking.id;

  insert into public.audit_log (actor_id, action, entity, entity_id, details)
  values (auth.uid(), case when p_approve then 'payment.verified' else 'payment.rejected' end, 'booking', p_booking_code,
    jsonb_build_object('reason', nullif(trim(p_reason), '')));
  return v_status;
end;
$$;

-- A verified online payment also marks the deposit as held.
create or replace function public.confirm_razorpay_payment(p_order_id text, p_payment_id text, p_source text)
returns jsonb
language plpgsql set search_path = ''
as $$
declare
  v_payment public.payments;
  v_booking public.bookings;
  v_status public.booking_status;
begin
  select * into v_payment from public.payments
  where razorpay_order_id = p_order_id and method = 'razorpay'
  for update;
  if not found then
    return null;
  end if;

  select * into v_booking from public.bookings where id = v_payment.booking_id for update;

  if v_payment.status = 'verified' then
    return jsonb_build_object('bookingCode', v_booking.booking_code, 'status', v_booking.status);
  end if;

  update public.payments set
    status = 'verified',
    razorpay_payment_id = p_payment_id,
    submitted_at = now(),
    reviewed_at = now(),
    rejection_reason = null
  where id = v_payment.id;

  v_status := case
    when v_booking.status in ('payment_pending', 'payment_review') then 'confirmed'::public.booking_status
    else v_booking.status
  end;
  update public.bookings set
    status = v_status,
    deposit_status = case when deposit_status = 'unpaid' then 'held'::public.deposit_status else deposit_status end
  where id = v_booking.id;

  insert into public.audit_log (action, entity, entity_id, details)
  values ('payment.razorpay_paid', 'booking', v_booking.booking_code, jsonb_build_object(
    'order_id', p_order_id,
    'payment_id', p_payment_id,
    'amount_inr', v_payment.amount_inr,
    'gateway_fee_inr', v_payment.gateway_fee_inr,
    'source', p_source,
    'booking_status_before', v_booking.status
  ));

  return jsonb_build_object('bookingCode', v_booking.booking_code, 'status', v_status);
end;
$$;

-- The checkout state now includes the deposit, which is paid online with the rental.
create or replace function public.razorpay_checkout_state(p_booking_code text, p_contact text)
returns jsonb
language sql stable set search_path = ''
as $$
  select jsonb_build_object(
    'status', b.status,
    'amountInr', b.amount_inr,
    'depositInr', b.deposit_inr,
    'orderId', o.razorpay_order_id,
    'orderAmountInr', o.amount_inr
  )
  from public.bookings b
  left join lateral (
    select pay.razorpay_order_id, pay.amount_inr from public.payments pay
    where pay.booking_id = b.id and pay.method = 'razorpay' and pay.status = 'awaiting_payment'
    order by pay.created_at desc limit 1
  ) o on true
  where b.booking_code = upper(p_booking_code)
    and (b.phone = p_contact or lower(b.email) = lower(p_contact));
$$;

-- Customer-safe tracking view, now with the deposit and the last exam date.
create or replace function public.track_booking(p_booking_code text, p_contact text)
returns jsonb
language sql stable set search_path = ''
as $$
  select jsonb_build_object(
    'bookingCode', b.booking_code,
    'status', b.status,
    'sessionName', s.name,
    'amountInr', b.amount_inr,
    'depositInr', b.deposit_inr,
    'depositStatus', b.deposit_status,
    'lastExamDate', b.last_exam_date,
    'createdAt', b.created_at,
    'paymentStatus', p.status,
    'paymentMethod', p.method,
    'paymentNote', case when p.status = 'rejected' then p.rejection_reason end,
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
  left join lateral (
    select pay.status, pay.method, pay.rejection_reason from public.payments pay
    where pay.booking_id = b.id
    order by (pay.status = 'verified') desc, pay.updated_at desc
    limit 1
  ) p on true
  where b.booking_code = upper(p_booking_code)
    and (b.phone = p_contact or lower(b.email) = lower(p_contact));
$$;

-- Refund a held deposit once the CX-3 is back, or after a cancellation before dispatch.
create function public.admin_refund_deposit(p_booking_code text, p_note text default null)
returns public.deposit_status
language plpgsql set search_path = ''
as $$
declare
  v_booking public.bookings;
begin
  if not (select private.is_admin()) then
    raise exception 'not_authorized' using errcode = '42501';
  end if;
  select * into v_booking from public.bookings where booking_code = p_booking_code for update;
  if not found then
    raise exception 'booking_not_found' using errcode = 'P0001';
  end if;
  if v_booking.deposit_status <> 'held' then
    raise exception 'deposit_not_held' using errcode = 'P0001';
  end if;
  if v_booking.status not in ('cx3_received', 'closed', 'cancelled') then
    raise exception 'deposit_refund_too_early' using errcode = 'P0001';
  end if;

  update public.bookings set
    deposit_status = 'refunded',
    deposit_settled_at = now(),
    deposit_note = nullif(trim(p_note), '')
  where id = v_booking.id;

  insert into public.audit_log (actor_id, action, entity, entity_id, details)
  values (auth.uid(), 'deposit.refunded', 'booking', p_booking_code,
    jsonb_build_object('amount_inr', v_booking.deposit_inr, 'note', nullif(trim(p_note), '')));
  return 'refunded';
end;
$$;

-- The CX-3 was lost while out with the customer: the deposit is kept (nothing is
-- refunded), the booking closes, and the unit is released and retired.
create function public.admin_mark_cx3_lost(p_booking_code text, p_note text default null)
returns public.booking_status
language plpgsql set search_path = ''
as $$
declare
  v_booking public.bookings;
  v_unit_id uuid;
begin
  if not (select private.is_admin()) then
    raise exception 'not_authorized' using errcode = '42501';
  end if;
  select * into v_booking from public.bookings where booking_code = p_booking_code for update;
  if not found then
    raise exception 'booking_not_found' using errcode = 'P0001';
  end if;
  if v_booking.status not in ('dispatched', 'in_transit', 'out_for_delivery', 'delivered',
      'return_pickup_scheduled', 'return_in_transit') then
    raise exception 'cx3_not_out' using errcode = 'P0001';
  end if;

  update public.cx3_assignments set released_at = now()
  where booking_id = v_booking.id and released_at is null
  returning unit_id into v_unit_id;

  if v_unit_id is not null then
    update public.cx3_units set
      status = 'retired',
      notes = concat_ws(' ', nullif(trim(notes), ''), 'Lost on booking ' || p_booking_code || '.')
    where id = v_unit_id;
  end if;

  update public.bookings set
    status = 'closed',
    deposit_status = case when deposit_status = 'held' then 'forfeited'::public.deposit_status else deposit_status end,
    deposit_settled_at = case when deposit_status = 'held' then now() else deposit_settled_at end,
    deposit_note = coalesce(nullif(trim(p_note), ''), deposit_note)
  where id = v_booking.id;

  insert into public.audit_log (actor_id, action, entity, entity_id, details)
  values (auth.uid(), 'cx3.lost', 'booking', p_booking_code,
    jsonb_build_object('note', nullif(trim(p_note), ''), 'deposit_inr', v_booking.deposit_inr));
  return 'closed';
end;
$$;

revoke all on function public.admin_refund_deposit(text, text) from public, anon;
revoke all on function public.admin_mark_cx3_lost(text, text) from public, anon;
grant execute on function public.admin_refund_deposit(text, text) to authenticated;
grant execute on function public.admin_mark_cx3_lost(text, text) to authenticated;
