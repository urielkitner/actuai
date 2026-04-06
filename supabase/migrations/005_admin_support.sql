-- ============================================================
-- Admin dashboard support: subscription tracking, blocking,
-- admin settings table.
-- Run in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- Add subscription and blocking columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_blocked boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS subscription_status text NOT NULL DEFAULT 'none'
    CHECK (subscription_status IN ('none', 'active', 'expired')),
  ADD COLUMN IF NOT EXISTS subscription_expires_at timestamptz;

-- Admin settings key-value store
CREATE TABLE IF NOT EXISTS public.admin_settings (
  key         text        PRIMARY KEY,
  value       text        NOT NULL DEFAULT '',
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;
-- No public RLS policies: all access goes through service role key only

-- Seed defaults
INSERT INTO public.admin_settings (key, value) VALUES
  ('report_intro',    'דוח איזון משאבים זה הוכן על ידי אקטואר מוסמך בהתאם לחוק יחסי ממון בין בני זוג, התשל"ג-1973.'),
  ('report_disclaimer', 'הערה: דוח זה מהווה חוות דעת מקצועית בלבד ואינו תחליף לייעוץ משפטי. יש להתייעץ עם עורך דין לפני קבלת החלטות.'),
  ('terms_of_service', 'תנאי השימוש של ActuAi - גרסה 1.0&#10;&#10;השימוש במערכת כפוף לתנאים המפורטים כאן.'),
  ('announcement',    '')
ON CONFLICT (key) DO NOTHING;
