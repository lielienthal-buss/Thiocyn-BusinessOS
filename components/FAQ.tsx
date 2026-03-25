import React, { useState } from 'react';
import { useLang } from '@/lib/i18n';
import { translations } from '@/lib/translations';

const FAQ: React.FC = () => {
  const [open, setOpen] = useState<number | null>(null);
  const { lang } = useLang();
  const t = translations[lang].public.faq;

  return (
    <div className="max-w-3xl mx-auto">
      <h2 className="text-xs font-black uppercase tracking-[0.4em] text-gray-400 text-center mb-10">
        {t.title}
      </h2>
      <div className="space-y-2">
        {t.items.map((faq, i) => (
          <div
            key={i}
            className="border-b border-gray-100 last:border-0"
          >
            <button
              onClick={() => setOpen(open === i ? null : i)}
              className="w-full text-left px-6 py-5 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <span className="font-bold text-gray-900 text-sm pr-4">{faq.question}</span>
              <span className="text-gray-400 text-xl font-light shrink-0 leading-none">
                {open === i ? '−' : '+'}
              </span>
            </button>
            {open === i && (
              <div className="px-6 pb-5 pt-1 text-sm text-gray-500 leading-relaxed border-t border-gray-100">
                {faq.answer}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default FAQ;
