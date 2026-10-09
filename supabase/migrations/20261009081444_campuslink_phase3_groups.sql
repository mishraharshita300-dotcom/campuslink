/*
# CampusLink Phase 3: Group Channels + Announcement Channels

## Overview
Adds group channels (course, club, hostel, general). Groups have invite codes,
a creator admin, member management, and real-time messaging. Announcement
channels restrict posting to group admins and platform admins only.

## New Tables
### groups
- id, name, description, group_type, invite_code, is_announcement, created_by, created_at, last_message_at

### group_members
- id, group_id, user_id, role (admin|member), joined_at, UNIQUE(group_id, user_id)

## Changes to messages
- Add nullable group_id column (conversation_id for DMs, group_id for groups)
- CHECK constraint: at least one of conversation_id or group_id must be non-null
- Updated RLS policies for group message SELECT and INSERT (announcement check)

## RLS
- groups: SELECT all, INSERT (created_by=self), UPDATE/DELETE (admin)
- group_members: SELECT all, INSERT (self or admin), UPDATE (admin), DELETE (self or admin)
- messages: updated for group membership + announcement restriction

## Important Notes
1. A message belongs to EITHER a conversation OR a group, not both.
2. Announcement channels: only group admins or platform admins can post.
3. Group creator auto-becomes admin (handled in app code).
4. Realtime enabled on groups and group_members.
*/

-- === Create tables first (no policies yet) ===

CREATE TABLE IF NOT EXISTS groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  group_type text NOT NULL DEFAULT 'general' CHECK (group_type IN ('course', 'club', 'hostel', 'general')),
  invite_code text NOT NULL UNIQUE DEFAULT upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 8)),
  is_announcement boolean NOT NULL DEFAULT false,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  last_message_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  joined_at timestamptz DEFAULT now(),
  UNIQUE(group_id, user_id)
);

-- === Enable RLS ===

ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;

-- === groups policies ===

DROP POLICY IF EXISTS "groups_select_all" ON groups;
CREATE POLICY "groups_select_all" ON groups FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "groups_insert_own" ON groups;
CREATE POLICY "groups_insert_own" ON groups FOR INSERT
  TO authenticated WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS "groups_update_admin" ON groups;
CREATE POLICY "groups_update_admin" ON groups FOR UPDATE
  TO authenticated USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM group_members gm
      WHERE gm.group_id = groups.id AND gm.user_id = auth.uid() AND gm.role = 'admin'
    )
    OR EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  ) WITH CHECK (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM group_members gm
      WHERE gm.group_id = groups.id AND gm.user_id = auth.uid() AND gm.role = 'admin'
    )
    OR EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "groups_delete_admin" ON groups;
CREATE POLICY "groups_delete_admin" ON groups FOR DELETE
  TO authenticated USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- === group_members policies ===

DROP POLICY IF EXISTS "gm_select_all" ON group_members;
CREATE POLICY "gm_select_all" ON group_members FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "gm_insert_self_or_admin" ON group_members;
CREATE POLICY "gm_insert_self_or_admin" ON group_members FOR INSERT
  TO authenticated WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM group_members gm2
      WHERE gm2.group_id = group_members.group_id AND gm2.user_id = auth.uid() AND gm2.role = 'admin'
    )
    OR EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "gm_update_admin" ON group_members;
CREATE POLICY "gm_update_admin" ON group_members FOR UPDATE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM group_members gm2
      WHERE gm2.group_id = group_members.group_id AND gm2.user_id = auth.uid() AND gm2.role = 'admin'
    )
    OR EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM group_members gm2
      WHERE gm2.group_id = group_members.group_id AND gm2.user_id = auth.uid() AND gm2.role = 'admin'
    )
    OR EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "gm_delete_self_or_admin" ON group_members;
CREATE POLICY "gm_delete_self_or_admin" ON group_members FOR DELETE
  TO authenticated USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM group_members gm2
      WHERE gm2.group_id = group_members.group_id AND gm2.user_id = auth.uid() AND gm2.role = 'admin'
    )
    OR EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- === Add group_id to messages ===

ALTER TABLE messages ADD COLUMN IF NOT EXISTS group_id uuid REFERENCES groups(id) ON DELETE CASCADE;
ALTER TABLE messages ALTER COLUMN conversation_id DROP NOT NULL;

ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_conv_or_group_check;
ALTER TABLE messages ADD CONSTRAINT messages_conv_or_group_check
  CHECK (conversation_id IS NOT NULL OR group_id IS NOT NULL);

-- === Update messages policies for group support ===

DROP POLICY IF EXISTS "messages_insert_participant" ON messages;
CREATE POLICY "messages_insert_participant" ON messages FOR INSERT
  TO authenticated WITH CHECK (
    sender_id = auth.uid()
    AND (
      (
        conversation_id IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM conversation_participants cp
          WHERE cp.conversation_id = messages.conversation_id AND cp.user_id = auth.uid()
        )
      )
      OR
      (
        group_id IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM group_members gm
          WHERE gm.group_id = messages.group_id AND gm.user_id = auth.uid()
        )
        AND (
          NOT EXISTS (SELECT 1 FROM groups g WHERE g.id = messages.group_id AND g.is_announcement = true)
          OR EXISTS (
            SELECT 1 FROM group_members gm
            WHERE gm.group_id = messages.group_id AND gm.user_id = auth.uid() AND gm.role = 'admin'
          )
          OR EXISTS (
            SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
          )
        )
      )
    )
  );

DROP POLICY IF EXISTS "messages_select_participant" ON messages;
CREATE POLICY "messages_select_participant" ON messages FOR SELECT
  TO authenticated USING (
    (
      conversation_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM conversation_participants cp
        WHERE cp.conversation_id = messages.conversation_id AND cp.user_id = auth.uid()
      )
    )
    OR
    (
      group_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM group_members gm
        WHERE gm.group_id = messages.group_id AND gm.user_id = auth.uid()
      )
    )
  );

-- === Indexes ===

CREATE INDEX IF NOT EXISTS idx_groups_last_msg ON groups(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_gm_user ON group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_gm_group ON group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_messages_group_created ON messages(group_id, created_at DESC);

-- === Replace trigger: handle both conversation and group last_message_at ===

CREATE OR REPLACE FUNCTION public.update_last_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.group_id IS NOT NULL THEN
    UPDATE groups SET last_message_at = NEW.created_at WHERE id = NEW.group_id;
  END IF;
  IF NEW.conversation_id IS NOT NULL THEN
    UPDATE conversations SET last_message_at = NEW.created_at WHERE id = NEW.conversation_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS messages_update_conv_lastmsg ON messages;
DROP TRIGGER IF EXISTS messages_update_lastmsg ON messages;
CREATE TRIGGER messages_update_lastmsg
  AFTER INSERT ON messages
  FOR EACH ROW EXECUTE FUNCTION public.update_last_message();

DROP FUNCTION IF EXISTS public.update_conv_last_message() CASCADE;
GRANT EXECUTE ON FUNCTION public.update_last_message TO anon, authenticated, supabase_admin;

-- === Enable Realtime on new tables ===

ALTER PUBLICATION supabase_realtime ADD TABLE groups;
ALTER PUBLICATION supabase_realtime ADD TABLE group_members;
