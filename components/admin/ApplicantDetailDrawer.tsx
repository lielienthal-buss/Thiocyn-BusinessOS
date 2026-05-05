import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';
import type { Application, ApplicationStage } from '@/types';
import { updateApplicationStage } from '@/lib/actions';
import ApplicantDetailView from './ApplicantDetailView';

interface Props {
  application: Application;
  onClose: () => void;
  onStageChange?: (newStage: ApplicationStage) => void;
}

const STAGE_OPTIONS: { value: ApplicationStage; label: string }[] = [
  { value: 'applied', label: 'Applied' },
  { value: 'task_requested', label: 'Task Sent' },
  { value: 'task_submitted', label: 'Task Submitted' },
  { value: 'interview', label: 'Interview' },
  { value: 'hired', label: '🎉 Hired' },
  { value: 'onboarding', label: '🚀 Onboarding' },
  { value: 'rejected', label: 'Rejected' },
];

const ApplicantDetailDrawer: React.FC<Props> = ({ application, onClose, onStageChange }) => {
  const [savingStage, setSavingStage] = useState(false);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const handleQuickStageUpdate = async (newStage: ApplicationStage) => {
    if (newStage === application.stage) return;
    if (newStage === 'hired') {
      toast.error('Use the "Hire" button below — it creates the intern account and triggers the invite.');
      return;
    }
    setSavingStage(true);
    const success = await updateApplicationStage(application.id, newStage);
    if (success) {
      toast.success(`Stage → ${STAGE_OPTIONS.find((s) => s.value === newStage)?.label ?? newStage}`);
      onStageChange?.(newStage);
    } else {
      toast.error('Stage-Update fehlgeschlagen.');
    }
    setSavingStage(false);
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[60] flex">
      {/* Backdrop */}
      <div
        className="flex-1 bg-black/40 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]"
        onClick={onClose}
        aria-label="Close"
      />

      {/* Drawer Panel */}
      <aside
        className="relative w-full max-w-3xl bg-white shadow-2xl flex flex-col animate-[slideInRight_0.25s_cubic-bezier(0.32,0.72,0,1)] overflow-hidden"
        style={{ animationFillMode: 'both' }}
      >
        {/* Header */}
        <header className="shrink-0 border-b border-black/[0.06] px-6 py-3 flex items-center justify-between bg-white">
          <div className="flex items-center gap-4 min-w-0 flex-1">
            <h2 className="text-base font-black text-[#1d1d1f] truncate">
              {application.full_name}
            </h2>
            <select
              value={application.stage}
              onChange={(e) => handleQuickStageUpdate(e.target.value as ApplicationStage)}
              disabled={savingStage}
              className="px-2.5 py-1 text-xs font-bold bg-black/[0.04] border border-black/[0.08] rounded-md text-[#1d1d1f] focus:outline-none focus:ring-2 focus:ring-[#0F766E] disabled:opacity-50"
              title="Stage manuell ändern"
            >
              {STAGE_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={onClose}
            className="text-[#6e6e73] hover:text-[#1d1d1f] text-2xl leading-none px-2 ml-3"
            aria-label="Schließen"
            title="Schließen (Esc)"
          >
            ×
          </button>
        </header>

        {/* Body — full ApplicantDetailView inside scrollable area */}
        <div className="flex-1 overflow-y-auto">
          <ApplicantDetailView application={application} onReturn={onClose} />
        </div>
      </aside>

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>,
    document.body
  );
};

export default ApplicantDetailDrawer;
