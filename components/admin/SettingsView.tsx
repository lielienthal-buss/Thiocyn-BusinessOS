import React, { useState, useEffect } from 'react';
import { useConfig } from '@/lib/ConfigContext';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';
import Spinner from '@/components/ui/Spinner';
import type { LandingConfig } from '@/types';

const FUNNEL_TABLES: Array<{ key: string; label: string; description: string }> = [
  { key: 'applications',           label: 'Founders University', description: 'Intro-Call mit Bewerbern für die 12-Wochen-Fellowship' },
  { key: 'ambassador_applications', label: 'Ambassador',          description: 'Kennenlern-Gespräch mit Creator-Bewerbern' },
  { key: 'ma_inquiries',           label: 'M&A / Founders',       description: 'Erstgespräch mit verkaufsbereiten Founderns' },
];

interface TeamMemberRow {
  id: string;
  full_name: string | null;
  email: string;
  role: string;
  calendly_url: string | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const FEATURE_LABELS: Record<string, string> = {
  kanban: 'Kanban Board',
  ai_analysis: 'KI-Analyse (Bewerber)',
  onboarding: 'Onboarding Checklist',
  public_positions: 'Öffentliche Stellenanzeigen',
};

const DEFAULT_LANDING: LandingConfig = {
  mode: 'influencer',
  hero_tagline: '',
  hero_subtitle: '',
  cta_primary_text: 'Jetzt bewerben →',
  cta_primary_url: '/',
  cta_secondary_text: 'Anfrage senden',
  cta_secondary_url: '/',
  show_portfolio: true,
  show_approach: false,
  show_jobs_link: true,
  show_faq: true,
};

// ─── Main Settings View ───────────────────────────────────────────────────────

interface SettingsViewProps { isDemoMode?: boolean; }

const SettingsView: React.FC<SettingsViewProps> = ({ isDemoMode = false }) => {
  const { config, loading, save } = useConfig();
  const [form, setForm] = useState({ ...config });
  const [landing, setLanding] = useState<LandingConfig>({ ...DEFAULT_LANDING, ...config.landing_config });
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'features' | 'ai' | 'landing' | 'funnels'>('general');
  const [teamMembers, setTeamMembers] = useState<TeamMemberRow[]>([]);

  useEffect(() => {
    setForm({ ...config });
    setLanding({ ...DEFAULT_LANDING, ...config.landing_config });
  }, [config]);

  useEffect(() => {
    if (activeTab !== 'funnels' || teamMembers.length > 0) return;
    supabase
      .from('team_members')
      .select('id, full_name, email, role, calendly_url')
      .eq('status', 'active')
      .order('full_name')
      .then(({ data }) => setTeamMembers((data as TeamMemberRow[]) ?? []));
  }, [activeTab, teamMembers.length]);

  const setFunnelOwner = (funnelKey: string, ownerId: string | null) => {
    setForm(f => ({
      ...f,
      funnel_owners: { ...(f.funnel_owners ?? {}), [funnelKey]: ownerId },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    const success = await save({
      company_name: form.company_name,
      program_name: form.program_name,
      from_email: form.from_email,
      from_name: form.from_name,
      app_url: form.app_url,
      logo_url: form.logo_url,
      calendly_url: form.calendly_url,
      ai_instruction: form.ai_instruction,
      feature_flags: form.feature_flags,
      landing_config: landing,
      funnel_owners: form.funnel_owners,
    });
    if (success) toast.success('Gespeichert');
    else toast.error('Fehler beim Speichern');
    setSaving(false);
  };

  if (loading) return <div className="flex justify-center py-20"><Spinner /></div>;

  const field = (key: keyof typeof form, label: string, type = 'text') => (
    <div key={key}>
      <label className="block text-xs font-semibold text-[#515154] mb-1 uppercase tracking-wider">{label}</label>
      <input type={type} value={(form as any)[key] || ''} disabled={isDemoMode}
        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
        className="w-full px-3 py-2 bg-black/[0.03] border border-white/[0.10] text-[#1d1d1f] rounded-lg text-sm disabled:opacity-40" />
    </div>
  );

  const setL = <K extends keyof LandingConfig>(k: K, v: LandingConfig[K]) =>
    setLanding(p => ({ ...p, [k]: v }));

  const SaveButton = () => (
    <div className="flex justify-end pt-2">
      <button onClick={handleSave} disabled={saving || isDemoMode}
        className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-[#1d1d1f] text-sm font-semibold rounded-lg flex items-center gap-2 transition-colors disabled:opacity-40">
        {saving && <Spinner className="w-4 h-4" />} Speichern
      </button>
    </div>
  );

  const TABS = [
    { id: 'general', label: '⚙️ Allgemein' },
    { id: 'features', label: '🧩 Features' },
    { id: 'funnels', label: '🎯 Funnel Owners' },
    { id: 'ai', label: '🤖 KI Kontext' },
    { id: 'landing', label: '🌐 Landing Page' },
  ] as const;

  return (
    <div className="max-w-4xl mx-auto animate-[fadeIn_0.5s_ease-out]">
      <h2 className="text-3xl font-black text-[#1d1d1f] tracking-tighter mb-6">Einstellungen</h2>

      <div className="flex gap-1 mb-6 bg-black/[0.03] p-1 rounded-xl w-fit flex-wrap">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${
              activeTab === t.id ? 'bg-white/[0.10] text-[#1d1d1f]' : 'text-[#6e6e73] hover:text-[#1d1d1f]'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="bg-white/70 border border-black/[0.06] rounded-xl p-6 space-y-6">

        {activeTab === 'general' && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {field('company_name', 'Firmenname')}
              {field('program_name', 'Programmname')}
              {field('from_name', 'Absender Name (E-Mail)')}
              {field('from_email', 'Absender E-Mail', 'email')}
              {field('app_url', 'App URL', 'url')}
              {field('calendly_url', 'Calendly URL')}
              {field('logo_url', 'Logo URL', 'url')}
            </div>
            <SaveButton />
          </>
        )}

        {activeTab === 'features' && (
          <>
            <div className="space-y-1">
              {Object.entries(FEATURE_LABELS).map(([key, label]) => (
                <div key={key} className="flex items-center justify-between py-3 border-b border-black/[0.06] last:border-0">
                  <div>
                    <p className="text-sm font-semibold text-[#1d1d1f]">{label}</p>
                    <p className="text-xs text-[#6e6e73] font-mono">feature_flags.{key}</p>
                  </div>
                  <button disabled={isDemoMode}
                    onClick={() => setForm(f => ({ ...f, feature_flags: { ...f.feature_flags, [key]: !f.feature_flags[key] } }))}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-40 ${form.feature_flags[key] ? 'bg-blue-600' : 'bg-white/[0.10]'}`}>
                    <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${form.feature_flags[key] ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>
              ))}
            </div>
            <SaveButton />
          </>
        )}

        {activeTab === 'funnels' && (
          <>
            <div>
              <p className="text-sm text-[#515154] mb-1">
                Wer macht die Intro-Calls für welchen Funnel? Dessen Calendly-Link wird automatisch in die Auto-Reply-Mail eingebunden.
              </p>
              <p className="text-xs text-[#86868b] mb-5">
                Voraussetzung: Der ausgewählte Owner hat seinen Calendly-Link unter <strong>Account-Profil</strong> gepflegt.
                Falls nicht: Fallback auf zentralen Calendly-Link aus Allgemein-Tab.
              </p>
            </div>

            {teamMembers.length === 0 ? (
              <div className="text-sm text-[#6e6e73] py-6 text-center">Lade Team-Mitglieder…</div>
            ) : (
              <div className="space-y-4">
                {FUNNEL_TABLES.map(funnel => {
                  const currentOwnerId = form.funnel_owners?.[funnel.key] ?? '';
                  const currentOwner = teamMembers.find(m => m.id === currentOwnerId);
                  const hasLink = !!currentOwner?.calendly_url;
                  return (
                    <div key={funnel.key} className="rounded-xl border border-black/[0.08] bg-white p-4">
                      <div className="flex items-baseline justify-between mb-1">
                        <p className="text-sm font-bold text-[#1d1d1f]">{funnel.label}</p>
                        <p className="text-[10px] font-mono uppercase tracking-wider text-[#86868b]">{funnel.key}</p>
                      </div>
                      <p className="text-xs text-[#6e6e73] mb-3">{funnel.description}</p>
                      <div className="flex flex-wrap items-center gap-3">
                        <select
                          value={currentOwnerId}
                          onChange={e => setFunnelOwner(funnel.key, e.target.value || null)}
                          disabled={isDemoMode}
                          className="flex-1 min-w-[200px] h-9 rounded-lg border border-black/10 bg-white px-3 text-sm text-[#1d1d1f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E]"
                        >
                          <option value="">— kein Owner (Fallback auf zentralen Link) —</option>
                          {teamMembers.map(m => (
                            <option key={m.id} value={m.id}>
                              {m.full_name ?? m.email} · {m.role}{m.calendly_url ? ' · ✓ Link gepflegt' : ' · ⚠ kein Link'}
                            </option>
                          ))}
                        </select>
                        {currentOwnerId && (
                          <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${hasLink ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-800 border border-amber-200'}`}>
                            {hasLink ? '✓ Calendly OK' : '⚠ Owner braucht Calendly-Link'}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <SaveButton />
          </>
        )}

        {activeTab === 'ai' && (
          <>
            <div>
              <label className="block text-xs font-semibold text-[#515154] mb-2 uppercase tracking-wider">KI Kontext für Bewerber-Analyse</label>
              <p className="text-xs text-[#6e6e73] mb-3">Beschreibt dem KI-Assistenten das Unternehmen, die Werte und wen ihr sucht.</p>
              <textarea value={form.ai_instruction || ''} disabled={isDemoMode}
                onChange={e => setForm(f => ({ ...f, ai_instruction: e.target.value }))}
                rows={10}
                placeholder="z.B.: Wir sind ein D2C E-Commerce Aggregator mit 6 nachhaltigen Brands. Wir suchen Interns die eigenverantwortlich arbeiten..."
                className="w-full px-3 py-2 bg-black/[0.03] border border-white/[0.10] text-[#1d1d1f] rounded-lg text-sm resize-y placeholder-[#86868b] disabled:opacity-40" />
            </div>
            <SaveButton />
          </>
        )}

        {activeTab === 'landing' && (
          <>
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-[#515154] mb-2 uppercase tracking-wider">Modus</label>
                <div className="flex gap-2">
                  {(['influencer', 'partner', 'both'] as const).map(m => (
                    <button key={m} type="button" onClick={() => setL('mode', m)}
                      className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${landing.mode === m ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'bg-black/[0.03] text-[#6e6e73] border border-black/[0.06] hover:text-[#1d1d1f]'}`}>
                      {m === 'influencer' ? 'Influencer' : m === 'partner' ? 'Partner' : 'Beides'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {[['hero_tagline', 'Hero Tagline'], ['hero_subtitle', 'Hero Subtitle']].map(([k, l]) => (
                  <div key={k}>
                    <label className="block text-xs font-semibold text-[#515154] mb-1 uppercase tracking-wider">{l}</label>
                    <input type="text" value={(landing as any)[k] || ''} onChange={e => setL(k as any, e.target.value)}
                      className="w-full px-3 py-2 bg-black/[0.03] border border-white/[0.10] text-[#1d1d1f] rounded-lg text-sm" />
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-4">
                {[['cta_primary_text', 'CTA Primär Text'], ['cta_primary_url', 'CTA Primär URL'], ['cta_secondary_text', 'CTA Sekundär Text'], ['cta_secondary_url', 'CTA Sekundär URL']].map(([k, l]) => (
                  <div key={k}>
                    <label className="block text-xs font-semibold text-[#515154] mb-1 uppercase tracking-wider">{l}</label>
                    <input type="text" value={(landing as any)[k] || ''} onChange={e => setL(k as any, e.target.value)}
                      className="w-full px-3 py-2 bg-black/[0.03] border border-white/[0.10] text-[#1d1d1f] rounded-lg text-sm" />
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#515154] mb-2 uppercase tracking-wider">Sektionen</label>
                <div className="grid grid-cols-2 gap-2">
                  {([['show_portfolio', 'Portfolio / Brands'], ['show_approach', 'Methodik'], ['show_jobs_link', 'Stellenausschreibungen'], ['show_faq', 'FAQ']] as [keyof LandingConfig, string][]).map(([k, l]) => (
                    <button key={k} type="button" onClick={() => setL(k, !landing[k] as any)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-left transition-all border ${landing[k] ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' : 'bg-black/[0.03] border-black/[0.06] text-[#6e6e73]'}`}>
                      <span className={`w-3 h-3 rounded-full flex-shrink-0 ${landing[k] ? 'bg-blue-500' : 'bg-white/10'}`} />
                      {l}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <SaveButton />
          </>
        )}
      </div>
    </div>
  );
};

export default SettingsView;
