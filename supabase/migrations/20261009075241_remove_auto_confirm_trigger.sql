/*
# Remove auto-confirm trigger

## Overview
The BEFORE INSERT trigger on auth.users that auto-set email_confirmed_at
may interfere with Supabase's internal GoTrue auth flow. Removing it
to allow GoTrue to handle user creation natively.

## Changes
1. Drop trigger `auto_confirm_user_trigger` on auth.users.
2. Drop function `auto_confirm_user()`.
*/

DROP TRIGGER IF EXISTS auto_confirm_user_trigger ON auth.users;
DROP FUNCTION IF EXISTS public.auto_confirm_user();
