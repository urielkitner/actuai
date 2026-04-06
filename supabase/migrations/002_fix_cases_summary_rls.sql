-- ============================================================
-- Fix: cases_summary view must respect RLS.
--
-- By default, PostgreSQL views run as the view owner (postgres),
-- bypassing RLS on the underlying tables. This means any
-- authenticated user could read all cases from all actuaries.
--
-- The fix: recreate the view with security_invoker = true so
-- that RLS is evaluated against the calling user, not the owner.
--
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

drop view if exists public.cases_summary;

create or replace view public.cases_summary
  with (security_invoker = true)
as
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
