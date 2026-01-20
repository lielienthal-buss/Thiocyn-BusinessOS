import React, { useState, useEffect } from 'react';
import SettingsView from './SettingsView';
import ApplicationListView from './ApplicationListView';
import ApplicantDetailView from './ApplicantDetailView';
import InsightsView from './InsightsView';
import EmailTemplateManager from './EmailTemplateManager';
import { getApplicant } from '../../lib/actions'; // Import getApplicant
import type { Application } from '../../types'; // Import Application
import Spinner from '../ui/Spinner';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import type { Session } from '@supabase/supabase-js';

type Tab = 'applications' | 'settings' | 'insights' | 'emailTemplates';

interface OutletContext {
  session: Session | null;
  isDemoMode: boolean;
  setIsDemoMode: React.Dispatch<React.SetStateAction<boolean>>;
}

const Dashboard: React.FC = () => {
  const { session, isDemoMode, setIsDemoMode } =
    useOutletContext<OutletContext>();
  const navigate = useNavigate();

  const [tab, setTab] = useState<Tab>('applications');
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [selectedApplicationData, setSelectedApplicationData] =
    useState<Application | null>(null); // New state for fetched applicant data
  const [loadingApplicant, setLoadingApplicant] = useState(false); // New state for loading applicant details

  useEffect(() => {
    if (!session && !isDemoMode) {
      navigate('/admin');
    }
  }, [session, isDemoMode, navigate]);

  const handleLogout = async () => {
    if (isDemoMode) {
      setIsDemoMode(false);
      navigate('/admin');
    } else {
      await supabase.auth.signOut();
      navigate('/admin');
    }
  };

  // Effect to fetch selected applicant data when selectedAppId changes
  useEffect(() => {
    const fetchApplicant = async () => {
      if (selectedAppId) {
        setLoadingApplicant(true);
        const applicant = await getApplicant(selectedAppId);
        setSelectedApplicationData(applicant);
        setLoadingApplicant(false);
      } else {
        setSelectedApplicationData(null); // Clear data if no applicant is selected
      }
    };
    fetchApplicant();
  }, [selectedAppId]);

  const renderContent = () => {
    if (tab === 'settings') {
      return <SettingsView isDemoMode={isDemoMode} />;
    }

    if (tab === 'insights') {
      return <InsightsView />;
    }

    if (tab === 'applications') {
      if (selectedAppId) {
        if (loadingApplicant) {
          return (
            <div className="flex justify-center py-20">
              <Spinner className="w-10 h-10 text-primary-600" />
            </div>
          );
        }
        return (
          <ApplicantDetailView
            application={selectedApplicationData} // Pass the fetched application data
          />
        );
      }
      return <ApplicationListView onSelectApplicant={setSelectedAppId} />;
    }

    if (tab === 'emailTemplates') {
      return <EmailTemplateManager />;
    }

    return null;
  };

  return (
    <div className="animate-[fadeIn_0.5s_ease-out]">
      <header className="flex flex-col md:flex-row md:items-end justify-between border-b border-gray-300 dark:border-slate-800 pb-10 mb-10 relative z-10 gap-6">
        <div>
          <h1 className="text-4xl font-black text-gray-900 dark:text-white tracking-tighter">
            Take A Shot Hub
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {isDemoMode ? (
              <span className="inline-flex items-center px-3 py-1 bg-orange-500/10 text-orange-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-orange-500/20 animate-pulse">
                Demo Mode Enabled
              </span>
            ) : (
              <>
                Logged in as:{' '}
                <span className="text-primary-600 font-bold">
                  {session?.user.email}
                </span>
              </>
            )}
          </p>
        </div>
        <div className="flex items-center space-x-6">
          <div className="hidden md:block text-[10px] font-black text-primary-600 uppercase tracking-[0.3em] bg-primary-50 dark:bg-primary-900/40 px-6 py-2 rounded-full border border-primary-100 dark:border-primary-800">
            Recruiter Access
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-600 text-white text-xs font-bold rounded-lg"
          >
            Logout
          </button>
        </div>
      </header>
      <div className="space-y-10">
        <nav className="flex items-center gap-10 border-b border-gray-100 dark:border-slate-800 pb-2">
          {[
            { id: 'applications', label: 'Applications' },
            { id: 'insights', label: 'Insights' },
            { id: 'settings', label: 'Settings' },
            { id: 'emailTemplates', label: 'Email Templates' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id as Tab)}
              className={`text-sm font-bold uppercase pb-4 transition-colors ${tab === t.id ? 'text-primary-600 border-b-2 border-primary-600' : 'text-gray-500'}`}
            >
              {t.label}
            </button>
          ))}
        </nav>

        <main>{renderContent()}</main>
      </div>
    </div>
  );
};

export default Dashboard;
