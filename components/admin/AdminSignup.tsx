
import React, { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import SpinnerIcon from '../icons/SpinnerIcon';
import UserIcon from '../icons/UserIcon';

interface AdminSignupProps {
  onBackToLogin: () => void;
}

const AdminSignup: React.FC<AdminSignupProps> = ({ onBackToLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
    } else {
      setSuccess(true);
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="max-w-md mx-auto mt-20 bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-xl border border-gray-100 dark:border-slate-700 text-center">
        <div className="mb-4 inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Account Created</h2>
        <p className="text-gray-500 mt-2 mb-6 text-sm">Please check your email to confirm your registration.</p>
        <button onClick={onBackToLogin} className="text-primary-600 font-medium hover:underline text-sm">Back to Login</button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto mt-20 bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-xl border border-gray-100 dark:border-slate-700">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">New Recruiter Account</h2>
        <p className="text-gray-500 text-sm mt-2">Create an account to manage the hiring pipeline.</p>
      </div>

      <form onSubmit={handleSignup} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Email</label>
          <input 
            type="email" 
            required 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-slate-700 dark:border-slate-600 outline-none"
            placeholder="name@company.com"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Password</label>
          <input 
            type="password" 
            required 
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-slate-700 dark:border-slate-600 outline-none"
            placeholder="••••••••"
          />
        </div>

        {error && (
          <div className="p-3 bg-red-50 text-red-600 text-xs rounded-lg border border-red-100">
            {error}
          </div>
        )}

        <button 
          type="submit" 
          disabled={loading}
          className="w-full py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-bold transition-colors flex justify-center items-center"
        >
          {loading ? <SpinnerIcon className="w-5 h-5 animate-spin mr-2" /> : 'Register'}
        </button>
      </form>

      <div className="mt-6 text-center">
        <button onClick={onBackToLogin} className="text-xs text-gray-500 hover:text-primary-600">
          Already have an account? Log in now
        </button>
      </div>
    </div>
  );
};

export default AdminSignup;
