
import React from 'react';

interface LegalPageProps {
  title: string;
  onBack: () => void;
  children: React.ReactNode;
}

const LegalPage: React.FC<LegalPageProps> = ({ title, onBack, children }) => {
  return (
    <div className="max-w-4xl mx-auto animate-[fadeIn_0.5s_ease-out]">
      <button 
        onClick={onBack}
        className="mb-8 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary-600 hover:text-primary-700 transition-all"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
        Back to Portal
      </button>
      
      <div className="glass-card p-12 md:p-16 rounded-[3.5rem] shadow-2xl border-white/50">
        <h1 className="text-4xl font-black text-gray-900 dark:text-white tracking-tighter mb-12 border-b border-gray-100 dark:border-slate-800 pb-8">
          {title}
        </h1>
        <div className="prose prose-slate dark:prose-invert max-w-none space-y-8 text-gray-600 dark:text-gray-400 leading-relaxed font-medium">
          {children}
        </div>
      </div>
    </div>
  );
};

export default LegalPage;
