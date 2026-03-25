import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useBrand } from '@/lib/BrandContext';

type ISOTab = 'risks' | 'incidents' | 'bizRisks' | 'nonconf';

type RiskEntry = {
  id: string;
  asset: string;
  asset_category: string;
  threat: string;
  likelihood: number;
  impact: number;
  risk_score: number;
  risk_level: string;
  mitigation: string;
  mitigation_status: string;
  owner_email: string;
  next_review_date: string;
  brand_slug: string;
};

type SecurityIncident = {
  id: string;
  title: string;
  incident_type: string;
  severity: string;
  detected_at: string;
  detected_by_email: string;
  description: string;
  status: string;
  resolved_at: string | null;
};

type BusinessRisk = {
  id: string;
  title: string;
  category: string;
  brand_slug: string;
  risk_level: string;
  risk_score: number;
  mitigation_strategy: string;
  owner_email: string;
  status: string;
  next_review_date: string;
};

type NonConformance = {
  id: string;
  title: string;
  severity: string;
  brand_slug: string;
  status: string;
  detected_at: string;
  root_cause: string;
};

const riskBadge = (level: string) => {
  const map: Record<string, string> = {
    low: 'bg-green-100 text-green-700',
    medium: 'bg-yellow-100 text-yellow-700',
    high: 'bg-orange-100 text-orange-700',
    critical: 'bg-red-100 text-red-700',
  };
  return map[level] ?? 'bg-gray-100 text-gray-600';
};

const fmt = (dateStr: string | null) =>
  dateStr ? new Date(dateStr).toLocaleDateString('de-DE') : '—';

const truncate = (text: string, max: number) =>
  text && text.length > max ? text.slice(0, max) + '…' : text ?? '—';

