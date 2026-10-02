-- Aviator's Regiment V1: security hardening.
--
-- * Rate limits for the public booking, payment and tracking endpoints, counted
--   in Postgres so they hold across serverless instances. Keys are hashed by
--   the app, so no raw IP addresses are stored.
-- * Booking alerts to n8n carry a shared secret header when one is configured in
--   private.app_settings (key booking_events_webhook_secret, set outside the
--   repository), so the webhook URL alone can't trigger emails.
-- * The public key can read only the display columns of published news.

create table private.rate_limits (
  key text not null,
  window_start timestamptz not null,
  hits integer not null default 1,
  primary key (key, window_start)
);
alter table private.rate_limits enable row level security;
revoke all on private.rate_limits from public, anon, authenticated;

-- Counts one request in the current fixed window and says whether it is allowed.
create function public.consume_rate_limit(p_key text, p_limit integer, p_window_seconds integer)
returns boolean
language plpgsql security definer set search_path = ''
as $$
declare
  v_window timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  v_hits integer;
begin
  insert into private.rate_limits as r (key, window_start, hits)
  values (left(p_key, 200), v_window, 1)
  on conflict (key, window_start) do update set hits = r.hits + 1
  returning r.hits into v_hits;

  -- Old windows are cleared now and then.
  if random() < 0.02 then
    delete from private.rate_limits where window_start < now() - interval '2 days';
  end if;
  return v_hits <= p_limit;
end;
$$;
revoke all on function public.consume_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_rate_limit(text, integer, integer) to service_role;

create or replace function private.notify_booking_event() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_url text;
  v_secret text;
begin
  select value into v_url from private.app_settings where key = 'booking_events_webhook_url';
  select value into v_secret from private.app_settings where key = 'booking_events_webhook_secret';
  if coalesce(v_url, '') <> '' then
    perform net.http_post(
      url := v_url,
      body := jsonb_build_object('event', new.action, 'bookingCode', new.entity_id, 'occurredAt', new.created_at),
      headers := jsonb_build_object('Content-Type', 'application/json')
        || case when coalesce(v_secret, '') <> '' then jsonb_build_object('X-AR-Webhook-Secret', v_secret) else '{}'::jsonb end,
      timeout_milliseconds := 5000
    );
  end if;
  return new;
end;
$$;

revoke select on public.news_articles from anon;
grant select (slug, title, summary, body, category, tags, keywords, meta_title, meta_description,
  image_url, image_alt, image_credit, source_name, source_url, published_at, updated_at, is_featured, status)
  on public.news_articles to anon;
