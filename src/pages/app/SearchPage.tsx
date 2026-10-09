import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import type { Profile } from '@/lib/types';
import {
  Search, Loader2, UserCircle, Users, Calendar, Rss, ArrowRight, X,
} from 'lucide-react';

interface SearchResult {
  users: Profile[];
  groups: { id: string; name: string; group_type: string }[];
  events: { id: string; title: string; event_date: string }[];
  posts: { id: string; content: string; author_name: string }[];
}

export default function SearchPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    if (!query.trim()) {
      setResults(null);
      setHasSearched(false);
      return;
    }

    const timeout = setTimeout(async () => {
      setLoading(true);
      setHasSearched(true);
      const q = query.trim();

      const [usersRes, groupsRes, eventsRes, postsRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('*')
          .or(`full_name.ilike.%${q}%,department.ilike.%${q}%,company.ilike.%${q}%`)
          .neq('id', user?.id ?? '')
          .limit(10),
        supabase
          .from('groups')
          .select('id, name, group_type')
          .or(`name.ilike.%${q}%,description.ilike.%${q}%`)
          .limit(10),
        supabase
          .from('events')
          .select('id, title, event_date')
          .or(`title.ilike.%${q}%,location.ilike.%${q}%,description.ilike.%${q}%`)
          .gte('event_date', new Date().toISOString().split('T')[0])
          .limit(10),
        supabase
          .from('posts')
          .select('id, content, author_id')
          .ilike('content', `%${q}%`)
          .is('deleted_at', null)
          .limit(5),
      ]);

      // Fetch author names for posts
      let postsWithNames: { id: string; content: string; author_name: string }[] = [];
      if (postsRes.data && postsRes.data.length > 0) {
        const authorIds = [...new Set(postsRes.data.map((p) => p.author_id))];
        const { data: authors } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', authorIds);
        const authorMap: Record<string, string> = {};
        (authors ?? []).forEach((a) => { authorMap[a.id] = a.full_name; });
        postsWithNames = postsRes.data.map((p) => ({
          id: p.id,
          content: p.content,
          author_name: authorMap[p.author_id] ?? 'Unknown',
        }));
      }

      setResults({
        users: (usersRes.data ?? []) as Profile[],
        groups: (groupsRes.data ?? []) as { id: string; name: string; group_type: string }[],
        events: (eventsRes.data ?? []) as { id: string; title: string; event_date: string }[],
        posts: postsWithNames,
      });
      setLoading(false);
    }, 300);

    return () => clearTimeout(timeout);
  }, [query, user]);

  const hasResults = results && (results.users.length > 0 || results.groups.length > 0 || results.events.length > 0 || results.posts.length > 0);

  return (
    <div className="p-6 lg:p-8 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/30 flex items-center justify-center">
          <Search className="w-5 h-5 text-teal-600 dark:text-teal-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Search</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">Find people, groups, events, and posts</p>
        </div>
      </div>

      {/* Search bar */}
      <div className="relative mb-6">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search CampusLink..."
          autoFocus
          className="w-full pl-11 pr-11 py-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition"
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Results */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
        </div>
      ) : !hasSearched ? (
        <div className="text-center py-12">
          <p className="text-sm text-slate-400">Start typing to search across the platform.</p>
        </div>
      ) : !hasResults ? (
        <div className="text-center py-12">
          <p className="text-sm text-slate-400">No results found for "{query}"</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Users */}
          {results!.users.length > 0 && (
            <SearchSection title="People" icon={UserCircle}>
              {results!.users.map((p) => (
                <button
                  key={p.id}
                  onClick={() => navigate(`/app/user/${p.id}`)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition text-left"
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-600 to-cyan-700 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                    {p.full_name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{p.full_name}</p>
                    <p className="text-xs text-slate-400 capitalize">{p.role}{p.department ? ` · ${p.department}` : ''}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-300 flex-shrink-0" />
                </button>
              ))}
            </SearchSection>
          )}

          {/* Groups */}
          {results!.groups.length > 0 && (
            <SearchSection title="Groups" icon={Users}>
              {results!.groups.map((g) => (
                <button
                  key={g.id}
                  onClick={() => navigate('/app/groups')}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition text-left"
                >
                  <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center flex-shrink-0">
                    <Users className="w-5 h-5 text-blue-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{g.name}</p>
                    <p className="text-xs text-slate-400 capitalize">{g.group_type}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-300 flex-shrink-0" />
                </button>
              ))}
            </SearchSection>
          )}

          {/* Events */}
          {results!.events.length > 0 && (
            <SearchSection title="Events" icon={Calendar}>
              {results!.events.map((e) => (
                <button
                  key={e.id}
                  onClick={() => navigate('/app/events')}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition text-left"
                >
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center flex-shrink-0">
                    <Calendar className="w-5 h-5 text-emerald-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{e.title}</p>
                    <p className="text-xs text-slate-400">{new Date(e.event_date + 'T00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-300 flex-shrink-0" />
                </button>
              ))}
            </SearchSection>
          )}

          {/* Posts */}
          {results!.posts.length > 0 && (
            <SearchSection title="Posts" icon={Rss}>
              {results!.posts.map((p) => (
                <button
                  key={p.id}
                  onClick={() => navigate('/app/feed')}
                  className="w-full flex items-start gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition text-left"
                >
                  <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/30 flex items-center justify-center flex-shrink-0">
                    <Rss className="w-5 h-5 text-rose-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-900 dark:text-white">{p.author_name}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400 truncate">{p.content}</p>
                  </div>
                </button>
              ))}
            </SearchSection>
          )}
        </div>
      )}
    </div>
  );
}

function SearchSection({ title, icon: Icon, children }: { title: string; icon: typeof Search; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2 px-1">
        <Icon className="w-4 h-4 text-slate-400" />
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">{title}</h2>
      </div>
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
        {children}
      </div>
    </div>
  );
}
