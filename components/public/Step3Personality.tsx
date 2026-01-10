import React from 'react';
import { ApplicationFormData } from '../../types';
import CaptchaComponent from './CaptchaComponent';

// Re-usable Card component for consistent styling
const QuestionCard: React.FC<{ title: string; children: React.ReactNode; className?: string }> = ({ title, children, className }) => (
  <div className={`p-4 sm:p-6 rounded-xl flex flex-col gap-2 sm:gap-3 bg-slate-800/60 backdrop-blur-lg border border-white/10 ${className}`}> {/* Reduced padding and gap for mobile */}
    <h3 className="text-white font-bold text-sm">{title}</h3>
    {children}
  </div>
);

// DISC Questions
const DISC_QUESTIONS = [
  { id: 'disc_q1', text: 'I am direct and to the point.' },
  { id: 'disc_q2', text: 'I enjoy influencing and inspiring others.' },
  { id: 'disc_q3', text: 'I prefer a stable and predictable work environment.' },
  { id: 'disc_q4', text: 'I focus on details and ensure high quality.' },
  { id: 'disc_q5', text: 'I take charge when necessary.' },
  { id: 'disc_q6', text: 'I am optimistic and outgoing.' },
  { id: 'disc_q7', text: 'I am a good listener and very patient.' },
  { id: 'disc_q8', text: 'I follow rules and procedures closely.' },
  { id: 'disc_q9', text: 'I am driven by results and challenges.' },
  { id: 'disc_q10', text: 'I thrive in social and collaborative settings.' },
];

const DISC_OPTIONS = ['Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree'];

interface Props {
  formData: ApplicationFormData;
  handleChange: (field: keyof ApplicationFormData, value: any) => void;
  handleCaptchaVerify: (token: string | null) => void;
}

const Step3Personality: React.FC<Props> = ({ formData, handleChange, handleCaptchaVerify }) => {
  const handleDiscChange = (questionId: string, value: string) => {
    const newDiscAnswers = { ...formData.disc_answers, [questionId]: value };
    handleChange('disc_answers', newDiscAnswers);
  };

  return (
    <div className="space-y-4 sm:space-y-6"> {/* Reduced space-y for mobile */}
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-white">Step 3: What's your personality like?</h2>
        <p className="text-gray-400">This helps us understand your work style. There are no right or wrong answers.</p>
      </div>

      {/* DISC Questionnaire */}
      <QuestionCard title="Personality Assessment" className="space-y-4">
        {DISC_QUESTIONS.map(q => (
          <div key={q.id} className="border-b border-white/10 pb-4 last:border-b-0">
            <p className="text-white mb-2 text-sm">{q.text}</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {DISC_OPTIONS.map(option => (
                <button
                  type="button"
                  key={option}
                  onClick={() => handleDiscChange(q.id, option)}
                  className={`px-3 py-1.5 text-[10px] font-bold rounded-full transition-all duration-200 border ${
                    formData.disc_answers[q.id] === option
                      ? 'bg-primary-600 text-white border-primary-600'
                      : 'bg-white/10 hover:bg-white/20 text-white border-white/20'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        ))}
      </QuestionCard>

      {/* Captcha */}
      <QuestionCard title="Verification">
        <p className="text-sm text-gray-300 mb-4">Please verify you're human before submitting.</p>
        <div className="overflow-x-auto max-w-full"> {/* Added wrapper for overflow handling */}
          <CaptchaComponent onVerify={handleCaptchaVerify} />
        </div>
      </QuestionCard>

      {/* Final Review Notice */}
      <div className="text-center p-4 bg-green-900/50 border border-green-500/30 rounded-lg mt-8">
        <h4 className="font-bold text-green-300">Final Step!</h4>
        <p className="text-xs text-green-300/80">You're about to submit your application. Click the "Submit Application" button to finalize.</p>
      </div>
    </div>
  );
};

export default Step3Personality;