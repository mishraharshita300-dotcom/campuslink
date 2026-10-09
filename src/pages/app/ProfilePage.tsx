import { useEffect, useState, type FormEvent } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { Loader2, CheckCircle2, AlertCircle, Mail, Calendar, Shield, Building2, Briefcase, MapPin, Linkedin, Link2 } from 'lucide-react';

export default function ProfilePage() {
  const { user, profile, refreshProfile } = useAuth();
  const [fullName, setFullName] = useState('');
  const [bio, setBio] = useState('');
  const [department, setDepartment] = useState('');
  const [gradYear, setGradYear] = useState('');
  const [company, setCompany] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [location, setLocation] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name ?? '');
      setBio(profile.bio ?? '');
      setDepartment(profile.department ?? '');
      setGradYear(profile.graduation_year?.toString() ?? '');
      setCompany(profile.company ?? '');
      setJobTitle(profile.job_title ?? '');
      setLocation(profile.location ?? '');
      setLinkedinUrl(profile.linkedin_url ?? '');
    }
  }, [profile]);

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: fullName,
        bio: bio || null,
        department: department || null,
        graduation_year: gradYear ? parseInt(gradYear) : null,
        company: company || null,
        job_title: jobTitle || null,
        location: location || null,
        linkedin_url: linkedinUrl || null,
      })
      .eq('id', user!.id);

    if (error) {
      setError(error.message);
    } else {
      setSaved(true);
      await refreshProfile();
      setTimeout(() => setSaved(false), 3000);
    }
    setSaving(false);
  }

  if (!profile) {
    return (
      <div className="p-6 lg:p-8 flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
      </div>
    );
  }

  const initials = (profile.full_name || profile.email || '?').slice(0, 2).toUpperCase();
  const joinDate = new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className="p-6 lg:p-8 max-w-2xl">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">Profile</h1>
      <p className="text-slate-500 dark:text-slate-400 mb-8">Manage your identity and preferences.</p>

      {/* Identity card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 mb-6">
        <div className="flex items-center gap-5">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-teal-600 to-cyan-700 flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white truncate">{profile.full_name}</h2>
              {profile.role === 'alumni' && profile.alumni_verified && (
                <Shield className="w-5 h-5 text-teal-500" />
              )}
            </div>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-sm text-slate-500 dark:text-slate-400 capitalize px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800">
                {profile.role}
              </span>
              {profile.role === 'alumni' && (
                <span className={`text-xs px-2 py-0.5 rounded-full ${profile.alumni_verified ? 'bg-teal-50 dark:bg-teal-950/30 text-teal-600 dark:text-teal-400' : 'bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400'}`}>
                  {profile.alumni_verified ? 'Verified' : 'Pending'}
                </span>
              )}
            </div>
            <div className="flex items-center gap-4 mt-3 text-sm text-slate-400">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                Joined {joinDate}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Account info */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 mb-6">
        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Account</h3>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
            <Mail className="w-5 h-5 text-slate-500" />
          </div>
          <div>
            <p className="text-xs text-slate-400">Email</p>
            <p className="text-sm font-medium text-slate-900 dark:text-white">{profile.email}</p>
          </div>
        </div>
      </div>

      {/* Edit profile */}
      <form onSubmit={handleSave} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Edit Profile</h3>
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Full name</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Bio</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell us about yourself..."
              rows={3}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition resize-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Department</label>
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="Computer Science"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Graduation year</label>
              <input
                type="number"
                value={gradYear}
                onChange={(e) => setGradYear(e.target.value)}
                placeholder="2026"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition"
              />
            </div>
          </div>

          {profile.role === 'alumni' && (
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4 mt-4">Career Info</p>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Job title</label>
                    <input
                      type="text"
                      value={jobTitle}
                      onChange={(e) => setJobTitle(e.target.value)}
                      placeholder="Software Engineer"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Company</label>
                    <input
                      type="text"
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                      placeholder="Tech Corp"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Location</label>
                    <input
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="San Francisco, CA"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">LinkedIn URL</label>
                    <input
                      type="url"
                      value={linkedinUrl}
                      onChange={(e) => setLinkedinUrl(e.target.value)}
                      placeholder="https://linkedin.com/in/..."
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-400 text-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {saved && (
            <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-400 text-sm">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>Profile updated successfully.</span>
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-xl bg-teal-600 text-white font-semibold hover:bg-teal-700 active:scale-95 transition disabled:opacity-60 flex items-center gap-2"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Save changes
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
