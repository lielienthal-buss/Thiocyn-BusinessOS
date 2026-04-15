import React, { useState, useMemo, useEffect } from 'react';
import { toast } from 'sonner';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import {
  useCampaigns,
  useAgencies,
  createCampaign,
  updateCampaign,
  CAMPAIGN_STATUSES,
  STATUS_LABELS,
  type Campaign,
  type CampaignStatus,
} from '@/lib/useCampaigns';
import { useBrand } from '@/lib/BrandContext';
import { supabase } from '@/lib/supabaseClient';
import { LoadingState, ErrorState } from '@/components/ui/DataStates';

// ─── Types ──────────────────────────────────────────────────────────────────

interface CampaignKanbanProps {
  onCardClick: (campaignId: string) => void;
}

interface CardExtras {
  latestRoas?: number | null;
  unreadComments?: number;
  roasSpark?: { d: string; v: number }[];
}

// ─── Card ───────────────────────────────────────────────────────────────────

const CampaignCard: React.FC<{
  campaign: Campaign;
  brand?: { name: string; emoji?: string; color?: string };
  agency?: { name: string };
  extras?: CardExtras;
  onClick: () => void;
  onDragStart: (e: React.DragEvent) => void;
}> = ({ campaign, brand, agency, extras, onClick, onDragStart }) => {
  const daysRunning = campaign.start_date
    ? Math.max(
        0,
        Math.floor(
          (Date.now() - new Date(campaign.start_date).getTime()) / (1000 * 60 * 60 * 24),
        ),
      )
    : null;

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onClick={onClick}
      className="bg-white/80 p-3 rounded-xl ring-1 ring-slate-200 mb-2 cursor-pointer hover:ring-slate-300 hover:shadow-sm transition-all backdrop-blur-sm"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <h4 className="font-bold text-sm text-[#1d1d1f] leading-tight line-clamp-2">
          {campaign.name}
        </h4>
        {extras?.unreadComments ? (
          <span className="shrink-0 text-[10px] font-bold px-1.5 py-0.5 bg-amber-500/15 text-amber-600 rounded-full">
            {extras.unreadComments} 💬
          </span>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-1 mb-2">
        {brand && (
          <span
            className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700"
            style={brand.color ? { background: `${brand.color}15`, color: brand.color } : undefined}
          >
            {brand.emoji ?? ''} {brand.name}
          </span>
        )}
        {agency && (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600">
            🏢 {agency.name}
          </span>
        )}
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 capitalize">
          {campaign.platform}
        </span>
      </div>

      <div className="flex items-center justify-between text-[11px] text-[#6e6e73]">
        <span>
          {campaign.budget_planned
            ? `€${Number(campaign.budget_planned).toLocaleString()}`
            : '— budget'}
        </span>
        <div className="flex items-center gap-2">
          {daysRunning != null && campaign.status === 'live' && (
            <span>{daysRunning}d</span>
          )}
          {extras?.latestRoas != null && (
            <div className="flex items-center gap-1.5">
              {extras.roasSpark && extras.roasSpark.length >= 2 && (
                <div className="w-12 h-4 opacity-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={extras.roasSpark}>
                      <Line
                        type="monotone"
                        dataKey="v"
                        stroke={extras.latestRoas >= 2 ? '#10b981' : '#f43f5e'}
                        strokeWidth={1.5}
                        dot={false}
                        isAnimationActive={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
              <span
                className={`font-bold ${
                  extras.latestRoas >= 2 ? 'text-emerald-600' : 'text-rose-500'
                }`}
              >
                ROAS {extras.latestRoas.toFixed(2)}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── New Campaign Modal ─────────────────────────────────────────────────────

const NewCampaignModal: React.FC<{
  brands: { id: string; name: string }[];
  onClose: () => void;
  onCreated: () => void;
}> = ({ brands, onClose, onCreated }) => {
  const [name, setName] = useState('');
  const [brandId, setBrandId] = useState(brands[0]?.id ?? '');
  const [platform, setPlatform] = useState('meta');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim() || !brandId) {
      toast.error('Name and Brand required');
      return;
    }
    setSaving(true);
    const { error } = await createCampaign({
      name: name.trim(),
      brand_id: brandId,
      platform,
    });
    setSaving(false);
    if (error) {
      toast.error(error);
      return;
    }
    toast.success('Campaign created');
    onCreated();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-xl ring-1 ring-slate-200">
        <h3 className="text-lg font-black text-[#1d1d1f] mb-4">New Campaign</h3>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-bold text-[#6e6e73] uppercase tracking-wider">
              Name
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Thiocyn Q2 Conversion Push"
              className="mt-1 w-full px-3 py-2 text-sm rounded-lg ring-1 ring-slate-200 focus:ring-amber-400 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-[#6e6e73] uppercase tracking-wider">
              Brand
            </label>
            <select
              value={brandId}
              onChange={(e) => setBrandId(e.target.value)}
              className="mt-1 w-full px-3 py-2 text-sm rounded-lg ring-1 ring-slate-200 bg-white"
            >
              {brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-[#6e6e73] uppercase tracking-wider">
              Platform
            </label>
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
              className="mt-1 w-full px-3 py-2 text-sm rounded-lg ring-1 ring-slate-200 bg-white"
            >
              <option value="meta">Meta</option>
              <option value="google">Google</option>
              <option value="tiktok">TikTok</option>
              <option value="cross">Cross</option>
            </select>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 text-sm font-bold text-white bg-[#1d1d1f] rounded-lg hover:bg-black disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Kanban ─────────────────────────────────────────────────────────────────

const CampaignKanban: React.FC<CampaignKanbanProps> = ({ onCardClick }) => {
  const { brands } = useBrand();
  const { data: agencies } = useAgencies();
  const [brandFilter, setBrandFilter] = useState<string>('');
  const [agencyFilter, setAgencyFilter] = useState<string>('');
  const [showNew, setShowNew] = useState(false);

  const { data: serverCampaigns, loading, error, refetch } = useCampaigns({
    brand_id: brandFilter || null,
    agency_id: agencyFilter || null,
  });

  // Local optimistic state mirrors server — allows drag rollback
  const [localCampaigns, setLocalCampaigns] = useState<Campaign[]>([]);
  useEffect(() => {
    setLocalCampaigns(serverCampaigns);
  }, [serverCampaigns]);

  // Per-campaign latest ROAS + unread comments (lightweight batch)
  const [extras, setExtras] = useState<Record<string, CardExtras>>({});
  useEffect(() => {
    const liveIds = localCampaigns.filter((c) => c.status === 'live').map((c) => c.id);
    const allIds = localCampaigns.map((c) => c.id);
    if (allIds.length === 0) {
      setExtras({});
      return;
    }
    (async () => {
      const next: Record<string, CardExtras> = {};
      // Latest ROAS for live campaigns
      if (liveIds.length > 0) {
        const { data: kpis } = await supabase
          .from('campaign_kpis')
          .select('campaign_id, roas, snapshot_date')
          .in('campaign_id', liveIds)
          .order('snapshot_date', { ascending: false });
        if (kpis) {
          // Group per campaign, keep newest-first order from query.
          const bucket: Record<string, { d: string; v: number }[]> = {};
          kpis.forEach((k: any) => {
            if (!next[k.campaign_id]) next[k.campaign_id] = {};
            if (next[k.campaign_id].latestRoas == null) {
              next[k.campaign_id].latestRoas = k.roas;
            }
            if (k.roas != null) {
              (bucket[k.campaign_id] ??= []).push({ d: k.snapshot_date, v: Number(k.roas) });
            }
          });
          // Last 7 snapshots, chronological for sparkline
          Object.entries(bucket).forEach(([id, arr]) => {
            const last7 = arr.slice(0, 7).reverse();
            if (last7.length >= 2) {
              next[id].roasSpark = last7;
            }
          });
        }
      }
      // Comment counts (total — "unread" not tracked in Phase 1)
      const { data: comments } = await supabase
        .from('campaign_comments')
        .select('campaign_id')
        .in('campaign_id', allIds);
      if (comments) {
        const counts: Record<string, number> = {};
        comments.forEach((c: any) => {
          counts[c.campaign_id] = (counts[c.campaign_id] ?? 0) + 1;
        });
        Object.entries(counts).forEach(([id, n]) => {
          if (!next[id]) next[id] = {};
          next[id].unreadComments = n;
        });
      }
      setExtras(next);
    })();
  }, [localCampaigns]);

  const brandMap = useMemo(() => {
    const m = new Map<string, { name: string; emoji?: string; color?: string }>();
    brands.forEach((b) =>
      m.set(b.id, { name: b.name, emoji: b.emoji, color: b.color }),
    );
    return m;
  }, [brands]);

  const agencyMap = useMemo(() => {
    const m = new Map<string, { name: string }>();
    agencies.forEach((a) => m.set(a.id, { name: a.name }));
    return m;
  }, [agencies]);

  const grouped = useMemo(() => {
    const g: Record<CampaignStatus, Campaign[]> = {
      draft: [],
      brief_review: [],
      approved: [],
      live: [],
      paused: [],
      completed: [],
      killed: [],
    };
    localCampaigns.forEach((c) => {
      if (g[c.status]) g[c.status].push(c);
    });
    return g;
  }, [localCampaigns]);

  // ─── Drag handling ──

  const handleDrop = async (targetStatus: CampaignStatus, campaignId: string) => {
    const before = localCampaigns;
    const moved = before.find((c) => c.id === campaignId);
    if (!moved || moved.status === targetStatus) return;

    // Optimistic update
    setLocalCampaigns((prev) =>
      prev.map((c) => (c.id === campaignId ? { ...c, status: targetStatus } : c)),
    );

    const { error: err } = await updateCampaign(campaignId, { status: targetStatus });
    if (err) {
      toast.error(`Failed: ${err}`);
      setLocalCampaigns(before); // rollback
    } else {
      toast.success(`Moved to ${STATUS_LABELS[targetStatus]}`);
      refetch();
    }
  };

  if (loading) return <LoadingState label="Loading campaigns..." />;
  if (error) return <ErrorState message={error} onRetry={refetch} />;

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={brandFilter}
          onChange={(e) => setBrandFilter(e.target.value)}
          className="px-3 py-2 text-xs font-semibold rounded-lg ring-1 ring-slate-200 bg-white"
        >
          <option value="">All Brands</option>
          {brands.map((b) => (
            <option key={b.id} value={b.id}>
              {b.emoji} {b.name}
            </option>
          ))}
        </select>
        <select
          value={agencyFilter}
          onChange={(e) => setAgencyFilter(e.target.value)}
          className="px-3 py-2 text-xs font-semibold rounded-lg ring-1 ring-slate-200 bg-white"
        >
          <option value="">All Agencies</option>
          <option value="__none__" disabled>
            ── internal ──
          </option>
          {agencies.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>

        <div className="ml-auto">
          <button
            onClick={() => setShowNew(true)}
            className="px-4 py-2 text-xs font-bold text-white bg-[#1d1d1f] hover:bg-black rounded-lg"
          >
            + New Campaign
          </button>
        </div>
      </div>

      {/* Columns */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {CAMPAIGN_STATUSES.map((status) => (
          <div
            key={status}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              const id = e.dataTransfer.getData('text/plain');
              if (id) handleDrop(status, id);
            }}
            className="bg-slate-50 rounded-2xl p-3 ring-1 ring-slate-200 min-h-[300px]"
          >
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-[#6e6e73]">
                {STATUS_LABELS[status]}
              </h4>
              <span className="text-[10px] font-bold text-[#6e6e73] bg-white rounded-full px-2 py-0.5 ring-1 ring-slate-200">
                {grouped[status].length}
              </span>
            </div>
            <div>
              {grouped[status].map((c) => (
                <CampaignCard
                  key={c.id}
                  campaign={c}
                  brand={brandMap.get(c.brand_id)}
                  agency={c.agency_id ? agencyMap.get(c.agency_id) : undefined}
                  extras={extras[c.id]}
                  onClick={() => onCardClick(c.id)}
                  onDragStart={(e) => e.dataTransfer.setData('text/plain', c.id)}
                />
              ))}
              {grouped[status].length === 0 && (
                <p className="text-[11px] text-slate-400 italic text-center py-4">empty</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {showNew && (
        <NewCampaignModal
          brands={brands.map((b) => ({ id: b.id, name: b.name }))}
          onClose={() => setShowNew(false)}
          onCreated={refetch}
        />
      )}
    </div>
  );
};

export default CampaignKanban;
