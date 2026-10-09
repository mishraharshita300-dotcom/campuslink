import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useNotifications, useConnections, respondToConnection } from '@/hooks/useAlumni';
import type { NotificationWithMeta, Connection } from '@/lib/types';
import {
  Bell, Loader2, CheckCheck, UserPlus, UserCheck, UserX, Heart,
  MessageCircle, CornerDownRight, ShieldCheck, ShieldX, Users, X, Check,
} from 'lucide-react';

export default function NotificationsPage() {
  const { user } = useAuth();
  const { notifications, loading, unreadCount, markAsRead, markAllRead } = useNotifications();
  const { connections } = useConnections();

  return (
    <div className="p-6 lg:p-8 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/30 flex items-center justify-center">
            <Bell className="w-5 h-5 text-teal-600 dark:text-teal-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Notifications</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {unreadCount > 0 ? `${unreadCount} unread` : 'You are all caught up'}
            </p>
          </div>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-teal-600 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-950/30 transition"
          >
            <CheckCheck className="w-4 h-4" />
            Mark all read
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
        </div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
            <Bell className="w-8 h-8 text-slate-400" />
          </div>
          <p className="text-slate-500 dark:text-slate-400 font-medium">No notifications yet</p>
          <p className="text-sm text-slate-400 mt-1">Connection requests and activity will appear here.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((notif) => (
            <NotificationItem
              key={notif.id}
              notif={notif}
              connections={connections}
              currentUserId={user?.id ?? ''}
              onMarkRead={() => markAsRead(notif.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function NotificationItem({
  notif,
  connections,
  currentUserId,
  onMarkRead,
}: {
  notif: NotificationWithMeta;
  connections: Connection[];
  currentUserId: string;
  onMarkRead: () => void;
}) {
  const [responding, setResponding] = useState(false);
  const [responded, setResponded] = useState(false);

  const icon = getNotifIcon(notif.type);
  const iconBg = getNotifIconBg(notif.type);

  // For connection requests, find the connection
  const connection = notif.type === 'connection_request'
    ? connections.find((c) => c.requester_id === notif.actor_id && c.target_id === currentUserId && c.status === 'pending')
    : null;

  async function handleRespond(accept: boolean) {
    if (!connection) return;
    setResponding(true);
    await respondToConnection(connection.id, currentUserId, connection.requester_id, accept);
    setResponding(false);
    setResponded(true);
    onMarkRead();
  }

  function handleClick() {
    if (!notif.read) {
      onMarkRead();
    }
  }

  return (
    <div
      onClick={handleClick}
      className={`flex items-start gap-3 p-4 rounded-2xl border transition cursor-pointer ${
        notif.read
          ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
          : 'bg-teal-50/50 dark:bg-teal-950/20 border-teal-200 dark:border-teal-900'
      }`}
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
        {icon}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {!notif.read && <div className="w-2 h-2 rounded-full bg-teal-500 flex-shrink-0" />}
          <p className="text-sm text-slate-700 dark:text-slate-300">
            <span className="font-semibold text-slate-900 dark:text-white">
              {notif.actor?.full_name ?? 'Someone'}
            </span>{' '}
            {getNotifText(notif.type)}
          </p>
        </div>
        {notif.content && (
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 italic">"{notif.content}"</p>
        )}
        <span className="text-xs text-slate-400 mt-1 block">{formatTime(notif.created_at)}</span>

        {/* Connection request actions */}
        {notif.type === 'connection_request' && connection && !responded && (
          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={(e) => { e.stopPropagation(); handleRespond(true); }}
              disabled={responding}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-600 text-white text-xs font-semibold hover:bg-teal-700 transition disabled:opacity-50"
            >
              <Check className="w-3.5 h-3.5" />
              Accept
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); handleRespond(false); }}
              disabled={responding}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition disabled:opacity-50"
            >
              <X className="w-3.5 h-3.5" />
              Reject
            </button>
            {responding && <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />}
          </div>
        )}

        {notif.type === 'connection_request' && responded && (
          <p className="text-xs text-slate-400 mt-2">Responded</p>
        )}
      </div>
    </div>
  );
}

function getNotifIcon(type: string) {
  switch (type) {
    case 'connection_request': return <UserPlus className="w-5 h-5 text-amber-600 dark:text-amber-400" />;
    case 'connection_accepted': return <UserCheck className="w-5 h-5 text-teal-600 dark:text-teal-400" />;
    case 'connection_rejected': return <UserX className="w-5 h-5 text-slate-400" />;
    case 'post_like': return <Heart className="w-5 h-5 text-rose-500" />;
    case 'post_comment': return <MessageCircle className="w-5 h-5 text-blue-500" />;
    case 'comment_reply': return <CornerDownRight className="w-5 h-5 text-blue-500" />;
    case 'admin_verified': return <ShieldCheck className="w-5 h-5 text-teal-500" />;
    case 'admin_rejected': return <ShieldX className="w-5 h-5 text-rose-500" />;
    case 'group_invite': return <Users className="w-5 h-5 text-purple-500" />;
    default: return <Bell className="w-5 h-5 text-slate-400" />;
  }
}

function getNotifIconBg(type: string) {
  switch (type) {
    case 'connection_request': return 'bg-amber-50 dark:bg-amber-950/30';
    case 'connection_accepted': return 'bg-teal-50 dark:bg-teal-950/30';
    case 'connection_rejected': return 'bg-slate-100 dark:bg-slate-800';
    case 'post_like': return 'bg-rose-50 dark:bg-rose-950/30';
    case 'post_comment':
    case 'comment_reply': return 'bg-blue-50 dark:bg-blue-950/30';
    case 'admin_verified': return 'bg-teal-50 dark:bg-teal-950/30';
    case 'admin_rejected': return 'bg-rose-50 dark:bg-rose-950/30';
    case 'group_invite': return 'bg-purple-50 dark:bg-purple-950/30';
    default: return 'bg-slate-100 dark:bg-slate-800';
  }
}

function getNotifText(type: string): string {
  switch (type) {
    case 'connection_request': return 'sent you a connection request';
    case 'connection_accepted': return 'accepted your connection request';
    case 'connection_rejected': return 'declined your connection request';
    case 'post_like': return 'liked your post';
    case 'post_comment': return 'commented on your post';
    case 'comment_reply': return 'replied to your comment';
    case 'admin_verified': return 'Your alumni account has been verified! You now have full access.';
    case 'admin_rejected': return 'Your alumni verification was not approved. Please contact support.';
    case 'group_invite': return 'invited you to join a group';
    default: return '';
  }
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const mins = Math.floor(diff / (1000 * 60));
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
