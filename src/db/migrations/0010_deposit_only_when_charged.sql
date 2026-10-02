-- Aviator's Regiment V1: bookings made before the security deposit existed have
-- deposit_inr = 0. Verifying their payment must not mark a ₹0 deposit as held (and
-- so put them in the "Refund deposit" queue).

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
      when p_approve and deposit_status = 'unpaid' and deposit_inr > 0 then 'held'::public.deposit_status
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
    deposit_status = case when deposit_status = 'unpaid' and deposit_inr > 0 then 'held'::public.deposit_status else deposit_status end
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
