import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useConversations, useMessages, useUserSearch, findOrCreateConversation } from '@/hooks/useChat';
import { supabase } from '@/lib/supabase';
import type { Profile } from '@/lib/types';
import {
  Search, Send, ArrowLeft, Loader2, MessageSquare, Plus, X,
} from 'lucide-react';

export default function ChatsPage() {
  const { user } = useAuth();
  const { conversations, loading, refetch } = useConversations();
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [showSearch, setShowSearch] = useState(false);

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
    <div className="flex h-[calc(100vh-0px)] lg:h-screen">
      {/* Conversation list */}
      <div className={`${activeConvId ? 'hidden lg:flex' : 'flex'} flex-col w-full lg:w-80 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900`}>
        <div className="p-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-lg font-bold text-slate-900 dark:text-white">Messages</h1>
            <button
              onClick={() => setShowSearch(true)}
              className="w-9 h-9 rounded-lg bg-teal-50 dark:bg-teal-950/30 text-teal-600 dark:text-teal-400 flex items-center justify-center hover:bg-teal-100 dark:hover:bg-teal-950/50 transition"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
            </div>
          ) : conversations.length === 0 ? (
            <div className="text-center py-12 px-4">
              <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-3">
                <MessageSquare className="w-7 h-7 text-slate-400" />
              </div>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">No conversations yet</p>
              <p className="text-xs text-slate-400 mt-1">Click + to start chatting</p>
            </div>
          ) : (
            <div className="space-y-0.5 px-2">
              {conversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => setActiveConvId(conv.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl transition text-left ${
                    activeConvId === conv.id
                      ? 'bg-teal-50 dark:bg-teal-950/30'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="w-11 h-11 rounded-full bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                    {(conv.other_user?.full_name || '?').slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                        {conv.other_user?.full_name || 'Unknown'}
                      </span>
                      {conv.last_message && (
                        <span className="text-xs text-slate-400 flex-shrink-0">
                          {formatTime(conv.last_message.created_at)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-2 mt-0.5">
                      <span className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        {conv.last_message
                          ? (conv.last_message.sender_id === user?.id ? 'You: ' : '') + conv.last_message.content
                          : 'No messages yet'}
                      </span>
                      {conv.unread_count > 0 && (
                        <span className="flex-shrink-0 bg-teal-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 px-1.5 flex items-center justify-center">
                          {conv.unread_count}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Chat view */}
      <div className={`${activeConvId ? 'flex' : 'hidden lg:flex'} flex-1 flex-col bg-slate-50 dark:bg-slate-950`}>
        {activeConvId ? (
          <ChatView
            conversationId={activeConvId}
            onBack={() => setActiveConvId(null)}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="w-8 h-8 text-slate-400" />
              </div>
              <p className="text-slate-500 dark:text-slate-400">Select a conversation or start a new one</p>
            </div>
          </div>
        )}
      </div>

      {/* New conversation search modal */}
      {showSearch && (
        <UserSearchModal
          onClose={() => setShowSearch(false)}
          onSelect={async (selectedUser) => {
            if (!user) return;
            const convId = await findOrCreateConversation(user.id, selectedUser.id);
            if (convId) {
              setActiveConvId(convId);
              setShowSearch(false);
              refetch();
            }
          }}
        />
      )}
    </div>
  );
}

function ChatView({ conversationId, onBack }: { conversationId: string; onBack: () => void }) {
  const { user } = useAuth();
  const { messages, loading, hasMore, loadingMore, loadMore, markAsRead } = useMessages(conversationId);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [otherUser, setOtherUser] = useState<Profile | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch the other participant's profile
  useEffect(() => {
    (async () => {
      const { data: participants } = await supabase
        .from('conversation_participants')
        .select('user_id')
        .eq('conversation_id', conversationId)
        .neq('user_id', user!.id);

      if (participants && participants.length > 0) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', participants[0].user_id)
          .maybeSingle();
        setOtherUser(profile as Profile | null);
      }
    })();
  }, [conversationId, user]);

  // Mark as read when messages change
  useEffect(() => {
    if (messages.length > 0) {
      markAsRead();
    }
  }, [messages, markAsRead]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  async function handleSend() {
    if (!input.trim() || !user) return;

    const content = input.trim();
    setInput('');
    setSending(true);

    const { error } = await supabase
      .from('messages')
      .insert({ conversation_id: conversationId, sender_id: user.id, content });

    if (error) {
      console.error('Send error:', error.message);
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

  const sortedMessages = [...messages].sort((a, b) =>
    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  return (
    <>
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <button onClick={onBack} className="lg:hidden p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
          {(otherUser?.full_name || '?').slice(0, 2).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white truncate">
            {otherUser?.full_name || 'Loading...'}
          </h2>
          <p className="text-xs text-slate-400 capitalize">
            {otherUser?.role}
            {otherUser?.role === 'alumni' && otherUser?.alumni_verified ? ' · Verified' : ''}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
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
                const prevMsg = sortedMessages[idx - 1];
                const showAvatar = !prevMsg || prevMsg.sender_id !== msg.sender_id;

                return (
                  <div
                    key={msg.id}
                    className={`flex items-end gap-2 ${isOwn ? 'flex-row-reverse' : ''} ${showAvatar ? 'mt-3' : ''}`}
                  >
                    <div className={`w-8 h-8 rounded-full flex-shrink-0 ${showAvatar ? '' : 'invisible'}`}>
                      {!isOwn && (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-500 to-slate-700 flex items-center justify-center text-white text-xs font-bold">
                          {(otherUser?.full_name || '?').slice(0, 2).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className={`max-w-[70%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col`}>
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
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
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
      </div>
    </>
  );
}

function UserSearchModal({
  onClose,
  onSelect,
}: {
  onClose: () => void;
  onSelect: (user: Profile) => void;
}) {
  const { results, searching, search } = useUserSearch();
  const [query, setQuery] = useState('');

  function handleSearch(value: string) {
    setQuery(value);
    search(value);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">New conversation</h2>
          <button onClick={onClose} className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4">
          <div className="relative mb-4">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search by name or email..."
              autoFocus
              className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition"
            />
          </div>

          <div className="max-h-64 overflow-y-auto space-y-1">
            {searching ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
              </div>
            ) : results.length === 0 ? (
              <p className="text-center text-sm text-slate-400 py-6">
                {query ? 'No users found' : 'Start typing to search'}
              </p>
            ) : (
              results.map((p) => (
                <button
                  key={p.id}
                  onClick={() => onSelect(p)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition text-left"
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                    {p.full_name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{p.full_name}</p>
                    <p className="text-xs text-slate-400 capitalize">{p.role}</p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
