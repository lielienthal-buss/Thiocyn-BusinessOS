import React, { useState } from 'react';
import Turnstile from 'react-turnstile';
import { supabase } from '@/lib/supabaseClient';
import { BRANDS } from '@/lib/landing/brands';
import { useLocale } from '@/lib/landing/i18n';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CONTENT_FORMATS = ['photo', 'video', 'reels', 'stories', 'ugc', 'mixed'] as const;

type ContentFormat = (typeof CONTENT_FORMATS)[number];

const COPY = {
  en: {
    title: 'Join the Ambassador Program',
    sub: 'Tell us about you and the brands you love. We reply within 10 days.',
    name: 'Full name',
    email: 'Email',
    instagram: 'Instagram handle',
    tiktok: 'TikTok handle',
    followerIg: 'Follower count (IG)',
    followerTt: 'Follower count (TikTok)',
    brandInterest: 'Which brands are you interested in? (pick any)',
    niche: 'Your niche',
    nichePh: 'e.g. sustainable skincare, slow fashion, hair health…',
    format: 'Content format',
    motivation: 'Why do you want to join?',
    motivationPh: 'One or two sentences.',
    collab: 'Past collabs (optional)',
    collabPh: 'Brands you worked with, paid or gifted.',
    consent: 'I agree to the processing of my data for application review.',
    submit: 'Submit application',
    submitting: 'Submitting…',
    error: 'Something went wrong. Try again.',
    thankTitle: 'Application received.',
    thankBody: 'We read every one. Expect a reply within 10 days.',
    back: 'Back to overview',
  },
  de: {
    title: 'Werde Teil des Ambassador Programms',
    sub: 'Erzähl uns von dir und den Marken, die du liebst. Wir antworten innerhalb von 10 Tagen.',
    name: 'Vollständiger Name',
    email: 'E-Mail',
    instagram: 'Instagram-Handle',
    tiktok: 'TikTok-Handle',
    followerIg: 'Follower (IG)',
    followerTt: 'Follower (TikTok)',
    brandInterest: 'Für welche Marken interessierst du dich? (Mehrfachauswahl)',
    niche: 'Deine Nische',
    nichePh: 'z.B. nachhaltige Hautpflege, Slow Fashion, Haargesundheit…',
    format: 'Content-Format',
    motivation: 'Warum möchtest du dabei sein?',
    motivationPh: 'Ein bis zwei Sätze.',
    collab: 'Bisherige Kollaborationen (optional)',
    collabPh: 'Marken, mit denen du bezahlt oder gratis gearbeitet hast.',
    consent: 'Ich willige in die Verarbeitung meiner Daten zur Bewerbungsprüfung ein.',
    submit: 'Bewerbung absenden',
    submitting: 'Wird gesendet…',
    error: 'Etwas ist schiefgelaufen. Versuch es nochmal.',
    thankTitle: 'Bewerbung erhalten.',
    thankBody: 'Wir lesen jede einzelne. Antwort innerhalb von 10 Tagen.',
    back: 'Zurück zur Übersicht',
  },
} as const;

