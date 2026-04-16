import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

interface Tool {
  id: string;
  name: string;
  category: string;
  billing_cycle: string;
  monthly_cost: number | null;
  currency: string;
  status: string;
  renewal_date: string | null;
  owner: string | null;
  url: string | null;
  notes: string | null;
}

const CATEGORIES = ['All', 'Marketing', 'Finance', 'Operations', 'Development', 'Customer Support', 'Analytics', 'E-Commerce'];
const STATUS_STYLES: Record<string, string> = {
  active: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  review: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/20',
  cancelling: 'bg-orange-500/15 text-orange-400 border-orange-500/20',
  cancelled: 'bg-slate-500/15 text-[#515154] border-slate-500/20',
  free: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
};

interface Props {
  isAdmin: boolean;
}

const ToolStackView: React.FC<Props> = ({ isAdmin }) => {
  const [tools, setTools] = useState<Tool[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [editing, setEditing] = useState<Tool | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState<Partial<Tool>>({});

  const fetchTools = async () => {
    const { data } = await supabase.from('tool_stack').select('*').order('category').order('name');
    if (data) setTools(data);
    setLoading(false);
  };

  useEffect(() => { fetchTools(); }, []);

  const filtered = tools.filter(t => {
    if (filter !== 'All' && t.category !== filter) return false;
    if (statusFilter !== 'All' && t.status !== statusFilter) return false;
    return true;
  });

  const totalMonthly = filtered
    .filter(t => t.status !== 'cancelled' && t.monthly_cost !== null)
    .reduce((sum, t) => sum + (t.monthly_cost ?? 0), 0);

  const missingCost = filtered.filter(t => t.monthly_cost === null && t.billing_cycle !== 'free' && t.status !== 'cancelled').length;

  const handleSave = async () => {
    if (editing) {
      await supabase.from('tool_stack').update(form).eq('id', editing.id);
    } else {
      await supabase.from('tool_stack').insert({ ...form, currency: form.currency ?? 'EUR', status: form.status ?? 'active', billing_cycle: form.billing_cycle ?? 'monthly' });
    }
    setEditing(null);
    setShowAdd(false);
    setForm({});
    fetchTools();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tool entfernen?')) return;
    await supabase.from('tool_stack').delete().eq('id', id);
    fetchTools();
  };

  const openEdit = (tool: Tool) => { setEditing(tool); setForm(tool); setShowAdd(true); };
  const openAdd = () => { setEditing(null); setForm({}); setShowAdd(true); };

  if (loading) return <div className="text-sm text-[#6e6e73] py-8 text-center">Laden…</div>;

  return (
    <div className="space-y-6 animate-[fadeIn_0.3s_ease-out]">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-black text-[#1d1d1f] tracking-tight">Tool Stack</h2>
          <p className="text-sm text-[#6e6e73] mt-0.5">Alle Tools, Kosten & Einsparpotenziale</p>
        </div>
        {isAdmin && (
          <button onClick={openAdd} className="px-4 py-2 bg-indigo-600 text-white text-xs font-black rounded-lg hover:bg-indigo-700 transition-colors">
            + Tool hinzufügen
          </button>
        )}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="px-4 py-3 rounded-xl bg-white/50 border border-black/[0.06]">
          <div className="text-[9px] font-black uppercase tracking-[0.25em] text-[#6e6e73]">Monatliche Kosten</div>
          <div className="text-xl font-black text-[#1d1d1f] mt-1">
            {totalMonthly > 0 ? `${totalMonthly.toFixed(0)} €` : '—'}
          </div>
          {missingCost > 0 && (
            <div className="text-[9px] text-yellow-400 mt-0.5">+ {missingCost} ohne Preis</div>
          )}
        </div>
        <div className="px-4 py-3 rounded-xl bg-white/50 border border-black/[0.06]">
          <div className="text-[9px] font-black uppercase tracking-[0.25em] text-[#6e6e73]">Aktive Tools</div>
          <div className="text-xl font-black text-[#1d1d1f] mt-1">
            {tools.filter(t => t.status === 'active').length}
          </div>
        </div>
        <div className="px-4 py-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
          <div className="text-[9px] font-black uppercase tracking-[0.25em] text-yellow-400">Zu prüfen</div>
          <div className="text-xl font-black text-yellow-400 mt-1">
            {tools.filter(t => t.status === 'review').length}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all ${
              filter === cat ? 'bg-white/20 text-[#1d1d1f]' : 'bg-black/[0.03] text-[#6e6e73] hover:bg-white/[0.08]'
            }`}
          >
            {cat}
          </button>
        ))}
        <div className="w-px bg-black/[0.04] mx-1" />
        {['All', 'active', 'review', 'cancelling', 'cancelled'].map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all ${
              statusFilter === s ? 'bg-white/20 text-[#1d1d1f]' : 'bg-black/[0.03] text-[#6e6e73] hover:bg-white/[0.08]'
            }`}
          >
            {s === 'All' ? 'Alle Status' : s}
          </button>
        ))}
      </div>

      {/* Tool Table */}
      <div className="rounded-xl border border-black/[0.06] overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-white/50 border-b border-black/[0.06]">
              <th className="text-left px-4 py-3 text-[9px] font-black uppercase tracking-[0.25em] text-[#6e6e73]">Tool</th>
              <th className="text-left px-4 py-3 text-[9px] font-black uppercase tracking-[0.25em] text-[#6e6e73]">Kategorie</th>
              <th className="text-left px-4 py-3 text-[9px] font-black uppercase tracking-[0.25em] text-[#6e6e73]">Status</th>
              <th className="text-right px-4 py-3 text-[9px] font-black uppercase tracking-[0.25em] text-[#6e6e73]">€/Monat</th>
              <th className="text-left px-4 py-3 text-[9px] font-black uppercase tracking-[0.25em] text-[#6e6e73]">Owner</th>
              <th className="text-left px-4 py-3 text-[9px] font-black uppercase tracking-[0.25em] text-[#6e6e73]">Notiz</th>
              {isAdmin && <th className="px-4 py-3" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-black/[0.04]">
            {filtered.map(tool => (
              <tr key={tool.id} className={`hover:bg-black/[0.03] transition-colors ${tool.status === 'cancelled' ? 'opacity-40' : ''}`}>
                <td className="px-4 py-3">
                  <div className="font-semibold text-[#1d1d1f]">
                    {tool.url ? (
                      <a href={tool.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                        {tool.name}
                      </a>
                    ) : tool.name}
                  </div>
                </td>
                <td className="px-4 py-3 text-xs text-[#6e6e73]">{tool.category}</td>
                <td className="px-4 py-3">
                  <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${STATUS_STYLES[tool.billing_cycle === 'free' ? 'free' : tool.status] ?? STATUS_STYLES.active}`}>
                    {tool.billing_cycle === 'free' ? 'Kostenlos' : tool.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-right font-mono text-xs text-[#1d1d1f]">
                  {tool.billing_cycle === 'free' ? <span className="text-[#6e6e73]">—</span>
                    : tool.monthly_cost !== null ? `${tool.monthly_cost.toFixed(0)} €`
                    : <span className="text-yellow-400 font-black">?</span>}
                </td>
                <td className="px-4 py-3 text-xs text-[#6e6e73]">{tool.owner ?? '—'}</td>
                <td className="px-4 py-3 text-xs text-[#6e6e73] max-w-[200px] truncate">{tool.notes ?? ''}</td>
                {isAdmin && (
                  <td className="px-4 py-3">
                    <div className="flex gap-1 justify-end">
                      <button onClick={() => openEdit(tool)} className="px-2 py-1 text-[10px] text-[#6e6e73] hover:text-[#1d1d1f] hover:bg-white/[0.08] rounded transition-colors">Edit</button>
                      <button onClick={() => handleDelete(tool.id)} className="px-2 py-1 text-[10px] text-red-400 hover:text-red-300 hover:bg-red-500/15 rounded transition-colors">Del</button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        </div>
        {filtered.length === 0 && (
          <div className="text-center py-8 text-sm text-[#6e6e73]">Keine Tools in dieser Kategorie.</div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowAdd(false)}>
          <div className="bg-white/80 border border-black/[0.08] rounded-2xl p-6 w-full max-w-md space-y-4 shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="font-black text-[#1d1d1f]">{editing ? 'Tool bearbeiten' : 'Tool hinzufügen'}</h3>
            {([
              { key: 'name', label: 'Name', type: 'text' },
              { key: 'category', label: 'Kategorie', type: 'text' },
              { key: 'monthly_cost', label: '€/Monat', type: 'number' },
              { key: 'owner', label: 'Owner', type: 'text' },
              { key: 'url', label: 'URL', type: 'text' },
              { key: 'notes', label: 'Notiz', type: 'text' },
            ] as const).map(field => (
              <div key={field.key}>
                <label className="text-[10px] font-black uppercase tracking-wider text-[#6e6e73] block mb-1">{field.label}</label>
                <input
                  type={field.type}
                  value={(form as Record<string, unknown>)[field.key] as string ?? ''}
                  onChange={e => setForm(f => ({ ...f, [field.key]: field.type === 'number' ? parseFloat(e.target.value) || null : e.target.value }))}
                  className="w-full border border-white/[0.10] rounded-lg px-3 py-2 bg-black/[0.03] text-[#1d1d1f] text-sm focus:outline-none focus:border-white/20"
                />
              </div>
            ))}
            <div>
              <label className="text-[10px] font-black uppercase tracking-wider text-[#6e6e73] block mb-1">Status</label>
              <select
                value={form.status ?? 'active'}
                onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                className="w-full border border-white/[0.10] rounded-lg px-3 py-2 bg-black/[0.03] text-[#1d1d1f] text-sm focus:outline-none focus:border-white/20"
              >
                {['active', 'review', 'cancelling', 'cancelled'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-wider text-[#6e6e73] block mb-1">Billing</label>
              <select
                value={form.billing_cycle ?? 'monthly'}
                onChange={e => setForm(f => ({ ...f, billing_cycle: e.target.value }))}
                className="w-full border border-white/[0.10] rounded-lg px-3 py-2 bg-black/[0.03] text-[#1d1d1f] text-sm focus:outline-none focus:border-white/20"
              >
                {['monthly', 'annual', 'one-time', 'free'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={handleSave} className="flex-1 py-2.5 bg-indigo-600 text-white text-sm font-black rounded-lg hover:bg-indigo-700 transition-colors">Speichern</button>
              <button onClick={() => { setShowAdd(false); setEditing(null); setForm({}); }} className="px-4 py-2.5 border border-black/[0.06] text-sm text-[#515154] rounded-lg hover:bg-black/[0.03] transition-colors">Abbrechen</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ToolStackView;
