import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import Spinner from '@/components/ui/Spinner';
import { supabase } from '@/lib/supabaseClient';
import { renderEmailForApplication, STAGE_AFTER_SEND, type RenderedEmail } from '@/lib/renderEmailTemplate';
import type { Application } from '@/types';

interface Props {
  application: Pick<Application, 'id' | 'full_name' | 'email' | 'access_token'>;
  templateSlug: string;
  lang: 'de' | 'en';
  emailSendEnabled: boolean;
  onClose: () => void;
  onSent: (newStage?: string) => void;
}

const TEMPLATE_LABEL: Record<string, { de: string; en: string }> = {
  task_invite: { de: 'Task-Einladung', en: 'Task invite' },
  interview_invite: { de: 'Interview-Einladung', en: 'Interview invite' },
  rejection: { de: 'Absage', en: 'Rejection' },
  application_received: { de: 'Eingangs-Bestätigung', en: 'Application received' },
  offer: { de: 'Offer / Hire', en: 'Offer / Hire' },
  custom: { de: 'Freitext-Mail', en: 'Custom message' },
};

function copyToClipboard(text: string, what: string) {
  navigator.clipboard.writeText(text).then(
    () => toast.success(`${what} kopiert`),
    () => toast.error(`Kopieren fehlgeschlagen`)
  );
}

