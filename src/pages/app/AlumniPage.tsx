import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useAlumniDirectory, useConnections, usePendingAlumni, getConnectionStatus, sendConnectionRequest, verifyAlumni } from '@/hooks/useAlumni';
import type { Profile } from '@/lib/types';
import {
  GraduationCap, Search, Loader2, Shield, MapPin, Building2, Briefcase,
  Linkedin, UserPlus, Check, Clock, X, CheckCircle2, XCircle, Users,
} from 'lucide-react';

export default function AlumniPage() {
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin';

  if (isAdmin) {
    return <AdminAlumniView />;
  }
  return <AlumniDirectoryView />;
}

function AlumniDirectoryView() {
  const { user, profile } = useAuth();
  const { alumni, loading, search, setSearch, department, setDepartment, gradYear, setGradYear } = useAlumniDirectory();
  const { connections } = useConnections();
  const [connectMsg, setConnectMsg] = useState<{ targetId: string; name: string } | null>(null);
  const [sending, setSending] = useState(false);

  const departments = [...new Set(alumni.map((a) => a.department).filter(Boolean))] as string[];
  const gradYears = [...new Set(alumni.map((a) => a.graduation_year).filter(Boolean) as number[])].sort((a, b) => b - a);

  async function handleConnect(targetId: string, message?: string) {
    if (!user) return;
    setSending(true);
    const success = await sendConnectionRequest(user.id, targetId, message);
    if (success) {
      setConnectMsg(null);
    }
    setSending(false);
  }

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/30 flex items-center justify-center">
            <GraduationCap className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Alumni Directory</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">Connect with verified alumni</p>
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 mb-6">
        <div className="relative mb-3">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, company, role, or location..."
            className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            <option value="">All departments</option>
            {departments.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
          <select
            value={gradYear}
            onChange={(e) => setGradYear(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            <option value="">All years</option>
            {gradYears.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
        </div>
      ) : alumni.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
            <GraduationCap className="w-8 h-8 text-slate-400" />
          </div>
          <p className="text-slate-500 dark:text-slate-400 font-medium">No alumni found</p>
          <p className="text-sm text-slate-400 mt-1">Try adjusting your search or filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {alumni.map((alum) => (
            <AlumniCard
              key={alum.id}
              alum={alum}
              connectionStatus={getConnectionStatus(connections, user?.id ?? '', alum.id)}
              onConnect={() => setConnectMsg({ targetId: alum.id, name: alum.full_name })}
            />
          ))}
        </div>
      )}

      {/* Connect message modal */}
      {connectMsg && (
        <ConnectMessageModal
          name={connectMsg.name}
          sending={sending}
          onClose={() => setConnectMsg(null)}
          onSend={(msg) => handleConnect(connectMsg.targetId, msg)}
        />
      )}
    </div>
  );
}

function AlumniCard({
  alum,
  connectionStatus,
  onConnect,
}: {
  alum: Profile;
  connectionStatus: 'none' | 'pending_sent' | 'pending_received' | 'connected' | 'rejected';
  onConnect: () => void;
}) {
  const initials = (alum.full_name || '?').slice(0, 2).toUpperCase();

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 hover:shadow-md transition">
      <div className="flex items-start gap-4">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white text-lg font-bold flex-shrink-0">
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">{alum.full_name}</h3>
            <Shield className="w-4 h-4 text-teal-500 flex-shrink-0" />
          </div>
          {alum.job_title && (
            <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
              <Briefcase className="w-3.5 h-3.5" />
              {alum.job_title}
            </p>
          )}
          {alum.company && (
            <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
              <Building2 className="w-3.5 h-3.5" />
              {alum.company}
            </p>
          )}
          {alum.location && (
            <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
              <MapPin className="w-3.5 h-3.5" />
              {alum.location}
            </p>
          )}
          <div className="flex items-center gap-2 mt-2">
            {alum.department && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                {alum.department}
              </span>
            )}
            {alum.graduation_year && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                Class of {alum.graduation_year}
              </span>
            )}
          </div>
        </div>
      </div>

      {alum.bio && (
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-3 line-clamp-2">{alum.bio}</p>
      )}

      <div className="flex items-center gap-2 mt-4">
        {connectionStatus === 'none' && (
          <button
            onClick={onConnect}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-amber-600 text-white text-sm font-semibold hover:bg-amber-700 active:scale-95 transition"
          >
            <UserPlus className="w-4 h-4" />
            Connect
          </button>
        )}
        {connectionStatus === 'pending_sent' && (
          <div className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 text-sm font-medium">
            <Clock className="w-4 h-4" />
            Request sent
          </div>
        )}
        {connectionStatus === 'pending_received' && (
          <div className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-teal-50 dark:bg-teal-950/30 text-teal-600 dark:text-teal-400 text-sm font-medium">
            <Clock className="w-4 h-4" />
            Check notifications
          </div>
        )}
        {connectionStatus === 'connected' && (
          <div className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-teal-50 dark:bg-teal-950/30 text-teal-600 dark:text-teal-400 text-sm font-medium">
            <Check className="w-4 h-4" />
            Connected
          </div>
        )}
        {connectionStatus === 'rejected' && (
          <button
            onClick={onConnect}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition"
          >
            <UserPlus className="w-4 h-4" />
            Reconnect
          </button>
        )}
        {alum.linkedin_url && (
          <a
            href={alum.linkedin_url}
            target="_blank"
            rel="noopener noreferrer"
            className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 flex items-center justify-center hover:bg-blue-100 dark:hover:bg-blue-950/50 transition flex-shrink-0"
          >
            <Linkedin className="w-4 h-4" />
          </a>
        )}
      </div>
    </div>
  );
}

