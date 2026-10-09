import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useNotifications } from '@/hooks/useAlumni';
import {
  GraduationCap, MessageSquare, Users, Rss, Calendar, Bell, UserCircle,
  Sun, Moon, LogOut, Menu, X, Search, Shield,
} from 'lucide-react';
import { useState } from 'react';

const navItems = [
  { to: '/app/search', label: 'Search', icon: Search },
  { to: '/app/chats', label: 'Chats', icon: MessageSquare },
  { to: '/app/groups', label: 'Groups', icon: Users },
  { to: '/app/feed', label: 'Feed', icon: Rss },
  { to: '/app/events', label: 'Events', icon: Calendar },
  { to: '/app/alumni', label: 'Alumni', icon: GraduationCap },
  { to: '/app/notifications', label: 'Notifications', icon: Bell },
  { to: '/app/profile', label: 'Profile', icon: UserCircle },
];

export default function AppLayout() {
  const { profile, signOut } = useAuth();
  const { unreadCount } = useNotifications();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const initials = (profile?.full_name || profile?.email || '?').slice(0, 2).toUpperCase();

  async function handleSignOut() {
    await signOut();
    navigate('/');
  }

  const isActive = (path: string) => location.pathname.startsWith(path);

  return (
    <div className="min-h-screen bg-[#f8f7ff] dark:bg-[#16162a] transition-colors">
      {/* Mobile header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-[#fbfaff] dark:bg-[#202033] border-b border-[#e6e4ff] dark:border-[#2c2b4a] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center">
            <GraduationCap className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-slate-900 dark:text-white">CampusLink</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={toggleTheme} className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition">
            {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
          </button>
          <button onClick={() => setMobileOpen(true)} className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition">
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className="relative w-72 bg-[#fbfaff] dark:bg-[#202033] flex flex-col h-full">
            <div className="flex items-center justify-between p-4 border-b border-[#e6e4ff] dark:border-[#2c2b4a]">
              <span className="font-bold text-slate-900 dark:text-white">Menu</span>
              <button onClick={() => setMobileOpen(false)} className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
                <X className="w-5 h-5" />
              </button>
            </div>
            <SidebarContent
              isActive={isActive}
              onNavigate={() => setMobileOpen(false)}
              initials={initials}
              profile={profile}
              onSignOut={handleSignOut}
              unreadCount={unreadCount}
            />
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 w-64 bg-[#fbfaff] dark:bg-[#202033] border-r border-[#e6e4ff] dark:border-[#2c2b4a] flex-col z-30">
        <SidebarContent
          isActive={isActive}
          onNavigate={() => {}}
          initials={initials}
          profile={profile}
          onSignOut={handleSignOut}
          theme={theme}
          onToggleTheme={toggleTheme}
          unreadCount={unreadCount}
        />
      </aside>

      {/* Main content */}
      <main className="lg:ml-64 pt-16 lg:pt-0 min-h-screen">
        <Outlet />
      </main>
    </div>
  );
}

function SidebarContent({
  isActive,
  onNavigate,
  initials,
  profile,
  onSignOut,
  theme,
  onToggleTheme,
  unreadCount = 0,
}: {
  isActive: (path: string) => boolean;
  onNavigate: () => void;
  initials: string;
  profile: { full_name: string; email: string; role: string; alumni_verified: boolean } | null;
  onSignOut: () => void;
  theme?: string;
  onToggleTheme?: () => void;
  unreadCount?: number;
}) {
  return (
    <>
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-[#e6e4ff] dark:border-[#2c2b4a]">
        <div className="w-9 h-9 rounded-xl bg-teal-600 flex items-center justify-center">
          <GraduationCap className="w-5 h-5 text-white" />
        </div>
        <span className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">CampusLink</span>
      </div>

      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition relative ${
                isActive(item.to)
                  ? 'bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Icon className="w-5 h-5" />
              {item.label}
              {item.to === '/app/notifications' && unreadCount > 0 && (
                <span className="ml-auto min-w-5 h-5 px-1.5 rounded-full bg-rose-500 text-white text-xs font-bold flex items-center justify-center">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {onToggleTheme && (
        <div className="px-3 pb-2">
          <button
            onClick={onToggleTheme}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            {theme === 'light' ? 'Dark mode' : 'Light mode'}
          </button>
        </div>
      )}

      <div className="px-3 py-4 border-t border-[#e6e4ff] dark:border-[#2c2b4a]">
        <div className="flex items-center gap-3 px-3 py-2 mb-1">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-teal-600 to-cyan-700 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
              {profile?.full_name || 'User'}
            </p>
            <p className="text-xs text-slate-400 capitalize truncate">
              {profile?.role}
              {profile?.role === 'alumni' && !profile?.alumni_verified && ' · pending'}
            </p>
          </div>
        </div>
        <button
          onClick={onSignOut}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-rose-50 dark:hover:bg-rose-950/30 hover:text-rose-600 dark:hover:text-rose-400 transition"
        >
          <LogOut className="w-5 h-5" />
          Sign out
        </button>
      </div>
    </>
  );
}
