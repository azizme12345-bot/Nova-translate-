import React from 'react';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
          <div className="logo">A</div>
          <div>
            <h3 style={{ fontSize: '20px', fontWeight: 800, margin: 0 }}>
              Nova Translator
            </h3>
            <small style={{ color: 'var(--muted)' }}>v1.0 Production Edition</small>
          </div>
        </div>
        <div style={{ color: 'var(--muted)', fontSize: '14px', lineHeight: 1.6 }}>
          <p style={{ margin: '0 0 10px' }}>
            Nova Translator is a high-performance translation platform supporting text translation, language detection, voice synthesis, speech recognition, and visual camera OCR across 100+ languages.
          </p>
          <p style={{ margin: '0 0 10px' }}>
            <strong>Engine:</strong> Powered by Gemini 1.5 Flash multimodal reasoning on a secure serverless backend.
          </p>
          <p style={{ margin: '0 0 10px' }}>
            <strong>Deploy Anywhere:</strong> Built with standard Node.js Express and Vercel Serverless Function compatibility.
          </p>
        </div>
        <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
          <button className="primary" onClick={onClose} type="button">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
