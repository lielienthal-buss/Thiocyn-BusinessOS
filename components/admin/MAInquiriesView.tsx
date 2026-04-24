import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Spinner from '@/components/ui/Spinner';
import { ConfirmModal } from '@/components/ui/ConfirmModal';

type Status = 'new' | 'qualified' | 'nda_sent' | 'in_dd' | 'closed_won' | 'closed_lost' | 'archived';
type RevenueRange = 'under_500k' | '500k_2m' | '2m_5m' | '5m_15m' | '15m_plus';
type Timeline = 'now' | '3_6_months' | '6_12_months' | 'exploring';

interface MAInquiry {
  id: string;
  created_at: string;
  founder_name: string;
  email: string;
  company_name: string;
  website: string | null;
  category: string | null;
  revenue_range: RevenueRange;
  timeline: Timeline;
  reason_to_sell: string | null;
  status: string;
  internal_notes: string | null;
  handled_by: string | null;
  handled_at: string | null;
  consent_data_processing_at: string;
}

const STATUS_LABELS: Record<Status, { label: string; color: string }> = {
  new:         { label: 'New',          color: 'bg-blue-100 text-blue-800 ring-blue-200' },
  qualified:   { label: 'Qualified',    color: 'bg-amber-100 text-amber-800 ring-amber-200' },
  nda_sent:    { label: 'NDA sent',     color: 'bg-purple-100 text-purple-800 ring-purple-200' },
  in_dd:       { label: 'In DD',        color: 'bg-indigo-100 text-indigo-800 ring-indigo-200' },
  closed_won:  { label: 'Closed Won',   color: 'bg-emerald-100 text-emerald-800 ring-emerald-200' },
  closed_lost: { label: 'Closed Lost',  color: 'bg-rose-100 text-rose-700 ring-rose-200' },
  archived:    { label: 'Archived',     color: 'bg-slate-100 text-slate-700 ring-slate-200' },
};

const REVENUE_LABELS: Record<RevenueRange, string> = {
  under_500k: '< 500k €',
  '500k_2m':  '500k – 2M €',
  '2m_5m':    '2M – 5M €',
  '5m_15m':   '5M – 15M €',
  '15m_plus': '15M+ €',
};

const TIMELINE_LABELS: Record<Timeline, string> = {
  now:           'Sofort bereit',
  '3_6_months':  '3–6 Monate',
  '6_12_months': '6–12 Monate',
  exploring:     'Sondiert nur',
};

const PAGE_SIZE = 20;

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('de-DE', { year: '2-digit', month: '2-digit', day: '2-digit' });

