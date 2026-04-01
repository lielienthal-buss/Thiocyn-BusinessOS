import React, { useState, useEffect, useRef } from 'react';
import {
  getHiringTasks,
  createHiringTask,
  updateHiringTask,
  activateHiringTask,
  deleteHiringTask,
  type HiringTask,
} from '@/lib/actions';
import Spinner from '@/components/ui/Spinner';
import { toast } from 'sonner';

const EMPTY_FORM = { title: '', description: '', instructions: '' };

const TaskManager: React.FC = () => {
  const [tasks, setTasks] = useState<HiringTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<HiringTask | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [preview, setPreview] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    setLoading(true);
    setTasks(await getHiringTasks());
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const startEdit = (task: HiringTask) => {
    setEditing(task);
    setForm({ title: task.title, description: task.description ?? '', instructions: task.instructions });
    setPreview(false);
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  };

  const startNew = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setPreview(false);
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.instructions.trim()) {
      toast.error('Titel und Aufgabenstellung sind erforderlich.');
      return;
    }
    setSaving(true);
    let ok = false;
    if (editing) {
      ok = await updateHiringTask(editing.id, form.title, form.description, form.instructions);
    } else {
      const created = await createHiringTask(form.title, form.description, form.instructions);
      ok = !!created;
    }
    if (ok) {
      toast.success(editing ? 'Task aktualisiert.' : 'Task erstellt.');
      setEditing(null);
      setForm(EMPTY_FORM);
      await load();
    } else {
      toast.error('Fehler beim Speichern.');
    }
    setSaving(false);
  };

  const handleActivate = async (task: HiringTask) => {
    const ok = await activateHiringTask(task.id);
    if (ok) { toast.success(`„${task.title}" ist jetzt aktiv.`); await load(); }
    else toast.error('Fehler beim Aktivieren.');
  };

  const handleDelete = async (task: HiringTask) => {
    if (task.is_active) { toast.error('Aktive Task kann nicht gelöscht werden.'); return; }
    if (!window.confirm(`„${task.title}" wirklich löschen?`)) return;
    const ok = await deleteHiringTask(task.id);
    if (ok) { toast.success('Task gelöscht.'); await load(); }
    else toast.error('Fehler beim Löschen.');
  };

  const isEditing = editing !== null || form.title !== '' || form.instructions !== '';

  return (
    <div className="space-y-8 animate-[fadeIn_0.5s_ease-out]">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black text-white tracking-tighter">Aufgaben verwalten</h2>
          <p className="text-slate-500 text-sm mt-1">Die aktive Aufgabe wird Bewerbern auf der Task-Seite angezeigt.</p>
        </div>
        <button onClick={startNew}
          className="px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-primary-500/20">
          + Neue Aufgabe
        </button>
      </div>

      {/* Task list */}
      {loading ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : (
        <div className="space-y-3">
          {tasks.length === 0 && (
            <div className="text-center py-16 text-slate-500 text-sm">Noch keine Aufgaben. Erstelle eine.</div>
          )}
          {tasks.map(task => (
            <div key={task.id} className={`glass-card rounded-2xl p-6 flex items-start gap-4 transition-all ${task.is_active ? 'ring-1 ring-emerald-500/40' : ''}`}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1 flex-wrap">
                  <span className="text-white font-bold">{task.title}</span>
                  {task.is_active && (
                    <span className="px-2.5 py-0.5 bg-emerald-500/15 text-emerald-400 text-[10px] font-black uppercase tracking-widest rounded-full border border-emerald-500/20">
                      Aktiv
                    </span>
                  )}
                </div>
                {task.description && (
                  <p className="text-slate-500 text-xs mt-0.5">{task.description}</p>
                )}
                <p className="text-slate-600 text-[10px] mt-2 uppercase tracking-widest">
                  Erstellt {new Date(task.created_at).toLocaleDateString('de-DE')}
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                {!task.is_active && (
                  <button onClick={() => handleActivate(task)}
                    className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-bold rounded-lg border border-emerald-500/20 transition-all">
                    Aktivieren
                  </button>
                )}
                <button onClick={() => startEdit(task)}
                  className="px-3 py-1.5 bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 text-xs font-bold rounded-lg border border-white/[0.08] transition-all">
                  Bearbeiten
                </button>
                {!task.is_active && (
                  <button onClick={() => handleDelete(task)}
                    className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-bold rounded-lg border border-red-500/20 transition-all">
                    Löschen
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Editor */}
      <div ref={formRef} className={`glass-card rounded-[2.5rem] p-8 transition-all ${!isEditing ? 'opacity-40 pointer-events-none' : ''}`}>
        <h3 className="text-xl font-black text-white tracking-tighter mb-6">
          {editing ? `Bearbeiten: ${editing.title}` : 'Neue Aufgabe'}
        </h3>
        <form onSubmit={handleSave} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 ml-1">Titel *</label>
              <input type="text" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="z.B. Customer Conflict Case Study"
                className="w-full px-4 py-3 bg-white/[0.04] border border-white/[0.10] text-slate-100 placeholder-slate-600 rounded-xl text-sm focus:ring-2 focus:ring-primary-500/50 outline-none transition-all" />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 ml-1">Kurzbeschreibung</label>
              <input type="text" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Interne Notiz (wird Bewerbern nicht gezeigt)"
                className="w-full px-4 py-3 bg-white/[0.04] border border-white/[0.10] text-slate-100 placeholder-slate-600 rounded-xl text-sm focus:ring-2 focus:ring-primary-500/50 outline-none transition-all" />
            </div>
          </div>

          {/* Instructions editor with preview toggle */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Aufgabenstellung (HTML) *</label>
              <div className="flex gap-1 bg-white/[0.04] border border-white/[0.08] rounded-lg p-0.5">
                {(['editor', 'preview'] as const).map(m => (
                  <button key={m} type="button" onClick={() => setPreview(m === 'preview')}
                    className={`px-3 py-1 rounded text-[10px] font-black uppercase tracking-widest transition-all ${
                      (m === 'preview') === preview ? 'bg-primary-600 text-white' : 'text-slate-500 hover:text-slate-300'
                    }`}>
                    {m === 'editor' ? 'HTML Editor' : 'Vorschau'}
                  </button>
                ))}
              </div>
            </div>
            {preview ? (
              <div className="rounded-xl border border-white/[0.10] overflow-hidden">
                <div className="px-3 py-1.5 bg-white/[0.03] border-b border-white/[0.08]">
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-600">Vorschau — so sehen Bewerber die Aufgabe</span>
                </div>
                <div className="bg-white p-8 min-h-[200px] text-slate-900 text-sm leading-relaxed prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: form.instructions }} />
              </div>
            ) : (
              <textarea value={form.instructions} onChange={e => setForm(f => ({ ...f, instructions: e.target.value }))}
                rows={12} placeholder="<p>Deine Aufgabenstellung in HTML...</p>"
                spellCheck={false}
                className="w-full px-4 py-3 bg-white/[0.04] border border-white/[0.10] text-slate-100 placeholder-slate-600 rounded-xl text-xs font-mono leading-relaxed focus:ring-2 focus:ring-primary-500/50 outline-none resize-y transition-all" />
            )}
          </div>

          <div className="flex justify-between items-center pt-2">
            <button type="button" onClick={() => { setEditing(null); setForm(EMPTY_FORM); }}
              className="px-5 py-2.5 bg-white/[0.04] hover:bg-white/[0.08] text-slate-400 text-xs font-bold rounded-xl border border-white/[0.08] transition-all">
              Abbrechen
            </button>
            <button type="submit" disabled={saving}
              className="px-8 py-3 bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white rounded-xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-primary-500/25 flex items-center gap-2 transition-all">
              {saving && <Spinner className="w-4 h-4" />}
              {editing ? 'Änderungen speichern' : 'Task erstellen'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TaskManager;
