import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

// ─── Types ──────────────────────────────────────────────────────────────────

interface Resource {
  id: string;
  section: string;
  label: string;
  description: string;
  url: string;
  icon: string;
  badge: string;
  sort_order: number;
}

interface Props {
  section: 'support' | 'marketing';
  isAdmin: boolean;
  emptyMessage?: string;
}


// ─── Helpers ─────────────────────────────────────────────────────────────────

const BADGE_COLORS: Record<string, string> = {
  'AI Tool':    'bg-violet-500/15 text-violet-400 border-violet-500/20',
  'Drive':      'bg-blue-500/15 text-blue-400 border-blue-500/20',
  'Google Doc': 'bg-blue-500/15 text-blue-400 border-blue-500/20',
  'Google Sheet': 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  'Notion':     'bg-slate-500/15 text-slate-400 border-slate-500/20',
  'Viking Sheet': 'bg-orange-500/15 text-orange-400 border-orange-500/20',
};

// ─── Edit Modal ───────────────────────────────────────────────────────────────

interface EditModalProps {
  resource: Resource | null; // null = new
  section: 'support' | 'marketing';
  onClose: () => void;
  onSaved: () => void;
}

const EditModal: React.FC<EditModalProps> = ({ resource, section, onClose, onSaved }) => {
  const isNew = !resource;
  const [form, setForm] = useState({
    label: resource?.label ?? '',
    description: resource?.description ?? '',
    url: resource?.url ?? '',
    icon: resource?.icon ?? '🔗',
    badge: resource?.badge ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (k: keyof typeof form, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.label.trim()) { setError('Label darf nicht leer sein.'); return; }
    setSaving(true);
    setError(null);
    if (isNew) {
      const { error } = await supabase.from('dashboard_resources').insert({
        section: section,
        label: form.label,
        description: form.description,
        url: form.url,
        icon: form.icon,
        badge: form.badge,
        sort_order: 99,
      });
      if (error) { setError(error.message); setSaving(false); return; }
    } else {
      const { error } = await supabase.from('dashboard_resources')
        .update({ label: form.label, description: form.description, url: form.url, icon: form.icon, badge: form.badge })
        .eq('id', resource.id);
      if (error) { setError(error.message); setSaving(false); return; }
    }
    setSaving(false);
    onSaved();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-surface-800 border border-white/[0.08] rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-black text-white">{isNew ? 'Ressource hinzufügen' : 'Ressource bearbeiten'}</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-100 text-xl font-bold">×</button>
        </div>

        {/* Icon + Label row */}
        <div className="flex gap-3">
          <div className="w-16">
            <label className="text-xs font-bold text-slate-500 block mb-1">Icon</label>
            <input value={form.icon} onChange={e => set('icon', e.target.value)}
              className="w-full bg-white/[0.04] border border-white/[0.10] text-slate-100 rounded-lg px-2 py-2 text-center text-lg focus:outline-none focus:border-primary-400" />
          </div>
          <div className="flex-1">
            <label className="text-xs font-bold text-slate-500 block mb-1">Label *</label>
            <input value={form.label} onChange={e => set('label', e.target.value)} placeholder="z.B. Support SOP"
              className="w-full bg-white/[0.04] border border-white/[0.10] text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-400 placeholder-slate-600" />
          </div>
        </div>

        <div>
          <label className="text-xs font-bold text-slate-500 block mb-1">Beschreibung</label>
          <input value={form.description} onChange={e => set('description', e.target.value)} placeholder="Kurze Beschreibung..."
            className="w-full bg-white/[0.04] border border-white/[0.10] text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-400 placeholder-slate-600" />
        </div>

        <div>
          <label className="text-xs font-bold text-slate-500 block mb-1">URL (Drive, Sheet, etc.)</label>
          <input value={form.url} onChange={e => set('url', e.target.value)} placeholder="https://drive.google.com/..."
            className="w-full bg-white/[0.04] border border-white/[0.10] text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-400 placeholder-slate-600 font-mono" />
        </div>

        <div>
          <label className="text-xs font-bold text-slate-500 block mb-1">Badge (optional)</label>
          <input value={form.badge} onChange={e => set('badge', e.target.value)} placeholder="z.B. Drive · Google Sheet · AI Tool"
            className="w-full bg-white/[0.04] border border-white/[0.10] text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-400 placeholder-slate-600" />
        </div>

        {error && <p className="text-red-600 text-xs font-semibold">{error}</p>}

        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="flex-1 px-4 py-2 border border-white/[0.10] rounded-lg text-sm font-semibold text-slate-400 hover:bg-white/[0.06]">
            Abbrechen
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-bold hover:bg-primary-700 disabled:opacity-50">
            {saving ? 'Speichern...' : 'Speichern'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

const ResourceCardList: React.FC<Props> = ({ section, isAdmin, emptyMessage }) => {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [editTarget, setEditTarget] = useState<Resource | 'new' | null>(null);

  const fetchResources = async () => {
    const { data } = await supabase
      .from('dashboard_resources')
      .select('*')
      .eq('section', section)
      .order('sort_order', { ascending: true });
    setResources(data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchResources(); }, [section]);

  const handleDelete = async (id: string) => {
    if (!confirm('Ressource löschen?')) return;
    await supabase.from('dashboard_resources').delete().eq('id', id);
    fetchResources();
  };

  if (loading) {
    return <div className="text-sm text-slate-500 py-8 text-center">Laden...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Admin: Add button */}
      {isAdmin && (
        <div className="flex justify-end">
          <button
            onClick={() => setEditTarget('new')}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-primary-400 bg-primary-500/10 border border-primary-500/20 rounded-lg hover:bg-primary-500/15 transition-colors"
          >
            + Ressource hinzufügen
          </button>
        </div>
      )}

      {/* Cards */}
      {resources.length === 0 ? (
        <div className="text-sm text-slate-500 py-12 text-center border border-dashed border-white/[0.08] rounded-2xl">
          {emptyMessage ?? 'Noch keine Ressourcen. Als Admin hinzufügen.'}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {resources.map(r => (
            <div key={r.id} className="group relative flex flex-col gap-3 p-5 bg-surface-800/60 border border-white/[0.06] rounded-2xl hover:border-primary-500/30 hover:shadow-md hover:shadow-primary-500/10 transition-all duration-200 backdrop-blur-sm">
              {/* Admin controls */}
              {isAdmin && (
                <div className="absolute top-3 right-3 hidden group-hover:flex items-center gap-1">
                  <button
                    onClick={() => setEditTarget(r)}
                    className="p-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.10] text-slate-400 text-xs transition-colors"
                    title="Bearbeiten"
                  >✏️</button>
                  <button
                    onClick={() => handleDelete(r.id)}
                    className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs transition-colors"
                    title="Löschen"
                  >🗑️</button>
                </div>
              )}

              {/* Icon + badge */}
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 rounded-xl bg-white/[0.05] border border-white/[0.06] flex items-center justify-center text-xl">
                  {r.icon}
                </div>
                {r.badge && (
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${BADGE_COLORS[r.badge] ?? 'bg-slate-500/15 text-slate-400 border-slate-500/20'}`}>
                    {r.badge}
                  </span>
                )}
              </div>

              {/* Label + description */}
              <div>
                <p className="text-sm font-bold text-white">{r.label}</p>
                {r.description && (
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{r.description}</p>
                )}
              </div>

              {/* Link or placeholder */}
              {r.url ? (
                <a
                  href={r.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-[11px] font-semibold text-primary-600 hover:text-primary-800 transition-colors mt-auto"
                >
                  Öffnen →
                </a>
              ) : (
                <span className="text-[11px] font-semibold text-slate-600 mt-auto">
                  {isAdmin ? 'Noch kein Link — bearbeiten' : 'Link wird hinzugefügt'}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Edit / New Modal */}
      {editTarget !== null && (
        <EditModal
          resource={editTarget === 'new' ? null : editTarget}
          section={section}
          onClose={() => setEditTarget(null)}
          onSaved={fetchResources}
        />
      )}
    </div>
  );
};

export default ResourceCardList;
