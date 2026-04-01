import React, { useState, useEffect } from 'react';
import { getAllApplications, updateApplicationStage } from '@/lib/actions';
import type { Application, ApplicationStage } from '@/types';
import Spinner from '@/components/ui/Spinner';
import { toast } from 'sonner';

// Stage badge color map
const stageBadgeClasses: Record<string, string> = {
  applied: 'bg-blue-500/15 text-blue-400',
  task_requested: 'bg-amber-500/15 text-amber-400',
  task_submitted: 'bg-emerald-500/15 text-emerald-400',
  interview: 'bg-indigo-500/15 text-indigo-400',
  hired: 'bg-violet-500/15 text-violet-400',
  onboarding: 'bg-teal-500/15 text-teal-400',
  rejected: 'bg-red-500/15 text-red-400',
};

// Define the columns for the Kanban board
const columns: { id: ApplicationStage; title: string }[] = [
  { id: 'applied', title: 'Applied' },
  { id: 'task_requested', title: 'Task Sent' },
  { id: 'task_submitted', title: 'Task Submitted' },
  { id: 'interview', title: 'Interview' },
  { id: 'hired', title: '🎉 Hired' },
  { id: 'onboarding', title: '🚀 Onboarding' },
  { id: 'rejected', title: 'Rejected' },
];

const KanbanCard: React.FC<{
  application: Application;
  onClick: () => void;
}> = ({ application, onClick }) => {
  return (
    <div
      onClick={onClick}
      className="bg-surface-800/60 p-4 rounded-lg shadow border border-white/[0.06] mb-4 cursor-pointer hover:bg-surface-800/80 backdrop-blur-sm"
    >
      <h4 className="font-bold text-sm text-white">
        {application.full_name}
      </h4>
      <p className="text-xs text-slate-500">{application.email}</p>
      <span className={`mt-2 inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${stageBadgeClasses[application.stage] ?? 'bg-slate-500/15 text-slate-400'}`}>
        {application.stage}
      </span>
    </div>
  );
};

const UpdateStageModal: React.FC<{
  application: Application;
  onClose: () => void;
  onUpdate: (newStage: ApplicationStage) => void;
}> = ({ application, onClose, onUpdate }) => {
  const [newStage, setNewStage] = useState(application.stage);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (newStage === 'hired') {
      toast.error('Use the "Hire" button in the applicant detail view — this creates the intern account and sends the invite.');
      return;
    }
    setIsSaving(true);
    const success = await updateApplicationStage(application.id, newStage);
    if (success) {
      onUpdate(newStage);
    } else {
      toast.error('Failed to update stage. Please try again.');
    }
    setIsSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-surface-800 border border-white/[0.08] rounded-lg shadow-xl p-8 w-full max-w-md">
        <h2 className="text-xl font-bold text-white mb-4">
          Update Stage for {application.full_name}
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              New Stage
            </label>
            <select
              value={newStage}
              onChange={(e) => setNewStage(e.target.value as ApplicationStage)}
              className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.10] text-slate-100 rounded-md"
            >
              {columns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-4">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white/[0.08] text-slate-100 rounded-md"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 bg-blue-600 text-white rounded-md flex items-center"
          >
            {isSaving && <Spinner className="w-4 h-4 mr-2" />}
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

const KanbanBoard: React.FC = () => {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);

  useEffect(() => {
    fetchApps();
  }, []);

  const fetchApps = async () => {
    setLoading(true);
    const apps = await getAllApplications();
    setApplications(apps);
    setLoading(false);
  };

  const handleUpdateStage = (newStage: ApplicationStage) => {
    if (selectedApp) {
      // Update the local state to reflect the change immediately
      setApplications((prevApps) =>
        prevApps.map((app) =>
          app.id === selectedApp.id ? { ...app, stage: newStage } : app
        )
      );
      setSelectedApp(null); // Close the modal
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner />
      </div>
    );
  }

  return (
    <>
      <div className="flex gap-4 md:gap-6 p-2 md:p-4 overflow-x-auto -mx-2 md:mx-0">
        {columns.map((column) => (
          <div
            key={column.id}
            className="w-72 bg-surface-900/60 rounded-xl flex-shrink-0"
          >
            <div className="p-4 border-b border-white/[0.06]">
              <h3 className="font-bold text-white">
                {column.title}
              </h3>
            </div>
            <div className="p-4">
              {applications
                .filter((app) => app.stage === column.id)
                .map((app) => (
                  <KanbanCard
                    key={app.id}
                    application={app}
                    onClick={() => setSelectedApp(app)}
                  />
                ))}
            </div>
          </div>
        ))}
      </div>
      {selectedApp && (
        <UpdateStageModal
          application={selectedApp}
          onClose={() => setSelectedApp(null)}
          onUpdate={handleUpdateStage}
        />
      )}
    </>
  );
};

export default KanbanBoard;
