// components/public/TaskSubmissionPage.tsx
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

interface HiringTask {
  id: string;
  title: string;
  instructions: string;
}

const TaskSubmissionPage: React.FC = () => {
  const [token, setToken] = useState<string | null>(null);
  const [task, setTask] = useState<HiringTask | null>(null);
  const [answer, setAnswer] = useState('');
  const [view, setView] = useState<'loading' | 'form' | 'submitted' | 'error'>('loading');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const pathParts = window.location.pathname.split('/');
    const tokenFromUrl = pathParts[pathParts.length - 1];

    if (!/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(tokenFromUrl)) {
      setError('Invalid or missing access token.');
      setView('error');
      return;
    }

    setToken(tokenFromUrl);

    // Load active task from DB
    supabase.from('hiring_tasks').select('id, title, instructions').eq('is_active', true).maybeSingle()
      .then(({ data }) => {
        if (data) {
          setTask(data as HiringTask);
          setView('form');
        } else {
          setError('No active task found. Please contact the team.');
          setView('error');
        }
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || answer.trim() === '') {
      setError('Answer cannot be empty.');
      return;
    }
    setSubmitting(true);
    setError('');

    const { error: rpcError } = await supabase.rpc('submit_task_response', {
      p_token: token,
      p_answer: answer,
    });

    setSubmitting(false);

    if (rpcError) {
      setError('Failed to submit. Please try again or contact us.');
      setView('error');
    } else {
      setView('submitted');
    }
  };

  if (view === 'loading') {
    return (
      <div className="flex justify-center items-center py-32">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (view === 'submitted') {
    return (
      <div className="text-center p-8 bg-green-900/50 border border-green-500/30 rounded-xl animate-[fadeIn_0.5s_ease-out]">
        <h2 className="text-3xl font-bold text-white mb-2">Thank You!</h2>
        <p className="text-green-300/80">Your submission has been received. Our team will get back to you shortly.</p>
      </div>
    );
  }

  if (view === 'error') {
    return (
      <div className="text-center p-8 bg-red-900/50 border border-red-500/30 rounded-xl">
        <h2 className="text-3xl font-bold text-white mb-2">Error</h2>
        <p className="text-red-300/80">{error}</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto animate-[fadeIn_0.5s_ease-out]">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-black text-white tracking-tighter">Work Sample</h1>
        <p className="text-slate-400 text-sm mt-1">Show us how you think.</p>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Task instructions from DB */}
        <div className="p-6 sm:p-8 rounded-xl bg-slate-800/60 backdrop-blur-lg border border-white/10 mb-6">
          <h3 className="text-white font-bold text-lg mb-4">{task?.title}</h3>
          <div className="prose prose-invert prose-sm text-gray-300 space-y-4"
            dangerouslySetInnerHTML={{ __html: task?.instructions ?? '' }} />
        </div>

        <textarea
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          className="w-full px-4 py-3 bg-slate-800/60 border border-white/10 text-slate-100 placeholder-slate-500 rounded-xl text-sm h-64 resize-none focus:outline-none focus:ring-2 focus:ring-amber-500/40"
          placeholder="Write your answer here..."
          required
        />
        {error && <p className="text-red-400 text-sm mt-2">{error}</p>}

        <div className="text-center mt-6">
          <button type="submit" disabled={submitting}
            className="px-8 py-4 bg-amber-500 hover:bg-amber-400 rounded-xl text-black font-bold transition shadow-md hover:shadow-xl disabled:opacity-50">
            {submitting ? 'Submitting…' : 'Submit Work Sample'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default TaskSubmissionPage;
