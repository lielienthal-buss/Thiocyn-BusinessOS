import React, { useState } from 'react';
import BrandKPIsTab from './analytics/BrandKPIsTab';
import AdPerformanceTab from './analytics/AdPerformanceTab';

type AnalyticsTab = 'brandKPIs' | 'adPerformance';

const AnalyticsView: React.FC = () => {
  const [tab, setTab] = useState<AnalyticsTab>('brandKPIs');

  const TABS: { id: AnalyticsTab; label: string }[] = [
    { id: 'brandKPIs',     label: 'Brand KPIs' },
    { id: 'adPerformance', label: 'Ad Performance' },
  ];

  return (
    <div className="animate-[fadeIn_0.3s_ease-out]">
      {/* Section header */}
      <div className="mb-6">
        <h2 className="text-xl font-black text-[#1d1d1f] tracking-tight">Analytics</h2>
        <p className="text-sm text-[#6e6e73] mt-0.5">Cross-brand KPIs and ad campaign performance</p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-black/[0.06] mb-6">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-all border-b-2 -mb-px ${
              tab === t.id
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-[#6e6e73] hover:text-[#1d1d1f]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'brandKPIs'     && <BrandKPIsTab />}
      {tab === 'adPerformance' && <AdPerformanceTab />}
    </div>
  );
};

export default AnalyticsView;
