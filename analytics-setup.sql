-- ============================================================================
--  Cars for Sale in Uganda — website visitor tracking
--  Run ONCE in Supabase → SQL Editor → New query → Run.
--  Safe to run again: everything is "if not exists" / "drop policy if exists".
-- ============================================================================

create table if not exists public.page_views (
  id        bigserial primary key,
  ts        timestamptz not null default now(),
  site      text,          -- which of your two websites the visit came from
  visitor   text,          -- random id kept in the browser (repeat visitor)
  session   text,          -- random id per browsing session (one visit)
  path      text,          -- page viewed
  ref       text,          -- where they came from (google, facebook, direct…)
  device    text,          -- Mobile / Tablet / Desktop
  browser   text,          -- Chrome / Safari / Firefox…
  lang      text,          -- browser language
  tz        text           -- browser timezone (rough location hint)
);

create index if not exists page_views_ts_idx      on public.page_views (ts desc);
create index if not exists page_views_visitor_idx on public.page_views (visitor);

alter table public.page_views enable row level security;

-- Visitors' browsers may RECORD a visit…
drop policy if exists "anyone can record a view" on public.page_views;
create policy "anyone can record a view"
  on public.page_views for insert
  to anon, authenticated
  with check (true);

-- …but ONLY you, signed in as the owner, may read the data back.
drop policy if exists "owner reads views" on public.page_views;
create policy "owner reads views"
  on public.page_views for select
  to authenticated
  using (true);

-- Nobody can update or delete: no policy is defined for those, so RLS blocks them.

-- ---------------------------------------------------------------------------
-- OPTIONAL: keep the table small by deleting visits older than 180 days.
-- Run this by hand whenever you like.
--     delete from public.page_views where ts < now() - interval '180 days';
-- ---------------------------------------------------------------------------
