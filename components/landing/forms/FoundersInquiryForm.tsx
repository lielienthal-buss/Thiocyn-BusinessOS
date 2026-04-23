import React, { useState } from 'react';
import Turnstile from 'react-turnstile';
import { supabase } from '@/lib/supabaseClient';
import { useLocale } from '@/lib/landing/i18n';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type RevenueRange = 'under_500k' | '500k_2m' | '2m_5m' | '5m_15m' | '15m_plus';
type Timeline = 'now' | '3_6_months' | '6_12_months' | 'exploring';

const COPY = {
  en: {
    title: 'Sell your brand',
    sub: 'In the right hands. Confidential. We reply within 5 business days.',
    founder_name: 'Your name',
    email: 'Email',
    company_name: 'Company / Brand name',
    website: 'Website',
    websitePh: 'https://',
    category: 'Category',
    categoryPh: 'e.g. hair care, eyewear, home',
    revenue_range: 'Annual revenue',
    timeline: 'Timeline',
    reason_to_sell: 'Why are you selling? (optional)',
    reasonPh: 'Exit, focus, partnership, personal reasons…',
    consent: 'I agree to the confidential processing of my data. This inquiry will be reviewed by leadership only.',
    submit: 'Start the conversation',
    submitting: 'Sending…',
    error: 'Something went wrong. Try again.',
    thankTitle: 'Inquiry received.',
    thankBody: 'Confidential. Reviewed by founders only. We reply within 5 business days.',
    back: 'Back to overview',
    revenue: {
      under_500k: '< 500k €',
      '500k_2m': '500k – 2M €',
      '2m_5m': '2M – 5M €',
      '5m_15m': '5M – 15M €',
      '15m_plus': '15M+ €',
    },
    timelineOpts: {
      now: 'Ready now',
      '3_6_months': '3–6 months',
      '6_12_months': '6–12 months',
      exploring: 'Just exploring',
    },
  },
  de: {
    title: 'Deine Marke verkaufen',
    sub: 'In die richtigen Hände. Vertraulich. Wir antworten innerhalb von 5 Werktagen.',
    founder_name: 'Dein Name',
    email: 'E-Mail',
    company_name: 'Firma / Markenname',
    website: 'Website',
    websitePh: 'https://',
    category: 'Kategorie',
    categoryPh: 'z.B. Haarpflege, Eyewear, Home',
    revenue_range: 'Jahresumsatz',
    timeline: 'Zeitraum',
    reason_to_sell: 'Warum verkaufst du? (optional)',
    reasonPh: 'Exit, Fokus, Partnerschaft, persönliche Gründe…',
    consent: 'Ich willige in die vertrauliche Verarbeitung meiner Daten ein. Diese Anfrage wird nur von der Geschäftsführung gelesen.',
    submit: 'Gespräch beginnen',
    submitting: 'Wird gesendet…',
    error: 'Etwas ist schiefgelaufen. Versuch es nochmal.',
    thankTitle: 'Anfrage erhalten.',
    thankBody: 'Vertraulich. Nur für Gründer einsehbar. Antwort innerhalb von 5 Werktagen.',
    back: 'Zurück zur Übersicht',
    revenue: {
      under_500k: '< 500k €',
      '500k_2m': '500k – 2M €',
      '2m_5m': '2M – 5M €',
      '5m_15m': '5M – 15M €',
      '15m_plus': '15M+ €',
    },
    timelineOpts: {
      now: 'Sofort bereit',
      '3_6_months': '3–6 Monate',
      '6_12_months': '6–12 Monate',
      exploring: 'Ich sondiere nur',
    },
  },
} as const;

