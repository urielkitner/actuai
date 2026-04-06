-- Add ilaa_status column to profiles table
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS ilaa_status text NOT NULL DEFAULT 'none'
  CHECK (ilaa_status IN ('none', 'pending', 'approved', 'rejected'));
