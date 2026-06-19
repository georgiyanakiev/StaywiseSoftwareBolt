import { useState, useRef, useEffect, useCallback } from 'react';
import {
  X, Send, Sparkles, Plus, Trash2, MessageSquare,
  ChevronLeft, StopCircle, AlertCircle, Bot, User,
} from 'lucide-react';
import { useAIConcierge, type ChatMessage } from '../../hooks/useAIConcierge';
import { useActiveHotel } from '../../contexts/ActiveHotelContext';

interface AIConciergeProps {
  open: boolean;
  onClose: () => void;
}

const SUGGESTIONS = [
  "What's today's occupancy and arrivals?",
  "Which rooms need housekeeping attention?",
  "Show me this week's revenue summary",
  "Any open maintenance issues?",
  "What departures are expected today?",
];

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function TypingIndicator({ color }: { color: string }) {
  return (
    <div className="flex items-end gap-3 animate-fadeIn">
      <div
        className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: `${color}15` }}
      >
        <Bot className="w-4 h-4" style={{ color }} />
      </div>
      <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
        <div className="flex gap-1.5">
          <span className="w-2 h-2 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-2 h-2 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-2 h-2 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ msg, brandColor }: { msg: ChatMessage; brandColor: string }) {
  const isUser = msg.role === 'user';
  return (
    <div className={`flex items-end gap-3 animate-fadeIn ${isUser ? 'flex-row-reverse' : ''}`}>
      <div
        className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{
          backgroundColor: isUser ? `${brandColor}15` : '#f0fdf4',
        }}
      >
        {isUser ? (
          <User className="w-4 h-4" style={{ color: brandColor }} />
        ) : (
          <Bot className="w-4 h-4 text-emerald-600" />
        )}
      </div>
      <div className={`max-w-[80%] ${isUser ? 'text-right' : ''}`}>
        <div
          className={`rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
            isUser
              ? 'rounded-br-md text-white'
              : 'rounded-bl-md bg-white border border-gray-100 text-gray-800 shadow-sm'
          }`}
          style={isUser ? { backgroundColor: brandColor } : undefined}
        >
          {formatContent(msg.content)}
        </div>
        <p className="text-[10px] text-gray-400 mt-1 px-1">{formatTime(msg.created_at)}</p>
      </div>
    </div>
  );
}

