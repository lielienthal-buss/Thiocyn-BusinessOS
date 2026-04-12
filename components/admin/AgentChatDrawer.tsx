import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';

type Section =
  | 'command'
  | 'creative'
  | 'revenue'
  | 'hiring'
  | 'finance'
  | 'support'
  | 'admin'
  | 'account'
  | 'workspace';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface Props {
  activeSection: Section;
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
  initialPrompt?: string;
}

const SECTION_LABELS: Record<string, string> = {
  command: 'Command Center',
  creative: 'Creative Studio',
  revenue: 'Revenue & Analytics',
  hiring: 'Hiring & Academy',
  finance: 'Finance',
  support: 'Support',
  admin: 'Admin',
  account: 'Account',
  workspace: 'Workspace',
};

const SECTION_EMOJIS: Record<string, string> = {
  command: '🎯',
  creative: '🎨',
  revenue: '📊',
  hiring: '🎓',
  finance: '💰',
  support: '💬',
  admin: '⚙️',
  account: '👤',
  workspace: '🗂️',
};

function generateId(): string {
  return Math.random().toString(36).slice(2, 10);
}

async function sendToJarvis(
  userMessage: string,
  section: Section,
  history: Message[]
): Promise<string> {
  const { data, error } = await supabase.functions.invoke('jarvis-chat', {
    body: {
      message: userMessage,
      section,
      history: history.map(m => ({ role: m.role, content: m.content })),
    },
  });

  if (error) throw new Error(error.message);
  return data?.reply ?? "I'm having a moment of silence. Please try again.";
}

