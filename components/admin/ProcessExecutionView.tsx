import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useBrand } from '@/lib/BrandContext';

type Process = {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: string;
  brand_slug: string;
  trigger: string;
  owner_role: string;
  est_minutes: number;
  active: boolean;
};

type ProcessStep = {
  id: string;
  process_id: string;
  step_number: number;
  title: string;
  description: string;
  assignee_role: string;
  est_minutes: number;
  is_automated: boolean;
  automation_ref: string;
};

type ProcessExecution = {
  id: string;
  process_id: string;
  executed_by_email: string;
  brand_slug: string;
  started_at: string;
  completed_at: string | null;
  status: string;
  notes: string | null;
  created_at: string;
};

export default function ProcessExecutionView() {
  const { activeBrand } = useBrand();

  const [processes, setProcesses] = useState<Process[]>([]);
  const [steps, setSteps] = useState<ProcessStep[]>([]);
  const [recentExecutions, setRecentExecutions] = useState<ProcessExecution[]>([]);
  const [selectedProcess, setSelectedProcess] = useState<Process | null>(null);
  const [activeExecution, setActiveExecution] = useState<ProcessExecution | null>(null);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [executionNotes, setExecutionNotes] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadProcesses();
  }, [activeBrand]);

  useEffect(() => {
    if (selectedProcess) {
      loadStepsAndExecutions(selectedProcess.id);
    }
  }, [selectedProcess]);

  const loadProcesses = async () => {
    setLoading(true);
    let query = supabase.from('processes').select('*').eq('active', true).order('category').order('title');
    const { data } = await query;
    setProcesses((data as Process[]) ?? []);
    setLoading(false);
  };

  const loadStepsAndExecutions = async (processId: string) => {
    const [stepsRes, execRes] = await Promise.all([
      supabase.from('process_steps').select('*').eq('process_id', processId).order('step_number'),
      supabase
        .from('process_executions')
        .select('*')
        .eq('process_id', processId)
        .order('created_at', { ascending: false })
        .limit(10),
    ]);
    setSteps((stepsRes.data as ProcessStep[]) ?? []);
    setRecentExecutions((execRes.data as ProcessExecution[]) ?? []);
  };

  const loadRecentExecutions = async () => {
    if (!selectedProcess) return;
    const { data } = await supabase
      .from('process_executions')
      .select('*')
      .eq('process_id', selectedProcess.id)
      .order('created_at', { ascending: false })
      .limit(10);
    setRecentExecutions((data as ProcessExecution[]) ?? []);
  };

  const startExecution = async () => {
    if (!selectedProcess) return;
    const { data } = await supabase
      .from('process_executions')
      .insert({
        process_id: selectedProcess.id,
        executed_by_email: 'luis@mail.hartlimesgmbh.de',
        brand_slug: activeBrand?.slug ?? selectedProcess.brand_slug ?? '',
        started_at: new Date().toISOString(),
        status: 'running',
      })
      .select()
      .single();
    setActiveExecution(data as ProcessExecution);
    setCompletedSteps(new Set());
    setExecutionNotes('');
  };

  const completeExecution = async (status: 'completed' | 'failed') => {
    if (!activeExecution) return;
    await supabase
      .from('process_executions')
      .update({
        status,
        completed_at: new Date().toISOString(),
        notes: executionNotes,
      })
      .eq('id', activeExecution.id);
    setActiveExecution(null);
    loadRecentExecutions();
  };

  const toggleStep = (stepId: string) => {
    setCompletedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(stepId)) {
        next.delete(stepId);
      } else {
        next.add(stepId);
      }
      return next;
    });
  };

  const filteredProcesses = processes.filter((p) => {
    if (!activeBrand) return true;
    return !p.brand_slug || p.brand_slug === activeBrand.slug;
  });

  const statusBadge = (status: string) => {
    if (status === 'running') return 'bg-blue-500/15 text-blue-400';
    if (status === 'failed') return 'bg-red-500/15 text-red-400';
    if (status === 'completed') return 'bg-emerald-500/15 text-emerald-400';
    return 'bg-slate-500/15 text-slate-400';
  };

  const progressPct =
    steps.length > 0 ? Math.round((completedSteps.size / steps.length) * 100) : 0;

  return (
    <div className="flex h-full gap-4">
      {/* Left Sidebar */}
      <div className="w-64 flex-shrink-0 flex flex-col gap-2">
        <div className="flex items-center gap-2 mb-1">
          <h2 className="text-sm font-semibold text-slate-300">SOPs</h2>
          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-500/15 text-slate-400">
            {filteredProcesses.length}
          </span>
        </div>

        {loading ? (
          <div className="text-center py-12 text-slate-500">Loading...</div>
        ) : filteredProcesses.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-sm">Keine SOPs gefunden.</div>
        ) : (
          <div className="overflow-y-auto flex flex-col gap-2 pr-1">
            {filteredProcesses.map((p) => (
              <div
                key={p.id}
                onClick={() => {
                  setSelectedProcess(p);
                  setActiveExecution(null);
                  setCompletedSteps(new Set());
                  setExecutionNotes('');
                }}
                className={`cursor-pointer rounded-2xl border p-3 transition-all ${
                  selectedProcess?.id === p.id
                    ? 'bg-blue-500/10 border-blue-500/20'
                    : 'bg-surface-800/60 border-white/[0.06] hover:border-white/10 backdrop-blur-sm'
                }`}
              >
                <p className="text-xs text-slate-500 mb-0.5">
                  {p.category} · {p.est_minutes} min
                </p>
                <p className="text-sm font-semibold text-slate-200 leading-snug">{p.title}</p>
                {p.brand_slug && (
                  <span className="mt-1 inline-block px-1.5 py-0.5 rounded-full text-xs bg-slate-500/15 text-slate-400">
                    {p.brand_slug}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Right Panel */}
      <div className="flex-1 overflow-y-auto flex flex-col gap-4 min-w-0">
        {!selectedProcess ? (
          <div className="flex items-center justify-center h-full text-slate-500 text-sm">
            ← SOP auswählen
          </div>
        ) : (
          <>
            {/* Section A — Process Info */}
            <div className="bg-surface-800/60 rounded-2xl border border-white/[0.06] p-4 backdrop-blur-sm">
              <h3 className="text-base font-semibold text-slate-100 mb-1">{selectedProcess.title}</h3>
              {selectedProcess.description && (
                <p className="text-sm text-slate-500 mb-3">{selectedProcess.description}</p>
              )}
              <div className="flex flex-wrap gap-2 text-xs text-slate-500 mb-4">
                <span className="px-2 py-0.5 rounded-full bg-slate-500/15 text-slate-400">
                  {selectedProcess.owner_role}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-slate-500/15 text-slate-400">
                  {selectedProcess.trigger}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-slate-500/15 text-slate-400">
                  {selectedProcess.est_minutes} min
                </span>
              </div>
              {!activeExecution && (
                <button
                  onClick={startExecution}
                  className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  ▶ Ausführung starten
                </button>
              )}
            </div>

            {/* Section C — Active Execution */}
            {activeExecution && (
              <div className="bg-surface-800/60 rounded-2xl border border-blue-500/20 p-4 backdrop-blur-sm">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold text-slate-300">Aktive Ausführung</h4>
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/15 text-blue-400">
                    running
                  </span>
                </div>
                <p className="text-xs text-slate-500 mb-3">
                  Gestartet:{' '}
                  {new Date(activeExecution.started_at).toLocaleString('de-DE')}
                </p>

                {/* Progress bar */}
                <div className="mb-3">
                  <div className="flex justify-between text-xs text-slate-500 mb-1">
                    <span>Fortschritt</span>
                    <span>
                      {completedSteps.size}/{steps.length} Schritte
                    </span>
                  </div>
                  <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden">
                    <div
                      className="h-2 bg-blue-600 rounded-full transition-all"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                </div>

                {/* Notes */}
                <textarea
                  className="w-full border border-white/[0.10] rounded-xl px-3 py-2 bg-white/[0.04] text-slate-100 text-sm h-20 mb-3 focus:outline-none focus:border-blue-500/40 resize-none"
                  placeholder="Notizen..."
                  value={executionNotes}
                  onChange={(e) => setExecutionNotes(e.target.value)}
                />

                <div className="flex gap-2">
                  <button
                    onClick={() => completeExecution('completed')}
                    className="px-4 py-2 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700"
                  >
                    ✓ Abschließen
                  </button>
                  <button
                    onClick={() => completeExecution('failed')}
                    className="px-4 py-2 bg-red-500/15 text-red-400 rounded-xl text-sm font-medium hover:bg-red-500/25"
                  >
                    ✗ Fehlgeschlagen
                  </button>
                </div>
              </div>
            )}

            {/* Section B — Steps */}
            <div className="bg-surface-800/60 rounded-2xl border border-white/[0.06] p-4 backdrop-blur-sm">
              <h4 className="text-sm font-semibold text-slate-300 mb-3">Schritte</h4>
              {steps.length === 0 ? (
                <p className="text-sm text-slate-500">Keine Schritte definiert.</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {steps.map((step) => (
                    <div key={step.id} className="flex items-start gap-3">
                      {activeExecution ? (
                        <input
                          type="checkbox"
                          checked={completedSteps.has(step.id)}
                          onChange={() => toggleStep(step.id)}
                          className="mt-0.5 h-4 w-4 rounded border-white/20 text-blue-600 cursor-pointer flex-shrink-0"
                        />
                      ) : (
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-white/[0.06] flex items-center justify-center text-xs font-medium text-slate-500">
                          {step.step_number}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium text-slate-200">{step.title}</span>
                          {step.is_automated && (
                            <span className="text-yellow-500 text-xs" title="Automatisiert">
                              ⚡
                            </span>
                          )}
                          <span className="px-1.5 py-0.5 rounded-full text-xs bg-slate-500/15 text-slate-400">
                            {step.assignee_role}
                          </span>
                          <span className="text-xs text-slate-500">{step.est_minutes} min</span>
                        </div>
                        {step.description && (
                          <p className="text-xs text-slate-500 mt-0.5 leading-snug">
                            {step.description}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Section D — Recent Executions */}
            <div className="bg-surface-800/60 rounded-2xl border border-white/[0.06] p-4 backdrop-blur-sm">
              <h4 className="text-sm font-semibold text-slate-300 mb-3">Letzte Ausführungen</h4>
              {recentExecutions.length === 0 ? (
                <p className="text-sm text-slate-500">Noch keine Ausführungen.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-slate-400">
                    <thead>
                      <tr className="text-slate-500 border-b border-white/[0.06]">
                        <th className="text-left py-1.5 pr-3 font-medium">Gestartet</th>
                        <th className="text-left py-1.5 pr-3 font-medium">Brand</th>
                        <th className="text-left py-1.5 pr-3 font-medium">Status</th>
                        <th className="text-left py-1.5 pr-3 font-medium">Abgeschlossen</th>
                        <th className="text-left py-1.5 font-medium">Notizen</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentExecutions.map((exec) => (
                        <tr key={exec.id} className="border-b border-white/[0.04] last:border-0">
                          <td className="py-1.5 pr-3 whitespace-nowrap text-slate-500">
                            {new Date(exec.started_at).toLocaleString('de-DE')}
                          </td>
                          <td className="py-1.5 pr-3">
                            {exec.brand_slug ? (
                              <span className="px-1.5 py-0.5 rounded-full bg-slate-500/15 text-slate-400">
                                {exec.brand_slug}
                              </span>
                            ) : (
                              <span className="text-slate-600">—</span>
                            )}
                          </td>
                          <td className="py-1.5 pr-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge(exec.status)}`}
                            >
                              {exec.status}
                            </span>
                          </td>
                          <td className="py-1.5 pr-3 whitespace-nowrap text-slate-500">
                            {exec.completed_at
                              ? new Date(exec.completed_at).toLocaleString('de-DE')
                              : <span className="text-slate-600">—</span>}
                          </td>
                          <td className="py-1.5 text-slate-500 max-w-xs truncate">
                            {exec.notes
                              ? exec.notes.length > 60
                                ? exec.notes.slice(0, 60) + '…'
                                : exec.notes
                              : <span className="text-slate-600">—</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
