import React, { useState } from 'react';
import DisputesTab from './finance/DisputesTab';
import InvoicesTab from './finance/InvoicesTab';
import OverviewTab from './finance/OverviewTab';
import ActionCenterTab from './finance/ActionCenterTab';
import FinanceMailsTab from './finance/FinanceMailsTab';
import EmmaPlannerTab from './finance/EmmaPlannerTab';
import MonthlyReportingTab from './finance/MonthlyReportingTab';
import FinancePipelineTab from './finance/FinancePipelineTab';
import CashTab from './finance/CashTab';
import PaymentPlanTab from './finance/PaymentPlanTab';
import type { FinanceTab } from './finance/financeTypes';

type ExtendedFinanceTab = FinanceTab | 'actionCenter' | 'financeMails' | 'emmaPlanner';

const TABS: { id: ExtendedFinanceTab; label: string }[] = [
  { id: 'actionCenter',     label: '🚨 Action Center' },
  { id: 'paymentPlan',      label: '🧮 Payment Plan' },
  { id: 'cash',             label: '💰 Cash' },
  { id: 'pipeline',         label: '📋 Pipeline' },
  { id: 'disputes',         label: 'Disputes' },
  { id: 'invoices',         label: 'Invoices & Mahnungen' },
  { id: 'overview',         label: 'Overview' },
  { id: 'monthlyReporting', label: '📊 Monats-Reporting' },
  { id: 'financeMails',     label: '📬 Finance Mails' },
  { id: 'emmaPlanner',      label: '🗓 Emma · Plan' },
];

interface Props { activeTab?: ExtendedFinanceTab; }

const FinanceView: React.FC<Props> = ({ activeTab: initialTab }) => {
  const [activeTab, setActiveTab] = useState<ExtendedFinanceTab>(initialTab ?? 'actionCenter');

  return (
    <div className="space-y-6 animate-[fadeIn_0.3s_ease-out]">
      {/* Header */}
      <div>
        <h2 className="text-xl font-black tracking-tight" style={{ color: '#1d1d1f' }}>Finance</h2>
        <p className="text-sm mt-0.5" style={{ color: '#6e6e73' }}>
          Disputes, invoices, and financial overview across all brands
        </p>
      </div>

      {/* Tab navigation */}
      <div className="flex flex-wrap gap-1 p-1 rounded-2xl w-fit" style={{ background: 'rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.06)' }}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="px-5 py-2 text-sm font-semibold rounded-xl transition-all"
            style={{
              background: activeTab === tab.id ? '#0F766E' : 'transparent',
              color: activeTab === tab.id ? '#ffffff' : '#515154',
              border: activeTab === tab.id ? '1px solid #b8801f' : '1px solid transparent',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div>
        {activeTab === 'actionCenter'      && <ActionCenterTab />}
        {activeTab === 'paymentPlan'       && <PaymentPlanTab />}
        {activeTab === 'cash'              && <CashTab />}
        {activeTab === 'pipeline'          && <FinancePipelineTab />}
        {activeTab === 'disputes'          && <DisputesTab />}
        {activeTab === 'invoices'          && <InvoicesTab />}
        {activeTab === 'overview'          && <OverviewTab />}
        {activeTab === 'monthlyReporting'  && <MonthlyReportingTab />}
        {activeTab === 'financeMails'      && <FinanceMailsTab />}
        {activeTab === 'emmaPlanner'       && <EmmaPlannerTab />}
      </div>
    </div>
  );
};

export default FinanceView;
