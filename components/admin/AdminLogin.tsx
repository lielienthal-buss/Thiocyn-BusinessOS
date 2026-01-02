
import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import SpinnerIcon from '../icons/SpinnerIcon';
import EmailIcon from '../icons/EmailIcon';

interface AdminLoginProps {
  onGoToSignup: () => void;
  onGoToForgot: () => void;
}

const AdminLogin: React.FC<AdminLoginProps> = ({ onGoToSignup, onGoToForgot }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConfigMissing, setIsConfigMissing] = useState(false);

  useEffect(() => {
    const url = (globalThis as any).process?.env?.NEXT_PUBLIC_SUPABASE_URL;
    if (!url || url.includes('placeholder')) {
      setIsConfigMissing(true);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
    }
  };

  const startDemo = () => {
    window.dispatchEvent(new CustomEvent('start-demo-mode'));
  };

  return (
    <div className="glass-card max-w-md mx-auto mt-20 p-8 rounded-[3rem] shadow-2xl animate-[fadeIn_0.5s_ease-out]">
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-[2rem] bg-primary-600 text-white shadow-2xl shadow-primary-500/40 mb-6">
           <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
        </div>
        <h2 className="text-3xl font-black text-gray-900 dark:text-white tracking-tighter">Recruiter Access</h2>
        <p className="text-gray-500 text-sm mt-2 font-medium">Pipeline Management System</p>
      </div>

      {isConfigMissing && (
        <div className="mb-8 p-6 rounded-[2rem] bg-orange-500/10 border border-orange-500/20 text-center">
          <p className="text-xs font-black text-orange-600 uppercase tracking-widest mb-4">Config Missing!</p>
          <p className="text-[10px] text-orange-500 font-bold mb-4 uppercase leading-tight">Supabase environment variables are not set yet.</p>
          <button 
            type="button"
            onClick={startDemo}
            className="w-full py-3 bg-orange-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-orange-600 transition-all shadow-lg shadow-orange-500/20"
          >
            Launch Preview (Demo Mode)
          </button>
        </div>
      )}

      <form onSubmit={handleLogin} className="space-y-6">
        <div>
          <label className="block text-[10px] font-black uppercase tracking-[0.2em] mb-2 ml-2 text-gray-400">Email Address</label>
          <div className="relative group">
            <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-gray-400">
              <EmailIcon className="w-4 h-4" />
            </span>
            <input 
              type="email" 
              required 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-white/50 dark:bg-slate-900/50 border border-gray-100 dark:border-slate-800 rounded-2xl focus:ring-2 focus:ring-primary-500 outline-none transition-all placeholder:text-gray-400"
              placeholder="name@company.com"
            />
          </div>
        </div>

        <div>
          <div className="flex justify-between items-center mb-2 ml-2">
            <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Password</label>
            <button type="button" onClick={onGoToForgot} className="text-[10px] font-black text-primary-600 uppercase">Forgot?</button>
          </div>
          <input 
            type="password" 
            required 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-4 bg-white/50 dark:bg-slate-900/50 border border-gray-100 dark:border-slate-800 rounded-2xl focus:ring-2 focus:ring-primary-500 outline-none transition-all placeholder:text-gray-400"
            placeholder="••••••••"
          />
        </div>

        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-black uppercase tracking-widest rounded-2xl animate-shake">
            {error}
          </div>
        )}

        <button 
          type="submit" 
          disabled={loading || isConfigMissing}
          className="w-full py-5 bg-primary-600 hover:bg-primary-700 text-white rounded-2xl font-black shadow-2xl shadow-primary-500/30 transition-all active:scale-[0.98] flex justify-center items-center disabled:opacity-50"
        >
          {loading ? <SpinnerIcon className="w-6 h-6 animate-spin mr-2" /> : 'Log In Now'}
        </button>
      </form>

      <div className="mt-10 text-center pt-6 border-t border-gray-50 dark:border-slate-800">
        <button onClick={onGoToSignup} className="text-[10px] font-black text-gray-400 hover:text-primary-600 uppercase tracking-widest transition-colors">
          No account? <span className="text-primary-600">Register here</span>
        </button>
      </div>
    </div>
  );
};

export default AdminLogin;
