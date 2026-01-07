
import React, { useState, useEffect } from 'react';
import { useSettings } from '../../lib/useSettings';
import SpinnerIcon from '../icons/SpinnerIcon';

const SettingsView: React.FC = () => {
  const { settings, loading, error, save, refreshing } = useSettings();
  
  const [companyName, setCompanyName] = useState('');
  const [calendlyUrl, setCalendlyUrl] = useState('');
  const [aiInstruction, setAiInstruction] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (settings) {
      setCompanyName(settings.company_name ?? '');
      setCalendlyUrl(settings.calendly_url ?? '');
      setAiInstruction(settings.ai_instruction ?? '');
    }
  }, [settings]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    const ok = await save({
      company_name: companyName,
      calendly_url: calendlyUrl,
      ai_instruction: aiInstruction,
    });
    if (ok) {
      setMessage('Settings updated successfully!');
      setTimeout(() => setMessage(''), 3000);
    }
    setSaving(false);
  };

  if (loading) {
    return <div className="flex justify-center py-20"><SpinnerIcon className="animate-spin text-primary-600" /></div>;
  }

  if (error) {
    return <div className="text-red-500 text-center py-20">{error}</div>;
  }

  return (
    <div className="max-w-3xl mx-auto animate-[fadeIn_0.5s_ease-out]">
      <form onSubmit={handleSave} className="glass-card p-12 rounded-[4rem] space-y-10 shadow-2xl border-white/20">
        <div className="border-b border-gray-100 dark:border-slate-800 pb-8">
          <h2 className="text-3xl font-black text-gray-900 dark:text-white tracking-tighter">Global Hub Configuration</h2>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-2">Adjust your AI & Communication triggers</p>
        </div>

        <div className="space-y-8">
          <div>
            <label className="block text-[11px] font-black uppercase tracking-widest text-gray-500 mb-3">Default Calendly URL</label>
            <input 
              type="url" 
              value={calendlyUrl} 
              onChange={e => setCalendlyUrl(e.target.value)}
              className="w-full px-6 py-5 glass-card rounded-2xl outline-none focus:ring-2 focus:ring-primary-500 text-sm font-medium border-white/20 text-black"
              placeholder="https://calendly.com/your-team/interview"
            />
          </div>

          <div>
            <label className="block text-[11px] font-black uppercase tracking-widest text-gray-500 mb-3">Company Display Name</label>
            <input 
              type="text" 
              value={companyName} 
              onChange={e => setCompanyName(e.target.value)}
              className="w-full px-6 py-5 glass-card rounded-2xl outline-none focus:ring-2 focus:ring-primary-500 text-sm font-medium border-white/20 text-black"
            />
          </div>

          <div>
            <label className="block text-[11px] font-black uppercase tracking-widest text-gray-500 mb-3">AI Recruiting Persona (Instruction)</label>
            <textarea 
              rows={4}
              value={aiInstruction} 
              onChange={e => setAiInstruction(e.target.value)}
              className="w-full px-6 py-5 glass-card rounded-2xl outline-none focus:ring-2 focus:ring-primary-500 text-sm font-medium leading-relaxed border-white/20 text-black"
            />
            <p className="text-[10px] text-gray-400 mt-2 font-bold uppercase tracking-widest">This prompt guides the Gemini AI in analyzing applications.</p>
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
            {saving || refreshing ? <SpinnerIcon className="animate-spin w-5 h-5" /> : "Apply Global Settings"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default SettingsView;
