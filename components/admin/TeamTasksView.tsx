import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';

// ─── Types ────────────────────────────────────────────────────────────────────

type TaskStatus = 'todo' | 'in_progress' | 'blocked' | 'done' | 'cancelled';
type TaskScope = 'private' | 'team';
type ViewMode = 'all' | 'my_desk' | 'board' | 'list';
type SortKey = 'title' | 'brand' | 'assigned_to_email' | 'priority' | 'due_date' | 'status' | 'created_at';

interface TeamTask {
  id: string;
  title: string;
  description: string | null;
  assigned_to_email: string | null;
  brand: string | null;
  priority: number;
  due_date: string | null;
  status: TaskStatus;
  scope: TaskScope;
  created_by_email: string | null;
  created_at: string;
  updated_at: string;
}

interface Props {
  userEmail?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const BRANDS = [
  'thiocyn', 'take-a-shot', 'dr-severin', 'paigh', 'wristr', 'timber-john', 'cross-brand',
] as const;

const STATUS_COLUMNS: { id: TaskStatus; label: string }[] = [
  { id: 'todo', label: 'To Do' },
  { id: 'in_progress', label: 'In Progress' },
  { id: 'blocked', label: 'Blocked' },
  { id: 'done', label: 'Done' },
];

const STATUS_COLORS: Record<TaskStatus, string> = {
  todo: 'bg-gray-100 text-gray-600',
  in_progress: 'bg-blue-100 text-blue-700',
  blocked: 'bg-red-100 text-red-700',
  done: 'bg-green-100 text-green-700',
  cancelled: 'bg-gray-100 text-gray-400 line-through',
};

const PRIORITY_DOT: Record<number, string> = {
  1: 'bg-gray-400', 2: 'bg-blue-500', 3: 'bg-amber-500', 4: 'bg-orange-500', 5: 'bg-red-600',
};

const PRIORITY_LABEL: Record<number, string> = {
  1: 'Low', 2: 'Normal', 3: 'Medium', 4: 'High', 5: 'Critical',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function shortEmail(email: string | null): string {
  if (!email) return '—';
  return email.split('@')[0];
}

function isOverdue(dateStr: string | null): boolean {
  if (!dateStr) return false;
  return new Date(dateStr) < new Date(new Date().toDateString());
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const PriorityDot: React.FC<{ priority: number }> = ({ priority }) => (
  <span
    className={`inline-block w-2 h-2 rounded-full shrink-0 ${PRIORITY_DOT[priority] ?? 'bg-gray-300'}`}
    title={PRIORITY_LABEL[priority] ?? String(priority)}
  />
);

const BrandBadge: React.FC<{ brand: string | null }> = ({ brand }) => {
  if (!brand) return null;
  return (
    <span className="px-1.5 py-0.5 bg-primary-50 text-primary-700 text-[10px] font-bold rounded-full border border-primary-100 uppercase tracking-wide">
      {brand}
    </span>
  );
};

const StatusBadge: React.FC<{ status: TaskStatus }> = ({ status }) => (
  <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-wide ${STATUS_COLORS[status]}`}>
    {status.replace('_', ' ')}
  </span>
);

const ScopeBadge: React.FC<{ scope: TaskScope }> = ({ scope }) =>
  scope === 'private' ? (
    <span className="px-1.5 py-0.5 bg-amber-50 text-amber-700 text-[10px] font-bold rounded-full border border-amber-200 uppercase tracking-wide">
      🔒 Private
    </span>
  ) : null;

// ─── Scope Selector ───────────────────────────────────────────────────────────

const ScopeSelector: React.FC<{
  value: TaskScope;
  onChange: (v: TaskScope) => void;
}> = ({ value, onChange }) => (
  <div>
    <label className="block text-xs font-bold text-gray-600 mb-1">Scope</label>
    <div className="flex gap-2">
      <button
        type="button"
        onClick={() => onChange('private')}
        className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-all flex items-center justify-center gap-1 ${
          value === 'private'
            ? 'border-amber-400 bg-amber-50 text-amber-700'
            : 'border-gray-200 text-gray-500 hover:border-gray-300'
        }`}
      >
        🔒 Only Me
        <span className="text-[9px] opacity-60 font-normal">(Finance, PayPal, Admin)</span>
      </button>
      <button
        type="button"
        onClick={() => onChange('team')}
        className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-all flex items-center justify-center gap-1 ${
          value === 'team'
            ? 'border-blue-400 bg-blue-50 text-blue-700'
            : 'border-gray-200 text-gray-500 hover:border-gray-300'
        }`}
      >
        👥 Team / Intern
        <span className="text-[9px] opacity-60 font-normal">(Marketing, Content, etc.)</span>
      </button>
    </div>
  </div>
);

// ─── Add Task Panel ───────────────────────────────────────────────────────────

interface AddTaskPanelProps {
  onClose: () => void;
  onSaved: () => void;
  userEmail?: string;
  defaultScope?: TaskScope;
}

const EMPTY_FORM = {
  title: '', description: '', assigned_to_email: '', brand: '',
  priority: 3, due_date: '', status: 'todo' as TaskStatus, scope: 'team' as TaskScope,
};

const AddTaskPanel: React.FC<AddTaskPanelProps> = ({ onClose, onSaved, userEmail, defaultScope }) => {
  const [form, setForm] = useState({ ...EMPTY_FORM, scope: defaultScope ?? 'team' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) { setError('Title is required.'); return; }
    setSaving(true);
    setError(null);
    const { error: err } = await supabase.from('team_tasks').insert({
      title: form.title.trim(),
      description: form.description.trim() || null,
      assigned_to_email: form.scope === 'private' ? (userEmail ?? null) : (form.assigned_to_email.trim() || null),
      brand: form.brand || null,
      priority: form.priority,
      due_date: form.due_date || null,
      status: form.status,
      scope: form.scope,
      created_by_email: userEmail ?? null,
    });
    setSaving(false);
    if (err) { setError(err.message); return; }
    onSaved();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-40 flex justify-end" onClick={onClose}>
      <div
        className={`w-full max-w-md bg-white h-full shadow-2xl border-l flex flex-col overflow-y-auto ${
          form.scope === 'private' ? 'border-amber-200' : 'border-blue-200'
        }`}
        onClick={e => e.stopPropagation()}
      >
        <div className={`flex items-center justify-between px-6 py-4 border-b ${
          form.scope === 'private' ? 'border-amber-100 bg-amber-50' : 'border-blue-100 bg-blue-50'
        }`}>
          <h2 className="text-base font-black text-gray-900">
            {form.scope === 'private' ? '🔒 New Private Task' : '👥 New Team Task'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl font-bold">×</button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col gap-4 px-6 py-4">
          {error && <p className="text-red-600 text-xs font-semibold bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

          <ScopeSelector value={form.scope} onChange={v => setForm(f => ({ ...f, scope: v }))} />

          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">Title <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
              placeholder="Task title..."
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              rows={3}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 resize-none"
              placeholder="Optional details..."
            />
          </div>

          {form.scope === 'team' && (
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">Assign to (email)</label>
              <input
                type="email"
                value={form.assigned_to_email}
                onChange={e => setForm(f => ({ ...f, assigned_to_email: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
                placeholder="intern@example.com"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">Brand</label>
              <select
                value={form.brand}
                onChange={e => setForm(f => ({ ...f, brand: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
              >
                <option value="">— None —</option>
                {BRANDS.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">Status</label>
              <select
                value={form.status}
                onChange={e => setForm(f => ({ ...f, status: e.target.value as TaskStatus }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
              >
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="blocked">Blocked</option>
                <option value="done">Done</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-600 mb-2">Priority</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map(p => (
                <button
                  key={p} type="button"
                  onClick={() => setForm(f => ({ ...f, priority: p }))}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                    form.priority === p
                      ? 'border-primary-400 bg-primary-50 text-primary-700'
                      : 'border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}
                  title={PRIORITY_LABEL[p]}
                >
                  <span className={`inline-block w-2 h-2 rounded-full mr-1 ${PRIORITY_DOT[p]}`} />
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">Due Date</label>
            <input
              type="date"
              value={form.due_date}
              onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
            />
          </div>

          <div className="pt-2 mt-auto">
            <button
              type="submit" disabled={saving}
              className={`w-full py-2.5 text-white text-sm font-bold rounded-lg transition-all disabled:opacity-60 ${
                form.scope === 'private'
                  ? 'bg-amber-500 hover:bg-amber-600'
                  : 'bg-primary-600 hover:bg-primary-700'
              }`}
            >
              {saving ? 'Saving…' : form.scope === 'private' ? '🔒 Add to My Desk' : '👥 Create Team Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Task Detail / Edit ───────────────────────────────────────────────────────

interface TaskDetailProps {
  task: TeamTask;
  onClose: () => void;
  onUpdated: () => void;
}

const TaskDetail: React.FC<TaskDetailProps> = ({ task, onClose, onUpdated }) => {
  const [form, setForm] = useState({
    title: task.title,
    description: task.description ?? '',
    assigned_to_email: task.assigned_to_email ?? '',
    brand: task.brand ?? '',
    priority: task.priority,
    due_date: task.due_date ?? '',
    status: task.status,
    scope: task.scope ?? 'team',
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!form.title.trim()) { setError('Title is required.'); return; }
    setSaving(true);
    setError(null);
    const { error: err } = await supabase.from('team_tasks').update({
      title: form.title.trim(),
      description: form.description.trim() || null,
      assigned_to_email: form.assigned_to_email.trim() || null,
      brand: form.brand || null,
      priority: form.priority,
      due_date: form.due_date || null,
      status: form.status,
      scope: form.scope,
      updated_at: new Date().toISOString(),
    }).eq('id', task.id);
    setSaving(false);
    if (err) { setError(err.message); return; }
    onUpdated();
    onClose();
  };

  const handleMarkDone = async () => {
    setSaving(true);
    await supabase.from('team_tasks').update({ status: 'done', updated_at: new Date().toISOString() }).eq('id', task.id);
    setSaving(false);
    onUpdated();
    onClose();
  };

  const handleDelete = async () => {
    setDeleting(true);
    await supabase.from('team_tasks').delete().eq('id', task.id);
    setDeleting(false);
    onUpdated();
    onClose();
  };

  return (
    <div className={`mt-2 mb-4 mx-2 border rounded-xl p-4 flex flex-col gap-3 ${
      form.scope === 'private' ? 'bg-amber-50 border-amber-200' : 'bg-gray-50 border-gray-200'
    }`}>
      {error && <p className="text-red-600 text-xs font-semibold bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

      <ScopeSelector value={form.scope as TaskScope} onChange={v => setForm(f => ({ ...f, scope: v }))} />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2">
          <label className="block text-xs font-bold text-gray-500 mb-1">Title</label>
          <input
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-bold text-gray-500 mb-1">Description</label>
          <textarea
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            rows={2}
            className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 resize-none"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 mb-1">Assigned to</label>
          <input
            type="email"
            value={form.assigned_to_email}
            onChange={e => setForm(f => ({ ...f, assigned_to_email: e.target.value }))}
            className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 mb-1">Brand</label>
          <select
            value={form.brand}
            onChange={e => setForm(f => ({ ...f, brand: e.target.value }))}
            className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
          >
            <option value="">— None —</option>
            {BRANDS.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 mb-1">Status</label>
          <select
            value={form.status}
            onChange={e => setForm(f => ({ ...f, status: e.target.value as TaskStatus }))}
            className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
          >
            <option value="todo">To Do</option>
            <option value="in_progress">In Progress</option>
            <option value="blocked">Blocked</option>
            <option value="done">Done</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 mb-1">Due Date</label>
          <input
            type="date"
            value={form.due_date}
            onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
            className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-bold text-gray-500 mb-1">Priority</label>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map(p => (
              <button
                key={p} type="button"
                onClick={() => setForm(f => ({ ...f, priority: p }))}
                className={`flex-1 py-1 rounded-lg text-xs font-bold border transition-all ${
                  form.priority === p
                    ? 'border-primary-400 bg-primary-50 text-primary-700'
                    : 'border-gray-200 text-gray-500 hover:border-gray-300'
                }`}
              >
                <span className={`inline-block w-2 h-2 rounded-full mr-0.5 ${PRIORITY_DOT[p]}`} />
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 pt-1 flex-wrap">
        <button
          onClick={handleSave} disabled={saving}
          className="px-4 py-1.5 bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold rounded-lg transition-all disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
        {task.status !== 'done' && (
          <button
            onClick={handleMarkDone} disabled={saving}
            className="px-4 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-lg transition-all"
          >
            Mark Done
          </button>
        )}
        {!confirmDelete ? (
          <button
            onClick={() => setConfirmDelete(true)}
            className="px-4 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold rounded-lg transition-all border border-red-200"
          >
            Delete
          </button>
        ) : (
          <div className="flex items-center gap-1">
            <span className="text-xs text-red-600 font-semibold">Confirm?</span>
            <button
              onClick={handleDelete} disabled={deleting}
              className="px-3 py-1 bg-red-600 text-white text-xs font-bold rounded-lg"
            >
              {deleting ? '…' : 'Yes'}
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="px-3 py-1 bg-gray-100 text-gray-600 text-xs font-bold rounded-lg"
            >
              Cancel
            </button>
          </div>
        )}
        <button onClick={onClose} className="ml-auto px-3 py-1.5 text-gray-400 hover:text-gray-700 text-xs font-semibold">
          Close
        </button>
      </div>
    </div>
  );
};

// ─── Board View ───────────────────────────────────────────────────────────────

const BoardView: React.FC<{ tasks: TeamTask[]; onRefresh: () => void }> = ({ tasks, onRefresh }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const toggle = (id: string) => setExpandedId(prev => (prev === id ? null : id));

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {STATUS_COLUMNS.map(col => {
        const colTasks = tasks.filter(t => t.status === col.id);
        return (
          <div key={col.id} className="flex flex-col gap-2">
            <div className="flex items-center gap-2 mb-1">
              <span className={`w-2 h-2 rounded-full ${
                col.id === 'todo' ? 'bg-gray-400' :
                col.id === 'in_progress' ? 'bg-blue-500' :
                col.id === 'blocked' ? 'bg-red-500' : 'bg-green-500'
              }`} />
              <h3 className="text-xs font-black text-gray-700 uppercase tracking-wider">{col.label}</h3>
              <span className="ml-auto text-xs text-gray-400 font-semibold">{colTasks.length}</span>
            </div>
            <div className="flex flex-col gap-2 min-h-[60px]">
              {colTasks.map(task => (
                <div key={task.id}>
                  <div
                    onClick={() => toggle(task.id)}
                    className={`border rounded-xl p-3 cursor-pointer hover:shadow-sm transition-all ${
                      task.scope === 'private'
                        ? 'bg-amber-50 border-amber-200 hover:border-amber-400'
                        : 'bg-white border-gray-200 hover:border-primary-300'
                    } ${expandedId === task.id ? (task.scope === 'private' ? 'border-amber-400' : 'border-primary-400 shadow-sm') : ''}`}
                  >
                    <div className="flex items-start gap-2">
                      <PriorityDot priority={task.priority} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800 leading-tight truncate">{task.title}</p>
                        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                          {task.scope === 'private' && (
                            <span className="text-[9px] text-amber-600 font-bold uppercase">🔒</span>
                          )}
                          {task.brand && <BrandBadge brand={task.brand} />}
                          <span className="text-[10px] text-gray-400 font-medium">
                            {shortEmail(task.assigned_to_email)}
                          </span>
                        </div>
                        {task.due_date && (
                          <p className={`text-[10px] font-semibold mt-1 ${isOverdue(task.due_date) ? 'text-red-500' : 'text-gray-400'}`}>
                            {isOverdue(task.due_date) ? '⚠ ' : ''}{formatDate(task.due_date)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  {expandedId === task.id && (
                    <TaskDetail task={task} onClose={() => setExpandedId(null)} onUpdated={onRefresh} />
                  )}
                </div>
              ))}
              {colTasks.length === 0 && (
                <p className="text-xs text-gray-300 text-center pt-4 italic">Empty</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ─── My Desk View (private tasks only, grouped by priority) ──────────────────

const MyDeskView: React.FC<{ tasks: TeamTask[]; onRefresh: () => void }> = ({ tasks, onRefresh }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const toggle = (id: string) => setExpandedId(prev => (prev === id ? null : id));

  const open = tasks.filter(t => t.status !== 'done' && t.status !== 'cancelled');
  const done = tasks.filter(t => t.status === 'done');

  const renderTask = (task: TeamTask) => (
    <div key={task.id}>
      <div
        onClick={() => toggle(task.id)}
        className={`border rounded-xl px-4 py-3 cursor-pointer transition-all flex items-start gap-3 ${
          expandedId === task.id
            ? 'border-amber-400 bg-amber-50 shadow-sm'
            : 'border-amber-100 bg-white hover:border-amber-300 hover:bg-amber-50/50'
        }`}
      >
        <div className="flex flex-col items-center gap-1 pt-0.5">
          <PriorityDot priority={task.priority} />
          <span className={`w-1.5 h-1.5 rounded-full ${
            task.status === 'in_progress' ? 'bg-blue-400' :
            task.status === 'blocked' ? 'bg-red-400' : 'bg-gray-300'
          }`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-semibold leading-tight ${task.status === 'done' ? 'line-through text-gray-400' : 'text-gray-900'}`}>
            {task.title}
          </p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {task.brand && <BrandBadge brand={task.brand} />}
            <StatusBadge status={task.status} />
            {task.due_date && (
              <span className={`text-[10px] font-semibold ${isOverdue(task.due_date) ? 'text-red-500' : 'text-gray-400'}`}>
                {isOverdue(task.due_date) ? '⚠ ' : '📅 '}{formatDate(task.due_date)}
              </span>
            )}
          </div>
          {task.description && (
            <p className="text-xs text-gray-400 mt-1 line-clamp-1">{task.description}</p>
          )}
        </div>
      </div>
      {expandedId === task.id && (
        <TaskDetail task={task} onClose={() => setExpandedId(null)} onUpdated={onRefresh} />
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-lg">🔒</span>
          <h3 className="text-sm font-black text-amber-800 uppercase tracking-wider">My Desk — Private Tasks</h3>
          <span className="ml-auto text-xs font-bold text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">
            {open.length} open
          </span>
        </div>
        {open.length === 0 ? (
          <p className="text-sm text-amber-600/60 italic text-center py-4">All clear 🎉</p>
        ) : (
          <div className="space-y-2">
            {open
              .sort((a, b) => b.priority - a.priority || (a.due_date ?? '').localeCompare(b.due_date ?? ''))
              .map(renderTask)}
          </div>
        )}
      </div>

      {done.length > 0 && (
        <details className="group">
          <summary className="text-xs font-bold text-gray-400 cursor-pointer hover:text-gray-600 flex items-center gap-1">
            <span className="group-open:rotate-90 transition-transform inline-block">▶</span>
            {done.length} completed
          </summary>
          <div className="mt-2 space-y-2 opacity-60">
            {done.map(renderTask)}
          </div>
        </details>
      )}
    </div>
  );
};

// ─── List View ────────────────────────────────────────────────────────────────

const ListView: React.FC<{ tasks: TeamTask[]; onRefresh: () => void }> = ({ tasks, onRefresh }) => {
  const [sortKey, setSortKey] = useState<SortKey>('created_at');
  const [sortAsc, setSortAsc] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(a => !a);
    else { setSortKey(key); setSortAsc(true); }
  };

  const sorted = [...tasks].sort((a, b) => {
    const va = (a as any)[sortKey] ?? '';
    const vb = (b as any)[sortKey] ?? '';
    const cmp = String(va).localeCompare(String(vb), undefined, { numeric: true });
    return sortAsc ? cmp : -cmp;
  });

  const SortBtn: React.FC<{ k: SortKey; label: string }> = ({ k, label }) => (
    <button
      onClick={() => handleSort(k)}
      className="flex items-center gap-0.5 font-black uppercase text-[10px] tracking-wider text-gray-500 hover:text-gray-800 transition-colors"
    >
      {label}{sortKey === k && <span className="text-primary-500">{sortAsc ? ' ↑' : ' ↓'}</span>}
    </button>
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left pb-2 pr-2 pl-1 w-6"></th>
            <th className="text-left pb-2 pr-4 pl-1"><SortBtn k="title" label="Title" /></th>
            <th className="text-left pb-2 pr-4"><SortBtn k="brand" label="Brand" /></th>
            <th className="text-left pb-2 pr-4"><SortBtn k="assigned_to_email" label="Assignee" /></th>
            <th className="text-left pb-2 pr-4"><SortBtn k="priority" label="P" /></th>
            <th className="text-left pb-2 pr-4"><SortBtn k="due_date" label="Due" /></th>
            <th className="text-left pb-2 pr-4"><SortBtn k="status" label="Status" /></th>
          </tr>
        </thead>
        <tbody>
          {sorted.map(task => (
            <React.Fragment key={task.id}>
              <tr
                onClick={() => setExpandedId(prev => (prev === task.id ? null : task.id))}
                className={`border-b border-gray-100 cursor-pointer transition-colors ${
                  expandedId === task.id ? 'bg-primary-50' :
                  task.scope === 'private' ? 'hover:bg-amber-50/60' : 'hover:bg-gray-50'
                }`}
              >
                <td className="py-2.5 pl-1 pr-1">
                  {task.scope === 'private' && <span className="text-amber-500 text-xs">🔒</span>}
                </td>
                <td className="py-2.5 pr-4 pl-1">
                  <div className="flex items-center gap-2">
                    <PriorityDot priority={task.priority} />
                    <span className="font-semibold text-gray-800">{task.title}</span>
                  </div>
                </td>
                <td className="py-2.5 pr-4"><BrandBadge brand={task.brand} /></td>
                <td className="py-2.5 pr-4 text-gray-500 text-xs">{shortEmail(task.assigned_to_email)}</td>
                <td className="py-2.5 pr-4">
                  <span className={`inline-block w-2 h-2 rounded-full ${PRIORITY_DOT[task.priority] ?? 'bg-gray-300'}`} />
                </td>
                <td className={`py-2.5 pr-4 text-xs font-medium ${isOverdue(task.due_date) ? 'text-red-500 font-bold' : 'text-gray-500'}`}>
                  {formatDate(task.due_date)}
                </td>
                <td className="py-2.5 pr-4"><StatusBadge status={task.status} /></td>
              </tr>
              {expandedId === task.id && (
                <tr>
                  <td colSpan={7} className="p-0">
                    <TaskDetail task={task} onClose={() => setExpandedId(null)} onUpdated={onRefresh} />
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
          {sorted.length === 0 && (
            <tr>
              <td colSpan={7} className="text-center py-10 text-gray-400 text-sm italic">No tasks found.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

const TeamTasksView: React.FC<Props> = ({ userEmail }) => {
  const [tasks, setTasks] = useState<TeamTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<ViewMode>('my_desk');
  const [addOpen, setAddOpen] = useState(false);
  const [addDefaultScope, setAddDefaultScope] = useState<TaskScope>('team');

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('team_tasks').select('*').order('priority', { ascending: false });
    setTasks((data as TeamTask[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const myDeskTasks = tasks.filter(t => t.scope === 'private');
  const teamTasks = tasks.filter(t => t.scope === 'team');

  const visibleTasks =
    view === 'my_desk' ? myDeskTasks :
    view === 'board' ? teamTasks :
    view === 'list' ? teamTasks :
    tasks;

  const openPrivate = myDeskTasks.filter(t => t.status !== 'done' && t.status !== 'cancelled').length;
  const openTeam = teamTasks.filter(t => t.status !== 'done' && t.status !== 'cancelled').length;

  const handleAddPrivate = () => { setAddDefaultScope('private'); setAddOpen(true); };
  const handleAddTeam = () => { setAddDefaultScope('team'); setAddOpen(true); };

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* View Tabs */}
        <div className="flex items-center gap-1 bg-gray-100 rounded-full p-0.5">
          <button
            onClick={() => setView('my_desk')}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1 ${
              view === 'my_desk' ? 'bg-amber-100 text-amber-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            🔒 My Desk
            {openPrivate > 0 && (
              <span className="bg-amber-500 text-white text-[9px] font-black rounded-full px-1.5 py-0.5 min-w-[16px] text-center">
                {openPrivate}
              </span>
            )}
          </button>
          <button
            onClick={() => setView('board')}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1 ${
              view === 'board' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            👥 Team Board
            {openTeam > 0 && (
              <span className="bg-blue-500 text-white text-[9px] font-black rounded-full px-1.5 py-0.5 min-w-[16px] text-center">
                {openTeam}
              </span>
            )}
          </button>
          <button
            onClick={() => setView('list')}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
              view === 'list' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            List
          </button>
        </div>

        <button onClick={fetchTasks} className="text-xs text-gray-400 hover:text-primary-600 font-semibold transition-colors" title="Refresh">
          ↻
        </button>

        {/* Add Buttons */}
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={handleAddPrivate}
            className="flex items-center gap-1 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-lg transition-all"
          >
            🔒 + My Task
          </button>
          <button
            onClick={handleAddTeam}
            className="flex items-center gap-1 px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold rounded-lg transition-all"
          >
            👥 + Delegate
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : view === 'my_desk' ? (
        <MyDeskView tasks={myDeskTasks} onRefresh={fetchTasks} />
      ) : view === 'board' ? (
        <BoardView tasks={visibleTasks} onRefresh={fetchTasks} />
      ) : (
        <ListView tasks={visibleTasks} onRefresh={fetchTasks} />
      )}

      {addOpen && (
        <AddTaskPanel
          onClose={() => setAddOpen(false)}
          onSaved={fetchTasks}
          userEmail={userEmail}
          defaultScope={addDefaultScope}
        />
      )}
    </div>
  );
};

export default TeamTasksView;
