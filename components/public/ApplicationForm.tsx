
import React, { useState } from 'react';
import { submitApplicationAction } from '../../lib/actions';
import InputField from '../InputField';
import UserIcon from '../icons/UserIcon';
import EmailIcon from '../icons/EmailIcon';
import LinkedInIcon from '../icons/LinkedInIcon';
import UploadIcon from '../icons/UploadIcon';
import SpinnerIcon from '../icons/SpinnerIcon';
import ThankYouView from '../ThankYouView';

const ApplicationForm: React.FC = () => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    linkedinUrl: '',
    cv: null as File | null,
    task: null as File | null,
    personality: {} as Record<string, number>,
    consent: false
  });

  const validateStep = (currentStep: number) => {
    const newErrors: string[] = [];
    if (currentStep === 1) {
      if (!formData.fullName) newErrors.push("Name is required");
      if (!formData.email || !formData.email.includes('@')) newErrors.push("Valid email required");
      if (!formData.linkedinUrl) newErrors.push("LinkedIn URL required");
    } else if (currentStep === 2) {
      if (!formData.cv) newErrors.push("CV missing");
      if (formData.cv && formData.cv.type !== 'application/pdf') newErrors.push("Only PDF allowed for CV");
      if (!formData.task) newErrors.push("Mini-Task missing");
      if (formData.task && formData.task.type !== 'application/pdf') newErrors.push("Only PDF allowed for Task");
    } else if (currentStep === 3) {
      if (Object.keys(formData.personality).length < 5) newErrors.push("Please answer all personality questions");
      if (!formData.consent) newErrors.push("Consent required");
    }
    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const handleNext = () => {
    if (validateStep(step)) setStep(step + 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep(3)) return;

    setLoading(true);
    const result = await submitApplicationAction({
      ...formData,
      miniTask: formData.task,
      personalityData: formData.personality
    });
    setLoading(false);
    if (result.success) setSubmitted(true);
    else setErrors([result.error || "An unknown error occurred."]);
  };

  if (submitted) return <ThankYouView />;

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 auto-rows-min animate-[fadeIn_0.5s_ease-out]">
      {/* Header Tile */}
      <div className="md:col-span-8 glass-card p-10 rounded-[3rem] flex flex-col justify-center border-white/40 shadow-xl">
        <h2 className="text-5xl font-black text-gray-900 dark:text-white tracking-tighter leading-[0.9] mb-4">
          Ready to <br/><span className="text-primary-600 underline decoration-indigo-500/30">take a shot?</span>
        </h2>
        <p className="text-gray-500 dark:text-gray-400 font-medium max-w-sm leading-relaxed">
          We are looking for doers. Fill out the tiles and show us your potential.
        </p>
      </div>

      {/* Progress Tile - Refined for full visibility */}
      <div className="md:col-span-4 glass-card p-10 rounded-[3rem] flex flex-col items-center justify-center bg-primary-600 text-white shadow-2xl shadow-primary-500/20 border-white/20">
        <div className="relative w-28 h-28 mb-4 p-1">
          <svg className="w-full h-full transform -rotate-90 drop-shadow-lg" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="45" stroke="currentColor" strokeWidth="8" fill="transparent" className="opacity-20" />
            <circle 
              cx="50" cy="50" r="45" 
              stroke="currentColor" 
              strokeWidth="8" 
              fill="transparent" 
              strokeDasharray="283" 
              strokeDashoffset={283 - (283 * step / 3)} 
              strokeLinecap="round"
              className="transition-all duration-1000 ease-in-out" 
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-black text-3xl leading-none">{step}</span>
            <span className="text-[10px] font-black opacity-60 uppercase tracking-tighter">/ 3</span>
          </div>
        </div>
        <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-80">Application Progress</p>
      </div>

      {/* Form Content Tile */}
      <div className="md:col-span-12 glass-card p-8 md:p-14 rounded-[4rem] shadow-2xl border-white/50 relative overflow-hidden">
        {/* Subtle Decorative Gradient */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary-500/5 blur-[100px] -z-10 pointer-events-none" />
        
        <form onSubmit={handleSubmit} className="space-y-10">
          {step === 1 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-[fadeIn_0.4s_ease-out]">
              <div className="space-y-6">
                <InputField id="fullName" label="Full Name" type="text" placeholder="John Doe" value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} icon={<UserIcon />} />
                <InputField id="email" label="Email Address" type="email" placeholder="john@domain.com" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} icon={<EmailIcon />} />
              </div>
              <div className="space-y-6 flex flex-col justify-between">
                <InputField id="linkedin" label="LinkedIn URL" type="url" placeholder="https://linkedin.com/in/..." value={formData.linkedinUrl} onChange={e => setFormData({...formData, linkedinUrl: e.target.value})} icon={<LinkedInIcon />} />
                <button type="button" onClick={handleNext} className="w-full py-6 bg-primary-600 hover:bg-primary-700 text-white rounded-[2rem] font-black text-sm uppercase tracking-widest shadow-2xl shadow-primary-500/30 transition-all hover:translate-y-[-2px] active:translate-y-0 active:scale-[0.98]">
                  Start Your Journey
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-[fadeIn_0.4s_ease-out]">
              <div className="glass-card p-10 rounded-[3rem] border-2 border-dashed border-gray-200 dark:border-slate-800 hover:border-primary-500 transition-all cursor-pointer relative group flex flex-col items-center text-center">
                <input type="file" accept="application/pdf" onChange={e => setFormData({...formData, cv: e.target.files?.[0] || null})} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                <div className="w-16 h-16 rounded-3xl bg-primary-500/10 flex items-center justify-center text-primary-500 mb-6 group-hover:scale-110 transition-transform duration-500">
                  <UploadIcon className="w-8 h-8" />
                </div>
                <h3 className="font-black text-xl mb-2 tracking-tight">CV</h3>
                <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">{formData.cv ? formData.cv.name : 'PDF Max. 5MB'}</p>
              </div>

              <div className="glass-card p-10 rounded-[3rem] border-2 border-dashed border-gray-200 dark:border-slate-800 hover:border-teal-500 transition-all cursor-pointer relative group flex flex-col items-center text-center">
                <input type="file" accept="application/pdf" onChange={e => setFormData({...formData, task: e.target.files?.[0] || null})} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                <div className="w-16 h-16 rounded-3xl bg-teal-500/10 flex items-center justify-center text-teal-500 mb-6 group-hover:scale-110 transition-transform duration-500">
                  <UploadIcon className="w-8 h-8" />
                </div>
                <h3 className="font-black text-xl mb-2 tracking-tight">The Mini-Task</h3>
                <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">{formData.task ? formData.task.name : 'PDF Max. 10MB'}</p>
              </div>

              <div className="md:col-span-2 flex gap-4 pt-6">
                <button type="button" onClick={() => setStep(1)} className="flex-1 py-6 glass-card rounded-[2rem] font-black text-xs uppercase tracking-widest hover:bg-gray-100 dark:hover:bg-slate-800 transition-all">Go Back</button>
                <button type="button" onClick={handleNext} className="flex-[2] py-6 bg-primary-600 text-white rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-xl">Continue to Personality</button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-10 animate-[fadeIn_0.4s_ease-out]">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { id: 'q1', text: "Being the center of attention", color: "bg-blue-500/5 text-blue-600" },
                  { id: 'q2', text: "Working structured", color: "bg-purple-500/5 text-purple-600" },
                  { id: 'q3', text: "Showing empathy", color: "bg-teal-500/5 text-teal-600" },
                  { id: 'q4', text: "Stress resilience", color: "bg-orange-500/5 text-orange-600" },
                  { id: 'q5', text: "Creative thinking", color: "bg-indigo-500/5 text-indigo-600" },
                ].map(q => (
                  <div key={q.id} className={`glass-card p-8 rounded-[2.5rem] ${q.color}`}>
                    <p className="text-sm font-black mb-6 tracking-tight leading-tight">{q.text}</p>
                    <div className="flex justify-between items-center gap-2">
                      <span className="text-[10px] font-bold opacity-40 uppercase">Low</span>
                      {[1, 2, 3, 4, 5].map(val => (
                        <button key={val} type="button" 
                          onClick={() => setFormData({...formData, personality: {...formData.personality, [q.id]: val}})}
                          className={`w-8 h-8 rounded-full transition-all text-xs font-black border-2 ${formData.personality[q.id] === val ? 'bg-primary-600 border-primary-600 text-white scale-110 shadow-lg' : 'bg-white/50 dark:bg-slate-800/50 border-transparent hover:border-primary-500/30 text-gray-400'}`}>
                          {val}
                        </button>
                      ))}
                      <span className="text-[10px] font-bold opacity-40 uppercase">High</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-col md:flex-row gap-8 items-center pt-10 border-t border-gray-100 dark:border-slate-800">
                <label className="flex items-center space-x-5 cursor-pointer group flex-1">
                  <div className="relative">
                    <input type="checkbox" required checked={formData.consent} onChange={e => setFormData({...formData, consent: e.target.checked})} className="peer h-8 w-8 text-primary-600 rounded-[1rem] border-2 border-gray-200 dark:border-slate-700 focus:ring-0 focus:ring-offset-0 transition-all cursor-pointer opacity-0 absolute inset-0 z-10" />
                    <div className={`h-8 w-8 rounded-[1rem] border-2 transition-all flex items-center justify-center ${formData.consent ? 'bg-primary-600 border-primary-600' : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700'}`}>
                      {formData.consent && <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>}
                    </div>
                  </div>
                  <span className="text-xs text-gray-400 font-bold leading-tight group-hover:text-gray-600 dark:group-hover:text-gray-200 transition-colors">
                    I consent to the processing of my data and have read the privacy policy.
                  </span>
                </label>
                <div className="flex gap-4 w-full md:w-auto">
                  <button type="button" onClick={() => setStep(2)} className="px-10 py-6 glass-card rounded-[2rem] font-black text-xs uppercase tracking-widest hover:bg-gray-100 transition-all">Back</button>
                  <button type="submit" disabled={loading} className="flex-1 md:px-14 py-6 bg-green-600 hover:bg-green-700 text-white rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-2xl shadow-green-500/30 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center">
                    {loading ? <SpinnerIcon className="animate-spin h-6 w-6 mr-3" /> : "Shoot Application"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {errors.length > 0 && (
            <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-black uppercase tracking-widest text-center animate-shake">
              {errors.join(' • ')}
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default ApplicationForm;
