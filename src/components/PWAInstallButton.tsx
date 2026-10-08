import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall.ts';

interface PWAInstallButtonProps {
  onToast: (msg: string) => void;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ onToast }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSModal, setShowIOSModal] = useState(false);

  if (isInstalled) {
    return null;
  }

  const handleInstallClick = async () => {
    if (isInstallable) {
      const outcome = await install();
      if (outcome) {
        onToast('Nova Translate installed successfully!');
      }
    } else if (isIOS) {
      setShowIOSModal(true);
    } else {
      onToast('PWA is ready. Install via browser menu (⋮ or Share).');
    }
  };

  return (
    <>
      <button
        className="mini"
        onClick={handleInstallClick}
        title="Install Nova Translate App"
        style={{ color: '#0284c7', borderColor: '#0284c7', display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 10px', background: 'rgba(2, 132, 199, 0.08)' }}
        type="button"
      >
        <span style={{ fontSize: '14px', fontWeight: 900, color: '#1E3A8A', background: 'linear-gradient(135deg, #1E3A8A, #06B6D4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>N</span>
        <span>Install App</span>
      </button>

      {showIOSModal && (
        <div className="modal-overlay" onClick={() => setShowIOSModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 10px', fontSize: '18px', fontWeight: 'bold' }}>
              Install on iOS
            </h3>
            <p style={{ color: 'var(--muted)', fontSize: '14px', lineHeight: '1.6' }}>
              1. Tap the <strong>Share</strong> button in Safari's bottom toolbar.<br />
              2. Scroll down and tap <strong>Add to Home Screen</strong>.<br />
              3. Tap <strong>Add</strong> in the top-right corner.
            </p>
            <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
              <button className="primary" onClick={() => setShowIOSModal(false)}>
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
