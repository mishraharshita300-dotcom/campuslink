import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useNotifications } from '@/hooks/useAlumni';
import { supabase } from '@/lib/supabase';
import {
  MessageSquare, Users, GraduationCap, Rss, Calendar, ArrowRight,
  ShieldCheck, Users2, Bell,
} from 'lucide-react';

export default function HomePage() {
  const { profile, user } = useAuth();
  const { unreadCount } = useNotifications();
  const [upcomingEvents, setUpcomingEvents] = useState(0);
  const [connectionCount, setConnectionCount] = useState(0);
  const [groupCount, setGroupCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const today = new Date().toISOString().split('T')[0];
      const { count: eventCount } = await supabase
        .from('events')
        .select('id', { count: 'exact', head: true })
        .gte('event_date', today);
      setUpcomingEvents(eventCount ?? 0);

      const { count: connCount } = await supabase
        .from('connections')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'accepted')
        .or('requester_id.eq.' + user.id + ',target_id.eq.' + user.id);
      setConnectionCount(connCount ?? 0);

      const { count: grpCount } = await supabase
        .from('group_members')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id);
      setGroupCount(grpCount ?? 0);
    })();
  }, [user]);

  const cards = [
    { to: '/app/chats', icon: MessageSquare, label: 'Direct Messages', desc: 'Chat 1:1 with classmates and alumni', color: 'bg-teal-50 dark:bg-teal-950/30 text-teal-600 dark:text-teal-400' },
    { to: '/app/groups', icon: Users, label: 'Groups', desc: 'Course, club, and hostel channels', color: 'bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400' },
    { to: '/app/feed', icon: Rss, label: 'Community Feed', desc: 'Share posts and stay updated', color: 'bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400' },
    { to: '/app/events', icon: Calendar, label: 'Events', desc: 'Campus events and RSVP', color: 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400' },
    { to: '/app/alumni', icon: GraduationCap, label: 'Alumni Connect', desc: 'Find mentors and request connections', color: 'bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400' },
  ];

  const stats = [
    { label: 'Upcoming events', value: upcomingEvents, icon: Calendar, color: 'text-emerald-500', link: '/app/events' },
    { label: 'Connections', value: connectionCount, icon: Users2, color: 'text-teal-500', link: '/app/alumni' },
    { label: 'Groups', value: groupCount, icon: Users, color: 'text-blue-500', link: '/app/groups' },
    { label: 'Notifications', value: unreadCount, icon: Bell, color: 'text-rose-500', link: '/app/notifications' },
  ];

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">
          Welcome, {profile?.full_name?.split(' ')[0] || 'there'}!
        </h1>
        <p className="text-slate-500 dark:text-slate-400">
          {profile?.role === 'alumni' && !profile?.alumni_verified
            ? 'Your alumni account is pending verification. You can explore while waiting for approval.'
            : 'Here is what is happening on your campus.'}
        </p>
      </div>

      {profile?.role === 'alumni' && !profile?.alumni_verified && (
        <div className="mb-6 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-800 dark:text-amber-300">Alumni verification pending</p>
            <p className="text-sm text-amber-700 dark:text-amber-400/80 mt-0.5">
              An admin will review your account shortly. Some features may be limited until verified.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link
              key={stat.label}
              to={stat.link}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 hover:shadow-md transition"
            >
              <Icon className={'w-5 h-5 ' + stat.color + ' mb-2'} />
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{stat.value}</p>
              <p className="text-xs text-slate-400 mt-0.5">{stat.label}</p>
            </Link>
          );
        })}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.to}
              to={card.to}
              className="group p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 transition"
            >
              <div className={'w-12 h-12 rounded-xl ' + card.color + ' flex items-center justify-center mb-4'}>
                <Icon className="w-6 h-6" />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{card.label}</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{card.desc}</p>
                </div>
                <ArrowRight className="w-5 h-5 text-slate-300 dark:text-slate-600 group-hover:text-slate-500 dark:group-hover:text-slate-400 group-hover:translate-x-1 transition" />
              </div>
            </Link>
          );
        })}
      </div>

      {profile?.role === 'admin' && (
        <Link
          to="/app/admin"
          className="mt-4 group flex items-center gap-3 p-4 rounded-2xl border border-rose-200 dark:border-rose-900 bg-rose-50/50 dark:bg-rose-950/20 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition"
        >
          <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950/40 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-rose-600 dark:text-rose-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Admin Dashboard</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Moderation and user management</p>
          </div>
          <ArrowRight className="w-5 h-5 text-rose-400 group-hover:translate-x-1 transition" />
        </Link>
      )}
    </div>
  );
}
