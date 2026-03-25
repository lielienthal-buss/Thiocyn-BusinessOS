import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="mt-24 pt-10 flex flex-col md:flex-row items-center justify-between gap-6 md:gap-4 text-xs text-gray-400">
      <p className="font-medium">
        &copy; {new Date().getFullYear()} Hart Limes GmbH. All rights reserved.
      </p>
      <div className="flex gap-6">
        <a href="/privacy" className="font-black uppercase tracking-widest hover:text-gray-700 transition-colors">
          Privacy Policy
        </a>
        <a href="/imprint" className="font-black uppercase tracking-widest hover:text-gray-700 transition-colors">
          Imprint
        </a>
        <a href="/legal" className="font-black uppercase tracking-widest hover:text-gray-700 transition-colors">
          Legal
        </a>
      </div>
    </footer>
  );
};

export default Footer;
