import React, { useState, useEffect, useRef } from 'react';
import { useConfig } from '@/lib/ConfigContext';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';
import Spinner from '@/components/ui/Spinner';
import type { LandingConfig } from '@/types';

// ─── Constants ────────────────────────────────────────────────────────────────

const TEMPLATE_VARIABLES = [
  { key: '{{full_name}}', label: 'Bewerber Name' },
  { key: '{{task_link}}', label: 'Task Link' },
  { key: '{{calendly_url}}', label: 'Calendly URL' },
  { key: '{{company_name}}', label: 'Firmenname' },
  { key: '{{program_name}}', label: 'Programmname' },
];

const FEATURE_LABELS: Record<string, string> = {
  kanban: 'Kanban Board',
  ai_analysis: 'KI-Analyse (Bewerber)',
  onboarding: 'Onboarding Checklist',
  public_positions: 'Öffentliche Stellenanzeigen',
};

const SLUG_LABELS: Record<string, string> = {
  task_invite: '📋 Task Invite',
  interview_invite: '🗓 Interview Invite',
  rejection: '❌ Absage',
  application_received: '✅ Eingangsbestätigung',
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

// ─── Email Template Editor ────────────────────────────────────────────────────

const EmailTemplateEditor: React.FC = () => {
  const [templates, setTemplates] = useState<any[]>([]);
  const [selected, setSelected] = useState<any | null>(null);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    supabase.from('email_templates').select('*').order('slug').then(({ data }) => {
      if (data && data.length > 0) {
        setTemplates(data);
        setSelected(data[0]);
        setSubject(data[0].subject);
        setBody(data[0].body);
      }
    });
  }, []);

  const selectTemplate = (t: any) => {
    setSelected(t);
    setSubject(t.subject);
    setBody(t.body);
    setPreview(false);
  };

  const insertVariable = (variable: string) => {
    const ta = textareaRef.current;
    if (!ta) { setBody(b => b + variable); return; }
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const newBody = body.substring(0, start) + variable + body.substring(end);
    setBody(newBody);
    setTimeout(() => {
      ta.focus();
      ta.setSelectionRange(start + variable.length, start + variable.length);
    }, 0);
  };

  const previewBody = body
    .replace(/\{\{full_name\}\}/g, 'Max Mustermann')
    .replace(/\{\{task_link\}\}/g, '#')
    .replace(/\{\{calendly_url\}\}/g, '#')
    .replace(/\{\{company_name\}\}/g, 'Meine Firma GmbH')
    .replace(/\{\{program_name\}\}/g, 'Internship Program');

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    const { error } = await supabase
      .from('email_templates')
      .update({ subject, body })
      .eq('id', selected.id);
    if (!error) {
      setTemplates(prev => prev.map(t => t.id === selected.id ? { ...t, subject, body } : t));
      setSelected((prev: any) => ({ ...prev, subject, body }));
      toast.success('Template gespeichert');
    } else {
      toast.error('Fehler beim Speichern');
    }
    setSaving(false);
  };

  return (
    <div className="space-y-5">
      <div className="flex gap-2 flex-wrap">
        {templates.map(t => (
          <button key={t.id} onClick={() => selectTemplate(t)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              selected?.id === t.id ? 'bg-blue-600 text-white' : 'bg-white/[0.06] text-slate-400 hover:bg-white/[0.10]'
            }`}>
            {SLUG_LABELS[t.slug] || t.slug}
          </button>
        ))}
      </div>

      {selected && (
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wider">Betreff</label>
            <input value={subject} onChange={e => setSubject(e.target.value)}
              className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.10] text-slate-100 rounded-lg text-sm" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">Variable einfügen</label>
            <div className="flex gap-2 flex-wrap">
              {TEMPLATE_VARIABLES.map(v => (
                <button key={v.key} onClick={() => insertVariable(v.key)}
                  className="px-2 py-1 text-xs bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-md hover:bg-blue-500/20 transition-colors font-mono">
                  + {v.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                {preview ? 'Vorschau' : 'HTML Inhalt'}
              </label>
              <button onClick={() => setPreview(p => !p)} className="text-xs text-blue-400 hover:text-blue-300">
                {preview ? '← Editor' : 'Vorschau →'}
              </button>
            </div>
            {preview ? (
              <div className="w-full min-h-48 bg-white rounded-lg p-4 text-sm text-gray-800 overflow-auto"
                dangerouslySetInnerHTML={{ __html: previewBody }} />
            ) : (
              <textarea ref={textareaRef} value={body} onChange={e => setBody(e.target.value)}
                rows={12} className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.10] text-slate-100 rounded-lg text-xs font-mono resize-y" />
            )}
          </div>

          <div className="flex justify-end">
            <button onClick={handleSave} disabled={saving}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg flex items-center gap-2 transition-colors">
              {saving && <Spinner className="w-4 h-4" />} Speichern
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Main Settings View ───────────────────────────────────────────────────────

interface SettingsViewProps { isDemoMode?: boolean; }

const SettingsView: React.FC<SettingsViewProps> = ({ isDemoMode = false }) => {
  const { config, loading, save } = useConfig();
  const [form, setForm] = useState({ ...config });
  const [landing, setLanding] = useState<LandingConfig>({ ...DEFAULT_LANDING, ...config.landing_config });
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'email' | 'features' | 'ai' | 'landing'>('general');

  useEffect(() => {
    setForm({ ...config });
    setLanding({ ...DEFAULT_LANDING, ...config.landing_config });
  }, [config]);

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
    });
    if (success) toast.success('Gespeichert');
    else toast.error('Fehler beim Speichern');
    setSaving(false);
  };

  if (loading) return <div className="flex justify-center py-20"><Spinner /></div>;

  const field = (key: keyof typeof form, label: string, type = 'text') => (
    <div key={key}>
      <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wider">{label}</label>
      <input type={type} value={(form as any)[key] || ''} disabled={isDemoMode}
        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
        className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.10] text-slate-100 rounded-lg text-sm disabled:opacity-40" />
    </div>
  );

  const setL = <K extends keyof LandingConfig>(k: K, v: LandingConfig[K]) =>
    setLanding(p => ({ ...p, [k]: v }));

  const SaveButton = () => (
    <div className="flex justify-end pt-2">
      <button onClick={handleSave} disabled={saving || isDemoMode}
        className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg flex items-center gap-2 transition-colors disabled:opacity-40">
        {saving && <Spinner className="w-4 h-4" />} Speichern
      </button>
    </div>
  );

  const TABS = [
    { id: 'general', label: '⚙️ Allgemein' },
    { id: 'email', label: '📧 E-Mail Templates' },
    { id: 'features', label: '🧩 Features' },
    { id: 'ai', label: '🤖 KI Kontext' },
    { id: 'landing', label: '🌐 Landing Page' },
  ] as const;

  return (
    <div className="max-w-4xl mx-auto animate-[fadeIn_0.5s_ease-out]">
      <h2 className="text-3xl font-black text-white tracking-tighter mb-6">Einstellungen</h2>

      <div className="flex gap-1 mb-6 bg-white/[0.03] p-1 rounded-xl w-fit flex-wrap">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${
              activeTab === t.id ? 'bg-white/[0.10] text-white' : 'text-slate-500 hover:text-slate-300'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="bg-surface-800/60 border border-white/[0.06] rounded-xl p-6 space-y-6">

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

        {activeTab === 'email' && <EmailTemplateEditor />}

        {activeTab === 'features' && (
          <>
            <div className="space-y-1">
              {Object.entries(FEATURE_LABELS).map(([key, label]) => (
                <div key={key} className="flex items-center justify-between py-3 border-b border-white/[0.06] last:border-0">
                  <div>
                    <p className="text-sm font-semibold text-white">{label}</p>
                    <p className="text-xs text-slate-500 font-mono">feature_flags.{key}</p>
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

        {activeTab === 'ai' && (
          <>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">KI Kontext für Bewerber-Analyse</label>
              <p className="text-xs text-slate-500 mb-3">Beschreibt dem KI-Assistenten das Unternehmen, die Werte und wen ihr sucht.</p>
              <textarea value={form.ai_instruction || ''} disabled={isDemoMode}
                onChange={e => setForm(f => ({ ...f, ai_instruction: e.target.value }))}
                rows={10}
                placeholder="z.B.: Wir sind ein D2C E-Commerce Aggregator mit 6 nachhaltigen Brands. Wir suchen Interns die eigenverantwortlich arbeiten..."
                className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.10] text-slate-100 rounded-lg text-sm resize-y placeholder-slate-600 disabled:opacity-40" />
            </div>
            <SaveButton />
          </>
        )}

        {activeTab === 'landing' && (
          <>
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">Modus</label>
                <div className="flex gap-2">
                  {(['influencer', 'partner', 'both'] as const).map(m => (
                    <button key={m} type="button" onClick={() => setL('mode', m)}
                      className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${landing.mode === m ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'bg-white/[0.05] text-slate-500 border border-white/[0.06] hover:text-slate-300'}`}>
                      {m === 'influencer' ? 'Influencer' : m === 'partner' ? 'Partner' : 'Beides'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {[['hero_tagline', 'Hero Tagline'], ['hero_subtitle', 'Hero Subtitle']].map(([k, l]) => (
                  <div key={k}>
                    <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wider">{l}</label>
                    <input type="text" value={(landing as any)[k] || ''} onChange={e => setL(k as any, e.target.value)}
                      className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.10] text-slate-100 rounded-lg text-sm" />
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-4">
                {[['cta_primary_text', 'CTA Primär Text'], ['cta_primary_url', 'CTA Primär URL'], ['cta_secondary_text', 'CTA Sekundär Text'], ['cta_secondary_url', 'CTA Sekundär URL']].map(([k, l]) => (
                  <div key={k}>
                    <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wider">{l}</label>
                    <input type="text" value={(landing as any)[k] || ''} onChange={e => setL(k as any, e.target.value)}
                      className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.10] text-slate-100 rounded-lg text-sm" />
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">Sektionen</label>
                <div className="grid grid-cols-2 gap-2">
                  {([['show_portfolio', 'Portfolio / Brands'], ['show_approach', 'Methodik'], ['show_jobs_link', 'Stellenausschreibungen'], ['show_faq', 'FAQ']] as [keyof LandingConfig, string][]).map(([k, l]) => (
                    <button key={k} type="button" onClick={() => setL(k, !landing[k] as any)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-left transition-all border ${landing[k] ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' : 'bg-white/[0.04] border-white/[0.06] text-slate-500'}`}>
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
