import React from 'react';

const Header: React.FC = () => {
  return (
    <header className="p-12 rounded-[3.5rem] flex flex-col md:flex-row items-center gap-10 shadow-2xl bg-gray-900/30 backdrop-blur-2xl border border-white/20">
      <div className="w-24 h-24 rounded-[2rem] bg-gradient-to-br from-primary-500 to-primary-700 text-white flex items-center justify-center shadow-2xl shadow-primary-500/40 transform hover:rotate-12 transition-transform duration-500">
        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
        </svg>
      </div>
      <div className="text-center md:text-left">
        <h1 className="text-4xl md:text-5xl font-black text-gray-900 dark:text-white tracking-tighter leading-none mb-2">
          Hiring the <span className="text-primary-600">Unstoppable.</span>
        </h1>
        <p className="text-xl font-bold text-white mb-4">Ready to Take a Shot?</p> {/* Added tagline */}
        <p className="text-lg text-gray-500 dark:text-gray-400 font-medium max-w-xl leading-relaxed">
          Become part of a team that doesn't just solve problems, it pulverizes them.
          Send us your documents directly through our encrypted portal.
        </p>
      </div>
    </header>
  );
};

export default Header;