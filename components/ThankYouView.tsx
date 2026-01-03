
import React from 'react';
import CheckCircleIcon from './icons/CheckCircleIcon';

const ThankYouView: React.FC = () => {
  return (
    <div className="animate-[fadeIn_0.6s_ease-out] space-y-6">
      {/* Main Success Tile */}
      <div className="glass-card p-12 rounded-[3rem] text-center shadow-2xl border-white/40 dark:border-slate-800">
        <div className="flex justify-center items-center mb-8">
          <div className="bg-green-500 text-white p-5 rounded-[2rem] shadow-2xl shadow-green-500/40 transform hover:scale-110 transition-transform duration-500">
            <CheckCircleIcon className="w-12 h-12" />
          </div>
        </div>
        <h2 className="text-4xl font-black text-gray-900 dark:text-white mb-4 tracking-tighter">
          Application <span className="text-green-600">Successful!</span>
        </h2>
        <p className="text-lg text-gray-500 dark:text-gray-400 font-medium max-w-xl mx-auto leading-relaxed">
          We have received your documents. Our AI screening and the team are reviewing everything now.
        </p>
      </div>

      {/* Next Steps Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { 
            step: "01", 
            title: "AI Analysis", 
            desc: "Your profile is analyzed based on the mini-task and personality traits.",
            color: "bg-indigo-500/5 text-indigo-600"
          },
          { 
            step: "02", 
            title: "Team Review", 
            desc: "A recruiter reviews the results personally (approx. 3-5 days).",
            color: "bg-primary-500/5 text-primary-600"
          },
          { 
            step: "03", 
            title: "Meet & Greet", 
            desc: "If there's a positive match, we'll invite you to an initial video call.",
            color: "bg-teal-500/5 text-teal-600"
          }
        ].map((item, i) => (
          <div key={i} className={`glass-card p-8 rounded-[2.5rem] flex flex-col justify-between ${item.color}`}>
            <span className="text-3xl font-black opacity-20 mb-4">{item.step}</span>
            <div>
              <h4 className="font-black text-lg mb-2 tracking-tight text-gray-900 dark:text-white">{item.title}</h4>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 leading-normal">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Footer & Navigation */}
      <div className="flex flex-col md:flex-row justify-between items-center px-6 py-8">
        <div className="flex space-x-6 text-[10px] font-black uppercase tracking-widest text-gray-400 mb-6 md:mb-0">
          <a href="#" className="hover:text-primary-600 transition-colors">Privacy</a>
          <a href="#" className="hover:text-primary-600 transition-colors">Imprint</a>
        </div>
        <button 
          onClick={() => window.location.reload()}
          className="px-8 py-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all"
        >
          Back to Home
        </button>
      </div>
    </div>
  );
};

export default ThankYouView;
