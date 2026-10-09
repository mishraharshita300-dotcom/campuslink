import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import type { Profile, Connection, Notification, NotificationWithMeta, ConnectionStatus } from '@/lib/types';

const PAGE_SIZE = 20;

// === Alumni Directory ===

export function useAlumniDirectory() {
  const { user } = useAuth();
  const [alumni, setAlumni] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('');
  const [gradYear, setGradYear] = useState('');

  const fetchAlumni = useCallback(async () => {
    setLoading(true);

    let query = supabase
      .from('profiles')
      .select('*')
      .eq('role', 'alumni')
      .eq('alumni_verified', true)
      .order('graduation_year', { ascending: false, nullsFirst: false })
      .order('full_name', { ascending: true });

    if (department) {
      query = query.eq('department', department);
    }
    if (gradYear) {
      query = query.eq('graduation_year', parseInt(gradYear));
    }

    const { data, error } = await query.limit(100);

    if (error || !data) {
      setAlumni([]);
      setLoading(false);
      return;
    }

    let results = data as Profile[];

    // Client-side search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      results = results.filter((p) =>
        p.full_name?.toLowerCase().includes(q) ||
        p.company?.toLowerCase().includes(q) ||
        p.job_title?.toLowerCase().includes(q) ||
        p.location?.toLowerCase().includes(q) ||
        p.department?.toLowerCase().includes(q)
      );
    }

    // Exclude self
    if (user) {
      results = results.filter((p) => p.id !== user.id);
    }

    setAlumni(results);
    setLoading(false);
  }, [search, department, gradYear, user]);

  useEffect(() => {
    fetchAlumni();
  }, [fetchAlumni]);

  return { alumni, loading, search, setSearch, department, setDepartment, gradYear, setGradYear, refetch: fetchAlumni };
}

// === Connections ===

export function useConnections() {
  const { user } = useAuth();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchConnections = useCallback(async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('connections')
      .select('*')
      .or(`requester_id.eq.${user.id},target_id.eq.${user.id}`)
      .order('created_at', { ascending: false });

    if (error || !data) {
      setConnections([]);
    } else {
      setConnections(data as Connection[]);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchConnections();

    if (!user) return;

    const channel = supabase
      .channel('connections-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'connections' }, () => fetchConnections())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchConnections, user]);

  return { connections, loading, refetch: fetchConnections };
}

export function getConnectionStatus(
  connections: Connection[],
  currentUserId: string,
  otherUserId: string
): 'none' | 'pending_sent' | 'pending_received' | 'connected' | 'rejected' {
  const conn = connections.find(
    (c) =>
      (c.requester_id === currentUserId && c.target_id === otherUserId) ||
      (c.requester_id === otherUserId && c.target_id === currentUserId)
  );

  if (!conn) return 'none';
  if (conn.status === 'accepted') return 'connected';
  if (conn.status === 'rejected') return 'rejected';
  if (conn.status === 'pending') {
    return conn.requester_id === currentUserId ? 'pending_sent' : 'pending_received';
  }
  return 'none';
}

export async function sendConnectionRequest(
  requesterId: string,
  targetId: string,
  message?: string
): Promise<boolean> {
  const { error } = await supabase
    .from('connections')
    .insert({
      requester_id: requesterId,
      target_id: targetId,
      message: message?.trim() || null,
    });

  if (error) {
    if (error.message.includes('duplicate')) {
      return false;
    }
    console.error('Connection request error:', error.message);
    return false;
  }

  // Create notification for target
  await supabase.from('notifications').insert({
    user_id: targetId,
    actor_id: requesterId,
    type: 'connection_request',
    entity_type: 'connection',
    content: message?.trim() || null,
  });

  return true;
}

export async function respondToConnection(
  connectionId: string,
  responderId: string,
  requesterId: string,
  accept: boolean
): Promise<boolean> {
  const status: ConnectionStatus = accept ? 'accepted' : 'rejected';

  const { error } = await supabase
    .from('connections')
    .update({ status, responded_at: new Date().toISOString() })
    .eq('id', connectionId);

  if (error) {
    console.error('Connection response error:', error.message);
    return false;
  }

  // Notify the requester
  await supabase.from('notifications').insert({
    user_id: requesterId,
    actor_id: responderId,
    type: accept ? 'connection_accepted' : 'connection_rejected',
    entity_type: 'connection',
  });

  return true;
}

// === Notifications ===

export function useNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<NotificationWithMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;

    const { data: notifRows, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error || !notifRows) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    const rows = notifRows as Notification[];
    setUnreadCount(rows.filter((n) => !n.read).length);

    // Fetch actor profiles
    const actorIds = [...new Set(rows.map((n) => n.actor_id))];
    let actorMap: Record<string, Profile> = {};
    if (actorIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .in('id', actorIds);
      (profiles ?? []).forEach((p) => { actorMap[p.id] = p as Profile; });
    }

    const result: NotificationWithMeta[] = rows.map((n) => ({
      ...n,
      actor: actorMap[n.actor_id] ?? null,
    }));

    setNotifications(result);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchNotifications();

    if (!user) return;

    const channel = supabase
      .channel('notifications-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, () => fetchNotifications())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchNotifications, user]);

  async function markAsRead(notificationId: string) {
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId)
      .eq('user_id', user!.id);
  }

  async function markAllRead() {
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', user!.id)
      .eq('read', false);
  }

  return { notifications, loading, unreadCount, markAsRead, markAllRead, refetch: fetchNotifications };
}

// === Admin: Alumni Verification ===

export function usePendingAlumni() {
  const { profile } = useAuth();
  const [pending, setPending] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPending = useCallback(async () => {
    if (profile?.role !== 'admin') {
      setPending([]);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'alumni')
      .eq('alumni_status', 'pending')
      .order('created_at', { ascending: true });

    if (error || !data) {
      setPending([]);
    } else {
      setPending(data as Profile[]);
    }
    setLoading(false);
  }, [profile]);

  useEffect(() => {
    fetchPending();
  }, [fetchPending]);

  return { pending, loading, refetch: fetchPending };
}

export async function verifyAlumni(adminId: string, alumniId: string, approved: boolean): Promise<boolean> {
  const { error } = await supabase
    .from('profiles')
    .update({
      alumni_verified: approved,
      alumni_status: approved ? 'approved' : 'rejected',
    })
    .eq('id', alumniId);

  if (error) {
    console.error('Verify alumni error:', error.message);
    return false;
  }

  // Notify the alumni user
  await supabase.from('notifications').insert({
    user_id: alumniId,
    actor_id: adminId,
    type: approved ? 'admin_verified' : 'admin_rejected',
    entity_type: 'profile',
  });

  return true;
}
