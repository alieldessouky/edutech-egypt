import { useState, useCallback, useRef, useEffect } from 'react';

interface UseCloudTTSOptions {
    onEnded?: () => void;
}

interface UseCloudTTSReturn {
    speak: (text: string) => Promise<void>;
    stop: () => void;
    isPlaying: boolean;
    isLoading: boolean;
    error: string | null;
}

export function useCloudTTS({ onEnded }: UseCloudTTSOptions = {}): UseCloudTTSReturn {
    const [isPlaying, setIsPlaying] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const onEndedRef = useRef(onEnded);

    useEffect(() => {
        onEndedRef.current = onEnded;
    }, [onEnded]);

    useEffect(() => {
        // Initialize audio element
        audioRef.current = new Audio();

        const handleEnded = () => {
            setIsPlaying(false);
            if (onEndedRef.current) {
                onEndedRef.current();
            }
        };
        const handleError = () => {
            setIsPlaying(false);
            setError('Audio playback error');
            if (onEndedRef.current) {
                onEndedRef.current(); // Also trigger onEnd on error to prevent hanging
            }
        };

        audioRef.current.addEventListener('ended', handleEnded);
        audioRef.current.addEventListener('error', handleError);

        return () => {
            if (audioRef.current) {
                audioRef.current.removeEventListener('ended', handleEnded);
                audioRef.current.removeEventListener('error', handleError);
                audioRef.current.pause();
                audioRef.current = null;
            }
        };
    }, []);

    const stop = useCallback(() => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
        }
        setIsPlaying(false);
    }, []);

    const speak = useCallback(async (text: string) => {
        if (!text) return;

        try {
            stop(); // Stop any current playback
            setIsLoading(true);
            setError(null);

            const response = await fetch('/api/text-to-speech', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to generate speech');
            }

            const data = await response.json();

            if (data.audioContent && audioRef.current) {
                const audioBlob = await (await fetch(`data:audio/mp3;base64,${data.audioContent}`)).blob();
                const audioUrl = URL.createObjectURL(audioBlob);

                audioRef.current.src = audioUrl;
                await audioRef.current.play();
                setIsPlaying(true);
            }

        } catch (err: any) {
            console.error('TTS Error:', err);
            setError(err.message);
            if (onEndedRef.current) {
                onEndedRef.current(); // Keep loop moving on error
            }
        } finally {
            setIsLoading(false);
        }
    }, [stop]);

    return {
        speak,
        stop,
        isPlaying,
        isLoading,
        error
    };
}