const MAInquiriesView: React.FC = () => {
  const [rows, setRows] = useState<MAInquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [statusFilter, setStatusFilter] = useState<Status | 'all'>('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<MAInquiry | null>(null);
  const [confirm, setConfirm] = useState<{ id: string; name: string } | null>(null);

  const fetchRows = async () => {
    setLoading(true);
    let q = supabase
      .from('ma_inquiries')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (statusFilter !== 'all') q = q.eq('status', statusFilter);
    if (search.trim()) {
      const s = `%${search.trim()}%`;
      q = q.or(`founder_name.ilike.${s},email.ilike.${s},company_name.ilike.${s},category.ilike.${s}`);
    }

    const from = (page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    q = q.range(from, to);

    const { data, count, error } = await q;
    if (error) console.error('[ma_inquiries] fetch error', error);
    setRows((data as MAInquiry[]) ?? []);
    setTotalCount(count ?? 0);
    setLoading(false);
  };

  useEffect(() => { fetchRows(); /* eslint-disable-next-line */ }, [page, statusFilter, search]);

  const updateStatus = async (id: string, next: Status) => {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase
      .from('ma_inquiries')
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
      .from('ma_inquiries')
      .update({ internal_notes: notes })
      .eq('id', id);
    if (error) { alert(`Failed to save notes: ${error.message}`); return; }
    if (selected?.id === id) setSelected({ ...selected, internal_notes: notes });
  };

  const handleDelete = async () => {
    if (!confirm) return;
    const { error } = await supabase.from('ma_inquiries').delete().eq('id', confirm.id);
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
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-[#1d1d1f]">M&amp;A Inquiries</h1>
            <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-rose-700 ring-1 ring-rose-200">
              Confidential
            </span>
          </div>
          <p className="mt-1 text-sm text-[#515154]">
            {totalCount} total · feed from /founders · only Owner & Admin
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="search"
            placeholder="Search company, founder, email…"
            value={search}
            onChange={(e) => { setPage(1); setSearch(e.target.value); }}
            className="h-9 w-72 rounded-lg border border-black/10 bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E]"
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
            <p>No inquiries match the current filter.</p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-black/[0.06] text-sm">
            <thead className="bg-black/[0.03]">
              <tr className="text-left text-[11px] uppercase tracking-wider text-[#515154]">
                <th className="px-4 py-3 font-bold">Company</th>
                <th className="px-4 py-3 font-bold">Founder</th>
                <th className="px-4 py-3 font-bold">Category</th>
                <th className="px-4 py-3 font-bold">Revenue</th>
                <th className="px-4 py-3 font-bold">Timeline</th>
                <th className="px-4 py-3 font-bold">Status</th>
                <th className="px-4 py-3 font-bold">Date</th>
                <th className="px-4 py-3 font-bold"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.04]">
              {rows.map((r) => {
                const status = STATUS_LABELS[r.status as Status] ?? STATUS_LABELS.new;
                return (
                  <tr key={r.id} className="hover:bg-black/[0.02]">
                    <td className="px-4 py-3 font-semibold text-[#1d1d1f]">
                      {r.company_name}
                      {r.website && (
                        <a
                          href={r.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-2 text-[10px] text-[#0F766E] hover:underline"
                        >↗</a>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[#515154]">
                      <div>{r.founder_name}</div>
                      <div className="text-xs">{r.email}</div>
                    </td>
                    <td className="px-4 py-3 text-[#515154]">{r.category ?? '—'}</td>
                    <td className="px-4 py-3 text-[#1d1d1f] tabular-nums font-semibold">
                      {REVENUE_LABELS[r.revenue_range]}
                    </td>
                    <td className="px-4 py-3 text-[#515154]">{TIMELINE_LABELS[r.timeline]}</td>
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
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                className="rounded-md bg-[#0F766E] px-3 py-1 text-[11px] font-bold text-white disabled:opacity-50">← Prev</button>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
                className="rounded-md bg-[#0F766E] px-3 py-1 text-[11px] font-bold text-white disabled:opacity-50">Next →</button>
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
          onDelete={() => setConfirm({ id: selected.id, name: selected.company_name })}
        />
      )}

      {confirm && (
        <ConfirmModal
          isOpen={!!confirm}
          title="Delete M&A Inquiry"
          message={`Are you sure you want to permanently delete the inquiry for ${confirm.name}? This is irreversible.`}
          onConfirm={handleDelete}
          onClose={() => setConfirm(null)}
        />
      )}
    </div>
  );
};

interface DrawerProps {
  row: MAInquiry;
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

  return (
    <div className="fixed inset-0 z-50 flex" role="dialog" aria-modal="true">
      <button type="button" onClick={onClose} className="flex-1 bg-black/40 backdrop-blur-sm" aria-label="Close drawer" />
      <div className="flex h-full w-full max-w-2xl flex-col bg-white shadow-2xl">
        <header className="flex items-start justify-between border-b border-black/[0.06] p-6">
          <div>
            <div className="flex items-center gap-2">
              <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#515154]">M&amp;A Inquiry</p>
              <span className="rounded-full bg-rose-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-rose-700">
                Confidential
              </span>
            </div>
            <h2 className="mt-1 text-2xl font-black tracking-tight text-[#1d1d1f]">{row.company_name}</h2>
            <p className="mt-1 text-sm text-[#515154]">{row.founder_name} · {row.email}</p>
            {row.website && (
              <a href={row.website} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-xs text-[#0F766E] hover:underline">
                {row.website}
              </a>
            )}
          </div>
          <button onClick={onClose} className="rounded-md p-2 text-[#515154] hover:bg-black/[0.06]" aria-label="Close">✕</button>
        </header>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-sm">
          <section>
            <h3 className="mb-3 font-mono text-[11px] uppercase tracking-wider text-[#515154]">Pipeline Status</h3>
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
            <Field label="Category">{row.category ?? '—'}</Field>
            <Field label="Revenue Range" highlight>{REVENUE_LABELS[row.revenue_range]}</Field>
            <Field label="Timeline" highlight>{TIMELINE_LABELS[row.timeline]}</Field>
            <Field label="Submitted">{fmtDate(row.created_at)}</Field>
            <Field label="Consent" full>
              {fmtDate(row.consent_data_processing_at)} · {row.email}
            </Field>
          </section>

          {row.reason_to_sell && (
            <section>
              <h3 className="mb-2 font-mono text-[11px] uppercase tracking-wider text-[#515154]">Why selling</h3>
              <p className="whitespace-pre-wrap rounded-lg bg-black/[0.03] p-3 text-[#1d1d1f]">{row.reason_to_sell}</p>
            </section>
          )}

          <section>
            <label className="mb-2 block font-mono text-[11px] uppercase tracking-wider text-[#515154]">Internal notes (Owner/Admin only)</label>
            <textarea
              rows={6}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Confidential notes. Visible to leadership only."
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
          <button onClick={onDelete} className="rounded-lg px-3 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-50">Delete</button>
          <button onClick={onClose} className="rounded-lg bg-[#1d1d1f] px-4 py-1.5 text-xs font-bold text-white hover:bg-black">Close</button>
        </footer>
      </div>
    </div>
  );
};

const Field: React.FC<{ label: string; full?: boolean; highlight?: boolean; children: React.ReactNode }> = ({ label, full, highlight, children }) => (
  <div className={full ? 'col-span-2' : ''}>
    <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#515154]">{label}</p>
    <p className={`mt-1 ${highlight ? 'text-base font-bold text-[#1d1d1f]' : 'text-[#1d1d1f]'}`}>{children}</p>
  </div>
);

export default MAInquiriesView;
