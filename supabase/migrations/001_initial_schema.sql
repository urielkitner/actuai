-- ============================================================
-- ActuAi — Initial Schema Migration
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- ------------------------------------------------------------
-- Extensions
-- ------------------------------------------------------------
create extension if not exists "pgcrypto";   -- gen_random_uuid()
create extension if not exists "pg_trgm";    -- fast ILIKE search on names


-- ============================================================
-- 1. PROFILES
--    One row per auth user. Auto-created on sign-up via trigger.
-- ============================================================
create table if not exists public.profiles (
  id               uuid primary key references auth.users(id) on delete cascade,
  full_name        text        not null default '',
  user_type        text        not null default 'independent'
                               check (user_type in ('independent', 'office')),
  is_ilaa_member   boolean     not null default false,
  ilaa_id_number   text,                         -- only set when is_ilaa_member = true
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- Automatically stamp updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();

-- Auto-create a profile row when a new user signs up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, user_type, is_ilaa_member, ilaa_id_number)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'user_type', 'independent'),
    coalesce((new.raw_user_meta_data->>'ilaa_member')::boolean, false),
    new.raw_user_meta_data->>'id_number'
  );
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- ============================================================
-- 2. CASES
--    A divorce case managed by one actuary (actuary_id).
-- ============================================================

-- Auto-incrementing case number: AC-YYYY-NNNN
create sequence if not exists public.case_number_seq;

create table if not exists public.cases (
  id                   uuid        primary key default gen_random_uuid(),
  case_number          text        not null unique
                                   default 'AC-' || to_char(now(), 'YYYY') || '-'
                                             || lpad(nextval('public.case_number_seq')::text, 4, '0'),

  -- Actuary who owns this case
  actuary_id           uuid        not null references auth.users(id) on delete cascade,

  -- Party A
  party_a_name         text        not null,
  party_a_id_number    text        not null,
  party_a_birth_date   date        not null,

  -- Party B
  party_b_name         text        not null,
  party_b_id_number    text        not null,
  party_b_birth_date   date        not null,

  -- Key dates
  marriage_date        date        not null,
  separation_date      date        not null,

  -- Lifecycle
  status               text        not null default 'open'
                                   check (status in ('open', 'pending', 'closed')),

  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create trigger cases_updated_at
  before update on public.cases
  for each row execute procedure public.set_updated_at();

-- Index for dashboard listing (most-recent first, per actuary)
create index if not exists cases_actuary_created
  on public.cases (actuary_id, created_at desc);


-- ============================================================
-- 3. ASSETS
--    One table for all 6 categories. Category-specific fields
--    that don't fit the common columns are stored in `metadata`
--    (JSONB) so the schema stays clean and extensible.
--
--    Category values:
--      real_estate | pension | business | financial | vehicle | debt
-- ============================================================
create table if not exists public.assets (
  id                      uuid        primary key default gen_random_uuid(),
  case_id                 uuid        not null references public.cases(id) on delete cascade,

  -- Which of the 6 tabs this row belongs to
  category                text        not null
                                      check (category in (
                                        'real_estate', 'pension', 'business',
                                        'financial', 'vehicle', 'debt'
                                      )),

  -- Common fields shared across all categories
  name                    text        not null default '',
  value_a                 numeric(15,2) not null default 0,   -- value attributed to Party A
  value_b                 numeric(15,2) not null default 0,   -- value attributed to Party B
  is_balanceable          boolean     not null default true,  -- בר-איזון vs מוחרג
  equalization_percentage numeric(5,2) not null default 50    -- % of gap to equalize
                                      check (equalization_percentage between 0 and 100),

  -- Used by: real_estate, pension, business (nullable for others)
  asset_type              text,   -- e.g. residential/investment/pension/gemel/…
  status                  text,   -- e.g. "רשום על שם צד א", free-text

  -- Real-estate specific
  appraisal_date          date,
  has_mortgage            boolean     not null default false,
  mortgage_balance        numeric(15,2) not null default 0,

  -- Pension / business: which party holds this asset
  party                   text        check (party in ('A', 'B')),

  -- Pension: portion of balance attributed to the marriage period
  marriage_period_share   numeric(5,2)                        -- percentage 0-100
                                      check (marriage_period_share between 0 and 100),

  -- Business: ownership stake held by the party
  ownership_percentage    numeric(5,2)
                                      check (ownership_percentage between 0 and 100),
  is_appraised            boolean     not null default false,
  founded_date            date,

  -- Catch-all for any future or category-specific fields
  metadata                jsonb       not null default '{}'::jsonb,

  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

create trigger assets_updated_at
  before update on public.assets
  for each row execute procedure public.set_updated_at();

-- Index for fetching all assets of a case grouped by category
create index if not exists assets_case_category
  on public.assets (case_id, category);


-- ============================================================
-- 4. ROW LEVEL SECURITY (RLS)
--    Every user can only see and modify their own data.
-- ============================================================

-- ── profiles ──────────────────────────────────────────────────
alter table public.profiles enable row level security;

create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- (Insert is handled by the trigger; no direct insert policy needed)


-- ── cases ─────────────────────────────────────────────────────
alter table public.cases enable row level security;

create policy "Actuaries can view their own cases"
  on public.cases for select
  using (auth.uid() = actuary_id);

create policy "Actuaries can insert their own cases"
  on public.cases for insert
  with check (auth.uid() = actuary_id);

create policy "Actuaries can update their own cases"
  on public.cases for update
  using (auth.uid() = actuary_id)
  with check (auth.uid() = actuary_id);

create policy "Actuaries can delete their own cases"
  on public.cases for delete
  using (auth.uid() = actuary_id);


-- ── assets ────────────────────────────────────────────────────
alter table public.assets enable row level security;

-- Assets are accessible only through cases the user owns
create policy "Users can view assets of their cases"
  on public.assets for select
  using (
    exists (
      select 1 from public.cases c
      where c.id = assets.case_id
        and c.actuary_id = auth.uid()
    )
  );

create policy "Users can insert assets into their cases"
  on public.assets for insert
  with check (
    exists (
      select 1 from public.cases c
      where c.id = assets.case_id
        and c.actuary_id = auth.uid()
    )
  );

create policy "Users can update assets of their cases"
  on public.assets for update
  using (
    exists (
      select 1 from public.cases c
      where c.id = assets.case_id
        and c.actuary_id = auth.uid()
    )
  );

create policy "Users can delete assets of their cases"
  on public.assets for delete
  using (
    exists (
      select 1 from public.cases c
      where c.id = assets.case_id
        and c.actuary_id = auth.uid()
    )
  );


-- ============================================================
-- 5. HELPER VIEW  (optional but useful for the dashboard)
--    Returns case rows enriched with per-category asset counts
--    and total values — no extra queries needed for the dashboard.
-- ============================================================
create or replace view public.cases_summary as
select
  c.*,
  coalesce(a.total_value_a, 0) as total_value_a,
  coalesce(a.total_value_b, 0) as total_value_b,
  coalesce(a.asset_count,   0) as asset_count
from public.cases c
left join (
  select
    case_id,
    sum(value_a)  as total_value_a,
    sum(value_b)  as total_value_b,
    count(*)      as asset_count
  from public.assets
  where is_balanceable = true
  group by case_id
) a on a.case_id = c.id;


-- ============================================================
-- Done! Verify with:
--   select table_name from information_schema.tables
--   where table_schema = 'public';
-- ============================================================
