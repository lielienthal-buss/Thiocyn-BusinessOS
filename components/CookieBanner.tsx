import React, { useState, useEffect } from 'react';
import { hasConsent, hasDenied, giveConsent, denyConsent, initPostHog } from '@/lib/analytics';

const CookieBanner: React.FC = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Show only if no decision made yet
    if (!hasConsent() && !hasDenied()) {
      // Slight delay so page renders first
      const t = setTimeout(() => setVisible(true), 1200);
      return () => clearTimeout(t);
    }
    // If previously consented, init PostHog silently
    if (hasConsent()) initPostHog();
  }, []);

  if (!visible) return null;

  const accept = () => {
    giveConsent();
    setVisible(false);
  };

  const decline = () => {
    denyConsent();
    setVisible(false);
  };

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:max-w-sm z-50 animate-slide-up">
      <div className="bg-white border border-gray-200 rounded-2xl shadow-xl p-5 space-y-3">
        <p className="text-sm text-gray-700 leading-relaxed">
          Wir verwenden Cookies für anonyme Nutzungsanalysen, um das Bewerbungsformular kontinuierlich zu verbessern.
        </p>
        <div className="flex gap-2">
          <button
            onClick={decline}
            className="flex-1 py-2 text-xs font-bold text-gray-500 bg-gray-100 hover:bg-gray-200 rounded-xl transition-all"
          >
            Ablehnen
          </button>
          <button
            onClick={accept}
            className="flex-1 py-2 text-xs font-bold text-white bg-primary-600 hover:bg-primary-700 rounded-xl transition-all"
          >
            Akzeptieren
          </button>
        </div>
        <p className="text-[10px] text-gray-400 text-center">
          Weitere Infos in unserer{' '}
          <a href="/privacy" className="underline hover:text-gray-600">Datenschutzerklärung</a>.
        </p>
      </div>
    </div>
  );
};

export default CookieBanner;
