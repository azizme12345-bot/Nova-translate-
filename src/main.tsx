import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

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

createRoot(document.getElementById('root')!).render(<App />);

