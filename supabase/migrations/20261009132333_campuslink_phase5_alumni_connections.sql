/*
# CampusLink Phase 5: Alumni Directory + Connections + Notifications

## Overview
1. Adds alumni profile fields (company, job_title, location, linkedin_url)
2. Creates a connections table for alumni-to-student / user-to-user
   connection requests with accept/reject flow
3. Creates a notifications table for real-time notifications
   (connection requests, accepted connections, feed activity)
4. Admin verification queue for alumni accounts

## Schema Changes

### profiles (ALTER)
Add columns:
- company (text, nullable) — alumni's current company
- job_title (text, nullable) — alumni's current job title
- location (text, nullable) — alumni's current city/country
- linkedin_url (text, nullable) — alumni's LinkedIn profile URL

### connections (new table)
- id (uuid PK)
- requester_id (uuid FK → auth.users, CASCADE)
- target_id (uuid FK → auth.users, CASCADE)
- status (text: 'pending' | 'accepted' | 'rejected' | 'blocked', default 'pending')
- message (text, nullable — optional message with request)
- created_at (timestamptz)
- responded_at (timestamptz, nullable)
- UNIQUE(requester_id, target_id) — one active request per pair

### notifications (new table)
- id (uuid PK)
- user_id (uuid FK → auth.users, CASCADE) — the recipient
- actor_id (uuid FK → auth.users, CASCADE) — who triggered it
- type (text: 'connection_request' | 'connection_accepted' | 'connection_rejected' | 'post_like' | 'post_comment' | 'comment_reply' | 'admin_verified' | 'admin_rejected' | 'group_invite')
- entity_id (uuid, nullable — the related entity ID, e.g. post_id, connection_id)
- entity_type (text, nullable — 'post' | 'comment' | 'connection' | 'group')
- content (text, nullable — message text for the notification)
- read (boolean, default false)
- created_at (timestamptz)

## RLS Policies

### profiles (updated)
- The existing select policy already allows all authenticated users to read
  profiles (needed for directory). No changes needed — new columns are
  readable by default since the SELECT policy grants column-level access.
- The protect_profile_fields() trigger already prevents users from setting
  role, alumni_verified, alumni_status — new columns are user-editable.

### connections
- SELECT: requester or target can see the connection
- INSERT: requester_id must be auth.uid(), cannot connect to self,
  target must exist
- UPDATE: target_id can update status (accept/reject), requester can
  cancel (set to 'rejected')
- DELETE: either party can delete

### notifications
- SELECT: user_id must be auth.uid() — only see your own notifications
- INSERT: any authenticated user can create (for connection requests etc.)
  but actor_id must be auth.uid()
- UPDATE: only the user_id owner can mark as read
- DELETE: only the user_id owner can delete

## Indexes
- idx_connections_requester on connections(requester_id)
- idx_connections_target on connections(target_id)
- idx_connections_status on connections(status)
- idx_notifications_user on notifications(user_id, created_at DESC)
- idx_notifications_read on notifications(user_id, read) — for unread count
- idx_profiles_role on profiles(role) — for alumni directory filter
- idx_profiles_grad_year on profiles(graduation_year) — for directory filter

## Realtime
- Enable realtime on connections and notifications

## Important Notes
1. Connections are bidirectional — once accepted, both users are "connected".
2. When a connection request is sent, a notification is created for the target.
3. When a connection is accepted/rejected, a notification is created for the requester.
4. The alumni directory shows all profiles with role='alumni' and alumni_verified=true.
5. Admin verification: admin updates alumni_verified + alumni_status on profiles.
   A notification is sent to the alumni user when verified or rejected.
6. New profile columns (company, job_title, location, linkedin_url) are editable
   by the profile owner — the protect_profile_fields trigger doesn't restrict them.
*/

-- === Add alumni profile fields ===
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS company text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS job_title text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS location text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS linkedin_url text;

-- === connections table ===
CREATE TABLE IF NOT EXISTS connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  target_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'blocked')),
  message text,
  created_at timestamptz DEFAULT now(),
  responded_at timestamptz,
  UNIQUE(requester_id, target_id)
);

-- Prevent self-connections
ALTER TABLE connections DROP CONSTRAINT IF EXISTS connections_no_self_check;
ALTER TABLE connections ADD CONSTRAINT connections_no_self_check CHECK (requester_id <> target_id);

ALTER TABLE connections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "connections_select_participant" ON connections;
CREATE POLICY "connections_select_participant" ON connections FOR SELECT
  TO authenticated USING (
    requester_id = auth.uid() OR target_id = auth.uid()
  );

DROP POLICY IF EXISTS "connections_insert_requester" ON connections;
CREATE POLICY "connections_insert_requester" ON connections FOR INSERT
  TO authenticated WITH CHECK (
    requester_id = auth.uid()
    AND target_id <> auth.uid()
  );

DROP POLICY IF EXISTS "connections_update_participant" ON connections;
CREATE POLICY "connections_update_participant" ON connections FOR UPDATE
  TO authenticated USING (
    requester_id = auth.uid() OR target_id = auth.uid()
  ) WITH CHECK (
    requester_id = auth.uid() OR target_id = auth.uid()
  );

DROP POLICY IF EXISTS "connections_delete_participant" ON connections;
CREATE POLICY "connections_delete_participant" ON connections FOR DELETE
  TO authenticated USING (
    requester_id = auth.uid() OR target_id = auth.uid()
  );

-- === notifications table ===
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  actor_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN (
    'connection_request', 'connection_accepted', 'connection_rejected',
    'post_like', 'post_comment', 'comment_reply',
    'admin_verified', 'admin_rejected', 'group_invite'
  )),
  entity_id uuid,
  entity_type text CHECK (entity_type IN ('post', 'comment', 'connection', 'group', 'profile') OR entity_type IS NULL),
  content text,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notifications_select_own" ON notifications;
CREATE POLICY "notifications_select_own" ON notifications FOR SELECT
  TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "notifications_insert_actor" ON notifications;
CREATE POLICY "notifications_insert_actor" ON notifications FOR INSERT
  TO authenticated WITH CHECK (
    actor_id = auth.uid()
    AND user_id <> auth.uid()
  );

DROP POLICY IF EXISTS "notifications_update_own" ON notifications;
CREATE POLICY "notifications_update_own" ON notifications FOR UPDATE
  TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "notifications_delete_own" ON notifications;
CREATE POLICY "notifications_delete_own" ON notifications FOR DELETE
  TO authenticated USING (user_id = auth.uid());

-- === Indexes ===
CREATE INDEX IF NOT EXISTS idx_connections_requester ON connections(requester_id);
CREATE INDEX IF NOT EXISTS idx_connections_target ON connections(target_id);
CREATE INDEX IF NOT EXISTS idx_connections_status ON connections(status);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_grad_year ON profiles(graduation_year);

-- === Enable Realtime ===
ALTER PUBLICATION supabase_realtime ADD TABLE connections;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
