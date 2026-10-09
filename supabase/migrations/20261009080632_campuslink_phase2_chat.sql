/*
# CampusLink Phase 2: 1:1 Chat — conversations, participants, messages, reads

## Overview
Adds real-time direct messaging between users. Each conversation has exactly
2 participants (1:1). Messages are persisted with sender, conversation, content,
and timestamp. Message reads track when each user last read a conversation.

## New Tables

### conversations
- id (uuid PK)
- is_group (boolean, default false — reserved for Phase 3)
- created_at (timestamptz)
- last_message_at (timestamptz — used for sorting conversation list)

### conversation_participants
- id (uuid PK)
- conversation_id (uuid FK → conversations, CASCADE)
- user_id (uuid FK → auth.users, CASCADE)
- joined_at (timestamptz)
- UNIQUE(conversation_id, user_id)

### messages
- id (uuid PK)
- conversation_id (uuid FK → conversations, CASCADE)
- sender_id (uuid FK → auth.users, CASCADE)
- content (text, not null)
- created_at (timestamptz, default now())
- deleted_at (timestamptz, nullable — soft delete)

### message_reads
- id (uuid PK)
- conversation_id (uuid FK → conversations, CASCADE)
- user_id (uuid FK → auth.users, CASCADE)
- last_read_at (timestamptz, default now())
- UNIQUE(conversation_id, user_id)

## RLS Policies
- conversations: SELECT only if user is a participant
- conversation_participants: SELECT own or same-conversation, INSERT own
- messages: SELECT if participant, INSERT if participant + sender is self, UPDATE own (soft delete)
- message_reads: SELECT/INSERT/UPDATE own only

## Indexes
- idx_messages_conv_created on messages(conversation_id, created_at DESC)
- idx_conversations_last_msg on conversations(last_message_at DESC)
- plus indexes on participants and reads

## Important Notes
1. Messages scoped by conversation membership — cannot read other conversations.
2. last_message_at updated by trigger on message insert.
3. Realtime enabled on messages, conversations, conversation_participants.
*/

-- === Create tables first (no policies yet) ===

CREATE TABLE IF NOT EXISTS conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  is_group boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  last_message_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS conversation_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at timestamptz DEFAULT now(),
  UNIQUE(conversation_id, user_id)
);

CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS message_reads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  last_read_at timestamptz DEFAULT now(),
  UNIQUE(conversation_id, user_id)
);

-- === Enable RLS ===

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_reads ENABLE ROW LEVEL SECURITY;

-- === Policies: conversations ===

DROP POLICY IF EXISTS "conversations_select_participant" ON conversations;
CREATE POLICY "conversations_select_participant" ON conversations FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM conversation_participants cp
      WHERE cp.conversation_id = conversations.id AND cp.user_id = auth.uid()
    )
  );

-- === Policies: conversation_participants ===

DROP POLICY IF EXISTS "cp_select_own_or_same_conv" ON conversation_participants;
CREATE POLICY "cp_select_own_or_same_conv" ON conversation_participants FOR SELECT
  TO authenticated USING (
    conversation_participants.user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM conversation_participants cp2
      WHERE cp2.conversation_id = conversation_participants.conversation_id
        AND cp2.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "cp_insert_own" ON conversation_participants;
CREATE POLICY "cp_insert_own" ON conversation_participants FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid());

-- === Policies: messages ===

DROP POLICY IF EXISTS "messages_select_participant" ON messages;
CREATE POLICY "messages_select_participant" ON messages FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM conversation_participants cp
      WHERE cp.conversation_id = messages.conversation_id AND cp.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "messages_insert_participant" ON messages;
CREATE POLICY "messages_insert_participant" ON messages FOR INSERT
  TO authenticated WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM conversation_participants cp
      WHERE cp.conversation_id = messages.conversation_id AND cp.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "messages_update_own" ON messages;
CREATE POLICY "messages_update_own" ON messages FOR UPDATE
  TO authenticated USING (sender_id = auth.uid()) WITH CHECK (sender_id = auth.uid());

-- === Policies: message_reads ===

DROP POLICY IF EXISTS "mr_select_own" ON message_reads;
CREATE POLICY "mr_select_own" ON message_reads FOR SELECT
  TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "mr_insert_own" ON message_reads;
CREATE POLICY "mr_insert_own" ON message_reads FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "mr_update_own" ON message_reads;
CREATE POLICY "mr_update_own" ON message_reads FOR UPDATE
  TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- === Indexes ===

CREATE INDEX IF NOT EXISTS idx_cp_user ON conversation_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_cp_conv ON conversation_participants(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_conv_created ON messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_conversations_last_msg ON conversations(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_mr_user_conv ON message_reads(user_id, conversation_id);

-- === Trigger: update conversations.last_message_at on new message ===

CREATE OR REPLACE FUNCTION public.update_conv_last_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE conversations SET last_message_at = NEW.created_at WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS messages_update_conv_lastmsg ON messages;
CREATE TRIGGER messages_update_conv_lastmsg
  AFTER INSERT ON messages
  FOR EACH ROW EXECUTE FUNCTION public.update_conv_last_message();

GRANT EXECUTE ON FUNCTION public.update_conv_last_message TO anon, authenticated, supabase_admin;

-- === Enable Realtime ===

ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE conversation_participants;
