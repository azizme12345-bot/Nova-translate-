import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Volume2, AlertCircle } from 'lucide-react';

interface VoiceSectionProps {
  onTranscriptChange: (text: string) => void;
  selectedLanguage: string;
  translatedText?: string;
}

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export const VoiceSection: React.FC<VoiceSectionProps> = ({
  onTranscriptChange,
  selectedLanguage,
  translatedText,
}) => {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setError('آپ کے براؤزر میں آواز ریکارڈنگ سپورٹڈ نہیں ہے۔');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = selectedLanguage === 'en' ? 'en-US' : 'ur-PK';

    recognition.onresult = (event: any) => {
      let currentTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        currentTranscript += event.results[i][0].transcript;
      }
      if (currentTranscript.trim()) {
        onTranscriptChange(currentTranscript);
      }
    };

    recognition.onerror = (event: any) => {
      if (event.error !== 'no-speech') {
        setError(`مائیک ایرر: ${event.error}`);
        setIsListening(false);
      }
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
  }, [selectedLanguage, onTranscriptChange]);

  const toggleListening = () => {
    setError(null);
    if (!recognitionRef.current) return;

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        setIsListening(false);
      }
    }
  };

  const speakText = () => {
    if (!translatedText) return;
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(translatedText);
      utterance.lang = selectedLanguage === 'ur' ? 'ur-PK' : 'en-US';
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
    } else {
      setError('آپ کے براؤزر میں آواز بولنے (Text-to-Speech) کی سہولت نہیں ہے۔');
    }
  };

  return (
    <div className="p-4 bg-white rounded-xl shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-800 flex items-center gap-2">
          <Volume2 className="w-5 h-5 text-emerald-600" />
          Voice & Audio
        </h3>
        {isListening && (
          <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 animate-pulse">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            Listening...
          </span>
        )}
      </div>

      <div className="flex gap-2">
        <button
          onClick={toggleListening}
          className={`flex-1 py-3 px-4 rounded-lg font-medium flex items-center justify-center gap-2 transition-all ${
            isListening
              ? 'bg-red-500 hover:bg-red-600 text-white shadow-md'
              : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow'
          }`}
        >
          {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          {isListening ? 'Stop Mic' : 'Start Mic'}
        </button>

        {translatedText && (
          <button
            onClick={speakText}
            className={`py-3 px-4 rounded-lg font-medium flex items-center justify-center gap-2 border transition-all ${
              isSpeaking
                ? 'bg-emerald-100 text-emerald-700 border-emerald-300'
                : 'bg-gray-50 hover:bg-gray-100 text-gray-700 border-gray-200'
            }`}
            title="Listen Translation"
          >
            <Volume2 className="w-5 h-5" />
            {isSpeaking ? 'Speaking...' : 'Listen'}
          </button>
        )}
      </div>

      {error && (
        <div className="mt-3 p-2.5 bg-red-50 text-red-600 rounded-lg text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};
