import React, { useState, useRef } from 'react';
import { Upload, FileText, CheckCircle2, AlertCircle, Loader2, Layers, Cpu, Hash } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function FileUpload({ docInfo, onUploadSuccess, isProcessing, setIsProcessing }) {
  const [dragActive, setDragActive] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [stepText, setStepText] = useState('');
  const fileInputRef = useRef(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      uploadFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      uploadFile(e.target.files[0]);
    }
  };

  const uploadFile = async (file) => {
    if (!file.name.endsWith('.pdf')) {
      setErrorMsg("Only PDF files are supported.");
      return;
    }

    setErrorMsg(null);
    setIsProcessing(true);
    setStepText("Extracting PDF text and metadata...");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const timer1 = setTimeout(() => {
        setStepText("Splitting text into overlapping chunks...");
      }, 1200);

      const timer2 = setTimeout(() => {
        setStepText("Generating 384-dim vector embeddings with MiniLM...");
      }, 2500);

      const timer3 = setTimeout(() => {
        setStepText("Storing vectors and page metadata in ChromaDB...");
      }, 4000);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);

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
        resData = { detail: textResp || `Server error (${response.status}): ${response.statusText || 'Unexpected server response'}` };
      }

      if (!response.ok) {
        throw new Error(resData.detail || resData.message || `Failed to process PDF (${response.status}).`);
      }

      setIsProcessing(false);
      onUploadSuccess(resData.data);
      
      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.6 }
        });
      } catch (err) {}

    } catch (err) {
      setIsProcessing(false);
      setErrorMsg(err.message || "Error processing document.");
    }
  };

  return (
    <div className="glass-card" style={{ padding: '24px', marginBottom: '24px' }}>
      {!docInfo && !isProcessing ? (
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: `2px dashed ${dragActive ? '#6366f1' : 'rgba(99, 102, 241, 0.3)'}`,
            borderRadius: '14px',
            padding: '40px 24px',
            textAlign: 'center',
            background: dragActive ? 'rgba(99, 102, 241, 0.08)' : 'rgba(15, 23, 42, 0.4)',
            cursor: 'pointer',
            transition: 'all 0.25s ease'
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            onChange={handleChange}
            style={{ display: 'none' }}
          />

          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'rgba(99, 102, 241, 0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px auto',
            border: '1px solid rgba(99, 102, 241, 0.2)'
          }}>
            <Upload size={28} color="#818cf8" />
          </div>

          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc', marginBottom: '6px' }}>
            Upload PDF Document
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>
            Drag and drop your PDF file here, or click to browse
          </p>

          <div style={{ display: 'inline-flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
            <span style={{ fontSize: '0.75rem', padding: '4px 10px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '12px', color: '#94a3b8' }}>
              Text Extraction
            </span>
            <span style={{ fontSize: '0.75rem', padding: '4px 10px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '12px', color: '#94a3b8' }}>
              Vector Embedding
            </span>
            <span style={{ fontSize: '0.75rem', padding: '4px 10px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '12px', color: '#94a3b8' }}>
              Source Reference Tracking
            </span>
          </div>
        </div>
      ) : isProcessing ? (
        <div style={{ textAlign: 'center', padding: '36px 20px' }}>
          <Loader2 size={40} color="#6366f1" className="pulse-active" style={{ animation: 'spin 1.2s linear infinite', margin: '0 auto 16px auto' }} />
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#f8fafc', marginBottom: '8px' }}>
            Processing Document & Building Index
          </h3>
          <p style={{ fontSize: '0.88rem', color: '#818cf8', fontWeight: 500 }}>
            {stepText}
          </p>
          <style>{`
            @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
          `}</style>
        </div>
      ) : (
        /* Processed Document Info Banner */
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: 'rgba(16, 185, 129, 0.15)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <CheckCircle2 size={22} color="#10b981" />
              </div>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#f8fafc' }}>
                  {docInfo.filename}
                </h3>
                <span style={{ fontSize: '0.8rem', color: '#10b981', fontWeight: 600 }}>
                  ● Indexed & Ready for Queries
                </span>
              </div>
            </div>

            <button
              onClick={() => fileInputRef.current?.click()}
              style={{
                padding: '6px 14px',
                background: 'rgba(99, 102, 241, 0.12)',
                border: '1px solid rgba(99, 102, 241, 0.3)',
                color: '#a5b4fc',
                borderRadius: '8px',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Upload Another PDF
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              onChange={handleChange}
              style={{ display: 'none' }}
            />
          </div>

          {/* Stats grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '12px',
            marginTop: '16px'
          }}>
            <div style={{ padding: '12px 16px', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid var(--border-color)', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <FileText size={18} color="#6366f1" />
              <div>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Total Pages</p>
                <p style={{ fontSize: '1rem', fontWeight: 700, color: '#fff' }}>{docInfo.total_pages} Pages</p>
              </div>
            </div>

            <div style={{ padding: '12px 16px', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid var(--border-color)', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Layers size={18} color="#06b6d4" />
              <div>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Extracted Chunks</p>
                <p style={{ fontSize: '1rem', fontWeight: 700, color: '#fff' }}>{docInfo.total_chunks} Chunks</p>
              </div>
            </div>

            <div style={{ padding: '12px 16px', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid var(--border-color)', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Hash size={18} color="#8b5cf6" />
              <div>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Vector Dimension</p>
                <p style={{ fontSize: '1rem', fontWeight: 700, color: '#fff' }}>384 Dense Dim</p>
              </div>
            </div>

            <div style={{ padding: '12px 16px', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid var(--border-color)', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Cpu size={18} color="#10b981" />
              <div>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Vector Database</p>
                <p style={{ fontSize: '1rem', fontWeight: 700, color: '#fff' }}>ChromaDB Local</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {errorMsg && (
        <div style={{
          marginTop: '16px',
          padding: '12px 16px',
          background: 'rgba(239, 68, 68, 0.12)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: '10px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          color: '#f87171',
          fontSize: '0.85rem'
        }}>
          <AlertCircle size={18} />
          <span>{errorMsg}</span>
        </div>
      )}
    </div>
  );
}
