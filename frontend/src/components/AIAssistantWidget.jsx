import { useState, useRef, useEffect } from 'react';
import { api } from '../api';

const STARTER_SUGGESTIONS = [
  { icon: '🍲', text: 'How do I donate surplus food?' },
  { icon: '❄️', text: 'What are the food safety guidelines?' },
  { icon: '📱', text: 'How do NGOs reserve & scan QR codes?' },
  { icon: '🥗', text: 'What items can be listed on Left2Serve?' },
];

/**
 * Simple, safe markdown parser for rendering assistant responses cleanly
 */
function FormattedMessage({ content }) {
  if (!content) return null;

  // Split by newlines to handle paragraphs and bullet points
  const lines = content.split('\n');

  return (
    <div className="space-y-1.5 text-[13px] sm:text-[14px] leading-relaxed">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={idx} className="h-1" />;

        // Bullet points (starts with '-' or '*')
        const isBullet = /^[*-]\s+/.test(trimmed);
        const textContent = isBullet ? trimmed.replace(/^[*-]\s+/, '') : trimmed;

        // Parse bold **text**
        const parts = textContent.split(/(\*\*.*?\*\*)/g);
        const rendered = parts.map((part, pIdx) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return (
              <strong key={pIdx} className="font-semibold text-slate-900 dark:text-slate-100">
                {part.slice(2, -2)}
              </strong>
            );
          }
          return part;
        });

        if (isBullet) {
          return (
            <div key={idx} className="flex items-start gap-2 pl-1">
              <span className="text-rose-500 font-bold leading-tight select-none">•</span>
              <span className="flex-1">{rendered}</span>
            </div>
          );
        }

        return <p key={idx}>{rendered}</p>;
      })}
    </div>
  );
}

