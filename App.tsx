
import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabaseClient';
import Header from './components/Header';
import ApplicationForm from './components/public/ApplicationForm';
import ChatBot from './components/public/ChatBot';
import Footer from './components/Footer';
import Dashboard from './components/admin/Dashboard';
import AdminLogin from './components/admin/AdminLogin';
import AdminSignup from './components/admin/AdminSignup';
import ForgotPassword from './components/admin/ForgotPassword';
import Imprint from './components/public/Imprint';
import PrivacyPolicy from './components/public/PrivacyPolicy';

type ViewType = 'public' | 'admin' | 'imprint' | 'privacy';
type AdminSubView = 'login' | 'signup' | 'forgot' | 'dashboard';

const App: React.FC = () => {
  const [view, setView] = useState<ViewType>('public');
  const [adminSubView, setAdminSubView] = useState<AdminSubView>('login');
  const [session, setSession] = useState<any>(null);
  const [authInitialized, setAuthInitialized] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) setAdminSubView('dashboard');
      setAuthInitialized(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        setAdminSubView('dashboard');
      } else {
        setAdminSubView(prev => prev === 'dashboard' ? 'login' : prev);
      }
    });

    const handleDemoStart = () => {
      setIsDemoMode(true);
      setAdminSubView('dashboard');
    };
    window.addEventListener('start-demo-mode', handleDemoStart);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('start-demo-mode', handleDemoStart);
    };
  }, []);

  const handleLogout = async () => {
    if (isDemoMode) {
      setIsDemoMode(false);
      setAdminSubView('login');
    } else {
      await supabase.auth.signOut();
      setAdminSubView('login');
    }
  };

  if (!authInitialized) return null;

  const renderAdminView = () => {
    const isAuthenticated = session || isDemoMode;
    
    if (!isAuthenticated && adminSubView === 'dashboard') {
      return <AdminLogin onGoToSignup={() => setAdminSubView('signup')} onGoToForgot={() => setAdminSubView('forgot')} />;
    }

    switch (adminSubView) {
      case 'signup':
        return <AdminSignup onBackToLogin={() => setAdminSubView('login')} />;
      case 'forgot':
        return <ForgotPassword onBackToLogin={() => setAdminSubView('login')} />;
      case 'dashboard':
        return (
          <div className="animate-[fadeIn_0.5s_ease-out]">
            <header className="flex flex-col md:flex-row md:items-end justify-between border-b border-gray-300 dark:border-slate-800 pb-10 mb-10 relative z-10 gap-6">
              <div>
                <h1 className="text-4xl font-black text-gray-900 dark:text-white tracking-tighter">Take A Shot Hub</h1>
                <p className="text-gray-500 text-sm mt-1">
                  {isDemoMode ? (
                    <span className="inline-flex items-center px-3 py-1 bg-orange-500/10 text-orange-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-orange-500/20 animate-pulse">Demo Mode Enabled</span>
                  ) : (
                    <>Logged in as: <span className="text-primary-600 font-bold">{session?.user.email}</span></>
                  )}
                </p>
              </div>
              <div className="flex items-center space-x-6">
                <div className="hidden md:block text-[10px] font-black text-primary-600 uppercase tracking-[0.3em] bg-primary-50 dark:bg-primary-900/40 px-6 py-2 rounded-full border border-primary-100 dark:border-primary-800">Recruiter Access</div>
                <button 
                  onClick={handleLogout}
                  className="text-[10px] font-black text-red-500 hover:text-red-700 transition-colors uppercase tracking-[0.2em] px-4 py-2 border border-red-100 dark:border-red-900/30 rounded-full"
                >
                  Logout
                </button>
              </div>
            </header>
            <main className="relative z-10">
              <Dashboard />
            </main>
          </div>
        );
      case 'login':
      default:
        return <AdminLogin onGoToSignup={() => setAdminSubView('signup')} onGoToForgot={() => setAdminSubView('forgot')} />;
    }
  };

  return (
    <div className="min-h-screen relative py-12 px-4 transition-colors duration-500 selection:bg-primary-100">
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-primary-400/20 dark:bg-primary-600/10 rounded-full blur-[150px] animate-blob"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-400/20 dark:bg-indigo-600/10 rounded-full blur-[150px] animate-blob animation-delay-2000"></div>
        <div className="absolute top-[30%] right-[10%] w-[40%] h-[40%] bg-teal-300/20 dark:bg-teal-600/10 rounded-full blur-[120px] animate-blob animation-delay-4000"></div>
      </div>

      <div className="w-full max-w-7xl mx-auto relative z-10">
        <nav className="flex justify-center mb-16">
          <div className="glass-card p-1.5 rounded-full shadow-2xl flex space-x-1 border-white/50 dark:border-slate-800">
            <button 
              onClick={() => setView('public')}
              className={`px-8 py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${view === 'public' ? 'bg-primary-600 text-white shadow-xl shadow-primary-500/30' : 'text-gray-500 hover:text-gray-700 dark:hover:text-white'}`}
            >
              Portal
            </button>
            <button 
              onClick={() => setView('admin')}
              className={`px-8 py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${view === 'admin' ? 'bg-primary-600 text-white shadow-xl shadow-primary-500/30' : 'text-gray-500 hover:text-gray-700 dark:hover:text-white'}`}
            >
              Pipeline
            </button>
          </div>
        </nav>

        {view === 'public' && (
          <div className="max-w-5xl mx-auto space-y-20">
            <Header />
            <main className="space-y-20">
              <ApplicationForm />
              <div className="space-y-6">
                <h2 className="text-xs font-black uppercase tracking-[0.4em] text-center text-gray-500 mb-8">Got Questions? Ask our AI Guide</h2>
                <ChatBot />
              </div>
            </main>
          </div>
        )}

        {view === 'admin' && (
          <div className="space-y-8">
            {renderAdminView()}
          </div>
        )}

        {view === 'imprint' && <Imprint onBack={() => setView('public')} />}
        {view === 'privacy' && <PrivacyPolicy onBack={() => setView('public')} />}
        
        <Footer onNavImprint={() => setView('imprint')} onNavPrivacy={() => setView('privacy')} />
      </div>
    </div>
  );
};

export default App;
