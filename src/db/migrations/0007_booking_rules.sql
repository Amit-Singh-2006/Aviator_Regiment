-- Aviator's Regiment V1: booking workflow rules.
--
-- * Booking statuses can only move in ways that keep CX-3 inventory accurate:
--   a booking can't be cancelled once its CX-3 has left, closing happens after
--   the CX-3 is received back, and delivery statuses need an assigned unit.
-- * Delivery edits stop driving the booking status once the return has started,
--   and the return can only be recorded after delivery.
-- * Customers can upload a payment screenshot from the tracking page using the
--   phone number or email on the booking, and tracking shows why a payment was
--   rejected.

create or replace function public.admin_set_booking_status(p_booking_code text, p_status public.booking_status)
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
  if p_status = v_booking.status then
    return p_status;
  end if;

  select a.unit_id into v_unit_id from public.cx3_assignments a where a.booking_id = v_booking.id and a.released_at is null;

  if p_status = 'cancelled' and v_booking.status not in ('payment_pending', 'payment_review', 'confirmed', 'cx3_assigned') then
    raise exception 'cannot_cancel_after_dispatch' using errcode = 'P0001';
  end if;
  if p_status = 'closed' and v_booking.status <> 'cx3_received' then
    raise exception 'cannot_close_yet' using errcode = 'P0001';
  end if;
  if p_status in ('cx3_assigned', 'dispatched', 'in_transit', 'out_for_delivery', 'delivered', 'return_pickup_scheduled', 'return_in_transit')
    and v_unit_id is null then
    raise exception 'assign_unit_first' using errcode = 'P0001';
  end if;

  -- Keep the CX-3 unit in step with where the booking now is.
  if p_status in ('payment_pending', 'payment_review', 'confirmed', 'cx3_received', 'closed', 'cancelled') then
    if v_unit_id is not null then
      update public.cx3_units set status = 'available' where id = v_unit_id;
      update public.cx3_assignments set released_at = now() where booking_id = v_booking.id and released_at is null;
    end if;
  elsif p_status = 'cx3_assigned' then
    update public.cx3_units set status = 'assigned' where id = v_unit_id;
  else
    update public.cx3_units set status = 'with_customer' where id = v_unit_id;
  end if;

  update public.bookings set status = p_status where id = v_booking.id;

  insert into public.audit_log (actor_id, action, entity, entity_id, details)
  values (auth.uid(), 'booking.status_set', 'booking', p_booking_code,
    jsonb_build_object('from', v_booking.status, 'to', p_status));
  return p_status;
end;
$$;

create or replace function public.admin_save_shipment(
  p_booking_code text,
  p_direction public.shipment_direction,
  p_status public.shipment_status,
  p_courier text,
  p_awb_number text,
  p_tracking_url text,
  p_dispatch_date date,
  p_pickup_date date,
  p_expected_delivery_date date,
  p_received_date date
) returns public.booking_status
language plpgsql set search_path = ''
as $$
declare
  v_booking public.bookings;
  v_status public.booking_status;
  v_unit_id uuid;
  v_outbound_phase boolean;
