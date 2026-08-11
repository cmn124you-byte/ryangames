-- ============================================================
-- Ryan Games / ريان ألعاب — Supabase schema (Single Source of Truth)
-- Run this in the Supabase SQL editor (or via `supabase db push`).
-- Public clients use the anon key + RLS: they can only READ published
-- content. ALL writes go through server-side functions using the
-- service_role key (never exposed to frontend).
-- ============================================================

create extension if not exists "pgcrypto";

-- ---------- Categories (genres / platforms) ----------
create table if not exists public.categories (
  id          uuid primary key default gen_random_uuid(),
  kind        text not null default 'genre',          -- genre | platform
  name_ar     text not null,
  name_en     text default '',
  slug        text unique not null,
  created_at  timestamptz not null default now()
);

-- ---------- Games ----------
create table if not exists public.games (
  id                    uuid primary key default gen_random_uuid(),
  slug                  text unique not null,          -- e.g. "the-supper" / "beyond-two-souls"
  title_ar              text not null,
  title_en              text not null,
  description           text default '',
  cover_url             text default '',
  status                text not null default 'published',  -- published | draft | archived
  platform              jsonb not null default '[]',
  genre                 jsonb not null default '[]',
  size                  text default '',
  downloads             integer not null default 0,
  release_date          text default '',
  buy_url               text default '',
  free                  boolean not null default false,
  is_app                boolean not null default false,
  translation_status    text not null default 'active',     -- active | inactive | waiting
  translation_version   text default '',
  translation_date      text default '',
  install_time          text default '',
  compat                text default '',
  min_requirements      text default '',
  rec_requirements      text default '',
  installation_guide    text default '',
  notes                 text default '',
  video_url             text default '',
  download_url          text default '',
  download_url_alt      text default '',
  download_pass_hash    text default '',
  browser_title         text default '',
  featured              boolean not null default false,
  legacy_id             integer,                            -- old numeric id from data.js
  meta                  jsonb not null default '{}',        -- keep any extra old fields
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- ---------- Translations ----------
create table if not exists public.translations (
  id                  uuid primary key default gen_random_uuid(),
  game_id             uuid not null references public.games(id) on delete cascade,
  version             text not null default '1.0',
  status              text not null default 'published',
  download_url        text default '',
  installation_guide  text default '',
  changelog           text default '',
  translation_date    text default '',
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- ---------- Game images (cover / screenshots) ----------
create table if not exists public.game_images (
  id          uuid primary key default gen_random_uuid(),
  game_id     uuid not null references public.games(id) on delete cascade,
  url         text not null,
  kind        text not null default 'screenshot',    -- cover | screenshot | banner
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);

-- ---------- News ----------
create table if not exists public.news (
  id          uuid primary key default gen_random_uuid(),
  slug        text unique not null,
  title       text not null,
  content     text default '',
  image       text default '',
  status      text not null default 'published',
  date        text default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ---------- Updates (آخر التحديثات feed) ----------
create table if not exists public.updates (
  id          uuid primary key default gen_random_uuid(),
  game_id     uuid references public.games(id) on delete set null,
  title       text not null,
  body        text default '',
  link        text default '',
  status      text not null default 'published',
  date        text default '',
  created_at  timestamptz not null default now()
);

-- ---------- Lessons (دروس التثبيت) ----------
create table if not exists public.lessons (
  id          uuid primary key default gen_random_uuid(),
  icon        text default '',
  title       text not null,
  desc        text default '',
  link        text default '',
  sort_order  integer not null default 0,
  status      text not null default 'published',
  created_at  timestamptz not null default now()
);

-- ---------- Translation requests (طلبات التعريب) ----------
create table if not exists public.translation_requests (
  id          uuid primary key default gen_random_uuid(),
  game        text not null,
  requester   text default '',
  message     text default '',
  status      text not null default 'new',    -- new | in_progress | done | rejected
  date        text default '',
  created_at  timestamptz not null default now()
);

-- ---------- Site settings (single row, no secrets) ----------
create table if not exists public.settings (
  id             int primary key default 1,
  site_name      text default 'ريان ألعاب',
  site_mark      text default 'ر',
  tagline        text default 'تعريبات الألعاب العربية',
  about          text default '',
  support_note   text default '',
  contact_email  text default '',
  owner_email    text default '',
  socials        jsonb not null default '{}',
  ads            jsonb not null default '{}',
  slides         jsonb not null default '[]',
  updated_at     timestamptz not null default now()
);

-- ---------- updated_at triggers ----------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end; $$;

drop trigger if exists trg_games_updated on public.games;
create trigger trg_games_updated before update on public.games
  for each row execute function public.set_updated_at();
drop trigger if exists trg_translations_updated on public.translations;
create trigger trg_translations_updated before update on public.translations
  for each row execute function public.set_updated_at();
drop trigger if exists trg_news_updated on public.news;
create trigger trg_news_updated before update on public.news
  for each row execute function public.set_updated_at();
drop trigger if exists trg_settings_updated on public.settings;
create trigger trg_settings_updated before update on public.settings
  for each row execute function public.set_updated_at();

-- ---------- Indexes ----------
create index if not exists idx_games_slug        on public.games(slug);
create index if not exists idx_games_status      on public.games(status);
create index if not exists idx_games_updated     on public.games(updated_at desc);
create index if not exists idx_games_legacy_id   on public.games(legacy_id);
create index if not exists idx_translations_game on public.translations(game_id);
create index if not exists idx_game_images_game  on public.game_images(game_id);
create index if not exists idx_news_slug         on public.news(slug);
create index if not exists idx_updates_game      on public.updates(game_id);

-- ---------- Grants (public read via anon) ----------
grant usage on schema public to anon, authenticated;
grant select on public.games, public.translations, public.game_images,
  public.news, public.updates, public.lessons, public.categories, public.settings
  to anon, authenticated;
grant insert on public.translation_requests to anon, authenticated;

-- ---------- Row Level Security ----------
alter table public.categories            enable row level security;
alter table public.games                 enable row level security;
alter table public.translations          enable row level security;
alter table public.game_images           enable row level security;
alter table public.news                  enable row level security;
alter table public.updates               enable row level security;
alter table public.lessons               enable row level security;
alter table public.translation_requests  enable row level security;
alter table public.settings              enable row level security;

-- Public: read published content only. Writes via service_role bypass RLS.
drop policy if exists public_read_games         on public.games;
drop policy if exists public_read_translations  on public.translations;
drop policy if exists public_read_game_images   on public.game_images;
drop policy if exists public_read_news          on public.news;
drop policy if exists public_read_updates       on public.updates;
drop policy if exists public_read_lessons       on public.lessons;
drop policy if exists public_read_categories    on public.categories;
drop policy if exists public_read_settings      on public.settings;
drop policy if exists public_insert_requests    on public.translation_requests;

create policy public_read_games         on public.games        for select using (status = 'published');
create policy public_read_translations  on public.translations for select using (status = 'published');
create policy public_read_game_images   on public.game_images  for select using (true);
create policy public_read_news          on public.news         for select using (status = 'published');
create policy public_read_updates       on public.updates      for select using (status = 'published');
create policy public_read_lessons       on public.lessons      for select using (status = 'published');
create policy public_read_categories    on public.categories   for select using (true);
create policy public_read_settings      on public.settings     for select using (true);
create policy public_insert_requests    on public.translation_requests for insert with check (true);

-- Admin/service_role (server-side only) can do anything; no extra policy needed.
