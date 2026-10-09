import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import { ThemeProvider } from '@/context/ThemeContext';
import LandingPage from '@/pages/LandingPage';
import LoginPage from '@/pages/auth/LoginPage';
import RegisterPage from '@/pages/auth/RegisterPage';
import ProtectedRoute from '@/components/ProtectedRoute';
import AppLayout from '@/components/AppLayout';
import { Loader2 } from 'lucide-react';

const HomePage = lazy(() => import('@/pages/app/HomePage'));
const ChatsPage = lazy(() => import('@/pages/app/ChatsPage'));
const GroupsPage = lazy(() => import('@/pages/app/GroupsPage'));
const AlumniPage = lazy(() => import('@/pages/app/AlumniPage'));
const FeedPage = lazy(() => import('@/pages/app/FeedPage'));
const EventsPage = lazy(() => import('@/pages/app/EventsPage'));
const SearchPage = lazy(() => import('@/pages/app/SearchPage'));
const UserProfilePage = lazy(() => import('@/pages/app/UserProfilePage'));
const AdminPage = lazy(() => import('@/pages/app/AdminPage'));
const NotificationsPage = lazy(() => import('@/pages/app/NotificationsPage'));
const ProfilePage = lazy(() => import('@/pages/app/ProfilePage'));

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="w-8 h-8 text-slate-300 animate-spin" />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                <Route path="/app" element={<Suspense fallback={<PageLoader />}><HomePage /></Suspense>} />
                <Route path="/app/chats" element={<Suspense fallback={<PageLoader />}><ChatsPage /></Suspense>} />
                <Route path="/app/groups" element={<Suspense fallback={<PageLoader />}><GroupsPage /></Suspense>} />
                <Route path="/app/alumni" element={<Suspense fallback={<PageLoader />}><AlumniPage /></Suspense>} />
                <Route path="/app/feed" element={<Suspense fallback={<PageLoader />}><FeedPage /></Suspense>} />
                <Route path="/app/events" element={<Suspense fallback={<PageLoader />}><EventsPage /></Suspense>} />
                <Route path="/app/search" element={<Suspense fallback={<PageLoader />}><SearchPage /></Suspense>} />
                <Route path="/app/user/:id" element={<Suspense fallback={<PageLoader />}><UserProfilePage /></Suspense>} />
                <Route path="/app/admin" element={<Suspense fallback={<PageLoader />}><AdminPage /></Suspense>} />
                <Route path="/app/notifications" element={<Suspense fallback={<PageLoader />}><NotificationsPage /></Suspense>} />
                <Route path="/app/profile" element={<Suspense fallback={<PageLoader />}><ProfilePage /></Suspense>} />
              </Route>
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
