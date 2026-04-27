import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import FellowCourseView from './FellowCourseView';
import Spinner from '@/components/ui/Spinner';

interface FellowRow {
  id: string;
  full_name: string;
  email: string;
  phase: string;
}

const FellowCoursePreviewView: React.FC = () => {
  const [fellows, setFellows] = useState<FellowRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('intern_accounts')
        .select('id, full_name, email, phase')
        .eq('is_active', true)
        .order('full_name');
      const rows = (data as FellowRow[]) ?? [];
      setFellows(rows);
      if (rows.length) setSelectedId(rows[0].id);
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (!fellows.length) {
    return (
      <div className="p-12 text-center text-sm text-[#515154]">
        Keine aktiven Fellows — sobald welche angelegt sind, kannst du hier ihre Kurs-Sicht einsehen.
      </div>
    );
  }

  return (
    <div>
      <div className="sticky top-0 z-10 border-b border-black/[0.08] bg-white px-6 py-3 flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[200px]">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#515154]">
            Fellow View · Admin-Lens
          </p>
          <p className="text-xs text-[#6e6e73]">
            Genau das, was der ausgewählte Fellow sieht — plus Eval-Controls (Phase-Advance, Notes).
          </p>
        </div>
        <select
          value={selectedId ?? ''}
          onChange={(e) => setSelectedId(e.target.value)}
          className="h-9 rounded-lg border border-black/10 bg-white px-3 text-sm font-medium text-[#1d1d1f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E]"
        >
          {fellows.map(f => (
            <option key={f.id} value={f.id}>
              {f.full_name} · {f.phase}
            </option>
          ))}
        </select>
      </div>
      {selectedId && <FellowCourseView internId={selectedId} showEvalLayer />}
    </div>
  );
};

export default FellowCoursePreviewView;