export default function ISOComplianceView() {
  const { activeBrand } = useBrand();
  const [tab, setTab] = useState<ISOTab>('risks');

  const [risks, setRisks] = useState<RiskEntry[]>([]);
  const [incidents, setIncidents] = useState<SecurityIncident[]>([]);
  const [bizRisks, setBizRisks] = useState<BusinessRisk[]>([]);
  const [nonConfs, setNonConfs] = useState<NonConformance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);

      let riskQuery = supabase
        .from('risk_register')
        .select('*')
        .order('created_at', { ascending: false });

      let bizRiskQuery = supabase
        .from('business_risks')
        .select('*')
        .order('created_at', { ascending: false });

      let nonConfQuery = supabase
        .from('non_conformances')
        .select('*')
        .order('created_at', { ascending: false });

      if (activeBrand?.slug) {
        riskQuery = riskQuery.eq('brand_slug', activeBrand.slug);
        bizRiskQuery = bizRiskQuery.eq('brand_slug', activeBrand.slug);
        nonConfQuery = nonConfQuery.eq('brand_slug', activeBrand.slug);
      }

      const [r1, r2, r3, r4] = await Promise.all([
        riskQuery,
        supabase
          .from('security_incidents')
          .select('*')
          .order('created_at', { ascending: false }),
        bizRiskQuery,
        nonConfQuery,
      ]);

      setRisks((r1.data ?? []) as RiskEntry[]);
      setIncidents((r2.data ?? []) as SecurityIncident[]);
      setBizRisks((r3.data ?? []) as BusinessRisk[]);
      setNonConfs((r4.data ?? []) as NonConformance[]);
      setLoading(false);
    };

    load();
  }, [activeBrand?.slug]);

  const tabs: { key: ISOTab; label: string }[] = [
    { key: 'risks', label: 'Risk Register' },
    { key: 'incidents', label: 'Incidents' },
    { key: 'bizRisks', label: 'Business Risks' },
    { key: 'nonconf', label: 'Non-Conformances' },
  ];

  return (
    <div className="space-y-4">
      {/* Tab Bar */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={
              tab === t.key
                ? 'px-3 py-1.5 rounded-lg text-sm font-medium bg-white shadow-sm text-gray-900'
                : 'px-3 py-1.5 rounded-lg text-sm font-medium text-gray-500 hover:text-gray-700'
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading...</div>
      ) : (
        <>
          {/* Tab: Risk Register */}
          {tab === 'risks' && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
              <h2 className="text-sm font-semibold text-gray-700 mb-3">Risk Register</h2>
              {risks.length === 0 ? (
                <div className="text-center py-12 text-gray-400">Keine Einträge gefunden.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead>
                      <tr className="text-xs text-gray-500 border-b border-gray-100">
                        <th className="pb-2 pr-4 font-medium">Asset</th>
                        <th className="pb-2 pr-4 font-medium">Threat</th>
                        <th className="pb-2 pr-4 font-medium">Risk Level</th>
                        <th className="pb-2 pr-4 font-medium">Score</th>
                        <th className="pb-2 pr-4 font-medium">Mitigation Status</th>
                        <th className="pb-2 pr-4 font-medium">Owner</th>
                        <th className="pb-2 font-medium">Next Review</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {risks.map((r) => (
                        <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                          <td className="py-2.5 pr-4">
                            <div className="font-medium text-gray-800">{r.asset}</div>
                            <div className="text-xs text-gray-400">{r.asset_category}</div>
                          </td>
                          <td className="py-2.5 pr-4 text-gray-600">{r.threat}</td>
                          <td className="py-2.5 pr-4">
                            <span
                              className={`px-2 py-0.5 rounded-full text-xs font-medium ${riskBadge(r.risk_level)}`}
                            >
                              {r.risk_level}
                            </span>
                          </td>
                          <td className="py-2.5 pr-4 text-gray-700 font-medium">{r.risk_score}</td>
                          <td className="py-2.5 pr-4 text-gray-600">{r.mitigation_status}</td>
                          <td className="py-2.5 pr-4 text-gray-500 text-xs">{r.owner_email}</td>
                          <td className="py-2.5 text-gray-500 text-xs">{fmt(r.next_review_date)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Tab: Incidents */}
          {tab === 'incidents' && (
            <div className="space-y-3">
              {incidents.length === 0 ? (
                <div className="text-center py-12 text-gray-400">Keine Einträge gefunden.</div>
              ) : (
                incidents.map((inc) => (
                  <div
                    key={inc.id}
                    className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="font-semibold text-gray-800 text-sm">{inc.title}</span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-medium ${riskBadge(inc.severity)}`}
                          >
                            {inc.severity}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
                          <span>{inc.incident_type}</span>
                          <span>·</span>
                          <span>Detected: {fmt(inc.detected_at)}</span>
                          {inc.resolved_at && (
                            <>
                              <span>·</span>
                              <span>Resolved: {fmt(inc.resolved_at)}</span>
                            </>
                          )}
                        </div>
                        {inc.description && (
                          <p className="text-xs text-gray-500 mt-2 leading-relaxed">
                            {inc.description}
                          </p>
                        )}
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${
                          inc.status === 'resolved'
                            ? 'bg-green-100 text-green-700'
                            : inc.status === 'open'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}
                      >
                        {inc.status}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Tab: Business Risks */}
          {tab === 'bizRisks' && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
              <h2 className="text-sm font-semibold text-gray-700 mb-3">Business Risks</h2>
              {bizRisks.length === 0 ? (
                <div className="text-center py-12 text-gray-400">Keine Einträge gefunden.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead>
                      <tr className="text-xs text-gray-500 border-b border-gray-100">
                        <th className="pb-2 pr-4 font-medium">Title</th>
                        <th className="pb-2 pr-4 font-medium">Category</th>
                        <th className="pb-2 pr-4 font-medium">Risk Level</th>
                        <th className="pb-2 pr-4 font-medium">Score</th>
                        <th className="pb-2 pr-4 font-medium">Mitigation Strategy</th>
                        <th className="pb-2 pr-4 font-medium">Owner</th>
                        <th className="pb-2 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {bizRisks.map((r) => (
                        <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                          <td className="py-2.5 pr-4 font-medium text-gray-800">{r.title}</td>
                          <td className="py-2.5 pr-4 text-gray-500 text-xs">{r.category}</td>
                          <td className="py-2.5 pr-4">
                            <span
                              className={`px-2 py-0.5 rounded-full text-xs font-medium ${riskBadge(r.risk_level)}`}
                            >
                              {r.risk_level}
                            </span>
                          </td>
                          <td className="py-2.5 pr-4 text-gray-700 font-medium">{r.risk_score}</td>
                          <td className="py-2.5 pr-4 text-gray-500 text-xs">
                            {truncate(r.mitigation_strategy, 80)}
                          </td>
                          <td className="py-2.5 pr-4 text-gray-500 text-xs">{r.owner_email}</td>
                          <td className="py-2.5 text-xs">
                            <span
                              className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                r.status === 'resolved'
                                  ? 'bg-green-100 text-green-700'
                                  : r.status === 'open'
                                  ? 'bg-red-100 text-red-700'
                                  : 'bg-yellow-100 text-yellow-700'
                              }`}
                            >
                              {r.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Tab: Non-Conformances */}
          {tab === 'nonconf' && (
            <div className="space-y-3">
              {nonConfs.length === 0 ? (
                <div className="text-center py-12 text-gray-400">Keine Einträge gefunden.</div>
              ) : (
                nonConfs.map((nc) => (
                  <div
                    key={nc.id}
                    className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="font-semibold text-gray-800 text-sm">{nc.title}</span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-medium ${riskBadge(nc.severity)}`}
                          >
                            {nc.severity}
                          </span>
                          {nc.brand_slug && (
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                              {nc.brand_slug}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 mb-1">
                          Detected: {fmt(nc.detected_at)}
                        </div>
                        {nc.root_cause && (
                          <p className="text-xs text-gray-500 leading-relaxed">
                            <span className="font-medium text-gray-600">Root Cause: </span>
                            {truncate(nc.root_cause, 80)}
                          </p>
                        )}
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${
                          nc.status === 'resolved'
                            ? 'bg-green-100 text-green-700'
                            : nc.status === 'in_progress'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {nc.status}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
