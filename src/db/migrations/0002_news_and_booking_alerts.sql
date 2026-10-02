-- Aviator's Regiment V1: aviation news pipeline and booking alerts.
--
-- News: n8n reads active news_sources, registers new items (ingest_news_item),
-- drafts them with AI (save_news_draft) and admins review and publish them.
-- Alerts: new bookings and payment screenshots notify an n8n webhook via pg_net.

create extension if not exists pg_trgm with schema extensions;
create extension if not exists pg_net;

-- News ----------------------------------------------------------------------------

create type public.news_status as enum ('detected', 'draft', 'review', 'approved', 'published', 'rejected');
create type public.news_category as enum (
  'dgca_updates',
  'dgca_exam_updates',
  'aviation_industry',
  'pilot_news',
  'regulations',
  'aviation_training',
  'defence_aviation',
  'interesting_stories'
);

create table public.news_sources (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 80),
  url text not null unique check (url ~ '^https?://'),
  default_category public.news_category not null default 'aviation_industry',
  active boolean not null default true,
  last_checked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.news_articles (
  id uuid primary key default gen_random_uuid(),
  source_id uuid references public.news_sources (id) on delete set null,
  source_name text not null,
  source_url text not null unique,
  source_title text not null,
  source_summary text,
  source_published_at timestamptz,
  status public.news_status not null default 'detected',
  title text,
  slug text unique check (slug is null or slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  summary text,
  body text,
  category public.news_category not null default 'aviation_industry',
  tags text[] not null default '{}',
  keywords text[] not null default '{}',
  meta_title text,
  meta_description text,
  image_url text check (image_url is null or image_url ~ '^https?://'),
  image_alt text,
  image_credit text,
  possible_duplicate_of uuid references public.news_articles (id) on delete set null,
  ai_model text,
  reviewed_by uuid references auth.users (id),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index news_articles_status_idx on public.news_articles (status);
create index news_articles_published_at_idx on public.news_articles (published_at desc) where status = 'published';
create index news_articles_category_idx on public.news_articles (category);
create index news_articles_source_id_idx on public.news_articles (source_id);
create index news_articles_duplicate_idx on public.news_articles (possible_duplicate_of);
create index news_articles_reviewed_by_idx on public.news_articles (reviewed_by);
create index news_articles_source_title_trgm_idx on public.news_articles using gin (source_title extensions.gin_trgm_ops);

create trigger news_sources_updated_at before update on public.news_sources for each row execute function private.set_updated_at();
create trigger news_articles_updated_at before update on public.news_articles for each row execute function private.set_updated_at();

alter table public.news_sources enable row level security;
alter table public.news_articles enable row level security;

grant select on public.news_articles to anon, authenticated;
grant select, insert, update, delete on public.news_sources, public.news_articles to authenticated;
grant all on public.news_sources, public.news_articles to service_role;

create policy "Admins manage news sources" on public.news_sources
  for all to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "Published news is public" on public.news_articles
  for select to anon, authenticated using (status = 'published' or (select private.is_admin()));
create policy "Admins insert news" on public.news_articles
  for insert to authenticated with check ((select private.is_admin()));
create policy "Admins update news" on public.news_articles
  for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "Admins delete news" on public.news_articles
  for delete to authenticated using ((select private.is_admin()));

-- Registers a feed item once (by URL) and flags likely duplicates of recent stories.
create function public.ingest_news_item(
  p_source_id uuid,
  p_source_name text,
  p_source_url text,
  p_source_title text,
  p_source_summary text,
  p_source_published_at timestamptz,
  p_category public.news_category
) returns jsonb
language plpgsql set search_path = ''
as $$
declare
  v_existing public.news_articles;
  v_duplicate uuid;
  v_id uuid;
begin
  select * into v_existing from public.news_articles where source_url = p_source_url;
  if found then
    return jsonb_build_object('article_id', v_existing.id, 'is_new', false, 'duplicate_of', v_existing.possible_duplicate_of);
  end if;

  select a.id into v_duplicate
  from public.news_articles a
  where a.created_at > now() - interval '14 days'
    and extensions.similarity(a.source_title, p_source_title) > 0.55
  order by extensions.similarity(a.source_title, p_source_title) desc
  limit 1;

  insert into public.news_articles (source_id, source_name, source_url, source_title, source_summary,
    source_published_at, category, possible_duplicate_of)
  values (p_source_id, p_source_name, p_source_url, left(p_source_title, 500), left(p_source_summary, 8000),
    p_source_published_at, p_category, v_duplicate)
  returning id into v_id;

  return jsonb_build_object('article_id', v_id, 'is_new', true, 'duplicate_of', v_duplicate);
exception when unique_violation then
  select * into v_existing from public.news_articles where source_url = p_source_url;
  return jsonb_build_object('article_id', v_existing.id, 'is_new', false, 'duplicate_of', v_existing.possible_duplicate_of);
end;
$$;

-- Stores the AI draft for a detected article (status: detected -> draft, or rejected
-- when the AI judged it off-topic). Slugs are normalised and made unique.
create function public.save_news_draft(
  p_article_id uuid,
  p_relevant boolean,
  p_title text,
  p_summary text,
  p_body text,
  p_category text,
  p_tags text[],
  p_keywords text[],
  p_meta_title text,
  p_meta_description text,
  p_slug text,
  p_ai_model text
) returns jsonb
language plpgsql set search_path = ''
as $$
declare
  v_base text;
  v_slug text;
  v_suffix integer := 1;
  v_category public.news_category;
begin
  v_base := trim(both '-' from regexp_replace(lower(coalesce(nullif(p_slug, ''), p_title, 'aviation-news')), '[^a-z0-9]+', '-', 'g'));
  v_base := trim(both '-' from left(coalesce(nullif(v_base, ''), 'aviation-news'), 80));
  v_slug := v_base;
  while exists (select 1 from public.news_articles where slug = v_slug and id <> p_article_id) loop
    v_suffix := v_suffix + 1;
    v_slug := v_base || '-' || v_suffix;
  end loop;

  begin
    v_category := p_category::public.news_category;
  exception when invalid_text_representation then
    v_category := null;
  end;

  update public.news_articles set
    status = case when p_relevant then 'draft'::public.news_status else 'rejected'::public.news_status end,
    title = left(p_title, 140),
    slug = v_slug,
    summary = p_summary,
    body = p_body,
    category = coalesce(v_category, category),
    tags = coalesce(p_tags[1:8], '{}'),
    keywords = coalesce(p_keywords[1:10], '{}'),
    meta_title = left(p_meta_title, 70),
    meta_description = left(p_meta_description, 170),
    ai_model = p_ai_model
  where id = p_article_id and status = 'detected';

  return jsonb_build_object('article_id', p_article_id, 'slug', v_slug, 'saved', found);
end;
$$;

revoke all on function public.ingest_news_item(uuid, text, text, text, text, timestamptz, public.news_category) from public, anon, authenticated;
revoke all on function public.save_news_draft(uuid, boolean, text, text, text, text, text[], text[], text, text, text, text) from public, anon, authenticated;
grant execute on function public.ingest_news_item(uuid, text, text, text, text, timestamptz, public.news_category) to service_role;
grant execute on function public.save_news_draft(uuid, boolean, text, text, text, text, text[], text[], text, text, text, text) to service_role;

-- Starting sources (admins can add, edit or pause them).
insert into public.news_sources (name, url, default_category) values
  ('Google News: DGCA', 'https://news.google.com/rss/search?q=DGCA&hl=en-IN&gl=IN&ceid=IN:en', 'dgca_updates'),
  ('Google News: DGCA exams & pilot training', 'https://news.google.com/rss/search?q=DGCA+exam+OR+%22pilot+training%22+India&hl=en-IN&gl=IN&ceid=IN:en', 'dgca_exam_updates'),
  ('Aviation A2Z', 'https://aviationa2z.com/index.php/feed/', 'aviation_industry'),
  ('Live From A Lounge', 'https://www.livefromalounge.com/feed/', 'aviation_industry'),
  ('The Aviationist', 'https://theaviationist.com/feed/', 'defence_aviation'),
  ('Simple Flying', 'https://simpleflying.com/feed/', 'interesting_stories');

-- Booking alerts -------------------------------------------------------------------------

create table private.app_settings (
  key text primary key,
  value text not null
);
alter table private.app_settings enable row level security;
revoke all on private.app_settings from public, anon, authenticated;

insert into private.app_settings (key, value) values
  ('booking_events_webhook_url', 'https://aviatorsregiment.app.n8n.cloud/webhook/ar-booking-events-be1c87cac1a344ab96ac');

-- Sends booking events to n8n after the transaction commits (pg_net is asynchronous).
create function private.notify_booking_event() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_url text;
begin
  select value into v_url from private.app_settings where key = 'booking_events_webhook_url';
  if coalesce(v_url, '') <> '' then
    perform net.http_post(
      url := v_url,
      body := jsonb_build_object('event', new.action, 'bookingCode', new.entity_id, 'occurredAt', new.created_at),
      headers := jsonb_build_object('Content-Type', 'application/json'),
      timeout_milliseconds := 5000
    );
  end if;
  return new;
end;
$$;
revoke all on function private.notify_booking_event() from public, anon, authenticated;

create trigger audit_log_booking_events
  after insert on public.audit_log
  for each row
  when (new.action in ('booking.created', 'payment.proof_submitted'))
  execute function private.notify_booking_event();
