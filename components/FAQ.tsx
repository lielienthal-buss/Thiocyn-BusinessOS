
import React from 'react';

const FAQ: React.FC = () => {
  const faqs = [
    { q: "File formats?", a: "PDF preferred (max. 5MB).", size: "md:col-span-4" },
    { q: "Feedback time?", a: "Usually within 3-5 business days after initial review.", size: "md:col-span-8" },
    { q: "Remote work?", a: "First meeting via video. Afterwards flexible on-site or home office options.", size: "md:col-span-7" },
    { q: "Spontaneous applications?", a: "Yes, always welcome! Just note your area of interest in the form.", size: "md:col-span-5" },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-xs font-black uppercase tracking-[0.4em] text-center text-gray-400 mb-8">Frequently Asked Questions</h2>
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        {faqs.map((faq, i) => (
          <div key={i} className={`glass-card p-8 rounded-[2.5rem] flex flex-col justify-between hover:scale-[1.02] transition-all duration-500 ${faq.size} bg-white/30 dark:bg-slate-900/30`}>
            <h3 className="text-xl font-black text-gray-900 dark:text-white mb-4 tracking-tight">{faq.q}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium leading-relaxed">{faq.a}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FAQ;
