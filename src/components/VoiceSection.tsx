import React, { useState, useRef, useEffect } from 'react';

export interface VoiceSectionProps {
  fromLang: string;
  inputText: string;
  onUpdateInput: (text: string) => void;
  onToast: (msg: string) => void;
}

/**
 * VoiceSection / Speech recognition module using webkitSpeechRecognition
 * Streams live transcripts directly into the input area without interrupting
 * the session during minor network pauses.
 */
export const VoiceSection: React.FC<VoiceSectionProps> = ({
  fromLang,
  inputText,
  onUpdateInput,
  onToast,
}) => {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const shouldListenRef = useRef<boolean>(false);
  const baseTextRef = useRef<string>('');

  const stopVoiceInput = () => {
    shouldListenRef.current = false;
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

  const startVoiceRecognition = () => {
    const SpeechRecognition =
      (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;

    if (!SpeechRecognition) {
      onToast('Voice input requires Google Chrome, Edge or Safari.');
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
      recognition.continuous = true;
      recognition.interimResults = true;

      const lower = fromLang.toLowerCase();
      if (lower.includes('urdu')) recognition.lang = 'ur-PK';
      else if (lower.includes('arabic')) recognition.lang = 'ar-SA';
      else if (lower.includes('punjabi')) recognition.lang = 'pa-IN';
      else if (lower.includes('hindi')) recognition.lang = 'hi-IN';
      else if (lower.includes('spanish')) recognition.lang = 'es-ES';
      else if (lower.includes('french')) recognition.lang = 'fr-FR';
      else if (lower.includes('german')) recognition.lang = 'de-DE';
      else if (lower.includes('japanese')) recognition.lang = 'ja-JP';
      else if (lower.includes('chinese')) recognition.lang = 'zh-CN';
      else recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        onToast('Listening… speak into your microphone');
      };

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

        const recognizedText = (finalTranscript + ' ' + interimTranscript).trim();
        const prefix = baseTextRef.current ? baseTextRef.current.trim() + ' ' : '';
        onUpdateInput(prefix + recognizedText);
      };

      recognition.onerror = (e: any) => {
        if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
          shouldListenRef.current = false;
          setIsListening(false);
          onToast('Microphone permission was denied.');
          return;
        }

        // On minor network pauses, no-speech, or transient interruptions, automatically recover
        if (shouldListenRef.current) {
          setTimeout(() => {
            if (shouldListenRef.current) {
              try {
                recognition.start();
              } catch {
                // ignore
              }
            }
          }, 300);
        }
      };

      recognition.onend = () => {
        // Auto-restart if voice listening is still actively requested
        if (shouldListenRef.current) {
          setTimeout(() => {
            if (shouldListenRef.current) {
              try {
                recognition.start();
              } catch {
                // ignore
              }
            }
          }, 200);
        } else {
          setIsListening(false);
          recognitionRef.current = null;
        }
      };

      recognition.start();
    } catch {
      shouldListenRef.current = false;
      setIsListening(false);
      onToast('Unable to start microphone.');
    }
  };

  const handleVoiceToggle = () => {
    if (isListening || shouldListenRef.current) {
      stopVoiceInput();
      onToast('Voice input stopped.');
      return;
    }

    baseTextRef.current = inputText;
    shouldListenRef.current = true;
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
