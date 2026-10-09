import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import type { Event, EventWithMeta, Rsvp, RsvpStatus, EventCategory, Profile } from '@/lib/types';

export function useEvents() {
  const { user } = useAuth();
  const [events, setEvents] = useState<EventWithMeta[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEvents = useCallback(async () => {
    setLoading(true);

    const { data: eventRows, error } = await supabase
      .from('events')
      .select('*')
      .gte('event_date', new Date().toISOString().split('T')[0])
      .order('event_date', { ascending: true })
      .order('start_time', { ascending: true })
      .limit(100);

    if (error || !eventRows) {
      setEvents([]);
      setLoading(false);
      return;
    }

    const events = eventRows as Event[];
    if (events.length === 0) {
      setEvents([]);
      setLoading(false);
      return;
    }

    const eventIds = events.map((e) => e.id);
    const creatorIds = [...new Set(events.map((e) => e.created_by))];

    const [rsvpsRes, creatorsRes] = await Promise.all([
      supabase.from('rsvps').select('*').in('event_id', eventIds),
      supabase.from('profiles').select('*').in('id', creatorIds),
    ]);

    const rsvpMap: Record<string, { going: number; interested: number; not_going: number; myStatus: RsvpStatus | null }> = {};
    (rsvpsRes.data ?? []).forEach((r) => {
      const rsvp = r as Rsvp;
      if (!rsvpMap[rsvp.event_id]) {
        rsvpMap[rsvp.event_id] = { going: 0, interested: 0, not_going: 0, myStatus: null };
      }
      rsvpMap[rsvp.event_id][rsvp.status]++;
      if (rsvp.user_id === user?.id) {
        rsvpMap[rsvp.event_id].myStatus = rsvp.status;
      }
    });

    const creatorMap: Record<string, Profile> = {};
    (creatorsRes.data ?? []).forEach((p) => { creatorMap[p.id] = p as Profile; });

    const result: EventWithMeta[] = events.map((e) => ({
      ...e,
      creator: creatorMap[e.created_by] ?? null,
      rsvp_counts: {
        going: rsvpMap[e.id]?.going ?? 0,
        interested: rsvpMap[e.id]?.interested ?? 0,
        not_going: rsvpMap[e.id]?.not_going ?? 0,
      },
      my_rsvp: rsvpMap[e.id]?.myStatus ?? null,
      is_creator: e.created_by === user?.id,
    }));

    setEvents(result);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchEvents();

    const channel = supabase
      .channel('events-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, () => fetchEvents())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rsvps' }, () => fetchEvents())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchEvents]);

  return { events, loading, refetch: fetchEvents };
}

export async function createEvent(
  creatorId: string,
  data: {
    title: string;
    description: string;
    category: EventCategory;
    location: string;
    eventDate: string;
    startTime: string;
    endTime: string;
    capacity: number | null;
    coverImageFile: File | null;
  }
): Promise<string | null> {
  let coverImageUrl: string | null = null;

  if (data.coverImageFile) {
    const ext = data.coverImageFile.name.split('.').pop()?.toLowerCase() ?? 'jpg';
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('event-covers')
      .upload(fileName, data.coverImageFile, { contentType: data.coverImageFile.type });

    if (!uploadError) {
      const { data: { publicUrl } } = supabase.storage
        .from('event-covers')
        .getPublicUrl(fileName);
      coverImageUrl = publicUrl;
    }
  }

  const { data: event, error } = await supabase
    .from('events')
    .insert({
      title: data.title,
      description: data.description || null,
      category: data.category,
      location: data.location || null,
      event_date: data.eventDate,
      start_time: data.startTime,
      end_time: data.endTime || null,
      capacity: data.capacity,
      cover_image_url: coverImageUrl,
      created_by: creatorId,
    })
    .select('id')
    .single();

  if (error || !event) {
    console.error('Create event error:', error?.message);
    return null;
  }

  // Auto-RSVP creator as going
  await supabase
    .from('rsvps')
    .insert({ event_id: event.id, user_id: creatorId, status: 'going' });

  return event.id;
}

export async function updateEvent(
  eventId: string,
  creatorId: string,
  data: {
    title: string;
    description: string;
    category: EventCategory;
    location: string;
    eventDate: string;
    startTime: string;
    endTime: string;
    capacity: number | null;
  }
): Promise<boolean> {
  const { error } = await supabase
    .from('events')
    .update({
      title: data.title,
      description: data.description || null,
      category: data.category,
      location: data.location || null,
      event_date: data.eventDate,
      start_time: data.startTime,
      end_time: data.endTime || null,
      capacity: data.capacity,
      updated_at: new Date().toISOString(),
    })
    .eq('id', eventId)
    .eq('created_by', creatorId);

  return !error;
}

export async function deleteEvent(eventId: string, userId: string, isAdmin: boolean): Promise<boolean> {
  let query = supabase.from('events').delete().eq('id', eventId);
  if (!isAdmin) {
    query = query.eq('created_by', userId);
  }
  const { error } = await query;
  return !error;
}

export async function setRsvp(eventId: string, userId: string, status: RsvpStatus): Promise<boolean> {
  // Check capacity for 'going'
  if (status === 'going') {
    const { data: event } = await supabase
      .from('events')
      .select('capacity')
      .eq('id', eventId)
      .maybeSingle();

    if (event?.capacity) {
      const { count } = await supabase
        .from('rsvps')
        .select('id', { count: 'exact', head: true })
        .eq('event_id', eventId)
        .eq('status', 'going');

      // Check current user's RSVP — if already going, they can re-save
      const { data: myRsvp } = await supabase
        .from('rsvps')
        .select('status')
        .eq('event_id', eventId)
        .eq('user_id', userId)
        .maybeSingle();

      if (myRsvp?.status !== 'going' && (count ?? 0) >= event.capacity) {
        return false;
      }
    }
  }

  // Upsert RSVP
  const { data: existing } = await supabase
    .from('rsvps')
    .select('id')
    .eq('event_id', eventId)
    .eq('user_id', userId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from('rsvps')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', existing.id);
    return !error;
  } else {
    const { error } = await supabase
      .from('rsvps')
      .insert({ event_id: eventId, user_id: userId, status });
    return !error;
  }
}

export async function removeRsvp(eventId: string, userId: string): Promise<boolean> {
  const { error } = await supabase
    .from('rsvps')
    .delete()
    .eq('event_id', eventId)
    .eq('user_id', userId);
  return !error;
}
