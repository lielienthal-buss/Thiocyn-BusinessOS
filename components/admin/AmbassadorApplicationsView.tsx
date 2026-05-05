import React, { useEffect, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '@/lib/supabaseClient';
import Spinner from '@/components/ui/Spinner';
import { ConfirmModal } from '@/components/ui/ConfirmModal';

type Status = 'new' | 'reviewing' | 'approved' | 'active' | 'archived' | 'rejected';

interface AmbassadorApplication {
  id: string;
  created_at: string;
  full_name: string;
  email: string;
  instagram_handle: string | null;
  tiktok_handle: string | null;
  follower_count_ig: number | null;
  follower_count_tt: number | null;
  brand_interest: string[] | null;
  niche: string | null;
  content_format: string | null;
  motivation: string;
  collab_history: string | null;
  status: string;
  internal_notes: string | null;
  rejection_reason: string | null;
  handled_by: string | null;
  handled_at: string | null;
  consent_data_processing_at: string;
}

const STATUS_LABELS: Record<Status, { label: string; color: string }> = {
  new:        { label: 'New',        color: 'bg-blue-100 text-blue-800 ring-blue-200' },
  reviewing:  { label: 'Reviewing',  color: 'bg-amber-100 text-amber-800 ring-amber-200' },
  approved:   { label: 'Approved',   color: 'bg-emerald-100 text-emerald-800 ring-emerald-200' },
  active:     { label: 'Active',     color: 'bg-teal-100 text-teal-800 ring-teal-200' },
  archived:   { label: 'Archived',   color: 'bg-slate-100 text-slate-700 ring-slate-200' },
  rejected:   { label: 'Rejected',   color: 'bg-rose-100 text-rose-700 ring-rose-200' },
};

const PAGE_SIZE = 20;

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('de-DE', { year: '2-digit', month: '2-digit', day: '2-digit' });

const fmtNum = (n: number | null) =>
  n == null ? '—' : new Intl.NumberFormat('de-DE').format(n);

const AmbassadorApplicationsView: React.FC = () => {
  const [rows, setRows] = useState<AmbassadorApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [statusFilter, setStatusFilter] = useState<Status | 'all'>('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<AmbassadorApplication | null>(null);
  const [confirm, setConfirm] = useState<{ id: string; name: string } | null>(null);

  const fetchRows = async () => {
    setLoading(true);
    let q = supabase
      .from('ambassador_applications')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (statusFilter !== 'all') q = q.eq('status', statusFilter);
    if (search.trim()) {
      const s = `%${search.trim()}%`;
      q = q.or(`full_name.ilike.${s},email.ilike.${s},instagram_handle.ilike.${s},niche.ilike.${s}`);
    }

    const from = (page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    q = q.range(from, to);

    const { data, count, error } = await q;
    if (error) console.error('[ambassador] fetch error', error);
    setRows((data as AmbassadorApplication[]) ?? []);
    setTotalCount(count ?? 0);
    setLoading(false);
  };

  useEffect(() => { fetchRows(); /* eslint-disable-next-line */ }, [page, statusFilter, search]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    rows.forEach(r => { c[r.status] = (c[r.status] ?? 0) + 1; });
    return c;
  }, [rows]);

  const updateStatus = async (id: string, next: Status) => {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase
      .from('ambassador_applications')
      .update({
        status: next,
        handled_by: user?.id ?? null,
        handled_at: new Date().toISOString(),
      })
      .eq('id', id);
    if (error) { alert(`Failed to update status: ${error.message}`); return; }
    await fetchRows();
    if (selected?.id === id) setSelected({ ...selected, status: next });
  };

  const updateNotes = async (id: string, notes: string) => {
    const { error } = await supabase
      .from('ambassador_applications')
      .update({ internal_notes: notes })
      .eq('id', id);
    if (error) { alert(`Failed to save notes: ${error.message}`); return; }
    if (selected?.id === id) setSelected({ ...selected, internal_notes: notes });
  };

  const handleDelete = async () => {
    if (!confirm) return;
    const { error } = await supabase.from('ambassador_applications').delete().eq('id', confirm.id);
    if (error) { alert(`Delete failed: ${error.message}`); return; }
    setConfirm(null);
    if (selected?.id === confirm.id) setSelected(null);
    fetchRows();
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-[#1d1d1f]">Ambassador Applications</h1>
          <p className="mt-1 text-sm text-[#515154]">{totalCount} total · feed from /brand-ambassador</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="search"
            placeholder="Search name, email, IG, niche…"
            value={search}
            onChange={(e) => { setPage(1); setSearch(e.target.value); }}
            className="h-9 w-64 rounded-lg border border-black/10 bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E]"
          />
          <select
            value={statusFilter}
            onChange={(e) => { setPage(1); setStatusFilter(e.target.value as Status | 'all'); }}
            className="h-9 rounded-lg border border-black/10 bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E]"
          >
            <option value="all">All statuses</option>
            {(Object.keys(STATUS_LABELS) as Status[]).map((s) => (
              <option key={s} value={s}>{STATUS_LABELS[s].label}</option>
            ))}
          </select>
        </div>
      </header>

      <div className="rounded-xl border border-black/[0.08] bg-white shadow-sm">
        {loading ? (
          <div className="flex h-64 items-center justify-center"><Spinner /></div>
        ) : rows.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center text-sm text-[#515154]">
            <p>No applications match the current filter.</p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-black/[0.06] text-sm">
            <thead className="bg-black/[0.03]">
              <tr className="text-left text-[11px] uppercase tracking-wider text-[#515154]">
                <th className="px-4 py-3 font-bold">Name</th>
                <th className="px-4 py-3 font-bold">Email</th>
                <th className="px-4 py-3 font-bold">IG · TT</th>
                <th className="px-4 py-3 font-bold text-right">Followers</th>
                <th className="px-4 py-3 font-bold">Brands</th>
                <th className="px-4 py-3 font-bold">Status</th>
                <th className="px-4 py-3 font-bold">Date</th>
                <th className="px-4 py-3 font-bold"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.04]">
              {rows.map((r) => {
                const status = (STATUS_LABELS[r.status as Status] ?? STATUS_LABELS.new);
                return (
                  <tr key={r.id} className="hover:bg-black/[0.02]">
                    <td className="px-4 py-3 font-semibold text-[#1d1d1f]">{r.full_name}</td>
                    <td className="px-4 py-3 text-[#515154]">{r.email}</td>
                    <td className="px-4 py-3 text-[#515154]">
                      {r.instagram_handle && <div>IG: {r.instagram_handle}</div>}
                      {r.tiktok_handle && <div>TT: {r.tiktok_handle}</div>}
                      {!r.instagram_handle && !r.tiktok_handle && '—'}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-[#515154]">
                      {fmtNum((r.follower_count_ig ?? 0) + (r.follower_count_tt ?? 0)) || '—'}
                    </td>
                    <td className="px-4 py-3 text-[#515154]">
                      {(r.brand_interest ?? []).slice(0, 3).join(', ') || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold ring-1 ring-inset ${status.color}`}>
                        {status.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[#515154]">{fmtDate(r.created_at)}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setSelected(r)}
                        className="rounded-lg bg-[#0F766E] px-3 py-1 text-[11px] font-bold text-white hover:bg-[#115e59] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E] focus-visible:ring-offset-2"
                      >
                        Open
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {totalCount > PAGE_SIZE && (
          <div className="flex items-center justify-between border-t border-black/[0.06] bg-black/[0.02] px-4 py-3 text-xs text-[#515154]">
            <span>Page {page} of {totalPages} · {totalCount} entries</span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded-md bg-[#0F766E] px-3 py-1 text-[11px] font-bold text-white disabled:opacity-50"
              >← Prev</button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="rounded-md bg-[#0F766E] px-3 py-1 text-[11px] font-bold text-white disabled:opacity-50"
              >Next →</button>
            </div>
          </div>
        )}
      </div>

      {selected && (
        <DetailDrawer
          row={selected}
          onClose={() => setSelected(null)}
          onStatus={(s) => updateStatus(selected.id, s)}
          onNotes={(n) => updateNotes(selected.id, n)}
          onDelete={() => setConfirm({ id: selected.id, name: selected.full_name })}
        />
      )}

      {confirm && (
        <ConfirmModal
          isOpen={!!confirm}
          title="Delete Ambassador Application"
          message={`Are you sure you want to delete the application for ${confirm.name}? This cannot be undone.`}
          onConfirm={handleDelete}
          onClose={() => setConfirm(null)}
        />
      )}
    </div>
  );
};

interface DrawerProps {
  row: AmbassadorApplication;
  onClose: () => void;
  onStatus: (next: Status) => void;
  onNotes: (notes: string) => void;
  onDelete: () => void;
}

const DetailDrawer: React.FC<DrawerProps> = ({ row, onClose, onStatus, onNotes, onDelete }) => {
  const [notes, setNotes] = useState(row.internal_notes ?? '');
  const [savingNotes, setSavingNotes] = useState(false);

  useEffect(() => { setNotes(row.internal_notes ?? ''); }, [row.id, row.internal_notes]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const saveNotes = async () => {
    setSavingNotes(true);
    await onNotes(notes);
    setSavingNotes(false);
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[60] flex" role="dialog" aria-modal="true">
      <button
        type="button"
        onClick={onClose}
        className="flex-1 bg-black/40 backdrop-blur-sm transition-opacity"
        aria-label="Close drawer"
      />
      <div className="flex h-full w-full max-w-2xl flex-col bg-white shadow-2xl">
        <header className="flex items-start justify-between border-b border-black/[0.06] p-6">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#515154]">Ambassador</p>
            <h2 className="mt-1 text-2xl font-black tracking-tight text-[#1d1d1f]">{row.full_name}</h2>
            <p className="mt-1 text-sm text-[#515154]">{row.email}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-2 text-[#515154] hover:bg-black/[0.06]"
            aria-label="Close"
          >✕</button>
        </header>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-sm">
          <section>
            <h3 className="mb-3 font-mono text-[11px] uppercase tracking-wider text-[#515154]">Status</h3>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(STATUS_LABELS) as Status[]).map((s) => {
                const active = row.status === s;
                return (
                  <button
                    key={s}
                    onClick={() => onStatus(s)}
                    className={`rounded-full px-3 py-1 text-[11px] font-bold ring-1 ring-inset transition-colors ${
                      active ? STATUS_LABELS[s].color : 'bg-white text-[#515154] ring-black/10 hover:bg-black/[0.04]'
                    }`}
                  >
                    {STATUS_LABELS[s].label}
                  </button>
                );
              })}
            </div>
          </section>

          <section className="grid grid-cols-2 gap-4">
            <Field label="Instagram">{row.instagram_handle ?? '—'}</Field>
            <Field label="TikTok">{row.tiktok_handle ?? '—'}</Field>
            <Field label="Followers IG">{fmtNum(row.follower_count_ig)}</Field>
            <Field label="Followers TT">{fmtNum(row.follower_count_tt)}</Field>
            <Field label="Niche">{row.niche ?? '—'}</Field>
            <Field label="Format">{row.content_format ?? '—'}</Field>
            <Field label="Brand Interest" full>
              {(row.brand_interest ?? []).join(', ') || '—'}
            </Field>
            <Field label="Submitted" full>
              {fmtDate(row.created_at)} · Consent {fmtDate(row.consent_data_processing_at)}
            </Field>
          </section>

          <section>
            <h3 className="mb-2 font-mono text-[11px] uppercase tracking-wider text-[#515154]">Motivation</h3>
            <p className="whitespace-pre-wrap rounded-lg bg-black/[0.03] p-3 text-[#1d1d1f]">{row.motivation}</p>
          </section>

          {row.collab_history && (
            <section>
              <h3 className="mb-2 font-mono text-[11px] uppercase tracking-wider text-[#515154]">Past collabs</h3>
              <p className="whitespace-pre-wrap rounded-lg bg-black/[0.03] p-3 text-[#1d1d1f]">{row.collab_history}</p>
            </section>
          )}

          <section>
            <label className="mb-2 block font-mono text-[11px] uppercase tracking-wider text-[#515154]">Internal notes</label>
            <textarea
              rows={5}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Private to team. Not visible to applicant."
              className="block w-full rounded-lg border border-black/10 bg-white p-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E]"
            />
            <button
              onClick={saveNotes}
              disabled={savingNotes || notes === (row.internal_notes ?? '')}
              className="mt-2 rounded-lg bg-[#0F766E] px-4 py-1.5 text-xs font-bold text-white disabled:opacity-50"
            >{savingNotes ? 'Saving…' : 'Save notes'}</button>
          </section>
        </div>

        <footer className="border-t border-black/[0.06] bg-black/[0.02] p-4 flex justify-between">
          <button
            onClick={onDelete}
            className="rounded-lg px-3 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-50"
          >Delete</button>
          <button
            onClick={onClose}
            className="rounded-lg bg-[#1d1d1f] px-4 py-1.5 text-xs font-bold text-white hover:bg-black"
          >Close</button>
        </footer>
      </div>
    </div>,
    document.body
  );
};

const Field: React.FC<{ label: string; full?: boolean; children: React.ReactNode }> = ({ label, full, children }) => (
  <div className={full ? 'col-span-2' : ''}>
    <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#515154]">{label}</p>
    <p className="mt-1 text-[#1d1d1f]">{children}</p>
  </div>
);

export default AmbassadorApplicationsView;
