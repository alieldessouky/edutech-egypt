'use client';

import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { StudioQuizQuestion } from '../../lib/lessonStudioData';

// ─────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────

type LessonDraft = {
    title: string;
    simplified_arabic: string;
    podcast_script: string;
    quiz_questions: StudioQuizQuestion[];
};

// ─────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────

export default function LessonStudioPage() {
    // Topic input state
    const [chapterContent, setChapterContent] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);

    // Draft state (null until generated)
    const [draft, setDraft] = useState<LessonDraft | null>(null);

    const [isPublishing, setIsPublishing] = useState(false);
    const [publishSuccess, setPublishSuccess] = useState(false);
    const [error, setError] = useState('');

    // Podcast player state
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);

    // ── Generate lesson from NotebookLM ──

    const handleGenerate = async () => {
        if (!chapterContent || chapterContent.trim().length < 50) {
            setError('الرجاء إدخال محتوى الدرس (50 حرف على الأقل)');
            return;
        }

        setIsGenerating(true);
        setError('');

        try {
            const response = await fetch('/api/query-notebook', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: chapterContent.trim() })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'فشل في توليد الدرس');
            }

            // Set the generated draft
            setDraft({
                title: data.title,
                simplified_arabic: data.simplified_arabic,
                podcast_script: data.podcast_script,
                quiz_questions: data.quiz_questions
            });

        } catch (err: any) {
            console.error('Generation error:', err);
            setError(err.message || 'فشل في توليد الدرس من NotebookLM. حاول مرة أخرى.');
        } finally {
            setIsGenerating(false);
        }
    };

    // ── Quiz editing handlers ──

    const updateQuestionText = (idx: number, text: string) => {
        if (!draft) return;
        const updated = [...draft.quiz_questions];
        updated[idx] = { ...updated[idx], text };
        setDraft({ ...draft, quiz_questions: updated });
    };

    const updateChoice = (qIdx: number, cIdx: number, value: string) => {
        if (!draft) return;
        const updated = [...draft.quiz_questions];
        const choices = [...updated[qIdx].choices];
        choices[cIdx] = value;
        updated[qIdx] = { ...updated[qIdx], choices };
        setDraft({ ...draft, quiz_questions: updated });
    };

    const updateCorrectIndex = (qIdx: number, correctIndex: number) => {
        if (!draft) return;
        const updated = [...draft.quiz_questions];
        updated[qIdx] = { ...updated[qIdx], correctIndex };
        setDraft({ ...draft, quiz_questions: updated });
    };

    const removeQuestion = (idx: number) => {
        if (!draft) return;
        const updated = draft.quiz_questions.filter((_, i) => i !== idx);
        setDraft({ ...draft, quiz_questions: updated });
    };

    const addQuestion = () => {
        if (!draft) return;
        const newQ: StudioQuizQuestion = {
            text: '',
            choices: ['', '', '', ''],
            correctIndex: 0,
        };
        setDraft({ ...draft, quiz_questions: [...draft.quiz_questions, newQ] });
    };

    const handleReset = () => {
        setDraft(null);
        setChapterContent('');
        setPublishSuccess(false);
        setError('');
    };

    // ── Fake play toggle ──

    const togglePlay = () => {
        setIsPlaying(!isPlaying);
        if (!isPlaying) {
            // Simulate progress
            const interval = setInterval(() => {
                setProgress(prev => {
                    if (prev >= 100) {
                        clearInterval(interval);
                        setIsPlaying(false);
                        return 0;
                    }
                    return prev + 0.5;
                });
            }, 200);
        }
    };

    // ── Publish handler ──

    const handlePublish = async () => {
        if (!draft) return;

        const classId =
            typeof window !== 'undefined'
                ? localStorage.getItem('edtech_active_class_id_v1') || ''
                : '';

        if (!classId) {
            setError('لا يوجد فصل دراسي نشط. اختر فصلاً أولاً من لوحة المعلم.');
            return;
        }

        setIsPublishing(true);
        setError('');

        try {
            // 1. Insert lesson
            const lessonId = crypto.randomUUID();
            const { error: lessonErr } = await supabase.from('lessons').insert({
                id: lessonId,
                class_id: classId,
                title: draft.title,
                content: chapterContent.trim(),
                simplified_arabic: draft.simplified_arabic,
                podcast_script: draft.podcast_script,
                created_at: new Date().toISOString(),
            });
            if (lessonErr) throw lessonErr;

            // 2. Create quiz
            const quizId = crypto.randomUUID();
            const { error: quizErr } = await supabase.from('quizzes').insert({
                id: quizId,
                lesson_id: lessonId,
                title: `اختبار: ${draft.title}`,
                passing_score: 60,
                created_at: new Date().toISOString(),
            });
            if (quizErr) throw quizErr;

            // 3. Insert questions
            const questionsInsert = draft.quiz_questions.map(q => ({
                quiz_id: quizId,
                question: q.text,
                choices: q.choices,
                correct_index: q.correctIndex,
            }));
            const { error: qErr } = await supabase.from('questions').insert(questionsInsert);
            if (qErr) throw qErr;

            setPublishSuccess(true);
        } catch (err: any) {
            console.error('Publish failed:', err);
            setError(err.message || 'فشل في النشر. حاول مرة أخرى.');
        } finally {
            setIsPublishing(false);
        }
    };

    // ── Success Screen ──

    if (publishSuccess) {
        return (
            <div style={styles.successWrapper}>
                <div style={styles.successCard}>
                    <div style={{ fontSize: '64px', marginBottom: '16px' }}>🎉</div>
                    <h1 style={{ color: '#10b981', margin: '0 0 8px 0', fontSize: '28px' }}>تم نشر الدرس بنجاح!</h1>
                    <p style={{ color: '#6b7280', marginBottom: '32px', fontSize: '16px' }}>الدرس متاح الآن للطلاب</p>
                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                        <a href="/teacher" style={styles.successBtnPrimary}>← لوحة المعلم</a>
                        <button onClick={handleReset} style={styles.successBtnSecondary}>
                            إنشاء درس آخر
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // ── Main Render ──

    return (
        <div style={styles.page}>
            {/* ── Header ── */}
            <div style={styles.header}>
                <div>
                    <h1 style={styles.headerTitle}>
                        <span style={{ fontSize: '28px' }}>🧪</span> Lesson Creation Studio
                    </h1>
                    <p style={styles.headerSubtitle}>
                        {draft ? `${draft.title} — Preview & Publish` : 'Powered by NotebookLM MCP'}
                    </p>
                </div>
                <a href="/teacher" style={styles.backBtn}>← Back to Dashboard</a>
            </div>

            {/* ── Error ── */}
            {error && (
                <div style={styles.errorBar} dir="rtl">
                    ⚠️ {error}
                    <button onClick={() => setError('')} style={styles.errorClose}>✕</button>
                </div>
            )}

            {/* ── Topic Input Screen (shown when no draft) ── */}
            {!draft ? (
                <div style={styles.topicInputWrapper}>
                    <div style={styles.topicInputCard}>
                        <div style={{ fontSize: '64px', marginBottom: '24px' }}>📚</div>
                        <h2 style={styles.topicInputTitle}>خطوة 1: الصق محتوى الفصل هنا</h2>
                        <p style={styles.topicInputSubtitle}>
                            الصق النص العربي من كتاب المدرسة للفصل (تاريخ للصف السادس)
                        </p>

                        <textarea
                            value={chapterContent}
                            onChange={(e) => setChapterContent(e.target.value)}
                            placeholder="الصق محتوى الفصل هنا..."
                            dir="rtl"
                            disabled={isGenerating}
                            style={{
                                width: '100%',
                                height: '250px',
                                padding: '15px',
                                fontSize: '16px',
                                fontFamily: 'inherit',
                                border: '1px solid #4a5568',
                                borderRadius: '8px',
                                resize: 'vertical',
                                marginBottom: '20px',
                                backgroundColor: '#1a202c',
                                color: '#e2e8f0',
                                opacity: isGenerating ? 0.6 : 1,
                            }}
                        />



                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ color: '#888', fontSize: '14px' }}>
                                {chapterContent.length} أحرف
                                {chapterContent.length < 50 && chapterContent.length > 0 && (
                                    <span style={{ color: '#f57c00' }}> (الأدنى 50 حرف)</span>
                                )}
                            </span>
                            <button
                                onClick={handleGenerate}
                                disabled={isGenerating || chapterContent.length < 50}
                                style={{
                                    ...styles.generateBtn,
                                    opacity: isGenerating || chapterContent.length < 50 ? 0.5 : 1,
                                    cursor: isGenerating || chapterContent.length < 50 ? 'not-allowed' : 'pointer',
                                }}
                            >
                                {isGenerating ? (
                                    <>
                                        <span style={styles.spinner} />
                                        جارٍ التوليد...
                                    </>
                                ) : (
                                    <>✨ توليد الدرس</>
                                )}
                            </button>
                        </div>

                        <p style={styles.topicInputHint}>
                            💡 سيتم توليد الدرس (بودكاست، ملخص، وأسئلة) بناءً على المحتوى المُلصق فقط لتجنب أي هلوسة
                        </p>
                    </div>
                </div>
            ) : (
                /* ── Bento Grid (shown when draft exists) ── */
                <>
                    {/* ── Bento Grid ── */}
                    <div style={styles.bentoGrid}>

                        {/* ── Card 1: Podcast Player ── */}
                        <div style={styles.podcastCard}>
                            <div style={styles.cardLabel}>🎙️ PODCAST</div>
                            <h2 style={styles.podcastTitle}>{draft.title}</h2>
                            <p style={styles.podcastMeta}>بودكاست تعليمي • حلقة ١</p>

                            {/* Player Controls */}
                            <div style={styles.playerControls}>
                                <button onClick={togglePlay} style={styles.playBtn}>
                                    {isPlaying ? '⏸' : '▶'}
                                </button>
                                <div style={styles.progressBarOuter}>
                                    <div style={{ ...styles.progressBarInner, width: `${progress}%` }} />
                                </div>
                                <span style={styles.timestamp}>
                                    {Math.floor(progress * 0.12)}:{String(Math.floor((progress * 7.2) % 60)).padStart(2, '0')} / 12:00
                                </span>
                            </div>

                            {/* Waveform decoration */}
                            <div style={styles.waveform}>
                                {Array.from({ length: 40 }).map((_, i) => (
                                    <div
                                        key={i}
                                        style={{
                                            width: '3px',
                                            height: `${12 + Math.sin(i * 0.5 + progress * 0.1) * 16 + Math.random() * 4}px`,
                                            backgroundColor: isPlaying
                                                ? `hsl(${260 + i * 2}, 80%, ${55 + Math.sin(i) * 15}%)`
                                                : 'rgba(255,255,255,0.25)',
                                            borderRadius: '2px',
                                            transition: 'height 0.3s ease, background-color 0.3s ease',
                                        }}
                                    />
                                ))}
                            </div>

                            {/* Podcast script */}
                            <div style={styles.podcastScript} dir="rtl">
                                {draft.podcast_script.split('\n').map((line, i) => {
                                    if (line.startsWith('━')) return <hr key={i} style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.15)', margin: '12px 0' }} />;
                                    if (line.startsWith('🎤')) return <p key={i} style={{ color: '#c4b5fd', fontWeight: 'bold', margin: '8px 0 4px' }}>{line}</p>;
                                    if (line.startsWith('👨‍🏫')) return <p key={i} style={{ color: '#86efac', margin: '4px 0' }}>{line}</p>;
                                    if (line.startsWith('[')) return <p key={i} style={{ color: 'rgba(255,255,255,0.4)', fontStyle: 'italic', margin: '8px 0' }}>{line}</p>;
                                    return <p key={i} style={{ color: 'rgba(255,255,255,0.7)', margin: '4px 0' }}>{line}</p>;
                                })}
                            </div>
                        </div>

                        {/* ── Card 2: Simplified Reader (RTL) ── */}
                        <div style={styles.readerCard}>
                            <div style={styles.cardLabelDark}>📖 SIMPLIFIED READER</div>
                            <div style={styles.readerContent} dir="rtl">
                                <h2 style={styles.readerTitle}>{draft.title}</h2>
                                {draft.simplified_arabic.split('\n\n').map((para, i) => {
                                    // Handle bullet points
                                    if (para.includes('- ')) {
                                        return (
                                            <ul key={i} style={styles.readerList}>
                                                {para.split('\n').filter(l => l.startsWith('- ')).map((item, j) => (
                                                    <li key={j} style={styles.readerListItem}>{item.replace('- ', '')}</li>
                                                ))}
                                            </ul>
                                        );
                                    }
                                    return <p key={i} style={styles.readerParagraph}>{para}</p>;
                                })}
                            </div>
                        </div>

                        {/* ── Card 3: Quiz Editor ── */}
                        <div style={styles.quizCard}>
                            <div style={styles.quizHeader}>
                                <div style={styles.cardLabelDark}>📝 QUIZ EDITOR</div>
                                <div style={styles.quizHeaderRight}>
                                    <span style={styles.quizCount}>{draft.quiz_questions.length} أسئلة</span>
                                    <button onClick={addQuestion} style={styles.addQuestionBtn}>+ سؤال جديد</button>
                                </div>
                            </div>

                            <div style={styles.quizGrid}>
                                {draft.quiz_questions.map((q, qIdx) => (
                                    <div key={qIdx} style={styles.questionCard}>
                                        <div style={styles.questionHeader}>
                                            <span style={styles.questionNumber}>{qIdx + 1}</span>
                                            <button onClick={() => removeQuestion(qIdx)} style={styles.removeBtn} title="حذف السؤال">✕</button>
                                        </div>
                                        <input
                                            type="text"
                                            value={q.text}
                                            onChange={e => updateQuestionText(qIdx, e.target.value)}
                                            dir="rtl"
                                            placeholder="نص السؤال..."
                                            style={styles.questionInput}
                                        />
                                        <div style={styles.choicesGrid}>
                                            {q.choices.map((c, cIdx) => (
                                                <div key={cIdx} style={{
                                                    ...styles.choiceRow,
                                                    borderColor: q.correctIndex === cIdx ? '#10b981' : '#e5e7eb',
                                                    backgroundColor: q.correctIndex === cIdx ? '#ecfdf5' : '#fff',
                                                }}>
                                                    <input
                                                        type="radio"
                                                        name={`q-${qIdx}`}
                                                        checked={q.correctIndex === cIdx}
                                                        onChange={() => updateCorrectIndex(qIdx, cIdx)}
                                                        style={{ accentColor: '#10b981', cursor: 'pointer' }}
                                                    />
                                                    <input
                                                        type="text"
                                                        value={c}
                                                        onChange={e => updateChoice(qIdx, cIdx, e.target.value)}
                                                        dir="rtl"
                                                        placeholder={`خيار ${cIdx + 1}`}
                                                        style={styles.choiceInput}
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* ── Publish Bar ── */}
                    <div style={styles.publishBar}>
                        <div style={styles.publishBarInner}>
                            <span style={{ color: '#9ca3af', fontSize: '14px' }}>
                                {draft.quiz_questions.length} questions • Ready to publish
                            </span>
                            <button
                                onClick={handlePublish}
                                disabled={isPublishing || draft.quiz_questions.length === 0}
                                style={{
                                    ...styles.publishBtn,
                                    opacity: isPublishing || draft.quiz_questions.length === 0 ? 0.5 : 1,
                                    cursor: isPublishing ? 'not-allowed' : 'pointer',
                                }}
                            >
                                {isPublishing ? (
                                    <>
                                        <span style={styles.spinner} />
                                        جارٍ النشر...
                                    </>
                                ) : (
                                    '🚀 نشر الدرس'
                                )}
                            </button>
                        </div>
                    </div>
                </>
            )}

            {/* ── Keyframe animations ── */}
            <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
        </div>
    );
}

// ─────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
    page: {
        minHeight: '100vh',
        backgroundColor: '#0f0f13',
        color: '#fff',
        fontFamily: "'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif",
        paddingBottom: '100px',
    },

    // Header
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '24px 32px',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
    },
    headerTitle: {
        margin: 0,
        fontSize: '24px',
        fontWeight: 700,
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        background: 'linear-gradient(135deg, #a78bfa, #60a5fa)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
    },
    headerSubtitle: {
        margin: '4px 0 0',
        fontSize: '14px',
        color: '#6b7280',
    },
    backBtn: {
        padding: '8px 18px',
        color: '#9ca3af',
        textDecoration: 'none',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: '8px',
        fontSize: '14px',
        transition: 'border-color 0.2s',
    },

    // Error
    errorBar: {
        margin: '16px 32px 0',
        padding: '14px 20px',
        backgroundColor: 'rgba(239,68,68,0.12)',
        border: '1px solid rgba(239,68,68,0.3)',
        borderRadius: '10px',
        color: '#fca5a5',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    errorClose: {
        background: 'none',
        border: 'none',
        color: '#fca5a5',
        cursor: 'pointer',
        fontSize: '16px',
    },

    // Bento Grid
    bentoGrid: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gridTemplateRows: 'auto auto',
        gap: '20px',
        padding: '24px 32px',
    },

    // Card labels
    cardLabel: {
        fontSize: '11px',
        fontWeight: 700,
        letterSpacing: '1.5px',
        color: 'rgba(255,255,255,0.5)',
        marginBottom: '16px',
        textTransform: 'uppercase' as const,
    },
    cardLabelDark: {
        fontSize: '11px',
        fontWeight: 700,
        letterSpacing: '1.5px',
        color: '#6b7280',
        marginBottom: '16px',
        textTransform: 'uppercase' as const,
    },

    // ── Card 1: Podcast ──
    podcastCard: {
        gridColumn: '1',
        gridRow: '1',
        background: 'linear-gradient(145deg, #1a1a2e 0%, #16162a 50%, #0d0d1a 100%)',
        borderRadius: '20px',
        padding: '28px',
        border: '1px solid rgba(139,92,246,0.2)',
        minHeight: '500px',
        display: 'flex',
        flexDirection: 'column' as const,
        overflow: 'hidden',
    },
    podcastTitle: {
        margin: '0 0 4px',
        fontSize: '22px',
        fontWeight: 700,
        color: '#e2e8f0',
    },
    podcastMeta: {
        margin: '0 0 20px',
        fontSize: '13px',
        color: 'rgba(255,255,255,0.4)',
    },

    // Player
    playerControls: {
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
        marginBottom: '16px',
    },
    playBtn: {
        width: '44px',
        height: '44px',
        borderRadius: '50%',
        border: 'none',
        background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
        color: '#fff',
        fontSize: '18px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 4px 15px rgba(139,92,246,0.4)',
        flexShrink: 0,
    },
    progressBarOuter: {
        flex: 1,
        height: '6px',
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: '3px',
        overflow: 'hidden',
    },
    progressBarInner: {
        height: '100%',
        background: 'linear-gradient(90deg, #8b5cf6, #06b6d4)',
        borderRadius: '3px',
        transition: 'width 0.2s linear',
    },
    timestamp: {
        fontSize: '12px',
        color: 'rgba(255,255,255,0.4)',
        fontVariantNumeric: 'tabular-nums',
        flexShrink: 0,
        minWidth: '85px',
        textAlign: 'right' as const,
    },

    // Waveform
    waveform: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '2px',
        height: '48px',
        marginBottom: '16px',
    },

    // Script
    podcastScript: {
        flex: 1,
        overflowY: 'auto' as const,
        fontSize: '14px',
        lineHeight: '1.8',
        paddingRight: '8px',
    },

    // ── Card 2: Reader ──
    readerCard: {
        gridColumn: '2',
        gridRow: '1',
        background: 'linear-gradient(145deg, #fffbeb 0%, #fef3c7 30%, #fff7ed 100%)',
        borderRadius: '20px',
        padding: '28px',
        border: '1px solid rgba(217,180,95,0.3)',
        minHeight: '500px',
        display: 'flex',
        flexDirection: 'column' as const,
        overflow: 'hidden',
    },
    readerContent: {
        flex: 1,
        overflowY: 'auto' as const,
        paddingLeft: '4px',
    },
    readerTitle: {
        margin: '0 0 20px',
        fontSize: '26px',
        fontWeight: 800,
        color: '#78350f',
        lineHeight: 1.4,
    },
    readerParagraph: {
        margin: '0 0 16px',
        fontSize: '16px',
        lineHeight: 2,
        color: '#44403c',
    },
    readerList: {
        margin: '0 0 16px',
        paddingRight: '20px',
        listStyleType: 'disc',
    },
    readerListItem: {
        fontSize: '15px',
        lineHeight: 1.9,
        color: '#44403c',
        marginBottom: '6px',
    },

    // ── Card 3: Quiz Editor ──
    quizCard: {
        gridColumn: '1 / -1',
        gridRow: '2',
        background: '#fff',
        borderRadius: '20px',
        padding: '28px',
        border: '1px solid #e5e7eb',
    },
    quizHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px',
    },
    quizHeaderRight: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
    },
    quizCount: {
        fontSize: '14px',
        color: '#6b7280',
        direction: 'rtl' as const,
    },
    addQuestionBtn: {
        padding: '8px 18px',
        fontSize: '13px',
        fontWeight: 600,
        backgroundColor: '#f0fdf4',
        color: '#16a34a',
        border: '1px solid #bbf7d0',
        borderRadius: '8px',
        cursor: 'pointer',
    },

    quizGrid: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '16px',
    },

    questionCard: {
        border: '1px solid #e5e7eb',
        borderRadius: '14px',
        padding: '18px',
        backgroundColor: '#fafafa',
        transition: 'box-shadow 0.2s',
    },
    questionHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '12px',
    },
    questionNumber: {
        width: '28px',
        height: '28px',
        borderRadius: '50%',
        background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '13px',
        fontWeight: 700,
    },
    removeBtn: {
        width: '26px',
        height: '26px',
        borderRadius: '50%',
        border: 'none',
        backgroundColor: '#fee2e2',
        color: '#dc2626',
        cursor: 'pointer',
        fontSize: '12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    questionInput: {
        width: '100%',
        padding: '10px 12px',
        fontSize: '14px',
        border: '1px solid #d1d5db',
        borderRadius: '8px',
        marginBottom: '12px',
        fontFamily: 'inherit',
        boxSizing: 'border-box' as const,
    },
    choicesGrid: {
        display: 'flex',
        flexDirection: 'column' as const,
        gap: '6px',
    },
    choiceRow: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 10px',
        borderRadius: '8px',
        border: '1px solid',
        transition: 'all 0.15s',
    },
    choiceInput: {
        flex: 1,
        border: 'none',
        outline: 'none',
        fontSize: '13px',
        backgroundColor: 'transparent',
        fontFamily: 'inherit',
    },

    // ── Publish Bar ──
    publishBar: {
        position: 'fixed' as const,
        bottom: 0,
        left: 0,
        right: 0,
        background: 'rgba(15,15,19,0.9)',
        backdropFilter: 'blur(12px)',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        padding: '16px 32px',
        zIndex: 50,
    },
    publishBarInner: {
        maxWidth: '1400px',
        margin: '0 auto',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    publishBtn: {
        padding: '14px 36px',
        fontSize: '16px',
        fontWeight: 700,
        background: 'linear-gradient(135deg, #10b981, #059669)',
        color: '#fff',
        border: 'none',
        borderRadius: '12px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        boxShadow: '0 4px 15px rgba(16,185,129,0.3)',
    },
    spinner: {
        display: 'inline-block',
        width: '18px',
        height: '18px',
        border: '3px solid rgba(255,255,255,0.3)',
        borderTopColor: '#fff',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
    },

    // ── Success Screen ──
    successWrapper: {
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0f0f13',
        padding: '20px',
    },
    successCard: {
        textAlign: 'center' as const,
        padding: '48px',
        borderRadius: '24px',
        background: 'linear-gradient(145deg, #111827, #1f2937)',
        border: '1px solid rgba(16,185,129,0.3)',
        maxWidth: '480px',
        width: '100%',
    },
    successBtnPrimary: {
        padding: '12px 28px',
        backgroundColor: '#10b981',
        color: '#fff',
        borderRadius: '10px',
        textDecoration: 'none',
        fontWeight: 600,
        fontSize: '15px',
    },
    successBtnSecondary: {
        padding: '12px 28px',
        backgroundColor: 'transparent',
        color: '#10b981',
        border: '1px solid rgba(16,185,129,0.4)',
        borderRadius: '10px',
        cursor: 'pointer',
        fontWeight: 600,
        fontSize: '15px',
    },

    // ── Topic Input Screen ──
    topicInputWrapper: {
        minHeight: 'calc(100vh - 100px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 20px',
    },
    topicInputCard: {
        textAlign: 'center' as const,
        maxWidth: '600px',
        width: '100%',
        padding: '60px 40px',
        background: 'linear-gradient(145deg, #1a1a2e 0%, #16162a 50%, #0d0d1a 100%)',
        borderRadius: '24px',
        border: '1px solid rgba(139,92,246,0.3)',
    },
    topicInputTitle: {
        fontSize: '32px',
        fontWeight: 700,
        margin: '0 0 12px',
        background: 'linear-gradient(135deg, #a78bfa, #60a5fa)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        direction: 'rtl' as const,
    },
    topicInputSubtitle: {
        fontSize: '16px',
        color: 'rgba(255,255,255,0.6)',
        margin: '0 0 40px',
        direction: 'rtl' as const,
    },
    topicInput: {
        width: '100%',
        padding: '18px 20px',
        fontSize: '18px',
        backgroundColor: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.15)',
        borderRadius: '12px',
        color: '#fff',
        marginBottom: '24px',
        fontFamily: 'inherit',
        textAlign: 'right' as const,
        outline: 'none',
        transition: 'border-color 0.2s, background-color 0.2s',
    },
    generateBtn: {
        width: '100%',
        padding: '18px 36px',
        fontSize: '18px',
        fontWeight: 700,
        background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
        color: '#fff',
        border: 'none',
        borderRadius: '12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
        boxShadow: '0 4px 20px rgba(139,92,246,0.4)',
        transition: 'transform 0.2s, box-shadow 0.2s',
    },
    topicInputHint: {
        fontSize: '13px',
        color: 'rgba(255,255,255,0.4)',
        marginTop: '24px',
        direction: 'rtl' as const,
    },
};
