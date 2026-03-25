import React, { useState } from 'react';
import DisputesTab from './finance/DisputesTab';
import InvoicesTab from './finance/InvoicesTab';
import OverviewTab from './finance/OverviewTab';
import type { FinanceTab } from './finance/financeTypes';

const TABS: { id: FinanceTab; label: string }[] = [
  { id: 'disputes', label: 'Disputes' },
  { id: 'invoices', label: 'Invoices & Mahnungen' },
  { id: 'overview', label: 'Overview' },
];

interface Props { activeTab?: FinanceTab; }

const FinanceView: React.FC<Props> = ({ activeTab: initialTab }) => {
  const [activeTab, setActiveTab] = useState<FinanceTab>(initialTab ?? 'disputes');

  return (
    <div className="space-y-6 animate-[fadeIn_0.3s_ease-out]">
      {/* Header */}
      <div>
        <h2 className="text-xl font-black text-gray-900 tracking-tight">Finance</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          Disputes, invoices, and financial overview across all brands
        </p>
      </div>

      {/* Tab navigation */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-2xl w-fit">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-5 py-2 text-sm font-semibold rounded-xl transition-all ${
              activeTab === tab.id
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
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
      </div>
    </div>
  );
};

export default FinanceView;
