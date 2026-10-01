import React, { useState, useRef, useEffect } from 'react';

export interface VoiceSectionProps {
  fromLang?: string;
  inputText: string;
  onUpdateInput: (text: string) => void;
  onToast: (msg: string) => void;
}

/**
 * VoiceSection: Voice mic speech recognition component and hook
 * Configures SpeechRecognition / webkitSpeechRecognition with:
 * - continuous = false
 * - interimResults = true
 * - lang = dynamic based on source language (defaults to 'ur-PK')
 * - real-time live input streaming
 * - graceful error and onend lifecycle recovery
 */
export const VoiceSection: React.FC<VoiceSectionProps> = ({
  fromLang = 'Urdu 🇵🇰',
  inputText,
  onUpdateInput,
  onToast,
}) => {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const baseTextRef = useRef<string>('');

  const stopVoiceInput = () => {
    setIsListening(false);
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    }
  };

  const getRecognitionLang = (langName: string): string => {
    const lower = (langName || '').toLowerCase();
    if (lower.includes('urdu')) return 'ur-PK';
    if (lower.includes('arabic')) return 'ar-SA';
    if (lower.includes('punjabi')) return 'pa-IN';
    if (lower.includes('hindi')) return 'hi-IN';
    if (lower.includes('spanish')) return 'es-ES';
    if (lower.includes('french')) return 'fr-FR';
    if (lower.includes('german')) return 'de-DE';
    if (lower.includes('japanese')) return 'ja-JP';
    if (lower.includes('chinese')) return 'zh-CN';
    if (lower.includes('russian')) return 'ru-RU';
    if (lower.includes('turkish')) return 'tr-TR';
    if (lower.includes('persian') || lower.includes('farsi')) return 'fa-IR';
    return 'en-US';
  };

  const startVoiceRecognition = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      onToast('Voice input is not supported in this browser. Please use Chrome, Edge, or Safari.');
      return;
    }

    try {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
      }

      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;

      // Required recognition settings
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = getRecognitionLang(fromLang);

      recognition.onstart = () => {
        setIsListening(true);
        onToast('Listening… speak into your microphone');
      };

      // Real-time live transcript streaming to the input field
      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = 0; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }

        const currentSpeech = (finalTranscript + ' ' + interimTranscript).trim();
        const prefix = baseTextRef.current ? baseTextRef.current.trim() + ' ' : '';
        onUpdateInput(prefix + currentSpeech);
      };

      // Graceful error recovery
      recognition.onerror = (e: any) => {
        setIsListening(false);
        // Silently handle harmless browser cancellations and silence timeouts
        if (e.error === 'no-speech' || e.error === 'aborted') {
          return;
        }
        if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
          onToast('Microphone access was denied. Please allow mic permission.');
        } else {
          onToast(`Microphone notice: ${e.error || 'interrupted'}`);
        }
      };

      // On end, cleanly reset listening state
      recognition.onend = () => {
        setIsListening(false);
        recognitionRef.current = null;
      };

      recognition.start();
    } catch {
      setIsListening(false);
      onToast('Unable to access microphone.');
    }
  };

  const handleVoiceToggle = () => {
    if (isListening) {
      stopVoiceInput();
      onToast('Voice input stopped.');
      return;
    }

    baseTextRef.current = inputText;
    startVoiceRecognition();
  };

  useEffect(() => {
    return () => {
      stopVoiceInput();
    };
  }, []);

  return (
    <button
      className="mini"
      id="mic"
      onClick={handleVoiceToggle}
      type="button"
      title="Voice Input"
    >
      {isListening ? '🔴 Stop' : '🎤 Speak'}
    </button>
  );
};
