import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import ResourceCardList from './ResourceCardList';
import { LoadingState, EmptyState, ErrorState, RefreshButton } from '@/components/ui/DataStates';

// ─── Types ───────────────────────────────────────────────────────────────────

type TicketStatus = 'open' | 'in_progress' | 'waiting' | 'resolved' | 'closed';
type TicketChannel = 'email' | 'whatsapp' | 'phone' | 'marketplace' | 'social' | 'other';
type SortKey = 'created_at' | 'priority' | 'status' | 'due_date' | 'brand_id' | 'assigned_to';
type SortDir = 'asc' | 'desc';
type TabView = 'tickets' | 'overview';

interface SupportTicket {
  id: string;
  brand_id: string;
  channel: TicketChannel;
  subject: string;
  customer_name: string | null;
  customer_email: string | null;
  status: TicketStatus;
  priority: number;
  assigned_to: string | null;
  notes: string | null;
  tags: string[];
  due_date: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

interface InternAccount {
  full_name: string;
  email: string;
  is_active: boolean;
}

interface Props {
  isAdmin: boolean;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const STATUSES: { id: TicketStatus; label: string; color: string }[] = [
  { id: 'open',        label: 'Open',        color: 'bg-red-500/15 text-red-400 border-red-500/20' },
  { id: 'in_progress', label: 'In Progress', color: 'bg-blue-500/15 text-blue-400 border-blue-500/20' },
  { id: 'waiting',     label: 'Waiting',     color: 'bg-[#0F766E]/15 text-[#0F766E] border-[#0F766E]/25' },
  { id: 'resolved',    label: 'Resolved',    color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' },
  { id: 'closed',      label: 'Closed',      color: 'bg-slate-500/15 text-[#6e6e73] border-slate-500/20' },
];

const CHANNELS: { id: TicketChannel; label: string; icon: string }[] = [
  { id: 'email',       label: 'Email',       icon: '📧' },
  { id: 'whatsapp',    label: 'WhatsApp',    icon: '💬' },
  { id: 'phone',       label: 'Phone',       icon: '📞' },
  { id: 'marketplace', label: 'Marketplace', icon: '🏪' },
  { id: 'social',      label: 'Social',      icon: '📱' },
  { id: 'other',       label: 'Other',       icon: '📌' },
];

const BRANDS: { id: string; label: string }[] = [
  { id: 'thiocyn',      label: 'Thiocyn' },
  { id: 'take-a-shot',  label: 'Take A Shot' },
  { id: 'dr-severin',   label: 'Dr. Severin' },
  { id: 'paigh',        label: 'Paigh' },
  { id: 'wristr',       label: 'Wristr' },
  { id: 'timber-john',  label: 'Timber & John' },
];

const PRIORITY_DOT: Record<number, string> = {
  1: 'bg-gray-400', 2: 'bg-blue-500', 3: 'bg-amber-500', 4: 'bg-orange-500', 5: 'bg-red-600',
};
const PRIORITY_LABEL: Record<number, string> = {
  1: 'Low', 2: 'Normal', 3: 'Medium', 4: 'High', 5: 'Critical',
};

const BRAND_LABELS: Record<string, string> = Object.fromEntries(BRANDS.map(b => [b.id, b.label]));
const CHANNEL_ICONS: Record<string, string> = Object.fromEntries(CHANNELS.map(c => [c.id, c.icon]));
const STATUS_MAP: Record<string, typeof STATUSES[number]> = Object.fromEntries(STATUSES.map(s => [s.id, s]));

const BRAND_CS: {
  name: string;
  status: 'active' | 'paused' | 'external';
  statusLabel: string;
  accent: string;
}[] = [
  { name: 'Thiocyn',       status: 'active',   statusLabel: 'Aktiv',              accent: '#A78BFA' },
  { name: 'Paigh',         status: 'active',   statusLabel: 'Aktiv',              accent: '#F43F5E' },
  { name: 'Dr. Severin',   status: 'active',   statusLabel: 'Aktiv',              accent: '#38BDF8' },
  { name: 'Take A Shot',   status: 'external', statusLabel: 'Extern (~300€/mo)',  accent: '#F59E0B' },
  { name: 'Timber & John', status: 'paused',   statusLabel: 'Seasonal Pause',     accent: '#4ADE80' },
];

const CS_STATUS_STYLES: Record<string, string> = {
  active:   'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  paused:   'bg-yellow-500/15 text-yellow-400 border-yellow-500/20',
  external: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function shortEmail(email: string | null): string {
  if (!email) return '—';
  return email.split('@')[0];
}

function formatDate(d: string | null): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('de-DE', { day: '2-digit', month: 'short' });
}

function relativeTime(d: string): string {
  const mins = Math.round((Date.now() - new Date(d).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m`;
  if (mins < 1440) return `${Math.round(mins / 60)}h`;
  return `${Math.round(mins / 1440)}d`;
}

function isOverdue(d: string | null): boolean {
  if (!d) return false;
  return new Date(d) < new Date(new Date().toDateString());
}

// ─── Inline Editable Cell ────────────────────────────────────────────────────

function InlineText({
  value,
  onSave,
  placeholder,
  className = '',
}: {
  value: string;
  onSave: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setDraft(value); }, [value]);
  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

  const commit = () => {
    setEditing(false);
    if (draft.trim() !== value) onSave(draft.trim());
  };

  if (!editing) {
    return (
      <span
        onClick={() => setEditing(true)}
        className={`cursor-text hover:bg-black/[0.03] rounded px-1 -mx-1 transition-colors ${className}`}
        title="Click to edit"
      >
        {value || <span className="text-[#86868b] italic">{placeholder ?? 'Click to add'}</span>}
      </span>
    );
  }

  return (
    <input
      ref={inputRef}
      value={draft}
      onChange={e => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') { setDraft(value); setEditing(false); } }}
      className={`bg-black/[0.04] border border-amber-500/30 rounded px-1.5 py-0.5 text-[#1d1d1f] outline-none -mx-1 ${className}`}
      placeholder={placeholder}
    />
  );
}

function InlineSelect<T extends string>({
  value,
  options,
  onSave,
  renderValue,
}: {
  value: T;
  options: { id: T; label: string }[];
  onSave: (v: T) => void;
  renderValue?: (v: T) => React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="hover:bg-black/[0.03] rounded px-1 -mx-1 transition-colors cursor-pointer"
      >
        {renderValue ? renderValue(value) : value}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute z-50 mt-1 left-0 bg-white/80 border border-white/[0.1] rounded-lg shadow-xl py-1 min-w-[140px]">
            {options.map(o => (
              <button
                key={o.id}
                onClick={() => { onSave(o.id); setOpen(false); }}
                className={`w-full text-left px-3 py-1.5 text-xs transition-colors ${
                  value === o.id ? 'bg-[#0F766E]/12 text-[#0F766E] font-bold' : 'text-[#1d1d1f] hover:bg-black/[0.03]'
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Status Badge (clickable) ────────────────────────────────────────────────

function StatusBadge({ status, onSave }: { status: TicketStatus; onSave: (s: TicketStatus) => void }) {
  const s = STATUS_MAP[status];
  return (
    <InlineSelect
      value={status}
      options={STATUSES.map(st => ({ id: st.id, label: st.label }))}
      onSave={onSave}
      renderValue={v => (
        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border ${STATUS_MAP[v]?.color ?? ''}`}>
          {STATUS_MAP[v]?.label ?? v}
        </span>
      )}
    />
  );
}

// ─── Quick Add Row ───────────────────────────────────────────────────────────

function QuickAddRow({ onAdd }: { onAdd: (subject: string) => void }) {
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const submit = () => {
    if (!value.trim()) return;
    onAdd(value.trim());
    setValue('');
  };

  return (
    <div className="flex items-center gap-2 py-2 px-3 border-t border-black/[0.04] group">
      <span className="text-[#86868b] text-sm">+</span>
      <input
        ref={inputRef}
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') submit(); }}
        placeholder="Add ticket..."
        className="flex-1 bg-transparent text-sm text-[#1d1d1f] placeholder-[#86868b] outline-none"
      />
      {value.trim() && (
        <button
          onClick={submit}
          className="text-[10px] font-bold text-[#0F766E] bg-[#0F766E]/12 border border-[#0F766E]/25 rounded px-2 py-0.5 hover:bg-amber-500/20 transition-colors"
        >
          Add
        </button>
      )}
    </div>
  );
}

// ─── Detail Slide-Over Panel ─────────────────────────────────────────────────

function DetailPanel({
  ticket,
  team,
  onUpdate,
  onDelete,
  onClose,
}: {
  ticket: SupportTicket;
  team: InternAccount[];
  onUpdate: (id: string, changes: Partial<SupportTicket>) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}) {
  const [notes, setNotes] = useState(ticket.notes ?? '');
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => { setNotes(ticket.notes ?? ''); setConfirmDelete(false); }, [ticket.id, ticket.notes]);

  const saveNotes = () => {
    if (notes !== (ticket.notes ?? '')) onUpdate(ticket.id, { notes });
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="fixed top-0 right-0 z-50 h-full w-full max-w-lg bg-white/60 border-l border-black/[0.08] shadow-2xl flex flex-col animate-[slideInRight_0.2s_ease-out]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-black/[0.06]">
          <div className="flex items-center gap-2">
            <span className="text-base">{CHANNEL_ICONS[ticket.channel] ?? '📌'}</span>
            <span className="text-[10px] font-black uppercase tracking-wider text-[#6e6e73]">
              {BRAND_LABELS[ticket.brand_id] ?? ticket.brand_id}
            </span>
          </div>
          <button onClick={onClose} className="text-[#6e6e73] hover:text-[#1d1d1f] text-lg transition-colors">✕</button>
        </div>

        {/* Body — scrollable */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {/* Subject */}
          <div>
            <InlineText
              value={ticket.subject}
              onSave={v => onUpdate(ticket.id, { subject: v })}
              className="text-lg font-black text-[#1d1d1f] w-full block"
            />
          </div>

          {/* Field Grid */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
            <FieldRow label="Status">
              <StatusBadge status={ticket.status} onSave={s => onUpdate(ticket.id, { status: s })} />
            </FieldRow>
            <FieldRow label="Priority">
              <InlineSelect
                value={String(ticket.priority) as any}
                options={[1,2,3,4,5].map(p => ({ id: String(p) as any, label: `${p} — ${PRIORITY_LABEL[p]}` }))}
                onSave={v => onUpdate(ticket.id, { priority: Number(v) })}
                renderValue={v => (
                  <span className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${PRIORITY_DOT[Number(v)]}`} />
                    <span className="text-xs text-[#1d1d1f]">{PRIORITY_LABEL[Number(v)]}</span>
                  </span>
                )}
              />
            </FieldRow>
            <FieldRow label="Brand">
              <InlineSelect
                value={ticket.brand_id as any}
                options={BRANDS}
                onSave={v => onUpdate(ticket.id, { brand_id: v })}
              />
            </FieldRow>
            <FieldRow label="Channel">
              <InlineSelect
                value={ticket.channel}
                options={CHANNELS.map(c => ({ id: c.id, label: `${c.icon} ${c.label}` }))}
                onSave={v => onUpdate(ticket.id, { channel: v })}
              />
            </FieldRow>
            <FieldRow label="Assigned to">
              <InlineSelect
                value={(ticket.assigned_to ?? '__none__') as any}
                options={[
                  { id: '__none__' as any, label: '— Unassigned —' },
                  ...team.map(t => ({ id: t.email as any, label: t.full_name })),
                ]}
                onSave={v => onUpdate(ticket.id, { assigned_to: v === '__none__' ? null : v })}
                renderValue={v => (
                  <span className="text-xs text-[#1d1d1f]">
                    {v === '__none__' ? <span className="text-[#86868b]">Unassigned</span> : shortEmail(v)}
                  </span>
                )}
              />
            </FieldRow>
            <FieldRow label="Due date">
              <input
                type="date"
                value={ticket.due_date ?? ''}
                onChange={e => onUpdate(ticket.id, { due_date: e.target.value || null })}
                className="text-xs bg-transparent text-[#1d1d1f] border-none outline-none cursor-pointer hover:bg-black/[0.03] rounded px-1 -mx-1"
              />
            </FieldRow>
            <FieldRow label="Customer">
              <InlineText
                value={ticket.customer_name ?? ''}
                onSave={v => onUpdate(ticket.id, { customer_name: v || null })}
                placeholder="Name"
                className="text-xs text-[#1d1d1f]"
              />
            </FieldRow>
            <FieldRow label="Email">
              <InlineText
                value={ticket.customer_email ?? ''}
                onSave={v => onUpdate(ticket.id, { customer_email: v || null })}
                placeholder="customer@..."
                className="text-xs text-[#1d1d1f]"
              />
            </FieldRow>
          </div>

          {/* Tags */}
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-[#6e6e73] mb-1.5">Tags</p>
            <div className="flex flex-wrap gap-1">
              {(ticket.tags ?? []).map((tag, i) => (
                <span key={i} className="px-2 py-0.5 text-[10px] font-semibold bg-black/[0.04] text-[#515154] rounded-full border border-black/[0.06]">
                  {tag}
                  <button
                    onClick={() => onUpdate(ticket.id, { tags: ticket.tags.filter((_, j) => j !== i) })}
                    className="ml-1 text-[#86868b] hover:text-red-400 transition-colors"
                  >
                    ×
                  </button>
                </span>
              ))}
              <AddTagButton onAdd={tag => onUpdate(ticket.id, { tags: [...(ticket.tags ?? []), tag] })} />
            </div>
          </div>

          {/* Notes */}
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-[#6e6e73] mb-1.5">Notes</p>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              onBlur={saveNotes}
              rows={5}
              placeholder="Add notes..."
              className="w-full text-sm bg-black/[0.03] border border-black/[0.06] rounded-lg px-3 py-2 text-[#1d1d1f] placeholder-[#86868b] resize-none outline-none focus:border-amber-500/30 transition-colors"
            />
          </div>

          {/* Meta */}
          <div className="text-[10px] text-[#86868b] space-y-0.5">
            <p>Created {new Date(ticket.created_at).toLocaleString('de-DE')}</p>
            <p>Updated {relativeTime(ticket.updated_at)} ago</p>
            {ticket.resolved_at && <p>Resolved {new Date(ticket.resolved_at).toLocaleString('de-DE')}</p>}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-black/[0.06] flex justify-between">
          {!confirmDelete ? (
            <button
              onClick={() => setConfirmDelete(true)}
              className="text-xs text-[#6e6e73] hover:text-red-400 transition-colors"
            >
              Delete ticket
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs text-red-400">Delete?</span>
              <button onClick={() => { onDelete(ticket.id); onClose(); }} className="text-xs font-bold text-red-400 bg-red-500/10 border border-red-500/20 rounded px-2 py-0.5 hover:bg-red-500/20">Yes</button>
              <button onClick={() => setConfirmDelete(false)} className="text-xs text-[#6e6e73] hover:text-[#1d1d1f]">No</button>
            </div>
          )}
          <button
            onClick={onClose}
            className="text-xs font-semibold text-[#515154] hover:text-[#1d1d1f] transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </>
  );
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-black uppercase tracking-wider text-[#6e6e73] mb-0.5">{label}</p>
      {children}
    </div>
  );
}

function AddTagButton({ onAdd }: { onAdd: (tag: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState('');
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => { if (editing) ref.current?.focus(); }, [editing]);

  const commit = () => {
    if (value.trim()) { onAdd(value.trim()); setValue(''); }
    setEditing(false);
  };

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="px-2 py-0.5 text-[10px] font-semibold text-[#86868b] hover:text-[#1d1d1f] border border-dashed border-black/[0.08] rounded-full hover:border-white/[0.15] transition-colors"
      >
        + tag
      </button>
    );
  }

  return (
    <input
      ref={ref}
      value={value}
      onChange={e => setValue(e.target.value)}
      onBlur={commit}
      onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') { setValue(''); setEditing(false); } }}
      className="w-20 px-2 py-0.5 text-[10px] bg-black/[0.04] border border-amber-500/30 rounded-full text-[#1d1d1f] outline-none"
      placeholder="tag name"
    />
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

const CustomerSupportView: React.FC<Props> = ({ isAdmin }) => {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [team, setTeam] = useState<InternAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [filterStatus, setFilterStatus] = useState<TicketStatus | 'all'>('all');
  const [filterBrand, setFilterBrand] = useState<string>('all');
  const [filterAssigned, setFilterAssigned] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Sort
  const [sortKey, setSortKey] = useState<SortKey>('created_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  // Detail panel
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Bulk selection
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Tab
  const [tab, setTab] = useState<TabView>('tickets');

  // ─── Data Fetching ───────────────────────────────────────────────────────

  const fetchTickets = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    setError(null);

    const { data, error: err } = await supabase
      .from('support_tickets')
      .select('*')
      .order('created_at', { ascending: false });

    if (err) { setError(err.message); }
    else { setTickets((data ?? []) as SupportTicket[]); }

    setLoading(false);
    setRefreshing(false);
  }, []);

  const fetchTeam = useCallback(async () => {
    const { data } = await supabase
      .from('intern_accounts')
      .select('full_name, email, is_active')
      .eq('is_active', true);
    if (data) setTeam(data);
  }, []);

  useEffect(() => { fetchTickets(); fetchTeam(); }, [fetchTickets, fetchTeam]);

  // ─── Mutations ─────────────────────────────────────────────────────────

  const addTicket = async (subject: string) => {
    const { data, error: err } = await supabase
      .from('support_tickets')
      .insert({ subject, brand_id: filterBrand !== 'all' ? filterBrand : 'thiocyn' })
      .select()
      .single();
    if (!err && data) {
      setTickets(prev => [data as SupportTicket, ...prev]);
    }
  };

  const updateTicket = async (id: string, changes: Partial<SupportTicket>) => {
    // Optimistic update
    setTickets(prev => prev.map(t => t.id === id ? { ...t, ...changes, updated_at: new Date().toISOString() } : t));
    const { error: err } = await supabase.from('support_tickets').update(changes).eq('id', id);
    if (err) { fetchTickets(true); } // rollback on error
  };

  const deleteTicket = async (id: string) => {
    setTickets(prev => prev.filter(t => t.id !== id));
    setSelected(prev => { const next = new Set(prev); next.delete(id); return next; });
    await supabase.from('support_tickets').delete().eq('id', id);
  };

  const bulkUpdate = async (changes: Partial<SupportTicket>) => {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    setTickets(prev => prev.map(t => ids.includes(t.id) ? { ...t, ...changes, updated_at: new Date().toISOString() } : t));
    setSelected(new Set());
    await supabase.from('support_tickets').update(changes).in('id', ids);
  };

  const bulkDelete = async () => {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    setTickets(prev => prev.filter(t => !ids.includes(t.id)));
    setSelected(new Set());
    await supabase.from('support_tickets').delete().in('id', ids);
  };

  // ─── Filtering & Sorting ──────────────────────────────────────────────

  const filtered = tickets
    .filter(t => filterStatus === 'all' || t.status === filterStatus)
    .filter(t => filterBrand === 'all' || t.brand_id === filterBrand)
    .filter(t => filterAssigned === 'all' || (filterAssigned === '__none__' ? !t.assigned_to : t.assigned_to === filterAssigned))
    .filter(t => !searchQuery || t.subject.toLowerCase().includes(searchQuery.toLowerCase()) || (t.customer_name ?? '').toLowerCase().includes(searchQuery.toLowerCase()));

  const sorted = [...filtered].sort((a, b) => {
    let cmp = 0;
    switch (sortKey) {
      case 'priority': cmp = a.priority - b.priority; break;
      case 'status': cmp = STATUSES.findIndex(s => s.id === a.status) - STATUSES.findIndex(s => s.id === b.status); break;
      case 'due_date': cmp = (a.due_date ?? '9').localeCompare(b.due_date ?? '9'); break;
      case 'brand_id': cmp = a.brand_id.localeCompare(b.brand_id); break;
      case 'assigned_to': cmp = (a.assigned_to ?? '').localeCompare(b.assigned_to ?? ''); break;
      default: cmp = a.created_at.localeCompare(b.created_at);
    }
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const selectedTicket = selectedId ? tickets.find(t => t.id === selectedId) : null;

  // ─── Stats ─────────────────────────────────────────────────────────────

  const stats = {
    open: tickets.filter(t => t.status === 'open').length,
    inProgress: tickets.filter(t => t.status === 'in_progress').length,
    waiting: tickets.filter(t => t.status === 'waiting').length,
    resolved: tickets.filter(t => t.status === 'resolved' || t.status === 'closed').length,
    overdue: tickets.filter(t => isOverdue(t.due_date) && t.status !== 'resolved' && t.status !== 'closed').length,
  };

  // ─── Render ────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 animate-[fadeIn_0.3s_ease-out]">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-black text-[#1d1d1f] tracking-tight">Customer Support</h2>
          <p className="text-sm text-[#6e6e73] mt-0.5">Ticket-Management, Team und Brand-Status</p>
        </div>
        <div className="flex items-center gap-2">
          <RefreshButton onClick={() => fetchTickets(true)} refreshing={refreshing} />
        </div>
      </div>

      {/* Stat Chips */}
      <div className="flex flex-wrap gap-2">
        {[
          { label: 'Open', value: stats.open, color: 'text-red-400 bg-red-500/10 border-red-500/20', filter: 'open' as const },
          { label: 'In Progress', value: stats.inProgress, color: 'text-blue-400 bg-blue-500/10 border-blue-500/20', filter: 'in_progress' as const },
          { label: 'Waiting', value: stats.waiting, color: 'text-[#0F766E] bg-[#0F766E]/12 border-[#0F766E]/25', filter: 'waiting' as const },
          { label: 'Resolved', value: stats.resolved, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', filter: 'resolved' as const },
        ].map(s => (
          <button
            key={s.label}
            onClick={() => setFilterStatus(filterStatus === s.filter ? 'all' : s.filter)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold transition-all ${
              filterStatus === s.filter ? s.color + ' ring-1 ring-white/10' : 'text-[#6e6e73] bg-white/80 border-black/[0.06] hover:bg-black/[0.03]'
            }`}
          >
            <span className="font-black">{s.value}</span>
            {s.label}
          </button>
        ))}
        {stats.overdue > 0 && (
          <span className="flex items-center gap-1 px-3 py-1.5 rounded-full border text-xs font-bold text-red-400 bg-red-500/10 border-red-500/20 animate-pulse">
            🔴 {stats.overdue} overdue
          </span>
        )}
      </div>

      {/* Tab Bar */}
      <div className="flex gap-1 border-b border-black/[0.06]">
        {[
          { id: 'tickets' as const, label: 'Tickets' },
          { id: 'overview' as const, label: 'Overview' },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-all border-b-2 -mb-px ${
              tab === t.id ? 'border-amber-500 text-[#0F766E]' : 'border-transparent text-[#6e6e73] hover:text-[#1d1d1f]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'tickets' ? (
        <>
          {/* Filters & Search */}
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search tickets..."
              className="text-sm bg-black/[0.03] border border-black/[0.06] rounded-lg px-3 py-1.5 text-[#1d1d1f] placeholder-[#86868b] outline-none focus:border-amber-500/30 w-48 transition-colors"
            />
            <select
              value={filterBrand}
              onChange={e => setFilterBrand(e.target.value)}
              className="text-xs bg-white/80 border border-black/[0.06] rounded-lg px-2 py-1.5 text-[#1d1d1f] outline-none cursor-pointer"
            >
              <option value="all">All Brands</option>
              {BRANDS.map(b => <option key={b.id} value={b.id}>{b.label}</option>)}
            </select>
            <select
              value={filterAssigned}
              onChange={e => setFilterAssigned(e.target.value)}
              className="text-xs bg-white/80 border border-black/[0.06] rounded-lg px-2 py-1.5 text-[#1d1d1f] outline-none cursor-pointer"
            >
              <option value="all">All Assignees</option>
              <option value="__none__">Unassigned</option>
              {team.map(t => <option key={t.email} value={t.email}>{t.full_name}</option>)}
            </select>

            {/* Bulk actions */}
            {selected.size > 0 && (
              <div className="flex items-center gap-1 ml-auto">
                <span className="text-[10px] font-bold text-[#0F766E]">{selected.size} selected</span>
                <select
                  defaultValue=""
                  onChange={e => {
                    if (e.target.value === '__delete__') bulkDelete();
                    else if (e.target.value) bulkUpdate({ status: e.target.value as TicketStatus });
                    e.target.value = '';
                  }}
                  className="text-[10px] bg-white/80 border border-black/[0.06] rounded px-2 py-1 text-[#1d1d1f] cursor-pointer"
                >
                  <option value="" disabled>Bulk action...</option>
                  {STATUSES.map(s => <option key={s.id} value={s.id}>Set {s.label}</option>)}
                  <option value="__delete__">Delete selected</option>
                </select>
                <button onClick={() => setSelected(new Set())} className="text-[10px] text-[#6e6e73] hover:text-[#1d1d1f] ml-1">Clear</button>
              </div>
            )}
          </div>

          {/* Ticket Table */}
          {loading ? (
            <LoadingState label="Loading tickets..." />
          ) : error ? (
            <ErrorState message={error} onRetry={() => fetchTickets()} />
          ) : (
            <div className="rounded-xl border border-black/[0.06] bg-white/70 overflow-hidden">
              {/* Table Header */}
              <div className="grid grid-cols-[32px_1fr_100px_80px_90px_90px_80px_60px] gap-0 px-3 py-2 border-b border-black/[0.06] bg-white/60/40">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={selected.size > 0 && selected.size === sorted.length}
                    onChange={e => {
                      if (e.target.checked) setSelected(new Set(sorted.map(t => t.id)));
                      else setSelected(new Set());
                    }}
                    className="w-3.5 h-3.5 rounded border-white/20 accent-amber-500 cursor-pointer"
                  />
                </div>
                {[
                  { key: 'created_at' as SortKey, label: 'Subject' },
                  { key: 'brand_id' as SortKey, label: 'Brand' },
                  { key: 'status' as SortKey, label: 'Status' },
                  { key: 'priority' as SortKey, label: 'Priority' },
                  { key: 'assigned_to' as SortKey, label: 'Assignee' },
                  { key: 'due_date' as SortKey, label: 'Due' },
                ].map(col => (
                  <button
                    key={col.key}
                    onClick={() => toggleSort(col.key)}
                    className="text-[10px] font-black uppercase tracking-wider text-[#6e6e73] hover:text-[#1d1d1f] text-left transition-colors flex items-center gap-1"
                  >
                    {col.label}
                    {sortKey === col.key && <span className="text-[#0F766E]">{sortDir === 'asc' ? '↑' : '↓'}</span>}
                  </button>
                ))}
                <div />
              </div>

              {/* Rows */}
              {sorted.length === 0 ? (
                <EmptyState
                  icon="🎫"
                  title="No tickets"
                  description={filterStatus !== 'all' || filterBrand !== 'all' ? 'Try adjusting your filters' : 'Add your first ticket below'}
                />
              ) : (
                sorted.map(ticket => (
                  <div
                    key={ticket.id}
                    className={`grid grid-cols-[32px_1fr_100px_80px_90px_90px_80px_60px] gap-0 px-3 py-2 border-b border-black/[0.04] hover:bg-black/[0.02] transition-colors items-center group ${
                      selected.has(ticket.id) ? 'bg-amber-500/[0.04]' : ''
                    }`}
                  >
                    {/* Checkbox */}
                    <div className="flex items-center" onClick={e => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selected.has(ticket.id)}
                        onChange={e => {
                          setSelected(prev => {
                            const next = new Set(prev);
                            e.target.checked ? next.add(ticket.id) : next.delete(ticket.id);
                            return next;
                          });
                        }}
                        className="w-3.5 h-3.5 rounded border-white/20 accent-amber-500 cursor-pointer"
                      />
                    </div>

                    {/* Subject + Channel + Customer */}
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs" title={ticket.channel}>{CHANNEL_ICONS[ticket.channel] ?? '📌'}</span>
                        <InlineText
                          value={ticket.subject}
                          onSave={v => updateTicket(ticket.id, { subject: v })}
                          className="text-sm font-semibold text-[#1d1d1f] truncate"
                        />
                      </div>
                      {ticket.customer_name && (
                        <p className="text-[10px] text-[#6e6e73] truncate ml-5">{ticket.customer_name}</p>
                      )}
                    </div>

                    {/* Brand */}
                    <div>
                      <InlineSelect
                        value={ticket.brand_id as any}
                        options={BRANDS}
                        onSave={v => updateTicket(ticket.id, { brand_id: v })}
                        renderValue={v => (
                          <span className="text-[10px] font-bold text-[#0F766E] bg-[#0F766E]/12 border border-[#0F766E]/25 rounded-full px-1.5 py-0.5 uppercase tracking-wide">
                            {BRAND_LABELS[v] ?? v}
                          </span>
                        )}
                      />
                    </div>

                    {/* Status */}
                    <div>
                      <StatusBadge status={ticket.status} onSave={s => updateTicket(ticket.id, { status: s })} />
                    </div>

                    {/* Priority */}
                    <div>
                      <InlineSelect
                        value={String(ticket.priority) as any}
                        options={[1,2,3,4,5].map(p => ({ id: String(p) as any, label: PRIORITY_LABEL[p] }))}
                        onSave={v => updateTicket(ticket.id, { priority: Number(v) })}
                        renderValue={v => (
                          <span className="flex items-center gap-1">
                            <span className={`w-2 h-2 rounded-full ${PRIORITY_DOT[Number(v)]}`} />
                            <span className="text-xs text-[#515154]">{PRIORITY_LABEL[Number(v)]}</span>
                          </span>
                        )}
                      />
                    </div>

                    {/* Assignee */}
                    <div>
                      <InlineSelect
                        value={(ticket.assigned_to ?? '__none__') as any}
                        options={[
                          { id: '__none__' as any, label: '— None —' },
                          ...team.map(t => ({ id: t.email as any, label: t.full_name })),
                        ]}
                        onSave={v => updateTicket(ticket.id, { assigned_to: v === '__none__' ? null : v })}
                        renderValue={v => (
                          <span className={`text-xs ${v === '__none__' ? 'text-[#86868b]' : 'text-[#1d1d1f]'}`}>
                            {v === '__none__' ? '—' : shortEmail(v)}
                          </span>
                        )}
                      />
                    </div>

                    {/* Due date */}
                    <div>
                      <input
                        type="date"
                        value={ticket.due_date ?? ''}
                        onChange={e => updateTicket(ticket.id, { due_date: e.target.value || null })}
                        className={`text-[10px] bg-transparent border-none outline-none cursor-pointer w-full ${
                          isOverdue(ticket.due_date) && ticket.status !== 'resolved' && ticket.status !== 'closed'
                            ? 'text-red-400 font-bold'
                            : 'text-[#6e6e73]'
                        }`}
                      />
                    </div>

                    {/* Expand button */}
                    <div className="flex justify-end">
                      <button
                        onClick={() => setSelectedId(ticket.id)}
                        className="opacity-0 group-hover:opacity-100 text-[#6e6e73] hover:text-[#0F766E] text-xs transition-all"
                        title="Open details"
                      >
                        →
                      </button>
                    </div>
                  </div>
                ))
              )}

              {/* Quick Add */}
              <QuickAddRow onAdd={addTicket} />
            </div>
          )}
        </>
      ) : (
        /* ── Overview Tab ── */
        <div className="space-y-8">
          {/* Quick Access */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {[
              { label: 'Support GPT Copilot', url: 'https://chatgpt.com/g/g-69b81f81bd948191878ebbfc21374a5e-support-ticket-copilot' },
              { label: 'Support SOPs', url: 'https://docs.google.com/document/d/1U8PS1IiD7IBhCVOXnWBqIsJXqnAptODc/edit' },
              { label: 'Solved Ticket Sheet', url: 'https://docs.google.com/spreadsheets/d/10c0mJ30CYAPilgb1sJ8mPk9YahGr8jpy6eVXy2F-gKg/edit' },
              { label: 'Returns — Viking', url: 'https://docs.google.com/spreadsheets/d/1bopEmzQ-Wga5kYckw187F7Cm1IuNq5KgR7gZCFMSbyw/edit' },
            ].map(link => (
              <a key={link.label} href={link.url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-white/50 border border-black/[0.06] hover:bg-black/[0.03] transition-colors text-xs font-semibold text-[#1d1d1f]">
                <span className="text-[#6e6e73]">↗</span> {link.label}
              </a>
            ))}
          </div>

          {/* Brand CS Status */}
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#6e6e73] mb-3">Brand Status</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {BRAND_CS.map(brand => (
                <div key={brand.name} className="rounded-xl border border-black/[0.06] bg-white/70 p-4 backdrop-blur-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ background: brand.accent }} />
                      <span className="font-black text-sm text-[#1d1d1f]">{brand.name}</span>
                    </div>
                    <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${CS_STATUS_STYLES[brand.status]}`}>
                      {brand.statusLabel}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* CS Team */}
          {team.length > 0 && (
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#6e6e73] mb-3">CS Team ({team.length} aktiv)</p>
              <div className="flex flex-wrap gap-2">
                {team.map(intern => (
                  <div key={intern.email} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/50 border border-black/[0.06]">
                    <div className="w-6 h-6 rounded-full bg-white/[0.08] flex items-center justify-center text-[10px] font-black text-[#1d1d1f]">
                      {intern.full_name.charAt(0)}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-[#1d1d1f]">{intern.full_name}</div>
                      <div className="text-[10px] text-[#6e6e73]">{intern.email}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* KPI Targets */}
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#6e6e73] mb-3">KPI Targets</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {[
                { label: 'First Response', target: '≤ 24h' },
                { label: 'WhatsApp Reply', target: '< 4h (Mo–Fr)' },
                { label: 'Standup', target: 'Mo bis 10:00' },
                { label: 'Escalation Rate', target: '≤ 10%' },
              ].map(kpi => (
                <div key={kpi.label} className="px-3 py-2.5 rounded-lg bg-white/50 border border-black/[0.06]">
                  <div className="text-[9px] font-black uppercase tracking-wider text-[#6e6e73]">{kpi.label}</div>
                  <div className="text-sm font-black text-[#1d1d1f] mt-0.5">{kpi.target}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Resources */}
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#6e6e73] mb-3">Ressourcen</p>
            <ResourceCardList section="support" isAdmin={isAdmin} />
          </div>
        </div>
      )}

      {/* Detail Panel */}
      {selectedTicket && (
        <DetailPanel
          ticket={selectedTicket}
          team={team}
          onUpdate={updateTicket}
          onDelete={deleteTicket}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  );
};

export default CustomerSupportView;
