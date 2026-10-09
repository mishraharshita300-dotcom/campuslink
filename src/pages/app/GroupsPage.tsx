import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useGroups, useGroupMessages, useGroupMembers, createGroup, joinGroupByCode, leaveGroup, sendGroupMessage } from '@/hooks/useGroups';
import { supabase } from '@/lib/supabase';
import type { Group, GroupType, Profile } from '@/lib/types';
import {
  Users, Plus, Loader2, ArrowLeft, Send, Hash, BookOpen, Home, Megaphone,
  Settings, Copy, UserMinus, X, Search, Volume2, Shield,
} from 'lucide-react';

const typeIcons: Record<GroupType, typeof Users> = {
  course: BookOpen,
  club: Users,
  hostel: Home,
  general: Hash,
};

const typeColors: Record<GroupType, string> = {
  course: 'bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400',
  club: 'bg-purple-50 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400',
  hostel: 'bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400',
  general: 'bg-teal-50 dark:bg-teal-950/30 text-teal-600 dark:text-teal-400',
};

export default function GroupsPage() {
  const { user, profile } = useAuth();
  const { groups, loading, refetch } = useGroups();
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);

  function formatTime(dateStr: string) {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = diff / (1000 * 60 * 60);
    if (hours < 24) return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    if (hours < 48) return 'Yesterday';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  return (
    <div className="flex h-screen">
      {/* Group list */}
      <div className={`${activeGroupId ? 'hidden lg:flex' : 'flex'} flex-col w-full lg:w-80 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900`}>
        <div className="p-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-lg font-bold text-slate-900 dark:text-white">Groups</h1>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setShowJoin(true)}
                className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                title="Join with code"
              >
                <Hash className="w-5 h-5" />
              </button>
              <button
                onClick={() => setShowCreate(true)}
                className="w-9 h-9 rounded-lg bg-teal-50 dark:bg-teal-950/30 text-teal-600 dark:text-teal-400 flex items-center justify-center hover:bg-teal-100 dark:hover:bg-teal-950/50 transition"
                title="Create group"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
            </div>
          ) : groups.length === 0 ? (
            <div className="text-center py-12 px-4">
              <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-3">
                <Users className="w-7 h-7 text-slate-400" />
              </div>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">No groups yet</p>
              <p className="text-xs text-slate-400 mt-1">Create one or join with a code</p>
            </div>
          ) : (
            <div className="space-y-0.5 px-2">
              {groups.map((g) => {
                const Icon = typeIcons[g.group_type] ?? Hash;
                return (
                  <button
                    key={g.id}
                    onClick={() => setActiveGroupId(g.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl transition text-left ${
                      activeGroupId === g.id
                        ? 'bg-teal-50 dark:bg-teal-950/30'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${typeColors[g.group_type]}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-semibold text-slate-900 dark:text-white truncate">{g.name}</span>
                        {g.is_announcement && <Megaphone className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />}
                      </div>
                      <div className="flex items-center justify-between gap-2 mt-0.5">
                        <span className="text-xs text-slate-500 dark:text-slate-400 truncate">
                          {g.last_message ? g.last_message.content : `${g.member_count} members`}
                        </span>
                        {g.last_message && (
                          <span className="text-xs text-slate-400 flex-shrink-0">{formatTime(g.last_message.created_at)}</span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Group chat view */}
      <div className={`${activeGroupId ? 'flex' : 'hidden lg:flex'} flex-1 flex-col bg-slate-50 dark:bg-slate-950`}>
        {activeGroupId ? (
          <GroupChatView groupId={activeGroupId} onBack={() => setActiveGroupId(null)} />
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-slate-400" />
              </div>
              <p className="text-slate-500 dark:text-slate-400">Select a group or create a new one</p>
            </div>
          </div>
        )}
      </div>

      {showCreate && (
        <CreateGroupModal
          onClose={() => setShowCreate(false)}
          onCreated={(id) => {
            setShowCreate(false);
            setActiveGroupId(id);
            refetch();
          }}
        />
      )}

      {showJoin && (
        <JoinGroupModal
          onClose={() => setShowJoin(false)}
          onJoined={(id) => {
            setShowJoin(false);
            setActiveGroupId(id);
            refetch();
          }}
        />
      )}
    </div>
  );
}

function GroupChatView({ groupId, onBack }: { groupId: string; onBack: () => void }) {
  const { user, profile } = useAuth();
  const { messages, loading, hasMore, loadingMore, loadMore } = useGroupMessages(groupId);
  const { members, loading: membersLoading } = useGroupMembers(groupId);
  const [group, setGroup] = useState<Group | null>(null);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [copied, setCopied] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('groups')
        .select('*')
        .eq('id', groupId)
        .maybeSingle();
      setGroup(data as Group | null);
    })();
  }, [groupId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const myMembership = members.find((m) => m.user_id === user?.id);
  const isGroupAdmin = myMembership?.role === 'admin';
  const isPlatformAdmin = profile?.role === 'admin';
  const canPostInAnnouncement = !group?.is_announcement || isGroupAdmin || isPlatformAdmin;

  // Build a map of sender profiles for message avatars
  const [senderProfiles, setSenderProfiles] = useState<Record<string, Profile>>({});
  useEffect(() => {
    (async () => {
      const senderIds = [...new Set(messages.map((m) => m.sender_id))];
      if (senderIds.length === 0) return;
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .in('id', senderIds);
      const map: Record<string, Profile> = {};
      (data ?? []).forEach((p) => { map[p.id] = p as Profile; });
      setSenderProfiles(map);
    })();
  }, [messages]);

  async function handleSend() {
    if (!input.trim() || !user) return;

    const content = input.trim();
    setInput('');
    setSending(true);

    const success = await sendGroupMessage(user.id, groupId, content);
    if (!success) {
      setInput(content);
    }
    setSending(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function copyInviteCode() {
    if (group) {
      navigator.clipboard.writeText(group.invite_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  async function handleLeave() {
    if (!user) return;
    const success = await leaveGroup(user.id, groupId);
    if (success) {
      onBack();
    }
  }

  const sortedMessages = [...messages].sort((a, b) =>
    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  const Icon = group ? typeIcons[group.group_type] : Hash;

  return (
    <>
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <button onClick={onBack} className="lg:hidden p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${group ? typeColors[group.group_type] : 'bg-slate-100'}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white truncate">{group?.name || 'Loading...'}</h2>
            {group?.is_announcement && (
              <span className="flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400">
                <Megaphone className="w-3 h-3" />
                Announcement
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400">{members.length} members</p>
        </div>
        <button
          onClick={() => setShowSettings(true)}
          className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
          </div>
        ) : sortedMessages.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-sm text-slate-400">No messages yet. Start the conversation!</p>
          </div>
        ) : (
          <>
            {hasMore && (
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="w-full text-center text-xs text-teal-600 dark:text-teal-400 font-medium py-2 hover:underline disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loadingMore && <Loader2 className="w-3 h-3 animate-spin" />}
                Load older messages
              </button>
            )}

            <div className="space-y-1">
              {sortedMessages.map((msg, idx) => {
                const isOwn = msg.sender_id === user?.id;
                const senderProfile = senderProfiles[msg.sender_id];
                const prevMsg = sortedMessages[idx - 1];
                const showHeader = !prevMsg || prevMsg.sender_id !== msg.sender_id ||
                  (new Date(msg.created_at).getTime() - new Date(prevMsg.created_at).getTime() > 5 * 60 * 1000);

                return (
                  <div key={msg.id} className={`flex items-end gap-2 ${isOwn ? 'flex-row-reverse' : ''} ${showHeader ? 'mt-3' : ''}`}>
                    <div className={`w-8 h-8 rounded-full flex-shrink-0 ${showHeader ? '' : 'invisible'}`}>
                      {!isOwn && (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-500 to-slate-700 flex items-center justify-center text-white text-xs font-bold">
                          {(senderProfile?.full_name || '?').slice(0, 2).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className={`max-w-[70%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col`}>
                      {showHeader && !isOwn && (
                        <span className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-0.5 ml-1">
                          {senderProfile?.full_name || 'Unknown'}
                          {senderProfile?.role === 'alumni' && senderProfile?.alumni_verified && (
                            <Shield className="w-3 h-3 inline ml-1 text-teal-500" />
                          )}
                        </span>
                      )}
                      <div
                        className={`px-4 py-2.5 rounded-2xl text-sm ${
                          isOwn
                            ? 'bg-teal-600 text-white rounded-br-md'
                            : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-bl-md border border-slate-100 dark:border-slate-700'
                        } ${msg.deleted_at ? 'italic opacity-50' : ''}`}
                      >
                        {msg.deleted_at ? 'Message deleted' : msg.content}
                      </div>
                      <span className={`text-xs text-slate-400 mt-0.5 ${isOwn ? 'text-right' : ''}`}>
                        {new Date(msg.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        {group?.is_announcement && !canPostInAnnouncement ? (
          <div className="flex items-center gap-2 py-3 px-4 rounded-xl bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 text-sm">
            <Volume2 className="w-4 h-4" />
            Only admins can post in announcement channels
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={group?.is_announcement ? 'Post an announcement...' : 'Type a message...'}
              className="flex-1 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || sending}
              className="w-11 h-11 rounded-xl bg-teal-600 text-white flex items-center justify-center hover:bg-teal-700 active:scale-95 transition disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>

      {/* Settings panel */}
      {showSettings && group && (
        <GroupSettingsPanel
          group={group}
          members={members}
          membersLoading={membersLoading}
          isGroupAdmin={isGroupAdmin ?? false}
          isPlatformAdmin={isPlatformAdmin ?? false}
          currentUserId={user?.id ?? ''}
          copied={copied}
          onCopyCode={copyInviteCode}
          onLeave={handleLeave}
          onClose={() => setShowSettings(false)}
        />
      )}
    </>
  );
}

function GroupSettingsPanel({
  group, members, membersLoading, isGroupAdmin, isPlatformAdmin, currentUserId,
  copied, onCopyCode, onLeave, onClose,
}: {
  group: Group;
  members: (import('@/lib/types').GroupMember & { profile: Profile })[];
  membersLoading: boolean;
  isGroupAdmin: boolean;
  isPlatformAdmin: boolean;
  currentUserId: string;
  copied: boolean;
  onCopyCode: () => void;
  onLeave: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden max-h-[70vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Group settings</h2>
          <button onClick={onClose} className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto p-4 space-y-4">
          {/* Group info */}
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">{group.name}</p>
            {group.description && <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{group.description}</p>}
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 capitalize">{group.group_type}</span>
              {group.is_announcement && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400">Announcement</span>
              )}
            </div>
          </div>

          {/* Invite code */}
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Invite code</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 px-3 py-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-sm tracking-wider">
                {group.invite_code}
              </code>
              <button
                onClick={onCopyCode}
                className="p-2.5 rounded-lg bg-teal-50 dark:bg-teal-950/30 text-teal-600 dark:text-teal-400 hover:bg-teal-100 dark:hover:bg-teal-950/50 transition"
              >
                {copied ? <Shield className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
              </button>
            </div>
            <p className="text-xs text-slate-400 mt-1.5">Share this code so others can join the group.</p>
          </div>

          {/* Members */}
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Members ({members.length})</p>
            {membersLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
              </div>
            ) : (
              <div className="space-y-1">
                {members.map((m) => (
                  <div key={m.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                      {m.profile?.full_name?.slice(0, 2).toUpperCase() ?? '??'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                        {m.profile?.full_name ?? 'Unknown'}
                        {m.user_id === currentUserId && <span className="text-slate-400 text-xs ml-1">(you)</span>}
                      </p>
                      <p className="text-xs text-slate-400 capitalize">{m.profile?.role}</p>
                    </div>
                    {m.role === 'admin' && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-teal-50 dark:bg-teal-950/30 text-teal-600 dark:text-teal-400 font-medium">Admin</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Leave group */}
          {isGroupAdmin && members.length > 1 && (
            <p className="text-xs text-slate-400">Transfer admin rights to another member before leaving.</p>
          )}
          {(!isGroupAdmin || members.length === 1) && (
            <button
              onClick={onLeave}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 text-sm font-medium hover:bg-rose-50 dark:hover:bg-rose-950/20 transition"
            >
              <UserMinus className="w-4 h-4" />
              Leave group
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function CreateGroupModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (groupId: string) => void;
}) {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [groupType, setGroupType] = useState<GroupType>('course');
  const [isAnnouncement, setIsAnnouncement] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    if (!name.trim() || !user) return;

    setCreating(true);
    setError(null);

    const id = await createGroup(user.id, name.trim(), description.trim(), groupType, isAnnouncement);
    if (id) {
      onCreated(id);
    } else {
      setError('Could not create the group. Please try again.');
    }
    setCreating(false);
  }

  const types: { value: GroupType; label: string; icon: typeof BookOpen }[] = [
    { value: 'course', label: 'Course', icon: BookOpen },
    { value: 'club', label: 'Club', icon: Users },
    { value: 'hostel', label: 'Hostel', icon: Home },
    { value: 'general', label: 'General', icon: Hash },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Create group</h2>
          <button onClick={onClose} className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Group name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="CS 101 Study Group"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Description (optional)</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="A group for studying CS 101"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Type</label>
            <div className="grid grid-cols-4 gap-2">
              {types.map((t) => {
                const Icon = t.icon;
                return (
                  <button
                    key={t.value}
                    onClick={() => setGroupType(t.value)}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition ${
                      groupType === t.value
                        ? 'border-teal-500 bg-teal-50 dark:bg-teal-950/30'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${groupType === t.value ? 'text-teal-600 dark:text-teal-400' : 'text-slate-400'}`} />
                    <span className={`text-xs ${groupType === t.value ? 'text-teal-600 dark:text-teal-400 font-medium' : 'text-slate-500'}`}>{t.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition">
              <input
                type="checkbox"
                checked={isAnnouncement}
                onChange={(e) => setIsAnnouncement(e.target.checked)}
                className="w-4 h-4 accent-teal-600"
              />
              <div>
                <div className="flex items-center gap-1.5">
                  <Megaphone className="w-4 h-4 text-amber-500" />
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Announcement channel</span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">Only admins can post. Others can read.</p>
              </div>
            </label>
          </div>

          {error && (
            <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>
          )}

          <button
            onClick={handleCreate}
            disabled={!name.trim() || creating}
            className="w-full py-3 rounded-xl bg-teal-600 text-white font-semibold hover:bg-teal-700 active:scale-95 transition disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {creating && <Loader2 className="w-5 h-5 animate-spin" />}
            Create group
          </button>
        </div>
      </div>
    </div>
  );
}

function JoinGroupModal({
  onClose,
  onJoined,
}: {
  onClose: () => void;
  onJoined: (groupId: string) => void;
}) {
  const { user } = useAuth();
  const [code, setCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleJoin() {
    if (!code.trim() || !user) return;

    setJoining(true);
    setError(null);

    const { groupId, error } = await joinGroupByCode(user.id, code);
    if (error) {
      setError(error);
    } else if (groupId) {
      onJoined(groupId);
    }
    setJoining(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Join group</h2>
          <button onClick={onClose} className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Invite code</label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="ABCD1234"
              maxLength={8}
              autoFocus
              className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition font-mono text-center text-lg tracking-widest"
            />
            <p className="text-xs text-slate-400 mt-1.5">Ask the group admin for the invite code.</p>
          </div>

          {error && (
            <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>
          )}

          <button
            onClick={handleJoin}
            disabled={!code.trim() || joining}
            className="w-full py-3 rounded-xl bg-teal-600 text-white font-semibold hover:bg-teal-700 active:scale-95 transition disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {joining && <Loader2 className="w-5 h-5 animate-spin" />}
            Join group
          </button>
        </div>
      </div>
    </div>
  );
}
