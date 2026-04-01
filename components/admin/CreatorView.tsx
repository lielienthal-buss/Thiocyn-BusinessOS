import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

interface Creator {
  id: string;
  name: string;
  instagram_url: string;
  email: string | null;
  brand: string;
  status: string;
  follower_range: string | null;
  notes: string | null;
  created_at: string;
}

const BRANDS = ['All', 'Paigh', 'Take A Shot', 'Wristr', 'Thiocyn', 'Dr. Severin', 'Timber & John'];
const STATUSES = ['Prospect', 'Contacted', 'Interested', 'Product sent', 'Content posted', 'Active'];

const STATUS_COLORS: Record<string, string> = {
  Prospect: 'bg-slate-500/15 text-slate-400',
  Contacted: 'bg-blue-500/15 text-blue-400',
  Interested: 'bg-yellow-500/15 text-yellow-400',
  'Product sent': 'bg-orange-500/15 text-orange-400',
  'Content posted': 'bg-emerald-500/15 text-emerald-400',
  Active: 'bg-violet-500/15 text-violet-400',
};

const NEXT_STATUS: Record<string, string> = {
  Prospect: 'Contacted',
  Contacted: 'Interested',
  Interested: 'Product sent',
  'Product sent': 'Content posted',
  'Content posted': 'Active',
  Active: 'Active',
};

const emptyForm = { name: '', instagram_url: '', email: '', brand: 'Paigh', status: 'Prospect', follower_range: '', notes: '' };

const CreatorView: React.FC = () => {
  const [creators, setCreators] = useState<Creator[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [brandFilter, setBrandFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchCreators = async () => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from('creators')
      .select('*')
      .order('created_at', { ascending: false });
    if (err) setError(err.message);
    else setCreators(data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchCreators(); }, []);

  const filtered = creators.filter(c => {
    const brandMatch = brandFilter === 'All' || c.brand === brandFilter;
    const statusMatch = statusFilter === 'All' || c.status === statusFilter;
    return brandMatch && statusMatch;
  });

  const handleAddCreator = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { setFormError('Name ist erforderlich.'); return; }
    setSaving(true);
    setFormError(null);
    const { error: err } = await supabase.from('creators').insert([{
      name: form.name.trim(),
      instagram_url: form.instagram_url.trim() || null,
      email: form.email.trim() || null,
      brand: form.brand,
      status: form.status,
      follower_range: form.follower_range || null,
      notes: form.notes.trim() || null,
    }]);
    setSaving(false);
    if (err) { setFormError(err.message); return; }
    setShowModal(false);
    setForm(emptyForm);
    fetchCreators();
  };

  const handleAdvanceStatus = async (creator: Creator) => {
    const next = NEXT_STATUS[creator.status];
    if (next === creator.status) return;
    await supabase.from('creators').update({ status: next }).eq('id', creator.id);
    fetchCreators();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-black text-white tracking-tight">Creator Pipeline</h1>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary-500/15 text-primary-400">
            {filtered.length}
          </span>
        </div>
        <button
          onClick={() => { setShowModal(true); setFormError(null); setForm(emptyForm); }}
          className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold text-sm transition-colors shadow-sm"
        >
          + Add Creator
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Brand</label>
          <select
            value={brandFilter}
            onChange={e => setBrandFilter(e.target.value)}
            className="text-sm border border-white/[0.06] bg-surface-800/60 text-slate-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 outline-none"
          >
            {BRANDS.map(b => <option key={b}>{b}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Status</label>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="text-sm border border-white/[0.06] bg-surface-800/60 text-slate-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 outline-none"
          >
            <option>All</option>
            {STATUSES.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-20 text-slate-500 text-sm">Lade Creator...</div>
      ) : error ? (
        <div className="p-4 bg-red-500/15 border border-red-500/20 text-red-400 rounded-xl text-sm">{error}</div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-500">
          <span className="text-4xl mb-3">🤳</span>
          <p className="text-sm font-medium">Keine Creator gefunden.</p>
        </div>
      ) : (
        <div className="bg-surface-800/60 rounded-xl border border-white/[0.06] overflow-hidden backdrop-blur-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-900/60 border-b border-white/[0.06]">
                <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-slate-500">Name</th>
                <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-slate-500">Instagram</th>
                <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-slate-500">Brand</th>
                <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-slate-500">Status</th>
                <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-slate-500">Added</th>
                <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-slate-500">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {filtered.map(c => (
                <tr key={c.id} className="hover:bg-white/[0.03] transition-colors">
                  <td className="px-4 py-3 font-semibold text-white">{c.name}</td>
                  <td className="px-4 py-3">
                    {c.instagram_url ? (
                      <a
                        href={c.instagram_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary-600 hover:text-primary-800 hover:underline truncate max-w-[160px] block"
                      >
                        {c.instagram_url.replace('https://www.instagram.com/', '@').replace(/\/$/, '')}
                      </a>
                    ) : (
                      <span className="text-slate-600">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-400">{c.brand}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${STATUS_COLORS[c.status] ?? 'bg-gray-100 text-gray-600'}`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs">
                    {new Date(c.created_at).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                  </td>
                  <td className="px-4 py-3">
                    {c.status !== 'Active' && (
                      <button
                        onClick={() => handleAdvanceStatus(c)}
                        className="text-xs text-primary-600 hover:text-primary-800 font-bold transition-colors"
                      >
                        → {NEXT_STATUS[c.status]}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Creator Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-surface-800/60 border border-white/[0.06] rounded-2xl shadow-2xl w-full max-w-md p-8 relative backdrop-blur-sm">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-slate-500 hover:text-slate-300 text-xl font-black"
            >
              ×
            </button>
            <h2 className="text-xl font-black text-white mb-6">Add Creator</h2>
            <form onSubmit={handleAddCreator} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Name *</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-white/[0.06] bg-surface-900/60 text-slate-100 rounded-xl text-sm focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 outline-none"
                  placeholder="Max Mustermann"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Instagram URL</label>
                <input
                  type="url"
                  value={form.instagram_url}
                  onChange={e => setForm(f => ({ ...f, instagram_url: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-white/[0.06] bg-surface-900/60 text-slate-100 rounded-xl text-sm focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 outline-none"
                  placeholder="https://www.instagram.com/profil/"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Brand</label>
                  <select
                    value={form.brand}
                    onChange={e => setForm(f => ({ ...f, brand: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-white/[0.06] bg-surface-900/60 text-slate-100 rounded-xl text-sm focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 outline-none"
                  >
                    {BRANDS.filter(b => b !== 'All').map(b => <option key={b}>{b}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Status</label>
                  <select
                    value={form.status}
                    onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-white/[0.06] bg-surface-900/60 text-slate-100 rounded-xl text-sm focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 outline-none"
                  >
                    {STATUSES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Email (optional)</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-white/[0.06] bg-surface-900/60 text-slate-100 rounded-xl text-sm focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 outline-none"
                  placeholder="creator@mail.com"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Notes (optional)</label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  rows={3}
                  className="w-full px-4 py-2.5 border border-white/[0.06] bg-surface-900/60 text-slate-100 rounded-xl text-sm focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 outline-none resize-none"
                  placeholder="Infos zum Creator..."
                />
              </div>
              {formError && (
                <p className="text-xs text-red-500 font-bold">{formError}</p>
              )}
              <button
                type="submit"
                disabled={saving}
                className="w-full py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-black text-sm uppercase tracking-widest transition-colors disabled:opacity-50"
              >
                {saving ? 'Speichern...' : 'Creator hinzufügen'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreatorView;
