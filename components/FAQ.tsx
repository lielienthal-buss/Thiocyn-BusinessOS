import React from 'react';

const FAQ: React.FC = () => {
  const faqs = [
    {
      question: "What is Take A Shot GmbH?",
      answer: "We are a company that combines entrepreneurial excellence with genuine human proximity, focusing on innovative solutions."
    },
    {
      question: "Is Take A Shot GmbH 100% remote?",
      answer: "Yes, we are a fully remote company, allowing our team members to work from anywhere."
    },
    {
      question: "What is your hiring process like?",
      answer: "Our hiring process is extremely lean. After submitting your application, there is usually only ONE round (Interview/Phone/Video Call)."
    },
    {
      question: "What is your company culture?",
      answer: "Our culture is built on values like Ownership over Excuses, Clarity over Complexity, Courage to Decide ('Take the Shot'), Performance with Substance, and Humanity in Business."
    },
    {
      question: "What technologies do you use?",
      answer: "We have freedom of choice in our tech stack and prioritize working with AI and driving innovation."
    }
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-8 p-8 glass-card rounded-[3rem] shadow-2xl border-white/20">
      <h2 className="text-3xl font-black text-gray-900 dark:text-white tracking-tighter text-center mb-10">Frequently Asked Questions</h2>
      {faqs.map((faq, index) => (
        <div key={index} className="border-b border-white/10 pb-6 last:border-b-0">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{faq.question}</h3>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">{faq.answer}</p>
        </div>
      ))}
    </div>
  );
};

export default FAQ;
