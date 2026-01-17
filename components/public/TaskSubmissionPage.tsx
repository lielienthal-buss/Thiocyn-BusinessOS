// components/public/TaskSubmissionPage.tsx - V2 Feature
import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';

// --- Helper Components ---
const QuestionCard: React.FC<{ title: string; children: React.ReactNode; className?: string }> = ({ title, children, className }) => (
  <div className={`p-6 sm:p-8 rounded-xl bg-slate-800/60 backdrop-blur-lg border border-white/10 ${className}`}>
    <h3 className="text-white font-bold text-lg mb-4">{title}</h3>
    {children}
  </div>
);

const ThankYouView: React.FC = () => (
  <div className="text-center p-8 bg-green-900/50 border border-green-500/30 rounded-lg animate-[fadeIn_0.5s_ease-out]">
    <h2 className="text-3xl font-bold text-white mb-2">Thank You!</h2>
    <p className="text-green-300/80">Your submission has been received. Our team will get back to you shortly.</p>
  </div>
);

// --- Main Component ---
const TaskSubmissionPage: React.FC = () => {
  const [token, setToken] = useState<string | null>(null);
  const [answer, setAnswer] = useState('');
  const [view, setView] = useState<'form' | 'submitted' | 'error'>('form');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Extract token from URL path: /task/some-uuid
    const pathParts = window.location.pathname.split('/');
    const tokenFromUrl = pathParts[pathParts.length - 1];
    
    // Basic UUID validation
    if (tokenFromUrl && /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(tokenFromUrl)) {
      setToken(tokenFromUrl);
    } else {
      setError("Invalid or missing access token in the URL.");
      setView('error');
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || answer.trim() === '') {
      setError("Answer cannot be empty.");
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
      console.error("RPC Error:", rpcError);
      setError("Failed to submit your work sample. Please try again or contact us.");
      setView('error');
    } else {
      setView('submitted');
    }
  };

  if (view === 'submitted') {
    return <ThankYouView />;
  }

  if (view === 'error') {
    return (
       <div className="text-center p-8 bg-red-900/50 border border-red-500/30 rounded-lg">
        <h2 className="text-3xl font-bold text-white mb-2">Error</h2>
        <p className="text-red-300/80">{error}</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto animate-[fadeIn_0.5s_ease-out]">
       <div className="text-center mb-8">
        <h1 className="text-4xl font-black text-gray-900 dark:text-white tracking-tighter">Final Stage: Work Sample</h1>
        <p className="text-gray-500 text-sm mt-1">
          This is your opportunity to show us how you think.
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <QuestionCard title="Case Study: Handling a Customer Conflict">
          <div className="prose prose-invert prose-sm text-gray-300 space-y-4">
            <p>Imagine you are responsible for customer success at a small e-commerce company that sells handmade goods.</p>
            <p>A customer writes in, angry. They ordered a personalized item for a wedding anniversary, but it arrived two days late and the personalization is misspelled. They are demanding a full refund and are threatening to post a negative review on social media.</p>
            <p>Your company policy states that personalized items are non-refundable, but you also have the authority to make exceptions to ensure customer satisfaction.</p>
            <p><strong>Your Task:</strong> Write the exact email response you would send to this customer. Your goal is to de-escalate the situation, solve the customer's problem, and protect the company's reputation.</p>
          </div>
        </QuestionCard>

        <textarea
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          className="input-field w-full h-64 resize-none mt-6"
          placeholder="Write your email response here..."
          required
        />

        <div className="text-center mt-6">
          <button type="submit" disabled={submitting} className="px-8 py-4 bg-green-600 hover:bg-green-700 rounded-xl text-white font-semibold transition shadow-md hover:shadow-xl disabled:bg-gray-500">
            {submitting ? "Submitting..." : "Submit Work Sample"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default TaskSubmissionPage;
