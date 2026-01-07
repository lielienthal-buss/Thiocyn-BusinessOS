import React from 'react';
import { ApplicationFormData } from '../../types';

// Re-usable Card component for consistent styling
const QuestionCard: React.FC<{ title: string; children: React.ReactNode; className?: string }> = ({ title, children, className }) => (
  <div className={`p-6 rounded-xl flex flex-col gap-3 bg-slate-800/60 backdrop-blur-lg border border-white/10 ${className}`}>
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

interface Props {
  formData: ApplicationFormData;
  handleChange: (field: keyof ApplicationFormData, value: any) => void;
}

const Step1Basics: React.FC<Props> = ({ formData, handleChange }) => {
  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    handleChange(e.target.name as keyof ApplicationFormData, e.target.value);
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-white">Step 1: Who are you & why are you applying?</h2>
        <p className="text-gray-400">Let's start with the basics.</p>
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

        {/* Motivation */}
        <QuestionCard title="Motivation (max. 200 chars)" className="md:col-span-2">
          <textarea
            name="motivation_text"
            placeholder="What excites you about this opportunity?"
            value={formData.motivation_text}
            onChange={handleTextChange}
            className="input-field h-24 resize-none"
            maxLength={200}
          />
          <CharCounter text={formData.motivation_text} maxLength={200} />
        </QuestionCard>

        {/* Cover Letter */}
        <QuestionCard title="Cover Letter (optional, max. 200 chars)" className="md:col-span-2">
          <textarea
            name="cover_letter"
            placeholder="Anything else you'd like to share?"
            value={formData.cover_letter}
            onChange={handleTextChange}
            className="input-field h-24 resize-none"
            maxLength={200}
          />
          <CharCounter text={formData.cover_letter} maxLength={200} />
        </QuestionCard>

        {/* Timezone */}
        <QuestionCard title="Your Timezone">
          <input
            type="text"
            name="timezone"
            placeholder="e.g., CET, PST"
            value={formData.timezone}
            onChange={handleTextChange}
            className="input-field"
          />
        </QuestionCard>

        {/* Availability (Hours) */}
        <QuestionCard title="Available Hours per Week">
          <input
            type="number"
            name="availability_hours_per_week"
            placeholder="e.g., 20"
            value={formData.availability_hours_per_week || ''}
            onChange={(e) => handleChange('availability_hours_per_week', e.target.value ? parseInt(e.target.value, 10) : null)}
            className="input-field"
          />
        </QuestionCard>

        {/* Available From */}
        <QuestionCard title="Available From">
          <input
            type="date"
            name="available_from"
            value={formData.available_from}
            onChange={handleTextChange}
            className="input-field"
          />
        </QuestionCard>

        {/* Available Until */}
        <QuestionCard title="Available Until">
          <input
            type="date"
            name="available_until"
            value={formData.available_until}
            onChange={handleTextChange}
            className="input-field"
          />
        </QuestionCard>
      </div>
    </div>
  );
};

export default Step1Basics;