import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabaseClient';
import { useLang } from '@/lib/i18n';
import { translations } from '@/lib/translations';

const BRANDS = ['Paigh', 'Take A Shot', 'Wristr', 'Thiocyn', 'Dr. Severin', 'Timber & John'];
const FOLLOWER_RANGES = ['1k–10k', '10k–50k', '50k–200k', '200k+'];

const emptyForm = {
  name: '',
  instagram_url: '',
  brand: 'Paigh',
  follower_range: '1k–10k',
  notes: '',
  email: '',
};

interface ApplicationSlidePanelProps {
  open: boolean;
  onClose: () => void;
}

const STEPS = ['Profil', 'Details', 'Absenden'];

const inputClass =
  'w-full px-4 py-3.5 bg-white/[0.05] border border-white/[0.1] rounded-xl text-white text-sm placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-white/20 transition-all';
const labelClass = 'block text-[10px] font-black uppercase tracking-[0.2em] mb-1.5 text-gray-500';

export default function ApplicationSlidePanel({ open, onClose }: ApplicationSlidePanelProps) {
  const { lang } = useLang();
  const t = translations[lang].public.creator;

  const [form, setForm] = useState(emptyForm);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [charCount, setCharCount] = useState(0);

  // Body scroll lock
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  // Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (open) document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setForm(emptyForm);
        setStep(1);
        setCharCount(0);
      }, 500);
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error: err } = await supabase.from('creators').insert([{
      name: form.name.trim(),
      instagram_url: form.instagram_url.trim() || null,
      brand: form.brand,
      follower_range: form.follower_range,
      notes: form.notes.trim() || null,
      email: form.email.trim() || null,
      status: 'Prospect',
    }]);
    setLoading(false);
    if (err) {
      toast.error(err.message);
      return;
    }
    toast.success('Bewerbung eingegangen! Wir melden uns in 48h.');
    onClose();
  };

  const progress = ((step - 1) / (STEPS.length - 1)) * 100;

  return (
    <div className={`fixed inset-0 z-50 ${open ? '' : 'pointer-events-none'}`}>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-500 ${open ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={`fixed top-0 right-0 h-full w-full max-w-md bg-[#0d0d0d] border-l border-white/[0.08] shadow-2xl overflow-y-auto transition-transform duration-500 ease-in-out ${open ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* Liquid glass header */}
        <div className="sticky top-0 z-10 px-8 pt-8 pb-4 bg-[#0d0d0d]/80 backdrop-blur-xl border-b border-white/[0.06]">
          <div className="flex items-center justify-between mb-4">
            <span className="font-black text-white text-sm tracking-tight">Creator Bewerbung</span>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-white transition-colors text-2xl leading-none w-8 h-8 flex items-center justify-center"
            >
              ×
            </button>
          </div>

          {/* Step indicator */}
          <div className="flex items-center gap-3 mb-3">
            {STEPS.map((label, i) => (
              <React.Fragment key={label}>
                <div className="flex items-center gap-2">
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black transition-all duration-300 ${
                      i + 1 < step
                        ? 'bg-white text-gray-900'
                        : i + 1 === step
                        ? 'bg-white/10 border border-white/30 text-white'
                        : 'bg-white/[0.04] border border-white/[0.08] text-gray-600'
                    }`}
                  >
                    {i + 1 < step ? '✓' : i + 1}
                  </div>
                  <span className={`text-[9px] font-black uppercase tracking-[0.2em] ${i + 1 === step ? 'text-white' : 'text-gray-600'}`}>
                    {label}
                  </span>
                </div>
                {i < STEPS.length - 1 && <div className="flex-1 h-px bg-white/[0.06]" />}
              </React.Fragment>
            ))}
          </div>

          {/* Progress bar */}
          <div className="h-[1px] bg-white/[0.06] rounded-full overflow-hidden">
            <div
              className="h-full bg-white/40 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="px-8 py-6">
          <form onSubmit={handleSubmit}>
            {/* Step 1 — Identity */}
            {step === 1 && (
              <div className="space-y-4">
                <div className="mb-6">
                  <h2 className="text-xl font-black text-white tracking-tight">Wer bist du?</h2>
                  <p className="text-gray-600 text-xs mt-1">Name + Instagram-Profil</p>
                </div>
                <div>
                  <label className={labelClass}>{t.labelName}</label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    className={inputClass}
                    placeholder={t.namePlaceholder}
                  />
                </div>
                <div>
                  <label className={labelClass}>{t.labelInstagram}</label>
                  <input
                    type="url"
                    required
                    value={form.instagram_url}
                    onChange={e => setForm(f => ({ ...f, instagram_url: e.target.value }))}
                    className={inputClass}
                    placeholder="https://www.instagram.com/deinprofil/"
                  />
                </div>
                <button
                  type="button"
                  disabled={!form.name || !form.instagram_url}
                  onClick={() => setStep(2)}
                  className="w-full py-4 bg-white text-gray-900 font-black text-sm rounded-full hover:bg-gray-100 transition-colors disabled:opacity-40 mt-2"
                >
                  Weiter →
                </button>
              </div>
            )}

            {/* Step 2 — Profile */}
            {step === 2 && (
              <div className="space-y-4">
                <div className="mb-6">
                  <h2 className="text-xl font-black text-white tracking-tight">Dein Profil</h2>
                  <p className="text-gray-600 text-xs mt-1">Brand-Wunsch + Reichweite</p>
                </div>
                <div>
                  <label className={labelClass}>{t.labelBrand}</label>
                  <select
                    required
                    value={form.brand}
                    onChange={e => setForm(f => ({ ...f, brand: e.target.value }))}
                    className={`${inputClass} text-gray-300`}
                  >
                    {BRANDS.map(b => <option key={b} className="bg-[#0d0d0d]">{b}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>{t.labelFollowerRange}</label>
                  <select
                    value={form.follower_range}
                    onChange={e => setForm(f => ({ ...f, follower_range: e.target.value }))}
                    className={`${inputClass} text-gray-300`}
                  >
                    {FOLLOWER_RANGES.map(r => <option key={r} className="bg-[#0d0d0d]">{r}</option>)}
                  </select>
                </div>
                <div className="flex gap-3 mt-2">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="flex-1 py-4 bg-white/[0.05] border border-white/[0.1] text-gray-400 font-black text-sm rounded-full hover:bg-white/10 transition-colors"
                  >
                    ← Zurück
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep(3)}
                    className="flex-1 py-4 bg-white text-gray-900 font-black text-sm rounded-full hover:bg-gray-100 transition-colors"
                  >
                    Weiter →
                  </button>
                </div>
              </div>
            )}

            {/* Step 3 — Message */}
            {step === 3 && (
              <div className="space-y-4">
                <div className="mb-6">
                  <h2 className="text-xl font-black text-white tracking-tight">Fast fertig.</h2>
                  <p className="text-gray-600 text-xs mt-1">Kurze Nachricht + E-Mail</p>
                </div>
                <div>
                  <label className={labelClass}>{t.labelNotes}</label>
                  <textarea
                    value={form.notes}
                    maxLength={300}
                    rows={4}
                    onChange={e => { setForm(f => ({ ...f, notes: e.target.value })); setCharCount(e.target.value.length); }}
                    className={`${inputClass} resize-none`}
                    placeholder={t.notesPlaceholder}
                  />
                  <p className="text-right text-[10px] text-gray-600 mt-1">{charCount}/300</p>
                </div>
                <div>
                  <label className={labelClass}>{t.labelEmail}</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    className={inputClass}
                    placeholder={t.emailPlaceholder}
                  />
                </div>
                <div className="flex gap-3 mt-2">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="flex-1 py-4 bg-white/[0.05] border border-white/[0.1] text-gray-400 font-black text-sm rounded-full hover:bg-white/10 transition-colors"
                  >
                    ← Zurück
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-4 bg-white text-gray-900 font-black text-sm rounded-full hover:bg-gray-100 transition-colors disabled:opacity-50"
                  >
                    {loading ? '...' : t.submitButton}
                  </button>
                </div>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
