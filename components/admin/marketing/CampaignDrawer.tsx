import React, { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import {
  useCampaign,
  useCampaignBrief,
  useCampaignComments,
  useCampaignKPIs,
  useCreativeSets,
  useCreativeSetAssets,
  upsertBrief,
  approveBrief,
  addComment,
  addKPISnapshot,
  createCreativeSet,
  addAsset,
  type CampaignBrief,
  type CampaignComment,
  type CampaignCreativeSet,
  type CampaignAsset,
  type AssetType,
  STATUS_LABELS,
  STATUS_BADGE,
  type CampaignStatus,
} from '@/lib/useCampaigns';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/DataStates';

// ─── Types ──────────────────────────────────────────────────────────────────

interface CampaignDrawerProps {
  campaignId: string | null;
  onClose: () => void;
  onChanged?: () => void;
}

type TabKey = 'brief' | 'comments' | 'assets' | 'performance';

// ─── Brief Tab ──────────────────────────────────────────────────────────────

const BriefTab: React.FC<{ campaignId: string; onCampaignChanged: () => void }> = ({
  campaignId,
  onCampaignChanged,
}) => {
  const { data: briefs, loading, error, refetch } = useCampaignBrief(campaignId);
  const existing = briefs[0];

  const [form, setForm] = useState<Partial<CampaignBrief>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (existing) setForm(existing);
    else setForm({});
  }, [existing?.id]);

  if (loading) return <LoadingState label="Loading brief..." />;
  if (error) return <ErrorState message={error} onRetry={refetch} />;

  const set = <K extends keyof CampaignBrief>(k: K, v: CampaignBrief[K]) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  const parseJson = (s: string): any => {
    try {
      return JSON.parse(s);
    } catch {
      return s;
    }
  };

  const handleSave = async () => {
    setSaving(true);
    const payload: Partial<CampaignBrief> = { ...form };
    const { error: err } = await upsertBrief(campaignId, payload, existing?.id);
    setSaving(false);
    if (err) toast.error(err);
    else {
      toast.success('Brief saved');
      refetch();
    }
  };

  const handleApprove = async () => {
    if (!existing?.id) {
      toast.error('Save brief first');
      return;
    }
    const { error: err } = await approveBrief(existing.id, campaignId, null);
    if (err) toast.error(err);
    else {
      toast.success('Brief approved — campaign moved to Approved');
      refetch();
      onCampaignChanged();
    }
  };

  const approved = !!existing?.approved_at;

  return (
    <div className="space-y-4">
      {approved && (
        <div className="p-3 bg-blue-50 ring-1 ring-blue-200 rounded-xl text-xs text-blue-700 font-semibold">
          ✅ Approved{existing?.approved_at ? ` on ${new Date(existing.approved_at).toLocaleDateString()}` : ''}
        </div>
      )}

      <Section title="Strategic">
        <Field label="Objective">
          <TextArea value={form.objective ?? ''} onChange={(v) => set('objective', v)} rows={2} />
        </Field>
        <Field label="Target Audience">
          <TextArea value={form.target_audience ?? ''} onChange={(v) => set('target_audience', v)} rows={2} />
        </Field>
        <Field label="Insight">
          <TextArea value={form.insight ?? ''} onChange={(v) => set('insight', v)} rows={2} />
        </Field>
        <Field label="Key Message">
          <TextArea value={form.key_message ?? ''} onChange={(v) => set('key_message', v)} rows={2} />
        </Field>
        <Field label="Angle">
          <TextArea value={form.angle ?? ''} onChange={(v) => set('angle', v)} rows={2} />
        </Field>
        <Field label="Offer">
          <TextArea value={form.offer ?? ''} onChange={(v) => set('offer', v)} rows={2} />
        </Field>
      </Section>

      <Section title="Operational">
        <Field label={'KPI Target (JSON, e.g. {"roas": 2.5, "cpa": 15})'}>
          <TextArea
            value={
              typeof form.kpi_target === 'string'
                ? (form.kpi_target as any)
                : form.kpi_target
                ? JSON.stringify(form.kpi_target, null, 2)
                : ''
            }
            onChange={(v) => set('kpi_target', parseJson(v))}
            rows={3}
            mono
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Budget (€)">
            <input
              type="number"
              value={form.budget ?? ''}
              onChange={(e) => set('budget', e.target.value ? Number(e.target.value) : null)}
              className="w-full px-3 py-2 text-sm rounded-lg ring-1 ring-slate-200 bg-white"
            />
          </Field>
          <Field label="Timeline">
            <div className="flex gap-1">
              <input
                type="date"
                value={form.timeline_start ?? ''}
                onChange={(e) => set('timeline_start', e.target.value || null)}
                className="flex-1 px-2 py-2 text-xs rounded-lg ring-1 ring-slate-200 bg-white"
              />
              <input
                type="date"
                value={form.timeline_end ?? ''}
                onChange={(e) => set('timeline_end', e.target.value || null)}
                className="flex-1 px-2 py-2 text-xs rounded-lg ring-1 ring-slate-200 bg-white"
              />
            </div>
          </Field>
        </div>
      </Section>

      <Section title="Creative">
        <Field label="Creative Requirements (JSON)">
          <TextArea
            value={
              typeof form.creative_requirements === 'string'
                ? (form.creative_requirements as any)
                : form.creative_requirements
                ? JSON.stringify(form.creative_requirements, null, 2)
                : ''
            }
            onChange={(v) => set('creative_requirements', parseJson(v))}
            rows={3}
            mono
          />
        </Field>
        <Field label="Mandatories">
          <TextArea value={form.mandatories ?? ''} onChange={(v) => set('mandatories', v)} rows={2} />
        </Field>
        <Field label="Do's and Don'ts">
          <TextArea value={form.dos_and_donts ?? ''} onChange={(v) => set('dos_and_donts', v)} rows={2} />
        </Field>
        <Field label="Reference Links (one per line)">
          <TextArea
            value={(form.reference_links ?? []).join('\n')}
            onChange={(v) => set('reference_links', v.split('\n').map((s) => s.trim()).filter(Boolean))}
            rows={3}
            mono
          />
        </Field>
      </Section>

      <Section title="Meta">
        <Field label="Notes">
          <TextArea value={form.notes ?? ''} onChange={(v) => set('notes', v)} rows={2} />
        </Field>
      </Section>

      <div className="flex items-center gap-2 pt-2 border-t border-slate-200">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg disabled:opacity-50 transition-colors"
        >
          {saving ? 'Saving...' : existing ? 'Update Brief' : 'Save Brief'}
        </button>
        {!approved && (
          <button
            onClick={handleApprove}
            disabled={!existing}
            className="px-4 py-2 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg disabled:opacity-50"
            title={!existing ? 'Save brief first' : undefined}
          >
            ✓ Approve Brief
          </button>
        )}
      </div>
    </div>
  );
};

