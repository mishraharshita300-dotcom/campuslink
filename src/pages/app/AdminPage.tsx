import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import {
  Shield, Loader2, Flag, CheckCircle2, XCircle, Rss, MessageCircle,
  Trash2, ChevronRight, AlertTriangle,
} from 'lucide-react';

interface ReportWithMeta {
  id: string;
  reporter_id: string;
  target_type: 'post' | 'comment';
  target_id: string;
  reason: string;
  status: 'pending' | 'resolved' | 'dismissed';
  created_at: string;
  reporter_name: string;
  target_content: string;
  target_author_name: string;
  target_author_id: string;
}

type Tab = 'reports' | 'users';

export default function AdminPage() {
  const { profile } = useAuth();
  const [tab, setTab] = useState<Tab>('reports');
  const [reports, setReports] = useState<ReportWithMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [users, setUsers] = useState<{ id: string; full_name: string; email: string; role: string; created_at: string }[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);

  useEffect(() => {
    if (profile?.role !== 'admin') return;
    fetchReports();
  }, [profile]);

  useEffect(() => {
    if (tab === 'users' && users.length === 0 && profile?.role === 'admin') {
      fetchUsers();
    }
  }, [tab, profile, users.length]);

  async function fetchReports() {
    setLoading(true);
    const { data: reportRows, error } = await supabase
      .from('reports')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error || !reportRows) {
      setReports([]);
      setLoading(false);
      return;
    }

    const reporterIds = [...new Set(reportRows.map((r) => r.reporter_id))];
    const reporterProfiles = await supabase.from('profiles').select('id, full_name').in('id', reporterIds);

    const reporterMap: Record<string, string> = {};
    (reporterProfiles.data ?? []).forEach((p) => { reporterMap[p.id] = p.full_name; });

    // Fetch target content
    const postIds = reportRows.filter((r) => r.target_type === 'post').map((r) => r.target_id);
    const commentIds = reportRows.filter((r) => r.target_type === 'comment').map((r) => r.target_id);

    const postResults = postIds.length > 0
      ? await supabase.from('posts').select('id, content, author_id').in('id', postIds)
      : { data: [] };
    const commentResults = commentIds.length > 0
      ? await supabase.from('comments').select('id, content, author_id, deleted_at').in('id', commentIds)
      : { data: [] };

    const postMap: Record<string, { content: string; author_id: string }> = {};
    (postResults.data ?? []).forEach((p) => { postMap[p.id] = { content: p.content, author_id: p.author_id }; });
    const commentMap: Record<string, { content: string; author_id: string; deleted_at: string | null }> = {};
    (commentResults.data ?? []).forEach((c) => { commentMap[c.id] = { content: c.content, author_id: c.author_id, deleted_at: c.deleted_at }; });

    // Fetch target authors
    const authorIds = [
      ...Object.values(postMap).map((p) => p.author_id),
      ...Object.values(commentMap).map((c) => c.author_id),
    ];
    const uniqueAuthorIds = [...new Set(authorIds)];
    const authorProfiles = uniqueAuthorIds.length > 0
      ? await supabase.from('profiles').select('id, full_name').in('id', uniqueAuthorIds)
      : { data: [] };
    const authorMap: Record<string, string> = {};
    (authorProfiles.data ?? []).forEach((a) => { authorMap[a.id] = a.full_name; });

    const enriched: ReportWithMeta[] = reportRows.map((r) => {
      const target = r.target_type === 'post'
        ? postMap[r.target_id]
        : commentMap[r.target_id];
      return {
        id: r.id,
        reporter_id: r.reporter_id,
        target_type: r.target_type,
        target_id: r.target_id,
        reason: r.reason,
        status: r.status,
        created_at: r.created_at,
        reporter_name: reporterMap[r.reporter_id] ?? 'Unknown',
        target_content: target?.content ?? '(content deleted)',
        target_author_name: authorMap[target?.author_id ?? ''] ?? 'Unknown',
        target_author_id: target?.author_id ?? '',
      };
    });

    setReports(enriched);
    setLoading(false);
  }

  async function fetchUsers() {
    setUsersLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, email, role, created_at')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error || !data) {
      setUsers([]);
    } else {
      setUsers(data as typeof users);
    }
    setUsersLoading(false);
  }

  async function handleResolve(reportId: string, dismiss: boolean) {
    setActing(reportId);
    await supabase
      .from('reports')
      .update({ status: dismiss ? 'dismissed' : 'resolved' })
      .eq('id', reportId);
    setReports((prev) => prev.filter((r) => r.id !== reportId));
    setActing(null);
  }

  async function handleDeleteContent(report: ReportWithMeta) {
    setActing(report.id);
    if (report.target_type === 'post') {
      await supabase.from('posts').update({ deleted_at: new Date().toISOString() }).eq('id', report.target_id);
    } else {
      await supabase.from('comments').update({ deleted_at: new Date().toISOString() }).eq('id', report.target_id);
    }
    await handleResolve(report.id, false);
  }

  if (profile?.role !== 'admin') {
    return (
      <div className="p-6 lg:p-8 max-w-2xl mx-auto text-center py-20">
        <AlertTriangle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <p className="text-slate-500 dark:text-slate-400">You need admin access to view this page.</p>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/30 flex items-center justify-center">
          <Shield className="w-5 h-5 text-rose-600 dark:text-rose-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Admin Dashboard</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">Moderation and user management</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-1 mb-6 w-fit">
        <button
          onClick={() => setTab('reports')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            tab === 'reports' ? 'bg-rose-600 text-white' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Reports ({reports.length})
        </button>
        <button
          onClick={() => setTab('users')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            tab === 'users' ? 'bg-slate-700 dark:bg-slate-200 text-white dark:text-slate-900' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Users
        </button>
      </div>

      {/* Reports tab */}
      {tab === 'reports' && (
        loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
          </div>
        ) : reports.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-full bg-teal-50 dark:bg-teal-950/30 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-teal-500" />
            </div>
            <p className="text-slate-500 dark:text-slate-400 font-medium">No pending reports</p>
            <p className="text-sm text-slate-400 mt-1">All reported content has been reviewed.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {reports.map((r) => (
              <div key={r.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Flag className="w-4 h-4 text-rose-500" />
                  <span className="text-xs font-medium text-rose-600 dark:text-rose-400">{r.reason}</span>
                  <span className="text-xs text-slate-400 ml-auto">{new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 mb-3">
                  <div className="flex items-center gap-2 mb-1.5">
                    {r.target_type === 'post' ? <Rss className="w-3.5 h-3.5 text-slate-400" /> : <MessageCircle className="w-3.5 h-3.5 text-slate-400" />}
                    <span className="text-xs font-medium text-slate-500 capitalize">{r.target_type}</span>
                    <span className="text-xs text-slate-400">by {r.target_author_name}</span>
                  </div>
                  <p className="text-sm text-slate-700 dark:text-slate-300 line-clamp-3">{r.target_content}</p>
                </div>

                <p className="text-xs text-slate-400 mb-3">Reported by {r.reporter_name}</p>

                <div className="flex items-center gap-2">
                  {acting === r.id ? (
                    <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
                  ) : (
                    <>
                      <button
                        onClick={() => handleDeleteContent(r)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete content
                      </button>
                      <button
                        onClick={() => handleResolve(r.id, true)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        Dismiss
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Users tab */}
      {tab === 'users' && (
        usersLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
          </div>
        ) : (
          <div className="space-y-2">
            {users.map((u) => (
              <div key={u.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-500 to-slate-700 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                  {u.full_name.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{u.full_name}</p>
                  <p className="text-xs text-slate-400 truncate">{u.email}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${
                  u.role === 'admin' ? 'bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400' :
                  u.role === 'alumni' ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400' :
                  'bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400'
                }`}>
                  {u.role}
                </span>
                <span className="text-xs text-slate-400">{new Date(u.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}
