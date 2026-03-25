import React, { useState, useEffect } from 'react';
import { getProjectAreas, addProjectArea, updateProjectArea, deleteProjectArea } from '@/lib/actions';
import type { ProjectArea } from '@/types';
import Spinner from '@/components/ui/Spinner';
import Card from '@/components/ui/Card';
import { toast } from 'sonner';
import { ConfirmModal } from '@/components/ui/ConfirmModal';

const ProjectAreaManager: React.FC = () => {
  const [projectAreas, setProjectAreas] = useState<ProjectArea[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newAreaName, setNewAreaName] = useState('');
  const [newAreaDescription, setNewAreaDescription] = useState('');
  const [editingArea, setEditingArea] = useState<ProjectArea | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  useEffect(() => {
    fetchProjectAreas();
  }, []);

  const fetchProjectAreas = async () => {
    setLoading(true);
    setError(null);
    const data = await getProjectAreas();
    if (data) {
      setProjectAreas(data);
    } else {
      setError('Failed to fetch project areas.');
    }
    setLoading(false);
  };

  const handleAddOrUpdateArea = async () => {
    if (!newAreaName.trim()) {
      toast.error('Project area name cannot be empty.');
      return;
    }
    setIsSaving(true);
    setError(null);

    let result: ProjectArea | null;
    if (editingArea) {
      result = await updateProjectArea(editingArea.id, newAreaName, newAreaDescription);
    } else {
      result = await addProjectArea(newAreaName, newAreaDescription);
    }

    if (result) {
      setNewAreaName('');
      setNewAreaDescription('');
      setEditingArea(null);
      fetchProjectAreas(); // Refresh the list
    } else {
      setError(`Failed to ${editingArea ? 'update' : 'add'} project area.`);
    }
    setIsSaving(false);
  };

  const handleDeleteArea = (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Project Area',
      message: 'Are you sure you want to delete this project area?',
      onConfirm: async () => {
        setError(null);
        const success = await deleteProjectArea(id);
        if (success) {
          fetchProjectAreas();
        } else {
          setError('Failed to delete project area.');
        }
      },
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner />
      </div>
    );
  }

  if (error) {
    return <div className="text-red-500 text-center py-20">{error}</div>;
  }

  return (
    <>
    {confirmModal && (
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={() => { confirmModal.onConfirm(); setConfirmModal(null); }}
        onCancel={() => setConfirmModal(null)}
        variant="danger"
      />
    )}
    <div className="max-w-4xl mx-auto animate-[fadeIn_0.5s_ease-out]">
      <h2 className="text-3xl font-black text-gray-900 dark:text-white tracking-tighter mb-6">
        Manage Project Areas
      </h2>

      {/* Add/Edit Form */}
      <Card title={editingArea ? 'Edit Project Area' : 'Add New Project Area'}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Name
            </label>
            <input
              type="text"
              value={newAreaName}
              onChange={(e) => setNewAreaName(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-md"
              placeholder="e.g., Frontend Development"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description (for applicants)
            </label>
            <textarea
              rows={3}
              value={newAreaDescription}
              onChange={(e) => setNewAreaDescription(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-md"
              placeholder="A short description of what this role entails..."
            />
          </div>
          <div className="flex justify-end gap-2">
            {editingArea && (
              <button
                onClick={() => {
                  setEditingArea(null);
                  setNewAreaName('');
                  setNewAreaDescription('');
                }}
                className="px-4 py-2 bg-gray-200 dark:bg-slate-600 text-gray-800 dark:text-white rounded-md"
              >
                Cancel Edit
              </button>
            )}
            <button
              onClick={handleAddOrUpdateArea}
              disabled={isSaving}
              className="px-4 py-2 bg-blue-600 text-white rounded-md flex items-center"
            >
              {isSaving && <Spinner className="w-4 h-4 mr-2" />}
              {editingArea ? 'Update Area' : 'Add Area'}
            </button>
          </div>
        </div>
      </Card>

      {/* Project Areas List */}
      <h3 className="text-xl font-bold text-gray-900 dark:text-white mt-8 mb-4">
        Existing Project Areas
      </h3>
      <div className="space-y-4">
        {projectAreas.length === 0 ? (
          <p className="text-gray-500">No project areas defined yet.</p>
        ) : (
          projectAreas.map((area) => (
            <Card key={area.id}>
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-bold text-lg text-gray-900 dark:text-white">
                    {area.name}
                  </h4>
                  <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                    {area.description || 'No description provided.'}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setEditingArea(area);
                      setNewAreaName(area.name);
                      setNewAreaDescription(area.description || '');
                    }}
                    className="px-3 py-1 bg-yellow-500/20 text-yellow-600 text-xs rounded-md hover:bg-yellow-500/30"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteArea(area.id)}
                    className="px-3 py-1 bg-red-500/20 text-red-600 text-xs rounded-md hover:bg-red-500/30"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
    </>
  );
};

export default ProjectAreaManager;