// ─── Comments Tab ───────────────────────────────────────────────────────────

const CommentsTab: React.FC<{ campaignId: string }> = ({ campaignId }) => {
  const { data: comments, loading, error, refetch } = useCampaignComments(campaignId);
  const [body, setBody] = useState('');
  const [saving, setSaving] = useState(false);
  const [authorName, setAuthorName] = useState(() => {
    if (typeof window === 'undefined') return 'You';
    return localStorage.getItem('marketing_author_name') || 'You';
  });

  const threaded = useMemo(() => {
    const byParent: Record<string, CampaignComment[]> = {};
    comments.forEach((c) => {
      const k = c.parent_id ?? '__root__';
      (byParent[k] ??= []).push(c);
    });
    return byParent;
  }, [comments]);

  const submit = async (parentId: string | null = null) => {
    if (!body.trim()) return;
    setSaving(true);
    localStorage.setItem('marketing_author_name', authorName);
    const { error: err } = await addComment({
      campaign_id: campaignId,
      body: body.trim(),
      author_name: authorName,
      parent_id: parentId,
    });
    setSaving(false);
    if (err) toast.error(err);
    else {
      setBody('');
      refetch();
    }
  };

  if (loading) return <LoadingState label="Loading comments..." />;
  if (error) return <ErrorState message={error} onRetry={refetch} />;

  const renderThread = (parentId: string | null, depth = 0) => {
    const key = parentId ?? '__root__';
    const items = threaded[key] ?? [];
    return items.map((c) => (
      <div key={c.id} style={{ marginLeft: depth * 16 }} className="mb-3">
        <div className="bg-white rounded-xl ring-1 ring-slate-200 p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold text-slate-900">{c.author_name ?? 'Anon'}</span>
            <span className="text-[10px] text-slate-500">
              {new Date(c.created_at).toLocaleString()}
            </span>
          </div>
          <p className="text-sm text-slate-700 whitespace-pre-wrap">{c.body}</p>
        </div>
        {renderThread(c.id, depth + 1)}
      </div>
    ));
  };

  return (
    <div className="space-y-4">
      {comments.length === 0 ? (
        <EmptyState icon="💬" title="No comments yet" description="Start the thread below." />
      ) : (
        <div>{renderThread(null)}</div>
      )}

      <div className="bg-slate-50 rounded-xl p-3 ring-1 ring-slate-200 space-y-2">
        <input
          value={authorName}
          onChange={(e) => setAuthorName(e.target.value)}
          placeholder="Your name"
          className="w-full px-3 py-1.5 text-xs rounded-lg ring-1 ring-slate-200 bg-white"
        />
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Write a comment..."
          rows={3}
          className="w-full px-3 py-2 text-sm rounded-lg ring-1 ring-slate-200 bg-white resize-y"
        />
        <div className="flex justify-end">
          <button
            onClick={() => submit(null)}
            disabled={saving || !body.trim()}
            className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg disabled:opacity-50 transition-colors"
          >
            {saving ? 'Posting...' : 'Post'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Assets Tab ─────────────────────────────────────────────────────────────

const AssetsTab: React.FC<{ campaignId: string }> = ({ campaignId }) => {
  const { data: sets, loading: setsLoading, error: setsErr, refetch: refetchSets } =
    useCreativeSets(campaignId);
  const { data: assets, refetch: refetchAssets } = useCreativeSetAssets(campaignId);
  const [newSetName, setNewSetName] = useState('');
  const [showNewSet, setShowNewSet] = useState(false);

  const assetsBySet = useMemo(() => {
    const m: Record<string, CampaignAsset[]> = {};
    assets.forEach((a) => {
      (m[a.creative_set_id] ??= []).push(a);
    });
    return m;
  }, [assets]);

  const addSet = async () => {
    if (!newSetName.trim()) return;
    const { error: err } = await createCreativeSet({
      campaign_id: campaignId,
      name: newSetName.trim(),
    });
    if (err) toast.error(err);
    else {
      toast.success('Creative set added');
      setNewSetName('');
      setShowNewSet(false);
      refetchSets();
    }
  };

  if (setsLoading) return <LoadingState label="Loading assets..." />;
  if (setsErr) return <ErrorState message={setsErr} onRetry={refetchSets} />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-black text-slate-900">Creative Sets</h4>
        <button
          onClick={() => setShowNewSet(true)}
          className="px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
        >
          + Set
        </button>
      </div>

      {showNewSet && (
        <div className="flex gap-2">
          <input
            value={newSetName}
            onChange={(e) => setNewSetName(e.target.value)}
            placeholder="e.g. Week 1 UGC"
            className="flex-1 px-3 py-2 text-sm rounded-lg ring-1 ring-slate-200 bg-white"
            autoFocus
          />
          <button onClick={addSet} className="px-3 py-2 text-xs font-bold text-white bg-emerald-600 rounded-lg">
            Save
          </button>
          <button
            onClick={() => setShowNewSet(false)}
            className="px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
          >
            Cancel
          </button>
        </div>
      )}

      {sets.length === 0 ? (
        <EmptyState icon="🎬" title="No creative sets yet" description="Add a set to group assets." />
      ) : (
        sets.map((s) => (
          <CreativeSetRow
            key={s.id}
            set={s}
            assets={assetsBySet[s.id] ?? []}
            onChanged={() => {
              refetchSets();
              refetchAssets();
            }}
          />
        ))
      )}
    </div>
  );
};

const CreativeSetRow: React.FC<{
  set: CampaignCreativeSet;
  assets: CampaignAsset[];
  onChanged: () => void;
}> = ({ set, assets, onChanged }) => {
  const [showAdd, setShowAdd] = useState(false);
  const [url, setUrl] = useState('');
  const [label, setLabel] = useState('');
  const [type, setType] = useState<AssetType>('video');

  const submit = async () => {
    if (!url.trim()) return;
    const { error: err } = await addAsset({
      creative_set_id: set.id,
      type,
      url: url.trim(),
      label: label.trim() || null,
    });
    if (err) toast.error(err);
    else {
      toast.success('Asset added');
      setUrl('');
      setLabel('');
      setShowAdd(false);
      onChanged();
    }
  };

  return (
    <div className="bg-white rounded-2xl ring-1 ring-slate-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="font-bold text-sm text-slate-900">{set.name}</span>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 capitalize">
            {set.status}
          </span>
        </div>
        <button
          onClick={() => setShowAdd((s) => !s)}
          className="text-xs font-bold text-indigo-600 hover:text-indigo-700"
        >
          + Asset
        </button>
      </div>

      {showAdd && (
        <div className="grid grid-cols-[1fr_1fr_100px_auto] gap-2 mb-3 items-center">
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="URL (Drive / Frame.io)"
            className="px-3 py-2 text-xs rounded-lg ring-1 ring-slate-200"
          />
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Label"
            className="px-3 py-2 text-xs rounded-lg ring-1 ring-slate-200"
          />
          <select
            value={type}
            onChange={(e) => setType(e.target.value as AssetType)}
            className="px-2 py-2 text-xs rounded-lg ring-1 ring-slate-200 bg-white"
          >
            <option value="video">video</option>
            <option value="image">image</option>
            <option value="copy">copy</option>
            <option value="landing_page">landing</option>
          </select>
          <button onClick={submit} className="px-3 py-2 text-xs font-bold text-white bg-emerald-600 rounded-lg">
            Add
          </button>
        </div>
      )}

      {assets.length === 0 ? (
        <p className="text-[11px] text-slate-500 italic">no assets</p>
      ) : (
        <ul className="space-y-1">
          {assets.map((a) => (
            <li
              key={a.id}
              className="flex items-center justify-between text-xs p-2 bg-slate-50 rounded-lg"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-[10px] font-bold uppercase bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded">
                  {a.type ?? '—'}
                </span>
                <span className="font-semibold text-slate-900 truncate">{a.label ?? '(no label)'}</span>
              </div>
              <a
                href={a.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-600 hover:text-indigo-700 font-bold shrink-0"
              >
                open ↗
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

// ─── Performance Tab ────────────────────────────────────────────────────────

const PerformanceTab: React.FC<{ campaignId: string }> = ({ campaignId }) => {
  const { data: kpis, loading, error, refetch } = useCampaignKPIs(campaignId);

  const today = new Date().toISOString().slice(0, 10);
  const [entry, setEntry] = useState({
    snapshot_date: today,
    spend: '',
    impressions: '',
    clicks: '',
    conversions: '',
    revenue: '',
  });
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    const { error: err } = await addKPISnapshot({
      campaign_id: campaignId,
      snapshot_date: entry.snapshot_date,
      spend: entry.spend ? Number(entry.spend) : null,
      impressions: entry.impressions ? Number(entry.impressions) : null,
      clicks: entry.clicks ? Number(entry.clicks) : null,
      conversions: entry.conversions ? Number(entry.conversions) : null,
      revenue: entry.revenue ? Number(entry.revenue) : null,
    });
    setSaving(false);
    if (err) toast.error(err);
    else {
      toast.success('Snapshot saved');
      setEntry({
        snapshot_date: today,
        spend: '',
        impressions: '',
        clicks: '',
        conversions: '',
        revenue: '',
      });
      refetch();
    }
  };

  if (loading) return <LoadingState label="Loading KPIs..." />;
  if (error) return <ErrorState message={error} onRetry={refetch} />;

  const fmt = (n: number | null | undefined, digits = 2) =>
    n == null ? '—' : Number(n).toFixed(digits);
  const fmtInt = (n: number | null | undefined) =>
    n == null ? '—' : Number(n).toLocaleString();

  // Chronological series for charts (oldest → newest)
  const series = useMemo(
    () => [...kpis].sort((a, b) => a.snapshot_date.localeCompare(b.snapshot_date)),
    [kpis],
  );

  // MTD aggregates — current month only
  const mtd = useMemo(() => {
    const now = new Date();
    const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const inMonth = kpis.filter((k) => k.snapshot_date.startsWith(ym));
    const spend = inMonth.reduce((a, k) => a + (k.spend ?? 0), 0);
    const revenue = inMonth.reduce((a, k) => a + (k.revenue ?? 0), 0);
    const conversions = inMonth.reduce((a, k) => a + (k.conversions ?? 0), 0);
    const avgRoas =
      spend > 0 ? revenue / spend : null;
    return { spend, revenue, conversions, avgRoas };
  }, [kpis]);

  const hasData = series.length > 0;

  return (
    <div className="space-y-4">
      {/* Stat row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <StatCard label="MTD Spend" value={`€${mtd.spend.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} tone="slate" />
        <StatCard label="MTD Revenue" value={`€${mtd.revenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} tone="slate" />
        <StatCard
          label="Avg ROAS"
          value={mtd.avgRoas == null ? '—' : mtd.avgRoas.toFixed(2)}
          tone={mtd.avgRoas != null && mtd.avgRoas >= 2 ? 'emerald' : mtd.avgRoas == null ? 'slate' : 'rose'}
        />
        <StatCard label="Conversions" value={mtd.conversions.toLocaleString()} tone="slate" />
      </div>

      {/* Charts */}
      {hasData ? (
        <div className="space-y-3">
          <ChartCard title="ROAS Timeline" subtitle="Target line at 2.0">
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={series} margin={{ top: 8, right: 12, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="snapshot_date" tick={{ fontSize: 10, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <ReferenceLine y={2} stroke="#cbd5e1" strokeDasharray="3 3" />
                <Line
                  type="monotone"
                  dataKey="roas"
                  stroke="#6366f1"
                  strokeWidth={2}
                  dot={{ r: 2, fill: '#6366f1' }}
                  activeDot={{ r: 4 }}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Daily Spend">
            <ResponsiveContainer width="100%" height={120}>
              <BarChart data={series} margin={{ top: 4, right: 12, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="snapshot_date" tick={{ fontSize: 10, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Bar dataKey="spend" fill="#475569" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      ) : (
        <div className="bg-white rounded-xl ring-1 ring-slate-200 p-6 text-center">
          <p className="text-xs text-slate-500 italic">
            No performance data yet — add the first snapshot below.
          </p>
        </div>
      )}

      {/* Manual entry */}
      <div className="bg-slate-50 rounded-xl p-3 ring-1 ring-slate-200">
        <p className="text-xs font-black uppercase tracking-wider text-slate-600 mb-2">
          Manual Entry
        </p>
        <div className="grid grid-cols-7 gap-2 items-end">
          <Col label="Date">
            <input
              type="date"
              value={entry.snapshot_date}
              onChange={(e) => setEntry({ ...entry, snapshot_date: e.target.value })}
              className="w-full px-2 py-1.5 text-xs rounded-lg ring-1 ring-slate-200 bg-white"
            />
          </Col>
          <Col label="Spend €">
            <NumIn v={entry.spend} set={(v) => setEntry({ ...entry, spend: v })} />
          </Col>
          <Col label="Impr.">
            <NumIn v={entry.impressions} set={(v) => setEntry({ ...entry, impressions: v })} />
          </Col>
          <Col label="Clicks">
            <NumIn v={entry.clicks} set={(v) => setEntry({ ...entry, clicks: v })} />
          </Col>
          <Col label="Conv.">
            <NumIn v={entry.conversions} set={(v) => setEntry({ ...entry, conversions: v })} />
          </Col>
          <Col label="Revenue €">
            <NumIn v={entry.revenue} set={(v) => setEntry({ ...entry, revenue: v })} />
          </Col>
          <button
            onClick={submit}
            disabled={saving}
            className="px-3 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg disabled:opacity-50 transition-colors"
          >
            {saving ? '...' : 'Save'}
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto bg-white rounded-xl ring-1 ring-slate-200">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
              <Th>Date</Th>
              <Th>Spend</Th>
              <Th>Impr.</Th>
              <Th>Clicks</Th>
              <Th>Conv.</Th>
              <Th>Revenue</Th>
              <Th>ROAS</Th>
              <Th>CPA</Th>
              <Th>CTR%</Th>
              <Th>Src</Th>
            </tr>
          </thead>
          <tbody>
            {kpis.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-4 py-6 text-center text-slate-500 italic">
                  No snapshots yet
                </td>
              </tr>
            ) : (
              kpis.map((k) => (
                <tr key={k.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <Td>{k.snapshot_date}</Td>
                  <Td>{fmt(k.spend)}</Td>
                  <Td>{fmtInt(k.impressions)}</Td>
                  <Td>{fmtInt(k.clicks)}</Td>
                  <Td>{fmtInt(k.conversions)}</Td>
                  <Td>{fmt(k.revenue)}</Td>
                  <Td className={k.roas && k.roas >= 2 ? 'text-emerald-700 font-bold' : 'text-rose-700'}>
                    {fmt(k.roas)}
                  </Td>
                  <Td>{fmt(k.cpa)}</Td>
                  <Td>{fmt(k.ctr)}</Td>
                  <Td className="text-slate-500">{k.source}</Td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ─── Chart primitives ───────────────────────────────────────────────────────

const TOOLTIP_STYLE = {
  background: '#ffffff',
  border: '1px solid #e2e8f0',
  borderRadius: 8,
  fontSize: 11,
  padding: '6px 8px',
  color: '#0f172a',
} as const;

const StatCard: React.FC<{
  label: string;
  value: string;
  tone?: 'slate' | 'emerald' | 'rose';
}> = ({ label, value, tone = 'slate' }) => {
  const tones: Record<string, string> = {
    slate: 'text-slate-900',
    emerald: 'text-emerald-700',
    rose: 'text-rose-700',
  };
  return (
    <div className="bg-white rounded-xl ring-1 ring-slate-200 px-3 py-2">
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600">{label}</p>
      <p className={`text-lg font-black ${tones[tone]}`}>{value}</p>
    </div>
  );
};

const ChartCard: React.FC<{
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}> = ({ title, subtitle, children }) => (
  <div className="bg-white rounded-xl ring-1 ring-slate-200 p-3">
    <div className="flex items-baseline justify-between mb-1">
      <h5 className="text-[11px] font-black uppercase tracking-wider text-slate-600">{title}</h5>
      {subtitle && <span className="text-[10px] text-slate-500">{subtitle}</span>}
    </div>
    {children}
  </div>
);

// ─── Primitives ─────────────────────────────────────────────────────────────

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="space-y-2">
    <h5 className="text-[10px] font-black uppercase tracking-wider text-slate-600">{title}</h5>
    <div className="space-y-2">{children}</div>
  </div>
);

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div>
    <label className="text-[11px] font-semibold text-slate-600 block mb-1">{label}</label>
    {children}
  </div>
);

const TextArea: React.FC<{
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  mono?: boolean;
}> = ({ value, onChange, rows = 2, mono }) => (
  <textarea
    value={value}
    onChange={(e) => onChange(e.target.value)}
    rows={rows}
    className={`w-full px-3 py-2 text-sm rounded-lg ring-1 ring-slate-200 bg-white focus:ring-indigo-500 focus:outline-none resize-y ${
      mono ? 'font-mono text-xs' : ''
    }`}
  />
);

const Col: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div>
    <label className="text-[10px] font-semibold text-slate-600 block mb-0.5">{label}</label>
    {children}
  </div>
);

const NumIn: React.FC<{ v: string; set: (v: string) => void }> = ({ v, set }) => (
  <input
    type="number"
    value={v}
    onChange={(e) => set(e.target.value)}
    className="w-full px-2 py-1.5 text-xs rounded-lg ring-1 ring-slate-200 bg-white"
  />
);

const Th: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <th className="text-left px-3 py-2 font-black uppercase tracking-wider text-[10px]">{children}</th>
);

const Td: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <td className={`px-3 py-2 text-slate-900 ${className ?? ''}`}>{children}</td>
);

// ─── Main Drawer ────────────────────────────────────────────────────────────

const CampaignDrawer: React.FC<CampaignDrawerProps> = ({ campaignId, onClose, onChanged }) => {
  const [tab, setTab] = useState<TabKey>('brief');
  const { data: campaigns, loading, error, refetch } = useCampaign(campaignId);
  const campaign = campaigns[0];

  // Reset tab on open
  useEffect(() => {
    if (campaignId) setTab('brief');
  }, [campaignId]);

  if (!campaignId) return null;

  const statusBadge = campaign
    ? STATUS_BADGE[(campaign.status as CampaignStatus) ?? 'draft']
    : '';

  return (
    <div className="fixed inset-0 z-40 flex">
      {/* Backdrop */}
      <div className="flex-1 bg-black/30" onClick={onClose} />

      {/* Drawer */}
      <div className="w-full max-w-3xl bg-slate-50 h-full overflow-hidden flex flex-col shadow-2xl ring-1 ring-slate-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-white flex items-start justify-between gap-4">
          {loading ? (
            <p className="text-sm text-slate-500">Loading...</p>
          ) : error ? (
            <p className="text-sm text-red-500">{error}</p>
          ) : campaign ? (
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-lg font-black text-slate-900">{campaign.name}</h2>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusBadge}`}>
                  {STATUS_LABELS[campaign.status as CampaignStatus] ?? campaign.status}
                </span>
              </div>
              <p className="text-xs text-slate-600">
                {campaign.brand_id} · {campaign.platform}
                {campaign.budget_planned ? ` · €${Number(campaign.budget_planned).toLocaleString()}` : ''}
              </p>
            </div>
          ) : (
            <p className="text-sm text-slate-500">Not found</p>
          )}

          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-700 text-xl font-bold px-2"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Tabs */}
        <div className="px-6 border-b border-slate-200 bg-white flex gap-1">
          {(['brief', 'comments', 'assets', 'performance'] as TabKey[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-3 text-xs font-bold uppercase tracking-wider border-b-2 -mb-px transition-colors ${
                tab === t
                  ? 'border-indigo-600 text-slate-900'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {campaign && tab === 'brief' && (
            <BriefTab
              campaignId={campaign.id}
              onCampaignChanged={() => {
                refetch();
                onChanged?.();
              }}
            />
          )}
          {campaign && tab === 'comments' && <CommentsTab campaignId={campaign.id} />}
          {campaign && tab === 'assets' && <AssetsTab campaignId={campaign.id} />}
          {campaign && tab === 'performance' && <PerformanceTab campaignId={campaign.id} />}
        </div>
      </div>
    </div>
  );
};

export default CampaignDrawer;
