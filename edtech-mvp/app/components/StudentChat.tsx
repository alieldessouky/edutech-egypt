import { useState, useEffect, useRef, useCallback } from 'react';
import { useVoiceInput } from '../hooks/useVoiceInput';
import { useCloudTTS } from '../hooks/useCloudTTS';

interface Message {
    id: string;
    role: 'user' | 'model';
    content: string;
    timestamp: number;
}

interface StudentChatProps {
    lessonId: string;
    studentId?: string; // Optional for now
}

export function StudentChat({ lessonId, studentId }: StudentChatProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isAiThinking, setIsAiThinking] = useState(false);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Voice Mode State
    const [isVoiceMode, setIsVoiceMode] = useState(false);

    // Refs for Voice Mode handling to avoid stale closures in callbacks
    const isVoiceModeRef = useRef(isVoiceMode);
    useEffect(() => {
        isVoiceModeRef.current = isVoiceMode;
    }, [isVoiceMode]);

    const handleSendRef = useRef<((text?: string) => Promise<void>) | null>(null);

    const onSpeechEnd = useCallback((finalTranscript: string) => {
        if (isVoiceModeRef.current && finalTranscript.trim()) {
            if (handleSendRef.current) {
                handleSendRef.current(finalTranscript);
            }
        }
    }, []);

    const {
        isListening,
        transcript,
        interimTranscript,
        startListening,
        stopListening,
        resetTranscript
    } = useVoiceInput({
        language: 'ar-EG',
        onEnd: onSpeechEnd
    });

    const onAudioEnded = useCallback(() => {
        if (isVoiceModeRef.current) {
            startListening(); // Re-activate mic after AI finishes speaking
        }
    }, [startListening]);

    const { speak, stop: stopAudio, isPlaying: isAudioPlaying, isLoading: isAudioLoading } = useCloudTTS({
        onEnded: onAudioEnded
    });

    // Make sure mic is turned off when AI starts speaking in Voice Mode
    useEffect(() => {
        if (isVoiceMode && isAudioPlaying && isListening) {
            stopListening();
        }
    }, [isVoiceMode, isAudioPlaying, isListening, stopListening]);


    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Scroll to bottom when messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, interimTranscript]);

    // Update input from voice transcript
    useEffect(() => {
        if (transcript) {
            setInput(transcript);
        }
    }, [transcript]);

    const handleSend = useCallback(async (textOverride?: string) => {
        const textToSend = (textOverride || input).trim();
        if (!textToSend) return;

        // Clear input related states immediately
        setInput('');
        resetTranscript();
        setError(null);

        // Add user message
        const userMsg: Message = {
            id: crypto.randomUUID(),
            role: 'user',
            content: textToSend,
            timestamp: Date.now()
        };
        setMessages(prev => [...prev, userMsg]);
        setIsAiThinking(true);

        try {
            const response = await fetch('/api/tutor-chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    lessonId,
                    studentId,
                    sessionId,
                    message: textToSend
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('API Error Response:', response.status, errorText);
                throw new Error(`API Error ${response.status}: ${errorText.slice(0, 100)}`);
            }

            const data = await response.json();

            if (data.sessionId) setSessionId(data.sessionId);

            const aiMsg: Message = {
                id: crypto.randomUUID(),
                role: 'model',
                content: data.response,
                timestamp: Date.now()
            };

            setMessages(prev => [...prev, aiMsg]);

            if (isVoiceModeRef.current || isAudioPlaying) {
                stopAudio(); // Stop any existing audio before starting new in case
                speak(data.response);
            }

        } catch (err: any) {
            console.error('Chat error:', err);
            setError(err.message || 'Failed to send message');
            // If error in voice mode, we might want to restart listening to allow retry
            if (isVoiceModeRef.current) {
                startListening();
            }
        } finally {
            setIsAiThinking(false);
        }
    }, [input, lessonId, studentId, sessionId, speak, stopAudio, resetTranscript, isAudioPlaying, startListening]);

    useEffect(() => {
        handleSendRef.current = handleSend;
    }, [handleSend]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const toggleVoiceMode = () => {
        const newMode = !isVoiceMode;
        setIsVoiceMode(newMode);
        if (newMode) {
            stopAudio(); // Stop any currently playing audio just in case
            startListening(); // Immediately start listening when turned on
        } else {
            stopListening();
        }
    };

    return (
        <div dir="rtl" style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            backgroundColor: '#fff',
            overflow: 'hidden'
        }}>
            {/* Header */}
            <div style={{
                padding: '16px',
                borderBottom: '1px solid #f0f0f0',
                backgroundColor: '#f8f9fa',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '20px' }}>🤖</span>
                    <div>
                        <h3 style={{ margin: 0, fontSize: '16px', color: '#333' }}>AI Tutor</h3>
                        <span style={{ fontSize: '12px', color: '#666' }}>Always here to help</span>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {isAudioPlaying && !isVoiceMode && (
                        <button
                            onClick={stopAudio}
                            style={{
                                background: 'none',
                                border: '1px solid #ddd',
                                borderRadius: '20px',
                                padding: '4px 12px',
                                cursor: 'pointer',
                                fontSize: '12px',
                                color: '#d32f2f'
                            }}
                        >
                            Stop Audio 🔇
                        </button>
                    )}

                    <button
                        onClick={toggleVoiceMode}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            background: isVoiceMode ? '#e8f5e9' : '#f5f5f5',
                            color: isVoiceMode ? '#2e7d32' : '#666',
                            border: `1px solid ${isVoiceMode ? '#c8e6c9' : '#e0e0e0'}`,
                            padding: '6px 12px',
                            borderRadius: '20px',
                            cursor: 'pointer',
                            fontSize: '13px',
                            fontWeight: 500,
                            transition: 'all 0.2s'
                        }}
                    >
                        <span style={{
                            display: 'inline-block',
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            backgroundColor: isVoiceMode ? '#4caf50' : '#ccc',
                            marginRight: '4px'
                        }} />
                        Voice Mode {isVoiceMode ? 'ON' : 'OFF'}
                    </button>
                </div>
            </div>

            {/* Messages Area */}
            <div style={{
                flex: 1,
                overflowY: 'auto',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                backgroundColor: '#fdfdfd'
            }}>
                {messages.length === 0 && (
                    <div style={{ textAlign: 'center', marginTop: '40px', color: '#888' }}>
                        <p>👋 Ask me anything about the lesson!</p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '16px' }}>
                            <button onClick={() => { setInput("Can you summarize this?"); }} style={suggestionStyle}>
                                "Can you summarize this?"
                            </button>
                            <button onClick={() => { setInput("What is the most important date here?"); }} style={suggestionStyle}>
                                "What is the most important date here?"
                            </button>
                        </div>
                    </div>
                )}

                {messages.map((msg) => (
                    <div key={msg.id} style={{
                        alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                        maxWidth: '80%',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start'
                    }}>
                        <div style={{
                            padding: '12px 16px',
                            borderRadius: '18px',
                            backgroundColor: msg.role === 'user' ? '#0070f3' : '#f0f0f0',
                            color: msg.role === 'user' ? '#fff' : '#333',
                            borderBottomRightRadius: msg.role === 'user' ? '4px' : '18px',
                            borderBottomLeftRadius: msg.role === 'model' ? '4px' : '18px',
                            fontSize: '15px',
                            lineHeight: '1.5',
                            direction: 'rtl', // Ensure Arabic text direction
                            textAlign: 'right'
                        }}>
                            {msg.content}
                        </div>
                        {msg.role === 'model' && !isVoiceMode && (
                            <button
                                onClick={() => speak(msg.content)}
                                disabled={isAudioLoading}
                                style={{
                                    border: 'none',
                                    background: 'none',
                                    cursor: 'pointer',
                                    fontSize: '16px',
                                    opacity: 0.7,
                                    marginTop: '4px',
                                    padding: '4px'
                                }}
                                title="Listen"
                            >
                                🔊
                            </button>
                        )}
                    </div>
                ))}

                {isAiThinking && (
                    <div style={{ alignSelf: 'flex-start', color: '#888', fontSize: '13px', marginLeft: '10px' }}>
                        Thinking...
                    </div>
                )}
                {isVoiceMode && isAudioPlaying && (
                    <div style={{ alignSelf: 'flex-start', color: '#888', fontSize: '13px', marginLeft: '10px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ fontSize: '16px' }}>🔊</span> AI Speaking...
                    </div>
                )}
                {isVoiceMode && isListening && !isAiThinking && !isAudioPlaying && (
                    <div style={{ alignSelf: 'center', color: '#2e7d32', fontSize: '13px', marginTop: '8px', opacity: 0.8 }}>
                        🎙️ Listening...
                    </div>
                )}


                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div style={{
                padding: '16px',
                borderTop: '1px solid #f0f0f0',
                backgroundColor: '#fff',
                display: 'flex',
                gap: '10px',
                alignItems: 'flex-end',
                opacity: (isVoiceMode && isAudioPlaying) ? 0.6 : 1, // Dim when AI is speaking
                pointerEvents: (isVoiceMode && isAudioPlaying) ? 'none' : 'auto' // Prevent input when AI is speaking
            }}>
                <button
                    onClick={() => {
                        if (isVoiceMode) {
                            setIsVoiceMode(false); // Turn off voice mode if they explicitly stop listening
                        }
                        isListening ? stopListening() : startListening()
                    }}
                    style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        border: 'none',
                        backgroundColor: isListening ? '#d32f2f' : '#f0f0f0',
                        color: isListening ? '#fff' : '#555',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '20px',
                        transition: 'all 0.2s',
                        boxShadow: isListening ? '0 0 0 4px rgba(211, 47, 47, 0.2)' : 'none'
                    }}
                    title={isListening ? "Stop Listening" : "Start Voice Input"}
                >
                    {isListening ? '🛑' : '🎤'}
                </button>

                <div style={{ flex: 1, position: 'relative' }}>
                    <textarea
                        value={isListening ? (transcript + (interimTranscript ? ' ' + interimTranscript : '')) : input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={
                            isVoiceMode
                                ? (isAudioPlaying ? "AI is speaking..." : "Speak now. Auto-sends when you pause.")
                                : "Type your question..."
                        }
                        dir="auto"
                        disabled={isVoiceMode && isAudioPlaying}
                        style={{
                            width: '100%',
                            padding: '12px',
                            borderRadius: '20px',
                            border: '1px solid #ddd',
                            resize: 'none',
                            height: '46px', // One line roughly
                            minHeight: '46px',
                            maxHeight: '120px',
                            outline: 'none',
                            fontFamily: 'inherit',
                            fontSize: '15px',
                            backgroundColor: (isVoiceMode && isAudioPlaying) ? '#f5f5f5' : '#fff'
                        }}
                    />
                </div>

                <button
                    onClick={() => handleSend()}
                    disabled={(!input.trim() && !transcript) || (isVoiceMode && isAudioPlaying)}
                    style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        border: 'none',
                        backgroundColor: '#0070f3',
                        color: '#fff',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '18px',
                        opacity: (!input.trim() && !transcript) ? 0.5 : 1
                    }}
                >
                    ➤
                </button>
            </div>
            {error && (
                <div style={{ padding: '8px 16px', backgroundColor: '#ffebee', color: '#c62828', fontSize: '12px', textAlign: 'center' }}>
                    {error}
                </div>
            )}
        </div>
    );
}

const suggestionStyle = {
    background: '#fff',
    border: '1px solid #ddd',
    borderRadius: '16px',
    padding: '8px 16px',
    cursor: 'pointer',
    fontSize: '13px',
    color: '#555',
    transition: 'background 0.2s',
    textAlign: 'left' as const
};

