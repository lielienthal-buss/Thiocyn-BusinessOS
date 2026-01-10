import React from 'react';
import { ApplicationFormData } from '../../types';

// Re-usable Card component for consistent styling
const QuestionCard: React.FC<{ title: string; children: React.ReactNode; className?: string }> = ({ title, children, className }) => (
  <div className={`p-4 sm:p-6 rounded-xl flex flex-col gap-2 sm:gap-3 bg-slate-800/60 backdrop-blur-lg border border-white/10 ${className}`}> {/* Reduced padding and gap for mobile */}
    <h3 className="text-white font-bold text-sm">{title}</h3>
    {children}
  </div>
);

// Character counter component
const CharCounter: React.FC<{ text: string; maxLength: number }> = ({ text, maxLength }) => (
  <div className="text-right text-xs font-mono text-gray-400">
    {text.length} / {maxLength}
  </div>
);

// Interest options for the multi-select
const INTEREST_OPTIONS = [
  "Frontend Development",
  "Backend Development",
  "UI/UX Design",
  "AI/ML Engineering",
  "Project Management",
  "DevOps",
  "Video Creation/Marketing", // Added new option
];

interface Props {
  formData: ApplicationFormData;
  handleChange: (field: keyof ApplicationFormData, value: any) => void;
}

const Step2Experience: React.FC<Props> = ({ formData, handleChange }) => {
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    handleChange(e.target.name as keyof ApplicationFormData, e.target.value);
  };

  const handleInterestToggle = (interest: string) => {
    const newInterests = formData.project_interest.includes(interest)
      ? formData.project_interest.filter(i => i !== interest)
      : [...formData.project_interest, interest];
    handleChange('project_interest', newInterests);
  };

  return (
    <div className="space-y-4 sm:space-y-6"> {/* Reduced space-y for mobile */}
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-white">Step 2: How do you work?</h2>
        <p className="text-gray-400">Tell us about your experience and work style.</p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Project Example */}
        <QuestionCard title="Proud Project (max. 200 chars)">
          <textarea
            name="project_example_text"
            placeholder="Describe a project you are proud of."
            value={formData.project_example_text}
            onChange={handleTextChange}
            className="input-field h-24 resize-none"
            maxLength={200}
          />
          <CharCounter text={formData.project_example_text} maxLength={200} />
        </QuestionCard>

        {/* Requirements Handling */}
        <QuestionCard title="Handling Unclear Requirements (max. 200 chars)">
          <textarea
            name="requirements_handling_text"
            placeholder="How do you proceed when requirements are unclear?"
            value={formData.requirements_handling_text}
            onChange={handleTextChange}
            className="input-field h-24 resize-none"
            maxLength={200}
          />
          <CharCounter text={formData.requirements_handling_text} maxLength={200} />
        </QuestionCard>

        {/* Remote Work */}
        <QuestionCard title="Remote Work Organization (max. 200 chars)">
          <textarea
            name="remote_work_text"
            placeholder="How do you organize yourself in a remote work environment?"
            value={formData.remote_work_text}
            onChange={handleTextChange}
            className="input-field h-24 resize-none"
            maxLength={200}
          />
          <CharCounter text={formData.remote_work_text} maxLength={200} />
        </QuestionCard>

        {/* Project Interest */}
        <QuestionCard title="Areas of Interest">
          <div className="flex flex-wrap gap-2">
            {INTEREST_OPTIONS.map(interest => (
              <button
                type="button"
                key={interest}
                onClick={() => handleInterestToggle(interest)}
                className={`px-4 py-2 rounded-full text-xs font-bold transition-all duration-200 border ${
                  formData.project_interest.includes(interest)
                    ? 'bg-primary-600 text-white border-primary-600'
                    : 'bg-white/10 hover:bg-white/20 text-white border-white/20'
                }`}
              >
                {interest}
              </button>
            ))}
          </div>
        </QuestionCard>
      </div>
    </div>
  );
};

export default Step2Experience;