function formatContent(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

function HistoryPanel({
  conversations,
  activeId,
  onSelect,
  onDelete,
  onNew,
  brandColor,
}: {
  conversations: { id: string; title: string; updated_at: string }[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onNew: () => void;
  brandColor: string;
}) {
  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-gray-100">
        <button
          onClick={onNew}
          className="flex items-center gap-2 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-white transition-colors hover:opacity-90"
          style={{ backgroundColor: brandColor }}
        >
          <Plus className="w-4 h-4" />
          New Conversation
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
        {conversations.length === 0 && (
          <p className="text-xs text-gray-400 text-center py-8">No conversations yet</p>
        )}
        {conversations.map(c => (
          <div
            key={c.id}
            className={`group flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer transition-colors ${
              c.id === activeId ? 'bg-gray-100' : 'hover:bg-gray-50'
            }`}
            onClick={() => onSelect(c.id)}
          >
            <MessageSquare className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
            <span className="text-sm text-gray-700 truncate flex-1">{c.title}</span>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(c.id); }}
              className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-all"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AIConciergePanel({ open, onClose }: AIConciergeProps) {
  const { session } = useActiveHotel();
  const brandColor = session?.primaryColor ?? '#2563eb';
  const hotelName = session?.hotelName ?? 'Hotel';

  const {
    messages,
    loading,
    error,
    conversationId,
    conversations,
    sendMessage,
    cancelRequest,
    loadConversations,
    loadMessages,
    startNewConversation,
    deleteConversation,
  } = useAIConcierge();

  const [input, setInput] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) {
      loadConversations();
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [open, loadConversations]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;
    setInput('');
    sendMessage(trimmed);
  }, [input, loading, sendMessage]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  const handleSuggestion = useCallback((s: string) => {
    setInput('');
    sendMessage(s);
  }, [sendMessage]);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-gray-900/30 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 bottom-0 z-50 w-full sm:w-[440px] flex flex-col bg-gray-50 shadow-2xl animate-slideIn">
        {/* Header */}
        <div
          className="flex items-center gap-3 px-5 py-4 text-white flex-shrink-0"
          style={{ background: `linear-gradient(135deg, ${brandColor}, ${brandColor}dd)` }}
        >
          {showHistory ? (
            <button
              onClick={() => setShowHistory(false)}
              className="p-1.5 rounded-lg hover:bg-white/15 transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          ) : (
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-bold leading-tight">
              {showHistory ? 'Conversation History' : 'AI Concierge'}
            </h2>
            {!showHistory && (
              <p className="text-xs text-white/70 truncate">{hotelName}</p>
            )}
          </div>
          <div className="flex items-center gap-1">
            {!showHistory && (
              <button
                onClick={() => setShowHistory(true)}
                className="p-2 rounded-lg hover:bg-white/15 transition-colors"
                title="History"
              >
                <MessageSquare className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-white/15 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {showHistory ? (
          <HistoryPanel
            conversations={conversations}
            activeId={conversationId}
            onSelect={(id) => {
              loadMessages(id);
              setShowHistory(false);
            }}
            onDelete={deleteConversation}
            onNew={() => {
              startNewConversation();
              setShowHistory(false);
            }}
            brandColor={brandColor}
          />
        ) : (
          <>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
              {messages.length === 0 && !loading && (
                <div className="flex flex-col items-center justify-center h-full text-center px-6">
                  <div
                    className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
                    style={{ backgroundColor: `${brandColor}10` }}
                  >
                    <Sparkles className="w-8 h-8" style={{ color: brandColor }} />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">
                    Hi! I'm your AI Concierge
                  </h3>
                  <p className="text-sm text-gray-500 mb-6 max-w-xs leading-relaxed">
                    Ask me anything about your hotel operations — occupancy, revenue, housekeeping, maintenance, and more.
                  </p>
                  <div className="space-y-2 w-full max-w-xs">
                    {SUGGESTIONS.map(s => (
                      <button
                        key={s}
                        onClick={() => handleSuggestion(s)}
                        className="w-full text-left px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm text-gray-700 hover:border-gray-300 hover:shadow-sm transition-all"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map(msg => (
                <MessageBubble key={msg.id} msg={msg} brandColor={brandColor} />
              ))}

              {loading && <TypingIndicator color={brandColor} />}

              {error && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-xl px-4 py-3 animate-fadeIn">
                  <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-red-700 font-medium">Something went wrong</p>
                    <p className="text-xs text-red-500 mt-0.5">{error}</p>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input area */}
            <div className="flex-shrink-0 border-t border-gray-200 bg-white px-4 py-3">
              {loading && (
                <button
                  onClick={cancelRequest}
                  className="flex items-center gap-1.5 mx-auto mb-2 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  <StopCircle className="w-3.5 h-3.5" />
                  Stop generating
                </button>
              )}
              <div className="flex items-end gap-2">
                <div className="flex-1 relative">
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask about your hotel..."
                    rows={1}
                    className="w-full resize-none rounded-xl border border-gray-200 px-4 py-3 pr-4 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent transition-shadow bg-gray-50 focus:bg-white"
                    style={{ focusRingColor: brandColor, maxHeight: '120px' } as React.CSSProperties}
                    onInput={(e) => {
                      const t = e.currentTarget;
                      t.style.height = 'auto';
                      t.style.height = Math.min(t.scrollHeight, 120) + 'px';
                    }}
                  />
                </div>
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || loading}
                  className="p-3 rounded-xl text-white transition-all disabled:opacity-40 hover:opacity-90 disabled:cursor-not-allowed flex-shrink-0"
                  style={{ backgroundColor: brandColor }}
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
              <p className="text-[10px] text-gray-400 text-center mt-2">
                AI responses are based on real-time hotel data. Always verify critical information.
              </p>
            </div>
          </>
        )}
      </div>

      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-slideIn { animation: slideIn 0.25s ease-out; }
        .animate-fadeIn { animation: fadeIn 0.2s ease-out; }
      `}</style>
    </>
  );
}