const EmailComposeModal: React.FC<Props> = ({
  application,
  templateSlug,
  lang,
  emailSendEnabled,
  onClose,
  onSent,
}) => {
  const [rendered, setRendered] = useState<RenderedEmail | null>(null);
  const [editedSubject, setEditedSubject] = useState('');
  const [editedBody, setEditedBody] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [marking, setMarking] = useState(false);
  const [bodyView, setBodyView] = useState<'preview' | 'html' | 'plain'>('preview');
  const [currentLang, setCurrentLang] = useState<'de' | 'en'>(lang);
  const [hasEdits, setHasEdits] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const r = await renderEmailForApplication(application, templateSlug, currentLang, 'applications');
        if (cancelled) return;
        setRendered(r);
        setEditedSubject(r.subject);
        setEditedBody(r.bodyHtml);
        setHasEdits(false);
      } catch (e) {
        if (!cancelled) toast.error(`Vorschau-Fehler: ${(e as Error).message}`);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [application.id, templateSlug, currentLang]);

  const handleLangSwitch = (newLang: 'de' | 'en') => {
    if (newLang === currentLang) return;
    if (hasEdits) {
      const confirm = window.confirm(
        `${newLang === 'en' ? 'Switch to English' : 'Auf Deutsch wechseln'}?\n\nDeine Edits werden überschrieben.`
      );
      if (!confirm) return;
    }
    setCurrentLang(newLang);
  };

  if (!rendered && !loading) return null;

  const label = TEMPLATE_LABEL[templateSlug]?.[currentLang] ?? templateSlug;
  const newStage = STAGE_AFTER_SEND[templateSlug];

  const editedBodyPlain = editedBody
    .replace(/<a [^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, '$2 ($1)')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<li>/gi, '• ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  const handleSend = async () => {
    if (!emailSendEnabled || !rendered) return;
    setSending(true);
    try {
      const { error } = await supabase.functions.invoke('send-email', {
        body: {
          application_id: application.id,
          template_slug: templateSlug,
          lang: currentLang,
          subject_override: editedSubject,
          body_override: editedBody,
        },
      });
      if (error) throw error;
      toast.success(`Mail an ${application.full_name} gesendet`);
      onSent(newStage);
      onClose();
    } catch (e) {
      toast.error(`Send fehlgeschlagen: ${(e as Error).message}`);
    } finally {
      setSending(false);
    }
  };

  const handleMarkAsSent = async () => {
    setMarking(true);
    try {
      const updates: Record<string, unknown> = newStage ? { stage: newStage } : {};
      if (templateSlug === 'task_invite') updates.task_sent_at = new Date().toISOString();
      if (templateSlug === 'rejection') updates.decided_at = new Date().toISOString();

      if (Object.keys(updates).length > 0) {
        const { error } = await supabase
          .from('applications')
          .update(updates)
          .eq('id', application.id);
        if (error) throw error;
      }
      toast.success(`Als gesendet markiert${newStage ? ` (Stage: ${newStage})` : ''}`);
      onSent(newStage);
      onClose();
    } catch (e) {
      toast.error(`Stage-Update fehlgeschlagen: ${(e as Error).message}`);
    } finally {
      setMarking(false);
    }
  };

  const handleOpenInMail = () => {
    const mailtoUrl = `mailto:${encodeURIComponent(application.email)}?subject=${encodeURIComponent(
      editedSubject
    )}&body=${encodeURIComponent(editedBodyPlain)}`;
    window.location.href = mailtoUrl;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-3xl max-h-[92vh] overflow-y-auto bg-white rounded-2xl shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white border-b border-black/[0.06] px-6 py-4 flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h3 className="text-lg font-black text-[#1d1d1f]">Mail an {application.full_name}</h3>
              <div className="flex items-center gap-0.5 bg-black/[0.04] border border-black/[0.08] rounded-md p-0.5">
                <button
                  type="button"
                  onClick={() => handleLangSwitch('de')}
                  className={`px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider transition-all ${
                    currentLang === 'de'
                      ? 'bg-white text-[#1d1d1f] shadow-sm'
                      : 'text-[#6e6e73] hover:text-[#1d1d1f]'
                  }`}
                  title="Deutsche Vorlage laden"
                >
                  DE
                </button>
                <button
                  type="button"
                  onClick={() => handleLangSwitch('en')}
                  className={`px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider transition-all ${
                    currentLang === 'en'
                      ? 'bg-white text-[#1d1d1f] shadow-sm'
                      : 'text-[#6e6e73] hover:text-[#1d1d1f]'
                  }`}
                  title="English template laden"
                >
                  EN
                </button>
              </div>
            </div>
            <p className="text-xs text-[#6e6e73] mt-1">
              Template: <span className="font-semibold">{label}</span>
              {!emailSendEnabled && (
                <span className="ml-2 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded bg-amber-100 text-amber-900">
                  Resend offline · Senden via Mail-App
                </span>
              )}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-[#6e6e73] hover:text-[#1d1d1f] text-2xl leading-none px-2"
            aria-label="Schließen"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Spinner className="w-6 h-6" />
            </div>
          )}

          {rendered && !loading && (
            <>
              {!rendered.templateFound && (
                <div className="rounded-md bg-rose-50 border border-rose-200 p-3 text-sm text-rose-900">
                  ⚠️ Template <code>{templateSlug}</code> nicht in DB gefunden — angezeigter Inhalt ist Platzhalter.
                </div>
              )}
              {!rendered.calendlyUrlUsed && /interview/i.test(templateSlug) && (
                <div className="rounded-md bg-amber-50 border border-amber-200 p-3 text-sm text-amber-900">
                  ⚠️ Kein Calendly-Link gesetzt — weder bei Funnel-Owner noch zentral.
                  Body enthält Platzhalter <code>[CALENDLY-LINK FEHLT]</code>.
                </div>
              )}

              <div className="grid grid-cols-[80px_1fr] gap-x-3 gap-y-2 text-sm">
                <span className="text-[#6e6e73] font-bold pt-2">From</span>
                <span className="pt-2 text-[#1d1d1f] font-mono text-xs">{rendered.fromName} &lt;{rendered.fromEmail}&gt;</span>
                <span className="text-[#6e6e73] font-bold pt-2">To</span>
                <div className="flex items-center gap-2 pt-2">
                  <span className="text-[#1d1d1f] font-mono text-xs">{rendered.to}</span>
                  <button
                    onClick={() => copyToClipboard(rendered.to, 'Adresse')}
                    className="text-[10px] font-bold uppercase tracking-wider text-[#6e6e73] hover:text-[#1d1d1f] px-1.5 py-0.5 rounded border border-black/[0.08]"
                  >
                    Copy
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#6e6e73] mb-1.5">
                  Subject
                </label>
                <input
                  type="text"
                  value={editedSubject}
                  onChange={(e) => { setEditedSubject(e.target.value); setHasEdits(true); }}
                  className="w-full px-3 py-2 text-sm bg-black/[0.03] border border-black/[0.08] rounded-md text-[#1d1d1f] focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#6e6e73]">
                    Body
                  </label>
                  <div className="flex items-center gap-0.5 bg-black/[0.04] border border-black/[0.08] rounded-md p-0.5">
                    <button
                      type="button"
                      onClick={() => setBodyView('preview')}
                      className={`px-3 py-1 rounded text-[11px] font-bold uppercase tracking-wider transition-all ${
                        bodyView === 'preview'
                          ? 'bg-white text-[#1d1d1f] shadow-sm'
                          : 'text-[#6e6e73] hover:text-[#1d1d1f]'
                      }`}
                    >
                      Vorschau
                    </button>
                    <button
                      type="button"
                      onClick={() => setBodyView('html')}
                      className={`px-3 py-1 rounded text-[11px] font-bold uppercase tracking-wider transition-all ${
                        bodyView === 'html'
                          ? 'bg-white text-[#1d1d1f] shadow-sm'
                          : 'text-[#6e6e73] hover:text-[#1d1d1f]'
                      }`}
                    >
                      HTML bearbeiten
                    </button>
                    <button
                      type="button"
                      onClick={() => setBodyView('plain')}
                      className={`px-3 py-1 rounded text-[11px] font-bold uppercase tracking-wider transition-all ${
                        bodyView === 'plain'
                          ? 'bg-white text-[#1d1d1f] shadow-sm'
                          : 'text-[#6e6e73] hover:text-[#1d1d1f]'
                      }`}
                    >
                      Plain-Text
                    </button>
                  </div>
                </div>

                {bodyView === 'preview' && (
                  <div
                    className="prose prose-sm max-w-none px-4 py-3 bg-white border border-black/[0.08] rounded-md text-[#1d1d1f] min-h-[280px] [&_a]:text-[#0F766E] [&_a]:underline [&_p]:my-3 [&_strong]:font-bold"
                    dangerouslySetInnerHTML={{ __html: editedBody }}
                  />
                )}

                {bodyView === 'html' && (
                  <textarea
                    rows={14}
                    value={editedBody}
                    onChange={(e) => { setEditedBody(e.target.value); setHasEdits(true); }}
                    className="w-full px-3 py-2 text-sm bg-black/[0.03] border border-black/[0.08] rounded-md text-[#1d1d1f] font-mono focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
                  />
                )}

                {bodyView === 'plain' && (
                  <pre className="px-4 py-3 bg-black/[0.03] border border-black/[0.08] rounded-md whitespace-pre-wrap text-[#515154] text-sm min-h-[280px] font-sans">
                    {editedBodyPlain}
                  </pre>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer Actions */}
        {rendered && !loading && (
          <div className="sticky bottom-0 bg-white border-t border-black/[0.06] px-6 py-4 space-y-3">
            {/* Primary Send Row — mailto is prominent while Resend is offline */}
            <div className="flex flex-wrap gap-2">
              {emailSendEnabled ? (
                <>
                  <button
                    onClick={handleSend}
                    disabled={sending}
                    className="flex-1 min-w-[180px] px-4 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-bold rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm"
                  >
                    {sending && <Spinner className="w-4 h-4" />}
                    📤 Senden via Resend
                  </button>
                  <button
                    onClick={handleOpenInMail}
                    className="flex-1 min-w-[180px] px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-lg transition-colors"
                    title="Öffnet deine Mail-App mit vorausgefülltem To/Subject/Body"
                  >
                    ✉️ In Mail-App öffnen
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={handleOpenInMail}
                    className="flex-1 min-w-[200px] px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm"
                    title="Öffnet deine Mail-App mit vorausgefülltem To/Subject/Body — von dort senden"
                  >
                    ✉️ Senden via Mail-App
                  </button>
                  <button
                    disabled
                    className="flex-1 min-w-[160px] px-4 py-3 bg-black/[0.04] text-[#a1a1a6] text-sm font-bold rounded-lg cursor-not-allowed flex items-center justify-center gap-2"
                    title="Resend Domain noch nicht verifiziert — bis dahin via Mail-App senden"
                  >
                    🔒 Resend offline
                  </button>
                </>
              )}
            </div>

            {/* Secondary Actions Row */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleMarkAsSent}
                disabled={marking}
                className="flex-1 min-w-[180px] px-3 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
                title="Stage updaten ohne zu senden — wenn du bereits aus deiner Mail-App gesendet hast"
              >
                {marking && <Spinner className="w-3 h-3" />}
                ✓ Als gesendet markieren {newStage && <span className="opacity-80">→ {newStage}</span>}
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-black/[0.04] hover:bg-black/[0.08] text-[#1d1d1f] text-xs font-bold rounded-lg transition-colors"
              >
                Abbrechen
              </button>
            </div>

            {/* Copy Helpers Row */}
            <div className="flex flex-wrap gap-2 pt-2 border-t border-black/[0.04]">
              <span className="self-center text-[10px] font-bold uppercase tracking-wider text-[#6e6e73] mr-1">
                Manuell:
              </span>
              <button
                onClick={() => copyToClipboard(editedSubject, 'Subject')}
                className="px-2.5 py-1.5 bg-black/[0.04] hover:bg-black/[0.08] text-[#1d1d1f] text-[11px] font-bold rounded transition-colors"
              >
                📋 Subject
              </button>
              <button
                onClick={() => copyToClipboard(editedBody, 'HTML-Body')}
                className="px-2.5 py-1.5 bg-black/[0.04] hover:bg-black/[0.08] text-[#1d1d1f] text-[11px] font-bold rounded transition-colors"
              >
                📋 HTML
              </button>
              <button
                onClick={() => copyToClipboard(editedBodyPlain, 'Plain-Text')}
                className="px-2.5 py-1.5 bg-black/[0.04] hover:bg-black/[0.08] text-[#1d1d1f] text-[11px] font-bold rounded transition-colors"
              >
                📋 Plain-Text
              </button>
              <button
                onClick={() => copyToClipboard(application.email, 'E-Mail-Adresse')}
                className="px-2.5 py-1.5 bg-black/[0.04] hover:bg-black/[0.08] text-[#1d1d1f] text-[11px] font-bold rounded transition-colors"
              >
                📋 To-Adresse
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmailComposeModal;
