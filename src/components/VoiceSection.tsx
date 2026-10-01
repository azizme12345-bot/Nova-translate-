import React, { useState, useRef, useEffect } from 'react';

export interface VoiceSectionProps {
  fromLang?: string;
  inputText?: string;
  setInputText: (text: string) => void;
  onUpdateInput?: (text: string) => void;
  onToast?: (msg: string) => void;
}

/**
 * VoiceSection: Speech Recognition with direct setInputText transcript binding
 */
export const VoiceSection: React.FC<VoiceSectionProps> = ({
  fromLang = 'ur-PK',
  inputText = '',
  setInputText,
  onUpdateInput,
  onToast,
}) => {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

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

  const startVoiceRecognition = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'ur-PK'; // Set Urdu language code

      recognition.onstart = () => {
        setIsListening(true);
        if (onToast) onToast('Listening… speak into your microphone');
      };

      recognition.onresult = (event: any) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }
        if (currentTranscript.trim()) {
          setInputText(currentTranscript); // Directly bind live speech to main text box
          if (onUpdateInput) {
            onUpdateInput(currentTranscript);
          }
        }
      };

      recognition.onerror = (event: any) => {
        console.error('Speech error:', event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } else {
      if (onToast) {
        onToast('Voice input is not supported in this browser. Please use Chrome, Edge, or Safari.');
      }
    }
  };

  const handleVoiceToggle = () => {
    if (isListening) {
      stopVoiceInput();
      if (onToast) onToast('Voice input stopped.');
      return;
    }

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
      style={{
        background: isListening ? '#ef4444' : undefined,
        color: isListening ? '#ffffff' : undefined,
        fontWeight: isListening ? 'bold' : 'normal',
      }}
    >
      {isListening ? '🔴 Stop' : '🎤 Speak'}
    </button>
  );
};