export default function AmbassadorForm() {
  const locale = useLocale() as 'de' | 'en';
  const t = COPY[locale];

  const [form, setForm] = useState({
    full_name: '',
    email: '',
    instagram_handle: '',
    tiktok_handle: '',
    follower_count_ig: '',
    follower_count_tt: '',
    niche: '',
    content_format: '' as ContentFormat | '',
    motivation: '',
    collab_history: '',
  });
  const [brandInterest, setBrandInterest] = useState<string[]>([]);
  const [consent, setConsent] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const valid =
    form.full_name.trim().length >= 2 &&
    EMAIL_REGEX.test(form.email) &&
    form.motivation.trim().length >= 10 &&
    consent &&
    !!turnstileToken;

  const toggleBrand = (slug: string) =>
    setBrandInterest((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug],
    );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid || loading) return;
    setError(null);
    setLoading(true);

    const payload = {
      full_name: form.full_name.trim(),
      email: form.email.trim().toLowerCase(),
      instagram_handle: form.instagram_handle.trim() || null,
      tiktok_handle: form.tiktok_handle.trim() || null,
      follower_count_ig: form.follower_count_ig ? Number(form.follower_count_ig) : null,
      follower_count_tt: form.follower_count_tt ? Number(form.follower_count_tt) : null,
      brand_interest: brandInterest.length ? brandInterest : null,
      niche: form.niche.trim() || null,
      content_format: form.content_format || null,
      motivation: form.motivation.trim(),
      collab_history: form.collab_history.trim() || null,
      captcha_verified: true,
      consent_data_processing_at: new Date().toISOString(),
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
    };

    const { error: insertError } = await supabase
      .from('ambassador_applications')
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
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-coral/10 text-coral">
          <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="mt-6 text-pretty text-3xl font-black leading-tight">{t.thankTitle}</h2>
        <p className="mt-4 text-muted-foreground">{t.thankBody}</p>
        <a
          href="/"
          className="mt-8 inline-flex items-center gap-2 rounded-full border border-border/60 px-6 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-coral transition-colors hover:bg-coral/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          {t.back}
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-8">
      <Field label={t.name} required>
        <input
          type="text"
          autoComplete="name"
          required
          value={form.full_name}
          onChange={(e) => setForm({ ...form, full_name: e.target.value })}
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

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Field label={t.instagram}>
          <input
            type="text"
            autoComplete="off"
            placeholder="@handle"
            value={form.instagram_handle}
            onChange={(e) => setForm({ ...form, instagram_handle: e.target.value })}
            className={inputCls}
            spellCheck={false}
          />
        </Field>
        <Field label={t.tiktok}>
          <input
            type="text"
            autoComplete="off"
            placeholder="@handle"
            value={form.tiktok_handle}
            onChange={(e) => setForm({ ...form, tiktok_handle: e.target.value })}
            className={inputCls}
            spellCheck={false}
          />
        </Field>
        <Field label={t.followerIg}>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            value={form.follower_count_ig}
            onChange={(e) => setForm({ ...form, follower_count_ig: e.target.value })}
            className={inputCls}
          />
        </Field>
        <Field label={t.followerTt}>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            value={form.follower_count_tt}
            onChange={(e) => setForm({ ...form, follower_count_tt: e.target.value })}
            className={inputCls}
          />
        </Field>
      </div>

      <Field label={t.brandInterest}>
        <div className="flex flex-wrap gap-2">
          {BRANDS.map((b) => {
            const selected = brandInterest.includes(b.slug);
            return (
              <button
                type="button"
                key={b.slug}
                onClick={() => toggleBrand(b.slug)}
                aria-pressed={selected}
                className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                  selected
                    ? 'border-coral bg-coral/15 text-coral'
                    : 'border-border/60 text-muted-foreground hover:border-border hover:text-foreground'
                }`}
              >
                <span translate="no">{b.name}</span>
              </button>
            );
          })}
        </div>
      </Field>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Field label={t.niche}>
          <input
            type="text"
            value={form.niche}
            onChange={(e) => setForm({ ...form, niche: e.target.value })}
            placeholder={t.nichePh}
            className={inputCls}
          />
        </Field>
        <Field label={t.format}>
          <select
            value={form.content_format}
            onChange={(e) =>
              setForm({ ...form, content_format: e.target.value as ContentFormat | '' })
            }
            className={inputCls}
          >
            <option value="">—</option>
            {CONTENT_FORMATS.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label={t.motivation} required>
        <textarea
          rows={4}
          required
          value={form.motivation}
          onChange={(e) => setForm({ ...form, motivation: e.target.value })}
          placeholder={t.motivationPh}
          className={`${inputCls} resize-y`}
        />
      </Field>

      <Field label={t.collab}>
        <textarea
          rows={3}
          value={form.collab_history}
          onChange={(e) => setForm({ ...form, collab_history: e.target.value })}
          placeholder={t.collabPh}
          className={`${inputCls} resize-y`}
        />
      </Field>

      <label className="flex items-start gap-3 text-sm text-muted-foreground">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-border bg-background accent-coral"
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
        className="w-full rounded-full bg-coral px-8 py-4 text-sm font-semibold uppercase tracking-[0.2em] text-background transition-colors hover:bg-coral/90 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        {loading ? t.submitting : t.submit}
      </button>
    </form>
  );
}

const inputCls =
  'block w-full rounded-md border border-border/60 bg-background/40 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral focus-visible:ring-offset-2 focus-visible:ring-offset-background';

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
        {required && <span aria-hidden="true" className="ml-1 text-coral">*</span>}
      </span>
      {children}
    </label>
  );
}
