// @deprecated 2026-04-15 — consolidated into ContentCalendarView / BriefsHubView (Phase 3)
// Will be removed 2 weeks after user verifies the new consolidated views.
import React, { useState, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Spinner from '@/components/ui/Spinner';

const BRANDS = ['Thiocyn', 'Take A Shot', 'Dr. Severin', 'Paigh', 'Wristr', 'Timber & John'] as const;
type Brand = typeof BRANDS[number];

const TASK_EXAMPLES = [
  'Mach 3 UGC Creatives für Instagram — Sommer-Feeling, Conversion',
  '5 Hook-Varianten für Meta Ads, Cold Audience',
  'Email-Sequenz für Neukunden nach Erstkauf (3 Mails)',
  'Influencer-Outreach Template für Micro-Creator (10k-50k)',
  'Product-Launch Posting-Plan für nächste 2 Wochen',
  'UGC Brief für Freelancer — Testimonial-Format, 30s',
];

// Simple markdown renderer for the briefing output
const renderMarkdown = (text: string): React.ReactNode => {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let inTable = false;
  let tableRows: string[][] = [];

  const flushTable = (key: string) => {
    if (tableRows.length < 2) { tableRows = []; inTable = false; return; }
    const headers = tableRows[0];
    const rows = tableRows.slice(2); // skip separator row
    elements.push(
      <div key={key} className="overflow-x-auto my-4">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr>
              {headers.map((h, i) => (
                <th key={i} className="text-left text-gray-400 text-xs uppercase tracking-widest font-bold py-2 px-3 border-b border-white/10">
                  {h.trim()}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri} className="border-b border-black/[0.04]">
                {row.map((cell, ci) => (
                  <td key={ci} className="py-2 px-3 text-gray-300 text-sm"
                    dangerouslySetInnerHTML={{ __html: cell.trim().replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }}
                  />
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
    tableRows = [];
    inTable = false;
  };

  lines.forEach((line, i) => {
    const key = `line-${i}`;

    if (line.startsWith('|')) {
      inTable = true;
      tableRows.push(line.split('|').filter((_, idx, arr) => idx > 0 && idx < arr.length - 1));
      return;
    }

    if (inTable) {
      flushTable(`table-${i}`);
    }

    if (line.startsWith('# ')) {
      elements.push(<h1 key={key} className="text-2xl font-black text-[#1d1d1f] tracking-tight mt-2 mb-4">{line.slice(2)}</h1>);
    } else if (line.startsWith('## ')) {
      elements.push(<h2 key={key} className="text-base font-black text-[#1d1d1f] uppercase tracking-widest mt-6 mb-2">{line.slice(3)}</h2>);
    } else if (line.startsWith('### ')) {
      elements.push(<h3 key={key} className="text-sm font-bold text-gray-300 mt-4 mb-1">{line.slice(4)}</h3>);
    } else if (line.startsWith('---')) {
      elements.push(<hr key={key} className="border-black/[0.08] my-4" />);
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      elements.push(
        <li key={key} className="text-gray-300 text-sm ml-4 mb-1 list-disc"
          dangerouslySetInnerHTML={{ __html: line.slice(2).replace(/\*\*(.*?)\*\*/g, '<strong class="text-[#1d1d1f]">$1</strong>').replace(/⚠️/g, '<span class="text-yellow-400">⚠️</span>') }}
        />
      );
    } else if (/^\d+\. /.test(line)) {
      elements.push(
        <li key={key} className="text-gray-300 text-sm ml-4 mb-1 list-decimal"
          dangerouslySetInnerHTML={{ __html: line.replace(/^\d+\. /, '').replace(/\*\*(.*?)\*\*/g, '<strong class="text-[#1d1d1f]">$1</strong>') }}
        />
      );
    } else if (line.startsWith('**') && line.endsWith('**') && line.length > 4) {
      elements.push(<p key={key} className="text-[#1d1d1f] font-bold text-sm mb-1">{line.slice(2, -2)}</p>);
    } else if (line.trim() !== '') {
      elements.push(
        <p key={key} className="text-gray-300 text-sm mb-2 leading-relaxed"
          dangerouslySetInnerHTML={{ __html: line.replace(/\*\*(.*?)\*\*/g, '<strong class="text-[#1d1d1f]">$1</strong>').replace(/⚠️/g, '<span class="text-yellow-400">⚠️</span>') }}
        />
      );
    } else {
      elements.push(<div key={key} className="h-1" />);
    }
  });

  if (inTable) flushTable('table-end');
  return elements;
};

// ─── Main View ────────────────────────────────────────────────────────────────

const BriefingGeneratorView: React.FC = () => {
  const [brand, setBrand] = useState<Brand>('Take A Shot');
  const [taskRaw, setTaskRaw] = useState('');
  const [assignee, setAssignee] = useState('');
  const [deadline, setDeadline] = useState('');
  const [context, setContext] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [loading, setLoading] = useState(false);
  const [briefing, setBriefing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const outputRef = useRef<HTMLDivElement>(null);

  const generate = async () => {
    if (!taskRaw.trim()) return;
    setLoading(true);
    setError(null);
    setBriefing(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('generate-briefing', {
        body: {
          brand,
          task_raw: taskRaw.trim(),
          assignee: assignee.trim() || undefined,
          deadline: deadline.trim() || undefined,
          context: context.trim() || undefined,
        },
      });

      if (fnError) throw new Error(fnError.message);
      if (data?.error) throw new Error(data.error);
      setBriefing(data.briefing);

      setTimeout(() => outputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (!briefing) return;
    navigator.clipboard.writeText(briefing);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const reset = () => {
    setBriefing(null);
    setTaskRaw('');
    setError(null);
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div>
        <h2 className="text-[#1d1d1f] font-black text-2xl tracking-tight">Briefing Generator</h2>
        <p className="text-gray-500 text-sm mt-0.5">Roher Task rein → Intern-Briefing raus. Sofort umsetzbar.</p>
      </div>

      {/* Input Form */}
      <div className="bg-black/[0.03] border border-white/[0.07] rounded-2xl p-6 space-y-5">

        {/* Brand + Task */}
        <div className="flex gap-3">
          <div className="w-44 shrink-0">
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Brand</label>
            <select
              value={brand}
              onChange={e => setBrand(e.target.value as Brand)}
              className="w-full bg-black/40 border border-white/10 text-[#1d1d1f] rounded-xl px-3 py-3 text-sm focus:outline-none focus:border-violet-500"
            >
              {BRANDS.map(b => <option key={b} value={b} className="bg-[#0d0d0d]">{b}</option>)}
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Task</label>
            <textarea
              value={taskRaw}
              onChange={e => setTaskRaw(e.target.value)}
              rows={3}
              placeholder="Mach 3 UGC Creatives für Instagram — Sommer, Conversion"
              className="w-full bg-black/40 border border-white/10 text-[#1d1d1f] placeholder-gray-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-violet-500 resize-none"
            />
          </div>
        </div>

        {/* Examples */}
        <div>
          <p className="text-xs text-gray-600 mb-2">Beispiele:</p>
          <div className="flex flex-wrap gap-2">
            {TASK_EXAMPLES.map(ex => (
              <button
                key={ex}
                onClick={() => setTaskRaw(ex)}
                className="text-xs text-gray-500 hover:text-gray-300 bg-black/[0.03] border border-black/[0.06] hover:border-white/10 rounded-lg px-2.5 py-1.5 transition-all text-left"
              >
                {ex}
              </button>
            ))}
          </div>
        </div>

        {/* Advanced */}
        <div>
          <button
            onClick={() => setShowAdvanced(v => !v)}
            className="text-xs text-gray-600 hover:text-gray-400 transition-colors"
          >
            {showAdvanced ? '▾ Weniger' : '▸ Mehr Optionen'} (Assignee, Deadline, Kontext)
          </button>
          {showAdvanced && (
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1.5">Assignee</label>
                <input
                  type="text"
                  value={assignee}
                  onChange={e => setAssignee(e.target.value)}
                  placeholder="z.B. Mainak"
                  className="w-full bg-black/40 border border-white/10 text-[#1d1d1f] placeholder-gray-700 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-violet-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1.5">Deadline</label>
                <input
                  type="text"
                  value={deadline}
                  onChange={e => setDeadline(e.target.value)}
                  placeholder="z.B. Freitag, 28.03."
                  className="w-full bg-black/40 border border-white/10 text-[#1d1d1f] placeholder-gray-700 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-violet-500"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs text-gray-600 mb-1.5">Kontext</label>
                <input
                  type="text"
                  value={context}
                  onChange={e => setContext(e.target.value)}
                  placeholder="z.B. Für laufende Sommerkampagne, Budget 300€, Cold Audience"
                  className="w-full bg-black/40 border border-white/10 text-[#1d1d1f] placeholder-gray-700 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-violet-500"
                />
              </div>
            </div>
          )}
        </div>

        {error && (
          <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl p-3">{error}</p>
        )}

        <button
          onClick={generate}
          disabled={loading || !taskRaw.trim()}
          className="w-full py-3.5 bg-violet-600 hover:bg-violet-500 text-[#1d1d1f] font-black rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <><Spinner /><span>Generiere Briefing…</span></>
          ) : (
            '⚡ Briefing generieren'
          )}
        </button>
      </div>

      {/* Output */}
      {briefing && (
        <div ref={outputRef} className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Output</span>
            <div className="flex gap-2">
              <button
                onClick={copyToClipboard}
                className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-all ${
                  copied
                    ? 'bg-green-500/20 border-green-500/40 text-green-400'
                    : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/20 hover:text-[#1d1d1f]'
                }`}
              >
                {copied ? '✓ Kopiert' : 'Kopieren'}
              </button>
              <button
                onClick={reset}
                className="text-xs font-bold px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 text-gray-400 hover:border-white/20 hover:text-[#1d1d1f] transition-all"
              >
                Neu
              </button>
            </div>
          </div>

          <div className="bg-[#0a0a0a] border border-white/[0.07] rounded-2xl p-6">
            {renderMarkdown(briefing)}
          </div>

          <p className="text-xs text-gray-600 text-center">
            Briefing kopieren → in Notion / WhatsApp / Slack einfügen → Intern legt los.
          </p>
        </div>
      )}
    </div>
  );
};

export default BriefingGeneratorView;
