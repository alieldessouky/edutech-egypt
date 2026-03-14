"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { Lesson, Attempt, loadLessons, loadAttemptsByLesson, saveAttempt, type Achievement, type Question } from "../lib/storage";
import { StudentChat } from "../components/StudentChat";
import { useCloudTTS } from "../hooks/useCloudTTS";
import DifficultyBadge from "../components/DifficultyBadge";
import QuizProgressBar from "../components/QuizProgressBar";
import AnswerFeedback from "../components/AnswerFeedback";
import ConfettiCelebration from "../components/ConfettiCelebration";
import AchievementUnlockModal from "../components/AchievementUnlockModal";
import LevelUpToast from "../components/LevelUpToast";
import { gradeQuiz } from "../lib/grading";
import { processQuizCompletion } from "../lib/gamification";
import { updateStudentProgress } from "../lib/adaptive";

type TabType = 'ai' | 'content' | 'quiz';

type SelectionState = {
    text: string;
    x: number;
    y: number;
} | null;

type PendingContext = {
    text: string;
    action: 'ask' | 'explain' | 'test';
} | null;

const LESSON_COLORS = [
    '#3b82f6, #6366f1',
    '#8b5cf6, #ec4899',
    '#06b6d4, #3b82f6',
    '#10b981, #06b6d4',
    '#f59e0b, #ef4444',
];

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
                    <li key={i} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', marginBottom: '10px', direction: 'rtl' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#1a56db', flexShrink: 0, marginTop: '10px' }} />
                        <span style={{ fontSize: fontSize - 1, lineHeight: 1.9, color: '#334155', fontFamily: 'var(--font-cairo), "Noto Naskh Arabic", system-ui', flex: 1, textAlign: 'right' }}>{item}</span>
                    </li>
                ))}
            </ul>
        );
        bulletBuffer = [];
    };

    for (const raw of lines) {
        const line = raw.trim();
        if (!line) { flushBullets(); flushPara(); continue; }

        const boldHeading = line.match(/^\*\*(.+?)\*\*$/);
        if (boldHeading) {
            flushBullets(); flushPara();
            elements.push(<div key={elements.length} style={{ fontSize: fontSize + 3, fontWeight: 800, color: '#1a56db', margin: '28px 0 12px 0', paddingBottom: '8px', borderBottom: '2px solid #e0e7ff', textAlign: 'right', fontFamily: 'var(--font-cairo), "Noto Naskh Arabic", system-ui', letterSpacing: '-0.3px' }}>{boldHeading[1]}</div>);
            continue;
        }

        const noEndPunct = !/[.،؟!:…]$/.test(line);
        if (line.length < 50 && noEndPunct && !line.startsWith('-') && !line.startsWith('•') && !/^\d+\./.test(line)) {
            flushBullets(); flushPara();
            elements.push(<div key={elements.length} style={{ fontSize: fontSize + 2, fontWeight: 700, color: '#0f172a', margin: '24px 0 10px 0', textAlign: 'right', fontFamily: 'var(--font-cairo), "Noto Naskh Arabic", system-ui' }}>{line}</div>);
            continue;
        }

        if (/^[-•*]\s+/.test(line)) {
            flushPara();
            bulletBuffer.push(line.replace(/^[-•*]\s+/, ''));
            continue;
        }

        const numberedMatch = line.match(/^(\d+|[١-٩][٠-٩]*)\.\s+(.+)/);
        if (numberedMatch) {
            flushPara(); flushBullets();
            elements.push(<div key={elements.length} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', marginBottom: '10px', direction: 'rtl' }}>
                <span style={{ minWidth: '26px', height: '26px', borderRadius: '50%', background: '#e0e7ff', color: '#1a56db', fontSize: '13px', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '4px' }}>{numberedMatch[1]}</span>
                <span style={{ fontSize: fontSize - 1, lineHeight: 1.9, color: '#334155', fontFamily: 'var(--font-cairo), "Noto Naskh Arabic", system-ui', flex: 1, textAlign: 'right' }}>{numberedMatch[2]}</span>
            </div>);
            continue;
        }

        flushBullets();
        paraBuffer.push(line);
    }

    flushBullets();
    flushPara();
    return elements;
}

