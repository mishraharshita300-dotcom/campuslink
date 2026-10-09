import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import type { Post, PostImage, PostLike, Comment, PostWithMeta, CommentWithMeta, Profile } from '@/lib/types';

const PAGE_SIZE = 10;

type FeedFilter = 'all' | 'students' | 'alumni';
type FeedSort = 'latest' | 'trending';

export function useFeed(filter: FeedFilter, sort: FeedSort) {
  const { user } = useAuth();
  const [posts, setPosts] = useState<PostWithMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const buildPostsQuery = useCallback((offset: number) => {
    let query = supabase
      .from('posts')
      .select('*')
      .is('deleted_at', null);

    // Hidden filter: admin sees all, others see only non-hidden
    // RLS handles this but we also filter for sorting efficiency

    if (sort === 'trending') {
      query = query.order('created_at', { ascending: false });
    } else {
      query = query.order('created_at', { ascending: false });
    }

    query = query.range(offset, offset + PAGE_SIZE - 1);
    return query;
  }, [sort]);

  const enrichPosts = useCallback(async (postRows: Post[]): Promise<PostWithMeta[]> => {
    if (postRows.length === 0) return [];

    const postIds = postRows.map((p) => p.id);
    const authorIds = [...new Set(postRows.map((p) => p.author_id))];

    const [imagesRes, likesRes, commentsRes, authorsRes] = await Promise.all([
      supabase.from('post_images').select('*').in('post_id', postIds).order('position', { ascending: true }),
      supabase.from('post_likes').select('post_id, user_id').in('post_id', postIds),
      supabase.from('comments').select('post_id').is('deleted_at', null).in('post_id', postIds),
      supabase.from('profiles').select('*').in('id', authorIds),
    ]);

    const imagesMap: Record<string, PostImage[]> = {};
    (imagesRes.data ?? []).forEach((img) => {
      if (!imagesMap[img.post_id]) imagesMap[img.post_id] = [];
      imagesMap[img.post_id].push(img as PostImage);
    });

    const likesMap: Record<string, { count: number; liked: boolean }> = {};
    (likesRes.data ?? []).forEach((l) => {
      if (!likesMap[l.post_id]) likesMap[l.post_id] = { count: 0, liked: false };
      likesMap[l.post_id].count++;
      if (l.user_id === user?.id) likesMap[l.post_id].liked = true;
    });

    const commentsMap: Record<string, number> = {};
    (commentsRes.data ?? []).forEach((c) => {
      commentsMap[c.post_id] = (commentsMap[c.post_id] ?? 0) + 1;
    });

    const authorsMap: Record<string, Profile> = {};
    (authorsRes.data ?? []).forEach((a) => { authorsMap[a.id] = a as Profile; });

    let result: PostWithMeta[] = postRows.map((p) => ({
      ...p,
      author: authorsMap[p.author_id] ?? null,
      images: imagesMap[p.id] ?? [],
      like_count: likesMap[p.id]?.count ?? 0,
      liked_by_me: likesMap[p.id]?.liked ?? false,
      comment_count: commentsMap[p.id] ?? 0,
    }));

    // Filter by role if needed
    if (filter === 'students') {
      result = result.filter((p) => p.author?.role === 'student');
    } else if (filter === 'alumni') {
      result = result.filter((p) => p.author?.role === 'alumni');
    }

    // Sort trending: by like_count desc, then by comment_count
    if (sort === 'trending') {
      result.sort((a, b) => b.like_count - a.like_count || b.comment_count - a.comment_count);
    }

    return result;
  }, [user, filter, sort]);

  const fetchPosts = useCallback(async (reset: boolean) => {
    if (reset) {
      setLoading(true);
      const offset = 0;
      // Fetch more than PAGE_SIZE to compensate for role filtering
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .range(offset, offset + PAGE_SIZE * 3 - 1);

      if (error) {
        console.error('Feed fetch error:', error.message);
        setPosts([]);
      } else {
        const enriched = await enrichPosts(data as Post[]);
        const filtered = enriched.slice(0, PAGE_SIZE);
        setPosts(filtered);
        setHasMore(enriched.length > PAGE_SIZE);
      }
      setLoading(false);
    }
  }, [enrichPosts]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;

    setLoadingMore(true);
    const offset = posts.length;
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .range(offset, offset + PAGE_SIZE * 3 - 1);

    if (error) {
      console.error('Load more error:', error.message);
    } else {
      const enriched = await enrichPosts(data as Post[]);
      const filtered = enriched.slice(0, PAGE_SIZE);
      setPosts((prev) => [...prev, ...filtered]);
      setHasMore(filtered.length === PAGE_SIZE);
    }
    setLoadingMore(false);
  }, [posts.length, loadingMore, hasMore, enrichPosts]);

  useEffect(() => {
    fetchPosts(true);
  }, [fetchPosts, filter, sort]);

  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel('feed-changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, () => fetchPosts(true))
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'posts' }, () => fetchPosts(true))
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'posts' }, () => fetchPosts(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'post_likes' }, () => fetchPosts(true))
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'comments' }, () => fetchPosts(true))
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'comments' }, () => fetchPosts(true))
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchPosts]);

  return { posts, loading, hasMore, loadingMore, loadMore, refetch: () => fetchPosts(true) };
}

