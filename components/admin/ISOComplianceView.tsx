import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useBrand } from '@/lib/BrandContext';
import { LoadingState, EmptyState, ErrorState, RefreshButton } from '@/components/ui/DataStates';

// ─── Types ───────────────────────────────────────────────────────────────────

type ISOTab = 'risks' | 'incidents' | 'bizRisks' | 'nonconf';

type RiskEntry = {
  id: string; asset: string; asset_category: string; threat: string;
  likelihood: number; impact: number; risk_score: number; risk_level: string;
  mitigation: string; mitigation_status: string; owner_email: string;
  next_review_date: string; brand_slug: string;
};

type SecurityIncident = {
  id: string; title: string; incident_type: string; severity: string;
  detected_at: string; detected_by_email: string; description: string;
  status: string; resolved_at: string | null;
};

type BusinessRisk = {
  id: string; title: string; category: string; brand_slug: string;
  risk_level: string; risk_score: number; mitigation_strategy: string;
  owner_email: string; status: string; next_review_date: string;
};

type NonConformance = {
  id: string; title: string; severity: string; brand_slug: string;
  status: string; detected_at: string; root_cause: string;
};

// ─── Constants ───────────────────────────────────────────────────────────────

const RISK_LEVELS = ['low', 'medium', 'high', 'critical'] as const;
const STATUSES = ['open', 'in_progress', 'mitigated', 'resolved', 'closed'] as const;
const SEVERITIES = ['low', 'medium', 'high', 'critical'] as const;
const MIT_STATUSES = ['planned', 'in_progress', 'implemented', 'verified'] as const;
const INCIDENT_TYPES = ['data_breach', 'system_failure', 'compliance', 'access_violation', 'other'] as const;

const riskBadge = (level: string) => {
  const map: Record<string, string> = {
    low: 'bg-emerald-500/15 text-emerald-400', medium: 'bg-yellow-500/15 text-yellow-400',
    high: 'bg-orange-500/15 text-orange-400', critical: 'bg-red-500/15 text-red-400',
  };
  return map[level] ?? 'bg-slate-500/15 text-[#515154]';
};

const statusBadge = (status: string) => {
  if (status === 'resolved' || status === 'closed' || status === 'verified' || status === 'implemented')
    return 'bg-emerald-500/15 text-emerald-400';
  if (status === 'open') return 'bg-red-500/15 text-red-400';
  return 'bg-yellow-500/15 text-yellow-400';
};

const fmt = (d: string | null) => d ? new Date(d).toLocaleDateString('de-DE') : '—';
const truncate = (t: string, max: number) => t && t.length > max ? t.slice(0, max) + '…' : t ?? '—';

// ─── Reusable inline select ──────────────────────────────────────────────────

