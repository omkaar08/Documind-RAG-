import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles, BookOpen, ExternalLink, Loader2, Info } from 'lucide-react';

export default function ChatInterface({ docInfo, onOpenSources }) {
  const [messages, setMessages] = useState([
    {
      sender: 'bot',
      text: 'Hello! I am DocuQuery AI. Upload a PDF document above and ask me anything about it. I will provide answers grounded in your document along with exact page references!',
      sources: []
    }
  ]);
  const [inputQuery, setInputQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const quickPrompts = [
    "Summarize the key points of this document.",
    "What are the main conclusions or findings?",
    "List all dates, numbers, or key metrics mentioned.",
    "What recommendations or action items are outlined?"
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSend = async (queryText = inputQuery) => {
    const text = queryText.trim();
    if (!text || isLoading) return;

    if (!docInfo) {
      setMessages(prev => [
        ...prev,
        { sender: 'user', text: text },
        {
          sender: 'bot',
          text: '⚠️ Please upload a PDF document first before asking questions.',
          sources: []
        }
      ]);
      setInputQuery('');
      return;
    }

    const newMessages = [...messages, { sender: 'user', text: text }];
    setMessages(newMessages);
    setInputQuery('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: text, top_k: 4 }),
      });

      let resData = {};
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        try {
          resData = await response.json();
        } catch (jsonErr) {
          resData = {};
        }
      } else {
        const textResp = await response.text().catch(() => '');
        resData = { detail: textResp || `Server error (${response.status}): ${response.statusText || 'Unexpected response'}` };
      }

      if (!response.ok) {
        throw new Error(resData.detail || resData.message || "Failed to query document.");
      }

      const answerData = resData.data;

      setMessages(prev => [
        ...prev,
        {
          sender: 'bot',
          text: answerData.answer,
          sources: answerData.sources || []
        }
      ]);
    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          sender: 'bot',
          text: `❌ Error: ${err.message || 'Failed to fetch answer.'}`,
          sources: []
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Format message text with interactive clickable [Page X] badges
  const renderFormattedText = (text, sources) => {
    if (!text) return null;

    // Pattern to match [Page X] or [Source X | Page Y]
    const regex = /\[(?:Source \d+ \| )?Page (\d+)\]/gi;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }
      const pageNum = parseInt(match[1], 10);
      parts.push(
        <button
          key={`page-${match.index}`}
          className="source-tag"
          onClick={() => onOpenSources(sources, pageNum)}
          title={`Click to inspect retrieved chunk from Page ${pageNum}`}
        >
          <BookOpen size={12} />
          Page {pageNum}
        </button>
      );
      lastIndex = regex.lastIndex;
    }

    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return parts;
  };

  return (
    <div className="glass-card" style={{
      display: 'flex',
      flexDirection: 'column',
      height: '620px',
      overflow: 'hidden'
    }}>
      {/* Chat Sub-Header */}
      <div style={{
        padding: '16px 24px',
        borderBottom: '1px solid var(--border-color)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'rgba(15, 23, 42, 0.5)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Sparkles size={20} color="#8b5cf6" />
          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#f8fafc' }}>
            RAG Query Interface
          </h2>
        </div>
        {docInfo && (
          <span style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Info size={14} color="#6366f1" />
            Querying active document: <strong style={{ color: '#fff' }}>{docInfo.filename}</strong>
          </span>
        )}
      </div>

      {/* Messages Feed */}
      <div style={{
        flex: 1,
        padding: '24px',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '18px'
      }}>
        {messages.map((msg, idx) => (
          <div
            key={idx}
            style={{
              display: 'flex',
              gap: '12px',
              alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: '85%'
            }}
          >
            {msg.sender === 'bot' && (
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'var(--accent-gradient)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                marginTop: '2px'
              }}>
                <Bot size={20} color="#ffffff" />
              </div>
            )}

            <div>
              <div style={{
                padding: '14px 18px',
                borderRadius: msg.sender === 'user' ? '16px 16px 2px 16px' : '16px 16px 16px 2px',
                background: msg.sender === 'user'
                  ? 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)'
                  : 'rgba(30, 41, 59, 0.7)',
                border: msg.sender === 'user' ? 'none' : '1px solid var(--border-color)',
                color: '#f8fafc',
                fontSize: '0.92rem',
                lineHeight: 1.6,
                boxShadow: msg.sender === 'user' ? '0 4px 15px rgba(99, 102, 241, 0.3)' : 'none'
              }}>
                {msg.sender === 'bot' ? (
                  <div style={{ whiteSpace: 'pre-wrap' }}>
                    {renderFormattedText(msg.text, msg.sources)}
                  </div>
                ) : (
                  msg.text
                )}
              </div>

              {/* Source reference button bar if bot message has sources */}
              {msg.sender === 'bot' && msg.sources && msg.sources.length > 0 && (
                <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <button
                    onClick={() => onOpenSources(msg.sources)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '4px 10px',
                      background: 'rgba(99, 102, 241, 0.1)',
                      border: '1px solid rgba(99, 102, 241, 0.25)',
                      color: '#a5b4fc',
                      borderRadius: '6px',
                      fontSize: '0.76rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.background = 'rgba(99, 102, 241, 0.2)'}
                    onMouseOut={(e) => e.currentTarget.style.background = 'rgba(99, 102, 241, 0.1)'}
                  >
                    <BookOpen size={13} />
                    View {msg.sources.length} Source References
                    <ExternalLink size={12} />
                  </button>
                </div>
              )}
            </div>

            {msg.sender === 'user' && (
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'rgba(51, 65, 85, 0.8)',
                border: '1px solid var(--border-color)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                marginTop: '2px'
              }}>
                <User size={18} color="#cbd5e1" />
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div style={{ display: 'flex', gap: '12px', alignSelf: 'flex-start' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'var(--accent-gradient)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Bot size={20} color="#ffffff" />
            </div>
            <div style={{
              padding: '14px 18px',
              borderRadius: '16px 16px 16px 2px',
              background: 'rgba(30, 41, 59, 0.7)',
              border: '1px solid var(--border-color)',
              color: '#818cf8',
              fontSize: '0.88rem',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <Loader2 size={18} className="pulse-active" style={{ animation: 'spin 1s linear infinite' }} />
              <span>Searching ChromaDB & generating response with Groq LLM...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Quick Prompt Chips */}
      {docInfo && (
        <div style={{
          padding: '10px 24px',
          background: 'rgba(15, 23, 42, 0.4)',
          borderTop: '1px solid var(--border-color)',
          display: 'flex',
          gap: '8px',
          overflowX: 'auto',
          scrollbarWidth: 'none'
        }}>
          {quickPrompts.map((prompt, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(prompt)}
              disabled={isLoading}
              style={{
                padding: '6px 12px',
                background: 'rgba(30, 41, 59, 0.6)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                color: '#cbd5e1',
                borderRadius: '16px',
                fontSize: '0.78rem',
                whiteSpace: 'nowrap',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.borderColor = '#6366f1';
                e.currentTarget.style.color = '#fff';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                e.currentTarget.style.color = '#cbd5e1';
              }}
            >
              ⚡ {prompt}
            </button>
          ))}
        </div>
      )}

      {/* Query Input Box */}
      <div style={{
        padding: '16px 24px',
        borderTop: '1px solid var(--border-color)',
        background: 'rgba(15, 23, 42, 0.8)'
      }}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          style={{ display: 'flex', gap: '12px' }}
        >
          <input
            type="text"
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            placeholder={docInfo ? "Ask any question about your document..." : "Upload a PDF document above to begin asking questions..."}
            disabled={!docInfo || isLoading}
            style={{
              flex: 1,
              padding: '14px 18px',
              background: 'rgba(30, 41, 59, 0.5)',
              border: '1px solid var(--border-color)',
              borderRadius: '12px',
              color: '#ffffff',
              fontSize: '0.92rem',
              outline: 'none',
              transition: 'border-color 0.2s ease'
            }}
            onFocus={(e) => e.target.style.borderColor = '#6366f1'}
            onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
          />

          <button
            type="submit"
            disabled={!docInfo || !inputQuery.trim() || isLoading}
            style={{
              padding: '0 24px',
              background: (!docInfo || !inputQuery.trim() || isLoading)
                ? 'rgba(99, 102, 241, 0.3)'
                : 'var(--accent-gradient)',
              border: 'none',
              borderRadius: '12px',
              color: '#ffffff',
              cursor: (!docInfo || !inputQuery.trim() || isLoading) ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              fontWeight: 700,
              boxShadow: (!docInfo || !inputQuery.trim() || isLoading) ? 'none' : '0 4px 15px rgba(99, 102, 241, 0.4)',
              transition: 'all 0.2s ease'
            }}
          >
            <span>Ask</span>
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  );
}
