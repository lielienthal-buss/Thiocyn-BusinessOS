import React, { useState, useEffect } from 'react';
import SettingsView from './SettingsView';
import ApplicationListView from './ApplicationListView';
import ApplicantDetailView from './ApplicantDetailView';
import InsightsView from './InsightsView';
import EmailTemplateManager from './EmailTemplateManager';
import { getSettings, getApplicant } from '../../lib/actions'; // Import getApplicant
import type { RecruiterSettings, Application } from '../../types'; // Import Application
import SpinnerIcon from '../icons/SpinnerIcon';

type Tab = 'applications' | 'settings' | 'insights' | 'emailTemplates';

interface DashboardProps {
  isDemoMode: boolean;
}

const Dashboard: React.FC<DashboardProps> = ({ isDemoMode }) => {
  const [tab, setTab] = useState<Tab>('applications');
  const [settings, setSettings] = useState<RecruiterSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [selectedApplicationData, setSelectedApplicationData] = useState<Application | null>(null); // New state for fetched applicant data
  const [loadingApplicant, setLoadingApplicant] = useState(false); // New state for loading applicant details

  const loadData = async () => {
    setLoading(true);
    const recruiterSettings = await getSettings();
    setSettings(recruiterSettings);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

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
    if (loading) {
      return <div className="flex justify-center py-20"><SpinnerIcon className="w-10 h-10 animate-spin text-primary-600" /></div>;
    }

    if (tab === 'settings') {
      return <SettingsView isDemoMode={isDemoMode} />;
    }

    if (tab === 'insights') {
      return <InsightsView />;
    }

    if (tab === 'applications') {
      if (selectedAppId) {
        if (loadingApplicant) {
          return <div className="flex justify-center py-20"><SpinnerIcon className="w-10 h-10 animate-spin text-primary-600" /></div>;
        }
        return (
          <ApplicantDetailView
            application={selectedApplicationData} // Pass the fetched application data
            // settings={settings} // Not needed by ApplicantDetailView anymore
            // onBack={() => setSelectedAppId(null)} // Not needed by ApplicantDetailView anymore
            // onNoteAdded={loadData} // Not needed by ApplicantDetailView anymore
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
    <div className="space-y-10">
      <nav className="flex items-center gap-10 border-b border-gray-100 dark:border-slate-800 pb-2">
        {[
          { id: 'applications', label: 'Applications' },
          { id: 'insights', label: 'Insights' },
          { id: 'settings', label: 'Settings' },
          { id: 'emailTemplates', label: 'Email Templates' },
        ].map(t => (
          <button 
            key={t.id}
            onClick={() => setTab(t.id as Tab)}
            className={`text-sm font-bold uppercase pb-4 transition-colors ${tab === t.id ? 'text-primary-600 border-b-2 border-primary-600' : 'text-gray-500'}`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <main>
        {renderContent()}
      </main>
    </div>
  );
};

export default Dashboard;