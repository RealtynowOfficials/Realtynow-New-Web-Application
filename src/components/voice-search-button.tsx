import React, { useState, useEffect } from 'react';
import { Mic, MicOff } from 'lucide-react';
import { useLanguageContext } from '../lib/i18n/language-context';

interface VoiceSearchButtonProps {
  onResult: (transcript: string) => void;
  className?: string;
  placeholder?: string;
}

export const VoiceSearchButton: React.FC<VoiceSearchButtonProps> = ({ onResult, className = '' }) => {
  const { currentLanguage } = useLanguageContext();
  const [isListening, setIsListening] = useState<boolean>(false);
  const [supported, setSupported] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
      setSupported(true);
    }
  }, []);

  const handleToggleListen = () => {
    if (!supported) {
      alert('Voice search is not supported in this browser. Please try Chrome, Edge, or Safari.');
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    try {
      const SpeechRecognition =
        (window as unknown as { SpeechRecognition?: new () => SpeechRecognitionInstance }).SpeechRecognition ||
        (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognitionInstance })
          .webkitSpeechRecognition;

      if (!SpeechRecognition) return;

      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = currentLanguage.bcp47 || 'en-IN';

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          onResult(transcript);
        }
        setIsListening(false);
      };

      recognition.onerror = (event: Event) => {
        console.error('Voice speech recognition error:', event);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch (err) {
      console.error('Failed to start voice recognition:', err);
      setIsListening(false);
    }
  };

  return supported ? (
    <button
      type="button"
      onClick={handleToggleListen}
      className={`p-2 rounded-xl transition-all flex items-center justify-center ${
        isListening
          ? 'bg-red-600 text-white animate-pulse shadow-lg shadow-red-600/40 scale-105'
          : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/60'
      } ${className}`}
      title={isListening ? 'Listening... Speak now' : 'Voice Search'}
      aria-label="Voice Search"
    >
      {isListening ? (
        <MicOff className="w-4 h-4 text-white" />
      ) : (
        <Mic className="w-4 h-4 text-red-400 hover:text-red-300" />
      )}
    </button>
  ) : null;
};

// Global Ambient Declarations for SpeechRecognition
interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: () => void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: Event) => void;
  onend: () => void;
  start: () => void;
  stop: () => void;
}

interface SpeechRecognitionEvent {
  results: {
    [index: number]: {
      [index: number]: {
        transcript: string;
      };
    };
  };
}
