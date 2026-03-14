'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import { StudentChat } from '../../components/StudentChat';

// ─── Micro-components ────────────────────────────────────────────────────────

const LevelUpToast = ({ show, newLevel }: { show: boolean; newLevel: number }) => {
    if (!show) return null;
    return (
        <div style={{
            position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)',
            background: 'linear-gradient(135deg, #f59e0b, #ef4444)', color: 'white',
            padding: '14px 28px', borderRadius: '50px',
            boxShadow: '0 10px 30px rgba(245,158,11,0.4)', zIndex: 9000,
            display: 'flex', alignItems: 'center', gap: '14px',
            animation: 'slideDown 0.5s cubic-bezier(0.34,1.56,0.64,1)'
        }}>
            <span style={{ fontSize: '28px' }}>⭐</span>
            <div dir="rtl">
                <div style={{ fontWeight: 800, fontSize: '16px' }}>مستوى جديد!</div>
                <div style={{ fontWeight: 600, fontSize: '13px', opacity: 0.9 }}>أنت الآن في المستوى {newLevel}</div>
            </div>
        </div>
    );
};

// ─── Types ────────────────────────────────────────────────────────────────────

type Question = {
    id: string;
    question: string;
    choices: string[];
    correct_index: number;
    lesson_id: string;
};

type Lesson = {
    id: string;
    title: string;
    content: string;
    simplified_arabic?: string;
    podcast_script?: string;
    created_at: string;
    questions: Question[];
    quiz_id?: string;
};

type TabType = 'ai' | 'podcast' | 'quiz';

type SelectionState = {
    text: string;
    x: number;
    y: number;
} | null;

type PendingContext = {
    text: string;
    action: 'ask' | 'explain' | 'test';
} | null;

// ─── Lesson Content Renderer ─────────────────────────────────────────────────

