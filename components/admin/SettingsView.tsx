import React, { useState, useEffect } from 'react';
import { useSettings } from '@/lib/useSettings';
import Spinner from '@/components/ui/Spinner';
import type { LandingConfig } from '@/types';

interface SettingsViewProps {
  isDemoMode: boolean;
}

const DEFAULT_LANDING: LandingConfig = {
  mode: 'influencer',
  hero_tagline: 'Werde Teil unseres Creator-Netzwerks.',
  hero_subtitle: 'Wir suchen authentische Creator für unsere nachhaltigen Brands. Keine Mindestfollower. Nur echte Persönlichkeiten.',
  cta_primary_text: 'Jetzt bewerben →',
  cta_primary_url: '/',
  cta_secondary_text: 'Anfrage senden',
  cta_secondary_url: 'mailto:info@hartlimesgmbh.de',
  show_portfolio: true,
  show_approach: false,
  show_jobs_link: true,
  show_faq: true,
};

const SettingsView: React.FC<SettingsViewProps> = ({ isDemoMode }) => {
  const { settings, loading, error, save, refreshing } = useSettings();

  const [companyName, setCompanyName] = useState('');
  const [calendlyUrl, setCalendlyUrl] = useState('');
  const [aiInstruction, setAiInstruction] = useState('');
  const [landing, setLanding] = useState<LandingConfig>(DEFAULT_LANDING);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (settings) {
      setCompanyName(isDemoMode ? 'Demo Company' : (settings.company_name ?? ''));
      setCalendlyUrl(isDemoMode ? 'https://calendly.com/demo' : (settings.calendly_url ?? ''));
      setAiInstruction(settings.ai_instruction ?? '');
      if (settings.landing_config) setLanding({ ...DEFAULT_LANDING, ...settings.landing_config });
    }
  }, [settings, isDemoMode]);

  const setL = <K extends keyof LandingConfig>(key: K, val: LandingConfig[K]) =>
    setLanding(p => ({ ...p, [key]: val }));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    const ok = await save({
      company_name: companyName,
      calendly_url: calendlyUrl,
      ai_instruction: aiInstruction,
      landing_config: landing,
    });
    if (ok) {
      setMessage('Settings updated successfully!');
      setTimeout(() => setMessage(''), 3000);
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner className="text-primary-600" />
      </div>
    );
  }

  if (error) {
    return <div className="text-red-500 text-center py-20">{error}</div>;
  }

  return (
    <div className="max-w-3xl mx-auto animate-[fadeIn_0.5s_ease-out]">
      <form
        onSubmit={handleSave}
        className="glass-card p-12 rounded-[4rem] space-y-10 shadow-2xl border-white/20"
      >
        <div className="border-b border-gray-100 dark:border-slate-800 pb-8">
          <h2 className="text-3xl font-black text-gray-900 dark:text-white tracking-tighter">
            Global Hub Configuration
          </h2>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-2">
            Adjust your AI & Communication triggers
          </p>
        </div>

        <div className="space-y-8">
          <div>
            <label className="block text-[11px] font-black uppercase tracking-widest text-gray-500 mb-3">
              Default Calendly URL
            </label>
            <input
              type="url"
              value={isDemoMode ? 'https://calendly.com/demo' : calendlyUrl}
              onChange={(e) => setCalendlyUrl(e.target.value)}
              className="w-full px-6 py-5 glass-card rounded-2xl outline-none focus:ring-2 focus:ring-primary-500 text-sm font-medium border-white/20 text-black"
              placeholder={
                isDemoMode
                  ? 'https://calendly.com/demo'
                  : 'https://calendly.com/your-team/interview'
              }
              disabled={isDemoMode} // Disable editing in demo mode
            />
          </div>

          <div>
            <label className="block text-[11px] font-black uppercase tracking-widest text-gray-500 mb-3">
              Company Display Name
            </label>
            <input
              type="text"
              value={isDemoMode ? 'Demo Company' : companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="w-full px-6 py-5 glass-card rounded-2xl outline-none focus:ring-2 focus:ring-primary-500 text-sm font-medium border-white/20 text-black"
              disabled={isDemoMode} // Disable editing in demo mode
            />
          </div>
        </div>

        {/* Landing Page Config */}
        <div className="border-t border-gray-100 pt-8 space-y-6">
          <div>
            <h3 className="text-lg font-black text-gray-900 tracking-tighter">Landing Page</h3>
            <p className="text-xs text-gray-400 mt-1">Konfiguriert die öffentliche Seite unter /company</p>
          </div>

          {/* Mode */}
          <div>
            <label className="block text-[11px] font-black uppercase tracking-widest text-gray-500 mb-2">Modus</label>
            <div className="flex gap-2">
              {(['influencer', 'partner', 'both'] as const).map(m => (
                <button key={m} type="button"
                  onClick={() => setL('mode', m)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${landing.mode === m ? 'bg-primary-600 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                  {m === 'influencer' ? 'Influencer' : m === 'partner' ? 'Partner' : 'Beides'}
                </button>
              ))}
            </div>
          </div>

          {/* Hero */}
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-[11px] font-black uppercase tracking-widest text-gray-500 mb-2">Hero Tagline</label>
              <input type="text" value={landing.hero_tagline} onChange={e => setL('hero_tagline', e.target.value)}
                className="w-full px-4 py-3 glass-card rounded-xl outline-none focus:ring-2 focus:ring-primary-500 text-sm font-medium text-black" />
            </div>
            <div>
              <label className="block text-[11px] font-black uppercase tracking-widest text-gray-500 mb-2">Hero Subtitle</label>
              <textarea rows={2} value={landing.hero_subtitle} onChange={e => setL('hero_subtitle', e.target.value)}
                className="w-full px-4 py-3 glass-card rounded-xl outline-none focus:ring-2 focus:ring-primary-500 text-sm font-medium text-black resize-none" />
            </div>
          </div>

          {/* CTAs */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-black uppercase tracking-widest text-gray-500 mb-2">CTA Primär Text</label>
              <input type="text" value={landing.cta_primary_text} onChange={e => setL('cta_primary_text', e.target.value)}
                className="w-full px-4 py-3 glass-card rounded-xl outline-none focus:ring-2 focus:ring-primary-500 text-sm font-medium text-black" />
            </div>
            <div>
              <label className="block text-[11px] font-black uppercase tracking-widest text-gray-500 mb-2">CTA Primär URL</label>
              <input type="text" value={landing.cta_primary_url} onChange={e => setL('cta_primary_url', e.target.value)}
                className="w-full px-4 py-3 glass-card rounded-xl outline-none focus:ring-2 focus:ring-primary-500 text-sm font-medium text-black" />
            </div>
            <div>
              <label className="block text-[11px] font-black uppercase tracking-widest text-gray-500 mb-2">CTA Sekundär Text</label>
              <input type="text" value={landing.cta_secondary_text} onChange={e => setL('cta_secondary_text', e.target.value)}
                className="w-full px-4 py-3 glass-card rounded-xl outline-none focus:ring-2 focus:ring-primary-500 text-sm font-medium text-black" />
            </div>
            <div>
              <label className="block text-[11px] font-black uppercase tracking-widest text-gray-500 mb-2">CTA Sekundär URL</label>
              <input type="text" value={landing.cta_secondary_url} onChange={e => setL('cta_secondary_url', e.target.value)}
                className="w-full px-4 py-3 glass-card rounded-xl outline-none focus:ring-2 focus:ring-primary-500 text-sm font-medium text-black" />
            </div>
          </div>

          {/* Section Toggles */}
          <div>
            <label className="block text-[11px] font-black uppercase tracking-widest text-gray-500 mb-3">Sektionen anzeigen</label>
            <div className="grid grid-cols-2 gap-3">
              {([
                ['show_portfolio', 'Portfolio / Brands'],
                ['show_approach', 'Methodik (Buy·Build·Scale)'],
                ['show_jobs_link', 'Stellenausschreibungen'],
                ['show_faq', 'FAQ'],
              ] as [keyof LandingConfig, string][]).map(([key, label]) => (
                <button key={key} type="button" onClick={() => setL(key, !landing[key] as any)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold text-left transition-all ${landing[key] ? 'bg-primary-50 border border-primary-200 text-primary-700' : 'bg-gray-50 border border-gray-200 text-gray-400'}`}>
                  <span className={`w-4 h-4 rounded-full flex-shrink-0 border-2 transition-colors ${landing[key] ? 'bg-primary-500 border-primary-500' : 'bg-white border-gray-300'}`} />
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {message && (
          <div className="p-4 bg-green-500/10 border border-green-500/20 text-green-600 text-[10px] font-black uppercase text-center rounded-2xl">
            {message}
          </div>
        )}

        <div className="pt-6">
          <button
            type="submit"
            disabled={saving || refreshing}
            className="w-full py-6 bg-primary-600 hover:bg-primary-700 text-white rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-2xl shadow-primary-500/30 flex justify-center items-center gap-3 transition-all hover:scale-[1.01]"
          >
            {saving || refreshing ? (
              <Spinner className="w-5 h-5" />
            ) : (
              'Apply Global Settings'
            )}
          </button>
        </div>

        <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-2xl text-xs text-gray-500 text-center">
          Team management has moved to <span className="font-bold text-gray-700">Admin → Team</span> tab.
        </div>
      </form>
    </div>
  );
};

export default SettingsView;
