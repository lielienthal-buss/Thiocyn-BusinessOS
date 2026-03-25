/**
 * Analytics — Hire Funnel Tracker
 *
 * Two layers:
 * 1. Always-on: anonymous session events → Supabase `form_events` (no cookies, sessionStorage only)
 * 2. Consent-gated: PostHog for session replay + heatmaps (loaded only after cookie consent)
 *
 * GDPR note: Layer 1 stores no PII and uses no cookies → no consent required.
 * Layer 2 requires explicit consent.
 */

import { supabase } from './supabaseClient';

// ─── Session ID (sessionStorage, not a cookie, not persistent) ───────────────

const getSessionId = (): string => {
  const key = 'ats_session';
  let id = sessionStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(key, id);
  }
  return id;
};

// ─── Layer 1: Supabase Funnel Events ─────────────────────────────────────────

export const trackEvent = async (
  event: string,
  properties?: Record<string, string | number | boolean | null>
): Promise<void> => {
  try {
    await supabase.from('form_events').insert({
      session_id: getSessionId(),
      event,
      properties: properties ?? {},
      url: window.location.pathname,
      referrer: document.referrer || null,
      ua: navigator.userAgent.substring(0, 200),
    });
  } catch {
    // Silent — never break the user flow
  }
};

export const trackStep = (step: number, stepName: string): void => {
  void trackEvent('form_step_reached', { step, step_name: stepName });
};

export const trackStepCompleted = (step: number, stepName: string): void => {
  void trackEvent('form_step_completed', { step, step_name: stepName });
};

export const trackSubmission = (success: boolean, error?: string): void => {
  void trackEvent('form_submission', { success, error: error ?? null });
};

// ─── Layer 2: PostHog (consent-gated) ────────────────────────────────────────

declare global {
  interface Window {
    posthog?: {
      init: (key: string, config: object) => void;
      capture: (event: string, properties?: object) => void;
      identify: (id: string, traits?: object) => void;
    };
  }
}

let posthogLoaded = false;

export const initPostHog = (): void => {
  const key = import.meta.env.VITE_POSTHOG_KEY;
  if (!key || posthogLoaded) return;

  const script = document.createElement('script');
  script.src = 'https://eu.i.posthog.com/static/array.js';
  script.async = true;
  script.onload = () => {
    window.posthog?.init(key, {
      api_host: 'https://eu.i.posthog.com',
      capture_pageview: true,
      session_recording: { maskAllInputs: true },
    });
    posthogLoaded = true;
  };
  document.head.appendChild(script);
};

// ─── Consent helpers ──────────────────────────────────────────────────────────

const CONSENT_KEY = 'ats_cookie_consent';

export const hasConsent = (): boolean => localStorage.getItem(CONSENT_KEY) === 'true';
export const hasDenied = (): boolean => localStorage.getItem(CONSENT_KEY) === 'false';

export const giveConsent = (): void => {
  localStorage.setItem(CONSENT_KEY, 'true');
  initPostHog();
};

export const denyConsent = (): void => {
  localStorage.setItem(CONSENT_KEY, 'false');
};