function renderLessonContent(text: string, fontSize: number): React.ReactNode {
    if (!text) return null;
    const lines = text.split('\n');
    const elements: React.ReactNode[] = [];
    let bulletBuffer: string[] = [];
    let paraBuffer: string[] = [];

    const flushPara = () => {
        if (paraBuffer.length === 0) return;
        const para = paraBuffer.join(' ').trim();
        if (para) {
            elements.push(
                <p key={elements.length} style={{
                    fontSize, lineHeight: 2.1, color: '#1e293b', margin: '0 0 18px 0',
                    fontFamily: 'var(--font-cairo), "Noto Naskh Arabic", system-ui',
                    textAlign: 'right'
                }}>{para}</p>
            );
        }
        paraBuffer = [];
    };

    const flushBullets = () => {
        if (bulletBuffer.length === 0) return;
        elements.push(
            <ul key={elements.length} style={{ margin: '0 0 18px 0', padding: 0, listStyle: 'none' }}>
                {bulletBuffer.map((item, i) => (
                    <li key={i} style={{
                        display: 'flex', gap: '10px', alignItems: 'flex-start',
                        marginBottom: '10px', direction: 'rtl'
                    }}>
                        <span style={{
                            width: '8px', height: '8px', borderRadius: '50%',
                            background: '#1a56db', flexShrink: 0, marginTop: '10px'
                        }} />
                        <span style={{
                            fontSize: fontSize - 1, lineHeight: 1.9, color: '#334155',
                            fontFamily: 'var(--font-cairo), "Noto Naskh Arabic", system-ui',
                            flex: 1, textAlign: 'right'
                        }}>{item}</span>
                    </li>
                ))}
            </ul>
        );
        bulletBuffer = [];
    };

    for (const raw of lines) {
        const line = raw.trim();

        // Blank line → flush buffers
        if (!line) {
            flushBullets();
            flushPara();
            continue;
        }

        // Heading: **text** pattern
        const boldHeading = line.match(/^\*\*(.+?)\*\*$/);
        if (boldHeading) {
            flushBullets(); flushPara();
            elements.push(
                <div key={elements.length} style={{
                    fontSize: fontSize + 3, fontWeight: 800, color: '#1a56db',
                    margin: '28px 0 12px 0', paddingBottom: '8px',
                    borderBottom: '2px solid #e0e7ff', textAlign: 'right',
                    fontFamily: 'var(--font-cairo), "Noto Naskh Arabic", system-ui',
                    letterSpacing: '-0.3px'
                }}>{boldHeading[1]}</div>
            );
            continue;
        }

        // Short line with no sentence-ending punctuation → treat as heading
        const noEndPunct = !/[.،؟!:…]$/.test(line);
        if (line.length < 50 && noEndPunct && !line.startsWith('-') && !line.startsWith('•') && !/^\d+\./.test(line)) {
            flushBullets(); flushPara();
            elements.push(
                <div key={elements.length} style={{
                    fontSize: fontSize + 2, fontWeight: 700, color: '#0f172a',
                    margin: '24px 0 10px 0', textAlign: 'right',
                    fontFamily: 'var(--font-cairo), "Noto Naskh Arabic", system-ui',
                }}>
                    {line}
                </div>
            );
            continue;
        }

        // Bullet: starts with "- " or "• " or "* "
        if (/^[-•*]\s+/.test(line)) {
            flushPara();
            bulletBuffer.push(line.replace(/^[-•*]\s+/, ''));
            continue;
        }

        // Numbered list: "1. " "٢. " etc.
        const numberedMatch = line.match(/^(\d+|[١-٩][٠-٩]*)\.\s+(.+)/);
        if (numberedMatch) {
            flushPara();
            flushBullets();
            elements.push(
                <div key={elements.length} style={{
                    display: 'flex', gap: '10px', alignItems: 'flex-start',
                    marginBottom: '10px', direction: 'rtl'
                }}>
                    <span style={{
                        minWidth: '26px', height: '26px', borderRadius: '50%',
                        background: '#e0e7ff', color: '#1a56db', fontSize: '13px',
                        fontWeight: 800, display: 'flex', alignItems: 'center',
                        justifyContent: 'center', flexShrink: 0, marginTop: '4px'
                    }}>{numberedMatch[1]}</span>
                    <span style={{
                        fontSize: fontSize - 1, lineHeight: 1.9, color: '#334155',
                        fontFamily: 'var(--font-cairo), "Noto Naskh Arabic", system-ui',
                        flex: 1, textAlign: 'right'
                    }}>{numberedMatch[2]}</span>
                </div>
            );
            continue;
        }

        // Default: paragraph line
        flushBullets();
        paraBuffer.push(line);
    }

    flushBullets();
    flushPara();
    return elements;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function StudentJoinPage() {
    const params = useParams();
    const classId = Array.isArray(params.classId) ? params.classId[0] : params.classId;

    // Auth state
    const [name, setName] = useState('');
    const [joinedName, setJoinedName] = useState<string | null>(null);
    const [isJoined, setIsJoined] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [studentId, setStudentId] = useState('');

    // Lessons
    const [lessons, setLessons] = useState<Lesson[]>([]);
    const [loadingLessons, setLoadingLessons] = useState(false);
    const [expandedLessonId, setExpandedLessonId] = useState<string | null>(null);

    // Sidebar
    const [activeTab, setActiveTab] = useState<TabType>('ai');

    // Highlight-to-AI
    const [selection, setSelection] = useState<SelectionState>(null);
    const [pendingContext, setPendingContext] = useState<PendingContext>(null);
    const lessonReaderRef = useRef<HTMLDivElement>(null);

    // Simplified Arabic toggle
    const [showSimplified, setShowSimplified] = useState(false);

    // Font size controls
    const [fontSize, setFontSize] = useState(18);

    // Reading progress
    const [readingProgress, setReadingProgress] = useState(0);
    const readerScrollRef = useRef<HTMLDivElement>(null);

    // Quiz
    const [quizAnswers, setQuizAnswers] = useState<Record<string, Record<string, number>>>({});
    const [quizSubmitted, setQuizSubmitted] = useState<Record<string, boolean>>({});
    const [saveStatus, setSaveStatus] = useState<Record<string, string>>({});

    // Gamification
    const [showLevelUp, setShowLevelUp] = useState(false);
    const [currentLevel, setCurrentLevel] = useState(1);
    const [showConfetti, setShowConfetti] = useState(false);
    const [earnedPoints, setEarnedPoints] = useState(0);

    // ── Auth ──────────────────────────────────────────────────────────────────

    useEffect(() => {
        const storedStudentId = localStorage.getItem('student_id');
        if (storedStudentId) {
            setStudentId(storedStudentId);
            fetchStudentProfile(storedStudentId);
        }
    }, []);

    const fetchStudentProfile = async (id: string) => {
        try {
            const { data } = await supabase
                .from('students').select('display_name').eq('id', id).single();
            if (data) { setJoinedName(data.display_name); setIsJoined(true); }
        } catch {
            localStorage.removeItem('student_id');
        }
    };

    const handleJoin = async () => {
        if (!name.trim() || !classId) return;
        setLoading(true); setError('');
        const deviceId = localStorage.getItem('edtech_device_id_v1') || crypto.randomUUID();
        localStorage.setItem('edtech_device_id_v1', deviceId);
        try {
            let currentId = localStorage.getItem('student_id');
            if (currentId) {
                setStudentId(currentId);
                await supabase.from('students').update({ display_name: name, class_id: classId }).eq('id', currentId);
            } else {
                const { data: newStudent, error: insertError } = await supabase
                    .from('students').insert({ class_id: classId, display_name: name }).select().single();
                if (insertError) throw insertError;
                if (newStudent) { localStorage.setItem('student_id', newStudent.id); setStudentId(newStudent.id); }
            }
            setJoinedName(name); setIsJoined(true);
        } catch (err: any) {
            setError(err.message || 'Failed to join class.');
        } finally { setLoading(false); }
    };

    // ── Lessons ───────────────────────────────────────────────────────────────

    useEffect(() => { if (isJoined && classId) fetchClassLessons(); }, [isJoined, classId]);

    const fetchClassLessons = async () => {
        setLoadingLessons(true);
        try {
            const { data, error } = await supabase
                .from('lessons').select('*, quizzes(*, questions(*))').eq('class_id', classId)
                .order('created_at', { ascending: false });
            if (error) throw error;
            if (data) {
                const mapped = data.map((l: any) => {
                    const firstQuiz = l.quizzes?.length > 0 ? l.quizzes[0] : null;
                    return {
                        ...l,
                        quiz_id: firstQuiz?.id,
                        questions: firstQuiz ? (firstQuiz.questions || []).sort((a: any, b: any) => a.id.localeCompare(b.id)) : []
                    };
                });
                setLessons(mapped);
            }
        } catch (err) { console.error('Error fetching lessons:', err); }
        finally { setLoadingLessons(false); }
    };

    const toggleLesson = (id: string) => {
        setExpandedLessonId(expandedLessonId === id ? null : id);
        setActiveTab('ai');
        setShowSimplified(false);
        setReadingProgress(0);
        setSelection(null);
        setPendingContext(null);
    };

    // ── Highlight-to-AI ───────────────────────────────────────────────────────

    const handleTextSelection = useCallback(() => {
        const sel = window.getSelection();
        if (!sel || sel.isCollapsed || !sel.toString().trim()) {
            setSelection(null);
            return;
        }
        const text = sel.toString().trim();
        if (text.length < 5) { setSelection(null); return; }

        const range = sel.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        setSelection({
            text,
            x: rect.left + rect.width / 2,
            y: rect.top - 10 + window.scrollY
        });
    }, []);

    const dismissSelection = useCallback(() => setSelection(null), []);

    const triggerAIAction = (action: 'ask' | 'explain' | 'test') => {
        if (!selection) return;
        setPendingContext({ text: selection.text, action });
        setActiveTab('ai');
        setSelection(null);
        window.getSelection()?.removeAllRanges();
    };

    // ── Reading Progress ──────────────────────────────────────────────────────

    const handleReaderScroll = useCallback(() => {
        const el = readerScrollRef.current;
        if (!el) return;
        const progress = el.scrollTop / (el.scrollHeight - el.clientHeight);
        setReadingProgress(Math.min(100, Math.round(progress * 100)));
    }, []);

    // ── Quiz ──────────────────────────────────────────────────────────────────

    const handleAnswerSelect = (lessonId: string, questionId: string, choiceIdx: number) => {
        if (quizSubmitted[lessonId]) return;
        setQuizAnswers(prev => ({
            ...prev,
            [lessonId]: { ...(prev[lessonId] || {}), [questionId]: choiceIdx }
        }));
    };

    const submitQuiz = async (lessonId: string) => {
        if (!confirm('هل تريد إرسال إجاباتك؟')) return;
        setQuizSubmitted(prev => ({ ...prev, [lessonId]: true }));
        setSaveStatus(prev => ({ ...prev, [lessonId]: 'جاري الحفظ...' }));

        const lesson = lessons.find(l => l.id === lessonId);
        if (!lesson) return;

        let correctCount = 0;
        const total = lesson.questions.length;
        const answerRows = lesson.questions.map(q => {
            const selectedIdx = quizAnswers[lessonId]?.[q.id];
            const hasSelection = typeof selectedIdx === 'number';
            const isCorrect = hasSelection && selectedIdx === q.correct_index;
            if (isCorrect) correctCount++;
            return {
                question_id: q.id,
                selected_choice: hasSelection ? q.choices[selectedIdx] : null,
                is_correct: isCorrect,
                short_answer: null,
                points_earned: isCorrect ? 10 : 0
            };
        });

        const scorePercent = total > 0 ? Math.round((correctCount / total) * 100) : 0;
        const points = correctCount * 10;

        if (scorePercent >= 70) {
            setShowConfetti(true);
            setEarnedPoints(points);
            setTimeout(() => setShowConfetti(false), 5000);
        }

        try {
            const attemptId = crypto.randomUUID();
            const { error: attemptError } = await supabase.from('attempts').insert([{
                id: attemptId, student_id: studentId, lesson_id: lessonId,
                quiz_id: lesson.quiz_id, score: correctCount,
                demo_key: process.env.NEXT_PUBLIC_DEMO_KEY || 'demo',
                answers: quizAnswers[lessonId] || {},
            }]);
            if (attemptError) throw attemptError;

            const finalRows = answerRows.map(r => ({ attempt_id: attemptId, ...r }));
            const { error: answersError } = await supabase.from('attempt_answers').insert(finalRows);
            if (answersError) throw answersError;

            const { data: stats } = await supabase.from('student_stats')
                .select('total_points, level').eq('student_id', studentId).single();
            if (stats) {
                const newTotal = (stats.total_points || 0) + points;
                const newLevel = Math.floor(newTotal / 100) + 1;
                if (newLevel > stats.level) {
                    setCurrentLevel(newLevel); setShowLevelUp(true);
                    setTimeout(() => setShowLevelUp(false), 5000);
                }
                await supabase.from('student_stats').update({
                    total_points: newTotal, level: newLevel,
                    total_quizzes: supabase.rpc('increment'),
                    total_questions_answered: supabase.rpc('increment', { x: total }),
                    total_correct_answers: supabase.rpc('increment', { x: correctCount })
                }).eq('student_id', studentId);
            }
            setSaveStatus(prev => ({ ...prev, [lessonId]: 'تم الحفظ بنجاح! ✅' }));
        } catch (err: any) {
            setSaveStatus(prev => ({ ...prev, [lessonId]: `خطأ: ${err.message}` }));
        }
    };

    // ─────────────────────────────────────────────────────────────────────────
    // RENDER
    // ─────────────────────────────────────────────────────────────────────────

    if (isJoined) {
        const activeLessonData = lessons.find(l => l.id === expandedLessonId);

        return (
            <div style={S.page}>

                {/* ── Header ─────────────────────────────────────────────── */}
                <header style={S.header}>
                    <div style={S.headerInner}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={S.logoMark}>🎓</div>
                            <div>
                                <div style={{ fontWeight: 800, fontSize: '16px', color: '#1e293b' }}>EduTech Egypt</div>
                                {activeLessonData && (
                                    <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                                        {activeLessonData.title}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={S.classBadge}>
                                🏫 {classId?.toString().slice(0, 8)}...
                            </div>
                            <div style={S.studentProfile}>
                                <div style={S.avatar}>{joinedName?.[0]?.toUpperCase() || 'S'}</div>
                                <span style={{ fontWeight: 600, fontSize: '14px', color: '#334155' }}>{joinedName}</span>
                            </div>
                        </div>
                    </div>
                </header>

                <main style={S.mainContainer}>
                    {loadingLessons ? (
                        <div style={S.centerState}>
                            <div style={S.spinner} />
                            <p style={{ color: '#94a3b8', marginTop: '16px' }}>جاري تحميل الدروس...</p>
                        </div>
                    ) : lessons.length === 0 ? (
                        <div style={S.emptyState}>
                            <div style={{ fontSize: '56px', marginBottom: '16px' }}>📚</div>
                            <h3 style={{ margin: 0, color: '#475569' }}>لا توجد دروس بعد</h3>
                            <p style={{ color: '#94a3b8', marginTop: '8px' }}>سيضيف معلمك الدروس قريباً</p>
                        </div>
                    ) : !expandedLessonId ? (

                        /* ── Lesson List ────────────────────────────────── */
                        <div style={S.lessonList}>
                            <div dir="rtl" style={{ marginBottom: '32px' }}>
                                <h2 style={{ margin: '0 0 6px 0', fontSize: '24px', color: '#0f172a', fontWeight: 800 }}>
                                    مرحباً، {joinedName} 👋
                                </h2>
                                <p style={{ margin: 0, color: '#64748b', fontSize: '15px' }}>اختر درساً لتبدأ التعلم</p>
                            </div>
                            {lessons.map((lesson, idx) => (
                                <div
                                    key={lesson.id}
                                    onClick={() => toggleLesson(lesson.id)}
                                    style={S.lessonCard}
                                    onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 8px 25px rgba(0,0,0,0.1)'; }}
                                    onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 8px rgba(0,0,0,0.05)'; }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                        <div style={{
                                            ...S.lessonIndex,
                                            background: `linear-gradient(135deg, ${COLORS[idx % COLORS.length]})`
                                        }}>
                                            {idx + 1}
                                        </div>
                                        <div dir="rtl">
                                            <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: '#1e293b' }}>
                                                {lesson.title}
                                            </h3>
                                            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#94a3b8' }}>
                                                {lesson.questions.length > 0 ? `${lesson.questions.length} سؤال` : 'قراءة فقط'} •{' '}
                                                {new Date(lesson.created_at).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' })}
                                            </p>
                                        </div>
                                    </div>
                                    <button style={S.startBtn} tabIndex={-1}>ابدأ →</button>
                                </div>
                            ))}
                        </div>

                    ) : activeLessonData ? (

                        /* ── Split-Screen Lesson View ───────────────────── */
                        <div style={S.splitLayout}>

                            {/* LEFT: Reading Panel */}
                            <div style={S.readerPanel}>

                                {/* Reader Header */}
                                <div style={S.readerHeader}>
                                    <button onClick={() => setExpandedLessonId(null)} style={S.backBtn}>
                                        ← العودة
                                    </button>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        {activeLessonData.simplified_arabic && (
                                            <button
                                                onClick={() => setShowSimplified(v => !v)}
                                                style={{
                                                    ...S.pillBtn,
                                                    background: showSimplified ? '#3b82f6' : '#f1f5f9',
                                                    color: showSimplified ? '#fff' : '#64748b',
                                                    border: showSimplified ? '1px solid #3b82f6' : '1px solid #e2e8f0'
                                                }}
                                            >
                                                {showSimplified ? '📖 نص كامل' : '🔤 مبسّط'}
                                            </button>
                                        )}
                                        <button
                                            onClick={() => setFontSize(s => Math.max(15, s - 1))}
                                            style={{ ...S.pillBtn, background: '#f1f5f9', color: '#64748b', padding: '6px 11px' }}
                                            title="تصغير الخط"
                                        >A-</button>
                                        <button
                                            onClick={() => setFontSize(s => Math.min(24, s + 1))}
                                            style={{ ...S.pillBtn, background: '#f1f5f9', color: '#64748b', padding: '6px 11px' }}
                                            title="تكبير الخط"
                                        >A+</button>
                                    </div>
                                </div>

                                {/* Reading Progress Bar */}
                                <div style={{ height: '3px', background: '#f1f5f9', flexShrink: 0 }}>
                                    <div style={{
                                        height: '100%',
                                        width: `${readingProgress}%`,
                                        background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)',
                                        transition: 'width 0.2s ease',
                                        borderRadius: '0 2px 2px 0'
                                    }} />
                                </div>

                                {/* Lesson Title */}
                                <div dir="rtl" style={{ padding: '24px 32px 0 32px', flexShrink: 0 }}>
                                    <h1 style={{ margin: 0, fontSize: '26px', fontWeight: 800, color: '#0f172a', lineHeight: 1.3 }}>
                                        {activeLessonData.title}
                                    </h1>
                                    <div style={{ marginTop: '8px', fontSize: '13px', color: '#94a3b8', display: 'flex', gap: '12px' }}>
                                        <span>📅 {new Date(activeLessonData.created_at).toLocaleDateString('ar-EG')}</span>
                                        {activeLessonData.questions.length > 0 && (
                                            <span>📝 {activeLessonData.questions.length} سؤال</span>
                                        )}
                                        {readingProgress > 0 && <span>📖 {readingProgress}% قرأت</span>}
                                    </div>
                                </div>

                                {/* Highlight tip */}
                                <div dir="rtl" style={{
                                    margin: '16px 32px 0 32px', padding: '10px 14px',
                                    background: 'linear-gradient(135deg, #eff6ff, #f5f3ff)',
                                    borderRadius: '10px', border: '1px solid #e0e7ff',
                                    fontSize: '13px', color: '#4f46e5', flexShrink: 0,
                                    display: 'flex', alignItems: 'center', gap: '8px'
                                }}>
                                    <span>✨</span>
                                    <span>حدّد أي نص في الدرس للحصول على مساعدة ذكية فورية</span>
                                </div>

                                {/* Scrollable content */}
                                <div
                                    ref={readerScrollRef}
                                    onScroll={handleReaderScroll}
                                    style={S.readerContent}
                                >
                                    <div
                                        ref={lessonReaderRef}
                                        onMouseUp={handleTextSelection}
                                        onTouchEnd={handleTextSelection}
                                        dir="rtl"
                                        style={{ userSelect: 'text', cursor: 'text' }}
                                    >
                                        {renderLessonContent(
                                            showSimplified && activeLessonData.simplified_arabic
                                                ? activeLessonData.simplified_arabic
                                                : activeLessonData.content,
                                            fontSize
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* RIGHT: Tool Sidebar */}
                            <div style={S.sidebar}>

                                {/* Tabs */}
                                <div style={S.tabs}>
                                    {([
                                        { key: 'ai', label: '🤖 المساعد' },
                                        { key: 'podcast', label: '🎧 استماع' },
                                        { key: 'quiz', label: '📝 اختبار' }
                                    ] as { key: TabType; label: string }[]).map(tab => (
                                        <button
                                            key={tab.key}
                                            onClick={() => setActiveTab(tab.key)}
                                            style={activeTab === tab.key ? S.activeTab : S.inactiveTab}
                                        >
                                            {tab.label}
                                        </button>
                                    ))}
                                </div>

                                {/* Tab Content */}
                                <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

                                    {activeTab === 'ai' && (
                                        <StudentChat
                                            lessonId={expandedLessonId}
                                            studentId={studentId}
                                            pendingContext={pendingContext}
                                            onContextConsumed={() => setPendingContext(null)}
                                        />
                                    )}

                                    {activeTab === 'podcast' && (
                                        <div dir="rtl" style={{ padding: '20px', display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto' }}>
                                            <div style={{
                                                padding: '24px', background: 'linear-gradient(135deg, #eff6ff, #f5f3ff)',
                                                borderRadius: '16px', textAlign: 'center', marginBottom: '20px',
                                                border: '1px solid #e0e7ff'
                                            }}>
                                                <div style={{ fontSize: '44px', cursor: 'pointer', marginBottom: '12px' }}>▶️</div>
                                                <div style={{ height: '6px', background: '#e0e7ff', borderRadius: '3px', width: '100%' }}>
                                                    <div style={{ height: '100%', background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)', borderRadius: '3px', width: '30%' }} />
                                                </div>
                                                <p style={{ color: '#6366f1', fontSize: '13px', margin: '10px 0 0 0', fontWeight: 600 }}>
                                                    الاستماع للدرس بالصوت
                                                </p>
                                            </div>
                                            <h4 style={{ marginBottom: '12px', color: '#475569', fontSize: '14px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                                النص الصوتي
                                            </h4>
                                            <div style={{
                                                fontSize: '15px', lineHeight: '1.8', color: '#334155',
                                                overflowY: 'auto', flex: 1, textAlign: 'right'
                                            }}>
                                                {activeLessonData.podcast_script || 'النص الصوتي غير متوفر لهذا الدرس.'}
                                            </div>
                                        </div>
                                    )}

                                    {activeTab === 'quiz' && (() => {
                                        const lesson = activeLessonData;
                                        const isSubmitted = !!quizSubmitted[lesson.id];
                                        const answers = quizAnswers[lesson.id] || {};
                                        let correct = 0;
                                        (lesson.questions || []).forEach(q => { if (answers[q.id] === q.correct_index) correct++; });
                                        const total = lesson.questions?.length || 0;
                                        const percentage = total > 0 ? Math.round((correct / total) * 100) : 0;

                                        if (total === 0) {
                                            return (
                                                <div dir="rtl" style={{ padding: '40px 20px', textAlign: 'center', color: '#94a3b8' }}>
                                                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>📭</div>
                                                    <p>لا يوجد اختبار لهذا الدرس</p>
                                                </div>
                                            );
                                        }

                                        return (
                                            <div dir="rtl" style={{ padding: '20px', overflowY: 'auto', height: '100%', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                                <h3 style={{ margin: 0, textAlign: 'right', color: '#0f172a', fontWeight: 800 }}>
                                                    اختبر نفسك
                                                    <span style={{ marginRight: '8px', fontSize: '13px', fontWeight: 500, color: '#94a3b8' }}>
                                                        ({total} أسئلة)
                                                    </span>
                                                </h3>

                                                {isSubmitted ? (
                                                    <div style={{
                                                        padding: '28px', textAlign: 'center',
                                                        background: percentage >= 70 ? 'linear-gradient(135deg, #f0fdf4, #dcfce7)' : 'linear-gradient(135deg, #fff7ed, #ffedd5)',
                                                        borderRadius: '20px',
                                                        border: `1px solid ${percentage >= 70 ? '#bbf7d0' : '#fed7aa'}`
                                                    }}>
                                                        <div style={{ fontSize: '52px', marginBottom: '12px' }}>
                                                            {percentage >= 70 ? '🏆' : '📚'}
                                                        </div>
                                                        <div style={{
                                                            fontSize: '36px', fontWeight: 900,
                                                            color: percentage >= 70 ? '#16a34a' : '#ea580c'
                                                        }}>
                                                            {percentage}%
                                                        </div>
                                                        <div style={{ color: percentage >= 70 ? '#15803d' : '#c2410c', fontWeight: 600, marginTop: '4px' }}>
                                                            {correct} من {total} إجابة صحيحة
                                                        </div>
                                                        {percentage >= 70 && (
                                                            <div style={{ marginTop: '12px', padding: '8px 16px', background: 'rgba(22,163,74,0.1)', borderRadius: '20px', display: 'inline-block', color: '#15803d', fontWeight: 700, fontSize: '14px' }}>
                                                                +{earnedPoints} نقطة ذكاء 🧠
                                                            </div>
                                                        )}
                                                        <p style={{ color: '#64748b', marginTop: '16px', fontSize: '14px' }}>
                                                            {percentage >= 70 ? 'أداء رائع، استمر!' : 'راجع الدرس مرة أخرى للتحسن.'}
                                                        </p>
                                                        {saveStatus[lesson.id] && (
                                                            <div style={{ fontSize: '13px', color: '#64748b', marginTop: '8px' }}>{saveStatus[lesson.id]}</div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <>
                                                        {(lesson.questions || []).map((q, qIdx) => (
                                                            <div key={q.id} style={S.questionCard}>
                                                                <div style={{ marginBottom: '14px', fontWeight: 700, fontSize: '15px', color: '#1e293b', lineHeight: '1.5' }}>
                                                                    {qIdx + 1}. {q.question}
                                                                </div>
                                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                                    {(q.choices || []).map((choice, cIdx) => (
                                                                        <button
                                                                            key={cIdx}
                                                                            onClick={() => handleAnswerSelect(lesson.id, q.id, cIdx)}
                                                                            style={{
                                                                                ...S.choiceBtn,
                                                                                borderColor: answers[q.id] === cIdx ? '#3b82f6' : '#e2e8f0',
                                                                                background: answers[q.id] === cIdx ? 'linear-gradient(135deg, #eff6ff, #f0f9ff)' : '#fff',
                                                                                color: answers[q.id] === cIdx ? '#1d4ed8' : '#334155',
                                                                                fontWeight: answers[q.id] === cIdx ? 700 : 400,
                                                                                transform: answers[q.id] === cIdx ? 'scale(1.01)' : 'scale(1)'
                                                                            }}
                                                                        >
                                                                            <span style={{
                                                                                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                                                                width: '24px', height: '24px', borderRadius: '50%', flexShrink: 0,
                                                                                background: answers[q.id] === cIdx ? '#3b82f6' : '#f1f5f9',
                                                                                color: answers[q.id] === cIdx ? '#fff' : '#94a3b8',
                                                                                fontSize: '12px', fontWeight: 700, marginLeft: '10px'
                                                                            }}>
                                                                                {String.fromCharCode(65 + cIdx)}
                                                                            </span>
                                                                            {choice}
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        ))}
                                                        <button
                                                            onClick={() => submitQuiz(lesson.id)}
                                                            style={{
                                                                width: '100%', padding: '15px', fontWeight: 800,
                                                                fontSize: '15px', border: 'none', borderRadius: '12px',
                                                                cursor: Object.keys(answers).length < total ? 'not-allowed' : 'pointer',
                                                                background: Object.keys(answers).length < total
                                                                    ? '#f1f5f9'
                                                                    : 'linear-gradient(135deg, #3b82f6, #6366f1)',
                                                                color: Object.keys(answers).length < total ? '#94a3b8' : '#fff',
                                                                boxShadow: Object.keys(answers).length < total ? 'none' : '0 4px 15px rgba(59,130,246,0.4)',
                                                                transition: 'all 0.2s', marginTop: '8px', marginBottom: '40px'
                                                            }}
                                                        >
                                                            {Object.keys(answers).length < total
                                                                ? `أجب على ${total - Object.keys(answers).length} سؤال متبقي`
                                                                : '✅ تأكيد الإجابات'}
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        );
                                    })()}
                                </div>
                            </div>
                        </div>

                    ) : null}
                </main>

                {/* ── Floating Highlight Toolbar ──────────────────────── */}
                {selection && (
                    <>
                        {/* Invisible backdrop to dismiss */}
                        <div
                            onClick={dismissSelection}
                            style={{ position: 'fixed', inset: 0, zIndex: 998 }}
                        />
                        <div
                            style={{
                                position: 'fixed',
                                top: selection.y - 55,
                                left: selection.x,
                                transform: 'translateX(-50%)',
                                zIndex: 999,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                background: '#1e293b',
                                borderRadius: '30px',
                                padding: '6px 10px',
                                boxShadow: '0 8px 30px rgba(0,0,0,0.25), 0 2px 8px rgba(0,0,0,0.15)',
                                animation: 'fadeUp 0.15s ease-out'
                            }}
                        >
                            {/* Tooltip arrow */}
                            <div style={{
                                position: 'absolute', bottom: '-6px', left: '50%',
                                transform: 'translateX(-50%)', width: 0, height: 0,
                                borderLeft: '6px solid transparent',
                                borderRight: '6px solid transparent',
                                borderTop: '6px solid #1e293b'
                            }} />

                            <button
                                onClick={() => triggerAIAction('ask')}
                                style={S.hlBtn}
                                title="اسأل عن هذا الجزء"
                            >
                                💬 اسأل
                            </button>
                            <div style={{ width: '1px', height: '20px', background: '#334155' }} />
                            <button
                                onClick={() => triggerAIAction('explain')}
                                style={S.hlBtn}
                                title="اشرح هذا الجزء"
                            >
                                📖 اشرح
                            </button>
                            <div style={{ width: '1px', height: '20px', background: '#334155' }} />
                            <button
                                onClick={() => triggerAIAction('test')}
                                style={S.hlBtn}
                                title="اختبرني على هذا الجزء"
                            >
                                🎯 اختبرني
                            </button>
                        </div>
                    </>
                )}

                {/* ── Overlays ────────────────────────────────────────── */}
                {showConfetti && (
                    <div style={{
                        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 9999,
                        backgroundImage: 'url("https://i.imgur.com/39A8n3V.gif")',
                        backgroundSize: 'cover', opacity: 0.5
                    }} />
                )}
                <LevelUpToast show={showLevelUp} newLevel={currentLevel} />

                <style>{`
                    @keyframes slideDown { from { top: -80px; opacity: 0; } to { top: 20px; opacity: 1; } }
                    @keyframes fadeUp { from { opacity: 0; transform: translateX(-50%) translateY(6px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
                    @keyframes spin { to { transform: rotate(360deg); } }
                    * { box-sizing: border-box; }
                    ::-webkit-scrollbar { width: 6px; }
                    ::-webkit-scrollbar-track { background: transparent; }
                    ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
                    ::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
                    .lesson-reader ::selection { background: rgba(59,130,246,0.2); }
                    @media (max-width: 768px) {
                        .split-layout { flex-direction: column !important; }
                        .reader-panel { min-height: 50vh !important; }
                        .right-sidebar { width: 100% !important; min-width: 0 !important; height: 50vh !important; }
                    }
                `}</style>
            </div>
        );
    }

    // ── Join Page ─────────────────────────────────────────────────────────────

    return (
        <div style={S.joinPage}>
            <div style={S.joinCard}>
                <div style={{
                    width: '80px', height: '80px', borderRadius: '50%', margin: '0 auto 24px',
                    background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '36px'
                }}>🎓</div>
                <h1 style={{ fontSize: '26px', fontWeight: 800, margin: '0 0 8px 0', color: '#0f172a' }}>
                    مرحباً بك
                </h1>
                <p dir="rtl" style={{ color: '#64748b', marginBottom: '32px', fontSize: '15px' }}>
                    رمز الفصل:{' '}
                    <code style={{ background: '#f1f5f9', padding: '3px 8px', borderRadius: '6px', fontSize: '13px', color: '#3b82f6', fontWeight: 700 }}>
                        {classId}
                    </code>
                </p>

                <div style={{ marginBottom: '20px', textAlign: 'right' }}>
                    <label dir="rtl" style={{ display: 'block', marginBottom: '8px', color: '#475569', fontWeight: 700, fontSize: '14px' }}>
                        الاسم الكامل
                    </label>
                    <input
                        type="text"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleJoin(); }}
                        placeholder="أدخل اسمك..."
                        style={{
                            width: '100%', padding: '13px 16px', borderRadius: '12px',
                            border: '2px solid #e2e8f0', fontSize: '15px', outline: 'none',
                            transition: 'border-color 0.2s', direction: 'rtl', fontFamily: 'inherit'
                        }}
                        onFocus={e => { e.target.style.borderColor = '#3b82f6'; }}
                        onBlur={e => { e.target.style.borderColor = '#e2e8f0'; }}
                        disabled={loading}
                        dir="rtl"
                    />
                </div>

                {error && (
                    <div dir="rtl" style={{
                        color: '#dc2626', background: '#fef2f2', border: '1px solid #fecaca',
                        padding: '12px 16px', borderRadius: '10px', marginBottom: '20px',
                        textAlign: 'right', fontSize: '14px'
                    }}>⚠️ {error}</div>
                )}

                <button
                    onClick={handleJoin}
                    disabled={loading || !name.trim()}
                    style={{
                        width: '100%', padding: '14px', border: 'none', borderRadius: '12px',
                        fontSize: '16px', fontWeight: 700, cursor: loading || !name.trim() ? 'not-allowed' : 'pointer',
                        background: loading || !name.trim() ? '#f1f5f9' : 'linear-gradient(135deg, #3b82f6, #6366f1)',
                        color: loading || !name.trim() ? '#94a3b8' : '#fff',
                        opacity: loading ? 0.7 : 1,
                        boxShadow: loading || !name.trim() ? 'none' : '0 4px 15px rgba(59,130,246,0.4)',
                        transition: 'all 0.2s'
                    }}
                >
                    {loading ? 'جاري الانضمام...' : 'دخول الفصل 🚀'}
                </button>
            </div>
        </div>
    );
}

// ─── Style Constants ──────────────────────────────────────────────────────────

const COLORS = [
    '#3b82f6, #6366f1',
    '#8b5cf6, #ec4899',
    '#06b6d4, #3b82f6',
    '#10b981, #06b6d4',
    '#f59e0b, #ef4444',
];

const S: Record<string, React.CSSProperties> = {
    page: {
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        backgroundColor: '#f8fafc', fontFamily: "'Inter', system-ui, sans-serif", color: '#1e293b'
    },
    header: {
        backgroundColor: '#fff', borderBottom: '1px solid #e2e8f0',
        padding: '0 24px', position: 'sticky', top: 0, zIndex: 100,
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)', height: '64px',
        display: 'flex', alignItems: 'center'
    },
    headerInner: {
        maxWidth: '1400px', margin: '0 auto', width: '100%',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
    },
    logoMark: {
        width: '36px', height: '36px', borderRadius: '10px',
        background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px'
    },
    classBadge: {
        background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '20px',
        padding: '6px 14px', fontSize: '13px', fontWeight: 600, color: '#64748b'
    },
    studentProfile: { display: 'flex', alignItems: 'center', gap: '10px' },
    avatar: {
        width: '36px', height: '36px', borderRadius: '50%',
        background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
        color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: 800, fontSize: '15px', flexShrink: 0
    },
    mainContainer: {
        flex: 1, maxWidth: '1400px', width: '100%', margin: '0 auto',
        height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column'
    },
    centerState: {
        flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
    },
    spinner: {
        width: '36px', height: '36px', border: '3px solid #e2e8f0',
        borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 0.7s linear infinite'
    },
    emptyState: {
        flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', textAlign: 'center', padding: '40px'
    },
    lessonList: {
        maxWidth: '700px', width: '100%', margin: '40px auto', padding: '0 24px', flex: 1, overflowY: 'auto'
    },
    lessonCard: {
        padding: '20px 24px', background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0',
        marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s',
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
    },
    lessonIndex: {
        width: '44px', height: '44px', borderRadius: '12px', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#fff', fontWeight: 800, fontSize: '16px'
    },
    startBtn: {
        padding: '9px 20px', background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
        color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 700,
        fontSize: '14px', cursor: 'pointer', flexShrink: 0
    },

    // Split screen
    splitLayout: {
        display: 'flex', flex: 1, gap: '0', minHeight: '0', overflow: 'hidden'
    },
    readerPanel: {
        flex: 1, display: 'flex', flexDirection: 'column', borderRight: '1px solid #e2e8f0',
        backgroundColor: '#fafafa', minWidth: '0', overflow: 'hidden'
    },
    readerHeader: {
        padding: '14px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        borderBottom: '1px solid #e2e8f0', backgroundColor: '#fff', flexShrink: 0
    },
    readerContent: {
        flex: 1, overflowY: 'auto', padding: '24px 48px 48px 48px'
    },
    backBtn: {
        background: 'transparent', border: '1px solid #e2e8f0', color: '#64748b',
        fontSize: '14px', fontWeight: 600, cursor: 'pointer', padding: '8px 14px',
        borderRadius: '8px', transition: 'all 0.2s'
    },
    pillBtn: {
        border: '1px solid #e2e8f0', borderRadius: '20px', padding: '6px 14px',
        fontSize: '13px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s'
    },
    sidebar: {
        width: '420px', minWidth: '420px', backgroundColor: '#fff',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        boxShadow: '-2px 0 8px rgba(0,0,0,0.04)'
    },
    tabs: {
        display: 'flex', borderBottom: '1px solid #e2e8f0',
        backgroundColor: '#f8fafc', flexShrink: 0, padding: '8px 8px 0 8px', gap: '4px'
    },
    activeTab: {
        flex: 1, padding: '10px 8px', border: 'none', borderRadius: '10px 10px 0 0',
        background: '#fff', color: '#3b82f6', fontWeight: 700,
        cursor: 'pointer', fontSize: '13px', boxShadow: '0 -2px 0 #3b82f6 inset',
        transition: 'all 0.2s'
    },
    inactiveTab: {
        flex: 1, padding: '10px 8px', border: 'none', borderRadius: '10px 10px 0 0',
        background: 'transparent', color: '#64748b', fontWeight: 600,
        cursor: 'pointer', fontSize: '13px', transition: 'all 0.2s'
    },

    // Quiz
    questionCard: {
        padding: '18px', background: '#fafafa', borderRadius: '14px',
        border: '1px solid #e2e8f0', direction: 'rtl', textAlign: 'right'
    },
    choiceBtn: {
        padding: '12px 14px', borderRadius: '10px', textAlign: 'right',
        fontSize: '14px', borderWidth: '2px', borderStyle: 'solid',
        cursor: 'pointer', transition: 'all 0.15s', width: '100%',
        display: 'flex', alignItems: 'center', direction: 'rtl'
    },

    // Highlight toolbar
    hlBtn: {
        background: 'transparent', border: 'none', color: '#e2e8f0',
        fontSize: '13px', fontWeight: 700, cursor: 'pointer', padding: '6px 10px',
        borderRadius: '20px', transition: 'all 0.15s', whiteSpace: 'nowrap'
    },

    // Join page
    joinPage: {
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(135deg, #eff6ff 0%, #f5f3ff 50%, #fdf2f8 100%)',
        padding: '20px'
    },
    joinCard: {
        backgroundColor: '#fff', padding: '48px', borderRadius: '24px', width: '100%',
        maxWidth: '440px', textAlign: 'center',
        boxShadow: '0 25px 50px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04)'
    },
};
