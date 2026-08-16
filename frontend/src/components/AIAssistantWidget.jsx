import { useState, useRef, useEffect } from 'react';
import { api } from '../api';

const STARTER_SUGGESTIONS = [
  'How do I donate surplus food from my restaurant?',
  'What are the food safety guidelines for donation?',
  'How do NGOs reserve and verify pickup via QR code?',
  'What items are eligible for food donation on Left2Serve?',
];

export default function AIAssistantWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      role: 'assistant',
      text: 'Hello! 👋 I am your **Left2Serve AI Assistant**, protected by multi-tier safety guardrails. How can I assist you with surplus food donations, reservations, or safety rules today?',
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
        text: res.text || 'I apologize, no response was generated.',
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
          text: '⚠️ ' + (err.message || 'An error occurred while connecting to the assistant. Please try again.'),
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
        text: 'Chat history cleared. How can I assist you with food donations or platform guidance?',
      },
    ]);
  };

  return (
    <>
      {/* Floating Action Button */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
        {!isOpen && (
          <div className="mb-2 hidden sm:flex items-center gap-2 bg-white/95 dark:bg-slate-900/95 border border-border shadow-xl backdrop-blur-md px-3 py-1.5 rounded-full text-xs font-semibold text-text animate-bounce">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span>AI Food Assistant with Guardrails</span>
          </div>
        )}

        <button
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Toggle AI Assistant"
          className="group relative w-14 h-14 rounded-full bg-gradient-to-tr from-accent to-rose-500 text-white shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 transition-all duration-300 flex items-center justify-center border-2 border-white/20"
        >
          {isOpen ? (
            <svg className="w-6 h-6 transition-transform duration-200 group-hover:rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <div className="relative">
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
              <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border border-white"></span>
              </span>
            </div>
          )}
        </button>
      </div>

      {/* Floating Chat Modal */}
      {isOpen && (
        <div className="fixed bottom-24 right-4 sm:right-6 z-50 w-[calc(100vw-2rem)] sm:w-[420px] max-h-[620px] h-[80vh] bg-surface rounded-3xl shadow-2xl border border-border flex flex-col overflow-hidden backdrop-blur-lg animate-fadeIn">
          {/* Header */}
          <div className="px-5 py-4 bg-gradient-to-r from-accent to-rose-600 text-white flex items-center justify-between shadow-md">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white/15 flex items-center justify-center backdrop-blur-md border border-white/20 shadow-inner">
                <span className="text-xl">🤖</span>
              </div>
              <div>
                <h3 className="font-bold text-sm tracking-wide flex items-center gap-1.5">
                  Left2Serve Assistant
                </h3>
                <button
                  onClick={() => setShowGuardrailInfo(!showGuardrailInfo)}
                  className="flex items-center gap-1 text-[11px] text-white/90 hover:text-white bg-white/20 hover:bg-white/30 px-2 py-0.5 rounded-full transition-all mt-0.5 cursor-pointer"
                >
                  <span>🛡️ Guardrails Active</span>
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={clearChat}
                title="Clear Chat"
                className="p-1.5 rounded-lg hover:bg-white/20 text-white/80 hover:text-white transition-colors text-xs flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg hover:bg-white/20 text-white/80 hover:text-white transition-colors"
                aria-label="Close Assistant"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Guardrails Info Popover */}
          {showGuardrailInfo && (
            <div className="bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-900/60 p-3 text-xs text-amber-900 dark:text-amber-200 transition-all flex items-start gap-2 animate-fadeIn">
              <span className="text-base">🛡️</span>
              <div className="flex-1 space-y-1">
                <p className="font-semibold">Privacy & Security Guardrails Enabled:</p>
                <ul className="list-disc pl-4 space-y-0.5 text-[11px] opacity-90">
                  <li><strong>PII Masking:</strong> Automatic redaction of phone numbers, emails & cards.</li>
                  <li><strong>Prompt Injection Defense:</strong> Neutralizes jailbreaks & prompt leaks.</li>
                  <li><strong>Secret Leak Filter:</strong> Strict scanning against credential exposure.</li>
                  <li><strong>Topic Scope:</strong> Focuses strictly on food rescue & platform support.</li>
                </ul>
              </div>
              <button
                onClick={() => setShowGuardrailInfo(false)}
                className="text-amber-700 dark:text-amber-400 hover:opacity-75 font-bold"
              >
                ✕
              </button>
            </div>
          )}

          {/* Messages Feed */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-gradient-to-b from-slate-50/50 to-white dark:from-slate-900/40 dark:to-slate-900/80">
            {messages.map((m) => {
              const isUser = m.role === 'user';

              return (
                <div key={m.id} className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} space-y-1`}>
                  <div
                    className={`max-w-[88%] rounded-2xl px-4 py-2.5 text-xs sm:text-sm leading-relaxed shadow-sm transition-all ${
                      isUser
                        ? 'bg-accent text-white rounded-br-xs font-medium'
                        : m.isError
                        ? 'bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-bl-xs'
                        : 'bg-white dark:bg-slate-800 border border-border text-text rounded-bl-xs'
                    }`}
                  >
                    <div className="whitespace-pre-wrap">{m.text}</div>
                  </div>

                  {/* Guardrail badge indicators */}
                  {!isUser && m.guardrailTriggered && (
                    <div className="flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400 px-1 font-medium">
                      <span>🛡️ Intercepted by Safety Guardrails</span>
                      {m.category && <span className="opacity-75">({m.category})</span>}
                    </div>
                  )}

                  {!isUser && m.sanitized && (
                    <div className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 px-1 font-medium">
                      <span>🔒 PII Sanitized</span>
                    </div>
                  )}
                </div>
              );
            })}

            {isLoading && (
              <div className="flex items-center gap-2 text-muted text-xs p-2 bg-slate-100 dark:bg-slate-800/60 rounded-2xl w-fit animate-pulse">
                <span className="inline-block w-2 h-2 rounded-full bg-accent animate-ping" />
                <span>Thinking through guardrails...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Suggestions Chips */}
          {messages.length <= 2 && (
            <div className="p-3 border-t border-border bg-slate-50/80 dark:bg-slate-900/50">
              <p className="text-[11px] font-semibold text-muted mb-2 px-1">Suggested Questions:</p>
              <div className="flex flex-wrap gap-1.5">
                {STARTER_SUGGESTIONS.map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(q)}
                    className="text-[11px] text-left px-2.5 py-1 rounded-full bg-white dark:bg-slate-800 border border-border hover:border-accent hover:text-accent dark:hover:text-accent transition-colors text-text shadow-xs"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input Footer */}
          <div className="p-3 border-t border-border bg-surface flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about food rescue, safety rules, donations..."
                disabled={isLoading}
                maxLength={2000}
                className="flex-1 bg-slate-100 dark:bg-slate-800 border border-border rounded-xl px-3.5 py-2 text-xs sm:text-sm text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all disabled:opacity-50"
              />

              <button
                onClick={() => handleSendMessage()}
                disabled={!inputText.trim() || isLoading}
                aria-label="Send Message"
                className="p-2.5 rounded-xl bg-accent hover:bg-accent-dark text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md active:scale-95 flex items-center justify-center cursor-pointer"
              >
                <svg className="w-4 h-4 transform rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19V5m0 0l-7 7m7-7l7 7" />
                </svg>
              </button>
            </div>

            <div className="flex justify-between items-center px-1 text-[10px] text-muted">
              <span>Protected by Gemini & Active Guardrails</span>
              <span>{inputText.length}/2000</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
