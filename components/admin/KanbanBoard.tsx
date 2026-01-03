import React, { useEffect, useState } from 'react';
import { getApplications, updateApplicationStatus, seedMockData, addApplicationNote } from '../../lib/actions';
import type { Application, ApplicationStatus, ApplicationNote } from '../../types';
import SpinnerIcon from '../icons/SpinnerIcon';

const STATUS_COLUMNS: ApplicationStatus[] = ['applied', 'completed', 'reviewed', 'interview', 'hired', 'rejected'];

const BIG_FIVE_MAP: Record<string, { label: string, desc: string, color: string }> = {
  q1: { 
    label: "Extraversion", 
    desc: "Energy, sociability, and assertiveness.", 
    color: "bg-blue-500" 
  },
  q2: { 
    label: "Conscientiousness", 
    desc: "Organization, discipline, and reliability.", 
    color: "bg-purple-500" 
  },
  q3: { 
    label: "Agreeableness", 
    desc: "Compassion, empathy, and cooperation.", 
    color: "bg-teal-500" 
  },
  q4: { 
    label: "Emotional Stability", 
    desc: "Resilience to stress and negative emotions.", 
    color: "bg-orange-500" 
  },
  q5: { 
    label: "Openness", 
    desc: "Creativity, curiosity, and abstract thinking.", 
    color: "bg-indigo-500" 
  },
};