function ConnectMessageModal({
  name,
  sending,
  onClose,
  onSend,
}: {
  name: string;
  sending: boolean;
  onClose: () => void;
  onSend: (message: string) => void;
}) {
  const [message, setMessage] = useState('');

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Connect with {name.split(' ')[0]}</h2>
          <button onClick={onClose} className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Add a message (optional)</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Hi! I'd love to connect and learn about your experience..."
            rows={4}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition resize-none"
          />
          <button
            onClick={() => onSend(message)}
            disabled={sending}
            className="w-full mt-4 py-3 rounded-xl bg-amber-600 text-white font-semibold hover:bg-amber-700 active:scale-95 transition disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {sending && <Loader2 className="w-5 h-5 animate-spin" />}
            Send request
          </button>
        </div>
      </div>
    </div>
  );
}

function AdminAlumniView() {
  const { user } = useAuth();
  const { pending, loading, refetch } = usePendingAlumni();
  const { alumni, loading: dirLoading } = useAlumniDirectory();
  const [processing, setProcessing] = useState<string | null>(null);
  const [tab, setTab] = useState<'pending' | 'all'>('pending');

  async function handleVerify(alumniId: string, approved: boolean) {
    if (!user) return;
    setProcessing(alumniId);
    await verifyAlumni(user.id, alumniId, approved);
    setProcessing(null);
    refetch();
  }

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/30 flex items-center justify-center">
            <Shield className="w-5 h-5 text-rose-600 dark:text-rose-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Alumni Management</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">Verify and manage alumni accounts</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-1 mb-6 w-fit">
        <button
          onClick={() => setTab('pending')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            tab === 'pending' ? 'bg-rose-600 text-white' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Pending ({pending.length})
        </button>
        <button
          onClick={() => setTab('all')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            tab === 'all' ? 'bg-slate-700 dark:bg-slate-200 text-white dark:text-slate-900' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          All Verified ({alumni.length})
        </button>
      </div>

      {tab === 'pending' ? (
        loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
          </div>
        ) : pending.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-teal-500" />
            </div>
            <p className="text-slate-500 dark:text-slate-400 font-medium">No pending requests</p>
            <p className="text-sm text-slate-400 mt-1">All alumni accounts have been reviewed.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pending.map((alum) => {
              const initials = (alum.full_name || '?').slice(0, 2).toUpperCase();
              return (
                <div key={alum.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                    {initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{alum.full_name}</h3>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {alum.department && <span className="text-xs text-slate-400">{alum.department}</span>}
                      {alum.graduation_year && <span className="text-xs text-slate-400">· Class of {alum.graduation_year}</span>}
                      {alum.company && <span className="text-xs text-slate-400">· {alum.company}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {processing === alum.id ? (
                      <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
                    ) : (
                      <>
                        <button
                          onClick={() => handleVerify(alum.id, false)}
                          className="w-9 h-9 rounded-xl border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 flex items-center justify-center hover:bg-rose-50 dark:hover:bg-rose-950/20 transition"
                          title="Reject"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleVerify(alum.id, true)}
                          className="w-9 h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center hover:bg-teal-700 transition"
                          title="Approve"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        dirLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
          </div>
        ) : alumni.length === 0 ? (
          <div className="text-center py-20">
            <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">No verified alumni yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {alumni.map((alum) => {
              const initials = (alum.full_name || '?').slice(0, 2).toUpperCase();
              return (
                <div key={alum.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                    {initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{alum.full_name}</h3>
                      <Shield className="w-3.5 h-3.5 text-teal-500" />
                    </div>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {alum.department && <span className="text-xs text-slate-400">{alum.department}</span>}
                      {alum.graduation_year && <span className="text-xs text-slate-400">· Class of {alum.graduation_year}</span>}
                      {alum.job_title && <span className="text-xs text-slate-400">· {alum.job_title}</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}
    </div>
  );
}
