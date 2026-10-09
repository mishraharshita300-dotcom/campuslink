import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import type { ConversationWithMeta, Message, Profile } from '@/lib/types';

const PAGE_SIZE = 30;

export function useConversations() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<ConversationWithMeta[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchConversations = useCallback(async () => {
    if (!user) return;

    const { data: convs, error } = await supabase
      .from('conversations')
      .select('id, is_group, created_at, last_message_at')
      .order('last_message_at', { ascending: false });

    if (error || !convs) {
      console.error('Error fetching conversations:', error?.message);
      setLoading(false);
      return;
    }

    if (convs.length === 0) {
      setConversations([]);
      setLoading(false);
      return;
    }

    const convIds = convs.map((c) => c.id);

    const [participantsRes, messagesRes, readsRes] = await Promise.all([
      supabase
        .from('conversation_participants')
        .select('id, conversation_id, user_id, joined_at')
        .in('conversation_id', convIds),
      supabase
        .from('messages')
        .select('id, conversation_id, sender_id, content, created_at, deleted_at')
        .in('conversation_id', convIds)
        .order('created_at', { ascending: false }),
      supabase
        .from('message_reads')
        .select('id, conversation_id, user_id, last_read_at')
        .eq('user_id', user.id)
        .in('conversation_id', convIds),
    ]);

    const otherUserIds = (participantsRes.data ?? [])
      .filter((p) => p.user_id !== user.id)
      .map((p) => p.user_id);

    let otherUsersMap: Record<string, Profile> = {};
    if (otherUserIds.length > 0) {
      const { data: users } = await supabase
        .from('profiles')
        .select('*')
        .in('id', otherUserIds);
      (users ?? []).forEach((u) => {
        otherUsersMap[u.id] = u as Profile;
      });
    }

    const messagesByConv: Record<string, Message[]> = {};
    (messagesRes.data ?? []).forEach((m) => {
      if (!messagesByConv[m.conversation_id]) messagesByConv[m.conversation_id] = [];
      messagesByConv[m.conversation_id].push(m as Message);
    });

    const readsMap: Record<string, string> = {};
    (readsRes.data ?? []).forEach((r) => {
      readsMap[r.conversation_id] = r.last_read_at;
    });

    const result: ConversationWithMeta[] = convs.map((conv) => {
      const otherParticipant = (participantsRes.data ?? []).find(
        (p) => p.conversation_id === conv.id && p.user_id !== user.id
      );
      const convMessages = messagesByConv[conv.id] ?? [];
      const lastMessage = convMessages[0] ?? null;
      const lastReadAt = readsMap[conv.id];
      const unreadCount = lastReadAt
        ? convMessages.filter((m) => m.sender_id !== user.id && new Date(m.created_at) > new Date(lastReadAt)).length
        : convMessages.filter((m) => m.sender_id !== user.id).length;

      return {
        ...conv,
        other_user: otherParticipant ? (otherUsersMap[otherParticipant.user_id] ?? null) : null,
        last_message: lastMessage,
        unread_count: unreadCount,
      };
    });

    setConversations(result);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchConversations();

    if (!user) return;

    const channel = supabase
      .channel('conversations-changes')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        () => fetchConversations()
      )
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'conversations' },
        () => fetchConversations()
      )
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'conversation_participants' },
        () => fetchConversations()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchConversations, user]);

  return { conversations, loading, refetch: fetchConversations };
}

export function useMessages(conversationId: string | null) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchMessages = useCallback(async (reset = true) => {
    if (!conversationId) return;

    if (reset) {
      setLoading(true);
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false })
        .limit(PAGE_SIZE);

      if (error) {
        console.error('Error fetching messages:', error.message);
      } else {
        setMessages((data as Message[]) ?? []);
        setHasMore((data?.length ?? 0) === PAGE_SIZE);
      }
      setLoading(false);
    }
  }, [conversationId]);

  const loadMore = useCallback(async () => {
    if (!conversationId || loadingMore || !hasMore) return;

    setLoadingMore(true);
    const oldest = messages[messages.length - 1];

    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .lt('created_at', oldest.created_at)
      .order('created_at', { ascending: false })
      .limit(PAGE_SIZE);

    if (error) {
      console.error('Error loading more:', error.message);
    } else {
      const older = (data as Message[]) ?? [];
      setMessages((prev) => [...prev, ...older]);
      setHasMore(older.length === PAGE_SIZE);
    }
    setLoadingMore(false);
  }, [conversationId, messages, loadingMore, hasMore]);

  useEffect(() => {
    fetchMessages(true);
  }, [fetchMessages]);

  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`messages-${conversationId}`)
      .on('postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          setMessages((prev) => {
            const newMsg = payload.new as Message;
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [newMsg, ...prev];
          });
        }
      )
      .on('postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const updated = payload.new as Message;
          setMessages((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  const markAsRead = useCallback(async () => {
    if (!conversationId || !user) return;

    await supabase
      .from('message_reads')
      .upsert(
        { conversation_id: conversationId, user_id: user.id, last_read_at: new Date().toISOString() },
        { onConflict: 'conversation_id,user_id' }
      );
  }, [conversationId, user]);

  return { messages, loading, hasMore, loadingMore, loadMore, markAsRead };
}

export function useUserSearch() {
  const { user } = useAuth();
  const [results, setResults] = useState<Profile[]>([]);
  const [searching, setSearching] = useState(false);

  async function search(query: string) {
    if (!query.trim() || !user) {
      setResults([]);
      return;
    }

    setSearching(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .neq('id', user.id)
      .or(`full_name.ilike.%${query}%,email.ilike.%${query}%`)
      .limit(10);

    if (error) {
      console.error('Search error:', error.message);
    } else {
      setResults((data as Profile[]) ?? []);
    }
    setSearching(false);
  }

  return { results, searching, search };
}

export async function findOrCreateConversation(
  currentUserId: string,
  otherUserId: string
): Promise<string | null> {
  const { data: myConvs } = await supabase
    .from('conversation_participants')
    .select('conversation_id')
    .eq('user_id', currentUserId);

  if (myConvs && myConvs.length > 0) {
    const convIds = myConvs.map((p) => p.conversation_id);
    const { data: shared } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', otherUserId)
      .in('conversation_id', convIds)
      .maybeSingle();

    if (shared) {
      return shared.conversation_id;
    }
  }

  const { data: conv, error: convError } = await supabase
    .from('conversations')
    .insert({ is_group: false })
    .select('id')
    .single();

  if (convError || !conv) {
    console.error('Error creating conversation:', convError?.message);
    return null;
  }

  const { error: p1Error } = await supabase
    .from('conversation_participants')
    .insert({ conversation_id: conv.id, user_id: currentUserId });

  const { error: p2Error } = await supabase
    .from('conversation_participants')
    .insert({ conversation_id: conv.id, user_id: otherUserId });

  if (p1Error || p2Error) {
    console.error('Error adding participants:', p1Error?.message, p2Error?.message);
    return null;
  }

  return conv.id;
}