const KanbanBoard: React.FC = () => {
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [newNote, setNewNote] = useState('');
  const [noteLoading, setNoteLoading] = useState(false);
  const [draggedAppId, setDraggedAppId] = useState<string | null>(null);

  const refreshData = async () => {
    const data = await getApplications();
    setApps(data);
    setLoading(false);
    if (selectedApp) {
      const updated = data.find(a => a.id === selectedApp.id);
      if (updated) setSelectedApp(updated);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  const handleStatusChange = async (id: string, newStatus: ApplicationStatus) => {
    setApps(prev => prev.map(a => a.id === id ? { ...a, status: newStatus } : a));
    const success = await updateApplicationStatus(id, newStatus);
    if (!success) refreshData();
  };

  const handleSeed = async () => {
    setSeeding(true);
    const success = await seedMockData();
    if (success) await refreshData();
    setSeeding(false);
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApp || !newNote.trim()) return;

    setNoteLoading(true);
    const note = await addApplicationNote(selectedApp.id, newNote);
    if (note) {
      setNewNote('');
      await refreshData();
    }
    setNoteLoading(false);
  };

  // Drag and Drop Handlers
  const onDragStart = (e: React.DragEvent, id: string) => {
    setDraggedAppId(id);
    e.dataTransfer.setData('applicationId', id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const onDrop = async (e: React.DragEvent, status: ApplicationStatus) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('applicationId');
    if (id) {
      await handleStatusChange(id, status);
    }
    setDraggedAppId(null);
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-64 space-y-4">
      <SpinnerIcon className="w-10 h-10 animate-spin text-primary-600" />
      <p className="text-gray-500 animate-pulse font-medium">Loading pipeline...</p>
    </div>
  );

  const highScorers = apps.filter(a => (a.aiScore || 0) > 0.8).length;
  const totalApps = apps.length;

  return (
    <div className="space-y-10">
      {/* Bento Dashboard Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="glass-card p-6 rounded-[2rem] md:col-span-2 flex justify-between items-center bg-primary-600/5">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Total Applicants</p>
            <h4 className="text-4xl font-black text-gray-900 dark:text-white">{totalApps}</h4>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-primary-600 flex items-center justify-center text-white shadow-lg shadow-primary-500/20">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
          </div>
        </div>
        <div className="glass-card p-6 rounded-[2rem] flex flex-col justify-center bg-green-500/5">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">AI Top Matches</p>
          <div className="flex items-baseline gap-2">
            <h4 className="text-3xl font-black text-green-600">{highScorers}</h4>
            <span className="text-xs font-bold text-gray-400">/ {totalApps}</span>
          </div>
        </div>
        <div className="glass-card p-4 rounded-[2rem] flex items-center justify-center">
          <button 
            onClick={handleSeed}
            disabled={seeding}
            className="w-full h-full flex flex-col items-center justify-center gap-2 group"
          >
            <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-slate-800 flex items-center justify-center group-hover:scale-110 transition-transform">
              {seeding ? <SpinnerIcon className="w-5 h-5 animate-spin" /> : <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>}
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Mock Data</span>
          </button>
        </div>
      </div>

      {/* Kanban Section */}
      <div className="space-y-4">
        <h2 className="text-xs font-black text-gray-400 dark:text-slate-500 uppercase tracking-[0.4em] px-2">Pipeline View (Drag cards to move)</h2>
        <div className="flex gap-6 overflow-x-auto pb-12 min-h-[60vh] items-start scrollbar-hide">
          {STATUS_COLUMNS.map(column => (
            <div 
              key={column} 
              onDragOver={onDragOver}
              onDrop={(e) => onDrop(e, column)}
              className="w-80 flex-shrink-0 bg-white/10 dark:bg-slate-900/10 backdrop-blur-sm rounded-[2.5rem] p-5 border border-white/5 transition-all group/column"
            >
              <header className="flex justify-between items-center mb-8 px-2">
                <h3 className="font-black text-[11px] uppercase tracking-[0.15em] text-gray-500 dark:text-gray-400">{column}</h3>
                <span className="text-[10px] font-black bg-white dark:bg-slate-800 px-3 py-1 rounded-full text-gray-500 shadow-sm border border-white/10">
                  {apps.filter(a => a.status === column).length}
                </span>
              </header>

              <div className="space-y-4 min-h-[200px]">
                {apps.filter(a => a.status === column).map(app => (
                  <div 
                    key={app.id} 
                    draggable
                    onDragStart={(e) => onDragStart(e, app.id)}
                    onClick={() => setSelectedApp(app)}
                    className={`glass-card p-5 rounded-3xl shadow-lg hover:shadow-2xl hover:scale-[1.02] transition-all cursor-pointer group relative overflow-hidden ${draggedAppId === app.id ? 'opacity-40 grayscale' : ''}`}
                  >
                    <div className={`absolute top-0 left-0 w-1.5 h-full ${
                      app.status === 'hired' ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.4)]' : 
                      app.status === 'rejected' ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.4)]' : 
                      app.status === 'interview' ? 'bg-primary-500 shadow-[0_0_10px_rgba(59,130,246,0.4)]' : 'bg-gray-300 dark:bg-slate-700'
                    }`} />

                    <div className="flex justify-between items-start mb-1">
                      <h4 className="font-black text-gray-900 dark:text-white text-sm tracking-tight truncate pr-2">{app.fullName}</h4>
                      {app.aiScore !== undefined && (
                        <div className={`text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-tighter ${
                          app.aiScore > 0.8 ? 'bg-green-100 text-green-700 dark:bg-green-900/30' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {Math.round(app.aiScore * 100)}%
                        </div>
                      )}
                    </div>
                    <p className="text-[11px] font-medium text-gray-400 mb-5 truncate">{app.email}</p>
                    <div className="text-[9px] font-black text-primary-600 uppercase tracking-widest opacity-60">Click to view Details</div>
                  </div>
                ))}
                
                {apps.filter(a => a.status === column).length === 0 && (
                  <div className="py-12 border-2 border-dashed border-gray-100 dark:border-slate-800 rounded-[2.5rem] flex items-center justify-center bg-white/5">
                    <p className="text-[10px] text-gray-300 font-black uppercase tracking-widest">Drop here</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Application Detail Modal */}
      {selectedApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-md animate-in fade-in duration-300">
          <div className="glass-card w-full max-w-5xl max-h-[90vh] rounded-[3rem] overflow-hidden flex flex-col shadow-[0_0_50px_rgba(0,0,0,0.3)] border-white/20">
            {/* Modal Header */}
            <div className="p-8 border-b border-white/10 flex justify-between items-start bg-white/5">
              <div>
                <h2 className="text-3xl font-black text-gray-900 dark:text-white tracking-tighter">{selectedApp.fullName}</h2>
                <div className="flex gap-4 mt-2">
                  <a href={selectedApp.linkedinUrl} target="_blank" className="text-xs font-black text-primary-600 uppercase tracking-widest hover:underline">LinkedIn Profile</a>
                  <span className="text-gray-300">|</span>
                  <span className="text-xs font-black text-gray-500 uppercase tracking-widest">{selectedApp.email}</span>
                </div>
              </div>
              <button 
                onClick={() => setSelectedApp(null)}
                className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>

            {/* Modal Content - Bento Grid Layout */}
            <div className="flex-1 overflow-y-auto p-8 space-y-6 scrollbar-hide">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* AI Analysis Card */}
                <div className="glass-card p-6 rounded-[2rem] md:col-span-2 bg-indigo-500/5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-xl bg-indigo-500 text-white shadow-lg shadow-indigo-500/20">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                    </div>
                    <h3 className="font-black text-xs uppercase tracking-[0.2em] text-indigo-600">AI Screening Result</h3>
                  </div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 leading-relaxed italic">
                    "{selectedApp.aiAnalysis || "Analysis pending..."}"
                  </p>
                  {selectedApp.aiScore && (
                    <div className="mt-6">
                      <div className="flex justify-between items-baseline mb-1">
                        <span className="text-[10px] font-black uppercase text-gray-400">Match Probability</span>
                        <span className="text-2xl font-black text-indigo-600">{Math.round(selectedApp.aiScore * 100)}%</span>
                      </div>
                      <div className="w-full h-2 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-500" style={{ width: `${selectedApp.aiScore * 100}%` }}></div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Status Switcher Card */}
                <div className="glass-card p-6 rounded-[2rem] bg-gray-50/50 dark:bg-slate-900/50 border border-white/20">
                  <h3 className="font-black text-xs uppercase tracking-[0.2em] text-gray-400 mb-4">Pipeline Status</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {STATUS_COLUMNS.map(status => (
                      <button 
                        key={status}
                        onClick={() => handleStatusChange(selectedApp.id, status)}
                        className={`px-3 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                          selectedApp.status === status 
                            ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/20' 
                            : 'bg-white/50 dark:bg-slate-800/50 text-gray-400 hover:text-primary-600'
                        }`}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Big Five Personality Breakdown */}
                <div className="md:col-span-3 glass-card p-10 rounded-[3rem] bg-teal-500/5 border border-teal-500/10">
                   <header className="flex items-center gap-3 mb-10">
                     <div className="p-3 rounded-2xl bg-teal-500 text-white shadow-lg shadow-teal-500/20">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
                     </div>
                     <div>
                       <h3 className="font-black text-xs uppercase tracking-[0.2em] text-teal-600">Big Five Analysis</h3>
                       <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Psychometric Behavioral Breakdown</p>
                     </div>
                   </header>

                   <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                     {selectedApp.personalityData && Object.entries(BIG_FIVE_MAP).map(([key, config]) => {
                       const value = selectedApp.personalityData?.[key] || 0;
                       return (
                         <div key={key} className="space-y-4">
                           <div className="flex justify-between items-baseline">
                             <h4 className="font-black text-[11px] uppercase tracking-wider text-gray-800 dark:text-gray-200">{config.label}</h4>
                             <span className="text-sm font-black text-teal-600">{value}/5</span>
                           </div>
                           <div className="w-full h-2 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
                             <div className={`h-full ${config.color}`} style={{ width: `${(value / 5) * 100}%` }}></div>
                           </div>
                           <p className="text-[10px] text-gray-500 font-medium leading-relaxed italic">{config.desc}</p>
                         </div>
                       );
                     })}
                   </div>
                </div>

                {/* Internal Notes Section */}
                <div className="glass-card p-6 rounded-[2rem] md:col-span-3">
                  <h3 className="font-black text-xs uppercase tracking-[0.2em] text-gray-500 mb-6 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                    Internal Recruitment Notes
                  </h3>
                  
                  <div className="space-y-4 mb-8 max-h-60 overflow-y-auto pr-2 scrollbar-hide">
                    {selectedApp.notes && selectedApp.notes.length > 0 ? (
                      selectedApp.notes.map((note) => (
                        <div key={note.id} className="p-4 rounded-2xl bg-white/20 dark:bg-slate-800/20 border border-white/10 group/note relative">
                          <p className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-2">{note.note_text}</p>
                          <div className="flex justify-between text-[10px] font-black uppercase text-gray-400 tracking-widest">
                            <span>{note.author_email}</span>
                            <span>{new Date(note.created_at).toLocaleString('en-GB')}</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-400 font-medium italic text-center py-6">No internal notes yet.</p>
                    )}
                  </div>

                  <form onSubmit={handleAddNote} className="space-y-3">
                    <textarea 
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      placeholder="Add a recruiter observation..."
                      className="w-full p-4 bg-white/30 dark:bg-slate-900/30 rounded-2xl border border-white/20 focus:ring-2 focus:ring-primary-500 outline-none text-sm font-medium min-h-[80px] backdrop-blur-sm"
                    />
                    <div className="flex justify-end">
                      <button 
                        disabled={noteLoading || !newNote.trim()}
                        className="px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-xl shadow-primary-500/20 active:scale-[0.98] disabled:opacity-50 flex items-center gap-2"
                      >
                        {noteLoading && <SpinnerIcon className="w-3 h-3 animate-spin" />}
                        Save Note
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KanbanBoard;