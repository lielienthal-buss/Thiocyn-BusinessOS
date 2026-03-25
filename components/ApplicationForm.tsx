import React, { useState, useEffect } from 'react';
import { submitApplicationAction, getProjectAreas } from '@/lib/actions';
import { BFI_QUESTIONS, calculateBigFive } from '@/utils/bigFive';
import { trackStep, trackStepCompleted, trackSubmission } from '@/lib/analytics';
import Spinner from './ui/Spinner';
import Card from './ui/Card';
import ThankYouMessage from './ui/ThankYouMessage';
import type { ProjectArea } from '@/types';
import Turnstile from 'react-turnstile';
import { useLang } from '@/lib/i18n';
import { translations } from '@/lib/translations';

// --- MAIN FORM COMPONENT ---

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PROJECT_HIGHLIGHT_MAX = 500;

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
    <Card className="w-full max-w-3xl mx-auto my-10">
      {/* Header & Steps */}
      <div className="mb-8">
        <h2 className="text-3xl font-black text-gray-900 tracking-tight mb-2">
          {step === 1 && t.step1Title}
          {step === 2 && t.step2Title}
          {step === 3 && t.step3Title}
          {step === 4 && t.step4Title}
        </h2>
        <div className="flex gap-2 mt-4">
          {Array.from({ length: totalSteps }).map((_, index) => (
            <div
              key={index + 1}
              className={`h-1 flex-1 rounded-full transition-all duration-500 ${index + 1 <= step ? 'bg-primary-600' : 'bg-gray-200'}`}
            />
          ))}
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm font-medium">
          ⚠️ {error}
        </div>
      )}

      {/* STEP 1: BASICS */}
      {step === 1 && (
        <div className="space-y-5 animate-fadeIn">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">
              {t.labelFullName}
            </label>
            <input
              type="text"
              className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-blue-500 focus:bg-white focus:outline-none transition-all text-lg text-black"
              placeholder="e.g. John Doe"
              value={basics.full_name}
              onChange={(e) =>
                setBasics({ ...basics, full_name: e.target.value })
              }
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">
              {t.labelEmail}
            </label>
            <input
              type="email"
              className={`w-full p-4 bg-gray-50 border-2 rounded-xl focus:bg-white focus:outline-none transition-all text-lg text-black ${
                fieldErrors.email ? 'border-red-400 focus:border-red-500' : 'border-gray-100 focus:border-blue-500'
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
              <p className="mt-1 text-xs text-red-400">{fieldErrors.email}</p>
            )}
          </div>
          <button
            onClick={() => {
              const emailError = !EMAIL_REGEX.test(basics.email) ? t.errorInvalidEmail : undefined;
              if (emailError) { setFieldErrors(prev => ({ ...prev, email: emailError })); return; }
              goToStep(2);
            }}
            disabled={!basics.full_name || !basics.email}
            className="w-full mt-6 py-4 bg-primary-600 text-white font-bold rounded-xl hover:bg-primary-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t.nextStep}
          </button>
        </div>
      )}

      {/* STEP 2: EXPERIENCE */}
      {step === 2 && (
        <div className="space-y-5 animate-fadeIn">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">
              {t.labelLinkedin}
            </label>
            <p className="text-gray-500 text-xs mb-2">{t.linkedinHint}</p>
            <input
              type="url"
              className={`w-full p-4 bg-gray-50 border-2 rounded-xl focus:bg-white focus:outline-none transition-all text-lg text-black ${
                fieldErrors.linkedin_url ? 'border-red-400 focus:border-red-500' : 'border-gray-100 focus:border-blue-500'
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
              <p className="mt-1 text-xs text-red-400">{fieldErrors.linkedin_url}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">
              {t.labelProject}
            </label>
            <p className="text-gray-600 text-sm mb-3">
              {t.projectHint}
            </p>
            <textarea
              className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-blue-500 focus:bg-white focus:outline-none transition-all text-lg min-h-[150px] text-black"
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
              experience.project_highlight.length > PROJECT_HIGHLIGHT_MAX * 0.9 ? 'text-orange-400' : 'text-gray-400'
            }`}>
              {experience.project_highlight.length}/{PROJECT_HIGHLIGHT_MAX}
            </p>
          </div>
          <div className="flex gap-3 mt-6">
            <button
              onClick={() => goToStep(1)}
              className="px-6 py-4 bg-gray-100 text-black font-bold rounded-xl hover:bg-gray-200 transition-all"
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
              className="flex-1 py-4 bg-primary-600 text-white font-bold rounded-xl hover:bg-primary-700 transition-all disabled:opacity-50"
            >
              {t.nextStep}
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: PROJECT PREFERENCES */}
      {step === 3 && (
        <div className="space-y-5 animate-fadeIn">
          <p className="text-gray-600 text-sm mb-3">
            {t.projectAreasHint}
          </p>
          {fetchingProjectAreas ? (
            <div className="flex justify-center py-4">
              <Spinner />
            </div>
          ) : availableProjectAreas.length === 0 ? (
            <p className="text-gray-400">{t.noProjectAreas}</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {availableProjectAreas.map((area) => (
                <label
                  key={area.id}
                  className="flex items-center p-4 bg-gray-50 border-2 border-gray-100 rounded-xl cursor-pointer hover:border-blue-500 transition-all"
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
                  <span className="ml-3 text-lg font-medium text-black">
                    {area.name}
                  </span>
                  {area.description && (
                    <span
                      className="ml-2 text-gray-500 cursor-help relative group"
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
                      <span className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden w-64 rounded-md bg-gray-700 p-2 text-white text-xs text-center group-hover:block">
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
              className="px-6 py-4 bg-gray-100 text-black font-bold rounded-xl hover:bg-gray-200 transition-all"
            >
              {t.back}
            </button>
            <button
              onClick={() => goToStep(4)}
              className="flex-1 py-4 bg-primary-600 text-white font-bold rounded-xl hover:bg-primary-700 transition-all disabled:opacity-50"
            >
              {t.nextStep}
            </button>
          </div>
        </div>
      )}


      {/* STEP 4: PERSONALITY */}
      {step === 4 && (
        <div className="space-y-8 animate-fadeIn">
          <div className="bg-blue-50 p-4 rounded-xl text-black text-sm">
            {t.personalityIntro}
          </div>

          <div className="space-y-6">
            {BFI_QUESTIONS.map((q) => (
              <div
                key={q.id}
                className="pb-6 border-b border-gray-100 last:border-0"
              >
                <p className="font-semibold text-lg text-gray-900 mb-3">
                  {q.text}
                </p>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5, 6, 7].map((val) => (
                    <button
                      key={val}
                      onClick={() =>
                        setBfiAnswers((prev) => ({ ...prev, [q.id]: val }))
                      }
                      className={`h-12 flex-1 rounded-lg font-bold text-lg transition-all duration-200 border-2 ${
                        bfiAnswers[q.id] === val
                          ? 'bg-blue-600 border-blue-600 text-white shadow-lg transform scale-105'
                          : 'bg-white border-gray-100 text-black hover:border-blue-200 hover:text-blue-500'
                      }`}
                    >
                      {val}
                    </button>
                  ))}
                </div>
                <div className="flex justify-between text-xs text-black mt-2 px-1 uppercase tracking-wider font-bold">
                  <span>{t.disagree}</span>
                  <span>{t.agree}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-3 mt-8 pt-4 border-t border-gray-100"> {/* Changed to flex-col */}
            <Turnstile
              sitekey={import.meta.env.VITE_TURNSTILE_SITE_KEY || '1x00000000000000000000AA'}
              onVerify={setTurnstileToken}
              theme="light"
            />
            <button
              onClick={() => goToStep(3)}
              className="px-6 py-4 bg-gray-100 text-black font-bold rounded-xl hover:bg-gray-200 transition-all"
            >
              {t.back}
            </button>
            <button
              onClick={handleSubmit}
              disabled={Object.keys(bfiAnswers).length < 15 || loading || !turnstileToken} // Disabled if no token
              className="flex-1 py-4 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition-all disabled:opacity-50 shadow-lg hover:shadow-green-500/30"
            >
              {loading ? <Spinner /> : t.submitApplication}
            </button>
          </div>
        </div>
      )}
    </Card>
  );
};

export default ApplicationForm;
