import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import type { Session } from '@supabase/supabase-js';
import {
  createBrowserRouter,
  RouterProvider,
  Outlet,
  useNavigate,
  Navigate,
} from 'react-router-dom';
import TopNav from '@/components/TopNav';
import { Toaster } from 'sonner';
import { LangProvider } from '@/lib/i18n';
import { BrandProvider } from '@/lib/BrandContext';
import { ConfigProvider } from '@/lib/ConfigContext';
import CookieBanner from '@/components/CookieBanner';

// Route-level lazy splits
const Footer = React.lazy(() => import('@/components/Footer'));
const Dashboard = React.lazy(() => import('@/components/admin/Dashboard'));
const AdminLogin = React.lazy(() => import('@/components/admin/AdminLogin'));
const ForgotPassword = React.lazy(() => import('@/components/admin/ForgotPassword'));
const HSBLanding = React.lazy(() => import('@/components/landing/HSBLanding'));
const AboutPage = React.lazy(() => import('@/components/landing/pages/AboutPage'));
const AmbassadorsPage = React.lazy(() => import('@/components/landing/pages/AmbassadorsPage'));
const FoundersPage = React.lazy(() => import('@/components/landing/pages/FoundersPage'));
const FoundersUniversityPage = React.lazy(() => import('@/components/landing/pages/FoundersUniversityPage'));
const FellowshipAgreementPage = React.lazy(() => import('@/components/landing/pages/FellowshipAgreementPage'));
const TaskSubmissionPage = React.lazy(() => import('@/components/public/TaskSubmissionPage'));
const Imprint = React.lazy(() => import('@/components/legal/Imprint'));
const PrivacyPolicy = React.lazy(() => import('@/components/legal/PrivacyPolicy'));
const LegalPage = React.lazy(() => import('@/components/legal/LegalPage'));

// --- Layout Component ---
const AppLayout: React.FC = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [authInitialized, setAuthInitialized] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthInitialized(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    const handleDemoStart = () => {
      setIsDemoMode(true);
      navigate('/admin');
    };
    window.addEventListener('start-demo-mode', handleDemoStart);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('start-demo-mode', handleDemoStart);
    };
  }, [navigate]);

  if (!authInitialized) return null;

  return (
    <div className="min-h-screen relative py-12 px-4 transition-colors duration-500">
      <div className="fixed inset-0 pointer-events-none -z-10 bg-surface-950" />
      <div className="w-full max-w-7xl mx-auto relative z-10">
        <div className="mb-16">
          <TopNav />
        </div>
        <Outlet context={{ session, isDemoMode, setIsDemoMode }} />
        <Footer />
      </div>
    </div>
  );
};

// --- Cursor Glow — Landing only, disabled on /admin/* for workflow clarity ---
function CursorGlow() {
  const [pos, setPos] = React.useState({ x: -999, y: -999 });
  const [enabled, setEnabled] = React.useState(() =>
    typeof window !== 'undefined' ? !window.location.pathname.startsWith('/admin') : true,
  );
  React.useEffect(() => {
    const onNav = () => setEnabled(!window.location.pathname.startsWith('/admin'));
    window.addEventListener('popstate', onNav);
    // Poll for SPA route changes (router doesn't emit popstate on Link clicks)
    const interval = setInterval(onNav, 500);
    return () => {
      window.removeEventListener('popstate', onNav);
      clearInterval(interval);
    };
  }, []);
  React.useEffect(() => {
    if (!enabled) return;
    const move = (e: MouseEvent) => setPos({ x: e.clientX, y: e.clientY });
    window.addEventListener('mousemove', move);
    return () => window.removeEventListener('mousemove', move);
  }, [enabled]);
  if (!enabled) return null;
  return (
    <div
      className="fixed pointer-events-none z-[9998] w-[650px] h-[650px] rounded-full"
      style={{
        left: pos.x - 325,
        top: pos.y - 325,
        background: 'radial-gradient(circle, rgba(255,255,255,0.018) 0%, transparent 65%)',
        transition: 'left 0.08s linear, top 0.08s linear',
        willChange: 'left, top',
      }}
    />
  );
}

