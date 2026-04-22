import React, { useState, useEffect, useRef, useCallback } from 'react';
import { getEmailTemplates, updateEmailTemplate } from '@/lib/actions';
import type { EmailTemplate } from '@/types';
import Spinner from '@/components/ui/Spinner';

// ─── Constants ────────────────────────────────────────────────────────────────

const TEMPLATE_SLUGS = [
  'task_invite',
  'interview_invite',
  'rejection',
  'application_received',
] as const;

type TemplateSlug = (typeof TEMPLATE_SLUGS)[number];

const SLUG_LABELS: Record<TemplateSlug, string> = {
  task_invite: 'Task Invite',
  interview_invite: 'Interview Invite',
  rejection: 'Rejection',
  application_received: 'Application Received',
};

const VARIABLES = [
  '{{full_name}}',
  '{{task_link}}',
  '{{calendly_url}}',
  '{{company_name}}',
  '{{program_name}}',
] as const;

const SAMPLE_VALUES: Record<string, string> = {
  '{{full_name}}': 'Jane Doe',
  '{{task_link}}': 'https://app.example.com/tasks/abc123',
  '{{calendly_url}}': 'https://calendly.com/recruiter/30min',
  '{{company_name}}': 'Acme Corp',
  '{{program_name}}': 'Summer Accelerator',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function applyPreviewVariables(html: string): string {
  return Object.entries(SAMPLE_VALUES).reduce(
    (acc, [key, val]) => acc.replaceAll(key, val),
    html
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface SaveToastProps {
  visible: boolean;
}

const SaveToast: React.FC<SaveToastProps> = ({ visible }) => (
  <div
    className={`fixed bottom-8 right-8 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-black uppercase tracking-widest transition-all duration-300 ${
      visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
    }`}
  >
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
    </svg>
    Saved
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────

const EmailTemplateManager: React.FC = () => {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selectedSlug, setSelectedSlug] = useState<TemplateSlug>('task_invite');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState<'editor' | 'preview'>('editor');
  const [showToast, setShowToast] = useState(false);

  // Local editable state for the active template
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ── Data loading ──────────────────────────────────────────────────────────

  useEffect(() => {
    getEmailTemplates().then((data) => {
      setTemplates(data);
      setLoading(false);
    });
  }, []);

  // ── Sync local state when selected slug or templates change ──────────────

  const activeTemplate = templates.find((t) => t.slug === selectedSlug) ?? null;

  useEffect(() => {
    if (activeTemplate) {
      setSubject(activeTemplate.subject ?? '');
      setBody(activeTemplate.body ?? '');
      setMode('editor');
    }
  }, [selectedSlug, templates]);

  // ── Variable insertion at cursor ─────────────────────────────────────────

  const insertVariable = useCallback((variable: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      setBody((prev) => prev + variable);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newBody = body.slice(0, start) + variable + body.slice(end);
    setBody(newBody);

    // Restore cursor position after React re-render
    requestAnimationFrame(() => {
      textarea.focus();
      const newCursor = start + variable.length;
      textarea.setSelectionRange(newCursor, newCursor);
    });
  }, [body]);

  // ── Save ─────────────────────────────────────────────────────────────────

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTemplate) return;

    setSaving(true);
    const updates: Partial<EmailTemplate> = { subject, body };
    const success = await updateEmailTemplate(activeTemplate.id, updates);

    if (success) {
      setTemplates((prev) =>
        prev.map((t) =>
          t.id === activeTemplate.id ? { ...t, subject, body } : t
        )
      );
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2500);
    }
    setSaving(false);
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner className="text-primary-600" />
      </div>
    );
  }

  return (
    <>
      <SaveToast visible={showToast} />

      <div className="space-y-6 animate-[fadeIn_0.5s_ease-out]">
        {/* ── Template Tabs ── */}
        <div className="flex gap-2 flex-wrap">
          {TEMPLATE_SLUGS.map((slug) => {
            const isActive = slug === selectedSlug;
            return (
              <button
                key={slug}
                onClick={() => setSelectedSlug(slug)}
                className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                  isActive
                    ? 'bg-[#0F766E] text-[#1d1d1f] shadow-lg shadow-primary-500/25'
                    : 'bg-black/[0.03] border border-white/[0.10] text-[#515154] hover:text-[#1d1d1f] hover:bg-white/[0.08]'
                }`}
              >
                {SLUG_LABELS[slug]}
              </button>
            );
          })}
        </div>

        {/* ── Editor Panel ── */}
        {activeTemplate ? (
          <form
            onSubmit={handleSave}
            className="glass-card rounded-[2.5rem] p-8 space-y-6"
          >
            {/* Header row */}
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <h3 className="text-xl font-black text-[#1d1d1f] tracking-tighter">
                  {SLUG_LABELS[selectedSlug]}
                </h3>
                <p className="text-[10px] text-[#6e6e73] font-bold uppercase tracking-widest mt-0.5">
                  slug: {selectedSlug}
                </p>
              </div>

              {/* Editor / Preview toggle */}
              <div className="flex gap-1 bg-black/[0.03] border border-white/[0.10] rounded-xl p-1">
                {(['editor', 'preview'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMode(m)}
                    className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                      mode === m
                        ? 'bg-[#0F766E] text-[#1d1d1f]'
                        : 'text-[#515154] hover:text-[#1d1d1f]'
                    }`}
                  >
                    {m === 'editor' ? 'HTML Editor' : 'Preview'}
                  </button>
                ))}
              </div>
            </div>

            {/* Subject field */}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-[#6e6e73] mb-2 ml-1">
                Subject
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Email subject line…"
                className="w-full px-5 py-3.5 bg-black/[0.03] border border-white/[0.10] text-[#1d1d1f] placeholder-[#86868b] rounded-xl focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500/50 outline-none text-sm font-medium transition-all"
              />
            </div>

            {/* Variable picker */}
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-[#6e6e73] mb-2 ml-1">
                Insert Variable
              </p>
              <div className="flex gap-2 flex-wrap">
                {VARIABLES.map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => insertVariable(v)}
                    className="px-3 py-1.5 bg-black/[0.03] border border-white/[0.10] text-primary-400 hover:text-primary-300 hover:bg-primary-500/10 hover:border-primary-500/30 rounded-lg text-[10px] font-black font-mono tracking-wide transition-all"
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>

            {/* Body: editor or preview */}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-[#6e6e73] mb-2 ml-1">
                {mode === 'editor' ? 'Body (HTML)' : 'Rendered Preview'}
              </label>

              {mode === 'editor' ? (
                <textarea
                  ref={textareaRef}
                  rows={16}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="<p>Hello {{full_name}},</p>"
                  spellCheck={false}
                  className="w-full px-5 py-4 bg-black/[0.03] border border-white/[0.10] text-[#1d1d1f] placeholder-[#86868b] rounded-xl focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500/50 outline-none text-xs font-mono leading-relaxed transition-all resize-y"
                />
              ) : (
                <div className="rounded-xl border border-white/[0.10] overflow-hidden">
                  <div className="px-3 py-1.5 bg-black/[0.03] border-b border-black/[0.08] flex items-center gap-2">
                    <span className="text-[9px] font-black uppercase tracking-widest text-[#86868b]">
                      Preview — sample values applied
                    </span>
                  </div>
                  <div
                    className="bg-white p-8 min-h-[280px] text-slate-900 text-sm leading-relaxed"
                    dangerouslySetInnerHTML={{
                      __html: applyPreviewVariables(body),
                    }}
                  />
                </div>
              )}
            </div>

            {/* Save button */}
            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={saving}
                className="px-8 py-3.5 bg-[#0F766E] hover:bg-[#c8832a] disabled:opacity-60 text-[#1d1d1f] rounded-xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-primary-500/25 flex items-center gap-2 transition-all"
              >
                {saving && <Spinner className="w-4 h-4" />}
                Save Changes
              </button>
            </div>
          </form>
        ) : (
          <div className="glass-card p-20 rounded-[2.5rem] text-center flex flex-col items-center justify-center opacity-40">
            <svg
              className="w-14 h-14 text-[#86868b] mb-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
            <p className="text-xs font-black uppercase tracking-[0.3em] text-[#6e6e73]">
              No template found for this slug
            </p>
          </div>
        )}
      </div>
    </>
  );
};

export default EmailTemplateManager;
