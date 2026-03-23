import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';
import Spinner from '../ui/Spinner';

interface Message {
  role: 'user' | 'model';
  text: string;
}

const ChatBot: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'model',
      text: "Hey! I'm the Take A Shot recruiting assistant. Ask me anything about our culture, our 100% remote setup, or what it's like to work at Take A Shot by Thiocyn.",
    },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || isTyping) return;

    const userMessage = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', text: userMessage }]);
    setIsTyping(true);

    try {
      const apiKey = import.meta.env.VITE_GOOGLE_API_KEY;
      if (!apiKey) {
        throw new Error('Missing Google API Key');
      }
      const ai = new GoogleGenAI({ apiKey });
      const chat = ai.chats.create({
        model: 'gemini-3-pro-preview',
        config: {
          systemInstruction: `You are the official recruitment assistant for Take A Shot by Thiocyn (legal entity: Thiocyn GmbH).
          Your goal is to help potential applicants understand the company's DNA and process.

          CORE IDENTITY:
          "We combine entrepreneurial excellence with genuine human proximity and a bias for action."

          ABOUT TAKE A SHOT BY THIOCYN:
          Take A Shot is a D2C brand operated by Hart Limes GmbH — an e-commerce aggregator that builds and scales multiple consumer brands under the Thiocyn umbrella. The team moves fast, decisions are made by people, not committees.

          COMPANY VALUES:
          1. Ownership over Excuses: We take responsibility for decisions, results, and mistakes. We don't wait; we act, reflect, and improve.
          2. Clarity over Complexity: We make things understandable for customers and the team. Clarity creates trust.
          3. Courage to Decide: Standstill is the greatest risk. We prefer a well-thought-out step forward over perfect hesitation.
          4. Performance with Substance: We don't chase hype. We care about sustainable quality and measurable results.
          5. Humanity in Business: Ambitious but respectful. Direct but fair. Humor and interest in people are part of our culture.

          FACTS:
          - Brand: Take A Shot by Thiocyn (Company: Thiocyn GmbH)
          - Location: 100% Remote.
          - Tech Stack: Freedom of choice. We prioritize working with AI and driving innovation.
          - Hiring Process: Extremely lean. After submitting through this portal, there is usually only ONE round (Interview/Phone/Video Call).
          - Uniqueness: We use our values as a decision-making basis for everything—customers, projects, and hiring.

          TONE:
          - Bold, energetic, and professional.
          - Concise and direct.
          - Use "we" and "us".
          - If you don't know something specific, invite them to submit their application so the team can discuss it in the call.`,
        },
      });

      const response = await chat.sendMessage({ message: userMessage });
      const text = response.text;

      setMessages((prev) => [
        ...prev,
        {
          role: 'model',
          text:
            text || "I'm having a brief moment of silence. Please try again!",
        },
      ]);
    } catch (error: unknown) {
      console.error('Chat error:', error);
      setMessages((prev) => [
        ...prev,
        {
          role: 'model',
          text: 'Sorry, I encountered an error. Please try again.',
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="md:col-span-12 glass-card rounded-[3rem] overflow-hidden flex flex-col h-[600px] shadow-2xl border-white/20 dark:border-slate-800 animate-[fadeIn_0.5s_ease-out]">
      {/* Header */}
      <div className="p-8 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between bg-white/30 backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-primary-600 flex items-center justify-center text-white shadow-lg shadow-primary-500/20">
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.5"
                d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
              ></path>
            </svg>
          </div>
          <div>
            <h3 className="text-xl font-black text-gray-900 dark:text-white tracking-tighter leading-none">
              Culture Guide
            </h3>
            <p className="text-[10px] font-black uppercase tracking-widest text-primary-600 mt-1">
              AI-Powered Insights
            </p>
          </div>
        </div>
        <div className="hidden md:block">
          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest bg-gray-100 dark:bg-slate-800 px-4 py-2 rounded-full border border-white/10">
            100% Remote DNA
          </span>
        </div>
      </div>

      {/* Messages area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-8 space-y-6 scrollbar-hide bg-gradient-to-b from-transparent to-primary-500/5"
      >
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 duration-300`}
          >
            <div
              className={`max-w-[80%] p-5 rounded-[2rem] text-sm font-medium leading-relaxed shadow-sm ${
                msg.role === 'user'
                  ? 'bg-primary-600 text-white rounded-tr-none'
                  : 'glass-card text-gray-800 dark:text-gray-200 rounded-tl-none border-white/20'
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-start animate-pulse">
            <div className="glass-card p-5 rounded-[2rem] rounded-tl-none flex items-center gap-3">
              <Spinner className="w-4 h-4 text-primary-600" />
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                Processing culture match...
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="p-6 bg-white/40 dark:bg-slate-900/40 backdrop-blur-2xl border-t border-white/20">
        <form onSubmit={handleSend} className="relative flex items-center">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about our values, remote setup, or tech..."
            className="w-full pl-8 pr-16 py-5 bg-white/80 dark:bg-slate-800/80 border border-white/20 dark:border-slate-800 rounded-2xl focus:ring-4 focus:ring-primary-500/10 outline-none transition-all text-sm font-medium shadow-inner"
          />
          <button
            type="submit"
            disabled={!input.trim() || isTyping}
            className="absolute right-3 w-12 h-12 bg-primary-600 hover:bg-primary-700 text-white rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100 shadow-lg shadow-primary-500/30"
          >
            <svg
              className="w-5 h-5 transform rotate-90"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="3"
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
              ></path>
            </svg>
          </button>
        </form>
        <p className="text-center mt-4 text-[9px] font-black uppercase tracking-widest text-gray-400 opacity-60">
          We combine entrepreneurial excellence with genuine human proximity.
        </p>
      </div>
    </div>
  );
};

export default ChatBot;
