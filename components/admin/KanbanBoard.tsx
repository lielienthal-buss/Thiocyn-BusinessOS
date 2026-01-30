import React, { useState, useEffect } from 'react';
import { getAllApplications } from '../../lib/actions';
import type { Application, ApplicationStage } from '../../types';
import Spinner from '../ui/Spinner';

// Define the columns for the Kanban board
const columns: { id: ApplicationStage; title: string }[] = [
  { id: 'applied', title: 'Applied' },
  { id: 'task_requested', title: 'Task Sent' },
  { id: 'task_submitted', title: 'Task Submitted' },
  { id: 'rejected', title: 'Rejected' },
  // We can add more stages like 'Interview' or 'Hired' later
];

const KanbanCard: React.FC<{ application: Application }> = ({
  application,
}) => {
  return (
    <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow border border-gray-200 dark:border-slate-700 mb-4">
      <h4 className="font-bold text-sm text-gray-900 dark:text-white">
        {application.full_name}
      </h4>
      <p className="text-xs text-gray-500">{application.email}</p>
    </div>
  );
};

const KanbanBoard: React.FC = () => {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchApps = async () => {
      setLoading(true);
      const apps = await getAllApplications();
      setApplications(apps);
      setLoading(false);
    };
    fetchApps();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="flex gap-6 p-4 overflow-x-auto">
      {columns.map((column) => (
        <div
          key={column.id}
          className="w-72 bg-gray-100 dark:bg-slate-900/50 rounded-xl flex-shrink-0"
        >
          <div className="p-4 border-b border-gray-200 dark:border-slate-700">
            <h3 className="font-bold text-gray-900 dark:text-white">
              {column.title}
            </h3>
          </div>
          <div className="p-4">
            {applications
              .filter((app) => app.stage === column.id)
              .map((app) => (
                <KanbanCard key={app.id} application={app} />
              ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default KanbanBoard;