const AgentChatDrawer: React.FC<Props> = ({
  activeSection,
  isOpen,
  onOpen,
  onClose,
  initialPrompt,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const hasAutoSentRef = useRef<string | undefined>(undefined);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading]);

  // Auto-send initialPrompt when drawer opens
  useEffect(() => {
    if (
      isOpen &&
      initialPrompt &&
      initialPrompt !== hasAutoSentRef.current
    ) {
      hasAutoSentRef.current = initialPrompt;
      setInput(initialPrompt);
      // Send after a brief tick so input is visually set first
      const timer = setTimeout(() => {
        handleSendPrompt(initialPrompt);
        setInput('');
      }, 80);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initialPrompt]);

  // Reset auto-sent tracker when drawer closes
  useEffect(() => {
    if (!isOpen) {
      hasAutoSentRef.current = undefined;
    }
  }, [isOpen]);

  // Focus textarea when drawer opens
  useEffect(() => {
    if (isOpen && textareaRef.current) {
      const timer = setTimeout(() => textareaRef.current?.focus(), 320);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleSendPrompt = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;

    const userMsg: Message = {
      id: generateId(),
      role: 'user',
      content: trimmed,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const reply = await sendToJarvis(trimmed, activeSection, messages);
      const assistantMsg: Message = {
        id: generateId(),
        role: 'assistant',
        content: reply,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      console.error('Jarvis chat error:', err);
      setMessages((prev) => [
        ...prev,
        {
          id: generateId(),
          role: 'assistant',
          content: 'Something went wrong. Please try again.',
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    await handleSendPrompt(input);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const formatTime = (d: Date) =>
    d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const sectionLabel = SECTION_LABELS[activeSection] ?? 'Dashboard';
  const sectionEmoji = SECTION_EMOJIS[activeSection];

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={onOpen}
        className="fixed bottom-4 right-4 md:bottom-6 md:right-6 z-40 w-14 h-14 bg-[#E09B37] hover:bg-[#c8832a] text-[#1d1d1f] rounded-full shadow-xl flex items-center justify-center transition-all hover:scale-105 active:scale-95 group"
        title={`Open Jarvis — ${sectionLabel}`}
        aria-label="Open Jarvis AI assistant"
      >
        {/* Chat bubble icon */}
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2.5}
            d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
          />
        </svg>
        {/* Section badge */}
        <span className="absolute -top-1 -right-1 bg-white/80 text-primary-400 text-[9px] font-black uppercase tracking-wider rounded-full px-1.5 py-0.5 shadow border border-black/[0.06] leading-none">
          {sectionEmoji}
        </span>
      </button>

      {/* Drawer overlay + panel */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Drawer panel */}
          <div
            className="fixed right-0 top-0 h-full w-full md:max-w-md bg-white/80 border-l border-black/[0.08] shadow-2xl flex flex-col z-50 transition-transform duration-300 translate-x-0"
            role="dialog"
            aria-modal="true"
            aria-label="Jarvis AI assistant"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-black/[0.06] shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#E09B37] flex items-center justify-center text-[#1d1d1f] shadow">
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2.5}
                      d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                    />
                  </svg>
                </div>
                <div>
                  <h2 className="text-sm font-black text-[#1d1d1f] tracking-tight leading-none">
                    Jarvis — {sectionLabel}
                  </h2>
                  <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 bg-black/[0.03] text-[#6e6e73] text-[9px] font-black uppercase tracking-widest rounded-full">
                    {sectionEmoji} {sectionLabel}
                  </span>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-full text-[#6e6e73] hover:text-[#1d1d1f] hover:bg-white/[0.08] transition-all text-lg font-bold"
                aria-label="Close chat"
              >
                ×
              </button>
            </div>

            {/* Messages area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-white/60/40">
              {messages.length === 0 && !isLoading && (
                <div className="flex flex-col items-center justify-center h-full text-center py-12 gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-primary-50 flex items-center justify-center text-2xl">
                    {sectionEmoji}
                  </div>
                  <p className="text-sm font-bold text-[#1d1d1f]">
                    Jarvis — {sectionLabel}
                  </p>
                  <p className="text-xs text-[#6e6e73] max-w-[220px]">
                    Ask me anything about this section, or use a Quick Action above.
                  </p>
                </div>
              )}

              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[82%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm ${
                      msg.role === 'user'
                        ? 'bg-[#E09B37] text-[#1d1d1f] rounded-tr-none'
                        : 'bg-white/70 text-[#1d1d1f] border border-black/[0.06] rounded-tl-none backdrop-blur-sm'
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">
                      {msg.content}
                    </p>
                    <p
                      className={`text-[9px] mt-1 font-semibold ${
                        msg.role === 'user'
                          ? 'text-primary-200 text-right'
                          : 'text-[#6e6e73]'
                      }`}
                    >
                      {formatTime(msg.timestamp)}
                    </p>
                  </div>
                </div>
              ))}

              {/* Thinking indicator */}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-white/70 border border-black/[0.06] rounded-2xl rounded-tl-none px-4 py-3 shadow-sm flex items-center gap-2 backdrop-blur-sm">
                    <span className="text-[10px] font-black uppercase tracking-widest text-[#6e6e73]">
                      Jarvis is thinking
                    </span>
                    <span className="flex gap-0.5">
                      <span className="w-1.5 h-1.5 bg-primary-400 rounded-full animate-bounce [animation-delay:0ms]" />
                      <span className="w-1.5 h-1.5 bg-primary-400 rounded-full animate-bounce [animation-delay:150ms]" />
                      <span className="w-1.5 h-1.5 bg-primary-400 rounded-full animate-bounce [animation-delay:300ms]" />
                    </span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input area */}
            <form
              onSubmit={handleSubmit}
              className="border-t border-black/[0.06] p-3 bg-white/80 shrink-0"
            >
              <div className="flex items-end gap-2">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={`Ask Jarvis about ${sectionLabel.toLowerCase()}…`}
                  rows={1}
                  className="flex-1 resize-none rounded-xl border border-white/[0.10] px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-300 transition-all max-h-32 overflow-y-auto bg-black/[0.03] text-[#1d1d1f] placeholder-[#86868b]"
                  style={{ lineHeight: '1.5' }}
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className="w-10 h-10 shrink-0 bg-[#E09B37] hover:bg-[#c8832a] disabled:opacity-40 disabled:cursor-not-allowed text-[#1d1d1f] rounded-xl flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow"
                  aria-label="Send message"
                >
                  <svg
                    className="w-4 h-4 rotate-90"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2.5}
                      d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                    />
                  </svg>
                </button>
              </div>
              <p className="text-[9px] text-[#6e6e73] font-semibold uppercase tracking-wider mt-2 text-center">
                Enter to send · Shift+Enter for new line
              </p>
            </form>
          </div>
        </>
      )}
    </>
  );
};

export default AgentChatDrawer;
