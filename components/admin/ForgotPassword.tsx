import React, { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Spinner from '@/components/ui/Spinner';
import { useNavigate } from 'react-router-dom';

const ForgotPassword: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/?adminView=reset-password',
    });

    if (error) {
      setMessage({ type: 'error', text: error.message });
    } else {
      setMessage({
        type: 'success',
        text: 'Password reset email has been sent.',
      });
    }
    setLoading(false);
  };

  return (
    <div className="max-w-md mx-auto mt-20 p-8 rounded-2xl shadow-xl bg-white ring-1 ring-slate-200">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-slate-900">
          Forgot Password?
        </h2>
        <p className="text-gray-500 text-sm mt-2">
          Enter your email to receive a reset link.
        </p>
      </div>

      <form onSubmit={handleReset} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-2 border border-slate-200 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 placeholder-slate-400"
            placeholder="name@company.com"
          />
        </div>

        {message && (
          <div
            className={`p-3 text-xs rounded-lg border ${message.type === 'success' ? 'bg-green-50 text-green-600 border-green-100' : 'bg-red-50 text-red-600 border-red-100'}`}
          >
            {message.text}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-bold transition-colors flex justify-center items-center"
        >
          {loading ? <Spinner className="w-5 h-5 mr-2" /> : 'Request Link'}
        </button>
      </form>

      <div className="mt-6 text-center">
        <button
          onClick={() => navigate('/admin')}
          className="px-4 py-2 bg-primary-600 text-white text-xs font-bold rounded-lg"
        >
          &larr; Back to Login
        </button>
      </div>
    </div>
  );
};

export default ForgotPassword;
