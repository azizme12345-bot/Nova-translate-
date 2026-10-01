import React from 'react';
import { HistoryItem } from '../types.ts';

interface HistorySectionProps {
  history: HistoryItem[];
  onRemoveItem: (id: string) => void;
  onClearAll: () => void;
  onToast: (msg: string) => void;
}

export const HistorySection: React.FC<HistorySectionProps> = ({
  history,
  onRemoveItem,
  onClearAll,
  onToast,
}) => {
  return (
    <section className="section active" id="history">
      <div className="hero">
        <div>
          <div className="eyebrow">YOUR TRANSLATIONS</div>
          <h1>History</h1>
          <p className="subtitle">Recent translations saved locally in this session.</p>
        </div>
        {history.length > 0 && (
          <button
            className="primary"
            id="clearHistory"
            onClick={() => {
              onClearAll();
              onToast('History cleared');
            }}
            type="button"
          >
            Clear all
          </button>
        )}
      </div>

      <div id="historyList">
        {history.length === 0 ? (
          <div className="workspace" style={{ textAlign: 'center', color: 'var(--muted)', padding: '50px' }}>
            No translations yet.
          </div>
        ) : (
          history.map((item) => (
            <div className="historyitem" key={item.id}>
              <div>
                <div className="route">
                  {item.from} → {item.to} · {item.time}
                </div>
                <div className="htxt">{item.input}</div>
                <div className="muted">{item.output}</div>
              </div>
              <button
                className="mini"
                onClick={() => {
                  onRemoveItem(item.id);
                  onToast('Item removed');
                }}
                type="button"
              >
                Delete
              </button>
            </div>
          ))
        )}
      </div>
    </section>
  );
};
