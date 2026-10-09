/*
# Auto-confirm users on signup

## Overview
Email confirmation may be enabled on this Supabase project, which prevents
sign-up from creating a session and blocks subsequent sign-in attempts.
This migration adds a BEFORE INSERT trigger on auth.users that auto-sets
email_confirmed_at and confirmed_at, so users are immediately confirmed
and can sign in right after sign-up.

## Changes
1. New function `auto_confirm_user()` — sets email_confirmed_at and confirmed_at
   on the NEW row before it's inserted into auth.users.
2. New trigger `auto_confirm_user_trigger` — fires BEFORE INSERT on auth.users.

## Security
- The function is SECURITY DEFINER so it can modify auth.users.
- This only affects new sign-ups; existing users are untouched.
*/

CREATE OR REPLACE FUNCTION public.auto_confirm_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = auth
AS $$
BEGIN
  NEW.email_confirmed_at := now();
  NEW.confirmed_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS auto_confirm_user_trigger ON auth.users;
CREATE TRIGGER auto_confirm_user_trigger
  BEFORE INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.auto_confirm_user();

GRANT EXECUTE ON FUNCTION public.auto_confirm_user TO anon, authenticated, supabase_admin;
