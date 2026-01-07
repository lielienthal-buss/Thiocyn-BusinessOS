import React, { useState } from 'react';
import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient';
import SpinnerIcon from '../icons/SpinnerIcon';
import EmailIcon from '../icons/EmailIcon';

interface AdminLoginProps {
  onGoToForgot: () => void; // Removed onGoToSignup
}

const AdminLogin: React.FC<AdminLoginProps> = ({ onGoToForgot }) => { // Removed onGoToSignup
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const configured = isSupabaseConfigured();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!configured) return;
    
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
    <div className="max-w-md mx-auto mt-20 p-10 rounded-[3rem] shadow-2xl animate-[fadeIn_0.5s_ease-out] bg-gray-900/30 backdrop-blur-2xl border border-white/20">
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-[2.5rem] bg-gradient-to-br from-primary-500 to-primary-700 text-white shadow-2xl shadow-primary-500/40 mb-6 transform -rotate-6">
           <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
        </div>
        <h2 className="text-3xl font-black text-gray-900 dark:text-white tracking-tighter">Admin Hub</h2>
        <p className="text-gray-500 text-xs mt-2 font-bold uppercase tracking-widest opacity-60">Recruiter Pipeline Management</p>
      </div>

      {!configured ? (
        <div className="space-y-6">
          <div className="p-6 rounded-[2rem] bg-primary-500/5 border border-primary-500/10 text-center">
            <p className="text-[10px] text-primary-600 dark:text-primary-400 font-black mb-4 uppercase tracking-[0.2em] leading-relaxed">
              No Supabase Connection found.<br/>Using Sandbox Environment.
            </p>
            <button 
              type="button"
              onClick={startDemo}
              className="w-full py-5 bg-primary-600 hover:bg-primary-700 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all shadow-xl shadow-primary-500/30 hover:scale-[1.02] active:scale-[0.98]"
            >
              Enter Preview Dashboard
            </button>
          </div>
          <p className="text-center text-[9px] text-gray-400 font-bold uppercase tracking-widest">
            To use live data, please configure <br/> NEXT_PUBLIC_SUPABASE_URL
          </p>
        </div>
      ) : (
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
                placeholder="recruiter@takeashot.de"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2 ml-2">
              <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Password</label>
              <button type="button" onClick={onGoToForgot} className="px-4 py-2 bg-primary-600 text-white text-xs font-bold rounded-lg">Forgot?</button>
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
            disabled={loading}
            className="w-full py-5 bg-primary-600 hover:bg-primary-700 text-white rounded-2xl font-black shadow-2xl shadow-primary-500/30 transition-all active:scale-[0.98] flex justify-center items-center disabled:opacity-50"
          >
            {loading ? <SpinnerIcon className="w-6 h-6 animate-spin mr-2" /> : 'Sign In'}
          </button>
          
          <div className="text-center pt-4">
             <button type="button" onClick={startDemo} className="text-[10px] font-black text-gray-400 hover:text-primary-600 uppercase tracking-widest">
               Or enter via Demo Mode
             </button>
          </div>
        </form>
      )}

      {/* Removed AdminSignup link */}
    </div>
  );
};

export default AdminLogin;