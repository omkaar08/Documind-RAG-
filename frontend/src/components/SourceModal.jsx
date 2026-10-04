import React from 'react';
import { X, BookOpen, Target, FileText } from 'lucide-react';

export default function SourceModal({ isOpen, onClose, sources, activePage }) {
  if (!isOpen || !sources || sources.length === 0) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div className="glass-card" style={{
        width: '100%',
        maxWidth: '720px',
        maxHeight: '85vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.8)',
        border: '1px solid rgba(99, 102, 241, 0.3)'
      }}>
        {/* Modal Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(15, 23, 42, 0.8)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <BookOpen size={22} color="#6366f1" />
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc' }}>
                Retrieved Context & Source References
              </h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                Top k relevant text chunks retrieved from ChromaDB vectorstore
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '8px'
            }}
            onMouseOver={(e) => e.currentTarget.style.color = '#fff'}
            onMouseOut={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{
          padding: '24px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}>
          {sources.map((src, idx) => {
            const isTargetPage = activePage ? src.page === activePage : false;
            return (
              <div
                key={idx}
                style={{
                  padding: '16px 20px',
                  background: isTargetPage ? 'rgba(99, 102, 241, 0.12)' : 'rgba(30, 41, 59, 0.4)',
                  border: isTargetPage ? '1px solid rgba(99, 102, 241, 0.5)' : '1px solid var(--border-color)',
                  borderRadius: '12px',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '10px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{
                      padding: '4px 10px',
                      background: 'rgba(99, 102, 241, 0.2)',
                      border: '1px solid rgba(99, 102, 241, 0.4)',
                      color: '#a5b4fc',
                      borderRadius: '6px',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <FileText size={13} />
                      Page {src.page}
                    </span>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      Chunk #{src.source_id}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: '#10b981', fontWeight: 600 }}>
                    <Target size={14} />
                    <span>Relevance: {src.relevance}</span>
                  </div>
                </div>

                <div style={{
                  fontSize: '0.88rem',
                  lineHeight: 1.6,
                  color: '#cbd5e1',
                  background: 'rgba(15, 23, 42, 0.6)',
                  padding: '12px 14px',
                  borderRadius: '8px',
                  whiteSpace: 'pre-wrap',
                  fontFamily: 'monospace',
                  borderLeft: '3px solid #6366f1'
                }}>
                  "{src.snippet}"
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
