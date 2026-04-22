import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import type { Session } from '@supabase/supabase-js';
import {
  createBrowserRouter,
  RouterProvider,
  Outlet,
  useNavigate,
} from 'react-router-dom';
import TopNav from '@/components/TopNav';
import { Toaster } from 'sonner';
import { LangProvider } from '@/lib/i18n';
import { BrandProvider } from '@/lib/BrandContext';
import { ConfigProvider } from '@/lib/ConfigContext';
import CookieBanner from '@/components/CookieBanner';

// Route-level lazy splits
const Header = React.lazy(() => import('@/components/Header'));
const ApplicationForm = React.lazy(() => import('@/components/ApplicationForm'));
const Footer = React.lazy(() => import('@/components/Footer'));
const FAQ = React.lazy(() => import('@/components/FAQ'));
const Dashboard = React.lazy(() => import('@/components/admin/Dashboard'));
const AdminLogin = React.lazy(() => import('@/components/admin/AdminLogin'));
const ForgotPassword = React.lazy(() => import('@/components/admin/ForgotPassword'));
const HartLimesLanding = React.lazy(() => import('./components/HartLimesLanding'));
const CreatorApplicationPage = React.lazy(() => import('./components/public/CreatorApplicationPage'));
const ApplicationSlidePanel = React.lazy(() => import('@/components/public/ApplicationSlidePanel'));
const TaskSubmissionPage = React.lazy(() => import('@/components/public/TaskSubmissionPage'));
const InternPortalPage = React.lazy(() => import('@/components/public/InternPortalPage'));
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

// --- Cursor Glow ---
function CursorGlow() {
  const [pos, setPos] = React.useState({ x: -999, y: -999 });
  React.useEffect(() => {
    const move = (e: MouseEvent) => setPos({ x: e.clientX, y: e.clientY });
    window.addEventListener('mousemove', move);
    return () => window.removeEventListener('mousemove', move);
  }, []);
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
  const [applyPanelOpen, setApplyPanelOpen] = React.useState(false);
  const router = createBrowserRouter([
    // --- HSB Public Root — replaces former Take A Shot landing ---
    {
      path: '/',
      element: (
        <React.Suspense fallback={<div>Loading...</div>}>
          <HartLimesLanding />
        </React.Suspense>
      ),
    },
    // --- Hiring Funnel — former root, now scoped to /hiring ---
    {
      path: '/hiring',
      element: (
        <React.Suspense fallback={<div />}>
          <div className="min-h-screen bg-[#080808]">
            <header className="sticky top-0 z-20 bg-[#080808]/80 backdrop-blur-xl border-b border-white/5 px-6 py-4">
              <TopNav variant="dark" />
            </header>
            <div className="max-w-5xl mx-auto px-4 space-y-10 md:space-y-20 pt-10 pb-12">
              <Header />
              <main className="space-y-10 md:space-y-20">
                <ApplicationForm />
                <div className="space-y-6">
                  <h2 className="text-xs font-black uppercase tracking-[0.4em] text-center text-gray-500 mb-8">
                    Got Questions? Check our FAQs
                  </h2>
                  <FAQ />
                </div>
              </main>
              <Footer />
            </div>
          </div>
        </React.Suspense>
      ),
    },
    // --- Brand Ambassador Funnel — alias to HartLimesLanding influencer mode ---
    {
      path: '/brand-ambassador',
      element: (
        <React.Suspense fallback={<div>Loading...</div>}>
          <HartLimesLanding forceMode="influencer" onApplyClick={() => setApplyPanelOpen(true)} />
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
    {
      path: 'company',
      element: (
        <React.Suspense fallback={<div>Loading...</div>}>
          <HartLimesLanding />
        </React.Suspense>
      ),
    },
    {
      path: 'creators',
      element: (
        <React.Suspense fallback={<div>Loading...</div>}>
          <HartLimesLanding forceMode="influencer" onApplyClick={() => setApplyPanelOpen(true)} />
        </React.Suspense>
      ),
    },
    {
      path: 'apply/creator',
      element: (
        <React.Suspense fallback={<div>Loading...</div>}>
          <CreatorApplicationPage />
        </React.Suspense>
      ),
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
          path: 'intern/:internId',
          element: (
            <React.Suspense fallback={<div>Loading...</div>}>
              <InternPortalPage />
            </React.Suspense>
          ),
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
      <ApplicationSlidePanel open={applyPanelOpen} onClose={() => setApplyPanelOpen(false)} />
      <Toaster position="top-right" richColors />
      <CookieBanner />
    </LangProvider>
  );
};

export default App;
