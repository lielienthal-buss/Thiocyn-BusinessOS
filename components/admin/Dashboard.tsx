import React, { useState, useEffect } from 'react';
import SettingsView from './SettingsView';
import ApplicationListView from './ApplicationListView';
import ApplicantDetailView from './ApplicantDetailView';
import { getSettings } from '../../lib/actions';
import type { RecruiterSettings } from '../../types';
import SpinnerIcon from '../icons/SpinnerIcon';

type Tab = 'applications' | 'settings';

const Dashboard: React.FC = () => {
  const [tab, setTab] = useState<Tab>('applications');
  const [settings, setSettings] = useState<RecruiterSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    // Only fetch settings now, as lists manage their own data
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

    if (tab === 'applications') {
      if (selectedAppId) {
        return (
          <ApplicantDetailView
            applicationId={selectedAppId}
            settings={settings}
            onBack={() => setSelectedAppId(null)}
            onNoteAdded={loadData} // This could be optimized to not reload all settings
          />
        );
      }
      return <ApplicationListView onSelectApplicant={setSelectedAppId} />;
    }
    
    return null;
  };

  return (
    <div className="space-y-10">
      <nav className="flex items-center gap-10 border-b border-gray-100 dark:border-slate-800 pb-2">
        {[
          { id: 'applications', label: 'Applications' },
          { id: 'settings', label: 'Settings' },
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
