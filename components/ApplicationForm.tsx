import React, { useState, useEffect } from 'react';
import { submitApplicationAction, getProjectAreas } from '@/lib/actions';
import { BFI_QUESTIONS, calculateBigFive } from '@/utils/bigFive';
import { trackStep, trackStepCompleted, trackSubmission } from '@/lib/analytics';
import { supabase } from '@/lib/supabaseClient';
import Spinner from './ui/Spinner';
import ThankYouMessage from './ui/ThankYouMessage';
import type { ProjectArea } from '@/types';
import Turnstile from 'react-turnstile';
import { useLang } from '@/lib/i18n';
import { translations } from '@/lib/translations';

// --- MAIN FORM COMPONENT ---

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PROJECT_HIGHLIGHT_MAX = 500;
// Welle 1b Item 7 — CV upload limits (mirrored from storage bucket policy)
const CV_MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const CV_ALLOWED_MIME = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

const ApplicationForm: React.FC = () => {
  const { lang } = useLang();
  const t = translations[lang].public.form;
  const [step, setStep] = useState(1);

  const STEP_NAMES = ['', 'Basics', 'Experience', 'Project Preferences', 'Personality'];
  const goToStep = (n: number) => {
    trackStepCompleted(step, STEP_NAMES[step]);
    trackStep(n, STEP_NAMES[n]);
    setStep(n);
  };
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; linkedin_url?: string }>({});

  // Form State
  const [basics, setBasics] = useState({ full_name: '', email: '' });
  const [experience, setExperience] = useState({
    linkedin_url: '',
    project_highlight: '',
  });
  const [selectedProjectAreas, setSelectedProjectAreas] = useState<string[]>([]);
  const [bfiAnswers, setBfiAnswers] = useState<Record<number, number>>({});
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [availableProjectAreas, setAvailableProjectAreas] = useState<ProjectArea[]>([]);
  const [fetchingProjectAreas, setFetchingProjectAreas] = useState(false);

  // Welle 1b Item 7 — CV upload state. Upload happens immediately on file select
  // (not on submit) so the storage path is ready when submit_application fires.
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [cvPath, setCvPath] = useState<string | null>(null);
  const [cvUploading, setCvUploading] = useState(false);
  const [cvError, setCvError] = useState<string | null>(null);

  const handleCvSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setCvError(null);
    if (!file) return;
    if (!CV_ALLOWED_MIME.includes(file.type)) {
      setCvError(t.errorCvType ?? 'Only PDF, DOC, or DOCX files are allowed.');
      return;
    }
    if (file.size > CV_MAX_BYTES) {
      setCvError(t.errorCvSize ?? 'File too large. Max 5 MB.');
      return;
    }
    setCvFile(file);
    setCvUploading(true);
    try {
      const ext = file.name.split('.').pop() ?? 'pdf';
      const path = `${crypto.randomUUID()}.${ext.toLowerCase()}`;
      const { error: uploadError } = await supabase.storage
        .from('applicant-cvs')
        .upload(path, file, { contentType: file.type, upsert: false });
      if (uploadError) throw uploadError;
      setCvPath(path);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Upload failed';
      setCvError(msg);
      setCvFile(null);
      setCvPath(null);
    } finally {
      setCvUploading(false);
    }
  };

  useEffect(() => {
    if (step === 3 && availableProjectAreas.length === 0) {
      const fetchAreas = async () => {
        setFetchingProjectAreas(true);
        const areas = await getProjectAreas();
        if (areas) {
          setAvailableProjectAreas(areas);
        } else {
          setError(t.errorLoadingAreas);
        }
        setFetchingProjectAreas(false);
      };
      fetchAreas();
    }
  }, [step, availableProjectAreas.length]);


  const handleSubmit = async () => {
    setLoading(true);
    setError(null);

    try {
      // 1. Calculate Scores
      const psychometrics = calculateBigFive(bfiAnswers);

      // 2. Prepare Payload
      const formData = {
        full_name: basics.full_name,
        email: basics.email,
        linkedin_url: experience.linkedin_url,
        project_highlight: experience.project_highlight,
        psychometrics,
        preferred_project_areas: selectedProjectAreas, // Include selected project areas
        turnstileToken, // Added Turnstile token
        cv_url: cvPath, // Welle 1b Item 7 — uploaded storage path or null
        cv_filename: cvFile?.name ?? null,
      };

      // 3. Send
      const result = await submitApplicationAction(formData);

      if (result.success) {
        trackSubmission(true);
        setSubmitted(true);
      } else {
        trackSubmission(false, result.error);
        setError(result.error || t.errorFallback);
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(t.errorUnexpected);
      }
    } finally {
      setLoading(false);
    }
  };

  if (submitted) return <ThankYouMessage />;

  const totalSteps = 4; // Basics, Experience, Project Preferences, Personality

  return (
    <div className="w-full max-w-3xl mx-auto">
      {/* Header & Steps */}
      <div className="mb-10">
        <h2 className="text-2xl md:text-3xl font-black text-foreground tracking-tight mb-2">
          {step === 1 && t.step1Title}
          {step === 2 && t.step2Title}
          {step === 3 && t.step3Title}
          {step === 4 && t.step4Title}
        </h2>
        <div className="flex gap-2 mt-4">
          {Array.from({ length: totalSteps }).map((_, index) => (
            <div
              key={index + 1}
              className={`h-1 flex-1 rounded-full transition-all duration-500 ${index + 1 <= step ? 'bg-primary-700' : 'bg-foreground/10'}`}
            />
          ))}
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-secondary-500/10 border border-secondary-500/30 text-secondary-400 rounded-xl text-sm font-medium">
          ⚠️ {error}
        </div>
      )}

      {/* STEP 1: BASICS */}
      {step === 1 && (
        <div className="space-y-5 animate-fadeIn">
          <div>
            <label className="block font-mono text-[10px] font-medium text-muted-foreground mb-2 uppercase tracking-[0.2em]">
              {t.labelFullName}
            </label>
            <input
              type="text"
              className="w-full p-4 bg-foreground/5 border border-foreground/10 rounded-xl focus:border-primary-500 focus:bg-foreground/10 focus:outline-none transition-all text-base text-foreground placeholder:text-muted-foreground/50"
              placeholder="e.g. John Doe"
              value={basics.full_name}
              onChange={(e) =>
                setBasics({ ...basics, full_name: e.target.value })
              }
            />
          </div>
          <div>
            <label className="block font-mono text-[10px] font-medium text-muted-foreground mb-2 uppercase tracking-[0.2em]">
              {t.labelEmail}
            </label>
            <input
              type="email"
              className={`w-full p-4 bg-foreground/5 border rounded-xl focus:bg-foreground/10 focus:outline-none transition-all text-base text-foreground placeholder:text-muted-foreground/50 ${
                fieldErrors.email ? 'border-secondary-500 focus:border-secondary-400' : 'border-foreground/10 focus:border-primary-500'
              }`}
              placeholder="john@example.com"
              value={basics.email}
              onChange={(e) => {
                setBasics({ ...basics, email: e.target.value });
                if (fieldErrors.email) setFieldErrors(prev => ({ ...prev, email: undefined }));
              }}
              onBlur={(e) => {
                if (e.target.value && !EMAIL_REGEX.test(e.target.value)) {
                  setFieldErrors(prev => ({ ...prev, email: t.errorInvalidEmail }));
                }
              }}
            />
            {fieldErrors.email && (
              <p className="mt-1.5 text-xs text-secondary-400">{fieldErrors.email}</p>
            )}
          </div>
          <button
            onClick={() => {
              const emailError = !EMAIL_REGEX.test(basics.email) ? t.errorInvalidEmail : undefined;
              if (emailError) { setFieldErrors(prev => ({ ...prev, email: emailError })); return; }
              goToStep(2);
            }}
            disabled={!basics.full_name || !basics.email}
            className="w-full mt-8 py-4 bg-primary-700 text-background font-bold rounded-xl hover:bg-primary-600 transition-all disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            {t.nextStep}
          </button>
        </div>
      )}

      {/* STEP 2: EXPERIENCE */}
      {step === 2 && (
        <div className="space-y-5 animate-fadeIn">
          <div>
            <label className="block font-mono text-[10px] font-medium text-muted-foreground mb-2 uppercase tracking-[0.2em]">
              {t.labelLinkedin}
            </label>
            <p className="text-muted-foreground/80 text-xs mb-2">{t.linkedinHint}</p>
            <input
              type="url"
              className={`w-full p-4 bg-foreground/5 border rounded-xl focus:bg-foreground/10 focus:outline-none transition-all text-base text-foreground placeholder:text-muted-foreground/50 ${
                fieldErrors.linkedin_url ? 'border-secondary-500 focus:border-secondary-400' : 'border-foreground/10 focus:border-primary-500'
              }`}
              placeholder={t.linkedinPlaceholder}
              value={experience.linkedin_url}
              onChange={(e) => {
                setExperience({ ...experience, linkedin_url: e.target.value });
                if (fieldErrors.linkedin_url) setFieldErrors(prev => ({ ...prev, linkedin_url: undefined }));
              }}
              onBlur={(e) => {
                const val = e.target.value;
                if (val && !val.startsWith('http')) {
                  setFieldErrors(prev => ({ ...prev, linkedin_url: t.errorInvalidUrl }));
                }
              }}
            />
            {fieldErrors.linkedin_url && (
              <p className="mt-1.5 text-xs text-secondary-400">{fieldErrors.linkedin_url}</p>
            )}
          </div>
          <div>
            <label className="block font-mono text-[10px] font-medium text-muted-foreground mb-2 uppercase tracking-[0.2em]">
              {t.labelProject}
            </label>
            <p className="text-muted-foreground text-sm mb-3">
              {t.projectHint}
            </p>
            <textarea
              className="w-full p-4 bg-foreground/5 border border-foreground/10 rounded-xl focus:border-primary-500 focus:bg-foreground/10 focus:outline-none transition-all text-base min-h-[150px] text-foreground placeholder:text-muted-foreground/50"
              placeholder={t.projectPlaceholder}
              maxLength={PROJECT_HIGHLIGHT_MAX}
              value={experience.project_highlight}
              onChange={(e) =>
                setExperience({
                  ...experience,
                  project_highlight: e.target.value,
                })
              }
            />
            <p className={`text-xs mt-1 text-right ${
              experience.project_highlight.length > PROJECT_HIGHLIGHT_MAX * 0.9 ? 'text-secondary-400' : 'text-muted-foreground/60'
            }`}>
              {experience.project_highlight.length}/{PROJECT_HIGHLIGHT_MAX}
            </p>
          </div>

          {/* Welle 1b Item 7 — CV upload (optional) */}
          <div>
            <label className="block font-mono text-[10px] font-medium text-muted-foreground mb-2 uppercase tracking-[0.2em]">
              {t.labelCv ?? 'CV (optional)'}
            </label>
            <p className="text-muted-foreground/80 text-xs mb-2">
              {t.cvHint ?? 'PDF, DOC or DOCX. Max 5 MB.'}
            </p>
            <input
              type="file"
              accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={handleCvSelect}
              disabled={cvUploading}
              className="block w-full text-sm text-muted-foreground file:mr-4 file:py-3 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-bold file:bg-primary-700/15 file:text-primary-300 hover:file:bg-primary-700/25 disabled:opacity-50"
            />
            {cvUploading && (
              <p className="mt-2 text-xs text-muted-foreground/80 flex items-center gap-2">
                <Spinner className="w-3 h-3" /> {t.cvUploading ?? 'Uploading…'}
              </p>
            )}
            {cvPath && cvFile && !cvUploading && (
              <p className="mt-2 text-xs text-primary-300 font-medium">
                ✓ {cvFile.name}
              </p>
            )}
            {cvError && (
              <p className="mt-2 text-xs text-secondary-400">{cvError}</p>
            )}
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={() => goToStep(1)}
              className="px-6 py-4 bg-foreground/10 text-foreground font-bold rounded-xl hover:bg-foreground/15 transition-all"
            >
              {t.back}
            </button>
            <button
              onClick={() => {
                const linkedinError = experience.linkedin_url && !experience.linkedin_url.startsWith('http')
                  ? t.errorInvalidUrl
                  : undefined;
                if (linkedinError) { setFieldErrors(prev => ({ ...prev, linkedin_url: linkedinError })); return; }
                goToStep(3);
              }}
              disabled={false}
              className="flex-1 py-4 bg-primary-700 text-background font-bold rounded-xl hover:bg-primary-600 transition-all disabled:opacity-40"
            >
              {t.nextStep}
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: PROJECT PREFERENCES */}
      {step === 3 && (
        <div className="space-y-5 animate-fadeIn">
          <p className="text-muted-foreground text-sm mb-3">
            {t.projectAreasHint}
          </p>
          {fetchingProjectAreas ? (
            <div className="flex justify-center py-4">
              <Spinner />
            </div>
          ) : availableProjectAreas.length === 0 ? (
            <p className="text-muted-foreground/60">{t.noProjectAreas}</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {availableProjectAreas.map((area) => (
                <label
                  key={area.id}
                  className="flex items-center p-4 bg-foreground/5 border border-foreground/10 rounded-xl cursor-pointer hover:border-primary-500 hover:bg-foreground/10 transition-all has-[:checked]:border-primary-500 has-[:checked]:bg-primary-700/10"
                >
                  <input
                    type="checkbox"
                    value={area.name}
                    checked={selectedProjectAreas.includes(area.name)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedProjectAreas((prev) => [...prev, area.name]);
                      } else {
                        setSelectedProjectAreas((prev) =>
                          prev.filter((name) => name !== area.name)
                        );
                      }
                    }}
                    className="form-checkbox h-5 w-5 text-blue-600 rounded"
                  />
                  <span className="ml-3 text-base font-medium text-foreground">
                    {area.name}
                  </span>
                  {area.description && (
                    <span
                      className="ml-2 text-muted-foreground/70 cursor-help relative group"
                      title={area.description} // Tooltip for description
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5L7 11h2v3a1 1 0 102 0v-3h2l-.133-.5A1 1 0 0010 7zm0 10a1 1 0 100-2 1 1 0 000 2z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden w-64 rounded-md bg-foreground/95 p-2 text-background text-xs text-center group-hover:block">
                        {area.description}
                      </span>
                    </span>
                  )}
                </label>
              ))}
            </div>
          )}
          <div className="flex gap-3 mt-6">
            <button
              onClick={() => goToStep(2)}
              className="px-6 py-4 bg-foreground/10 text-foreground font-bold rounded-xl hover:bg-foreground/15 transition-all"
            >
              {t.back}
            </button>
            <button
              onClick={() => goToStep(4)}
              className="flex-1 py-4 bg-primary-700 text-background font-bold rounded-xl hover:bg-primary-600 transition-all disabled:opacity-40"
            >
              {t.nextStep}
            </button>
          </div>
        </div>
      )}


      {/* STEP 4: PERSONALITY */}
      {step === 4 && (
        <div className="space-y-8 animate-fadeIn">
          <div className="bg-primary-700/10 border border-primary-700/30 p-4 rounded-xl text-foreground/90 text-sm">
            {t.personalityIntro}
          </div>

          <div className="space-y-6">
            {BFI_QUESTIONS.map((q) => (
              <div
                key={q.id}
                className="pb-6 border-b border-foreground/10 last:border-0"
              >
                <p className="font-semibold text-base md:text-lg text-foreground mb-3">
                  {lang === 'de' ? q.de : q.en}
                </p>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5, 6, 7].map((val) => (
                    <button
                      key={val}
                      onClick={() =>
                        setBfiAnswers((prev) => ({ ...prev, [q.id]: val }))
                      }
                      className={`h-11 flex-1 rounded-lg font-bold text-base transition-all duration-200 border ${
                        bfiAnswers[q.id] === val
                          ? 'bg-primary-700 border-primary-700 text-background shadow-lg transform scale-105'
                          : 'bg-foreground/5 border-foreground/10 text-foreground hover:border-primary-500/40 hover:text-primary-300'
                      }`}
                    >
                      {val}
                    </button>
                  ))}
                </div>
                <div className="flex justify-between text-[10px] text-muted-foreground mt-2 px-1 uppercase tracking-[0.18em] font-bold">
                  <span>{t.disagree}</span>
                  <span>{t.agree}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-3 mt-8 pt-4 border-t border-foreground/10">
            <Turnstile
              sitekey={import.meta.env.VITE_TURNSTILE_SITE_KEY || '1x00000000000000000000AA'}
              onVerify={setTurnstileToken}
              theme="dark"
            />
            <button
              onClick={() => goToStep(3)}
              className="px-6 py-4 bg-foreground/10 text-foreground font-bold rounded-xl hover:bg-foreground/15 transition-all"
            >
              {t.back}
            </button>
            <button
              onClick={handleSubmit}
              disabled={Object.keys(bfiAnswers).length < 15 || loading || !turnstileToken || cvUploading} // Disabled if no token / CV still uploading
              className="flex-1 py-4 bg-primary-700 text-background font-bold rounded-xl hover:bg-primary-600 transition-all disabled:opacity-40 shadow-lg hover:shadow-primary-700/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              {loading ? <Spinner /> : t.submitApplication}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApplicationForm;
