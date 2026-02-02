import React, { useState, useEffect } from 'react';
import { submitApplicationAction, getProjectAreas } from '../lib/actions';
import { BFI_QUESTIONS, calculateBigFive } from '../utils/bigFive';
import Spinner from './ui/Spinner';
import Card from './ui/Card';
import ThankYouMessage from './ui/ThankYouMessage';
import type { ProjectArea } from '../types';
import Turnstile from 'react-turnstile';

// --- MAIN FORM COMPONENT ---

const ApplicationForm: React.FC = () => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
          setError('Failed to load project areas.');
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
        setSubmitted(true);
      } else {
        setError(result.error || 'Submission failed. Please try again.');
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred.');
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
        <h2 className="text-3xl font-black text-white tracking-tight mb-2">
          {step === 1 && 'Let’s start with the basics.'}
          {step === 2 && 'Show us your work.'}
          {step === 3 && 'What excites you?'}
          {step === 4 && 'How do you tick?'}
        </h2>
        <div className="flex gap-2 mt-4">
          {Array.from({ length: totalSteps }).map((_, index) => (
            <div
              key={index + 1}
              className={`h-1 flex-1 rounded-full transition-all duration-500 ${index + 1 <= step ? 'bg-blue-600' : 'bg-gray-200'}`}
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
            <label className="block text-sm font-bold text-white mb-2 uppercase tracking-wide">
              Full Name
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
            <label className="block text-sm font-bold text-white mb-2 uppercase tracking-wide">
              Email Address
            </label>
            <input
              type="email"
              className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-blue-500 focus:bg-white focus:outline-none transition-all text-lg text-black"
              placeholder="john@example.com"
              value={basics.email}
              onChange={(e) => setBasics({ ...basics, email: e.target.value })}
            />
          </div>
          <button
            onClick={() => setStep(2)}
            disabled={!basics.full_name || !basics.email}
            className="w-full mt-6 py-4 bg-gray-900 text-white font-bold rounded-xl hover:bg-black transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next Step →
          </button>
        </div>
      )}

      {/* STEP 2: EXPERIENCE */}
      {step === 2 && (
        <div className="space-y-5 animate-fadeIn">
          <div>
            <label className="block text-sm font-bold text-white mb-2 uppercase tracking-wide">
              LinkedIn / Portfolio
            </label>
            <input
              type="url"
              className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-blue-500 focus:bg-white focus:outline-none transition-all text-lg text-black"
              placeholder="https://linkedin.com/in/..."
              value={experience.linkedin_url}
              onChange={(e) =>
                setExperience({ ...experience, linkedin_url: e.target.value })
              }
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-white mb-2 uppercase tracking-wide">
              Project Highlight
            </label>
            <p className="text-white text-sm mb-3">
              Tell us about one project you are proud of. Keep it short.
            </p>
            <textarea
              className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-blue-500 focus:bg-white focus:outline-none transition-all text-lg min-h-[150px] text-black"
              placeholder="I built a..."
              value={experience.project_highlight}
              onChange={(e) =>
                setExperience({
                  ...experience,
                  project_highlight: e.target.value,
                })
              }
            />
          </div>
          <div className="flex gap-3 mt-6">
            <button
              onClick={() => setStep(1)}
              className="px-6 py-4 bg-gray-100 text-black font-bold rounded-xl hover:bg-gray-200 transition-all"
            >
              Back
            </button>
            <button
              onClick={() => setStep(3)}
              disabled={
                !experience.linkedin_url || !experience.project_highlight
              }
              className="flex-1 py-4 bg-gray-900 text-white font-bold rounded-xl hover:bg-black transition-all disabled:opacity-50"
            >
              Next Step →
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: PROJECT PREFERENCES */}
      {step === 3 && (
        <div className="space-y-5 animate-fadeIn">
          <p className="text-white text-sm mb-3">
            Which project areas are you most interested in? Select all that apply.
          </p>
          {fetchingProjectAreas ? (
            <div className="flex justify-center py-4">
              <Spinner />
            </div>
          ) : availableProjectAreas.length === 0 ? (
            <p className="text-gray-400">No project areas defined by the company yet.</p>
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
                      <span className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden w-64 rounded-md bg-gray-800 p-2 text-white text-xs text-center group-hover:block">
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
              onClick={() => setStep(2)}
              className="px-6 py-4 bg-gray-100 text-black font-bold rounded-xl hover:bg-gray-200 transition-all"
            >
              Back
            </button>
            <button
              onClick={() => setStep(4)}
              className="flex-1 py-4 bg-gray-900 text-white font-bold rounded-xl hover:bg-black transition-all disabled:opacity-50"
            >
              Next Step →
            </button>
          </div>
        </div>
      )}


      {/* STEP 4: PERSONALITY */}
      {step === 4 && (
        <div className="space-y-8 animate-fadeIn">
          <div className="bg-blue-50 p-4 rounded-xl text-black text-sm">
            <strong>Quick Check:</strong> Rate how well these statements
            describe you. (1 = Not at all, 7 = Absolutely)
          </div>

          <div className="space-y-6">
            {BFI_QUESTIONS.map((q) => (
              <div
                key={q.id}
                className="pb-6 border-b border-gray-100 last:border-0"
              >
                <p className="font-semibold text-lg text-white mb-3">
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
                  <span>Disagree</span>
                  <span>Agree</span>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-3 mt-8 pt-4 border-t border-gray-100"> {/* Changed to flex-col */}
            <Turnstile
              sitekey={import.meta.env.VITE_TURNSTILE_SITE_KEY}
              onVerify={setTurnstileToken}
              options={{ theme: 'dark' }}
            />
            <button
              onClick={() => setStep(3)}
              className="px-6 py-4 bg-gray-100 text-black font-bold rounded-xl hover:bg-gray-200 transition-all"
            >
              Back
            </button>
            <button
              onClick={handleSubmit}
              disabled={Object.keys(bfiAnswers).length < 15 || loading || !turnstileToken} // Disabled if no token
              className="flex-1 py-4 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition-all disabled:opacity-50 shadow-lg hover:shadow-green-500/30"
            >
              {loading ? <Spinner /> : 'Submit Application'}
            </button>
          </div>
        </div>
      )}
    </Card>
  );
};

export default ApplicationForm;
