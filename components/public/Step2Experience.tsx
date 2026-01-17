// components/public/Step2Experience.tsx - V2 Refactor
import React from 'react';
import { ApplicationFormData } from '../../types';

// Re-usable Card component for consistent styling
const QuestionCard: React.FC<{ title: string; children: React.ReactNode; className?: string }> = ({ title, children, className }) => (
  <div className={`p-4 sm:p-6 rounded-xl flex flex-col gap-3 bg-slate-800/60 backdrop-blur-lg border border-white/10 ${className}`}>
    <h3 className="text-white font-bold text-sm">{title}</h3>
    {children}
  </div>
);

interface Props {
  formData: ApplicationFormData;
  handleChange: (field: keyof ApplicationFormData, value: any) => void;
}

const Step2Experience: React.FC<Props> = ({ formData, handleChange }) => {
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    handleChange(e.target.name as keyof ApplicationFormData, e.target.value);
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-white">Step 2: Your Experience</h2>
        <p className="text-gray-400">Show us what you've built and what you're proud of.</p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* LinkedIn / Portfolio URL */}
        <QuestionCard title="Your Professional Profile">
          <p className="text-xs text-gray-400 -mt-2 mb-2">
            Link to your LinkedIn, GitHub, or personal portfolio. This replaces a traditional CV.
          </p>
          <input
            type="url"
            name="linkedin_url"
            placeholder="https://www.linkedin.com/in/your-name/"
            value={formData.linkedin_url}
            onChange={handleTextChange}
            className="input-field"
            required
          />
        </QuestionCard>

        {/* Project Highlight */}
        <QuestionCard title="Project Highlight">
           <p className="text-xs text-gray-400 -mt-2 mb-2">
            Describe one specific project from the last 2 years you are most proud of. What was your exact contribution?
          </p>
          <textarea
            name="project_highlight"
            placeholder="e.g., I was responsible for the entire checkout flow, from UI design in Figma to implementing the React components and integrating the Stripe API..."
            value={formData.project_highlight}
            onChange={handleTextChange}
            className="input-field h-32 resize-none"
            maxLength={750}
            required
          />
           <div className="text-right text-xs font-mono text-gray-400">
            {formData.project_highlight.length} / 750
          </div>
        </QuestionCard>
      </div>
    </div>
  );
};

export default Step2Experience;