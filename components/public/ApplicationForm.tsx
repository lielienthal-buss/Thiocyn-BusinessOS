import React, { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { ApplicationFormData } from '../../types';

import Step1Basics from './Step1Basics';
import Step2Experience from './Step2Experience';
import Step3Personality from './Step3Personality';

const initialFormData: ApplicationFormData = {
  // Step 1
  full_name: '',
  email: '',
  timezone: '',
  availability_hours_per_week: null,
  available_from: '',
  available_until: '',
  motivation_text: '',
  cover_letter: '',

  // Step 2
  project_example_text: '',
  requirements_handling_text: '',
  remote_work_text: '',
  project_interest: [],
  availability_start_date: '',
  availability_end_date: '',

  // Step 3
  disc_answers: {},
  captcha_token: null,
};

const Stepper: React.FC<{ currentStep: number }> = ({ currentStep }) => (
  <div className="flex justify-center items-center mb-12">
    <div className="flex items-center">
      {[1, 2, 3].map((step, index) => (
        <React.Fragment key={step}>
          <div className="flex items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 ${
                currentStep >= step ? 'bg-primary-600 text-white' : 'bg-gray-200 dark:bg-slate-700 text-gray-500'
              }`}
            >
              {step}
            </div>
            <div className={`text-xs font-bold uppercase tracking-widest ml-3 mr-6 ${currentStep >= step ? 'text-gray-800 dark:text-white' : 'text-gray-400 dark:text-slate-500'}`}>
              {step === 1 && 'Basics'}
              {step === 2 && 'Experience'}
              {step === 3 && 'Personality'}
            </div>
          </div>
          {index < 2 && (
            <div className="w-16 h-1 bg-gray-200 dark:bg-slate-700 rounded-full">
              <div
                className="h-1 rounded-full bg-primary-600 transition-all duration-500"
                style={{ width: currentStep > step ? '100%' : '0%' }}
              ></div>
            </div>
          )}
        </React.Fragment>
      ))}
    </div>
  </div>
);


const ApplicationForm: React.FC = () => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [formData, setFormData] = useState<ApplicationFormData>(initialFormData);
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };
  
  const handleCaptchaVerify = (token: string | null) => {
    handleChange('captcha_token', token);
  };

  const handleNext = () => {
    if (step < 3) {
      setStep(prev => (prev + 1) as 2 | 3);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(prev => (prev - 1) as 1 | 2);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.captcha_token) {
      alert("Please complete the captcha before submitting.");
      return;
    }
    if (!formData.full_name || !formData.email) {
      alert("Name and Email are mandatory fields.");
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from("applications").insert({
        // Map all fields from formData to the DB schema
        full_name: formData.full_name,
        email: formData.email,
        timezone: formData.timezone,
        availability_hours_per_week: formData.availability_hours_per_week,
        available_from: formData.available_from || null,
        available_until: formData.available_until || null,
        motivation_text: formData.motivation_text,
        cover_letter: formData.cover_letter,
        project_example_text: formData.project_example_text,
        requirements_handling_text: formData.requirements_handling_text,
        remote_work_text: formData.remote_work_text,
        project_interest: formData.project_interest,
        availability_start_date: formData.availability_start_date || null,
        availability_end_date: formData.availability_end_date || null,
        disc_answers: formData.disc_answers,
        captcha_token: formData.captcha_token,
      });

      if (error) throw error;

      alert("Application submitted successfully!");
      setFormData(initialFormData);
      setStep(1);

    } catch (err) {
      console.error("Submission error:", err);
      alert("Failed to submit application: " + (err instanceof Error ? err.message : "Unknown error"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <Stepper currentStep={step} />
      
      <form onSubmit={handleSubmit} className="glass-card p-8 rounded-2xl shadow-2xl">
        <div className="animate-[fadeIn_0.5s_ease-out]">
          {step === 1 && <Step1Basics formData={formData} handleChange={handleChange} />}
          {step === 2 && <Step2Experience formData={formData} handleChange={handleChange} />}
          {step === 3 && <Step3Personality formData={formData} handleChange={handleChange} handleCaptchaVerify={handleCaptchaVerify} />}
        </div>

        <div className="flex justify-between items-center mt-12 pt-6 border-t border-white/10">
          <div>
            {step > 1 && (
              <button type="button" onClick={handleBack} className="text-sm font-bold text-gray-500 hover:text-white transition">
                &larr; Back
              </button>
            )}
          </div>
          <div>
            {step < 3 && (
              <button type="button" onClick={handleNext} className="px-6 py-3 bg-primary-600 hover:bg-primary-700 rounded-xl text-white font-semibold transition shadow-md hover:shadow-xl">
                Next Step &rarr;
              </button>
            )}
            {step === 3 && (
              <button type="submit" disabled={submitting} className="px-6 py-3 bg-green-600 hover:bg-green-700 rounded-xl text-white font-semibold transition shadow-md hover:shadow-xl">
                {submitting ? "Submitting..." : "Submit Application"}
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
};

export default ApplicationForm;