export default function StudentPage() {
    const [lessons, setLessons] = useState<Lesson[]>([]);
    const [openLessonId, setOpenLessonId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<TabType>('content');

    // Quiz state
    const [answers, setAnswers] = useState<Record<string, number>>({});
    const [attempts, setAttempts] = useState<Attempt[]>([]);
    const [loadingAttempts, setLoadingAttempts] = useState(false);

    // Real-time feedback state
    const [answeredCorrect, setAnsweredCorrect] = useState<Set<number>>(new Set());
    const [showFeedback, setShowFeedback] = useState<{ index: number; isCorrect: boolean; points: number } | null>(null);

    // Celebration state
    const [showConfetti, setShowConfetti] = useState(false);
    const [newAchievements, setNewAchievements] = useState<Achievement[]>([]);
    const [levelUpInfo, setLevelUpInfo] = useState<{ show: boolean; oldLevel: number; newLevel: number }>({ show: false, oldLevel: 1, newLevel: 1 });

    // Points and progression
    const [pointsEarned, setPointsEarned] = useState(0);
    const [progressionMessage, setProgressionMessage] = useState<string>('');

    const [studentId] = useState('student-default');

    // Highlight-to-AI
    const [selection, setSelection] = useState<SelectionState>(null);
    const [pendingContext, setPendingContext] = useState<PendingContext>(null);
    const lessonReaderRef = useRef<HTMLDivElement>(null);

    // Simplified Arabic
    const [showSimplified, setShowSimplified] = useState(false);

    // Font size controls
    const [fontSize, setFontSize] = useState(18);

    // Reading progress
    const [readingProgress, setReadingProgress] = useState(0);
    const readerScrollRef = useRef<HTMLDivElement>(null);

    const { speak: speakSummary, stop: stopSummary, isPlaying: isSummaryPlaying } = useCloudTTS();

    useEffect(() => {
        loadLessons().then(loadedLessons => {
            const migratedLessons = loadedLessons.map(lesson => ({
                ...lesson,
                questions: lesson.questions?.map((q, idx) => ({
                    ...q,
                    id: q.id || `q-${lesson.id}-${idx}`,
                    difficulty: q.difficulty || 'easy',
                    points: q.points || 10,
                    question_type: q.question_type || 'mcq',
                    type_data: q.type_data || { choices: q.choices || [], correctIndex: q.correctIndex || 0 }
                }))
            }));
            setLessons(migratedLessons);
        });
    }, []);

    useEffect(() => {
        if (openLessonId) {
            setLoadingAttempts(true);
            loadAttemptsByLesson(openLessonId).then(data => {
                setAttempts(data);
                setAnswers({});
                setLoadingAttempts(false);
            });
            setAnsweredCorrect(new Set());
            setShowFeedback(null);
            setPointsEarned(0);
            setProgressionMessage('');
            setActiveTab('content');
            setShowSimplified(false);
            setReadingProgress(0);
            setSelection(null);
            setPendingContext(null);
        }
    }, [openLessonId]);

    // ── Highlight-to-AI ───────────────────────────────────────────────────────

    const handleTextSelection = useCallback(() => {
        const sel = window.getSelection();
        if (!sel || sel.isCollapsed || !sel.toString().trim()) { setSelection(null); return; }
        const text = sel.toString().trim();
        if (text.length < 5) { setSelection(null); return; }
        const range = sel.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        setSelection({ text, x: rect.left + rect.width / 2, y: rect.top - 10 + window.scrollY });
    }, []);

    const triggerAIAction = (action: 'ask' | 'explain' | 'test') => {
        if (!selection) return;
        setPendingContext({ text: selection.text, action });
        setActiveTab('ai');
        setSelection(null);
        window.getSelection()?.removeAllRanges();
    };

    const handleReaderScroll = useCallback(() => {
        const el = readerScrollRef.current;
        if (!el) return;
        const progress = el.scrollTop / (el.scrollHeight - el.clientHeight);
        setReadingProgress(Math.min(100, Math.round(progress * 100)));
    }, []);

    // ── Quiz handlers ────────────────────────────────────────────────────────

    const handleAnswerWithFeedback = (questionIndex: number, choiceIndex: number, question: Question) => {
        setAnswers(prev => ({ ...prev, [questionIndex]: choiceIndex }));
        const isCorrect = choiceIndex === question.correctIndex;
        if (isCorrect) setAnsweredCorrect(prev => new Set(prev).add(questionIndex));
        else setAnsweredCorrect(prev => { const s = new Set(prev); s.delete(questionIndex); return s; });
        setShowFeedback({ index: questionIndex, isCorrect, points: isCorrect ? (question.points || 10) : 0 });
        setTimeout(() => setShowFeedback(null), 2000);
    };

    const submitQuiz = async (lessonId: string, questions: NonNullable<Lesson['questions']>) => {
        try {
            const answersForGrading: Record<string, { selectedIndex: number }> = {};
            questions.forEach((q, idx) => {
                if (answers[idx] !== undefined) answersForGrading[q.id] = { selectedIndex: answers[idx] };
            });
            const gradingResult = gradeQuiz(questions, answersForGrading);
            const answersRecord: Record<string, string> = {};
            questions.forEach((_, idx) => { if (answers[idx] !== undefined) answersRecord[String(idx)] = String(answers[idx]); });

            const newAttempt: Attempt = {
                id: crypto.randomUUID(), studentName: 'Student', lessonId,
                answers: answersRecord, score: gradingResult.totalCorrect,
                totalQuestions: questions.length, createdAt: Date.now(),
                points_earned: gradingResult.totalPoints
            };
            await saveAttempt(newAttempt);

            let gamificationResult;
            try {
                gamificationResult = await processQuizCompletion(studentId, lessonId, questions, gradingResult.results, attempts.length === 0);
            } catch {
                gamificationResult = { pointsEarned: gradingResult.totalPoints, isPerfect: gradingResult.totalCorrect === questions.length, leveledUp: false, streakUpdate: { streakIncreased: false, streakBroken: false, currentStreak: 0 }, newAchievements: [], motivationalMessage: '' };
            }

            let adaptiveResult: any = {};
            try { adaptiveResult = await updateStudentProgress(studentId, lessonId, newAttempt); } catch { /* silent */ }

            setPointsEarned(gamificationResult.pointsEarned);
            if (gamificationResult.isPerfect) { setShowConfetti(true); setTimeout(() => setShowConfetti(false), 5000); }
            if (gamificationResult.leveledUp) setLevelUpInfo({ show: true, oldLevel: gamificationResult.oldLevel!, newLevel: gamificationResult.newLevel! });
            if (gamificationResult.newAchievements.length > 0) setNewAchievements(gamificationResult.newAchievements);
            if (adaptiveResult.progressionMessage) setProgressionMessage(adaptiveResult.progressionMessage);

            const freshAttempts = await loadAttemptsByLesson(lessonId);
            setAttempts(freshAttempts);
        } catch (e) {
            console.error('Quiz submission error:', e);
            alert('Failed to save result. Please try again.');
        }
    };

    const getLatestAttempt = () => attempts.length > 0 ? attempts[0] : null;

    const openLesson = (id: string) => setOpenLessonId(id);
    const closeLesson = () => { setOpenLessonId(null); stopSummary(); };

    // ── Render ────────────────────────────────────────────────────────────────

    const activeLessonData = openLessonId ? lessons.find(l => l.id === openLessonId) : null;

    return (
        <div style={S.page}>
            {/* Header */}
            <header style={S.header}>
                <div style={S.headerInner}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={S.logoMark}>🎓</div>
                        <div>
                            <div style={{ fontWeight: 800, fontSize: '16px', color: '#1e293b' }}>EduTech Egypt</div>
                            {activeLessonData && (
                                <div style={{ fontSize: '12px', color: '#94a3b8' }}>{activeLessonData.title}</div>
                            )}
                        </div>
                    </div>
                    <div style={{ fontSize: '13px', color: '#94a3b8', fontWeight: 500 }}>بوابة الطالب</div>
                </div>
            </header>

            <main style={S.mainContainer}>
                {/* ── Lesson List ─────────────────────────────────────── */}
                {!openLessonId && (
                    <div style={S.listView}>
                        {lessons.length === 0 ? (
                            <div style={S.emptyState}>
                                <div style={{ fontSize: '56px', marginBottom: '16px' }}>📚</div>
                                <h3 style={{ margin: 0, color: '#475569', fontWeight: 700 }}>لا توجد دروس بعد</h3>
                                <p style={{ color: '#94a3b8', marginTop: '8px', marginBottom: '24px' }}>
                                    اطلب من معلمك إنشاء درس على{' '}
                                    <a href="/teacher" style={{ color: '#3b82f6', fontWeight: 600 }}>/teacher</a>
                                </p>
                            </div>
                        ) : (
                            <>
                                <div dir="rtl" style={{ marginBottom: '32px' }}>
                                    <h2 style={{ margin: '0 0 6px 0', fontSize: '24px', color: '#0f172a', fontWeight: 800 }}>دروسك</h2>
                                    <p style={{ margin: 0, color: '#64748b', fontSize: '15px' }}>اختر درساً لتبدأ التعلم</p>
                                </div>
                                {lessons.map((lesson, idx) => (
                                    <div
                                        key={lesson.id}
                                        onClick={() => openLesson(lesson.id)}
                                        style={S.lessonCard}
                                        onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 8px 25px rgba(0,0,0,0.1)'; }}
                                        onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 8px rgba(0,0,0,0.05)'; }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                            <div style={{ ...S.lessonIndex, background: `linear-gradient(135deg, ${LESSON_COLORS[idx % LESSON_COLORS.length]})` }}>
                                                {idx + 1}
                                            </div>
                                            <div dir="rtl">
                                                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: '#1e293b' }}>{lesson.title}</h3>
                                                <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#94a3b8' }}>
                                                    {lesson.questions?.length ? `${lesson.questions.length} سؤال` : 'قراءة فقط'} •{' '}
                                                    {new Date(lesson.createdAt).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' })}
                                                </p>
                                            </div>
                                        </div>
                                        <button style={S.startBtn} tabIndex={-1}>ابدأ →</button>
                                    </div>
                                ))}
                            </>
                        )}
                    </div>
                )}

                {/* ── Split-Screen View ─────────────────────────────── */}
                {openLessonId && activeLessonData && (
                    <div style={S.splitLayout}>

                        {/* LEFT: Reader */}
                        <div style={S.readerPanel}>
                            <div style={S.readerHeader}>
                                <button onClick={closeLesson} style={S.backBtn}>← العودة</button>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <button
                                        onClick={() => isSummaryPlaying ? stopSummary() : speakSummary(activeLessonData.content)}
                                        style={{ ...S.pillBtn, background: isSummaryPlaying ? '#fef2f2' : '#f1f5f9', color: isSummaryPlaying ? '#dc2626' : '#64748b', border: `1px solid ${isSummaryPlaying ? '#fecaca' : '#e2e8f0'}` }}
                                    >
                                        {isSummaryPlaying ? '⏹ إيقاف' : '🔈 استمع'}
                                    </button>
                                    {activeLessonData.simplified_arabic && (
                                        <button
                                            onClick={() => setShowSimplified(v => !v)}
                                            style={{ ...S.pillBtn, background: showSimplified ? '#3b82f6' : '#f1f5f9', color: showSimplified ? '#fff' : '#64748b', border: showSimplified ? '1px solid #3b82f6' : '1px solid #e2e8f0' }}
                                        >
                                            {showSimplified ? '📖 نص كامل' : '🔤 مبسّط'}
                                        </button>
                                    )}
                                    <button onClick={() => setFontSize(s => Math.max(15, s - 1))} style={{ ...S.pillBtn, background: '#f1f5f9', color: '#64748b', padding: '6px 11px' }} title="تصغير الخط">A-</button>
                                    <button onClick={() => setFontSize(s => Math.min(24, s + 1))} style={{ ...S.pillBtn, background: '#f1f5f9', color: '#64748b', padding: '6px 11px' }} title="تكبير الخط">A+</button>
                                </div>
                            </div>

                            {/* Reading progress bar */}
                            <div style={{ height: '3px', background: '#f1f5f9', flexShrink: 0 }}>
                                <div style={{ height: '100%', width: `${readingProgress}%`, background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)', transition: 'width 0.2s ease', borderRadius: '0 2px 2px 0' }} />
                            </div>

                            {/* Title */}
                            <div dir="rtl" style={{ padding: '24px 32px 0 32px', flexShrink: 0 }}>
                                <h1 style={{ margin: 0, fontSize: '26px', fontWeight: 800, color: '#0f172a', lineHeight: 1.3 }}>{activeLessonData.title}</h1>
                                <div style={{ marginTop: '8px', fontSize: '13px', color: '#94a3b8', display: 'flex', gap: '12px' }}>
                                    <span>📅 {new Date(activeLessonData.createdAt).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' })}</span>
                                    {readingProgress > 0 && <span>📖 {readingProgress}% قرأت</span>}
                                </div>
                            </div>

                            {/* Highlight tip */}
                            <div dir="rtl" style={{ margin: '16px 32px 0 32px', padding: '10px 14px', background: 'linear-gradient(135deg, #eff6ff, #f5f3ff)', borderRadius: '10px', border: '1px solid #e0e7ff', fontSize: '13px', color: '#4f46e5', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span>✨</span>
                                <span>حدّد أي نص في الدرس للحصول على مساعدة ذكية فورية</span>
                            </div>

                            {/* Scrollable content */}
                            <div ref={readerScrollRef} onScroll={handleReaderScroll} style={S.readerContent}>
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

                        {/* RIGHT: Sidebar */}
                        <div style={S.sidebar}>
                            <div style={S.tabs}>
                                {([
                                    { key: 'ai', label: '🤖 المساعد' },
                                    { key: 'quiz', label: '📝 اختبار' },
                                ] as { key: TabType; label: string }[]).map(tab => (
                                    <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={activeTab === tab.key ? S.activeTab : S.inactiveTab}>
                                        {tab.label}
                                    </button>
                                ))}
                            </div>

                            <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

                                {activeTab === 'ai' && (
                                    <StudentChat
                                        lessonId={openLessonId}
                                        studentId={studentId}
                                        pendingContext={pendingContext}
                                        onContextConsumed={() => setPendingContext(null)}
                                    />
                                )}

                                {activeTab === 'quiz' && (() => {
                                    const hasQuiz = activeLessonData.questions && activeLessonData.questions.length > 0;
                                    const totalQuestions = activeLessonData.questions?.length || 0;
                                    const attempt = getLatestAttempt();

                                    if (!hasQuiz) return (
                                        <div dir="rtl" style={{ padding: '40px 20px', textAlign: 'center', color: '#94a3b8' }}>
                                            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📭</div>
                                            <p>لا يوجد اختبار لهذا الدرس</p>
                                        </div>
                                    );

                                    if (loadingAttempts) return (
                                        <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>جاري التحميل...</div>
                                    );

                                    if (attempt) {
                                        // Results view
                                        const percentage = Math.round((attempt.score / totalQuestions) * 100);
                                        return (
                                            <div dir="rtl" style={{ padding: '20px', overflowY: 'auto', height: '100%' }}>
                                                <ConfettiCelebration trigger={showConfetti} duration={5000} />
                                                <LevelUpToast show={levelUpInfo.show} oldLevel={levelUpInfo.oldLevel} newLevel={levelUpInfo.newLevel} onClose={() => setLevelUpInfo({ ...levelUpInfo, show: false })} />
                                                {newAchievements.length > 0 && <AchievementUnlockModal achievements={newAchievements} onClose={() => setNewAchievements([])} />}

                                                <div style={{ padding: '28px', textAlign: 'center', background: percentage >= 70 ? 'linear-gradient(135deg, #f0fdf4, #dcfce7)' : 'linear-gradient(135deg, #fff7ed, #ffedd5)', borderRadius: '20px', border: `1px solid ${percentage >= 70 ? '#bbf7d0' : '#fed7aa'}`, marginBottom: '20px' }}>
                                                    <div style={{ fontSize: '52px', marginBottom: '12px' }}>{attempt.score === totalQuestions ? '🎉' : percentage >= 70 ? '🏆' : '📚'}</div>
                                                    <div style={{ fontSize: '36px', fontWeight: 900, color: percentage >= 70 ? '#16a34a' : '#ea580c' }}>{attempt.score} / {totalQuestions}</div>
                                                    <div style={{ color: percentage >= 70 ? '#15803d' : '#c2410c', fontWeight: 600, marginTop: '4px', fontSize: '14px' }}>{percentage}%</div>

                                                    {pointsEarned > 0 && (
                                                        <div style={{ marginTop: '12px', padding: '8px 16px', background: 'rgba(255,215,0,0.15)', borderRadius: '20px', display: 'inline-block', color: '#92400e', fontWeight: 700, fontSize: '14px' }}>
                                                            🏆 كسبت {pointsEarned} نقطة!
                                                        </div>
                                                    )}
                                                    {progressionMessage && (
                                                        <div style={{ marginTop: '12px', padding: '10px 14px', background: '#d1fae5', borderRadius: '10px', color: '#065f46', fontSize: '13px', fontWeight: 600 }}>
                                                            {progressionMessage}
                                                        </div>
                                                    )}
                                                </div>

                                                {attempt.score < totalQuestions && (
                                                    <div style={{ marginBottom: '20px' }}>
                                                        <h5 style={{ margin: '0 0 10px 0', color: '#dc2626', fontSize: '13px', fontWeight: 700, textTransform: 'uppercase' }}>
                                                            🚀 ركّز عليها
                                                        </h5>
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                            {activeLessonData.questions?.map((q, qIdx) => {
                                                                const userChoice = parseInt(attempt.answers[String(qIdx)] || '-1', 10);
                                                                if (userChoice !== q.correctIndex) {
                                                                    return (
                                                                        <div key={qIdx} style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', fontSize: '13px', color: '#dc2626' }}>
                                                                            {q.text}
                                                                        </div>
                                                                    );
                                                                }
                                                                return null;
                                                            })}
                                                        </div>
                                                    </div>
                                                )}

                                                <button
                                                    onClick={() => { setOpenLessonId(null); setTimeout(() => setOpenLessonId(activeLessonData.id), 0); }}
                                                    style={{ width: '100%', padding: '13px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '12px', fontSize: '14px', color: '#475569', fontWeight: 700, cursor: 'pointer' }}
                                                >
                                                    إعادة الاختبار ↺
                                                </button>
                                            </div>
                                        );
                                    }

                                    // Quiz taking view
                                    return (
                                        <div dir="rtl" style={{ padding: '20px', overflowY: 'auto', height: '100%', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                            <div style={{ marginBottom: '4px' }}>
                                                <h3 style={{ margin: 0, color: '#0f172a', fontWeight: 800 }}>اختبر نفسك</h3>
                                                <QuizProgressBar current={Object.keys(answers).length + 1} total={totalQuestions} correctCount={answeredCorrect.size} />
                                            </div>

                                            {activeLessonData.questions?.map((q, qIdx) => (
                                                <div key={qIdx} style={S.questionCard}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px', gap: '10px' }}>
                                                        <p style={{ fontWeight: 700, margin: 0, color: '#1e293b', fontSize: '15px', lineHeight: 1.5 }}>
                                                            {qIdx + 1}. {q.text}
                                                        </p>
                                                        <DifficultyBadge difficulty={q.difficulty || 'easy'} animated={false} />
                                                    </div>

                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                        {q.choices.map((choice, cIdx) => (
                                                            <button
                                                                key={cIdx}
                                                                onClick={() => handleAnswerWithFeedback(qIdx, cIdx, q)}
                                                                style={{
                                                                    ...S.choiceBtn,
                                                                    borderColor: answers[qIdx] === cIdx ? '#3b82f6' : '#e2e8f0',
                                                                    background: answers[qIdx] === cIdx ? 'linear-gradient(135deg, #eff6ff, #f0f9ff)' : '#fff',
                                                                    color: answers[qIdx] === cIdx ? '#1d4ed8' : '#334155',
                                                                    fontWeight: answers[qIdx] === cIdx ? 700 : 400,
                                                                }}
                                                            >
                                                                <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '24px', height: '24px', borderRadius: '50%', flexShrink: 0, background: answers[qIdx] === cIdx ? '#3b82f6' : '#f1f5f9', color: answers[qIdx] === cIdx ? '#fff' : '#94a3b8', fontSize: '12px', fontWeight: 700, marginLeft: '10px' }}>
                                                                    {String.fromCharCode(65 + cIdx)}
                                                                </span>
                                                                {choice}
                                                            </button>
                                                        ))}
                                                    </div>

                                                    {showFeedback && showFeedback.index === qIdx && (
                                                        <div style={{ marginTop: '10px' }}>
                                                            <AnswerFeedback show isCorrect={showFeedback.isCorrect} points={showFeedback.points} />
                                                        </div>
                                                    )}
                                                </div>
                                            ))}

                                            <button
                                                onClick={() => submitQuiz(activeLessonData.id, activeLessonData.questions!)}
                                                disabled={Object.keys(answers).length !== totalQuestions}
                                                style={{
                                                    width: '100%', padding: '15px', fontWeight: 800, fontSize: '15px',
                                                    border: 'none', borderRadius: '12px', marginBottom: '40px',
                                                    cursor: Object.keys(answers).length !== totalQuestions ? 'not-allowed' : 'pointer',
                                                    background: Object.keys(answers).length !== totalQuestions ? '#f1f5f9' : 'linear-gradient(135deg, #3b82f6, #6366f1)',
                                                    color: Object.keys(answers).length !== totalQuestions ? '#94a3b8' : '#fff',
                                                    boxShadow: Object.keys(answers).length !== totalQuestions ? 'none' : '0 4px 15px rgba(59,130,246,0.4)',
                                                    transition: 'all 0.2s'
                                                }}
                                            >
                                                {Object.keys(answers).length !== totalQuestions
                                                    ? `أجب على ${totalQuestions - Object.keys(answers).length} سؤال متبقي`
                                                    : '✅ إرسال الإجابات'}
                                            </button>
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>
                    </div>
                )}
            </main>

            {/* Floating Highlight Toolbar */}
            {selection && (
                <>
                    <div onClick={() => setSelection(null)} style={{ position: 'fixed', inset: 0, zIndex: 998 }} />
                    <div style={{
                        position: 'fixed', top: selection.y - 55, left: selection.x,
                        transform: 'translateX(-50%)', zIndex: 999,
                        display: 'flex', alignItems: 'center', gap: '6px',
                        background: '#1e293b', borderRadius: '30px', padding: '6px 10px',
                        boxShadow: '0 8px 30px rgba(0,0,0,0.25)', animation: 'fadeUp 0.15s ease-out'
                    }}>
                        <div style={{ position: 'absolute', bottom: '-6px', left: '50%', transform: 'translateX(-50%)', width: 0, height: 0, borderLeft: '6px solid transparent', borderRight: '6px solid transparent', borderTop: '6px solid #1e293b' }} />
                        <button onClick={() => triggerAIAction('ask')} style={S.hlBtn}>💬 اسأل</button>
                        <div style={{ width: '1px', height: '20px', background: '#334155' }} />
                        <button onClick={() => triggerAIAction('explain')} style={S.hlBtn}>📖 اشرح</button>
                        <div style={{ width: '1px', height: '20px', background: '#334155' }} />
                        <button onClick={() => triggerAIAction('test')} style={S.hlBtn}>🎯 اختبرني</button>
                    </div>
                </>
            )}

            <style>{`
                @keyframes fadeUp { from { opacity: 0; transform: translateX(-50%) translateY(6px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
                @keyframes spin { to { transform: rotate(360deg); } }
                * { box-sizing: border-box; }
                ::-webkit-scrollbar { width: 6px; }
                ::-webkit-scrollbar-track { background: transparent; }
                ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
            `}</style>
        </div>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const S: Record<string, React.CSSProperties> = {
    page: { minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#f8fafc', fontFamily: "'Inter', system-ui, sans-serif", color: '#1e293b' },
    header: { backgroundColor: '#fff', borderBottom: '1px solid #e2e8f0', padding: '0 24px', position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', height: '64px', display: 'flex', alignItems: 'center' },
    headerInner: { maxWidth: '1400px', margin: '0 auto', width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    logoMark: { width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg, #3b82f6, #6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' },
    mainContainer: { flex: 1, maxWidth: '1400px', width: '100%', margin: '0 auto', height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column' },
    listView: { maxWidth: '700px', width: '100%', margin: '40px auto', padding: '0 24px', flex: 1, overflowY: 'auto' },
    emptyState: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '60px 40px', background: '#fff', borderRadius: '20px', border: '1px dashed #e2e8f0', marginTop: '40px', direction: 'rtl' },
    lessonCard: { padding: '20px 24px', background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' },
    lessonIndex: { width: '44px', height: '44px', borderRadius: '12px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: '16px' },
    startBtn: { padding: '9px 20px', background: 'linear-gradient(135deg, #3b82f6, #6366f1)', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 700, fontSize: '14px', cursor: 'pointer', flexShrink: 0 },

    splitLayout: { display: 'flex', flex: 1, gap: '0', minHeight: '0', overflow: 'hidden' },
    readerPanel: { flex: 1, display: 'flex', flexDirection: 'column', borderRight: '1px solid #e2e8f0', backgroundColor: '#fafafa', minWidth: '0', overflow: 'hidden' },
    readerHeader: { padding: '14px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', backgroundColor: '#fff', flexShrink: 0 },
    readerContent: { flex: 1, overflowY: 'auto', padding: '24px 48px 48px 48px' },
    backBtn: { background: 'transparent', border: '1px solid #e2e8f0', color: '#64748b', fontSize: '14px', fontWeight: 600, cursor: 'pointer', padding: '8px 14px', borderRadius: '8px', transition: 'all 0.2s' },
    pillBtn: { border: '1px solid #e2e8f0', borderRadius: '20px', padding: '6px 14px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' },

    sidebar: { width: '420px', minWidth: '420px', backgroundColor: '#fff', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '-2px 0 8px rgba(0,0,0,0.04)' },
    tabs: { display: 'flex', borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc', flexShrink: 0, padding: '8px 8px 0 8px', gap: '4px' },
    activeTab: { flex: 1, padding: '10px 8px', border: 'none', borderRadius: '10px 10px 0 0', background: '#fff', color: '#3b82f6', fontWeight: 700, cursor: 'pointer', fontSize: '13px', boxShadow: '0 -2px 0 #3b82f6 inset', transition: 'all 0.2s' },
    inactiveTab: { flex: 1, padding: '10px 8px', border: 'none', borderRadius: '10px 10px 0 0', background: 'transparent', color: '#64748b', fontWeight: 600, cursor: 'pointer', fontSize: '13px', transition: 'all 0.2s' },

    questionCard: { padding: '18px', background: '#fafafa', borderRadius: '14px', border: '1px solid #e2e8f0', direction: 'rtl', textAlign: 'right' },
    choiceBtn: { padding: '12px 14px', borderRadius: '10px', textAlign: 'right', fontSize: '14px', borderWidth: '2px', borderStyle: 'solid', cursor: 'pointer', transition: 'all 0.15s', width: '100%', display: 'flex', alignItems: 'center', direction: 'rtl' },

    hlBtn: { background: 'transparent', border: 'none', color: '#e2e8f0', fontSize: '13px', fontWeight: 700, cursor: 'pointer', padding: '6px 10px', borderRadius: '20px', transition: 'all 0.15s', whiteSpace: 'nowrap' },
};
