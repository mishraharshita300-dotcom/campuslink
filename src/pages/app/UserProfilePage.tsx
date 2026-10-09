import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useConnections, getConnectionStatus, sendConnectionRequest } from '@/hooks/useAlumni';
import type { Profile } from '@/lib/types';
import {
  ArrowLeft, Loader2, Shield, MapPin, Building2, Briefcase, Linkedin,
  UserPlus, Check, Clock, Mail, Calendar, MessageSquare, Rss,
} from 'lucide-react';

export default function UserProfilePage() {
  const { id: userId } = useParams<{ id: string }>();
  const { user, profile: myProfile } = useAuth();
  const navigate = useNavigate();
  const { connections } = useConnections();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [postCount, setPostCount] = useState(0);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      setProfile(data as Profile | null);

      const { count } = await supabase
        .from('posts')
        .select('id', { count: 'exact', head: true })
        .eq('author_id', userId)
        .is('deleted_at', null);
      setPostCount(count ?? 0);
      setLoading(false);
    })();
  }, [userId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="p-6 lg:p-8 max-w-2xl mx-auto text-center py-20">
        <p className="text-slate-500 dark:text-slate-400">User not found.</p>
        <button onClick={() => navigate('/app/search')} className="mt-4 text-sm text-teal-600 hover:underline">
          Back to search
        </button>
      </div>
    );
  }

  const isOwn = profile.id === user?.id;
  const initials = (profile.full_name || '?').slice(0, 2).toUpperCase();
  const connStatus = getConnectionStatus(connections, user?.id ?? '', profile.id);
  const joinDate = new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  async function handleConnect() {
    if (!user) return;
    setSending(true);
    await sendConnectionRequest(user.id, profile!.id);
    setSending(false);
  }

  async function handleStartChat() {
    if (!user) return;
    // Check if conversation already exists
    const { data: existingParts } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', user.id);

    if (existingParts && existingParts.length > 0) {
      const convIds = existingParts.map((p) => p.conversation_id);
      const { data: otherPart } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', profile!.id)
        .in('conversation_id', convIds);

      if (otherPart && otherPart.length > 0) {
        navigate('/app/chats');
        return;
      }
    }

    // Create new conversation
    const { data: conv, error: convError } = await supabase
      .from('conversations')
      .insert({ is_group: false })
      .select('id')
      .single();

    if (convError || !conv) {
      console.error('Error creating conversation:', convError?.message);
      return;
    }

    await supabase.from('conversation_participants').insert([
      { conversation_id: conv.id, user_id: user.id },
      { conversation_id: conv.id, user_id: profile!.id },
    ]);

    navigate('/app/chats');
  }

  return (
    <div className="p-6 lg:p-8 max-w-2xl mx-auto">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 mb-4 transition"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      {/* Profile card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden mb-6">
        {/* Header gradient */}
        <div className="h-24 bg-gradient-to-br from-teal-500 to-cyan-700" />

        <div className="px-6 pb-6">
          {/* Avatar */}
          <div className="flex items-end justify-between -mt-12 mb-4">
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center text-white text-3xl font-bold border-4 border-white dark:border-slate-900">
              {initials}
            </div>
            <div className="flex items-center gap-2 mb-1">
              {connStatus === 'connected' && (
                <button
                  onClick={handleStartChat}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 text-white text-sm font-semibold hover:bg-teal-700 transition"
                >
                  <MessageSquare className="w-4 h-4" />
                  Message
                </button>
              )}
              {!isOwn && connStatus === 'none' && (
                <button
                  onClick={handleConnect}
                  disabled={sending}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 text-white text-sm font-semibold hover:bg-teal-700 active:scale-95 transition disabled:opacity-60"
                >
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                  Connect
                </button>
              )}
              {!isOwn && connStatus === 'pending_sent' && (
                <div className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 text-sm font-medium">
                  <Clock className="w-4 h-4" />
                  Request sent
                </div>
              )}
              {!isOwn && connStatus === 'connected' && (
                <div className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-50 dark:bg-teal-950/30 text-teal-600 dark:text-teal-400 text-sm font-medium">
                  <Check className="w-4 h-4" />
                  Connected
                </div>
              )}
            </div>
          </div>

          {/* Name and role */}
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">{profile.full_name}</h1>
            {profile.role === 'alumni' && profile.alumni_verified && (
              <Shield className="w-5 h-5 text-teal-500" />
            )}
          </div>
          <div className="flex items-center gap-2 mb-4">
            <span className="text-sm px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 capitalize">
              {profile.role}
            </span>
            {profile.role === 'alumni' && (
              <span className={`text-xs px-2 py-0.5 rounded-full ${profile.alumni_verified ? 'bg-teal-50 dark:bg-teal-950/30 text-teal-600 dark:text-teal-400' : 'bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400'}`}>
                {profile.alumni_verified ? 'Verified' : 'Pending'}
              </span>
            )}
          </div>

          {/* Bio */}
          {profile.bio && (
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-4">{profile.bio}</p>
          )}

          {/* Info grid */}
          <div className="grid grid-cols-2 gap-3">
            {profile.department && (
              <InfoItem icon={Building2} label="Department" value={profile.department} />
            )}
            {profile.graduation_year && (
              <InfoItem icon={Calendar} label="Class of" value={profile.graduation_year.toString()} />
            )}
            {profile.job_title && (
              <InfoItem icon={Briefcase} label="Job title" value={profile.job_title} />
            )}
            {profile.company && (
              <InfoItem icon={Building2} label="Company" value={profile.company} />
            )}
            {profile.location && (
              <InfoItem icon={MapPin} label="Location" value={profile.location} />
            )}
            <InfoItem icon={Calendar} label="Joined" value={joinDate} />
          </div>

          {/* LinkedIn */}
          {profile.linkedin_url && (
            <a
              href={profile.linkedin_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              <Linkedin className="w-4 h-4" />
              {profile.linkedin_url.replace(/^https?:\/\/(www\.)?/, '')}
            </a>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 text-center">
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{postCount}</p>
          <p className="text-xs text-slate-400 mt-1">Posts</p>
        </div>
        <button
          onClick={() => isOwn ? navigate('/app/feed') : undefined}
          className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 text-center hover:shadow-md transition"
        >
          <Rss className="w-6 h-6 text-slate-400 mx-auto mb-1" />
          <p className="text-xs text-slate-400">View feed</p>
        </button>
      </div>
    </div>
  );
}

function InfoItem({ icon: Icon, label, value }: { icon: typeof MapPin; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
        <Icon className="w-4 h-4 text-slate-400" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-slate-400">{label}</p>
        <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{value}</p>
      </div>
    </div>
  );
}
