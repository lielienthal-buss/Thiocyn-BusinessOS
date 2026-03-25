import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

interface InternChatProps {
  intern: {
    id: string;
    full_name: string;
    department: string;
    assigned_brand: string | null;
    budget_tokens_monthly: number;
    model: string;
  };
  usage: {
    tokens_input: number;
    tokens_output: number;
  };
  onUsageUpdate?: () => void;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const DEPARTMENT_LABELS: Record<string, string> = {
  marketing: 'Marketing',
  ecommerce: 'E-Commerce',
  support: 'Customer Support',
  analytics: 'Analytics',
  finance: 'Finance',
  recruiting: 'Recruiting',
};

const BRAND_LABELS: Record<string, string> = {
  'thiocyn': 'Thiocyn',
  'take-a-shot': 'Take A Shot',
  'paigh': 'Paigh',
  'dr-severin': 'Dr. Severin',
  'wristr': 'Wristr',
  'timber-john': 'Timber & John',
};

const InternChat: React.FC<InternChatProps> = ({ intern, usage, onUsageUpdate }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  const totalUsed = usage.tokens_input + usage.tokens_output;
  const budgetPct = Math.min(100, Math.round((totalUsed / intern.budget_tokens_monthly) * 100));
  const budgetRemaining = intern.budget_tokens_monthly - totalUsed;
  const budgetExhausted = budgetRemaining <= 0;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  async function send() {
    const text = input.trim();
    if (!text || loading || budgetExhausted) return;

    const newMessages: Message[] = [...messages, { role: 'user', content: text }];
    setMessages(newMessages);
    setInput('');
    setLoading(true);
    setError('');

    try {
      const { data, error: fnError } = await supabase.functions.invoke('academy-chat', {
        body: {
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
          internId: intern.id,
          department: intern.department,
          model: intern.model,
        },
      });

      if (fnError) throw new Error(fnError.message);
      if (data?.error) throw new Error(data.error);

      setMessages(prev => [...prev, { role: 'assistant', content: data.content }]);
      if (onUsageUpdate) onUsageUpdate();
    } catch (e: any) {
      setError(e.message ?? 'Fehler beim Senden. Bitte erneut versuchen.');
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <div className="flex flex-col h-[600px] bg-slate-900 rounded-xl border border-white/10 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-slate-800/60">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-sm font-bold text-white">
            AI
          </div>
          <div>
            <p className="text-sm font-semibold text-white">AI Senior</p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] bg-primary-700/50 text-primary-300 border border-primary-600/40 px-1.5 py-0.5 rounded-full font-medium">
                {DEPARTMENT_LABELS[intern.department] ?? intern.department}
              </span>
              {intern.assigned_brand && (
                <span className="text-[10px] bg-slate-700/60 text-gray-300 border border-white/10 px-1.5 py-0.5 rounded-full">
                  {BRAND_LABELS[intern.assigned_brand] ?? intern.assigned_brand}
                </span>
              )}
            </div>
          </div>
        </div>
        {/* Token meter */}
        <div className="text-right min-w-[120px]">
          <p className="text-[10px] text-gray-400 mb-1">
            {totalUsed.toLocaleString()} / {intern.budget_tokens_monthly.toLocaleString()} Tokens
          </p>
          <div className="w-28 h-1.5 bg-slate-700 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                budgetPct >= 90 ? 'bg-red-500' : budgetPct >= 70 ? 'bg-yellow-500' : 'bg-primary-500'
              }`}
              style={{ width: `${budgetPct}%` }}
            />
          </div>
          <p className="text-[10px] text-gray-500 mt-0.5">{budgetPct}% verwendet</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <p className="text-4xl mb-3">👋</p>
            <p className="text-white font-semibold text-sm">Hallo {intern.full_name.split(' ')[0]}!</p>
            <p className="text-gray-400 text-xs mt-1 max-w-xs">
              Ich bin dein AI-Senior für {DEPARTMENT_LABELS[intern.department] ?? intern.department}. Stell mir eine Frage oder beschreib mir deine aktuelle Aufgabe.
            </p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[80%] rounded-xl px-4 py-3 text-sm whitespace-pre-wrap ${
                msg.role === 'user'
                  ? 'bg-primary-600 text-white rounded-br-sm'
                  : 'bg-slate-700 text-gray-100 rounded-bl-sm border border-white/5'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-slate-700 border border-white/5 rounded-xl rounded-bl-sm px-4 py-3">
              <div className="flex gap-1 items-center">
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        {error && (
          <div className="flex justify-center">
            <p className="text-red-400 text-xs bg-red-900/20 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="border-t border-white/10 px-4 py-3 bg-slate-800/40">
        {budgetExhausted ? (
          <div className="text-center text-red-400 text-sm py-2">
            Token-Budget für diesen Monat aufgebraucht. Wende dich an den Admin.
          </div>
        ) : (
          <div className="flex gap-3 items-end">
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Nachricht eingeben… (Enter zum Senden, Shift+Enter für neue Zeile)"
              rows={2}
              className="flex-1 bg-slate-700/60 border border-white/10 text-white text-sm rounded-xl px-3 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-primary-500 placeholder-gray-500"
            />
            <button
              onClick={send}
              disabled={!input.trim() || loading}
              className="bg-primary-600 hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold px-4 py-2.5 rounded-xl text-sm transition-colors whitespace-nowrap"
            >
              Senden
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default InternChat;