// --- Main App Component ---
const App: React.FC = () => {
  const router = createBrowserRouter([
    // --- HSB Public Root — full landing imported from HSB-Web ---
    {
      path: '/',
      element: (
        <React.Suspense fallback={<div className="bg-background min-h-screen" />}>
          <HSBLanding />
        </React.Suspense>
      ),
    },
    // --- HSB Sub-Pages ---
    {
      path: '/about',
      element: (
        <React.Suspense fallback={<div className="bg-background min-h-screen" />}>
          <AboutPage />
        </React.Suspense>
      ),
    },
    {
      path: '/founders',
      element: (
        <React.Suspense fallback={<div className="bg-background min-h-screen" />}>
          <FoundersPage />
        </React.Suspense>
      ),
    },
    {
      path: '/founders-university',
      element: (
        <React.Suspense fallback={<div className="bg-background min-h-screen" />}>
          <FoundersUniversityPage />
        </React.Suspense>
      ),
    },
    // --- Legacy redirect: /hiring → /founders-university (HSB Praktis-Funnel, 2026-05-02) ---
    {
      path: '/hiring',
      element: <Navigate to="/founders-university" replace />,
    },
    // --- Brand Ambassador Funnel — HSB AmbassadorsPage stub ---
    {
      path: '/brand-ambassador',
      element: (
        <React.Suspense fallback={<div className="bg-background min-h-screen" />}>
          <AmbassadorsPage />
        </React.Suspense>
      ),
    },
    // --- Fellowship Agreement — public viewable + printable, linked from invite emails ---
    {
      path: '/fellowship-agreement',
      element: (
        <React.Suspense fallback={<div className="bg-background min-h-screen" />}>
          <FellowshipAgreementPage />
        </React.Suspense>
      ),
    },
    {
      path: 'admin',
      element: (
        <React.Suspense fallback={<div />}>
          <div className="min-h-screen bg-[#080808] px-4 py-12">
            <TopNav />
            <AdminLogin />
          </div>
        </React.Suspense>
      ),
    },
    {
      path: 'admin/dashboard',
      element: (
        <React.Suspense fallback={<div />}>
          <ConfigProvider><BrandProvider><Dashboard /></BrandProvider></ConfigProvider>
        </React.Suspense>
      ),
    },
    // --- Legacy redirects: HartLimes-branded routes → HSB equivalents (2026-05-02) ---
    {
      path: 'company',
      element: <Navigate to="/" replace />,
    },
    {
      path: 'creators',
      element: <Navigate to="/brand-ambassador" replace />,
    },
    {
      path: 'apply/creator',
      element: <Navigate to="/brand-ambassador" replace />,
    },
    // --- Utility pages (AppLayout wrapper retained) ---
    {
      path: '/',
      element: <AppLayout />,
      children: [
        {
          path: 'admin/forgot-password',
          element: (
            <React.Suspense fallback={<div />}>
              <ForgotPassword />
            </React.Suspense>
          ),
        },
        {
          path: 'task/:accessToken',
          element: (
            <React.Suspense fallback={<div>Loading...</div>}>
              <TaskSubmissionPage />
            </React.Suspense>
          ),
        },
        {
          // Legacy /intern/:internId route — unified Dashboard now handles fellow
          // surface via Academy section. Redirect cleanly.
          path: 'intern/:internId',
          element: <Navigate to="/admin" replace />,
        },
        {
          path: 'imprint',
          element: (
            <React.Suspense fallback={<div>Loading...</div>}>
              <Imprint />
            </React.Suspense>
          ),
        },
        {
          path: 'privacy',
          element: (
            <React.Suspense fallback={<div>Loading...</div>}>
              <PrivacyPolicy />
            </React.Suspense>
          ),
        },
        {
          path: 'legal',
          element: (
            <React.Suspense fallback={<div>Loading...</div>}>
              <LegalPage />
            </React.Suspense>
          ),
        },
      ],
    },
  ]);

  return (
    <LangProvider>
      <CursorGlow />
      <RouterProvider router={router} />
      <Toaster position="top-right" richColors />
      <CookieBanner />
    </LangProvider>
  );
};

export default App;
