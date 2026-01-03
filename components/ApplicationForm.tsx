
import React, { useState, ChangeEvent, FormEvent, FocusEvent } from 'react';
import type { ApplicationData } from '../types';
import { submitApplication } from '../services/submissionService';

import InputField from './InputField';
import UserIcon from './icons/UserIcon';
import EmailIcon from './icons/EmailIcon';
import LinkedInIcon from './icons/LinkedInIcon';
import UploadIcon from './icons/UploadIcon';
import SpinnerIcon from './icons/SpinnerIcon';
import ThankYouView from './ThankYouView';

type FormErrors = {
  [K in keyof ApplicationData]?: string;
} & {
  privacy?: string;
};

const ApplicationForm: React.FC = () => {
  const [formData, setFormData] = useState<ApplicationData>({
    fullName: '',
    email: '',
    linkedinUrl: '',
    coverLetter: '',
    resume: null,
  });
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const validateField = (name: string, value: any): string | undefined => {
    switch (name) {
      case 'fullName':
        if (!value || !value.trim()) return "Vollständiger Name ist erforderlich.";
        break;
      case 'email':
        if (!value || !value.trim()) return "E-Mail ist erforderlich.";
        if (!/\S+@\S+\.\S+/.test(value)) return "Bitte geben Sie eine gültige E-Mail-Adresse ein.";
        break;
      case 'linkedinUrl':
        if (!value || !value.trim()) return "LinkedIn Profil-URL ist erforderlich.";
        if (!/^https?:\/\/(www\.)?linkedin\.com\/in\/[a-zA-Z0-9-]+\/?$/.test(value)) {
            return "Bitte geben Sie eine gültige LinkedIn Profil-URL ein.";
        }
        break;
      case 'resume':
        if (!value) return "Ein Lebenslauf ist erforderlich.";
        break;
      case 'privacy':
        if (!value) return "Bitte akzeptieren Sie die Datenschutzerklärung, um fortzufahren.";
        break;
      default:
        return undefined;
    }
  };

  const handleBlur = (e: FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    const error = validateField(id, value);
    setErrors(prev => ({
      ...prev,
      [id as keyof FormErrors]: error
    }));
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    // Fix: cast id to keyof ApplicationData to resolve potential indexing type errors
    setFormData(prev => ({ ...prev, [id as keyof ApplicationData]: value }));
    
    // If there is an existing error, validate on change to allow clearing it immediately
    if (errors[id as keyof FormErrors]) {
      const error = validateField(id, value);
      setErrors(prev => ({
        ...prev,
        [id as keyof FormErrors]: error
      }));
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setFormData(prev => ({ ...prev, resume: file }));
      if (errors.resume) {
        setErrors(prev => ({...prev, resume: undefined}));
      }
    }
  };

  const handlePrivacyChange = (e: ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    setPrivacyAccepted(checked);
    if (errors.privacy && checked) {
      setErrors(prev => ({ ...prev, privacy: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    
    const nameError = validateField('fullName', formData.fullName);
    if (nameError) newErrors.fullName = nameError;

    const emailError = validateField('email', formData.email);
    if (emailError) newErrors.email = emailError;

    const linkedinError = validateField('linkedinUrl', formData.linkedinUrl);
    if (linkedinError) newErrors.linkedinUrl = linkedinError;

    const resumeError = validateField('resume', formData.resume);
    if (resumeError) newErrors.resume = resumeError;
    
    const privacyError = validateField('privacy', privacyAccepted);
    if (privacyError) newErrors.privacy = privacyError;

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    setSubmitError(null);
    try {
      await submitApplication(formData);
      setIsSubmitted(true);
    } catch (error) {
      setSubmitError('Ein Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };
  
  if (isSubmitted) {
    return <ThankYouView />;
  }

  return (
    <div className="bg-white dark:bg-slate-800 p-6 sm:p-8 rounded-2xl shadow-lg transition-all duration-300">
      <form onSubmit={handleSubmit} noValidate>
        <div className="space-y-6">
          <InputField
            id="fullName"
            label="Vollständiger Name"
            type="text"
            placeholder="Max Mustermann"
            value={formData.fullName}
            onChange={handleInputChange}
            onBlur={handleBlur}
            icon={<UserIcon />}
            error={errors.fullName}
          />
          <InputField
            id="email"
            label="E-Mail Adresse"
            type="email"
            placeholder="max.mustermann@email.com"
            value={formData.email}
            onChange={handleInputChange}
            onBlur={handleBlur}
            icon={<EmailIcon />}
            error={errors.email}
          />
          <InputField
            id="linkedinUrl"
            label="LinkedIn Profil URL"
            type="url"
            placeholder="https://linkedin.com/in/..."
            value={formData.linkedinUrl}
            onChange={handleInputChange}
            onBlur={handleBlur}
            icon={<LinkedInIcon />}
            error={errors.linkedinUrl}
          />
          <div>
            <label htmlFor="resume" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Lebenslauf (PDF, DOCX)
            </label>
            <label htmlFor="resume" className={`relative cursor-pointer bg-white dark:bg-slate-700 rounded-md font-medium hover:text-primary-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary-500 border flex items-center justify-center p-4 text-center transition-colors ${errors.resume ? 'border-red-500 text-red-600 dark:text-red-400' : 'border-gray-300 dark:border-slate-600 text-primary-600 dark:text-primary-400'}`}>
              <UploadIcon className="w-6 h-6 mr-2" />
              <span>{formData.resume ? formData.resume.name : 'Datei hochladen'}</span>
              <input id="resume" name="resume" type="file" className="sr-only" onChange={handleFileChange} accept=".pdf,.doc,.docx" />
            </label>
            {errors.resume && <p className="mt-1 text-sm text-red-600 dark:text-red-400 animate-[fadeIn_0.3s_ease-in-out]">{errors.resume}</p>}
          </div>
          <div>
            <label htmlFor="coverLetter" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Anschreiben (Optional)
            </label>
            <textarea
              id="coverLetter"
              rows={4}
              className="appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm bg-gray-50 dark:bg-slate-700"
              placeholder="Erzählen Sie uns kurz, warum Sie die richtige Person für die Stelle sind..."
              value={formData.coverLetter}
              onChange={handleInputChange}
              onBlur={handleBlur}
            />
          </div>

          <div className="relative flex items-start pt-2">
            <div className="flex items-center h-5">
              <input
                id="privacy"
                name="privacy"
                type="checkbox"
                checked={privacyAccepted}
                onChange={handlePrivacyChange}
                className={`focus:ring-primary-500 h-4 w-4 text-primary-600 border rounded transition-colors ${errors.privacy ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-300 dark:border-slate-600'}`}
              />
            </div>
            <div className="ml-3 text-sm">
              <label htmlFor="privacy" className="font-medium text-gray-700 dark:text-gray-300">
                Datenschutz
              </label>
              <p className="text-gray-500 dark:text-gray-400">
                Ich stimme der Verarbeitung meiner Daten gemäß der <a href="#" className="text-primary-600 dark:text-primary-400 hover:underline">Datenschutzerklärung</a> zu.
              </p>
              {errors.privacy && <p className="mt-1 text-sm text-red-600 dark:text-red-400 animate-[fadeIn_0.3s_ease-in-out]">{errors.privacy}</p>}
            </div>
          </div>
        </div>
        
        {submitError && <p className="mt-4 text-sm text-center text-red-600 dark:text-red-400 animate-[fadeIn_0.3s_ease-in-out]">{submitError}</p>}
        
        <div className="mt-8">
          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:bg-primary-300 disabled:cursor-not-allowed dark:disabled:bg-primary-800 transition-colors"
          >
            {isLoading ? (
              <>
                <SpinnerIcon className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" />
                Wird gesendet...
              </>
            ) : (
              'Bewerbung absenden'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ApplicationForm;
