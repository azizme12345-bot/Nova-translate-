import React from 'react';
import { BrandLogo } from './BrandLogo.tsx';

interface ModalsProps {
  showPrivacy: boolean;
  showAbout: boolean;
  onClosePrivacy: () => void;
  onCloseAbout: () => void;
}

export const Modals: React.FC<ModalsProps> = ({
  showPrivacy,
  showAbout,
  onClosePrivacy,
  onCloseAbout,
}) => {
  if (!showPrivacy && !showAbout) return null;

  return (
    <>
      {showPrivacy && (
        <div className="modal-overlay" onClick={onClosePrivacy}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: '20px', fontWeight: 800, margin: '0 0 12px' }}>
              Privacy & Data Policy
            </h3>
            <div style={{ color: 'var(--muted)', fontSize: '14px', lineHeight: 1.6 }}>
              <p style={{ margin: '0 0 10px' }}>
                <strong>No Secrets on Client:</strong> Nova Translate adheres to strict zero-leak client architecture. All API requests route securely through our backend server. No API keys or AI provider credentials are ever shipped to the browser.
              </p>
              <p style={{ margin: '0 0 10px' }}>
                <strong>Data Minimization:</strong> Translation history is stored locally in your browser’s localStorage. You can clear your translation logs at any time from the History page.
              </p>
              <p style={{ margin: '0 0 10px' }}>
                <strong>Data In Transit:</strong> Communication between your browser and our backend is encrypted using standard HTTPS/TLS protocols.
              </p>
            </div>
            <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
              <button className="primary" onClick={onClosePrivacy} type="button">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showAbout && (
        <div className="modal-overlay" onClick={onCloseAbout}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
              <BrandLogo size={52} />
              <div>
                <h3 style={{ fontSize: '20px', fontWeight: 800, margin: 0 }}>
                  Nova Translate
                </h3>
                <small style={{ color: 'var(--muted)' }}>v1.0 Production Edition</small>
              </div>
            </div>
            <div style={{ color: 'var(--muted)', fontSize: '14px', lineHeight: 1.6 }}>
              <p style={{ margin: '0 0 10px' }}>
                Nova Translate is an AI-powered translation platform supporting text translation, language detection, voice synthesis, speech recognition, and visual camera OCR across 100+ languages.
              </p>
              <p style={{ margin: '0 0 10px' }}>
                <strong>Engine:</strong> Powered by Gemini 1.5 Flash multimodal reasoning on a secure serverless backend.
              </p>
              <p style={{ margin: '0 0 10px' }}>
                <strong>Deploy Anywhere:</strong> Built with standard Node.js Express and Vercel Serverless Function compatibility.
              </p>
            </div>
            <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
              <button className="primary" onClick={onCloseAbout} type="button">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
