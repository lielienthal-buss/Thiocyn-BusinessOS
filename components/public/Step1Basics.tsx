// components/public/Step1Basics.tsx - V2 Refactor
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

const Step1Basics: React.FC<Props> = ({ formData, handleChange }) => {
  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleChange(e.target.name as keyof ApplicationFormData, e.target.value);
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-white">Step 1: The Basics</h2>
        <p className="text-gray-400">Let's start with your contact information.</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Full Name */}
        <QuestionCard title="Full Name">
          <input
            type="text"
            name="full_name"
            placeholder="John Doe"
            value={formData.full_name}
            onChange={handleTextChange}
            className="input-field"
            required
          />
        </QuestionCard>

        {/* Email */}
        <QuestionCard title="Email Address">
          <input
            type="email"
            name="email"
            placeholder="john.doe@example.com"
            value={formData.email}
            onChange={handleTextChange}
            className="input-field"
            required
          />
        </QuestionCard>
      </div>
    </div>
  );
};

export default Step1Basics;
