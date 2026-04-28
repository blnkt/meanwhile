import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import { useCallback, useMemo, useState } from 'react';

type DictationStatus = 'idle' | 'listening' | 'processing' | 'error';

type UseDictationOptions = {
  onTranscript: (text: string) => void;
};

export function useDictation({ onTranscript }: UseDictationOptions) {
  const [status, setStatus] = useState<DictationStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useSpeechRecognitionEvent('start', () => {
    setErrorMessage(null);
    setStatus('listening');
  });

  useSpeechRecognitionEvent('result', (event) => {
    const transcript = event.results.map(result => result.transcript).join(' ').trim();
    if (transcript) {
      onTranscript(transcript);
    }
    setStatus('processing');
  });

  useSpeechRecognitionEvent('end', () => {
    setStatus('idle');
  });

  useSpeechRecognitionEvent('error', (event) => {
    setErrorMessage(event.error);
    setStatus('error');
  });

  const startDictation = useCallback(async () => {
    try {
      const permission = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!permission.granted) {
        setStatus('error');
        setErrorMessage('Microphone or speech permission denied.');
        return;
      }
      setErrorMessage(null);
      ExpoSpeechRecognitionModule.start({
        lang: 'en-US',
        interimResults: true,
        maxAlternatives: 1,
      });
    }
    catch (error) {
      setStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Failed to start dictation.');
    }
  }, []);

  const stopDictation = useCallback(() => {
    ExpoSpeechRecognitionModule.stop();
    setStatus('processing');
  }, []);

  const isListening = status === 'listening';
  return useMemo(
    () => ({
      status,
      isListening,
      errorMessage,
      startDictation,
      stopDictation,
    }),
    [errorMessage, isListening, startDictation, status, stopDictation],
  );
}
