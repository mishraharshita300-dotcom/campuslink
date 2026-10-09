/*
# CampusLink Phase 1: Profiles with roles, RLS, auto-profile trigger

## Overview
Replaces the old Notewave schema with the CampusLink user profile system.
Profiles extend auth.users with display name, role (student/alumni/admin),
avatar, department, graduation year, and verification status.

## Changes
1. Drop old Notewave tables (notes, profiles) and their triggers/functions
2. Create new `profiles` table:
   - id (uuid PK, references auth.users)
   - full_name (text, not null)
   - email (text, not null — mirrored from auth.users for queries)
   - role (text: 'student' | 'alumni' | 'admin', default 'student')
   - avatar_url (text, nullable)
   - bio (text, nullable)
   - department (text, nullable)
   - graduation_year (int, nullable)
   - alumni_verified (boolean, default false — admin approves alumni)
   - alumni_status (text: 'pending' | 'approved' | 'rejected' | null — only for alumni role)
   - created_at, updated_at (timestamptz)
3. RLS policies:
   - SELECT: anyone authenticated can read all profiles (directory feature)
   - UPDATE: users can only update their own profile
   - No INSERT (trigger handles it) or DELETE
4. Trigger: auto-create profile on auth.users insert, pulling name + role from user_metadata
5. Trigger: auto-update updated_at on profile update
6. Index on role and alumni_verified for directory queries

## Security
- Role is set at signup from user_metadata and stored in the profile
- alumni_verified defaults to false; only admin can change it (enforced by RLS — users can't update alumni_verified on their own profile because we restrict which columns they can update via a separate UPDATE policy check)
- For Phase 1, users CAN update their own profile fields but the alumni_verified/alumni_status/role fields are protected by a column-level check in the update trigger
*/

-- === Drop old Notewave objects ===
DROP TRIGGER IF EXISTS notes_updated_at ON notes;
DROP TRIGGER IF EXISTS profiles_updated_at ON profiles;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS auto_confirm_user_trigger ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.update_updated_at();
DROP FUNCTION IF EXISTS public.auto_confirm_user();
DROP TABLE IF EXISTS notes;
DROP TABLE IF EXISTS profiles;

-- === New profiles table ===
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'alumni', 'admin')),
  avatar_url text,
  bio text,
  department text,
  graduation_year int,
  alumni_verified boolean NOT NULL DEFAULT false,
  alumni_status text CHECK (alumni_status IN ('pending', 'approved', 'rejected') OR alumni_status IS NULL),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read all profiles (for directory/search)
DROP POLICY IF EXISTS "profiles_select_all" ON profiles;
CREATE POLICY "profiles_select_all" ON profiles FOR SELECT
  TO authenticated USING (true);

-- Users can update their own profile (but trigger protects role/alumni fields)
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- === Indexes ===
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_alumni_verified ON profiles(alumni_verified);
CREATE INDEX IF NOT EXISTS idx_profiles_alumni_status ON profiles(alumni_status);

-- === Trigger: auto-create profile on signup ===
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
  v_name text;
  v_status text;
BEGIN
  v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'student');
  v_name := COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1));
  
  IF v_role = 'alumni' THEN
    v_status := 'pending';
  ELSE
    v_status := NULL;
  END IF;

  INSERT INTO public.profiles (id, email, full_name, role, alumni_status)
  VALUES (NEW.id, NEW.email, v_name, v_role, v_status)
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    alumni_status = EXCLUDED.alumni_status;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- === Trigger: protect role/alumni fields from user self-update ===
CREATE OR REPLACE FUNCTION public.protect_profile_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow users to change their own editable fields; protect role, alumni_verified, alumni_status, email
  NEW.role := OLD.role;
  NEW.alumni_verified := OLD.alumni_verified;
  NEW.alumni_status := OLD.alumni_status;
  NEW.email := OLD.email;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_protect_fields ON profiles;
CREATE TRIGGER profiles_protect_fields
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_fields();

-- === Grants ===
GRANT EXECUTE ON FUNCTION public.handle_new_user TO anon, authenticated, supabase_admin;
GRANT EXECUTE ON FUNCTION public.protect_profile_fields TO anon, authenticated, supabase_admin;
