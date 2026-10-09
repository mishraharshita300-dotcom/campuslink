/*
# CampusLink Phase 6: Events + RSVP

## Overview
Campus events with categories, cover images, capacity limits, and RSVP
(going/interested/not_going). Events show on a calendar and a list view.
Creators can edit/delete their own events; admins can manage all.

## New Tables

### events
- id (uuid PK)
- title (text, not null)
- description (text, nullable)
- category (text: 'academic' | 'social' | 'sports' | 'workshop' | 'career' | 'other', default 'other')
- location (text, nullable)
- event_date (date, not null)
- start_time (time, not null)
- end_time (time, nullable)
- cover_image_url (text, nullable — Supabase Storage URL)
- capacity (int, nullable — max attendees, null = unlimited)
- created_by (uuid FK → auth.users, CASCADE)
- created_at (timestamptz)
- updated_at (timestamptz)

### rsvps
- id (uuid PK)
- event_id (uuid FK → events, CASCADE)
- user_id (uuid FK → auth.users, CASCADE)
- status (text: 'going' | 'interested' | 'not_going', default 'going')
- created_at (timestamptz)
- updated_at (timestamptz)
- UNIQUE(event_id, user_id) — one RSVP per user per event

## RLS Policies

### events
- SELECT: all authenticated users can see all events
- INSERT: authenticated, created_by must be auth.uid()
- UPDATE: creator or admin
- DELETE: creator or admin

### rsvps
- SELECT: all authenticated (to show attendee counts and who's going)
- INSERT: only self (user_id = auth.uid())
- UPDATE: only self (change RSVP status)
- DELETE: only self (remove RSVP)

## Storage
- Create a public bucket 'event-covers' for event cover image uploads
- Policy: authenticated can upload, anyone can read, owner can delete

## Indexes
- idx_events_date on events(event_date)
- idx_events_category on events(category)
- idx_events_created_by on events(created_by)
- idx_rsvps_event on rsvps(event_id)
- idx_rsvps_user on rsvps(user_id)
- idx_rsvps_status on rsvps(status)

## Realtime
- Enable realtime on events and rsvps

## Important Notes
1. Events are visible to all authenticated users (campus-wide).
2. RSVP is a single record per user per event with status going/interested/not_going.
3. Capacity is optional — null means unlimited. The app checks current 'going'
   count against capacity before allowing new 'going' RSVPs.
4. Cover images upload to Supabase Storage 'event-covers' bucket.
5. Event creator auto-RSVPs as 'going' (handled in app code).
*/

-- === events table ===
CREATE TABLE IF NOT EXISTS events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'other' CHECK (category IN ('academic', 'social', 'sports', 'workshop', 'career', 'other')),
  location text,
  event_date date NOT NULL,
  start_time time NOT NULL DEFAULT '09:00',
  end_time time,
  cover_image_url text,
  capacity int,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "events_select_all" ON events;
CREATE POLICY "events_select_all" ON events FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "events_insert_own" ON events;
CREATE POLICY "events_insert_own" ON events FOR INSERT
  TO authenticated WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS "events_update_creator_or_admin" ON events;
CREATE POLICY "events_update_creator_or_admin" ON events FOR UPDATE
  TO authenticated USING (
    created_by = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  ) WITH CHECK (
    created_by = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

DROP POLICY IF EXISTS "events_delete_creator_or_admin" ON events;
CREATE POLICY "events_delete_creator_or_admin" ON events FOR DELETE
  TO authenticated USING (
    created_by = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- === rsvps table ===
CREATE TABLE IF NOT EXISTS rsvps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'going' CHECK (status IN ('going', 'interested', 'not_going')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(event_id, user_id)
);

ALTER TABLE rsvps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rsvps_select_all" ON rsvps;
CREATE POLICY "rsvps_select_all" ON rsvps FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "rsvps_insert_own" ON rsvps;
CREATE POLICY "rsvps_insert_own" ON rsvps FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "rsvps_update_own" ON rsvps;
CREATE POLICY "rsvps_update_own" ON rsvps FOR UPDATE
  TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "rsvps_delete_own" ON rsvps;
CREATE POLICY "rsvps_delete_own" ON rsvps FOR DELETE
  TO authenticated USING (user_id = auth.uid());

-- === Indexes ===
CREATE INDEX IF NOT EXISTS idx_events_date ON events(event_date);
CREATE INDEX IF NOT EXISTS idx_events_category ON events(category);
CREATE INDEX IF NOT EXISTS idx_events_created_by ON events(created_by);
CREATE INDEX IF NOT EXISTS idx_rsvps_event ON rsvps(event_id);
CREATE INDEX IF NOT EXISTS idx_rsvps_user ON rsvps(user_id);
CREATE INDEX IF NOT EXISTS idx_rsvps_status ON rsvps(status);

-- === Enable Realtime ===
ALTER PUBLICATION supabase_realtime ADD TABLE events;
ALTER PUBLICATION supabase_realtime ADD TABLE rsvps;

-- === Create storage bucket for event covers ===
INSERT INTO storage.buckets (id, name, public)
VALUES ('event-covers', 'event-covers', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "event_covers_upload" ON storage.objects;
CREATE POLICY "event_covers_upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'event-covers');

DROP POLICY IF EXISTS "event_covers_read" ON storage.objects;
CREATE POLICY "event_covers_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'event-covers');

DROP POLICY IF EXISTS "event_covers_delete" ON storage.objects;
CREATE POLICY "event_covers_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'event-covers' AND owner = auth.uid());
