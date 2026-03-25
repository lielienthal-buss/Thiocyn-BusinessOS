import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import Logo from '../icons/Logo';
import { useLang } from '../../lib/i18n';
import { translations } from '../../lib/translations';

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

const CreatorApplicationPage: React.FC = () => {
  const { lang } = useLang();
  const t = translations[lang].public.creator;
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [charCount, setCharCount] = useState(0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
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
    if (err) { setError(err.message); return; }
    setSuccess(true);
  };

  if (success) {
    return (
      <div className="min-h-screen bg-[#080808] flex flex-col items-center justify-center px-4">
        {/* Ambient glow */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-[-10%] left-[-5%] w-[45%] h-[45%] bg-primary-600/10 rounded-full blur-[150px]" />
          <div className="absolute bottom-[-10%] right-[-5%] w-[40%] h-[40%] bg-indigo-600/8 rounded-full blur-[130px]" />
        </div>
        <div className="relative bg-white rounded-[2.5rem] shadow-[0_32px_80px_-20px_rgba(0,0,0,0.8)] px-10 py-12 w-full max-w-md text-center">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[60%] h-px bg-gradient-to-r from-transparent via-primary-400/40 to-transparent" />
          <div className="text-5xl mb-6">🎉</div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight mb-3">
            {t.successHeadline}
          </h2>
          <p className="text-gray-500 text-sm mb-8">
            {t.successSubline}
          </p>
          <Link
            to="/creators"
            className="inline-block px-6 py-3 bg-gray-900 hover:bg-primary-600 text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all duration-300"
          >
            {t.successBack}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080808] flex flex-col items-center justify-center px-4 py-16">
      {/* Ambient glows */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-5%] w-[45%] h-[45%] bg-primary-600/10 rounded-full blur-[150px] animate-blob" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[40%] h-[40%] bg-indigo-600/8 rounded-full blur-[130px] animate-blob animation-delay-2000" />
        <div className="absolute inset-0 opacity-[0.025]"
          style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
      </div>

      <div className="relative w-full max-w-md">
        {/* Badge */}
        <div className="flex justify-center mb-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-500/10 border border-primary-500/20 text-primary-400 text-[10px] font-black uppercase tracking-[0.25em]">
            <span className="w-1.5 h-1.5 rounded-full bg-primary-400 animate-pulse inline-block" />
            {t.badge}
          </div>
        </div>

        {/* Card */}
        <div className="relative bg-white rounded-[2.5rem] shadow-[0_32px_80px_-20px_rgba(0,0,0,0.8)] overflow-hidden px-6 py-8 md:px-10 md:py-12">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[60%] h-px bg-gradient-to-r from-transparent via-primary-400/40 to-transparent" />

          {/* Logo + headline */}
          <div className="text-center mb-8">
            <div className="inline-block mb-5">
              <Logo className="h-12 w-auto" />
            </div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tighter">
              {t.headline}
            </h1>
            <p className="text-gray-400 text-sm mt-2 leading-relaxed">
              {t.subline}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name */}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-[0.2em] mb-1.5 text-gray-500">
                {t.labelName}
              </label>
              <input
                type="text"
                required
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500/40 focus:border-primary-400 outline-none transition-all text-sm placeholder:text-gray-300"
                placeholder={t.namePlaceholder}
              />
            </div>

            {/* Instagram URL */}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-[0.2em] mb-1.5 text-gray-500">
                {t.labelInstagram}
              </label>
              <input
                type="url"
                required
                value={form.instagram_url}
                onChange={e => setForm(f => ({ ...f, instagram_url: e.target.value }))}
                className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500/40 focus:border-primary-400 outline-none transition-all text-sm placeholder:text-gray-300"
                placeholder="https://www.instagram.com/deinprofil/"
              />
            </div>

            {/* Brand + Follower range */}
            <div className="flex flex-col gap-3 md:grid md:grid-cols-2">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-[0.2em] mb-1.5 text-gray-500">
                  {t.labelBrand}
                </label>
                <select
                  required
                  value={form.brand}
                  onChange={e => setForm(f => ({ ...f, brand: e.target.value }))}
                  className="w-full px-3 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500/40 focus:border-primary-400 outline-none transition-all text-sm text-gray-700"
                >
                  {BRANDS.map(b => <option key={b}>{b}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-[0.2em] mb-1.5 text-gray-500">
                  {t.labelFollowerRange}
                </label>
                <select
                  value={form.follower_range}
                  onChange={e => setForm(f => ({ ...f, follower_range: e.target.value }))}
                  className="w-full px-3 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500/40 focus:border-primary-400 outline-none transition-all text-sm text-gray-700"
                >
                  {FOLLOWER_RANGES.map(r => <option key={r}>{r}</option>)}
                </select>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-[0.2em] mb-1.5 text-gray-500">
                {t.labelNotes}
              </label>
              <textarea
                value={form.notes}
                maxLength={300}
                rows={4}
                onChange={e => { setForm(f => ({ ...f, notes: e.target.value })); setCharCount(e.target.value.length); }}
                className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500/40 focus:border-primary-400 outline-none transition-all text-sm placeholder:text-gray-300 resize-none"
                placeholder={t.notesPlaceholder}
              />
              <p className="text-right text-[10px] text-gray-300 mt-1">{charCount}/300</p>
            </div>

            {/* Email */}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-[0.2em] mb-1.5 text-gray-500">
                {t.labelEmail}
              </label>
              <input
                type="email"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500/40 focus:border-primary-400 outline-none transition-all text-sm placeholder:text-gray-300"
                placeholder={t.emailPlaceholder}
              />
            </div>

            {error && (
              <div className="p-3.5 bg-red-500/8 border border-red-200 text-red-500 text-[10px] font-black uppercase tracking-widest rounded-xl">
                {error}
              </div>
            )}

            <div className="pt-1">
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full py-4 bg-gray-900 hover:bg-primary-600 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-lg hover:shadow-primary-500/30 transition-all duration-300 hover:scale-[1.01] active:scale-[0.99] flex justify-center items-center gap-2 disabled:opacity-50 overflow-hidden"
              >
                <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                {loading ? t.submitting : t.submitButton}
              </button>
            </div>
          </form>
        </div>

        <p className="text-center text-[9px] text-gray-500 mt-4 font-bold uppercase tracking-widest">
          Hartlimes GmbH · Ambassador Program
        </p>
      </div>
    </div>
  );
};

export default CreatorApplicationPage;
