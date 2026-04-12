import React, { useState } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';
import Spinner from '@/components/ui/Spinner';
import EmailIcon from '@/components/icons/EmailIcon';
import { useNavigate } from 'react-router-dom';
import Logo from '@/components/icons/Logo';

const AdminLogin: React.FC = () => {
  const navigate = useNavigate();
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
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError) {
      setError(authError.message);
      setLoading(false);
    } else {
      navigate('/admin/dashboard');
    }
  };

  const startDemo = () => window.dispatchEvent(new CustomEvent('start-demo-mode'));

  return (
    <div className="relative min-h-[80vh] flex items-center justify-center overflow-hidden">
      {/* Ambient glows */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-5%] w-[45%] h-[45%] bg-[#E09B37]/15 rounded-full blur-[150px] animate-blob" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[40%] h-[40%] bg-indigo-600/12 rounded-full blur-[130px] animate-blob animation-delay-2000" />
        {/* Grid dot pattern */}
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
      </div>

      <div className="relative w-full max-w-md">
        {/* Badge */}
        <div className="animate-slide-up flex justify-center mb-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-500/10 border border-primary-500/20 text-primary-400 text-[10px] font-black uppercase tracking-[0.25em]">
            <span className="w-1.5 h-1.5 rounded-full bg-primary-400 animate-glow-pulse inline-block" />
            System online
          </div>
        </div>

        {/* Card — white card on dark page = maximum contrast */}
        <div className="animate-slide-up-1 relative bg-white rounded-[2.5rem] shadow-[0_32px_80px_-20px_rgba(0,0,0,0.8)] overflow-hidden px-10 py-12">
          {/* Top accent */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[60%] h-px bg-gradient-to-r from-transparent via-primary-400/40 to-transparent" />

          {/* Logo + headline */}
          <div className="animate-slide-up-2 text-center mb-10">
            <div className="inline-block mb-5 animate-float-xs">
              <Logo className="h-14 w-auto" />
            </div>
            <h2 className="text-3xl font-black text-gray-900 tracking-tighter">
              Business OS
            </h2>
            <p className="text-gray-400 text-[10px] mt-1.5 font-bold uppercase tracking-[0.25em]">
              Hartlimes GmbH · Admin Hub
            </p>
          </div>

          {!configured ? (
            <div className="animate-slide-up-3 space-y-5">
              <div className="p-5 rounded-2xl bg-primary-500/5 border border-primary-500/10 text-center">
                <p className="text-[10px] text-primary-600 font-black mb-4 uppercase tracking-[0.2em] leading-relaxed">
                  Sandbox Environment<br />No live data connected.
                </p>
                <button type="button" onClick={startDemo}
                  className="group w-full py-4 bg-gray-900 hover:bg-[#E09B37] text-[#1d1d1f] rounded-xl font-black text-xs uppercase tracking-[0.2em] transition-all duration-300 shadow-xl hover:shadow-primary-500/30 hover:scale-[1.02] active:scale-[0.98]">
                  <span className="group-hover:tracking-[0.3em] transition-all duration-300">Enter Preview</span>
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleLogin} className="space-y-5">
              <div className="animate-slide-up-3">
                <label className="block text-[10px] font-black uppercase tracking-[0.2em] mb-2 text-gray-500">
                  Email
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-gray-400">
                    <EmailIcon className="w-4 h-4" />
                  </span>
                  <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                    className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500/40 focus:border-primary-400 outline-none transition-all text-sm placeholder:text-gray-300"
                    placeholder="recruiter@hartlimesgmbh.de" />
                </div>
              </div>

              <div className="animate-slide-up-4">
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">
                    Password
                  </label>
                  <button type="button" onClick={() => navigate('/admin/forgot-password')}
                    className="text-[10px] text-primary-500 hover:text-primary-700 font-bold transition-colors">
                    Forgot?
                  </button>
                </div>
                <input type="password" required value={password} onChange={e => setPassword(e.target.value)}
                  className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500/40 focus:border-primary-400 outline-none transition-all text-sm placeholder:text-gray-300"
                  placeholder="••••••••" />
              </div>

              {error && (
                <div className="p-3.5 bg-red-500/8 border border-red-200 text-red-500 text-[10px] font-black uppercase tracking-widest rounded-xl animate-shake">
                  {error}
                </div>
              )}

              <div className="animate-slide-up-5 pt-1">
                <button type="submit" disabled={loading}
                  className="group relative w-full py-4 bg-gray-900 hover:bg-[#E09B37] text-[#1d1d1f] rounded-xl font-black text-xs uppercase tracking-widest shadow-lg hover:shadow-primary-500/30 transition-all duration-300 hover:scale-[1.01] active:scale-[0.99] flex justify-center items-center gap-2 disabled:opacity-50 overflow-hidden">
                  {/* shimmer on hover */}
                  <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                  {loading ? <Spinner className="w-5 h-5" /> : 'Access System →'}
                </button>

                <button type="button" onClick={startDemo}
                  className="w-full mt-4 text-[10px] font-bold text-gray-400 hover:text-primary-500 uppercase tracking-widest transition-colors">
                  or enter demo mode
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Bottom hint */}
        <p className="animate-fade-in-1 text-center text-[9px] text-gray-400 mt-4 font-bold uppercase tracking-widest">
          Hartlimes GmbH · Business Operating System
        </p>
      </div>
    </div>
  );
};

export default AdminLogin;
