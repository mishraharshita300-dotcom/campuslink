import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useFeed, useComments, toggleLike, createPost, deletePost, reportContent } from '@/hooks/useFeed';
import type { PostWithMeta, CommentWithMeta } from '@/lib/types';
import {
  Heart, MessageCircle, Share2, MoreVertical, Trash2, Flag, X, Send,
  ImagePlus, Loader2, Rss, Shield, ChevronDown, CornerDownRight, Link as LinkIcon,
} from 'lucide-react';

type FeedFilter = 'all' | 'students' | 'alumni';
type FeedSort = 'latest' | 'trending';

const MAX_IMAGES = 4;
const MAX_SIZE_MB = 5;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export default function FeedPage() {
  const { user, profile } = useAuth();
  const [filter, setFilter] = useState<FeedFilter>('all');
  const [sort, setSort] = useState<FeedSort>('latest');
  const [composerOpen, setComposerOpen] = useState(false);

  const { posts, loading, hasMore, loadingMore, loadMore } = useFeed(filter, sort);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/30 flex items-center justify-center">
              <Rss className="w-5 h-5 text-teal-600 dark:text-teal-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">Community Feed</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">See what's happening on campus</p>
            </div>
          </div>
          <button
            onClick={() => setComposerOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-teal-600 text-white text-sm font-semibold hover:bg-teal-700 active:scale-95 transition flex items-center gap-2"
          >
            <span>New Post</span>
          </button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 mb-6">
          <div className="flex bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-1">
            {(['all', 'students', 'alumni'] as FeedFilter[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition ${
                  filter === f
                    ? 'bg-teal-600 text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
          <div className="flex bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-1 ml-auto">
            {(['latest', 'trending'] as FeedSort[]).map((s) => (
              <button
                key={s}
                onClick={() => setSort(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition ${
                  sort === s
                    ? 'bg-slate-700 dark:bg-slate-200 text-white dark:text-slate-900'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Posts */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
              <Rss className="w-8 h-8 text-slate-400" />
            </div>
            <p className="text-slate-500 dark:text-slate-400 font-medium">No posts yet</p>
            <p className="text-sm text-slate-400 mt-1">Be the first to share something!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                currentUserId={user?.id ?? ''}
                currentUserRole={profile?.role ?? 'student'}
              />
            ))}

            {hasMore && (
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="w-full py-3 text-center text-sm text-teal-600 dark:text-teal-400 font-medium hover:underline disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loadingMore && <Loader2 className="w-4 h-4 animate-spin" />}
                Load more posts
              </button>
            )}
          </div>
        )}
      </div>

      {composerOpen && (
        <ComposerModal
          onClose={() => setComposerOpen(false)}
          onPosted={() => {
            setComposerOpen(false);
          }}
        />
      )}
    </div>
  );
}

function PostCard({
  post,
  currentUserId,
  currentUserRole,
}: {
  post: PostWithMeta;
  currentUserId: string;
  currentUserRole: string;
}) {
  const [showMenu, setShowMenu] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [optimisticLiked, setOptimisticLiked] = useState(post.liked_by_me);
  const [optimisticLikeCount, setOptimisticLikeCount] = useState(post.like_count);
  const [showReport, setShowReport] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);

  const isOwn = post.author_id === currentUserId;
  const isAdmin = currentUserRole === 'admin';

  async function handleLike() {
    setOptimisticLiked(!optimisticLiked);
    setOptimisticLikeCount((prev) => optimisticLiked ? prev - 1 : prev + 1);
    await toggleLike(post.id, currentUserId, optimisticLiked);
  }

  function handleShare() {
    const url = `${window.location.origin}/app/feed?post=${post.id}`;
    navigator.clipboard.writeText(url);
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 2000);
  }

  async function handleDelete() {
    setShowMenu(false);
    await deletePost(post.id, currentUserId);
  }

  function formatTime(dateStr: string) {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const mins = Math.floor(diff / (1000 * 60));
    if (mins < 1) return 'now';
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  const initials = (post.author?.full_name || '?').slice(0, 2).toUpperCase();

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
      {/* Header */}
      <div className="flex items-start gap-3 p-4">
        <div className="w-11 h-11 rounded-full bg-gradient-to-br from-teal-600 to-cyan-700 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-semibold text-slate-900 dark:text-white">{post.author?.full_name ?? 'Unknown'}</span>
            <span className={`text-xs px-1.5 py-0.5 rounded-full capitalize ${
              post.author?.role === 'alumni' ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400' :
              post.author?.role === 'admin' ? 'bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400' :
              'bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400'
            }`}>
              {post.author?.role}
            </span>
            {post.author?.role === 'alumni' && post.author?.alumni_verified && (
              <Shield className="w-3.5 h-3.5 text-teal-500" />
            )}
          </div>
          <span className="text-xs text-slate-400">{formatTime(post.created_at)}</span>
        </div>

        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
          {showMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 top-full mt-1 z-20 w-44 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 py-1">
                {isOwn && (
                  <button
                    onClick={handleDelete}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete post
                  </button>
                )}
                {!isOwn && (
                  <button
                    onClick={() => { setShowMenu(false); setShowReport(true); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
                  >
                    <Flag className="w-4 h-4" />
                    Report post
                  </button>
                )}
                {isAdmin && !isOwn && (
                  <button
                    onClick={handleDelete}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete (admin)
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Content */}
      {post.content && (
        <div className="px-4 pb-3">
          <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap break-words leading-relaxed">{post.content}</p>
        </div>
      )}

      {/* Images */}
      {post.images.length > 0 && (
        <ImageGrid images={post.images} />
      )}

      {/* Actions */}
      <div className="flex items-center gap-1 px-2 py-2 border-t border-slate-100 dark:border-slate-800">
        <button
          onClick={handleLike}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition ${
            optimisticLiked
              ? 'text-rose-600 dark:text-rose-400'
              : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Heart className={`w-4 h-4 ${optimisticLiked ? 'fill-current' : ''}`} />
          {optimisticLikeCount > 0 && optimisticLikeCount}
        </button>

        <button
          onClick={() => setShowComments(!showComments)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
        >
          <MessageCircle className="w-4 h-4" />
          {post.comment_count > 0 && post.comment_count}
        </button>

        <button
          onClick={handleShare}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition ml-auto"
        >
          {shareCopied ? <LinkIcon className="w-4 h-4 text-teal-500" /> : <Share2 className="w-4 h-4" />}
          {shareCopied ? 'Copied!' : 'Share'}
        </button>
      </div>

      {/* Comments section */}
      {showComments && (
        <CommentsSection postId={post.id} currentUserId={currentUserId} />
      )}

      {showReport && (
        <ReportModal
          targetType="post"
          targetId={post.id}
          onClose={() => setShowReport(false)}
        />
      )}
    </div>
  );
}

function ImageGrid({ images }: { images: { id: string; image_url: string; position: number }[] }) {
  const [lightbox, setLightbox] = useState<string | null>(null);

  if (images.length === 0) return null;

  const gridClass = images.length === 1
    ? 'grid-cols-1'
    : images.length === 2
    ? 'grid-cols-2'
    : 'grid-cols-2';

  return (
    <>
      <div className={`grid ${gridClass} gap-0.5 px-4 pb-3`}>
        {images.slice(0, 4).map((img, idx) => (
          <button
            key={img.id}
            onClick={() => setLightbox(img.image_url)}
            className={`relative overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800 ${
              images.length === 3 && idx === 0 ? 'col-span-2' : ''
            }`}
          >
            <img
              src={img.image_url}
              alt={`Image ${idx + 1}`}
              className="w-full h-48 object-cover hover:opacity-90 transition"
            />
          </button>
        ))}
      </div>

      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <img src={lightbox} alt="Full size" className="max-w-full max-h-full rounded-lg" />
          <button
            className="absolute top-4 right-4 p-2 rounded-lg bg-white/10 text-white hover:bg-white/20"
            onClick={() => setLightbox(null)}
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      )}
    </>
  );
}

function CommentsSection({ postId, currentUserId }: { postId: string; currentUserId: string }) {
  const { comments, loading, addComment, deleteComment } = useComments(postId);
  const [input, setInput] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);

  async function handleSubmit() {
    if (!input.trim()) return;
    await addComment(input.trim(), replyingTo ?? undefined);
    setInput('');
    setReplyingTo(null);
  }

  function formatTime(dateStr: string) {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const mins = Math.floor(diff / (1000 * 60));
    if (mins < 1) return 'now';
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  return (
    <div className="border-t border-slate-100 dark:border-slate-800 p-4 bg-slate-50/50 dark:bg-slate-800/30">
      {loading ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
        </div>
      ) : (
        <div className="space-y-3 mb-3">
          {comments.length === 0 && (
            <p className="text-sm text-slate-400 text-center py-2">No comments yet</p>
          )}
          {comments.map((c) => (
            <CommentItem
              key={c.id}
              comment={c}
              currentUserId={currentUserId}
              formatTime={formatTime}
              onReply={(id) => { setReplyingTo(id); setInput(''); }}
              onDelete={deleteComment}
              replyingTo={replyingTo}
              setReplyingTo={setReplyingTo}
            />
          ))}
        </div>
      )}

      {/* Comment input */}
      <div className="flex items-center gap-2">
        {replyingTo && (
          <button
            onClick={() => setReplyingTo(null)}
            className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1"
          >
            <X className="w-3 h-3" />
            Cancel reply
          </button>
        )}
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
          placeholder="Write a comment..."
          className="flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition"
        />
        <button
          onClick={handleSubmit}
          disabled={!input.trim()}
          className="w-9 h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center hover:bg-teal-700 active:scale-95 transition disabled:opacity-40 flex-shrink-0"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function CommentItem({
  comment,
  currentUserId,
  formatTime,
  onReply,
  onDelete,
  replyingTo,
  setReplyingTo,
}: {
  comment: CommentWithMeta;
  currentUserId: string;
  formatTime: (d: string) => string;
  onReply: (id: string) => void;
  onDelete: (id: string) => void;
  replyingTo: string | null;
  setReplyingTo: (id: string | null) => void;
}) {
  const isOwn = comment.author_id === currentUserId;
  const initials = (comment.author?.full_name || '?').slice(0, 2).toUpperCase();

  return (
    <div>
      <div className="flex items-start gap-2.5">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-500 to-slate-700 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="bg-white dark:bg-slate-800 rounded-xl px-3 py-2 inline-block">
            <span className="text-xs font-semibold text-slate-900 dark:text-white">{comment.author?.full_name ?? 'Unknown'}</span>
            <p className="text-sm text-slate-700 dark:text-slate-300 mt-0.5">{comment.content}</p>
          </div>
          <div className="flex items-center gap-3 mt-1 ml-1">
            <span className="text-xs text-slate-400">{formatTime(comment.created_at)}</span>
            <button
              onClick={() => onReply(comment.id)}
              className="text-xs text-slate-400 hover:text-teal-600 font-medium"
            >
              Reply
            </button>
            {isOwn && (
              <button
                onClick={() => onDelete(comment.id)}
                className="text-xs text-slate-400 hover:text-rose-600 font-medium"
              >
                Delete
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Replies */}
      {comment.replies.length > 0 && (
        <div className="ml-10 mt-2 space-y-2">
          {comment.replies.map((reply) => {
            const replyInitials = (reply.author?.full_name || '?').slice(0, 2).toUpperCase();
            const replyIsOwn = reply.author_id === currentUserId;
            return (
              <div key={reply.id} className="flex items-start gap-2.5">
                <CornerDownRight className="w-4 h-4 text-slate-300 dark:text-slate-600 flex-shrink-0 mt-1" />
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-slate-500 to-slate-700 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                  {replyInitials}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="bg-white dark:bg-slate-800 rounded-xl px-3 py-2 inline-block">
                    <span className="text-xs font-semibold text-slate-900 dark:text-white">{reply.author?.full_name ?? 'Unknown'}</span>
                    <p className="text-sm text-slate-700 dark:text-slate-300 mt-0.5">{reply.content}</p>
                  </div>
                  <div className="flex items-center gap-3 mt-1 ml-1">
                    <span className="text-xs text-slate-400">{formatTime(reply.created_at)}</span>
                    {replyIsOwn && (
                      <button
                        onClick={() => onDelete(reply.id)}
                        className="text-xs text-slate-400 hover:text-rose-600 font-medium"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ComposerModal({ onClose, onPosted }: { onClose: () => void; onPosted: () => void }) {
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    setError(null);

    for (const file of files) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        setError('Only JPG, PNG, WebP, and GIF images are allowed.');
        return;
      }
      if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        setError(`Each image must be under ${MAX_SIZE_MB} MB.`);
        return;
      }
    }

    const remaining = MAX_IMAGES - images.length;
    const toAdd = files.slice(0, remaining);
    if (files.length > remaining) {
      setError(`You can add up to ${MAX_IMAGES} images per post.`);
    }

    setImages((prev) => [...prev, ...toAdd]);
    setImagePreviews((prev) => [...prev, ...toAdd.map((f) => URL.createObjectURL(f))]);
  }

  function removeImage(idx: number) {
    setImages((prev) => prev.filter((_, i) => i !== idx));
    setImagePreviews((prev) => {
      URL.revokeObjectURL(prev[idx]);
      return prev.filter((_, i) => i !== idx);
    });
  }

  async function handlePost() {
    if (!content.trim() && images.length === 0) return;
    if (!user) return;

    setPosting(true);
    setError(null);

    const id = await createPost(user.id, content, images);
    if (id) {
      onPosted();
    } else {
      setError('Could not create the post. Please try again.');
    }
    setPosting(false);
  }

  useEffect(() => {
    return () => {
      imagePreviews.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Create post</h2>
          <button onClick={onClose} className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Share something with the campus..."
            rows={4}
            autoFocus
            className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition resize-none"
          />

          {/* Image previews */}
          {imagePreviews.length > 0 && (
            <div className="grid grid-cols-4 gap-2 mt-3">
              {imagePreviews.map((url, idx) => (
                <div key={idx} className="relative group">
                  <img src={url} alt={`Preview ${idx + 1}`} className="w-full h-20 object-cover rounded-lg" />
                  <button
                    onClick={() => removeImage(idx)}
                    className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Image upload button */}
          {images.length < MAX_IMAGES && (
            <button
              onClick={() => fileRef.current?.click()}
              className="mt-3 flex items-center gap-2 px-3 py-2 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-sm text-slate-500 hover:border-teal-400 hover:text-teal-600 transition"
            >
              <ImagePlus className="w-4 h-4" />
              Add image ({images.length}/{MAX_IMAGES})
            </button>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />

          {error && (
            <p className="text-sm text-rose-600 dark:text-rose-400 mt-3">{error}</p>
          )}

          <button
            onClick={handlePost}
            disabled={(!content.trim() && images.length === 0) || posting}
            className="w-full mt-4 py-3 rounded-xl bg-teal-600 text-white font-semibold hover:bg-teal-700 active:scale-95 transition disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {posting && <Loader2 className="w-5 h-5 animate-spin" />}
            Post
          </button>
        </div>
      </div>
    </div>
  );
}

function ReportModal({
  targetType,
  targetId,
  onClose,
}: {
  targetType: 'post' | 'comment';
  targetId: string;
  onClose: () => void;
}) {
  const { user } = useAuth();
  const [reason, setReason] = useState('Inappropriate content');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const reasons = [
    'Inappropriate content',
    'Harassment or bullying',
    'Spam or misleading',
    'Hate speech',
    'Other',
  ];

  async function handleSubmit() {
    if (!user) return;
    setSubmitting(true);
    const success = await reportContent(user.id, targetType, targetId, reason);
    setSubmitting(false);
    if (success) {
      setDone(true);
      setTimeout(onClose, 1500);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Report content</h2>
          <button onClick={onClose} className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4">
          {done ? (
            <div className="text-center py-4">
              <Shield className="w-10 h-10 text-teal-500 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-900 dark:text-white">Report submitted</p>
              <p className="text-xs text-slate-400 mt-1">An admin will review this content.</p>
            </div>
          ) : (
            <>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">Why are you reporting this?</p>
              <div className="space-y-2">
                {reasons.map((r) => (
                  <button
                    key={r}
                    onClick={() => setReason(r)}
                    className={`w-full text-left px-3 py-2.5 rounded-xl text-sm transition ${
                      reason === r
                        ? 'bg-teal-50 dark:bg-teal-950/30 text-teal-600 dark:text-teal-400 font-medium border border-teal-200 dark:border-teal-800'
                        : 'border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>

              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="w-full mt-4 py-2.5 rounded-xl bg-rose-600 text-white text-sm font-semibold hover:bg-rose-700 active:scale-95 transition disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                Submit report
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
