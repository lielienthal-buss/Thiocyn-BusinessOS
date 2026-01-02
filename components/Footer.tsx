
import React from 'react';

interface FooterProps {
  onNavImprint?: () => void;
  onNavPrivacy?: () => void;
}

const Footer: React.FC<FooterProps> = ({ onNavImprint, onNavPrivacy }) => {
  return (
    <footer className="text-center mt-24 py-12 border-t border-white/10">
      <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
        &copy; {new Date().getFullYear()} Take A Shot GmbH. All rights reserved.
      </p>
      <div className="mt-4 flex justify-center space-x-6">
        <button 
          onClick={onNavPrivacy}
          className="text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-primary-600 transition-colors"
        >
          Privacy Policy
        </button>
        <span className="text-gray-200 dark:text-slate-800">|</span>
        <button 
          onClick={onNavImprint}
          className="text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-primary-600 transition-colors"
        >
          Imprint
        </button>
      </div>
    </footer>
  );
};

export default Footer;
