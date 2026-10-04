import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import FileUpload from './components/FileUpload';
import ChatInterface from './components/ChatInterface';
import SourceModal from './components/SourceModal';

export default function App() {
  const [docInfo, setDocInfo] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [modalSources, setModalSources] = useState([]);
  const [activePage, setActivePage] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Check initial document status from backend
  useEffect(() => {
    fetch('/api/status')
      .then((res) => res.json())
      .then((resData) => {
        if (resData.success && resData.data?.has_document) {
          setDocInfo(resData.data.document_info);
        }
      })
      .catch((err) => console.log('Backend not connected yet or no active doc:', err));
  }, []);

  const handleReset = async () => {
    try {
      await fetch('/api/reset', { method: 'POST' });
      setDocInfo(null);
      setModalSources([]);
      setIsModalOpen(false);
    } catch (err) {
      console.error('Reset error:', err);
    }
  };

  const handleOpenSources = (sources, pageNum = null) => {
    setModalSources(sources);
    setActivePage(pageNum);
    setIsModalOpen(true);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header docInfo={docInfo} onReset={handleReset} />

      <main style={{
        flex: 1,
        maxWidth: '1200px',
        width: '100%',
        margin: '0 auto',
        padding: '32px 24px'
      }}>
        {/* Step 1: Upload section */}
        <FileUpload
          docInfo={docInfo}
          onUploadSuccess={(data) => setDocInfo(data)}
          isProcessing={isProcessing}
          setIsProcessing={setIsProcessing}
        />

        {/* Step 2: Chat Interface */}
        <ChatInterface
          docInfo={docInfo}
          onOpenSources={handleOpenSources}
        />
      </main>

      {/* Footer */}
      <footer style={{
        textAlign: 'center',
        padding: '20px',
        color: 'var(--text-muted)',
        fontSize: '0.8rem',
        borderTop: '1px solid var(--border-color)',
        marginTop: '40px'
      }}>
        DocuQuery AI &bull; Powered by LangChain, Groq LLaMA 3.3, ChromaDB & React
      </footer>

      {/* Source Reference Inspection Modal */}
      <SourceModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        sources={modalSources}
        activePage={activePage}
      />
    </div>
  );
}
