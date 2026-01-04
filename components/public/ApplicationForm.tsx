
import React, { useState } from 'react';
import { submitApplicationAction } from '../../lib/actions';
import InputField from '../InputField';
import SpinnerIcon from '../icons/SpinnerIcon';
import ThankYouView from '../ThankYouView';
import type { ApplicationFormData } from '../../types';

const discQuestions = [
  { id: 'disc_q1', text: 'I am assertive, and direct.' },
  { id: 'disc_q2', text: 'I am optimistic and outgoing.' },
  { id: 'disc_q3', text: 'I am patient and a good listener.' },
  { id: 'disc_q4', text: 'I am precise and analytical.' },
  { id: 'disc_q5', text: 'I like to take on challenges.' },
  { id: 'disc_q6', text: 'I enjoy persuading and influencing others.' },
  { id: 'disc_q7', text: 'I prefer a stable and predictable environment.' },
  { id: 'disc_q8', text: 'I value accuracy and quality.' },
  { id: 'disc_q9', text: 'I can be demanding at times.' },
  { id: 'disc_q10', text: 'I enjoy collaborating in a team.' },
];

const projectInterests = ['Web Development', 'Mobile Development', 'AI/ML', 'DevOps', 'UI/UX Design'];

const ApplicationForm: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  
  const [formData, setFormData] = useState<ApplicationFormData>({
    full_name: '',
    email: '',
    timezone: '',
    availability_hours_per_week: 40,
    availability_start_date: '',
    availability_end_date: '',
    project_interest: [],
    disc_q1: '',
    disc_q2: '',
    disc_q3: '',
    disc_q4: '',
    disc_q5: '',
    disc_q6: '',
    disc_q7: '',
    disc_q8: '',
    disc_q9: '',
    disc_q10: '',
    motivation_text: '',
    project_example_text: '',
    requirements_handling_text: '',
    remote_work_text: '',
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleMultiSelectChange = (name: string, value: string) => {
    setFormData(prev => {
      const existing = prev[name] as string[] || [];
      const newValues = existing.includes(value)
        ? existing.filter(v => v !== value)
        : [...existing, value];
      return { ...prev, [name]: newValues };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrors([]);
    
    const result = await submitApplicationAction(formData);
    
    setLoading(false);
    if (result.success) {
      setSubmitted(true);
    } else {
      setErrors([result.error || 'An unknown error occurred.']);
    }
  };

  if (submitted) return <ThankYouView />;

  return (
    <div className="glass-card p-8 md:p-14 rounded-[4rem] shadow-2xl border-white/50">
      <h2 className="text-4xl font-black text-gray-900 dark:text-white tracking-tighter mb-2">
        Apply Now
      </h2>
      <p className="text-gray-500 dark:text-gray-400 font-medium mb-10">
        Show us your potential. Fill out the form to get started.
      </p>

      <form onSubmit={handleSubmit} className="space-y-12">
        {/* Personal & Availability */}
        <div className="space-y-6">
          <h3 className="text-lg font-bold border-b pb-2">Personal & Availability</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <InputField id="full_name" name="full_name" label="Full Name" type="text" value={formData.full_name} onChange={handleInputChange} required />
            <InputField id="email" name="email" label="Email" type="email" value={formData.email} onChange={handleInputChange} required />
            <InputField id="timezone" name="timezone" label="Your Timezone" type="text" placeholder="e.g., Europe/Berlin" value={formData.timezone} onChange={handleInputChange} required />
            <InputField id="availability_hours_per_week" name="availability_hours_per_week" label="Hours/Week" type="number" value={formData.availability_hours_per_week} onChange={handleInputChange} required />
            <InputField id="availability_start_date" name="availability_start_date" label="Available From" type="date" value={formData.availability_start_date} onChange={handleInputChange} required />
            <InputField id="availability_end_date" name="availability_end_date" label="Available Until" type="date" value={formData.availability_end_date} onChange={handleInputChange} />
          </div>
        </div>

        {/* Project Interest */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold border-b pb-2">Project Interest</h3>
          <div className="flex flex-wrap gap-3">
            {projectInterests.map(interest => (
              <button
                key={interest}
                type="button"
                onClick={() => handleMultiSelectChange('project_interest', interest)}
                className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
                  formData.project_interest.includes(interest)
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-200 dark:bg-slate-700'
                }`}
              >
                {interest}
              </button>
            ))}
          </div>
        </div>

        {/* DISC Questionnaire */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold border-b pb-2">DISC Questionnaire</h3>
          {discQuestions.map((q, index) => (
            <div key={q.id}>
              <p className="font-semibold mb-2">{index + 1}. {q.text}</p>
              <div className="flex gap-4">
                {['A', 'B', 'C', 'D'].map(option => (
                  <label key={option} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name={q.id}
                      value={option}
                      onChange={handleInputChange}
                      required
                      className="form-radio"
                    />
                    {option}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Written Questions */}
        <div className="space-y-6">
          <h3 className="text-lg font-bold border-b pb-2">Written Questions</h3>
          <div>
            <label className="block font-semibold mb-2">What is your motivation to work with us?</label>
            <textarea name="motivation_text" rows={4} value={formData.motivation_text} onChange={handleInputChange} className="w-full p-2 border rounded" required />
          </div>
          <div>
            <label className="block font-semibold mb-2">Describe an independent project you are proud of.</label>
            <textarea name="project_example_text" rows={4} value={formData.project_example_text} onChange={handleInputChange} className="w-full p-2 border rounded" required />
          </div>
          <div>
            <label className="block font-semibold mb-2">How do you handle unclear requirements?</label>
            <textarea name="requirements_handling_text" rows={4} value={formData.requirements_handling_text} onChange={handleInputChange} className="w-full p-2 border rounded" required />
          </div>
          <div>
            <label className="block font-semibold mb-2">How do you organize yourself for remote work?</label>
            <textarea name="remote_work_text" rows={4} value={formData.remote_work_text} onChange={handleInputChange} className="w-full p-2 border rounded" required />
          </div>
        </div>

        {errors.length > 0 && (
          <div className="p-4 rounded-2xl bg-red-500/10 text-red-500 text-center">
            {errors.join(' • ')}
          </div>
        )}

        <button type="submit" disabled={loading} className="w-full py-4 bg-green-600 text-white font-bold rounded-lg disabled:opacity-50">
          {loading ? <SpinnerIcon className="animate-spin h-6 w-6 mx-auto" /> : 'Submit Application'}
        </button>
      </form>
    </div>
  );
};

export default ApplicationForm;
