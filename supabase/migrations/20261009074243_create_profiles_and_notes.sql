/*
# Create profiles and notes tables with row-level security

## Overview
This migration sets up the data layer for a multi-user app with Supabase authentication.
Each user gets an auto-created profile (extending auth.users), and can create personal notes.
All data is owner-scoped — users can only see and modify their own data.

## 1. New Tables

### `profiles`
- `id` (uuid, primary key) — references auth.users(id), cascades on delete
- `username` (text, unique, not null) — display name set at signup
- `full_name` (text, nullable) — optional display name
- `avatar_url` (text, nullable) — optional avatar image URL
- `bio` (text, nullable) — short user bio
- `created_at` (timestamptz, default now())
- `updated_at` (timestamptz, default now())

### `notes`
- `id` (uuid, primary key, default gen_random_uuid())
- `user_id` (uuid, not null, default auth.uid()) — references auth.users, cascades on delete
- `title` (text, not null)
- `content` (text, not null, default '')
- `color` (text, not null, default 'blue') — accent color for the note card
- `pinned` (boolean, not null, default false)
- `created_at` (timestamptz, default now())
- `updated_at` (timestamptz, default now())

## 2. Security — RLS
- profiles: SELECT/UPDATE own row only (auth.uid() = id), no INSERT/DELETE
- notes: full CRUD scoped to auth.uid() = user_id, DEFAULT auth.uid() on user_id

## 3. Trigger — auto-create profile on signup
A SECURITY DEFINER trigger inserts a profiles row when a new auth.users row is created.

## 4. Indexes
- idx_notes_user_id, idx_notes_user_pinned

## 5. Important Notes
1. Profiles are created server-side via trigger — the frontend never inserts into profiles.
2. DEFAULT auth.uid() on notes.user_id ensures inserts work even when client omits user_id.
3. updated_at is auto-maintained via triggers.
*/

-- === profiles table ===
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE NOT NULL,
  full_name text,
  avatar_url text,
  bio text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_own_profile" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- === notes table ===
CREATE TABLE IF NOT EXISTS notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text NOT NULL DEFAULT '',
  color text NOT NULL DEFAULT 'blue',
  pinned boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_notes" ON notes;
CREATE POLICY "select_own_notes" ON notes FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_notes" ON notes;
CREATE POLICY "insert_own_notes" ON notes FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_notes" ON notes;
CREATE POLICY "update_own_notes" ON notes FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_notes" ON notes;
CREATE POLICY "delete_own_notes" ON notes FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- === indexes ===
CREATE INDEX IF NOT EXISTS idx_notes_user_id ON notes(user_id);
CREATE INDEX IF NOT EXISTS idx_notes_user_pinned ON notes(user_id, pinned);

-- === trigger: auto-create profile on signup ===
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, username)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'username',
      split_part(NEW.email, '@', 1)
    )
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- === trigger: auto-update updated_at ===
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notes_updated_at ON notes;
CREATE TRIGGER notes_updated_at
  BEFORE UPDATE ON notes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS profiles_updated_at ON profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- === grants ===
GRANT EXECUTE ON FUNCTION public.handle_new_user TO anon, authenticated, supabase_admin;
GRANT EXECUTE ON FUNCTION public.update_updated_at TO anon, authenticated, supabase_admin;
