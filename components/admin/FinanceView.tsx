import React, { useState } from 'react';
import DisputesTab from './finance/DisputesTab';
import InvoicesTab from './finance/InvoicesTab';
import OverviewTab from './finance/OverviewTab';
import FinanceMailsTab from './finance/FinanceMailsTab';
import EmmaPlannerTab from './finance/EmmaPlannerTab';
import type { FinanceTab } from './finance/financeTypes';

type ExtendedFinanceTab = FinanceTab | 'financeMails' | 'emmaPlanner';

const TABS: { id: ExtendedFinanceTab; label: string }[] = [
  { id: 'disputes', label: 'Disputes' },
  { id: 'invoices', label: 'Invoices & Mahnungen' },
  { id: 'overview', label: 'Overview' },
  { id: 'financeMails', label: '📬 Finance Mails' },
  { id: 'emmaPlanner', label: '🗓 Emma · Plan' },
];

interface Props { activeTab?: ExtendedFinanceTab; }

const FinanceView: React.FC<Props> = ({ activeTab: initialTab }) => {
  const [activeTab, setActiveTab] = useState<ExtendedFinanceTab>(initialTab ?? 'disputes');

  return (
    <div className="space-y-6 animate-[fadeIn_0.3s_ease-out]">
      {/* Header */}
      <div>
        <h2 className="text-xl font-black text-white tracking-tight">Finance</h2>
        <p className="text-sm text-slate-500 mt-0.5">
          Disputes, invoices, and financial overview across all brands
        </p>
      </div>

      {/* Tab navigation */}
      <div className="flex flex-wrap gap-1 bg-white/[0.05] border border-white/[0.06] p-1 rounded-2xl w-fit">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-5 py-2 text-sm font-semibold rounded-xl transition-all ${
              activeTab === tab.id
                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div>
        {activeTab === 'disputes' && <DisputesTab />}
        {activeTab === 'invoices' && <InvoicesTab />}
        {activeTab === 'overview' && <OverviewTab />}
        {activeTab === 'financeMails' && <FinanceMailsTab />}
        {activeTab === 'emmaPlanner' && <EmmaPlannerTab />}
      </div>
    </div>
  );
};

export default FinanceView;
