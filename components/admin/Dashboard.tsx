import React, { useState, useEffect } from 'react';
import SettingsView from './SettingsView';
import ApplicationListView from './ApplicationListView';
import ApplicantDetailView from './ApplicantDetailView';
import InsightsView from './InsightsView'; // Import the new InsightsView
import EmailTemplateManager from './EmailTemplateManager'; // Import EmailTemplateManager
import { getSettings } from '../../lib/actions';
import type { RecruiterSettings } from '../../types';
import SpinnerIcon from '../icons/SpinnerIcon';

type Tab = 'applications' | 'settings' | 'insights' | 'emailTemplates'; // Add 'insights' to the Tab type

const Dashboard: React.FC = () => {
  const [tab, setTab] = useState<Tab>('applications');
  const [settings, setSettings] = useState<RecruiterSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    const recruiterSettings = await getSettings();
    setSettings(recruiterSettings);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const renderContent = () => {
    if (loading) {
      return <div className="flex justify-center py-20"><SpinnerIcon className="w-10 h-10 animate-spin text-primary-600" /></div>;
    }

    if (tab === 'settings') {
      return <SettingsView />;
    }

    if (tab === 'insights') { // New case for InsightsView
      return <InsightsView />;
    }

    if (tab === 'applications') {
      if (selectedAppId) {
        return (
          <ApplicantDetailView
            applicationId={selectedAppId}
            settings={settings}
            onBack={() => setSelectedAppId(null)}
            onNoteAdded={loadData}
          />
        );
      }
      return <ApplicationListView onSelectApplicant={setSelectedAppId} />;
    }

    if (tab === 'emailTemplates') { // New case for EmailTemplateManager
      return <EmailTemplateManager />;
    }
    
    return null;
  };

  return (
    <div className="space-y-10">
      <nav className="flex items-center gap-10 border-b border-gray-100 dark:border-slate-800 pb-2">
        {[
          { id: 'applications', label: 'Applications' },
          { id: 'insights', label: 'Insights' }, // Add Insights tab button
          { id: 'settings', label: 'Settings' },
          { id: 'emailTemplates', label: 'Email Templates' }, // Add Email Templates tab button
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