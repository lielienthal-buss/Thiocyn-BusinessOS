import React, { useState } from 'react';
import CaptchaComponent from './CaptchaComponent'; // Dein Captcha Wrapper
import '../../index.css'; // Stelle sicher, dass Tailwind + Fonts geladen sind

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
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    console.log("Submitting form, captcha token =", captchaToken);
    e.preventDefault();

    if (!captchaToken) {
      alert("Bitte bestätige das Captcha.");
      return;
    }

    setSubmitting(true);

    try {
      console.log("Submitting with captcha:", captchaToken);

      // TODO: Supabase insert
    } catch (err) {
      console.error(err);
      alert("Fehler beim Absenden.");
    } finally {
      setSubmitting(false);
    }
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
          disabled={submitting}
          className="px-6 py-3 bg-primary-600 hover:bg-primary-700 rounded-xl text-white font-semibold transition shadow-md hover:shadow-xl"
        >
          {submitting ? "Sende…" : "Bewerbung absenden"}
        </button>
      </div>
    </form>
  );
};

export default ApplicationForm;