export default function AIAssistantWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [showPill, setShowPill] = useState(true);
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      role: 'assistant',
      text: "Hey! 👋 I am **Jule**, your Left2Serve assistant. I'm here to help you with surplus food donations, safety guidelines, NGO reservations, and platform navigation.\n\nHow can I help you today?",
      guardrailTriggered: false,
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showGuardrailInfo, setShowGuardrailInfo] = useState(false);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      inputRef.current?.focus();
    }
  }, [messages, isOpen]);

  const handleSendMessage = async (textToSend) => {
    const text = (textToSend || inputText).trim();
    if (!text || isLoading) return;

    const userMessage = {
      id: String(Date.now()),
      role: 'user',
      text,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    try {
      // Send conversation history without the welcome intro
      const historyPayload = messages
        .filter((m) => m.id !== 'welcome')
        .map((m) => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          text: m.text,
        }));

      const res = await api.ai.chat({
        message: text,
        history: historyPayload,
      });

      const assistantMessage = {
        id: String(Date.now() + 1),
        role: 'assistant',
        text: res.text || 'I apologize, no response could be generated at this moment.',
        guardrailTriggered: Boolean(res.guardrailTriggered),
        category: res.category,
        reason: res.reason,
        sanitized: res.sanitized,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      console.error('AI Chat Error:', err);
      setMessages((prev) => [
        ...prev,
        {
          id: String(Date.now() + 1),
          role: 'assistant',
          text: '⚠️ ' + (err.message || 'An error occurred while connecting to Jule. Please try again in a moment.'),
          isError: true,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const clearChat = () => {
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        text: "Chat cleared! ✨ I'm **Jule**, your AI assistant. How can I help you with Left2Serve today?",
      },
    ]);
  };

  return (
    <>
      {/* Floating Action Button & Speech Pill */}
      <div className="fixed bottom-6 right-5 sm:right-6 z-50 flex flex-col items-end pointer-events-auto">
        {/* Floating Pill over FAB */}
        {!isOpen && showPill && (
          <div
            onClick={() => setIsOpen(true)}
            className="group relative mb-3 cursor-pointer select-none max-w-[290px] sm:max-w-xs transition-all duration-300 hover:scale-[1.02] active:scale-95 animate-fadeIn"
          >
            {/* Pill Container */}
            <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-rose-200/80 dark:border-rose-900/60 shadow-xl shadow-rose-500/10 dark:shadow-black/50 text-slate-800 dark:text-slate-100 text-xs sm:text-[13px] font-medium leading-snug">
              {/* Jule Sparkle Icon */}
              <div className="relative flex-shrink-0 w-7 h-7 rounded-xl bg-gradient-to-tr from-rose-500 to-amber-400 flex items-center justify-center text-white shadow-sm">
                <span className="text-xs">✨</span>
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 border border-white dark:border-slate-900 animate-pulse" />
              </div>

              {/* Text */}
              <div className="flex-1 pr-1">
                <p className="font-medium text-slate-800 dark:text-slate-100">
                  Hey, I am <span className="font-bold text-rose-600 dark:text-rose-400">Jule</span> an assistant how can I help you?
                </p>
              </div>

              {/* Dismiss Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowPill(false);
                }}
                title="Dismiss message"
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                aria-label="Dismiss assistant prompt"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Bubble arrow pointer pointing down to button */}
            <div className="absolute right-6 -bottom-1.5 w-3 h-3 bg-white/95 dark:bg-slate-900/95 border-r border-b border-rose-200/80 dark:border-rose-900/60 transform rotate-45" />
          </div>
        )}

        {/* FAB Trigger Button */}
        <button
          onClick={() => {
            setIsOpen(!isOpen);
            if (!isOpen) setShowPill(false);
          }}
          aria-label="Toggle Jule AI Assistant"
          className="group relative w-14 h-14 sm:w-15 sm:h-15 rounded-2xl bg-gradient-to-tr from-rose-600 via-rose-500 to-pink-500 text-white shadow-xl shadow-rose-500/30 hover:shadow-2xl hover:shadow-rose-500/40 hover:scale-105 active:scale-95 transition-all duration-300 flex items-center justify-center border-2 border-white/30 dark:border-white/10 cursor-pointer"
        >
          {isOpen ? (
            <svg className="w-6 h-6 transition-transform duration-300 group-hover:rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <div className="relative flex items-center justify-center">
              <svg className="w-7 h-7 transition-transform duration-300 group-hover:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
              <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-white dark:border-slate-900"></span>
              </span>
            </div>
          )}
        </button>
      </div>

      {/* Floating Chat Modal */}
      {isOpen && (
        <div
          className="fixed bottom-22 right-3 sm:right-6 z-50 w-[calc(100vw-1.5rem)] sm:w-[420px] h-[610px] max-h-[85vh] bg-white/95 dark:bg-slate-900/95 rounded-3xl shadow-2xl shadow-black/20 dark:shadow-black/70 border border-slate-200/80 dark:border-slate-800 flex flex-col overflow-hidden backdrop-blur-2xl transition-all duration-300 animate-scale-in"
        >
          {/* Header */}
          <div className="px-4.5 py-3.5 bg-gradient-to-r from-rose-600 via-rose-500 to-pink-600 text-white flex items-center justify-between shadow-md relative z-10">
            <div className="flex items-center gap-3">
              {/* Jule Avatar */}
              <div className="relative w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 shadow-inner">
                <span className="text-xl">🤖</span>
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-rose-600"></span>
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm sm:text-base tracking-tight text-white flex items-center gap-1.5">
                    Jule <span className="text-xs font-normal text-rose-100 bg-white/15 px-2 py-0.5 rounded-full">AI Assistant</span>
                  </h3>
                </div>
                <button
                  onClick={() => setShowGuardrailInfo(!showGuardrailInfo)}
                  className="flex items-center gap-1 text-[11px] text-rose-100 hover:text-white bg-white/15 hover:bg-white/25 px-2 py-0.5 rounded-full transition-all mt-0.5 cursor-pointer"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse"></span>
                  <span>Safety Guardrails Active</span>
                  <svg className="w-3 h-3 opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Header Actions */}
            <div className="flex items-center gap-1">
              <button
                onClick={clearChat}
                title="Reset conversation"
                aria-label="Clear chat"
                className="p-2 rounded-xl hover:bg-white/20 text-white/90 hover:text-white transition-colors cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
              <button
                onClick={() => setIsOpen(false)}
                title="Close chat"
                aria-label="Close assistant"
                className="p-2 rounded-xl hover:bg-white/20 text-white/90 hover:text-white transition-colors cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Guardrails Info Popover Panel */}
          {showGuardrailInfo && (
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-slate-800/90 dark:to-amber-950/30 border-b border-amber-200/80 dark:border-amber-900/50 p-3.5 text-xs text-amber-950 dark:text-amber-200 transition-all flex items-start gap-2.5 animate-fadeIn shadow-sm">
              <div className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center flex-shrink-0 font-bold text-xs mt-0.5">
                🛡️
              </div>
              <div className="flex-1 space-y-1.5">
                <p className="font-semibold text-amber-900 dark:text-amber-300">Multi-Tier Security Active:</p>
                <div className="grid grid-cols-2 gap-1.5 text-[11px] opacity-90">
                  <div className="bg-white/70 dark:bg-slate-900/60 p-1.5 rounded-lg border border-amber-200/60 dark:border-amber-900/40">
                    <span className="font-medium text-amber-800 dark:text-amber-200">🔒 PII Masking</span>
                    <p className="text-[10px] text-amber-700 dark:text-amber-400">Redacts phone, email, card data</p>
                  </div>
                  <div className="bg-white/70 dark:bg-slate-900/60 p-1.5 rounded-lg border border-amber-200/60 dark:border-amber-900/40">
                    <span className="font-medium text-amber-800 dark:text-amber-200">⚡ Injection Filter</span>
                    <p className="text-[10px] text-amber-700 dark:text-amber-400">Blocks prompt hacking & jailbreaks</p>
                  </div>
                  <div className="bg-white/70 dark:bg-slate-900/60 p-1.5 rounded-lg border border-amber-200/60 dark:border-amber-900/40">
                    <span className="font-medium text-amber-800 dark:text-amber-200">🔑 Secret Shield</span>
                    <p className="text-[10px] text-amber-700 dark:text-amber-400">Prevents credential & key leaks</p>
                  </div>
                  <div className="bg-white/70 dark:bg-slate-900/60 p-1.5 rounded-lg border border-amber-200/60 dark:border-amber-900/40">
                    <span className="font-medium text-amber-800 dark:text-amber-200">🍲 Domain Scope</span>
                    <p className="text-[10px] text-amber-700 dark:text-amber-400">Food rescue & safety focus</p>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowGuardrailInfo(false)}
                className="text-amber-700 dark:text-amber-400 hover:opacity-75 font-bold p-1"
                aria-label="Close security info"
              >
                ✕
              </button>
            </div>
          )}

          {/* Messages Feed */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/60 dark:bg-slate-950/40">
            {messages.map((m) => {
              const isUser = m.role === 'user';

              return (
                <div key={m.id} className={`flex items-start gap-2.5 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
                  {/* Avatar icon */}
                  {!isUser && (
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-rose-500 to-pink-500 text-white flex items-center justify-center text-xs shadow-sm flex-shrink-0 mt-0.5">
                      🤖
                    </div>
                  )}

                  <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} max-w-[84%]`}>
                    <div
                      className={`px-4 py-3 rounded-2xl text-xs sm:text-sm shadow-sm transition-all ${
                        isUser
                          ? 'bg-gradient-to-tr from-rose-600 to-rose-500 text-white rounded-tr-xs font-medium shadow-rose-500/10'
                          : m.isError
                          ? 'bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-red-800 dark:text-red-200 rounded-tl-xs'
                          : 'bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 text-slate-800 dark:text-slate-100 rounded-tl-xs shadow-sm'
                      }`}
                    >
                      <FormattedMessage content={m.text} />
                    </div>

                    {/* Guardrail badges */}
                    {!isUser && m.guardrailTriggered && (
                      <div className="mt-1 flex items-center gap-1 text-[10px] text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-900/50 px-2 py-0.5 rounded-md font-medium">
                        <span>🛡️ Intercepted by Safety Guardrail</span>
                        {m.category && <span className="opacity-75">({m.category})</span>}
                      </div>
                    )}

                    {!isUser && m.sanitized && (
                      <div className="mt-1 flex items-center gap-1 text-[10px] text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900/50 px-2 py-0.5 rounded-md font-medium">
                        <span>🔒 PII Anonymized</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Loading Indicator */}
            {isLoading && (
              <div className="flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-rose-500 to-pink-500 text-white flex items-center justify-center text-xs shadow-sm flex-shrink-0">
                  🤖
                </div>
                <div className="px-4 py-3 rounded-2xl rounded-tl-xs bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 shadow-sm flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Jule is thinking...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Suggestions Chips */}
          {messages.length <= 2 && (
            <div className="px-4 py-2.5 border-t border-slate-200/70 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md">
              <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Suggested Questions:</p>
              <div className="flex flex-wrap gap-1.5">
                {STARTER_SUGGESTIONS.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(item.text)}
                    className="flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-700 dark:text-slate-200 hover:text-rose-600 dark:hover:text-rose-400 border border-slate-200 dark:border-slate-700 hover:border-rose-300 dark:hover:border-rose-800 transition-all duration-200 cursor-pointer shadow-xs active:scale-95"
                  >
                    <span>{item.icon}</span>
                    <span>{item.text}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input Footer */}
          <div className="p-3 sm:p-3.5 border-t border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask Jule about donations, food safety..."
                disabled={isLoading}
                maxLength={2000}
                className="flex-1 bg-slate-100/90 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 rounded-2xl px-4 py-2.5 text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500/40 focus:border-rose-500 transition-all disabled:opacity-50"
              />

              <button
                onClick={() => handleSendMessage()}
                disabled={!inputText.trim() || isLoading}
                aria-label="Send Message"
                className="p-2.5 sm:p-3 rounded-2xl bg-gradient-to-tr from-rose-600 to-pink-500 hover:from-rose-700 hover:to-pink-600 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md shadow-rose-500/20 active:scale-95 flex items-center justify-center cursor-pointer flex-shrink-0"
              >
                <svg className="w-4 h-4 transform rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19V5m0 0l-7 7m7-7l7 7" />
                </svg>
              </button>
            </div>

            <div className="flex justify-between items-center px-1 text-[10px] text-slate-400 dark:text-slate-500">
              <span className="flex items-center gap-1">
                <span>🛡️ Guardrail Protected</span>
                <span>•</span>
                <span>Gemini AI</span>
              </span>
              <span>{inputText.length}/2000</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
