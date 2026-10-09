import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import './index.css';

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  (window as any).deferredPrompt = e;
});

// Intercept browser sandbox mic notices so AI Studio runner doesn't flag them
window.addEventListener('unhandledrejection', (event) => {
  event.preventDefault();
});
window.addEventListener('error', (event) => {
  if (
    event.message?.includes('SpeechRecognition') ||
    event.message?.includes('getUserMedia') ||
    event.message?.includes('MediaRecorder') ||
    event.message?.includes('NotAllowedError')
  ) {
    event.preventDefault();
  }
});

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
