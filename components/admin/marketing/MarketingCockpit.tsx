import React, { useEffect, useMemo, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import ExecutiveSummary, { type ExecRole } from '../home/ExecutiveSummary';
import { supabase } from '@/lib/supabaseClient';
import { useBrand } from '@/lib/BrandContext';
import { CAMPAIGN_STATUSES, STATUS_LABELS, type CampaignStatus } from '@/lib/useCampaigns';

interface MarketingCockpitProps {
  role?: ExecRole;
}

// Monochromatic-per-chart palette — slate-neutral + one accent per metric
const PLATFORM_COLORS: Record<string, string> = {
  meta: '#4f46e5', // indigo-600
  google: '#0284c7', // sky-600
  tiktok: '#475569', // slate-600
  amazon: '#ea580c', // orange-600
  cross: '#94a3b8',
};

const TOOLTIP_STYLE = {
  background: '#ffffff',
  border: '1px solid #e2e8f0',
  borderRadius: 8,
  fontSize: 11,
  padding: '6px 8px',
  color: '#0f172a',
} as const;

interface CampaignRow {
  id: string;
  brand_id: string;
  platform: string;
  status: string;
}

interface KpiRow {
  campaign_id: string;
  spend: number | null;
  snapshot_date: string;
}

const MarketingCockpit: React.FC<MarketingCockpitProps> = ({ role = 'staff' }) => {
  const { brands, activeBrand } = useBrand();
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);
  const [kpis, setKpis] = useState<KpiRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const now = new Date();
      const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

      let campaignsQuery = supabase.from('campaigns').select('id, brand_id, platform, status');
      if (activeBrand) campaignsQuery = campaignsQuery.eq('brand_id', activeBrand.id);

      const cRes = await campaignsQuery;
      const cList = (cRes.data as CampaignRow[]) ?? [];

      // KPI query — when activeBrand set, restrict to campaigns for that brand
      let kpisQuery = supabase
        .from('campaign_kpis')
        .select('campaign_id, spend, snapshot_date')
        .gte('snapshot_date', monthStart);
      if (activeBrand) {
        const ids = cList.map((c) => c.id);
        if (ids.length === 0) {
          if (cancelled) return;
          setCampaigns(cList);
          setKpis([]);
          setLoading(false);
          return;
        }
        kpisQuery = kpisQuery.in('campaign_id', ids);
      }
      const kRes = await kpisQuery;
      if (cancelled) return;
      setCampaigns(cList);
      setKpis((kRes.data as KpiRow[]) ?? []);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [activeBrand]);

  const campaignPlatform = useMemo(() => {
    const m = new Map<string, string>();
    campaigns.forEach((c) => m.set(c.id, c.platform));
    return m;
  }, [campaigns]);

  const campaignBrand = useMemo(() => {
    const m = new Map<string, string>();
    campaigns.forEach((c) => m.set(c.id, c.brand_id));
    return m;
  }, [campaigns]);

  const brandMap = useMemo(() => {
    const m = new Map<string, { name: string; emoji?: string; color?: string }>();
    brands.forEach((b) => m.set(b.id, { name: b.name, emoji: b.emoji, color: b.color }));
    return m;
  }, [brands]);

  const platformData = useMemo(() => {
    const totals: Record<string, number> = {};
    kpis.forEach((k) => {
      const p = campaignPlatform.get(k.campaign_id) ?? 'other';
      totals[p] = (totals[p] ?? 0) + (k.spend ?? 0);
    });
    return Object.entries(totals)
      .filter(([, v]) => v > 0)
      .map(([name, value]) => ({ name, value: Math.round(value) }));
  }, [kpis, campaignPlatform]);

  const brandData = useMemo(() => {
    const totals: Record<string, number> = {};
    kpis.forEach((k) => {
      const b = campaignBrand.get(k.campaign_id);
      if (!b) return;
      totals[b] = (totals[b] ?? 0) + (k.spend ?? 0);
    });
    return Object.entries(totals)
      .map(([brandId, value]) => ({
        name: brandMap.get(brandId)?.name ?? brandId.slice(0, 6),
        value: Math.round(value),
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [kpis, campaignBrand, brandMap]);

  const statusData = useMemo(() => {
    const counts: Record<string, number> = {};
    campaigns.forEach((c) => {
      counts[c.status] = (counts[c.status] ?? 0) + 1;
    });
    return (CAMPAIGN_STATUSES as CampaignStatus[])
      .filter((s) => ['live', 'paused', 'approved', 'brief_review', 'draft'].includes(s))
      .map((s) => ({ name: STATUS_LABELS[s], value: counts[s] ?? 0, key: s }));
  }, [campaigns]);

  const hasPlatform = platformData.length > 0;
  const hasBrand = brandData.length > 0;
  const hasStatus = statusData.some((d) => d.value > 0);

  return (
    <div className="space-y-6 animate-[fadeIn_0.3s_ease-out]">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-slate-900">Marketing Cockpit</h2>
        <p className="text-sm text-slate-600 mt-1">
          Role-adaptive summary of campaigns, spend and creative throughput.
          {activeBrand && (
            <span className="ml-2 inline-flex items-center gap-1 text-indigo-700 font-semibold">
              · {activeBrand.emoji} {activeBrand.name}
            </span>
          )}
        </p>
      </div>

      <ExecutiveSummary role={role} />

      {/* Overview strip */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Platform Split */}
        <div className="bg-white rounded-2xl ring-1 ring-slate-200 hover:ring-slate-300 p-4 transition-all">
          <div className="flex items-baseline justify-between mb-2">
            <h5 className="text-[11px] font-black uppercase tracking-wider text-slate-600">
              Platform Split · MTD Spend
            </h5>
          </div>
          {loading ? (
            <ChartSkeleton />
          ) : hasPlatform ? (
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={platformData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={40}
                  outerRadius={70}
                  paddingAngle={2}
                >
                  {platformData.map((entry) => (
                    <Cell
                      key={entry.name}
                      fill={PLATFORM_COLORS[entry.name] ?? '#cbd5e1'}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  formatter={(v: number) => `€${v.toLocaleString()}`}
                />
                <Legend
                  verticalAlign="bottom"
                  iconSize={8}
                  wrapperStyle={{ fontSize: 10, color: '#64748b' }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart hint="No spend booked this month" />
          )}
        </div>

        {/* Spend by Brand (or single-brand total when filtered) */}
        <div className="bg-white rounded-2xl ring-1 ring-slate-200 hover:ring-slate-300 p-4 transition-all">
          <div className="flex items-baseline justify-between mb-2">
            <h5 className="text-[11px] font-black uppercase tracking-wider text-slate-600">
              {activeBrand ? `Spend · ${activeBrand.name} · MTD` : 'Spend by Brand · MTD'}
            </h5>
          </div>
          {loading ? (
            <ChartSkeleton />
          ) : activeBrand ? (
            <div className="h-[180px] flex flex-col items-center justify-center">
              <span className="text-3xl">{activeBrand.emoji}</span>
              <span className="text-3xl font-semibold text-slate-900 mt-2 tabular-nums">
                €{(brandData[0]?.value ?? 0).toLocaleString()}
              </span>
              <span className="text-xs text-slate-500 mt-1">{activeBrand.name} spend MTD</span>
            </div>
          ) : hasBrand ? (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={brandData} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#64748b' }} interval={0} />
                <YAxis tick={{ fontSize: 9, fill: '#64748b' }} />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  formatter={(v: number) => `€${v.toLocaleString()}`}
                />
                <Bar dataKey="value" fill="#4f46e5" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart hint="No brand spend this month" />
          )}
        </div>

        {/* Campaign Status */}
        <div className="bg-white rounded-2xl ring-1 ring-slate-200 hover:ring-slate-300 p-4 transition-all">
          <div className="flex items-baseline justify-between mb-2">
            <h5 className="text-[11px] font-black uppercase tracking-wider text-slate-600">
              Campaign Status
            </h5>
          </div>
          {loading ? (
            <ChartSkeleton />
          ) : hasStatus ? (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart
                data={statusData}
                layout="vertical"
                margin={{ top: 4, right: 12, left: 10, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 9, fill: '#64748b' }} allowDecimals={false} />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 10, fill: '#64748b' }}
                  width={80}
                />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Bar dataKey="value" fill="#10b981" radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart hint="No campaigns yet" />
          )}
        </div>
      </div>
    </div>
  );
};

const ChartSkeleton: React.FC = () => (
  <div className="h-[180px] rounded-lg bg-slate-50 animate-pulse" />
);

const EmptyChart: React.FC<{ hint: string }> = ({ hint }) => (
  <div className="h-[180px] flex items-center justify-center">
    <p className="text-xs text-slate-500 italic">{hint}</p>
  </div>
);

export default MarketingCockpit;