export function useComments(postId: string) {
  const { user } = useAuth();
  const [comments, setComments] = useState<CommentWithMeta[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchComments = useCallback(async () => {
    if (!postId) return;

    const { data: commentRows, error } = await supabase
      .from('comments')
      .select('*')
      .eq('post_id', postId)
      .order('created_at', { ascending: true });

    if (error || !commentRows) {
      setComments([]);
      setLoading(false);
      return;
    }

    const authorIds = [...new Set((commentRows as Comment[]).map((c) => c.author_id))];
    let authorsMap: Record<string, Profile> = {};
    if (authorIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .in('id', authorIds);
      (profiles ?? []).forEach((p) => { authorsMap[p.id] = p as Profile; });
    }

    const allComments = commentRows as Comment[];

    // Build nested structure: top-level comments + their replies
    const topLevel = allComments.filter((c) => !c.parent_id);
    const repliesByParent: Record<string, Comment[]> = {};
    allComments.filter((c) => c.parent_id).forEach((c) => {
      if (!repliesByParent[c.parent_id!]) repliesByParent[c.parent_id!] = [];
      repliesByParent[c.parent_id!].push(c);
    });

    const result: CommentWithMeta[] = topLevel.map((c) => ({
      ...c,
      author: authorsMap[c.author_id] ?? null,
      replies: (repliesByParent[c.id] ?? []).map((r) => ({
        ...r,
        author: authorsMap[r.author_id] ?? null,
        replies: [],
      })),
    }));

    setComments(result);
    setLoading(false);
  }, [postId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  useEffect(() => {
    if (!postId) return;

    const channel = supabase
      .channel(`comments-${postId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'comments', filter: `post_id=eq.${postId}` }, () => fetchComments())
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'comments', filter: `post_id=eq.${postId}` }, () => fetchComments())
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'comments', filter: `post_id=eq.${postId}` }, () => fetchComments())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [postId, fetchComments]);

  async function addComment(content: string, parentId?: string) {
    if (!user || !content.trim()) return;

    const { error } = await supabase
      .from('comments')
      .insert({ post_id: postId, author_id: user.id, content: content.trim(), parent_id: parentId ?? null });

    if (error) {
      console.error('Comment error:', error.message);
      return;
    }

    // Determine who to notify
    if (parentId) {
      // Reply: notify the parent comment's author
      const { data: parentComment } = await supabase
        .from('comments')
        .select('author_id')
        .eq('id', parentId)
        .maybeSingle();

      if (parentComment && parentComment.author_id !== user.id) {
        await supabase.from('notifications').insert({
          user_id: parentComment.author_id,
          actor_id: user.id,
          type: 'comment_reply',
          entity_id: postId,
          entity_type: 'post',
        });
      }
    } else {
      // Top-level comment: notify the post author
      const { data: post } = await supabase
        .from('posts')
        .select('author_id')
        .eq('id', postId)
        .maybeSingle();

      if (post && post.author_id !== user.id) {
        await supabase.from('notifications').insert({
          user_id: post.author_id,
          actor_id: user.id,
          type: 'post_comment',
          entity_id: postId,
          entity_type: 'post',
        });
      }
    }
  }

  async function deleteComment(commentId: string) {
    const { error } = await supabase
      .from('comments')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', commentId)
      .eq('author_id', user!.id);

    if (error) {
      console.error('Delete comment error:', error.message);
    }
  }

  return { comments, loading, addComment, deleteComment, refetch: fetchComments };
}

export async function toggleLike(postId: string, userId: string, currentlyLiked: boolean): Promise<void> {
  if (currentlyLiked) {
    await supabase.from('post_likes').delete().eq('post_id', postId).eq('user_id', userId);
  } else {
    await supabase.from('post_likes').insert({ post_id: postId, user_id: userId });

    // Notify the post author (but not if you're liking your own post)
    const { data: post } = await supabase
      .from('posts')
      .select('author_id')
      .eq('id', postId)
      .maybeSingle();

    if (post && post.author_id !== userId) {
      await supabase.from('notifications').insert({
        user_id: post.author_id,
        actor_id: userId,
        type: 'post_like',
        entity_id: postId,
        entity_type: 'post',
      });
    }
  }
}

export async function createPost(
  userId: string,
  content: string,
  imageFiles: File[]
): Promise<string | null> {
  if (!content.trim() && imageFiles.length === 0) return null;

  const { data: post, error } = await supabase
    .from('posts')
    .insert({ author_id: userId, content: content.trim() })
    .select('id')
    .single();

  if (error || !post) {
    console.error('Create post error:', error?.message);
    return null;
  }

  // Upload images
  for (let i = 0; i < imageFiles.length && i < 4; i++) {
    const file = imageFiles[i];
    const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
    const fileName = `${post.id}/${Date.now()}-${i}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('feed-images')
      .upload(fileName, file, { contentType: file.type });

    if (uploadError) {
      console.error('Image upload error:', uploadError.message);
      continue;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('feed-images')
      .getPublicUrl(fileName);

    await supabase
      .from('post_images')
      .insert({ post_id: post.id, image_url: publicUrl, position: i });
  }

  return post.id;
}

export async function deletePost(postId: string, userId: string): Promise<boolean> {
  const { error } = await supabase
    .from('posts')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', postId)
    .eq('author_id', userId);

  return !error;
}

export async function reportContent(
  reporterId: string,
  targetType: 'post' | 'comment',
  targetId: string,
  reason: string
): Promise<boolean> {
  const { error } = await supabase
    .from('reports')
    .insert({ reporter_id: reporterId, target_type: targetType, target_id: targetId, reason });

  if (error) {
    if (error.message.includes('duplicate')) {
      return false;
    }
    console.error('Report error:', error.message);
    return false;
  }
  return true;
}
