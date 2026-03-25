import React, { useState, useEffect } from 'react';
import { getAllApplications, updateApplicationStage } from '@/lib/actions';
import type { Application, ApplicationStage } from '@/types';
import Spinner from '@/components/ui/Spinner';
import { toast } from 'sonner';

// Stage badge color map
const stageBadgeClasses: Record<string, string> = {
  applied: 'bg-blue-100 text-blue-700',
  task_requested: 'bg-amber-100 text-amber-700',
  task_submitted: 'bg-green-100 text-green-700',
  interview: 'bg-indigo-100 text-indigo-700',
  hired: 'bg-purple-100 text-purple-700',
  onboarding: 'bg-teal-100 text-teal-700',
  rejected: 'bg-red-100 text-red-700',
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
      className="bg-white p-4 rounded-lg shadow border border-gray-200 mb-4 cursor-pointer hover:bg-gray-50"
    >
      <h4 className="font-bold text-sm text-gray-900">
        {application.full_name}
      </h4>
      <p className="text-xs text-gray-500">{application.email}</p>
      <span className={`mt-2 inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${stageBadgeClasses[application.stage] ?? 'bg-gray-100 text-gray-600'}`}>
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
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">
          Update Stage for {application.full_name}
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              New Stage
            </label>
            <select
              value={newStage}
              onChange={(e) => setNewStage(e.target.value as ApplicationStage)}
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md"
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
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md"
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
            className="w-72 bg-gray-50 rounded-xl flex-shrink-0"
          >
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-bold text-gray-900">
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
