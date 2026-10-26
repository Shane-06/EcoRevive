import { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Send,
  RefreshCw,
  BookOpen,
  Trash2,
  Sprout,
  User,
  ShieldCheck,
  HelpCircle,
  Database,
} from 'lucide-react';
import aiService from '../services/ai.service';
import ErrorAlert from '../components/common/ErrorAlert';

const PROMPT_SUGGESTIONS = [
  'How does the 9-stage plantation lifecycle work?',
  'Can you give me a summary of my plantations?',
  'How is a permanent Tree ID generated and verified?',
  'What soil pH and texture are optimal for planting?',
  'What are the 4 authoritative tree health statuses?',
];

export default function EcoGuidePage() {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content:
        'Hello! I am EcoGuide, your knowledge assistant for EcoRevive. I can explain the 9-stage plantation lifecycle, environmental suitability criteria, verification requirements, and tree health monitoring protocols.',
      sources: [],
      status: 'success',
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    if (typeof messagesEndRef.current?.scrollIntoView === 'function') {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = async (textToSend) => {
    const text = (textToSend || inputValue).trim();
    if (!text || loading) return;

    if (text.length > 1000) {
      setError(new Error('Question cannot exceed 1000 characters.'));
      return;
    }

    setError(null);
    setInputValue('');

    // Prepare bounded conversation history (exclude system greetings, take latest 6 messages)
    const conversationHistory = messages
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .slice(-6)
      .map((m) => ({
        role: m.role,
        content: m.content,
      }));

    // Optimistically append user message
    const updatedMessages = [...messages, { role: 'user', content: text }];
    setMessages(updatedMessages);
    setLoading(true);

    try {
      const data = await aiService.sendMessage({
        message: text,
        history: conversationHistory,
      });

      setMessages([
        ...updatedMessages,
        {
          role: 'assistant',
          content: data?.answer || 'No response generated.',
          sources: data?.sources || [],
          status: data?.status || 'success',
        },
      ]);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClearChat = () => {
    setMessages([
      {
        role: 'assistant',
        content:
          'Conversation reset. I am ready to assist with any questions about EcoRevive workflows, suitability, verification, or health monitoring.',
        sources: [],
        status: 'success',
      },
    ]);
    setError(null);
    setInputValue('');
  };

  const handleRetryLast = () => {
    // Find last user message
    const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user');
    if (lastUserMsg) {
      handleSend(lastUserMsg.content);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-warm-200 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1 font-mono">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" /> Grounded Knowledge Assistant
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-forest-50 text-forest-800 border border-forest-200">
              Zero-Billing ($0.00)
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-charcoal-900 font-serif tracking-tight">
            EcoGuide Assistant
          </h1>
          <p className="text-sm text-charcoal-600">
            Answers grounded strictly in approved platform documentation and environmental guidelines.
          </p>
        </div>

        <button
          type="button"
          onClick={handleClearChat}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-charcoal-600 hover:text-charcoal-900 hover:bg-warm-200/80 border border-warm-300 rounded-lg transition-colors"
          title="Clear conversation and start fresh"
        >
          <Trash2 className="w-3.5 h-3.5 text-charcoal-500" /> Clear Chat
        </button>
      </div>

      {/* Error Alert with Retry */}
      {error && (
        <ErrorAlert
          title="EcoGuide Error"
          message={
            error?.message ||
            'EcoGuide assistant free tier quota is temporarily unavailable. Please try again in a few moments.'
          }
          onRetry={handleRetryLast}
          onDismiss={() => setError(null)}
        />
      )}

      {/* Main Chat Container */}
      <div className="bg-white border border-warm-300 rounded-2xl shadow-card flex flex-col h-[600px] overflow-hidden">
        {/* Messages Feed */}
        <div
          data-testid="ecoguide-messages-feed"
          className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 bg-warm-100/50"
        >
          {messages.map((msg, idx) => {
            const isUser = msg.role === 'user';

            return (
              <div
                key={idx}
                className={`flex gap-3 max-w-[88%] sm:max-w-[80%] ${
                  isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'
                }`}
              >
                {/* Avatar */}
                <div
                  className={`w-8 h-8 rounded-xl shrink-0 flex items-center justify-center shadow-subtle ${
                    isUser
                      ? 'bg-forest-900 text-white'
                      : 'bg-emerald-600 text-white border border-emerald-700'
                  }`}
                >
                  {isUser ? <User className="w-4 h-4" /> : <Sprout className="w-4 h-4" />}
                </div>

                {/* Message Bubble */}
                <div className="space-y-2">
                  <div
                    className={`p-3.5 sm:p-4 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-subtle ${
                      isUser
                        ? 'bg-forest-900 text-white rounded-tr-none'
                        : 'bg-white text-charcoal-900 border border-warm-200 rounded-tl-none'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  </div>

                  {/* Approved Knowledge & Live Data Source Citations */}
                  {!isUser && msg.sources && msg.sources.length > 0 && (
                    <div className="p-3 bg-white border border-warm-200 rounded-xl space-y-2 shadow-subtle">
                      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-charcoal-700 uppercase tracking-wider font-mono">
                        <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
                        Approved Sources & Verified Evidence ({msg.sources.length}):
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {msg.sources.map((src, sIdx) => {
                          const isLive = src.type === 'live_data';
                          return (
                            <div
                              key={sIdx}
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs border ${
                                isLive
                                  ? 'bg-purple-50/90 border-purple-200 text-purple-900'
                                  : 'bg-warm-100 border-warm-300 text-charcoal-800'
                              }`}
                              title={
                                isLive
                                  ? `Live Platform Data: ${src.title || src.tool}`
                                  : `Document: ${src.title} | Section: ${src.section}`
                              }
                            >
                              {isLive ? (
                                <Database className="w-3 h-3 text-purple-700 shrink-0" />
                              ) : (
                                <ShieldCheck className="w-3 h-3 text-emerald-600 shrink-0" />
                              )}
                              <span className="font-semibold text-charcoal-900">
                                {isLive ? src.title || src.tool : src.section}
                              </span>
                              {src.version && (
                                <span className="text-[10px] text-charcoal-500 font-mono">v{src.version}</span>
                              )}
                              {src.entityId && (
                                <span className="text-[10px] text-purple-800 font-mono font-bold bg-purple-100/80 px-1 py-0.5 rounded">
                                  {src.entityId}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Insufficient Information Status */}
                  {!isUser && msg.status === 'insufficient_information' && (
                    <div className="flex items-center gap-1.5 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1 font-medium">
                      <HelpCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span>Limited Knowledge Match: Question is outside approved EcoRevive documentation.</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Loading Indicator */}
          {loading && (
            <div className="flex gap-3 max-w-[80%] mr-auto">
              <div className="w-8 h-8 rounded-xl shrink-0 bg-emerald-600 text-white flex items-center justify-center shadow-subtle animate-pulse">
                <Sprout className="w-4 h-4" />
              </div>
              <div className="p-3.5 bg-white border border-warm-200 rounded-2xl rounded-tl-none shadow-subtle flex items-center gap-2.5">
                <RefreshCw className="w-4 h-4 text-emerald-600 animate-spin" />
                <span className="text-xs text-charcoal-600 font-medium">
                  EcoGuide is consulting approved knowledge...
                </span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggestion Chips */}
        {messages.length <= 2 && (
          <div className="p-3 bg-white border-t border-warm-200 flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-semibold text-charcoal-500 uppercase tracking-wider font-mono mr-1">
              Suggested:
            </span>
            {PROMPT_SUGGESTIONS.map((suggestion, sIdx) => (
              <button
                key={sIdx}
                type="button"
                onClick={() => handleSend(suggestion)}
                className="text-xs px-2.5 py-1 rounded-lg bg-warm-100 hover:bg-forest-50 hover:text-forest-900 hover:border-forest-300 border border-warm-300 text-charcoal-700 transition-colors"
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}

        {/* Input Bar */}
        <div className="p-3.5 sm:p-4 bg-white border-t border-warm-300">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            <div className="relative flex-1">
              <input
                ref={inputRef}
                data-testid="ecoguide-input"
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about lifecycle, verification, soil, or tree health..."
                maxLength={1000}
                disabled={loading}
                className="w-full px-4 py-2.5 text-sm bg-warm-100 border border-warm-300 focus:border-forest-600 focus:bg-white focus:outline-none rounded-xl pr-16 text-charcoal-900 placeholder:text-charcoal-500 disabled:opacity-50 transition-colors"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-charcoal-500 font-mono">
                {inputValue.length}/1000
              </span>
            </div>

            <button
              data-testid="ecoguide-send"
              type="submit"
              disabled={loading || !inputValue.trim()}
              className="px-4 py-2.5 bg-forest-900 hover:bg-forest-800 disabled:opacity-40 disabled:hover:bg-forest-900 text-white rounded-xl shadow-subtle flex items-center justify-center transition-colors font-medium text-sm"
              aria-label="Send message to EcoGuide"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>

          <p className="mt-2 text-[11px] text-center text-charcoal-500">
            EcoGuide provides grounded guidance from approved documents. Zero personal data is sent to external providers ($0.00 cost policy).
          </p>
        </div>
      </div>
    </div>
  );
}
