import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabaseClient';
import type { Session } from '@supabase/supabase-js';
import Header from './components/Header';
import {
  createBrowserRouter,
  RouterProvider,
  Outlet,
  useNavigate,
} from 'react-router-dom';
import ApplicationForm from './components/ApplicationForm';
import Footer from './components/Footer';
import FAQ from './components/FAQ';
import Dashboard from './components/admin/Dashboard';
import AdminLogin from './components/admin/AdminLogin';
import ForgotPassword from './components/admin/ForgotPassword';
import Imprint from './components/legal/Imprint';
import PrivacyPolicy from './components/legal/PrivacyPolicy';
import LegalPage from './components/legal/LegalPage';
import TaskSubmissionPage from './components/public/TaskSubmissionPage';
import Logo from './components/icons/Logo';
import { Toaster } from 'sonner';

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
    <div className="min-h-screen relative py-12 px-4 transition-colors duration-500 selection:bg-primary-100">
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-primary-400/20 dark:bg-primary-600/10 rounded-full blur-[150px] animate-blob"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-400/20 dark:bg-indigo-600/10 rounded-full blur-[150px] animate-blob animation-delay-2000"></div>
        <div className="absolute top-[30%] right-[10%] w-[40%] h-[40%] bg-teal-300/20 dark:bg-teal-600/10 rounded-full blur-[120px] animate-blob animation-delay-4000"></div>
      </div>
      <div className="w-full max-w-7xl mx-auto relative z-10">
        <nav className="flex justify-center mb-16">
          <div className="p-1.5 rounded-full shadow-2xl flex items-center space-x-4 bg-gray-900/30 backdrop-blur-2xl border border-white/20">
            <Logo className="h-10 w-auto" />
            <div className="flex space-x-1">
              <button
                onClick={() => navigate('/')}
                className={`px-8 py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${
                  location.pathname === '/'
                    ? 'bg-primary-600 text-white shadow-xl shadow-primary-500/30'
                    : 'text-gray-500 hover:text-gray-700 dark:hover:text-white'
                }`}
              >
                Portal
              </button>
              <button
                onClick={() => navigate('/admin')}
                className={`px-8 py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${
                  location.pathname.startsWith('/admin')
                    ? 'bg-primary-600 text-white shadow-xl shadow-primary-500/30'
                    : 'text-gray-500 hover:text-gray-700 dark:hover:text-white'
                }`}
              >
                Admin Hub
              </button>
            </div>
          </div>
        </nav>
        <Outlet context={{ session, isDemoMode, setIsDemoMode }} />
        <Footer />
      </div>
    </div>
  );
};

// --- Main App Component ---
const App: React.FC = () => {
  const router = createBrowserRouter([
    {
      path: '/',
      element: <AppLayout />,
      children: [
        {
          index: true,
          element: (
            <div className="max-w-5xl mx-auto space-y-10 md:space-y-20">
              <Header />
              <main className="space-y-10 md:space-y-20">
                <React.Suspense
                  fallback={<div>Loading Application Form...</div>}
                >
                  <ApplicationForm />
                </React.Suspense>
                <div className="space-y-6">
                  <h2 className="text-xs font-black uppercase tracking-[0.4em] text-center text-gray-500 mb-8">
                    Got Questions? Check our FAQs
                  </h2>
                  <FAQ />
                </div>
              </main>
            </div>
          ),
        },
        {
          path: 'admin',
          element: <AdminLogin />,
        },
        {
          path: 'admin/dashboard',
          element: <Dashboard />,
        },
        {
          path: 'admin/forgot-password',
          element: <ForgotPassword />,
        },
        {
          path: 'task/:accessToken',
          element: (
            <React.Suspense fallback={<div>Loading Task Submission...</div>}>
              <TaskSubmissionPage />
            </React.Suspense>
          ),
        },
        {
          path: 'imprint',
          element: (
            <React.Suspense fallback={<div>Loading Imprint...</div>}>
              <Imprint />
            </React.Suspense>
          ),
        },
        {
          path: 'privacy',
          element: (
            <React.Suspense fallback={<div>Loading Privacy Policy...</div>}>
              <PrivacyPolicy />
            </React.Suspense>
          ),
        },
        {
          path: 'legal',
          element: (
            <React.Suspense fallback={<div>Loading Legal Page...</div>}>
              <LegalPage />
            </React.Suspense>
          ),
        },
      ],
    },
  ]);

  return (
    <>
      <RouterProvider router={router} />
      <Toaster position="top-right" richColors />
    </>
  );
};

export default App;
