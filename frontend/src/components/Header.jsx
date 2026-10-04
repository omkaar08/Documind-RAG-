import React from 'react';
import { FileText, Cpu, Database, Sparkles, RotateCcw } from 'lucide-react';

export default function Header({ docInfo, onReset }) {
  return (
    <header style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '20px 32px',
      borderBottom: '1px solid var(--border-color)',
      background: 'rgba(9, 13, 22, 0.8)',
      backdropFilter: 'blur(12px)',
      position: 'sticky',
      top: 0,
      zIndex: 100
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{
          width: '46px',
          height: '46px',
          borderRadius: '12px',
          background: 'var(--accent-gradient)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 0 20px rgba(99, 102, 241, 0.4)'
        }}>
          <FileText size={24} color="#ffffff" />
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ fontSize: '1.45rem', fontWeight: 800, letterSpacing: '-0.02em', background: 'linear-gradient(90deg, #fff 0%, #cbd5e1 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              DocuQuery AI
            </h1>
            <span style={{
              padding: '2px 8px',
              borderRadius: '20px',
              background: 'rgba(99, 102, 241, 0.15)',
              border: '1px solid rgba(99, 102, 241, 0.3)',
              color: '#818cf8',
              fontSize: '0.72rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              RAG v1.0
            </span>
          </div>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Context-Aware Document Intelligence & Instant Q&A
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        {/* Tech Badges */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <div className="tech-badge" style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', background: 'rgba(30, 41, 59, 0.6)', border: '1px solid var(--border-color)', borderRadius: '20px', fontSize: '0.78rem', color: '#cbd5e1' }}>
            <Cpu size={14} color="#6366f1" />
            <span>Groq LLM Engine</span>
          </div>
          <div className="tech-badge" style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', background: 'rgba(30, 41, 59, 0.6)', border: '1px solid var(--border-color)', borderRadius: '20px', fontSize: '0.78rem', color: '#cbd5e1' }}>
            <Database size={14} color="#06b6d4" />
            <span>ChromaDB</span>
          </div>
          <div className="tech-badge" style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', background: 'rgba(30, 41, 59, 0.6)', border: '1px solid var(--border-color)', borderRadius: '20px', fontSize: '0.78rem', color: '#cbd5e1' }}>
            <Sparkles size={14} color="#8b5cf6" />
            <span>LangChain RAG</span>
          </div>
        </div>

        {docInfo && (
          <button 
            onClick={onReset}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              color: '#f87171',
              borderRadius: '10px',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'}
            onMouseOut={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
          >
            <RotateCcw size={14} />
            Reset Doc
          </button>
        )}
      </div>
    </header>
  );
}
