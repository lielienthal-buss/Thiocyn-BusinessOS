import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Spinner from '@/components/ui/Spinner';

interface FunnelCounts {
  total: number;
  byStatus: Record<string, number>;
  newThisWeek: number;
  loading: boolean;
}

interface RecruitingOverviewProps {
  onNavigate: (tab: 'applications' | 'ambassadorApplications' | 'maInquiries') => void;
  isAdminOrOwner: boolean;
}

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

const STATUS_PALETTE: Record<string, string> = {
  new:         'bg-blue-100 text-blue-800',
  applied:     'bg-blue-100 text-blue-800',
  reviewing:   'bg-amber-100 text-amber-800',
  task_requested: 'bg-amber-100 text-amber-800',
  task_submitted: 'bg-amber-100 text-amber-800',
  interview:   'bg-purple-100 text-purple-800',
  qualified:   'bg-amber-100 text-amber-800',
  nda_sent:    'bg-purple-100 text-purple-800',
  in_dd:       'bg-indigo-100 text-indigo-800',
  approved:    'bg-emerald-100 text-emerald-800',
  hired:       'bg-emerald-100 text-emerald-800',
  active:      'bg-teal-100 text-teal-800',
  onboarding:  'bg-teal-100 text-teal-800',
  closed_won:  'bg-emerald-100 text-emerald-800',
  rejected:    'bg-rose-100 text-rose-700',
  closed_lost: 'bg-rose-100 text-rose-700',
  archived:    'bg-slate-100 text-slate-700',
};

async function fetchFunnel(table: string): Promise<FunnelCounts> {
  const { data, error } = await supabase.from(table).select('status, created_at');
  if (error) {
    console.error(`[recruiting-overview] ${table}`, error);
    return { total: 0, byStatus: {}, newThisWeek: 0, loading: false };
  }
  const rows = data ?? [];
  const byStatus: Record<string, number> = {};
  let newThisWeek = 0;
  const cutoff = Date.now() - SEVEN_DAYS_MS;
  for (const r of rows) {
    const s = (r as { status?: string }).status ?? 'unknown';
    byStatus[s] = (byStatus[s] ?? 0) + 1;
    const t = new Date((r as { created_at: string }).created_at).getTime();
    if (t >= cutoff) newThisWeek += 1;
  }
  return { total: rows.length, byStatus, newThisWeek, loading: false };
}

