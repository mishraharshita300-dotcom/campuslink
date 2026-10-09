/*
# CampusLink Phase 4: Community Feed

## Overview
A public community feed where any logged-in user can create posts with text
and images, like/unlike posts, comment with nested replies (one level),
share-copy-link, delete own posts/comments, and report content. New posts,
likes, and comments appear in real-time.

## New Tables

### posts
- id (uuid PK)
- author_id (uuid FK → auth.users, CASCADE)
- content (text, not null)
- created_at (timestamptz, default now())
- deleted_at (timestamptz, nullable — soft delete)
- hidden (boolean, default false — admin moderation)

### post_images
- id (uuid PK)
- post_id (uuid FK → posts, CASCADE)
- image_url (text — Supabase Storage public URL)
- position (int — image order within post, 0-3)
- created_at (timestamptz)

### post_likes
- id (uuid PK)
- post_id (uuid FK → posts, CASCADE)
- user_id (uuid FK → auth.users, CASCADE)
- created_at (timestamptz)
- UNIQUE(post_id, user_id) — one like per user per post

### comments
- id (uuid PK)
- post_id (uuid FK → posts, CASCADE)
- author_id (uuid FK → auth.users, CASCADE)
- content (text, not null)
- parent_id (uuid FK → comments, CASCADE, nullable — for nested replies, one level)
- created_at (timestamptz)
- deleted_at (timestamptz, nullable — soft delete)

### reports
- id (uuid PK)
- reporter_id (uuid FK → auth.users, CASCADE)
- target_type (text: 'post' | 'comment')
- target_id (uuid — the post or comment ID)
- reason (text)
- status (text: 'pending' | 'resolved' | 'dismissed', default 'pending')
- created_at (timestamptz)
- UNIQUE(reporter_id, target_type, target_id) — one report per user per target

## RLS Policies

### posts
- SELECT: authenticated can read non-deleted, non-hidden posts (admins see all)
- INSERT: authenticated, author_id must be auth.uid()
- UPDATE: author can soft-delete own post; admin can set hidden
- DELETE: author can delete own post; admin can delete any

### post_images
- SELECT: anyone authenticated can read (images are public once posted)
- INSERT: only the post author can add images
- DELETE: only the post author

### post_likes
- SELECT: anyone authenticated (to show like count and who liked)
- INSERT: only self (user_id = auth.uid())
- DELETE: only self (unlike)

### comments
- SELECT: authenticated can read non-deleted comments
- INSERT: authenticated, author_id must be auth.uid()
- UPDATE: author can soft-delete own comment
- DELETE: author can delete own comment; admin can delete any

### reports
- SELECT: only the reporter or admin
- INSERT: authenticated, reporter_id must be auth.uid()
- UPDATE/DELETE: admin only

## Storage
- Create a public bucket 'feed-images' for post image uploads
- Policy: authenticated users can upload; anyone can read; only owner can delete

## Indexes
- idx_posts_created on posts(created_at DESC)
- idx_post_images_post on post_images(post_id)
- idx_post_likes_post on post_likes(post_id)
- idx_post_likes_user on post_likes(user_id)
- idx_comments_post on comments(post_id, created_at)
- idx_comments_parent on comments(parent_id)
- idx_reports_status on reports(status)

## Important Notes
1. Posts are public within the app — all authenticated users can see them.
2. Hidden posts are only visible to admins (moderation queue in Phase 9).
3. Soft delete (deleted_at) preserves data integrity for referential integrity.
4. Image uploads go to Supabase Storage 'feed-images' bucket.
5. Realtime enabled on posts, post_likes, comments for live updates.
*/

-- === posts ===
CREATE TABLE IF NOT EXISTS posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz DEFAULT now(),
  deleted_at timestamptz,
  hidden boolean NOT NULL DEFAULT false
);

ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "posts_select" ON posts;
CREATE POLICY "posts_select" ON posts FOR SELECT
  TO authenticated USING (
    deleted_at IS NULL
    AND (
      hidden = false
      OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    )
  );

DROP POLICY IF EXISTS "posts_insert_own" ON posts;
CREATE POLICY "posts_insert_own" ON posts FOR INSERT
  TO authenticated WITH CHECK (author_id = auth.uid());

