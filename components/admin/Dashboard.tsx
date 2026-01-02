
import React, { useState, useEffect } from 'react';
import KanbanBoard from './KanbanBoard';
import InsightsView from './InsightsView';
import EmailTemplateManager from './EmailTemplateManager';
import { getApplications } from '../../lib/actions';
import type { Application } from '../../types';

const Dashboard: React.FC = () => {
  const [tab, setTab] = useState<'pipeline' | 'insights' | 'emails'>('pipeline');
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    const data = await getApplications();
    setApps(data);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="space-y-10">
      <nav className="flex items-center gap-10 border-b border-gray-100 dark:border-slate-800 pb-2">
        {[
          { id: 'pipeline', label: 'Kanban Pipeline' },
          { id: 'insights', label: 'KPI Dashboard' },
          { id: 'emails', label: 'Email Templates' },
        ].map(t => (
          <button 
            key={t.id}
            onClick={() => setTab(t.id as any)}
            className={`text-[11px] font-black uppercase tracking-[0.3em] pb-4 transition-all relative ${tab === t.id ? 'text-primary-600' : 'text-gray-400 hover:text-gray-600'}`}
          >
            {t.label}
            {tab === t.id && <div className="absolute bottom-[-1px] left-0 right-0 h-1 bg-primary-600 rounded-full animate-[fadeIn_0.3s_ease-out]" />}
          </button>
        ))}
      </nav>

      <main>
        {tab === 'pipeline' && <KanbanBoard />}
        {tab === 'insights' && <InsightsView applications={apps} />}
        {tab === 'emails' && <EmailTemplateManager />}
      </main>
    </div>
  );
};

export default Dashboard;
