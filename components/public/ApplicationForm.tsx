import React, { useState } from 'react';
import CaptchaComponent from './CaptchaComponent'; // Dein Captcha Wrapper
import './index.css'; // Stelle sicher, dass Tailwind + Fonts geladen sind

interface ApplicationFormData {
  full_name: string;
  email: string;
  cover_letter: string;
  [key: string]: any;
}

const QuestionCard: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 shadow-lg flex flex-col gap-4">
    <h3 className="text-white text-lg font-semibold">{title}</h3>
    {children}
  </div>
);

const ApplicationForm: React.FC = () => {
  const [formData, setFormData] = useState<ApplicationFormData>({
    full_name: '',
    email: '',
    cover_letter: '',
  });

  const [captchaToken, setCaptchaToken] = useState<string | null>(null); // Captcha Token bleibt dynamisch
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!captchaToken) return alert('Bitte Captcha bestätigen');
    console.log('Form submitted', formData);
    setSubmitted(true);
  };

  return (
    <form onSubmit={handleSubmit} className="p-6 grid grid-cols-12 gap-6">
      {/* Name */}
      <div className="col-span-12 md:col-span-6 lg:col-span-4">
        <QuestionCard title="Full Name">
          <input
            type="text"
            placeholder="John Doe"
            value={formData.full_name}
            onChange={(e) => handleChange('full_name', e.target.value)}
            className="input-field"
            required
          />
        </QuestionCard>
      </div>

      {/* Email */}
      <div className="col-span-12 md:col-span-6 lg:col-span-4">
        <QuestionCard title="Email">
          <input
            type="email"
            placeholder="john @example.com"
            value={formData.email}
            onChange={(e) => handleChange('email', e.target.value)}
            className="input-field"
            required
          />
        </QuestionCard>
      </div>

      {/* Cover Letter */}
      <div className="col-span-12 md:col-span-12 lg:col-span-4">
        <QuestionCard title="Cover Letter">
          <textarea
            placeholder="Tell us about yourself"
            value={formData.cover_letter}
            onChange={(e) => handleChange('cover_letter', e.target.value)}
            className="input-field h-32 resize-none"
            required
          />
        </QuestionCard>
      </div>

      {/* Captcha eingebettet, volle Breite */}
      <div className="col-span-12">
        <QuestionCard title="Captcha Verification">
          <CaptchaComponent onVerify={setCaptchaToken} />
        </QuestionCard>
      </div>

      {/* Submit Button */}
      <div className="col-span-12 flex justify-end">
        <button
          type="submit"
          className="px-6 py-3 bg-primary/80 hover:bg-primary/100 rounded-xl text-white font-semibold transition shadow-md hover:shadow-xl"
        >
          Submit
        </button>
      </div>
    </form>
  );
};

export default ApplicationForm;