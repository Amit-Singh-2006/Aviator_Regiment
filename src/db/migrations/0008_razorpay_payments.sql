-- Aviator's Regiment V1: Razorpay online payments.
--
-- * Customers can pay online through Razorpay Checkout as well as by UPI QR. Each
--   Razorpay order gets its own payment row (method 'razorpay') holding the order ID,
--   the amount charged and the gateway fee added on top of the rental.
-- * Only the server marks a Razorpay payment verified, after checking Razorpay's
--   signature (checkout callback or webhook). Confirming twice is harmless.
-- * Admin UPI reviews only touch UPI payments, and rejecting a UPI screenshot no longer
--   reopens a booking that was already paid online.
-- * Tracking shows a verified payment first, otherwise the most recently updated one.
-- * Admins get an email alert when a booking is paid online.

-- The amount, status and latest open Razorpay order of a booking, for the customer
-- whose phone number or email matches. Null when nothing matches.
create function public.razorpay_checkout_state(p_booking_code text, p_contact text)
returns jsonb
language sql stable set search_path = ''
as $$
  select jsonb_build_object(
    'status', b.status,
    'amountInr', b.amount_inr,
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

-- Stores a Razorpay order created by the server for an unpaid booking.
create function public.record_razorpay_order(p_booking_code text, p_order_id text, p_amount_inr integer, p_fee_inr integer)
returns void
language plpgsql set search_path = ''
as $$
declare
  v_booking public.bookings;
begin
  select * into v_booking from public.bookings where booking_code = p_booking_code;
  if not found then
    raise exception 'booking_not_found' using errcode = 'P0001';
  end if;
  if v_booking.status <> 'payment_pending' then
    raise exception 'payment_already_processed' using errcode = 'P0001';
  end if;

  insert into public.payments (booking_id, method, status, amount_inr, gateway_fee_inr, razorpay_order_id)
  values (v_booking.id, 'razorpay', 'awaiting_payment', p_amount_inr, p_fee_inr, p_order_id);
end;
$$;

-- Marks a Razorpay payment verified and confirms the booking. The caller must have
-- checked Razorpay's signature. Returns the booking code and status, or null when the
-- order isn't ours.
create function public.confirm_razorpay_payment(p_order_id text, p_payment_id text, p_source text)
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
  update public.bookings set status = v_status where id = v_booking.id;

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

revoke all on function public.razorpay_checkout_state(text, text) from public, anon, authenticated;
revoke all on function public.record_razorpay_order(text, text, integer, integer) from public, anon, authenticated;
revoke all on function public.confirm_razorpay_payment(text, text, text) from public, anon, authenticated;
grant execute on function public.razorpay_checkout_state(text, text) to service_role;
grant execute on function public.record_razorpay_order(text, text, integer, integer) to service_role;
grant execute on function public.confirm_razorpay_payment(text, text, text) to service_role;

-- Verify or reject a booking's UPI payment. Razorpay payments are verified by the
-- server only, and rejecting a UPI screenshot keeps a booking already paid online.
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
  update public.bookings set status = v_status where id = v_booking.id;

  insert into public.audit_log (actor_id, action, entity, entity_id, details)
  values (auth.uid(), case when p_approve then 'payment.verified' else 'payment.rejected' end, 'booking', p_booking_code,
    jsonb_build_object('reason', nullif(trim(p_reason), '')));
  return v_status;
end;
$$;

-- Customer-safe tracking view. The payment shown is a verified one if any, otherwise
-- the most recently updated (the UPI screenshot or Razorpay attempt the customer used last).
create or replace function public.track_booking(p_booking_code text, p_contact text)
returns jsonb
language sql stable set search_path = ''
as $$
  select jsonb_build_object(
    'bookingCode', b.booking_code,
    'status', b.status,
    'sessionName', s.name,
    'amountInr', b.amount_inr,
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

-- Booking alerts now also cover bookings paid online.
create or replace trigger audit_log_booking_events
  after insert on public.audit_log
  for each row
  when (new.action in ('booking.created', 'payment.proof_submitted', 'payment.razorpay_paid'))
  execute function private.notify_booking_event();
