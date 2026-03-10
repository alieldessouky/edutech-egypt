import { useState, useEffect, useCallback, useRef } from 'react';

interface UseVoiceInputOptions {
    language?: string;
    onEnd?: (transcript: string) => void;
}

interface UseVoiceInputReturn {
    isListening: boolean;
    transcript: string;
    interimTranscript: string;
    startListening: () => void;
    stopListening: () => void;
    resetTranscript: () => void;
    error: string | null;
    isSupported: boolean;
}

export function useVoiceInput({ language = 'ar-EG', onEnd }: UseVoiceInputOptions = {}): UseVoiceInputReturn {
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [interimTranscript, setInterimTranscript] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isSupported, setIsSupported] = useState(false);

    const recognitionRef = useRef<any>(null);
    const onEndRef = useRef(onEnd);
    const transcriptRef = useRef('');

    // Update refs to avoid closure stale state
    useEffect(() => {
        onEndRef.current = onEnd;
    }, [onEnd]);

    useEffect(() => {
        transcriptRef.current = transcript;
    }, [transcript]);

    useEffect(() => {
        if (typeof window !== 'undefined' && (window.webkitSpeechRecognition || window.SpeechRecognition)) {
            setIsSupported(true);
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.continuous = true;
            recognitionRef.current.interimResults = true;
            recognitionRef.current.lang = language;

            recognitionRef.current.onstart = () => {
                setIsListening(true);
                setError(null);
            };

            recognitionRef.current.onend = () => {
                setIsListening(false);
                if (onEndRef.current && transcriptRef.current) {
                    onEndRef.current(transcriptRef.current);
                }
            };

            recognitionRef.current.onerror = (event: any) => {
                console.error('Speech recognition error', event.error);
                setError(event.error);
                setIsListening(false);
            };

            recognitionRef.current.onresult = (event: any) => {
                let finalTrans = '';
                let interimTrans = '';

                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) {
                        finalTrans += event.results[i][0].transcript;
                    } else {
                        interimTrans += event.results[i][0].transcript;
                    }
                }

                if (finalTrans) {
                    setTranscript((prev) => prev ? `${prev} ${finalTrans}` : finalTrans);
                }
                setInterimTranscript(interimTrans);
            };
        }
    }, [language]);

    const startListening = useCallback(() => {
        if (recognitionRef.current && !isListening) {
            try {
                recognitionRef.current.start();
            } catch (e) {
                console.error('Failed to start recognition:', e);
            }
        }
    }, [isListening]);

    const stopListening = useCallback(() => {
        if (recognitionRef.current && isListening) {
            recognitionRef.current.stop();
        }
    }, [isListening]);

    const resetTranscript = useCallback(() => {
        setTranscript('');
        setInterimTranscript('');
        transcriptRef.current = '';
    }, []);

    return {
        isListening,
        transcript,
        interimTranscript,
        startListening,
        stopListening,
        resetTranscript,
        error,
        isSupported
    };
}
