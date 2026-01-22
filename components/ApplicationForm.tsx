import React, { useState } from 'react';
import { submitApplicationAction } from '../lib/actions';
import { BFI_QUESTIONS, calculateBigFive } from '../utils/bigFive';
import Spinner from './ui/Spinner';
import Card from './ui/Card';
import ThankYouMessage from './ui/ThankYouMessage';

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
  const [bfiAnswers, setBfiAnswers] = useState<Record<number, number>>({});

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

  return (
    <Card className="w-full max-w-3xl mx-auto my-10">
      {/* Header & Steps */}
      <div className="mb-8">
        <h2 className="text-3xl font-black text-gray-900 tracking-tight mb-2">
          {step === 1 && 'Let’s start with the basics.'}
          {step === 2 && 'Show us your work.'}
          {step === 3 && 'How do you tick?'}
        </h2>
        <div className="flex gap-2 mt-4">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full transition-all duration-500 ${s <= step ? 'bg-blue-600' : 'bg-gray-200'}`}
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
            <label className="block text-sm font-bold text-black mb-2 uppercase tracking-wide">
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
            <label className="block text-sm font-bold text-black mb-2 uppercase tracking-wide">
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
            <label className="block text-sm font-bold text-black mb-2 uppercase tracking-wide">
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
            <label className="block text-sm font-bold text-black mb-2 uppercase tracking-wide">
              Project Highlight
            </label>
            <p className="text-black text-sm mb-3">
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

      {/* STEP 3: PERSONALITY */}
      {step === 3 && (
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
                <p className="font-semibold text-lg text-black mb-3">
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

          <div className="flex gap-3 mt-8 pt-4 border-t border-gray-100">
            <button
              onClick={() => setStep(2)}
              className="px-6 py-4 bg-gray-100 text-black font-bold rounded-xl hover:bg-gray-200 transition-all"
            >
              Back
            </button>
            <button
              onClick={handleSubmit}
              disabled={Object.keys(bfiAnswers).length < 15 || loading}
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
