'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/lib/useTranslation';
import { useFeedback } from '@/components/ui/FeedbackSystem';
import { MicrophoneIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface VoiceCommand {
  phrases: string[];
  action: () => void;
  description: string;
}

// Types are defined in types/speech-recognition.d.ts

export function VoiceCommands({ enabled = false }: { enabled?: boolean }) {
  const { t } = useTranslation('accessibility');
  const router = useRouter();
  const { info, success, error } = useFeedback();
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isSupported, setIsSupported] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  // Define voice commands
  const commands: VoiceCommand[] = [
    {
      phrases: ['go to dashboard', 'show dashboard', 'home', 'go home'],
      action: () => {
        router.push('/dashboard');
        success('Navigating to dashboard');
      },
      description: 'Navigate to dashboard',
    },
    {
      phrases: ['go to budget', 'show budget', 'budget'],
      action: () => {
        router.push('/budget');
        success('Navigating to budget');
      },
      description: 'Navigate to budget',
    },
    {
      phrases: ['go to goals', 'show goals', 'goals', 'savings goals'],
      action: () => {
        router.push('/goals');
        success('Navigating to goals');
      },
      description: 'Navigate to goals',
    },
    {
      phrases: ['go to transactions', 'show transactions', 'transactions'],
      action: () => {
        router.push('/transactions');
        success('Navigating to transactions');
      },
      description: 'Navigate to transactions',
    },
    {
      phrases: ['save money', 'quick save', 'save'],
      action: () => {
        const saveButton = document.querySelector('[data-tour="quick-save"] button[type="submit"]') as HTMLButtonElement;
        if (saveButton) {
          saveButton.click();
          success('Opening quick save');
        }
      },
      description: 'Open quick save',
    },
    {
      phrases: ['help', 'show help', 'what can you do'],
      action: () => {
        info('Available commands: ' + commands.map(c => c.phrases[0]).join(', '));
      },
      description: 'Show available commands',
    },
    {
      phrases: ['stop listening', 'stop', 'cancel'],
      action: () => {
        stopListening();
      },
      description: 'Stop voice recognition',
    },
  ];

  // Initialize speech recognition
  useEffect(() => {
    if (!enabled) return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      setIsSupported(true);
      const recognition = new SpeechRecognition();
      
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      
      recognition.onstart = () => {
        setIsListening(true);
        info('Voice commands activated. Say "help" for available commands.');
      };
      
      recognition.onresult = (event: SpeechRecognitionEvent) => {
        const current = event.resultIndex;
        const transcript = event.results[current][0].transcript.toLowerCase();
        setTranscript(transcript);
        
        if (event.results[current].isFinal) {
          processCommand(transcript);
        }
      };
      
      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('Speech recognition error:', event.error);
        error('Voice recognition error: ' + event.error);
        setIsListening(false);
      };
      
      recognition.onend = () => {
        setIsListening(false);
        setTranscript('');
      };
      
      recognitionRef.current = recognition;
    }
    
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [enabled]);

  const processCommand = useCallback((transcript: string) => {
    const normalizedTranscript = transcript.toLowerCase().trim();
    
    for (const command of commands) {
      for (const phrase of command.phrases) {
        if (normalizedTranscript.includes(phrase)) {
          command.action();
          return;
        }
      }
    }
    
    // No matching command found
    error(`Command not recognized: "${transcript}". Say "help" for available commands.`);
  }, [commands]);

  const startListening = useCallback(() => {
    if (recognitionRef.current && !isListening) {
      try {
        recognitionRef.current.start();
      } catch (e) {
        console.error('Failed to start recognition:', e);
        error('Failed to start voice recognition');
      }
    }
  }, [isListening]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      success('Voice commands deactivated');
    }
  }, [isListening]);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  if (!enabled || !isSupported) return null;

  return (
    <>
      {/* Voice command button */}
      <button
        onClick={toggleListening}
        className={`fixed bottom-4 left-4 p-3 rounded-full shadow-lg transition-all duration-200 z-[9000] ${
          isListening 
            ? 'bg-accent-expense-red text-white scale-110' 
            : 'bg-primary-trust-blue text-white hover:scale-105'
        }`}
        aria-label={isListening ? 'Stop voice commands' : 'Start voice commands'}
      >
        {isListening ? (
          <XMarkIcon className="h-6 w-6" />
        ) : (
          <MicrophoneIcon className="h-6 w-6" />
        )}
      </button>

      {/* Listening indicator */}
      {isListening && (
        <div className="fixed bottom-20 left-4 bg-white rounded-lg shadow-lg p-4 max-w-xs z-[9000]">
          <div className="flex items-center mb-2">
            <div className="animate-pulse h-3 w-3 bg-accent-expense-red rounded-full mr-2" />
            <span className="text-sm font-medium">
              {t('voice.listening', { defaultValue: 'Listening...' })}
            </span>
          </div>
          {transcript && (
            <p className="text-sm text-neutral-gray">
              {t('voice.heard', { defaultValue: 'Heard:' })} "{transcript}"
            </p>
          )}
          <button
            onClick={stopListening}
            className="text-xs text-primary-trust-blue underline mt-2"
          >
            {t('voice.stop', { defaultValue: 'Stop listening' })}
          </button>
        </div>
      )}

      {/* Help tooltip on first use */}
      {!isListening && (
        <div
          className="fixed bottom-20 left-4 bg-neutral-dark-gray text-white text-xs rounded-lg px-3 py-2 max-w-xs z-[8999] pointer-events-none opacity-0 hover:opacity-100 transition-opacity duration-200"
          style={{ pointerEvents: 'none' }}
        >
          {t('voice.tooltip', { defaultValue: 'Click to activate voice commands' })}
        </div>
      )}
    </>
  );
}

// Hook for programmatic voice synthesis
export function useVoiceSynthesis() {
  const [isSupported, setIsSupported] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    if ('speechSynthesis' in window) {
      setIsSupported(true);
      
      const loadVoices = () => {
        const availableVoices = window.speechSynthesis.getVoices();
        setVoices(availableVoices);
      };
      
      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  const speak = useCallback((text: string, options?: {
    voice?: string;
    rate?: number;
    pitch?: number;
    volume?: number;
  }) => {
    if (!isSupported) return;

    const utterance = new SpeechSynthesisUtterance(text);
    
    if (options?.voice) {
      const selectedVoice = voices.find(v => v.name === options.voice);
      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }
    }
    
    utterance.rate = options?.rate || 1;
    utterance.pitch = options?.pitch || 1;
    utterance.volume = options?.volume || 1;
    
    window.speechSynthesis.speak(utterance);
  }, [isSupported, voices]);

  const stop = useCallback(() => {
    if (isSupported) {
      window.speechSynthesis.cancel();
    }
  }, [isSupported]);

  return {
    isSupported,
    voices,
    speak,
    stop,
  };
}