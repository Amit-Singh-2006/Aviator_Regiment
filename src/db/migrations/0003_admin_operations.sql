-- Aviator's Regiment V1: admin operations.
--
-- Multi-step admin actions run as single transactions. They execute with the
-- signed-in admin's own permissions (RLS applies) and refuse non-admins.

alter table public.news_articles add column is_featured boolean not null default false;

-- Verify or reject a booking's UPI payment.
create function public.admin_review_payment(p_booking_code text, p_approve boolean, p_reason text default null)
returns public.booking_status
language plpgsql set search_path = ''
as $$
declare
  v_booking public.bookings;
  v_status public.booking_status;
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
  where booking_id = v_booking.id;

  v_status := case
    when not p_approve then 'payment_pending'::public.booking_status
    when v_booking.status in ('payment_pending', 'payment_review') then 'confirmed'::public.booking_status
    else v_booking.status
  end;
  update public.bookings set status = v_status where id = v_booking.id;

  insert into public.audit_log (actor_id, action, entity, entity_id, details)
  values (auth.uid(), case when p_approve then 'payment.verified' else 'payment.rejected' end, 'booking', p_booking_code,
    jsonb_build_object('reason', nullif(trim(p_reason), '')));
  return v_status;
end;
$$;

-- Assign an available CX-3 unit to a confirmed booking (replacing any current unit).
create function public.admin_assign_unit(p_booking_code text, p_unit_id uuid)
returns public.booking_status
language plpgsql set search_path = ''
as $$
declare
  v_booking public.bookings;
  v_unit public.cx3_units;
  v_status public.booking_status;
begin
  if not (select private.is_admin()) then
    raise exception 'not_authorized' using errcode = '42501';
  end if;
  select * into v_booking from public.bookings where booking_code = p_booking_code for update;
  if not found then
    raise exception 'booking_not_found' using errcode = 'P0001';
  end if;
  if v_booking.status not in ('confirmed', 'cx3_assigned') then
    raise exception 'booking_not_ready' using errcode = 'P0001';
  end if;

  select * into v_unit from public.cx3_units where id = p_unit_id for update;
  if not found or v_unit.status <> 'available' then
    raise exception 'unit_unavailable' using errcode = 'P0001';
  end if;

  update public.cx3_units set status = 'available'
  where id in (select unit_id from public.cx3_assignments where booking_id = v_booking.id and released_at is null);
  update public.cx3_assignments set released_at = now() where booking_id = v_booking.id and released_at is null;

  insert into public.cx3_assignments (booking_id, unit_id, assigned_by) values (v_booking.id, p_unit_id, auth.uid());
  update public.cx3_units set status = 'assigned' where id = p_unit_id;

  v_status := 'cx3_assigned';
  update public.bookings set status = v_status where id = v_booking.id;

  insert into public.audit_log (actor_id, action, entity, entity_id, details)
  values (auth.uid(), 'cx3.assigned', 'booking', p_booking_code, jsonb_build_object('unit_code', v_unit.unit_code));
  return v_status;
end;
$$;

-- Save courier details for delivery (outbound) or return pickup, and move the booking on.
create function public.admin_save_shipment(
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

  insert into public.shipments (booking_id, direction, status, courier, awb_number, tracking_url,
    dispatch_date, pickup_date, expected_delivery_date, received_date)
  values (v_booking.id, p_direction, p_status, nullif(trim(p_courier), ''), nullif(trim(p_awb_number), ''),
    nullif(trim(p_tracking_url), ''), p_dispatch_date, p_pickup_date, p_expected_delivery_date, p_received_date)
  on conflict (booking_id, direction) do update set
    status = excluded.status, courier = excluded.courier, awb_number = excluded.awb_number,
    tracking_url = excluded.tracking_url, dispatch_date = excluded.dispatch_date, pickup_date = excluded.pickup_date,
    expected_delivery_date = excluded.expected_delivery_date, received_date = excluded.received_date;

  v_status := case
    when p_direction = 'outbound' and p_status in ('dispatched', 'in_transit', 'out_for_delivery', 'delivered') then p_status::text::public.booking_status
    when p_direction = 'return' and p_status = 'pickup_scheduled' then 'return_pickup_scheduled'::public.booking_status
    when p_direction = 'return' and p_status = 'in_transit' then 'return_in_transit'::public.booking_status
    when p_direction = 'return' and p_status = 'received' then 'cx3_received'::public.booking_status
    else v_booking.status
  end;
  update public.bookings set status = v_status where id = v_booking.id;

  if p_direction = 'outbound' and p_status <> 'pending' then
    update public.cx3_units set status = 'with_customer'
    where id in (select unit_id from public.cx3_assignments where booking_id = v_booking.id and released_at is null);
  elsif p_direction = 'return' and p_status = 'received' then
    update public.cx3_units set status = 'available'
    where id in (select unit_id from public.cx3_assignments where booking_id = v_booking.id and released_at is null);
    update public.cx3_assignments set released_at = now() where booking_id = v_booking.id and released_at is null;
  end if;

  insert into public.audit_log (actor_id, action, entity, entity_id, details)
  values (auth.uid(), 'shipment.' || p_direction || '.' || p_status, 'booking', p_booking_code,
    jsonb_build_object('courier', p_courier, 'awb_number', p_awb_number));
  return v_status;
end;
$$;

-- Set a booking's status directly (e.g. close or cancel). Closing or cancelling frees its CX-3.
create function public.admin_set_booking_status(p_booking_code text, p_status public.booking_status)
returns public.booking_status
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

  update public.bookings set status = p_status where id = v_booking.id;
  if p_status in ('closed', 'cancelled') then
    update public.cx3_units set status = 'available'
    where id in (select unit_id from public.cx3_assignments where booking_id = v_booking.id and released_at is null);
    update public.cx3_assignments set released_at = now() where booking_id = v_booking.id and released_at is null;
  end if;

  insert into public.audit_log (actor_id, action, entity, entity_id, details)
  values (auth.uid(), 'booking.status_set', 'booking', p_booking_code,
    jsonb_build_object('from', v_booking.status, 'to', p_status));
  return p_status;
end;
$$;

revoke all on function public.admin_review_payment(text, boolean, text) from public, anon;
revoke all on function public.admin_assign_unit(text, uuid) from public, anon;
revoke all on function public.admin_save_shipment(text, public.shipment_direction, public.shipment_status, text, text, text, date, date, date, date) from public, anon;
revoke all on function public.admin_set_booking_status(text, public.booking_status) from public, anon;
grant execute on function public.admin_review_payment(text, boolean, text) to authenticated;
grant execute on function public.admin_assign_unit(text, uuid) to authenticated;
grant execute on function public.admin_save_shipment(text, public.shipment_direction, public.shipment_status, text, text, text, date, date, date, date) to authenticated;
grant execute on function public.admin_set_booking_status(text, public.booking_status) to authenticated;