DROP POLICY IF EXISTS "posts_update_own_or_admin" ON posts;
CREATE POLICY "posts_update_own_or_admin" ON posts FOR UPDATE
  TO authenticated USING (
    author_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  ) WITH CHECK (
    author_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

DROP POLICY IF EXISTS "posts_delete_own_or_admin" ON posts;
CREATE POLICY "posts_delete_own_or_admin" ON posts FOR DELETE
  TO authenticated USING (
    author_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- === post_images ===
CREATE TABLE IF NOT EXISTS post_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  position int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE post_images ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "post_images_select_all" ON post_images;
CREATE POLICY "post_images_select_all" ON post_images FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "post_images_insert_author" ON post_images;
CREATE POLICY "post_images_insert_author" ON post_images FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM posts p
      WHERE p.id = post_images.post_id AND p.author_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "post_images_delete_author" ON post_images;
CREATE POLICY "post_images_delete_author" ON post_images FOR DELETE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM posts p
      WHERE p.id = post_images.post_id AND p.author_id = auth.uid()
    )
  );

-- === post_likes ===
CREATE TABLE IF NOT EXISTS post_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(post_id, user_id)
);

ALTER TABLE post_likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "post_likes_select_all" ON post_likes;
CREATE POLICY "post_likes_select_all" ON post_likes FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "post_likes_insert_own" ON post_likes;
CREATE POLICY "post_likes_insert_own" ON post_likes FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "post_likes_delete_own" ON post_likes;
CREATE POLICY "post_likes_delete_own" ON post_likes FOR DELETE
  TO authenticated USING (user_id = auth.uid());

-- === comments ===
CREATE TABLE IF NOT EXISTS comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  author_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  parent_id uuid REFERENCES comments(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "comments_select" ON comments;
CREATE POLICY "comments_select" ON comments FOR SELECT
  TO authenticated USING (
    deleted_at IS NULL
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

DROP POLICY IF EXISTS "comments_insert_own" ON comments;
CREATE POLICY "comments_insert_own" ON comments FOR INSERT
  TO authenticated WITH CHECK (author_id = auth.uid());

DROP POLICY IF EXISTS "comments_update_own" ON comments;
CREATE POLICY "comments_update_own" ON comments FOR UPDATE
  TO authenticated USING (author_id = auth.uid()) WITH CHECK (author_id = auth.uid());

DROP POLICY IF EXISTS "comments_delete_own_or_admin" ON comments;
CREATE POLICY "comments_delete_own_or_admin" ON comments FOR DELETE
  TO authenticated USING (
    author_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- === reports ===
CREATE TABLE IF NOT EXISTS reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  target_type text NOT NULL CHECK (target_type IN ('post', 'comment')),
  target_id uuid NOT NULL,
  reason text NOT NULL DEFAULT 'Inappropriate content',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'resolved', 'dismissed')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(reporter_id, target_type, target_id)
);

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reports_select_own_or_admin" ON reports;
CREATE POLICY "reports_select_own_or_admin" ON reports FOR SELECT
  TO authenticated USING (
    reporter_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

DROP POLICY IF EXISTS "reports_insert_own" ON reports;
CREATE POLICY "reports_insert_own" ON reports FOR INSERT
  TO authenticated WITH CHECK (reporter_id = auth.uid());

DROP POLICY IF EXISTS "reports_update_admin" ON reports;
CREATE POLICY "reports_update_admin" ON reports FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- === Indexes ===
CREATE INDEX IF NOT EXISTS idx_posts_created ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_post_images_post ON post_images(post_id);
CREATE INDEX IF NOT EXISTS idx_post_likes_post ON post_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_post_likes_user ON post_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_post ON comments(post_id, created_at);
CREATE INDEX IF NOT EXISTS idx_comments_parent ON comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);

-- === Enable Realtime ===
ALTER PUBLICATION supabase_realtime ADD TABLE posts;
ALTER PUBLICATION supabase_realtime ADD TABLE post_likes;
ALTER PUBLICATION supabase_realtime ADD TABLE comments;

-- === Create storage bucket for feed images ===
INSERT INTO storage.buckets (id, name, public)
VALUES ('feed-images', 'feed-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: authenticated can upload, anyone can read, owner can delete
DROP POLICY IF EXISTS "feed_images_upload" ON storage.objects;
CREATE POLICY "feed_images_upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'feed-images');

DROP POLICY IF EXISTS "feed_images_read" ON storage.objects;
CREATE POLICY "feed_images_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'feed-images');

DROP POLICY IF EXISTS "feed_images_delete" ON storage.objects;
CREATE POLICY "feed_images_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'feed-images' AND owner = auth.uid());