const RecruitingOverview: React.FC<RecruitingOverviewProps> = ({ onNavigate, isAdminOrOwner }) => {
  const [fellows, setFellows] = useState<FunnelCounts>({ total: 0, byStatus: {}, newThisWeek: 0, loading: true });
  const [ambassadors, setAmbassadors] = useState<FunnelCounts>({ total: 0, byStatus: {}, newThisWeek: 0, loading: true });
  const [maInquiries, setMaInquiries] = useState<FunnelCounts>({ total: 0, byStatus: {}, newThisWeek: 0, loading: true });

  useEffect(() => {
    fetchFunnel('applications').then(setFellows);
    fetchFunnel('ambassador_applications').then(setAmbassadors);
    if (isAdminOrOwner) {
      fetchFunnel('ma_inquiries').then(setMaInquiries);
    } else {
      setMaInquiries({ total: 0, byStatus: {}, newThisWeek: 0, loading: false });
    }
  }, [isAdminOrOwner]);

  const pendingActions = useMemo(() => {
    const pending: Array<{ source: string; label: string; count: number; tab: 'applications' | 'ambassadorApplications' | 'maInquiries' }> = [];
    if ((fellows.byStatus.applied ?? 0) > 0) pending.push({ source: 'Fellows', label: 'Applied — needs review', count: fellows.byStatus.applied, tab: 'applications' });
    if ((ambassadors.byStatus.new ?? 0) > 0) pending.push({ source: 'Ambassadors', label: 'New — needs review', count: ambassadors.byStatus.new, tab: 'ambassadorApplications' });
    if (isAdminOrOwner && (maInquiries.byStatus.new ?? 0) > 0) pending.push({ source: 'M&A', label: 'New inquiries', count: maInquiries.byStatus.new, tab: 'maInquiries' });
    return pending;
  }, [fellows, ambassadors, maInquiries, isAdminOrOwner]);

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-8">
      <header>
        <h1 className="text-2xl font-black tracking-tight text-[#1d1d1f]">Recruiting Overview</h1>
        <p className="mt-1 text-sm text-[#515154]">
          Combined view across all 3 funnels: Founders University, Ambassador Program, M&A pipeline.
        </p>
      </header>

      {pendingActions.length > 0 && (
        <section className="rounded-xl border border-amber-200 bg-amber-50 p-5">
          <h2 className="text-xs font-bold uppercase tracking-wider text-amber-900">Needs your attention</h2>
          <ul className="mt-3 space-y-2">
            {pendingActions.map((a, i) => (
              <li key={i} className="flex items-center justify-between text-sm">
                <span className="text-[#1d1d1f]"><strong>{a.source}:</strong> {a.label}</span>
                <button
                  onClick={() => onNavigate(a.tab)}
                  className="rounded-md bg-amber-900 px-3 py-1 text-xs font-bold text-amber-50 hover:bg-amber-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700 focus-visible:ring-offset-2"
                >
                  Review {a.count} →
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <FunnelCard
          title="Founders University"
          subtitle="Fellow applications"
          counts={fellows}
          accentColor="#0F766E"
          onClick={() => onNavigate('applications')}
        />
        <FunnelCard
          title="Ambassador Program"
          subtitle="Creator applications"
          counts={ambassadors}
          accentColor="#F27062"
          onClick={() => onNavigate('ambassadorApplications')}
        />
        <FunnelCard
          title="M&A Inquiries"
          subtitle={isAdminOrOwner ? 'Sell-your-brand pipeline' : 'Owner / Admin only'}
          counts={maInquiries}
          accentColor="#1d1d1f"
          onClick={() => isAdminOrOwner && onNavigate('maInquiries')}
          locked={!isAdminOrOwner}
        />
      </section>
    </div>
  );
};

interface FunnelCardProps {
  title: string;
  subtitle: string;
  counts: FunnelCounts;
  accentColor: string;
  onClick: () => void;
  locked?: boolean;
}

const FunnelCard: React.FC<FunnelCardProps> = ({ title, subtitle, counts, accentColor, onClick, locked }) => {
  const statusEntries = Object.entries(counts.byStatus).sort((a, b) => b[1] - a[1]);

  return (
    <article
      className={`rounded-xl border border-black/[0.08] bg-white p-6 shadow-sm transition-all ${
        locked ? 'opacity-50' : 'cursor-pointer hover:-translate-y-0.5 hover:shadow-md'
      }`}
      onClick={locked ? undefined : onClick}
      role={locked ? undefined : 'button'}
      tabIndex={locked ? -1 : 0}
      onKeyDown={(e) => { if (!locked && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onClick(); } }}
    >
      <header className="mb-4">
        <h3 className="text-lg font-bold text-[#1d1d1f]">{title}</h3>
        <p className="mt-0.5 text-xs text-[#515154]">{subtitle}</p>
      </header>

      {counts.loading ? (
        <div className="flex h-32 items-center justify-center"><Spinner /></div>
      ) : (
        <>
          <div className="flex items-baseline gap-3">
            <span className="text-4xl font-black tabular-nums" style={{ color: accentColor }}>
              {counts.total}
            </span>
            <span className="text-xs uppercase tracking-wider text-[#515154]">total</span>
          </div>

          {counts.newThisWeek > 0 && (
            <p className="mt-1 text-xs font-bold text-emerald-700">
              + {counts.newThisWeek} this week
            </p>
          )}

          {statusEntries.length > 0 && (
            <ul className="mt-4 space-y-1.5">
              {statusEntries.slice(0, 5).map(([status, count]) => (
                <li key={status} className="flex items-center justify-between text-xs">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 font-bold ${STATUS_PALETTE[status] ?? 'bg-slate-100 text-slate-700'}`}>
                    {status.replace(/_/g, ' ')}
                  </span>
                  <span className="tabular-nums font-semibold text-[#1d1d1f]">{count}</span>
                </li>
              ))}
            </ul>
          )}

          {counts.total === 0 && !locked && (
            <p className="mt-4 text-xs text-[#515154]">No entries yet.</p>
          )}
        </>
      )}
    </article>
  );
};

export default RecruitingOverview;