begin
  if not (select private.is_admin()) then
    raise exception 'not_authorized' using errcode = '42501';
  end if;
  if (p_direction = 'outbound' and p_status not in ('pending', 'dispatched', 'in_transit', 'out_for_delivery', 'delivered'))
    or (p_direction = 'return' and p_status not in ('pending', 'pickup_scheduled', 'in_transit', 'received')) then
    raise exception 'invalid_shipment_status' using errcode = 'P0001';
  end if;
  select * into v_booking from public.bookings where booking_code = p_booking_code for update;
  if not found then
    raise exception 'booking_not_found' using errcode = 'P0001';
  end if;
  if v_booking.status in ('closed', 'cancelled') then
    raise exception 'booking_closed' using errcode = 'P0001';
  end if;

  select a.unit_id into v_unit_id from public.cx3_assignments a where a.booking_id = v_booking.id and a.released_at is null;
  v_outbound_phase := v_booking.status in ('cx3_assigned', 'dispatched', 'in_transit', 'out_for_delivery', 'delivered');

  if p_direction = 'outbound' then
    if v_booking.status in ('payment_pending', 'payment_review', 'confirmed') or (v_outbound_phase and v_unit_id is null) then
      raise exception 'assign_unit_first' using errcode = 'P0001';
    end if;
    -- Once the return has started, delivery details can be corrected but the delivery stays delivered.
    if not v_outbound_phase and p_status <> 'delivered' then
      raise exception 'return_in_progress' using errcode = 'P0001';
    end if;
  else
    if v_booking.status not in ('delivered', 'return_pickup_scheduled', 'return_in_transit', 'cx3_received') then
      raise exception 'not_delivered_yet' using errcode = 'P0001';
    end if;
    if v_booking.status = 'cx3_received' and p_status <> 'received' then
      raise exception 'return_already_received' using errcode = 'P0001';
    end if;
  end if;

  insert into public.shipments (booking_id, direction, status, courier, awb_number, tracking_url,
    dispatch_date, pickup_date, expected_delivery_date, received_date)
  values (v_booking.id, p_direction, p_status, nullif(trim(p_courier), ''), nullif(trim(p_awb_number), ''),
    nullif(trim(p_tracking_url), ''), p_dispatch_date, p_pickup_date, p_expected_delivery_date, p_received_date)
  on conflict (booking_id, direction) do update set
    status = excluded.status, courier = excluded.courier, awb_number = excluded.awb_number,
    tracking_url = excluded.tracking_url, dispatch_date = excluded.dispatch_date, pickup_date = excluded.pickup_date,
    expected_delivery_date = excluded.expected_delivery_date, received_date = excluded.received_date;

  v_status := case
    when p_direction = 'outbound' and v_outbound_phase and p_status = 'pending' then 'cx3_assigned'::public.booking_status
    when p_direction = 'outbound' and v_outbound_phase then p_status::text::public.booking_status
    when p_direction = 'outbound' then v_booking.status
    when p_status = 'pending' then 'delivered'::public.booking_status
    when p_status = 'pickup_scheduled' then 'return_pickup_scheduled'::public.booking_status
    when p_status = 'in_transit' then 'return_in_transit'::public.booking_status
    else 'cx3_received'::public.booking_status
  end;
  update public.bookings set status = v_status where id = v_booking.id;

  if p_direction = 'outbound' and v_outbound_phase then
    update public.cx3_units
    set status = case when p_status = 'pending' then 'assigned'::public.cx3_unit_status else 'with_customer'::public.cx3_unit_status end
    where id = v_unit_id;
  elsif p_direction = 'return' and p_status = 'received' and v_unit_id is not null then
    update public.cx3_units set status = 'available' where id = v_unit_id;
    update public.cx3_assignments set released_at = now() where booking_id = v_booking.id and released_at is null;
  end if;

  insert into public.audit_log (actor_id, action, entity, entity_id, details)
  values (auth.uid(), 'shipment.' || p_direction || '.' || p_status, 'booking', p_booking_code,
    jsonb_build_object('courier', p_courier, 'awb_number', p_awb_number));
  return v_status;
end;
$$;

-- Payment screenshots can now be matched by the booking's phone number or email.
-- The parameter keeps its original name (p_phone) but accepts either.
create or replace function public.submit_payment_proof(p_booking_code text, p_phone text, p_screenshot_path text)
returns public.booking_status
language plpgsql set search_path = ''
as $$
declare
  v_booking public.bookings;
begin
  select * into v_booking from public.bookings b
  where b.booking_code = p_booking_code and (b.phone = p_phone or lower(b.email) = lower(p_phone))
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

-- Customer-safe tracking view, now including the reason a payment was rejected.
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
    select pay.status, pay.rejection_reason from public.payments pay
    where pay.booking_id = b.id order by pay.created_at desc limit 1
  ) p on true
  where b.booking_code = upper(p_booking_code)
    and (b.phone = p_contact or lower(b.email) = lower(p_contact));
$$;