export default function FoundersInquiryForm() {
  const locale = useLocale() as 'de' | 'en';
  const t = COPY[locale];

  const [form, setForm] = useState({
    founder_name: '',
    email: '',
    company_name: '',
    website: '',
    category: '',
    revenue_range: '' as RevenueRange | '',
    timeline: '' as Timeline | '',
    reason_to_sell: '',
  });
  const [consent, setConsent] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const valid =
    form.founder_name.trim().length >= 2 &&
    EMAIL_REGEX.test(form.email) &&
    form.company_name.trim().length >= 2 &&
    !!form.revenue_range &&
    !!form.timeline &&
    consent &&
    !!turnstileToken;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid || loading) return;
    setError(null);
    setLoading(true);

    const payload = {
      founder_name: form.founder_name.trim(),
      email: form.email.trim().toLowerCase(),
      company_name: form.company_name.trim(),
      website: form.website.trim() || null,
      category: form.category.trim() || null,
      revenue_range: form.revenue_range,
      timeline: form.timeline,
      reason_to_sell: form.reason_to_sell.trim() || null,
      captcha_verified: true,
      consent_data_processing_at: new Date().toISOString(),
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
    };

    const { error: insertError } = await supabase
      .from('ma_inquiries')
      .insert(payload);

    setLoading(false);
    if (insertError) {
      setError(t.error);
      return;
    }
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="mx-auto max-w-xl text-center">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-teal/10 text-teal">
          <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="mt-6 text-pretty text-3xl font-black leading-tight">{t.thankTitle}</h2>
        <p className="mt-4 text-muted-foreground">{t.thankBody}</p>
        <a
          href="/"
          className="mt-8 inline-flex items-center gap-2 rounded-full border border-border/60 px-6 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-teal transition-colors hover:bg-teal/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          {t.back}
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-8">
      <Field label={t.founder_name} required>
        <input
          type="text"
          autoComplete="name"
          required
          value={form.founder_name}
          onChange={(e) => setForm({ ...form, founder_name: e.target.value })}
          className={inputCls}
        />
      </Field>

      <Field label={t.email} required>
        <input
          type="email"
          autoComplete="email"
          required
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          className={inputCls}
          spellCheck={false}
        />
      </Field>

      <Field label={t.company_name} required>
        <input
          type="text"
          autoComplete="organization"
          required
          value={form.company_name}
          onChange={(e) => setForm({ ...form, company_name: e.target.value })}
          className={inputCls}
        />
      </Field>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Field label={t.website}>
          <input
            type="url"
            autoComplete="url"
            placeholder={t.websitePh}
            value={form.website}
            onChange={(e) => setForm({ ...form, website: e.target.value })}
            className={inputCls}
            spellCheck={false}
          />
        </Field>
        <Field label={t.category}>
          <input
            type="text"
            placeholder={t.categoryPh}
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            className={inputCls}
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Field label={t.revenue_range} required>
          <select
            required
            value={form.revenue_range}
            onChange={(e) => setForm({ ...form, revenue_range: e.target.value as RevenueRange })}
            className={inputCls}
          >
            <option value="">—</option>
            {(Object.keys(t.revenue) as RevenueRange[]).map((k) => (
              <option key={k} value={k}>
                {t.revenue[k]}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t.timeline} required>
          <select
            required
            value={form.timeline}
            onChange={(e) => setForm({ ...form, timeline: e.target.value as Timeline })}
            className={inputCls}
          >
            <option value="">—</option>
            {(Object.keys(t.timelineOpts) as Timeline[]).map((k) => (
              <option key={k} value={k}>
                {t.timelineOpts[k]}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label={t.reason_to_sell}>
        <textarea
          rows={4}
          value={form.reason_to_sell}
          onChange={(e) => setForm({ ...form, reason_to_sell: e.target.value })}
          placeholder={t.reasonPh}
          className={`${inputCls} resize-y`}
        />
      </Field>

      <label className="flex items-start gap-3 text-sm text-muted-foreground">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-border bg-background accent-teal"
          required
        />
        <span>{t.consent}</span>
      </label>

      <Turnstile
        sitekey={import.meta.env.VITE_TURNSTILE_SITE_KEY || '1x00000000000000000000AA'}
        onVerify={setTurnstileToken}
        theme="dark"
      />

      {error && (
        <p role="alert" aria-live="polite" className="text-sm text-red-400">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={!valid || loading}
        className="w-full rounded-full bg-teal px-8 py-4 text-sm font-semibold uppercase tracking-[0.2em] text-background transition-colors hover:bg-teal/90 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        {loading ? t.submitting : t.submit}
      </button>
    </form>
  );
}

const inputCls =
  'block w-full rounded-md border border-border/60 bg-background/40 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2 focus-visible:ring-offset-background';

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block font-mono text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
        {label}
        {required && <span aria-hidden="true" className="ml-1 text-teal">*</span>}
      </span>
      {children}
    </label>
  );
}
