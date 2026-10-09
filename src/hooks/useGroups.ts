import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import type { Group, GroupMember, GroupWithMeta, Message, Profile, GroupType } from '@/lib/types';

const PAGE_SIZE = 30;

export function useGroups() {
  const { user } = useAuth();
  const [groups, setGroups] = useState<GroupWithMeta[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchGroups = useCallback(async () => {
    if (!user) return;

    const { data: myMemberships } = await supabase
      .from('group_members')
      .select('group_id, role')
      .eq('user_id', user.id);

    if (!myMemberships || myMemberships.length === 0) {
      setGroups([]);
      setLoading(false);
      return;
    }

    const groupIds = myMemberships.map((m) => m.group_id);
    const roleMap: Record<string, 'admin' | 'member'> = {};
    myMemberships.forEach((m) => { roleMap[m.group_id] = m.role as 'admin' | 'member'; });

    const { data: groupRows } = await supabase
      .from('groups')
      .select('*')
      .in('id', groupIds)
      .order('last_message_at', { ascending: false });

    if (!groupRows || groupRows.length === 0) {
      setGroups([]);
      setLoading(false);
      return;
    }

    const { data: memberCounts } = await supabase
      .from('group_members')
      .select('group_id')
      .in('group_id', groupIds);

    const countMap: Record<string, number> = {};
    (memberCounts ?? []).forEach((m) => {
      countMap[m.group_id] = (countMap[m.group_id] ?? 0) + 1;
    });

    const { data: lastMsgs } = await supabase
      .from('messages')
      .select('*')
      .in('group_id', groupIds)
      .order('created_at', { ascending: false });

    const lastMsgMap: Record<string, Message> = {};
    (lastMsgs ?? []).forEach((m) => {
      if (!lastMsgMap[m.group_id]) lastMsgMap[m.group_id] = m as Message;
    });

    const result: GroupWithMeta[] = (groupRows as Group[]).map((g) => ({
      ...g,
      member_count: countMap[g.id] ?? 0,
      last_message: lastMsgMap[g.id] ?? null,
      my_role: roleMap[g.id] ?? null,
      is_member: true,
    }));

    setGroups(result);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchGroups();

    if (!user) return;

    const channel = supabase
      .channel('groups-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages', filter: `group_id=not.null` }, () => fetchGroups())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'groups' }, () => fetchGroups())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'group_members' }, () => fetchGroups())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchGroups, user]);

  return { groups, loading, refetch: fetchGroups };
}

export function useGroupMessages(groupId: string | null) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchMessages = useCallback(async () => {
    if (!groupId) return;

    setLoading(true);
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('group_id', groupId)
      .order('created_at', { ascending: false })
      .limit(PAGE_SIZE);

    if (error) {
      console.error('Error fetching group messages:', error.message);
    } else {
      setMessages((data as Message[]) ?? []);
      setHasMore((data?.length ?? 0) === PAGE_SIZE);
    }
    setLoading(false);
  }, [groupId]);

  const loadMore = useCallback(async () => {
    if (!groupId || loadingMore || !hasMore) return;

    setLoadingMore(true);
    const oldest = messages[messages.length - 1];

    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('group_id', groupId)
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
  }, [groupId, messages, loadingMore, hasMore]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  useEffect(() => {
    if (!groupId) return;

    const channel = supabase
      .channel(`group-messages-${groupId}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `group_id=eq.${groupId}` },
        (payload) => {
          setMessages((prev) => {
            const newMsg = payload.new as Message;
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [newMsg, ...prev];
          });
        }
      )
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages', filter: `group_id=eq.${groupId}` },
        (payload) => {
          const updated = payload.new as Message;
          setMessages((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [groupId]);

  return { messages, loading, hasMore, loadingMore, loadMore };
}

export function useGroupMembers(groupId: string | null) {
  const [members, setMembers] = useState<(GroupMember & { profile: Profile })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!groupId) return;

    (async () => {
      setLoading(true);
      const { data: memberRows, error } = await supabase
        .from('group_members')
        .select('*')
        .eq('group_id', groupId)
        .order('joined_at', { ascending: true });

      if (error || !memberRows) {
        setMembers([]);
        setLoading(false);
        return;
      }

      const userIds = memberRows.map((m) => m.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .in('id', userIds);

      const profileMap: Record<string, Profile> = {};
      (profiles ?? []).forEach((p) => { profileMap[p.id] = p as Profile; });

      const result = (memberRows as GroupMember[]).map((m) => ({
        ...m,
        profile: profileMap[m.user_id],
      }));

      setMembers(result);
      setLoading(false);
    })();
  }, [groupId]);

  return { members, loading };
}

export async function createGroup(
  creatorId: string,
  name: string,
  description: string,
  groupType: GroupType,
  isAnnouncement: boolean
): Promise<string | null> {
  const { data: group, error } = await supabase
    .from('groups')
    .insert({
      name,
      description: description || null,
      group_type: groupType,
      is_announcement: isAnnouncement,
      created_by: creatorId,
    })
    .select('id')
    .single();

  if (error || !group) {
    console.error('Error creating group:', error?.message);
    return null;
  }

  const { error: memberError } = await supabase
    .from('group_members')
    .insert({ group_id: group.id, user_id: creatorId, role: 'admin' });

  if (memberError) {
    console.error('Error adding creator as admin:', memberError.message);
    return null;
  }

  return group.id;
}

export async function joinGroupByCode(userId: string, inviteCode: string): Promise<{ groupId: string | null; error: string | null }> {
  const code = inviteCode.trim().toUpperCase();

  const { data: group, error } = await supabase
    .from('groups')
    .select('id')
    .eq('invite_code', code)
    .maybeSingle();

  if (error || !group) {
    return { groupId: null, error: 'Invalid invite code. Please check and try again.' };
  }

  const { data: existing } = await supabase
    .from('group_members')
    .select('id')
    .eq('group_id', group.id)
    .eq('user_id', userId)
    .maybeSingle();

  if (existing) {
    return { groupId: group.id, error: null };
  }

  const { error: joinError } = await supabase
    .from('group_members')
    .insert({ group_id: group.id, user_id: userId, role: 'member' });

  if (joinError) {
    return { groupId: null, error: joinError.message };
  }

  return { groupId: group.id, error: null };
}

export async function leaveGroup(userId: string, groupId: string): Promise<boolean> {
  const { error } = await supabase
    .from('group_members')
    .delete()
    .eq('group_id', groupId)
    .eq('user_id', userId);

  return !error;
}

export async function sendGroupMessage(userId: string, groupId: string, content: string): Promise<boolean> {
  const { error } = await supabase
    .from('messages')
    .insert({ group_id: groupId, sender_id: userId, content });

  if (error) {
    console.error('Error sending group message:', error.message);
    return false;
  }
  return true;
}