function InlineStatusSelect({ value, options, onChange }: {
  value: string; options: readonly string[]; onChange: (v: string) => void;
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border cursor-pointer bg-transparent outline-none ${statusBadge(value)}`}
    >
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function ISOComplianceView() {
  const { activeBrand } = useBrand();
  const [tab, setTab] = useState<ISOTab>('risks');
  const [risks, setRisks] = useState<RiskEntry[]>([]);
  const [incidents, setIncidents] = useState<SecurityIncident[]>([]);
  const [bizRisks, setBizRisks] = useState<BusinessRisk[]>([]);
  const [nonConfs, setNonConfs] = useState<NonConformance[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    let riskQ = supabase.from('risk_register').select('*').order('created_at', { ascending: false });
    let bizQ = supabase.from('business_risks').select('*').order('created_at', { ascending: false });
    let ncQ = supabase.from('non_conformances').select('*').order('created_at', { ascending: false });
    if (activeBrand?.slug) {
      riskQ = riskQ.eq('brand_slug', activeBrand.slug);
      bizQ = bizQ.eq('brand_slug', activeBrand.slug);
      ncQ = ncQ.eq('brand_slug', activeBrand.slug);
    }
    const [r1, r2, r3, r4] = await Promise.all([
      riskQ,
      supabase.from('security_incidents').select('*').order('created_at', { ascending: false }),
      bizQ, ncQ,
    ]);
    setRisks((r1.data ?? []) as RiskEntry[]);
    setIncidents((r2.data ?? []) as SecurityIncident[]);
    setBizRisks((r3.data ?? []) as BusinessRisk[]);
    setNonConfs((r4.data ?? []) as NonConformance[]);
    setLoading(false);
    setRefreshing(false);
  }, [activeBrand?.slug]);

  useEffect(() => { load(); }, [load]);

  // ─── Generic mutations (with rollback on error) ────────────────────

  const updateField = async (table: string, id: string, field: string, value: any) => {
    const { error: err } = await supabase.from(table).update({ [field]: value }).eq('id', id);
    if (err) { setError(err.message); load(true); }
  };

  const deleteRow = async (table: string, id: string) => {
    const { error: err } = await supabase.from(table).delete().eq('id', id);
    if (err) { setError(err.message); load(true); }
  };

  // Risk mutations
  const updateRisk = (id: string, field: string, value: any) => {
    setRisks(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
    updateField('risk_register', id, field, value);
  };
  const deleteRisk = (id: string) => {
    setRisks(prev => prev.filter(r => r.id !== id));
    deleteRow('risk_register', id);
  };
  const addRisk = async () => {
    const { data } = await supabase.from('risk_register').insert({
      asset: 'New Asset', asset_category: 'General', threat: '', likelihood: 1, impact: 1,
      risk_score: 1, risk_level: 'low', mitigation: '', mitigation_status: 'planned',
      owner_email: '', brand_slug: activeBrand?.slug ?? 'thiocyn',
    }).select().single();
    if (data) setRisks(prev => [data as RiskEntry, ...prev]);
  };

  // Incident mutations
  const updateIncident = (id: string, field: string, value: any) => {
    setIncidents(prev => prev.map(i => i.id === id ? { ...i, [field]: value } : i));
    updateField('security_incidents', id, field, value);
  };
  const deleteIncident = (id: string) => {
    setIncidents(prev => prev.filter(i => i.id !== id));
    deleteRow('security_incidents', id);
  };
  const addIncident = async () => {
    const { data } = await supabase.from('security_incidents').insert({
      title: 'New Incident', incident_type: 'other', severity: 'low',
      detected_at: new Date().toISOString(), detected_by_email: '', description: '', status: 'open',
    }).select().single();
    if (data) setIncidents(prev => [data as SecurityIncident, ...prev]);
  };

  // Business Risk mutations
  const updateBizRisk = (id: string, field: string, value: any) => {
    setBizRisks(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
    updateField('business_risks', id, field, value);
  };
  const deleteBizRisk = (id: string) => {
    setBizRisks(prev => prev.filter(r => r.id !== id));
    deleteRow('business_risks', id);
  };
  const addBizRisk = async () => {
    const { data } = await supabase.from('business_risks').insert({
      title: 'New Business Risk', category: 'operational', brand_slug: activeBrand?.slug ?? 'thiocyn',
      risk_level: 'low', risk_score: 1, mitigation_strategy: '', owner_email: '', status: 'open',
    }).select().single();
    if (data) setBizRisks(prev => [data as BusinessRisk, ...prev]);
  };

  // Non-conformance mutations
  const updateNC = (id: string, field: string, value: any) => {
    setNonConfs(prev => prev.map(n => n.id === id ? { ...n, [field]: value } : n));
    updateField('non_conformances', id, field, value);
  };
  const deleteNC = (id: string) => {
    setNonConfs(prev => prev.filter(n => n.id !== id));
    deleteRow('non_conformances', id);
  };
  const addNC = async () => {
    const { data } = await supabase.from('non_conformances').insert({
      title: 'New Non-Conformance', severity: 'low', brand_slug: activeBrand?.slug ?? 'thiocyn',
      status: 'open', detected_at: new Date().toISOString(), root_cause: '',
    }).select().single();
    if (data) setNonConfs(prev => [data as NonConformance, ...prev]);
  };

  const tabs: { key: ISOTab; label: string; count: number; addFn: () => void }[] = [
    { key: 'risks', label: 'Risk Register', count: risks.length, addFn: addRisk },
    { key: 'incidents', label: 'Incidents', count: incidents.length, addFn: addIncident },
    { key: 'bizRisks', label: 'Business Risks', count: bizRisks.length, addFn: addBizRisk },
    { key: 'nonconf', label: 'Non-Conformances', count: nonConfs.length, addFn: addNC },
  ];

  const activeTab = tabs.find(t => t.key === tab)!;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-black text-[#1d1d1f] tracking-tight">Risk & ISO Compliance</h2>
          <p className="text-sm text-[#6e6e73] mt-0.5">Risk Register, Incidents, Business Risks, Non-Conformances</p>
        </div>
        <div className="flex items-center gap-2">
          <RefreshButton onClick={() => load(true)} refreshing={refreshing} />
          <button
            onClick={activeTab.addFn}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-black text-xs font-black rounded-lg transition-colors"
          >
            + Add
          </button>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="flex gap-1 bg-black/[0.03] border border-black/[0.06] rounded-xl p-1 w-fit">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              tab === t.key
                ? 'bg-[#0F766E]/12 text-[#0F766E] border border-[#0F766E]/25'
                : 'text-[#6e6e73] hover:text-[#1d1d1f]'
            }`}
          >
            {t.label}
            <span className="text-[10px] font-bold opacity-60">{t.count}</span>
          </button>
        ))}
      </div>

      {error && <ErrorState message={error} onRetry={() => { setError(null); load(true); }} />}

      {loading ? <LoadingState /> : (
        <>
          {/* Risk Register */}
          {tab === 'risks' && (
            <div className="bg-white/70 rounded-2xl border border-black/[0.06] overflow-hidden">
              {risks.length === 0 ? (
                <EmptyState icon="🛡️" title="No risks registered" action={{ label: '+ Add Risk', onClick: addRisk }} />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead>
                      <tr className="text-xs text-[#6e6e73] border-b border-black/[0.06] bg-white/60/40">
                        {['Asset', 'Threat', 'Risk Level', 'Score', 'Mitigation Status', 'Owner', 'Next Review', ''].map(h => (
                          <th key={h} className="px-3 py-2.5 font-medium">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black/[0.06]">
                      {risks.map(r => (
                        <tr key={r.id} className="group hover:bg-black/[0.03] transition-colors">
                          <td className="px-3 py-2.5">
                            <InlineEdit value={r.asset} onSave={v => updateRisk(r.id, 'asset', v)} className="font-medium text-[#1d1d1f]" />
                            <div className="text-xs text-[#6e6e73]">{r.asset_category}</div>
                          </td>
                          <td className="px-3 py-2.5">
                            <InlineEdit value={r.threat} onSave={v => updateRisk(r.id, 'threat', v)} className="text-[#515154]" />
                          </td>
                          <td className="px-3 py-2.5">
                            <InlineStatusSelect value={r.risk_level} options={RISK_LEVELS} onChange={v => updateRisk(r.id, 'risk_level', v)} />
                          </td>
                          <td className="px-3 py-2.5 text-[#1d1d1f] font-medium">{r.risk_score}</td>
                          <td className="px-3 py-2.5">
                            <InlineStatusSelect value={r.mitigation_status} options={MIT_STATUSES} onChange={v => updateRisk(r.id, 'mitigation_status', v)} />
                          </td>
                          <td className="px-3 py-2.5">
                            <InlineEdit value={r.owner_email} onSave={v => updateRisk(r.id, 'owner_email', v)} className="text-[#6e6e73] text-xs" placeholder="owner@..." />
                          </td>
                          <td className="px-3 py-2.5 text-[#6e6e73] text-xs">{fmt(r.next_review_date)}</td>
                          <td className="px-2 py-2.5">
                            <button onClick={() => { if (confirm('Delete this risk?')) deleteRisk(r.id); }} className="text-[#86868b] hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all text-xs" aria-label="Delete risk">🗑</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Incidents */}
          {tab === 'incidents' && (
            <div className="space-y-3">
              {incidents.length === 0 ? (
                <EmptyState icon="🚨" title="No incidents" action={{ label: '+ Report Incident', onClick: addIncident }} />
              ) : incidents.map(inc => (
                <div key={inc.id} className="group bg-white/70 rounded-2xl border border-black/[0.06] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <InlineEdit value={inc.title} onSave={v => updateIncident(inc.id, 'title', v)} className="font-semibold text-[#1d1d1f] text-sm" />
                        <InlineStatusSelect value={inc.severity} options={SEVERITIES} onChange={v => updateIncident(inc.id, 'severity', v)} />
                      </div>
                      <div className="flex items-center gap-3 text-xs text-[#6e6e73] flex-wrap">
                        <select value={inc.incident_type} onChange={e => updateIncident(inc.id, 'incident_type', e.target.value)}
                          className="bg-transparent text-xs text-[#6e6e73] outline-none cursor-pointer">
                          {INCIDENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                        <span>·</span>
                        <span>Detected: {fmt(inc.detected_at)}</span>
                        {inc.resolved_at && <><span>·</span><span>Resolved: {fmt(inc.resolved_at)}</span></>}
                      </div>
                      {inc.description && <p className="text-xs text-[#6e6e73] mt-2">{inc.description}</p>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <InlineStatusSelect value={inc.status} options={STATUSES} onChange={v => updateIncident(inc.id, 'status', v)} />
                      <button onClick={() => { if (confirm('Delete this incident?')) deleteIncident(inc.id); }} className="text-[#86868b] hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all text-xs" aria-label="Delete incident">🗑</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Business Risks */}
          {tab === 'bizRisks' && (
            <div className="bg-white/70 rounded-2xl border border-black/[0.06] overflow-hidden">
              {bizRisks.length === 0 ? (
                <EmptyState icon="📉" title="No business risks" action={{ label: '+ Add Risk', onClick: addBizRisk }} />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead>
                      <tr className="text-xs text-[#6e6e73] border-b border-black/[0.06] bg-white/60/40">
                        {['Title', 'Category', 'Risk Level', 'Score', 'Mitigation', 'Owner', 'Status', ''].map(h => (
                          <th key={h} className="px-3 py-2.5 font-medium">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black/[0.06]">
                      {bizRisks.map(r => (
                        <tr key={r.id} className="group hover:bg-black/[0.03] transition-colors">
                          <td className="px-3 py-2.5">
                            <InlineEdit value={r.title} onSave={v => updateBizRisk(r.id, 'title', v)} className="font-medium text-[#1d1d1f]" />
                          </td>
                          <td className="px-3 py-2.5">
                            <InlineEdit value={r.category} onSave={v => updateBizRisk(r.id, 'category', v)} className="text-[#6e6e73] text-xs" />
                          </td>
                          <td className="px-3 py-2.5">
                            <InlineStatusSelect value={r.risk_level} options={RISK_LEVELS} onChange={v => updateBizRisk(r.id, 'risk_level', v)} />
                          </td>
                          <td className="px-3 py-2.5 text-[#1d1d1f] font-medium">{r.risk_score}</td>
                          <td className="px-3 py-2.5">
                            <InlineEdit value={r.mitigation_strategy} onSave={v => updateBizRisk(r.id, 'mitigation_strategy', v)} className="text-[#6e6e73] text-xs" placeholder="Strategy..." />
                          </td>
                          <td className="px-3 py-2.5">
                            <InlineEdit value={r.owner_email} onSave={v => updateBizRisk(r.id, 'owner_email', v)} className="text-[#6e6e73] text-xs" placeholder="owner@..." />
                          </td>
                          <td className="px-3 py-2.5">
                            <InlineStatusSelect value={r.status} options={STATUSES} onChange={v => updateBizRisk(r.id, 'status', v)} />
                          </td>
                          <td className="px-2 py-2.5">
                            <button onClick={() => { if (confirm('Delete this risk?')) deleteBizRisk(r.id); }} className="text-[#86868b] hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all text-xs" aria-label="Delete risk">🗑</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Non-Conformances */}
          {tab === 'nonconf' && (
            <div className="space-y-3">
              {nonConfs.length === 0 ? (
                <EmptyState icon="⚠️" title="No non-conformances" action={{ label: '+ Add', onClick: addNC }} />
              ) : nonConfs.map(nc => (
                <div key={nc.id} className="group bg-white/70 rounded-2xl border border-black/[0.06] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <InlineEdit value={nc.title} onSave={v => updateNC(nc.id, 'title', v)} className="font-semibold text-[#1d1d1f] text-sm" />
                        <InlineStatusSelect value={nc.severity} options={SEVERITIES} onChange={v => updateNC(nc.id, 'severity', v)} />
                        {nc.brand_slug && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-500/15 text-[#515154]">{nc.brand_slug}</span>
                        )}
                      </div>
                      <div className="text-xs text-[#6e6e73] mb-1">Detected: {fmt(nc.detected_at)}</div>
                      <InlineEdit value={nc.root_cause ?? ''} onSave={v => updateNC(nc.id, 'root_cause', v)} className="text-xs text-[#6e6e73]" placeholder="Root cause..." />
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <InlineStatusSelect value={nc.status} options={STATUSES} onChange={v => updateNC(nc.id, 'status', v)} />
                      <button onClick={() => { if (confirm('Delete this entry?')) deleteNC(nc.id); }} className="text-[#86868b] hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all text-xs" aria-label="Delete entry">🗑</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Inline Edit Helper ──────────────────────────────────────────────────────

function InlineEdit({ value, onSave, className = '', placeholder }: {
  value: string; onSave: (v: string) => void; className?: string; placeholder?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  // Sync draft when value changes externally
  React.useEffect(() => { if (!editing) setDraft(value); }, [value, editing]);

  const commit = () => {
    setEditing(false);
    if (draft.trim() !== value) onSave(draft.trim());
  };

  if (!editing) {
    return (
      <span onClick={() => { setDraft(value); setEditing(true); }}
        className={`cursor-text hover:bg-black/[0.03] rounded px-1 -mx-1 transition-colors ${className}`}>
        {value || <span className="text-[#86868b] italic">{placeholder ?? 'Click to add'}</span>}
      </span>
    );
  }

  return (
    <input autoFocus value={draft} onChange={e => setDraft(e.target.value)}
      onBlur={commit} onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false); }}
      className={`bg-black/[0.04] border border-amber-500/30 rounded px-1.5 py-0.5 outline-none -mx-1 ${className}`}
      placeholder={placeholder} />
  );
}
