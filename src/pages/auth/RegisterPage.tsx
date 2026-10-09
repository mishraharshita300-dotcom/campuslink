import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import type { UserRole } from '@/lib/types';
import { GraduationCap, Loader2, Mail, Lock, User, AlertCircle, ArrowLeft, GraduationCap as AlumniIcon, BookOpen } from 'lucide-react';

export default function RegisterPage() {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('student');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setSubmitting(true);

    const { error } = await signUp({ email, password, full_name: fullName, role });
    if (error) {
      setError(error);
    } else {
      navigate('/app');
    }
    setSubmitting(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 bg-slate-50 dark:bg-slate-950 transition-colors">
      <div className="w-full max-w-md">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 mb-6 transition">
          <ArrowLeft className="w-4 h-4" />
          Back to home
        </Link>

        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-11 h-11 rounded-xl bg-teal-600 flex items-center justify-center">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">Create account</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">Join CampusLink today</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Full name</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Jane Doe"
                  className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Email</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@campus.edu"
                  className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition"
                />
              </div>
              <p className="text-xs text-slate-400 mt-1.5">Use at least 8 characters with a mix of letters, numbers, and symbols.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">I am a</label>
              <div className="grid grid-cols-2 gap-3">
                <RoleCard
                  active={role === 'student'}
                  onClick={() => setRole('student')}
                  icon={<BookOpen className="w-5 h-5" />}
                  label="Student"
                  description="Currently studying"
                />
                <RoleCard
                  active={role === 'alumni'}
                  onClick={() => setRole('alumni')}
                  icon={<AlumniIcon className="w-5 h-5" />}
                  label="Alumni"
                  description="Graduated"
                />
              </div>
              {role === 'alumni' && (
                <p className="text-xs text-amber-600 dark:text-amber-500 mt-2">
                  Alumni accounts require admin verification before full access.
                </p>
              )}
            </div>

            {error && (
              <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-400 text-sm">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 rounded-xl bg-teal-600 text-white font-semibold hover:bg-teal-700 active:scale-[0.98] transition disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting && <Loader2 className="w-5 h-5 animate-spin" />}
              Create account
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 dark:text-slate-400 mt-6">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-teal-600 hover:text-teal-700 dark:text-teal-400 transition">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

function RoleCard({
  active,
  onClick,
  icon,
  label,
  description,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  description: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-start gap-1 p-4 rounded-xl border-2 transition text-left ${
        active
          ? 'border-teal-500 bg-teal-50 dark:bg-teal-950/30'
          : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
      }`}
    >
      <div className={`flex items-center gap-2 ${active ? 'text-teal-600 dark:text-teal-400' : 'text-slate-600 dark:text-slate-400'}`}>
        {icon}
        <span className="font-semibold text-sm">{label}</span>
      </div>
      <span className="text-xs text-slate-400">{description}</span>
    </button>
  );
}
