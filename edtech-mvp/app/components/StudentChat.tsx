import { useState, useEffect, useRef, useCallback } from 'react';
import { useVoiceInput } from '../hooks/useVoiceInput';
import { useCloudTTS } from '../hooks/useCloudTTS';

interface Message {
    id: string;
    role: 'user' | 'model';
    content: string;
    timestamp: number;
    contextQuote?: string; // Optional quoted passage from lesson
}

interface StudentChatProps {
    lessonId: string;
    studentId?: string;
    pendingContext?: { text: string; action: 'ask' | 'explain' | 'test' } | null;
    onContextConsumed?: () => void;
}

export function StudentChat({ lessonId, studentId, pendingContext, onContextConsumed }: StudentChatProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isAiThinking, setIsAiThinking] = useState(false);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Voice Mode State
    const [isVoiceMode, setIsVoiceMode] = useState(false);
    const isVoiceModeRef = useRef(isVoiceMode);
    useEffect(() => { isVoiceModeRef.current = isVoiceMode; }, [isVoiceMode]);

    const handleSendRef = useRef<((text?: string, contextQuote?: string) => Promise<void>) | null>(null);

    const onSpeechEnd = useCallback((finalTranscript: string) => {
        if (isVoiceModeRef.current && finalTranscript.trim()) {
            if (handleSendRef.current) {
                handleSendRef.current(finalTranscript);
            }
        }
    }, []);

    const { isListening, transcript, interimTranscript, startListening, stopListening, resetTranscript } = useVoiceInput({
        language: 'ar-EG',
        onEnd: onSpeechEnd
    });

    const onAudioEnded = useCallback(() => {
        if (isVoiceModeRef.current) startListening();
    }, [startListening]);

    const { speak, stop: stopAudio, isPlaying: isAudioPlaying, isLoading: isAudioLoading } = useCloudTTS({ onEnded: onAudioEnded });

    useEffect(() => {
        if (isVoiceMode && isAudioPlaying && isListening) stopListening();
    }, [isVoiceMode, isAudioPlaying, isListening, stopListening]);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, interimTranscript]);

    useEffect(() => {
        if (transcript) setInput(transcript);
    }, [transcript]);

    // Handle incoming pendingContext from parent (text highlight actions)
    useEffect(() => {
        if (!pendingContext) return;

        const { text, action } = pendingContext;

        if (action === 'ask') {
            // Pre-fill input with a context prefix — student types their specific question
            setInput(`بخصوص هذا الجزء: «${text}» — `);
            onContextConsumed?.();
        } else if (action === 'explain') {
            handleSendRef.current?.(`اشرح لي هذا الجزء بأسلوب بسيط: «${text}»`, text);
            onContextConsumed?.();
        } else if (action === 'test') {
            handleSendRef.current?.(`اختبرني على هذا الجزء من الدرس: «${text}»`, text);
            onContextConsumed?.();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pendingContext]);

    const handleSend = useCallback(async (textOverride?: string, contextQuote?: string) => {
        const textToSend = (textOverride || input).trim();
        if (!textToSend) return;

        setInput('');
        resetTranscript();
        setError(null);

        // Extract inline quote if present and no explicit contextQuote passed
        let quote = contextQuote;
        if (!quote) {
            const match = textToSend.match(/«(.+?)»/s);
            if (match) quote = match[1];
        }

        const userMsg: Message = {
            id: crypto.randomUUID(),
            role: 'user',
            content: textToSend,
            timestamp: Date.now(),
            contextQuote: quote
        };
        setMessages(prev => [...prev, userMsg]);
        setIsAiThinking(true);

        try {
            const response = await fetch('/api/tutor-chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ lessonId, studentId, sessionId, message: textToSend })
            });

            if (!response.ok) {
                const errorText = await response.text();
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
                stopAudio();
                speak(data.response);
            }
        } catch (err: any) {
            setError(err.message || 'Failed to send message');
            if (isVoiceModeRef.current) startListening();
        } finally {
            setIsAiThinking(false);
        }
    }, [input, lessonId, studentId, sessionId, speak, stopAudio, resetTranscript, isAudioPlaying, startListening]);

    useEffect(() => { handleSendRef.current = handleSend; }, [handleSend]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const toggleVoiceMode = () => {
        const newMode = !isVoiceMode;
        setIsVoiceMode(newMode);
        if (newMode) { stopAudio(); startListening(); }
        else stopListening();
    };

    const inputRef = useRef<HTMLTextAreaElement>(null);

    // Focus the input when a pending 'ask' context arrives
    useEffect(() => {
        if (pendingContext?.action === 'ask') {
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [pendingContext]);

    return (
        <div dir="rtl" style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: '#fff', overflow: 'hidden' }}>
            {/* Header */}
            <div style={{
                padding: '14px 18px',
                borderBottom: '1px solid #f0f0f0',
                backgroundColor: '#fafafa',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexShrink: 0
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                        width: 38, height: 38, borderRadius: '50%',
                        background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '18px', flexShrink: 0
                    }}>🤖</div>
                    <div>
                        <div style={{ fontWeight: 700, fontSize: '15px', color: '#1e293b' }}>المساعد الذكي</div>
                        <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                            {isAiThinking ? 'يفكر...' : isListening ? '🎙 يستمع...' : 'جاهز للمساعدة'}
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {isAudioPlaying && !isVoiceMode && (
                        <button onClick={stopAudio} style={{
                            background: '#fef2f2', border: '1px solid #fecaca',
                            borderRadius: '20px', padding: '5px 10px', cursor: 'pointer',
                            fontSize: '12px', color: '#dc2626', fontWeight: 600
                        }}>
                            إيقاف 🔇
                        </button>
                    )}
                    <button onClick={toggleVoiceMode} style={{
                        display: 'flex', alignItems: 'center', gap: '6px',
                        background: isVoiceMode ? '#f0fdf4' : '#f8fafc',
                        color: isVoiceMode ? '#16a34a' : '#64748b',
                        border: `1px solid ${isVoiceMode ? '#bbf7d0' : '#e2e8f0'}`,
                        padding: '6px 12px', borderRadius: '20px', cursor: 'pointer',
                        fontSize: '13px', fontWeight: 600, transition: 'all 0.2s'
                    }}>
                        <span style={{
                            display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%',
                            backgroundColor: isVoiceMode ? '#22c55e' : '#cbd5e1',
                            animation: isVoiceMode && isListening ? 'pulse 1s infinite' : 'none'
                        }} />
                        {isVoiceMode ? 'صوتي ✓' : 'وضع صوتي'}
                    </button>
                </div>
            </div>

            {/* Messages Area */}
            <div style={{
                flex: 1, overflowY: 'auto', padding: '16px',
                display: 'flex', flexDirection: 'column', gap: '12px',
                backgroundColor: '#fdfdfd'
            }}>
                {messages.length === 0 && (
                    <div style={{ textAlign: 'center', marginTop: '32px', color: '#94a3b8', padding: '0 16px' }}>
                        <div style={{ fontSize: '40px', marginBottom: '12px' }}>✨</div>
                        <p style={{ fontWeight: 600, color: '#64748b', marginBottom: '16px', fontSize: '15px' }}>
                            حدد أي نص في الدرس للحصول على مساعدة فورية، أو اكتب سؤالك هنا
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <button onClick={() => setInput('هل يمكنك تلخيص هذا الدرس؟')} style={suggestionStyle}>
                                📋 لخّص لي الدرس
                            </button>
                            <button onClick={() => setInput('ما أهم الأحداث في هذا الدرس؟')} style={suggestionStyle}>
                                📌 ما أهم النقاط؟
                            </button>
                            <button onClick={() => setInput('اختبرني على هذا الدرس')} style={suggestionStyle}>
                                🎯 اختبرني
                            </button>
                        </div>
                    </div>
                )}

                {messages.map((msg) => (
                    <div key={msg.id} style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: msg.role === 'user' ? 'flex-start' : 'flex-end'
                    }}>
                        {/* Context quote block for user messages */}
                        {msg.role === 'user' && msg.contextQuote && (
                            <div style={{
                                maxWidth: '82%',
                                marginBottom: '4px',
                                padding: '8px 12px',
                                borderRadius: '10px',
                                borderRight: '3px solid #3b82f6',
                                backgroundColor: '#eff6ff',
                                color: '#1e40af',
                                fontSize: '13px',
                                lineHeight: '1.6',
                                textAlign: 'right',
                                direction: 'rtl',
                                fontStyle: 'italic'
                            }}>
                                «{msg.contextQuote.length > 120 ? msg.contextQuote.slice(0, 120) + '...' : msg.contextQuote}»
                            </div>
                        )}

                        <div style={{ maxWidth: '82%', display: 'flex', flexDirection: 'column', alignItems: msg.role === 'user' ? 'flex-start' : 'flex-end' }}>
                            <div style={{
                                padding: '11px 15px',
                                borderRadius: '18px',
                                backgroundColor: msg.role === 'user' ? '#3b82f6' : '#f1f5f9',
                                color: msg.role === 'user' ? '#fff' : '#1e293b',
                                borderBottomLeftRadius: msg.role === 'user' ? '4px' : '18px',
                                borderBottomRightRadius: msg.role === 'model' ? '4px' : '18px',
                                fontSize: '15px',
                                lineHeight: '1.6',
                                direction: 'rtl',
                                textAlign: 'right',
                                wordBreak: 'break-word'
                            }}>
                                {msg.content}
                            </div>
                            {msg.role === 'model' && !isVoiceMode && (
                                <button
                                    onClick={() => speak(msg.content)}
                                    disabled={isAudioLoading}
                                    style={{
                                        border: 'none', background: 'none', cursor: 'pointer',
                                        fontSize: '15px', opacity: 0.6, marginTop: '3px', padding: '3px'
                                    }}
                                    title="استمع للرد"
                                >
                                    🔊
                                </button>
                            )}
                        </div>
                    </div>
                ))}

                {isAiThinking && (
                    <div style={{ alignSelf: 'flex-end', display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', fontSize: '13px', padding: '8px 14px', background: '#f1f5f9', borderRadius: '18px', borderBottomRightRadius: '4px' }}>
                        <span style={{ animation: 'bounce 0.6s infinite alternate' }}>●</span>
                        <span style={{ animation: 'bounce 0.6s 0.2s infinite alternate' }}>●</span>
                        <span style={{ animation: 'bounce 0.6s 0.4s infinite alternate' }}>●</span>
                    </div>
                )}
                {isVoiceMode && isAudioPlaying && (
                    <div style={{ alignSelf: 'flex-end', color: '#64748b', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', background: '#f1f5f9', borderRadius: '18px' }}>
                        <span style={{ fontSize: '16px' }}>🔊</span> المساعد يتكلم...
                    </div>
                )}
                {isVoiceMode && isListening && !isAiThinking && !isAudioPlaying && (
                    <div style={{ alignSelf: 'center', color: '#16a34a', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: '#f0fdf4', borderRadius: '20px', border: '1px solid #bbf7d0' }}>
                        🎙️ يستمع إليك...
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div style={{
                padding: '12px 14px',
                borderTop: '1px solid #e2e8f0',
                backgroundColor: '#fff',
                display: 'flex',
                gap: '8px',
                alignItems: 'flex-end',
                flexShrink: 0,
                opacity: (isVoiceMode && isAudioPlaying) ? 0.5 : 1,
                pointerEvents: (isVoiceMode && isAudioPlaying) ? 'none' : 'auto'
            }}>
                <button
                    onClick={() => {
                        if (isVoiceMode) setIsVoiceMode(false);
                        isListening ? stopListening() : startListening();
                    }}
                    style={{
                        width: '40px', height: '40px', borderRadius: '50%', border: 'none', flexShrink: 0,
                        backgroundColor: isListening ? '#ef4444' : '#f1f5f9',
                        color: isListening ? '#fff' : '#64748b',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '18px', transition: 'all 0.2s',
                        boxShadow: isListening ? '0 0 0 4px rgba(239,68,68,0.2)' : 'none'
                    }}
                    title={isListening ? 'إيقاف الاستماع' : 'إدخال صوتي'}
                >
                    {isListening ? '🛑' : '🎤'}
                </button>

                <div style={{ flex: 1, position: 'relative' }}>
                    <textarea
                        ref={inputRef}
                        value={isListening ? (transcript + (interimTranscript ? ' ' + interimTranscript : '')) : input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={
                            isVoiceMode
                                ? (isAudioPlaying ? 'المساعد يتكلم...' : 'تكلم الآن، يُرسل تلقائياً عند التوقف.')
                                : 'اكتب سؤالك...'
                        }
                        dir="auto"
                        disabled={isVoiceMode && isAudioPlaying}
                        style={{
                            width: '100%', padding: '11px 14px', borderRadius: '22px',
                            border: '1px solid #e2e8f0', resize: 'none',
                            height: '44px', minHeight: '44px', maxHeight: '120px',
                            outline: 'none', fontFamily: 'inherit', fontSize: '14px',
                            backgroundColor: (isVoiceMode && isAudioPlaying) ? '#f8fafc' : '#f8fafc',
                            transition: 'border-color 0.2s',
                            lineHeight: '1.4'
                        }}
                        onFocus={(e) => { e.target.style.borderColor = '#3b82f6'; }}
                        onBlur={(e) => { e.target.style.borderColor = '#e2e8f0'; }}
                    />
                </div>

                <button
                    onClick={() => handleSend()}
                    disabled={(!input.trim() && !transcript) || (isVoiceMode && isAudioPlaying)}
                    style={{
                        width: '40px', height: '40px', borderRadius: '50%', border: 'none', flexShrink: 0,
                        background: (!input.trim() && !transcript) ? '#e2e8f0' : 'linear-gradient(135deg, #3b82f6, #6366f1)',
                        color: '#fff', cursor: (!input.trim() && !transcript) ? 'not-allowed' : 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '18px', transition: 'all 0.2s',
                        boxShadow: (!input.trim() && !transcript) ? 'none' : '0 2px 8px rgba(59,130,246,0.4)'
                    }}
                >
                    ➤
                </button>
            </div>

            {error && (
                <div style={{ padding: '8px 16px', backgroundColor: '#fef2f2', color: '#dc2626', fontSize: '12px', textAlign: 'center', flexShrink: 0 }}>
                    {error}
                </div>
            )}

            <style>{`
                @keyframes pulse { 0% { opacity: 1; transform: scale(1); } 100% { opacity: 0.5; transform: scale(1.3); } }
                @keyframes bounce { 0% { transform: translateY(0); opacity: 0.4; } 100% { transform: translateY(-4px); opacity: 1; } }
            `}</style>
        </div>
    );
}

const suggestionStyle: React.CSSProperties = {
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    padding: '10px 16px',
    cursor: 'pointer',
    fontSize: '13px',
    color: '#475569',
    fontWeight: 600,
    textAlign: 'right',
    direction: 'rtl',
    transition: 'background 0.2s',
    width: '100%'
};
