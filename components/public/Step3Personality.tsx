// components/public/Step3Personality.tsx - V2 Refactor with BFI-10
import React, { useState, useEffect } from 'react';
import { ApplicationFormData } from '../../types';
import CaptchaComponent from './CaptchaComponent';

// --- BFI-10 (Big Five Inventory - 10 items) Configuration ---
const BFI_10_STATEMENTS = [
  { id: 'q1', text: '...is reserved', trait: 'extraversion', reverse: true },
  { id: 'q2', text: '...is generally trusting', trait: 'agreeableness', reverse: false },
  { id: 'q3', text: '...tends to be lazy', trait: 'conscientiousness', reverse: true },
  { id: 'q4', text: '...is relaxed, handles stress well', trait: 'neuroticism', reverse: true },
  { id: 'q5', text: '...has few artistic interests', trait: 'openness', reverse: true },
  { id: 'q6', text: '...is outgoing, sociable', trait: 'extraversion', reverse: false },
  { id: 'q7', text: '...tends to find fault with others', trait: 'agreeableness', reverse: true },
  { id: 'q8', text: '...does a thorough job', trait: 'conscientiousness', reverse: false },
  { id: 'q9', text: '...gets nervous easily', trait: 'neuroticism', reverse: false },
  { id: 'q10', text: '...has an active imagination', trait: 'openness', reverse: false },
];

const LIKERT_SCALE_OPTIONS = [
  { value: 1, label: 'Disagree Strongly' },
  { value: 2, label: 'Disagree a little' },
  { value: 3, label: 'Neutral' },
  { value: 4, label: 'Agree a little' },
  { value: 5, label: 'Agree Strongly' },
];

// --- Component Interfaces ---
interface Props {
  formData: ApplicationFormData;
  handleChange: (field: keyof ApplicationFormData, value: any) => void;
  handleCaptchaVerify: (token: string | null) => void;
}

const QuestionCard: React.FC<{ title: string; children: React.ReactNode; className?: string }> = ({ title, children, className }) => (
  <div className={`p-4 sm:p-6 rounded-xl bg-slate-800/60 backdrop-blur-lg border border-white/10 ${className}`}>
    <h3 className="text-white font-bold text-sm mb-4">{title}</h3>
    {children}
  </div>
);

// --- Main Component ---
const Step3Personality: React.FC<Props> = ({ handleChange, handleCaptchaVerify }) => {
  const [answers, setAnswers] = useState<Record<string, number | null>>({});

  useEffect(() => {
    // Calculate scores only when all questions are answered
    if (Object.keys(answers).length !== BFI_10_STATEMENTS.length) {
      return;
    }

    const scores: { [key: string]: number[] } = {
      extraversion: [],
      agreeableness: [],
      conscientiousness: [],
      neuroticism: [],
      openness: [],
    };

    BFI_10_STATEMENTS.forEach(statement => {
      let score = answers[statement.id];
      if (score === null || score === undefined) return;

      if (statement.reverse) {
        score = 6 - score;
      }
      scores[statement.trait].push(score);
    });

    const finalPsychometrics: { [key: string]: number } = {};
    for (const trait in scores) {
      const traitScores = scores[trait];
      if (traitScores.length > 0) {
        const average = traitScores.reduce((a, b) => a + b, 0) / traitScores.length;
        // Scale from 1-5 range to 0-100 range
        const scaledScore = ((average - 1) / 4) * 100;
        finalPsychometrics[trait] = Math.round(scaledScore);
      }
    }
    
    handleChange('psychometrics', finalPsychometrics);

  }, [answers, handleChange]);

  const handleAnswerChange = (questionId: string, value: number) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-white">Step 3: Your Work Style</h2>
        <p className="text-gray-400">This short, scientifically-validated assessment helps us understand your personality. Please answer honestly.</p>
      </div>

      <QuestionCard title="I see myself as someone who...">
        <div className="space-y-4">
          {BFI_10_STATEMENTS.map(q => (
            <div key={q.id} className="border-b border-white/10 pb-4 last:border-b-0">
              <p className="text-white mb-3 text-sm">{q.text}</p>
              <div className="flex flex-wrap gap-2 justify-center">
                {LIKERT_SCALE_OPTIONS.map(option => (
                  <button
                    type="button"
                    key={option.value}
                    onClick={() => handleAnswerChange(q.id, option.value)}
                    className={`px-3 py-1.5 text-[10px] font-bold rounded-full transition-all duration-200 border ${
                      answers[q.id] === option.value
                        ? 'bg-primary-600 text-white border-primary-600'
                        : 'bg-white/10 hover:bg-white/20 text-white border-white/20'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </QuestionCard>

      <QuestionCard title="Verification">
        <p className="text-sm text-gray-300 mb-4">Almost there! Please verify you're human.</p>
        <div className="overflow-x-auto max-w-full">
          <CaptchaComponent onVerify={handleCaptchaVerify} />
        </div>
      </QuestionCard>
      
      <div className="text-center p-4 bg-green-900/50 border border-green-500/30 rounded-lg mt-8">
        <h4 className="font-bold text-green-300">Final Step!</h4>
        <p className="text-xs text-green-300/80">You're about to submit your application. Click the "Submit Application" button to finalize.</p>
      </div>
    </div>
  );
};

export default Step3Personality;
