import React, { useEffect } from 'react';

// Extend Window interface to include onTurnstileSuccess
declare global {
  interface Window {
    onTurnstileSuccess: (token: string) => void;
  }
}

interface CaptchaComponentProps {
  onVerify: (token: string) => void;
}

const CaptchaComponent: React.FC<CaptchaComponentProps> = ({ onVerify }) => {
  useEffect(() => {
    window.onTurnstileSuccess = (token: string) => {
      console.log("Turnstile token:", token); // Optional debug log
      onVerify(token);
    };
    // Cleanup function (optional, but good practice)
    return () => {
      delete window.onTurnstileSuccess;
    };
  }, [onVerify]);

  return (
    <div
      className="cf-turnstile"
      data-sitekey={import.meta.env.VITE_TURNSTILE_SITE_KEY as string}
      data-callback="onTurnstileSuccess"
      data-size="normal"
      data-tabindex="0"
    />
  );
};

export default CaptchaComponent;
