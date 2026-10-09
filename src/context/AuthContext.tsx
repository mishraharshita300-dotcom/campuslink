import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { Profile, UserRole } from '@/lib/types';

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signUp: (data: SignUpData) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

interface SignUpData {
  email: string;
  password: string;
  full_name: string;
  role: UserRole;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchProfile(userId: string) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('Profile fetch error:', error.message);
      setProfile(null);
    } else {
      setProfile(data as Profile | null);
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      }
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        (async () => {
          await fetchProfile(session.user.id);
        })();
      } else {
        setProfile(null);
      }
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  async function signUp({ email, password, full_name, role }: SignUpData) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name, role },
      },
    });

    if (error) {
      const msg = error.message;
      if (msg.includes('weak_password') || msg.includes('Password is known to be weak')) {
        return { error: 'That password is too common. Please use a stronger password with a mix of letters, numbers, and symbols.' };
      }
      if (msg.includes('already') || msg.includes('User already registered')) {
        return { error: 'An account with this email already exists. Try signing in instead.' };
      }
      return { error: msg };
    }

    if (data.user && !data.session) {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) {
        return { error: 'Account created, but could not sign in automatically. Please try signing in.' };
      }
    }

    return { error: null };
  }

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      const msg = error.message;
      if (msg.includes('Invalid login credentials')) {
        return { error: 'Incorrect email or password. If you do not have an account yet, please register first.' };
      }
      return { error: msg };
    }

    return { error: null };
  }

  async function signOut() {
    await supabase.auth.signOut();
    setProfile(null);
  }

  async function refreshProfile() {
    if (user) {
      await fetchProfile(user.id);
    }
  }

  return (
    <AuthContext.Provider value={{ session, user, profile, loading, signUp, signIn, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
