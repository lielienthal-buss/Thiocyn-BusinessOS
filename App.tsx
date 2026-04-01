import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import type { Session } from '@supabase/supabase-js';
import Header from '@/components/Header';
import {
  createBrowserRouter,
  RouterProvider,
  Outlet,
  useNavigate,
} from 'react-router-dom';
import ApplicationForm from '@/components/ApplicationForm';
import Footer from '@/components/Footer';
import FAQ from '@/components/FAQ';
import Dashboard from '@/components/admin/Dashboard';
import AdminLogin from '@/components/admin/AdminLogin';
const HartLimesLanding = React.lazy(() => import('./components/HartLimesLanding'));
const CreatorApplicationPage = React.lazy(() => import('./components/public/CreatorApplicationPage'));
import ForgotPassword from '@/components/admin/ForgotPassword';
import Imprint from '@/components/legal/Imprint';
import PrivacyPolicy from '@/components/legal/PrivacyPolicy';
import LegalPage from '@/components/legal/LegalPage';
import TaskSubmissionPage from '@/components/public/TaskSubmissionPage';
import InternPortalPage from '@/components/public/InternPortalPage';
import TopNav from '@/components/TopNav';
import { Toaster } from 'sonner';
import { LangProvider } from '@/lib/i18n';
import { BrandProvider } from '@/lib/BrandContext';
import { ConfigProvider } from '@/lib/ConfigContext';
import CookieBanner from '@/components/CookieBanner';

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

// --- Main App Component ---
const App: React.FC = () => {
  const router = createBrowserRouter([
    // --- Standalone full-bleed pages (no AppLayout wrapper) ---
    {
      path: '/',
      element: (
        <div className="min-h-screen bg-surface-950 px-4 py-12">
          <div className="max-w-5xl mx-auto space-y-10 md:space-y-20">
            <TopNav />
            <Header />
            <main className="space-y-10 md:space-y-20">
              <React.Suspense fallback={<div>Loading...</div>}>
                <ApplicationForm />
              </React.Suspense>
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
      ),
    },
    {
      path: 'admin',
      element: (
        <div className="min-h-screen bg-[#080808] px-4 py-12">
          <TopNav />
          <AdminLogin />
        </div>
      ),
    },
    {
      path: 'admin/dashboard',
      element: <ConfigProvider><BrandProvider><Dashboard /></BrandProvider></ConfigProvider>,
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
          <HartLimesLanding forceMode="influencer" />
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
          element: <ForgotPassword />,
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
      <RouterProvider router={router} />
      <Toaster position="top-right" richColors />
      <CookieBanner />
    </LangProvider>
  );
};

export default App;
