'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import { StudentChat } from '../../components/StudentChat';

// --- Gamification Components Imported Logically ---
// We will build simplified inline versions of these to ensure they work seamlessly here
const LevelUpToast = ({ show, newLevel }: { show: boolean, newLevel: number }) => {
    if (!show) return null;
    return (
        <div style={{
            position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)',
            background: 'linear-gradient(135deg, #ffd700, #ff8c00)', color: 'white',
            padding: '15px 30px', border: '2px solid white', borderRadius: '50px',
            boxShadow: '0 10px 25px rgba(255, 140, 0, 0.5)', zIndex: 1000,
            display: 'flex', alignItems: 'center', gap: '15px', animation: 'slideDown 0.5s ease-out'
        }}>
            <span style={{ fontSize: '32px' }}>⭐</span>
            <div dir="rtl" style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontWeight: 800, fontSize: '18px', textShadow: '1px 1px 2px rgba(0,0,0,0.2)' }}>مستوى جديد!</span>
                <span style={{ fontWeight: 600, fontSize: '14px' }}>أنت الآن في المستوى {newLevel}</span>
            </div>
        </div>
    );
};

// Local types
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

export default function StudentJoinPage() {
    const params = useParams();
    const classId = Array.isArray(params.classId) ? params.classId[0] : params.classId;

    const [name, setName] = useState('');
    const [joinedName, setJoinedName] = useState<string | null>(null);
    const [isJoined, setIsJoined] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [studentId, setStudentId] = useState('');

    // Lessons State
    const [lessons, setLessons] = useState<Lesson[]>([]);
    const [loadingLessons, setLoadingLessons] = useState(false);
    const [expandedLessonId, setExpandedLessonId] = useState<string | null>(null);

    // Sidebar State
    type TabType = 'ai' | 'podcast' | 'quiz';
    const [activeTab, setActiveTab] = useState<TabType>('ai');

    // AI Chat trigger state

    // Quiz State
    const [quizAnswers, setQuizAnswers] = useState<Record<string, Record<string, number>>>({});
    const [quizSubmitted, setQuizSubmitted] = useState<Record<string, boolean>>({});
    const [saveStatus, setSaveStatus] = useState<Record<string, string>>({});

    // Gamification State
    const [showLevelUp, setShowLevelUp] = useState(false);
    const [currentLevel, setCurrentLevel] = useState(1);
    const [showConfetti, setShowConfetti] = useState(false);
    const [earnedPoints, setEarnedPoints] = useState(0);

    // Initial student load
    useEffect(() => {
        const storedStudentId = localStorage.getItem('student_id');
        if (storedStudentId) {
            setStudentId(storedStudentId);
            fetchStudentProfile(storedStudentId);
        }
    }, []);

    const fetchStudentProfile = async (id: string) => {
        try {
            const { data, error } = await supabase
                .from('students')
                .select('display_name')
                .eq('id', id)
                .single();

            if (data) {
                setJoinedName(data.display_name);
                setIsJoined(true);
            }
        } catch (e) {
            console.error('Failed to restore student session', e);
            localStorage.removeItem('student_id');
        }
    };

    const handleJoin = async () => {
        if (!name.trim() || !classId) return;
        setLoading(true);
        setError('');

        let deviceId = localStorage.getItem('edtech_device_id_v1') || crypto.randomUUID();
        localStorage.setItem('edtech_device_id_v1', deviceId);

        try {
            let currentId = localStorage.getItem('student_id');
            if (currentId) {
                setStudentId(currentId);
                await supabase.from('students').update({ display_name: name, class_id: classId }).eq('id', currentId);
            } else {
                const { data: newStudent, error: insertError } = await supabase
                    .from('students')
                    .insert({ class_id: classId, display_name: name })
                    .select().single();

                if (insertError) throw insertError;
                if (newStudent) {
                    localStorage.setItem('student_id', newStudent.id);
                    setStudentId(newStudent.id);
                }
            }
            setJoinedName(name);
            setIsJoined(true);
        } catch (err: any) {
            setError(err.message || 'Failed to join class.');
        } finally {
            setLoading(false);
        }
    };

    // Fetch lessons once joined
    useEffect(() => {
        if (isJoined && classId) fetchClassLessons();
    }, [isJoined, classId]);

    const fetchClassLessons = async () => {
        setLoadingLessons(true);
        try {
            const { data, error } = await supabase
                .from('lessons')
                .select('*, quizzes(*, questions(*))')
                .eq('class_id', classId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            if (data) {
                const mappedLessons = data.map((l: any) => {
                    const firstQuiz = l.quizzes && l.quizzes.length > 0 ? l.quizzes[0] : null;
                    return {
                        ...l,
                        quiz_id: firstQuiz?.id,
                        questions: firstQuiz ? (firstQuiz.questions || []).sort((a: any, b: any) => a.id.localeCompare(b.id)) : []
                    };
                });
                setLessons(mappedLessons);
            }
        } catch (err) {
            console.error('Error fetching lessons:', err);
        } finally {
            setLoadingLessons(false);
        }
    };

    const toggleLesson = (id: string) => {
        setExpandedLessonId(expandedLessonId === id ? null : id);
        setActiveTab('ai'); // Reset sidebar to AI
    };

    // --- Quiz & Gamification Logic ---
    const handleAnswerSelect = (lessonId: string, questionId: string, choiceIdx: number) => {
        if (quizSubmitted[lessonId]) return;
        setQuizAnswers(prev => ({
            ...prev, [lessonId]: { ...(prev[lessonId] || {}), [questionId]: choiceIdx }
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

        // Trigger gamification
        if (scorePercent >= 70) {
            setShowConfetti(true);
            setEarnedPoints(points);
            setTimeout(() => setShowConfetti(false), 5000); // Hide after 5s
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

            const finalAnswerRows = answerRows.map(r => ({ attempt_id: attemptId, ...r }));
            const { error: answersError } = await supabase.from('attempt_answers').insert(finalAnswerRows);
            if (answersError) throw answersError;

            // Update stats & levels (simplified local simulation)
            const { data: stats } = await supabase.from('student_stats').select('total_points, level').eq('student_id', studentId).single();
            if (stats) {
                const newTotal = (stats.total_points || 0) + points;
                const newLevel = Math.floor(newTotal / 100) + 1;

                if (newLevel > stats.level) {
                    setCurrentLevel(newLevel);
                    setShowLevelUp(true);
                    setTimeout(() => setShowLevelUp(false), 5000);
                }

                await supabase.from('student_stats').update({
                    total_points: newTotal, level: newLevel, total_quizzes: supabase.rpc('increment'),
                    total_questions_answered: supabase.rpc('increment', { x: total }),
                    total_correct_answers: supabase.rpc('increment', { x: correctCount })
                }).eq('student_id', studentId);
            }

            setSaveStatus(prev => ({ ...prev, [lessonId]: 'تم الحفظ بنجاح! ✅' }));
        } catch (err: any) {
            setSaveStatus(prev => ({ ...prev, [lessonId]: `خطأ: ${err.message}` }));
        }
    };


    // --- Render Logic ---

    if (isJoined) {
        return (
            <div style={styles.page}>
                {/* Fixed Header */}
                <header style={styles.header}>
                    <div style={styles.headerInner}>
                        <div style={styles.classChip}>
                            <span style={{ fontSize: '18px' }}>🏫</span>
                            <span>الفصل: {classId?.toString().slice(0, 8)}...</span>
                        </div>
                        <div style={styles.studentProfile}>
                            <div style={styles.avatar}>{joinedName?.[0] || 'S'}</div>
                            <span style={styles.studentName}>{joinedName}</span>
                        </div>
                    </div>
                </header>

                <main style={styles.mainContainer}>
                    {loadingLessons ? (
                        <div style={styles.loadingContainer}>جاري تحميل الدروس...</div>
                    ) : lessons.length === 0 ? (
                        <div style={styles.emptyState}>لا توجد دروس بعد.</div>
                    ) : !expandedLessonId ? (
                        /* List View: When no lesson is selected */
                        <div style={styles.lessonList}>
                            <h2 style={{ textAlign: 'right', marginBottom: '20px' }}>دروس الفصل</h2>
                            {lessons.map(lesson => (
                                <div key={lesson.id} onClick={() => toggleLesson(lesson.id)} style={styles.lessonListItem}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                        <div style={{ fontSize: '24px' }}>📚</div>
                                        <h3 style={{ margin: 0 }}>{lesson.title}</h3>
                                    </div>
                                    <button style={styles.startBtn}>ابدأ الدرس</button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        /* Split-Screen Feature View: When a lesson is Expanded */
                        <div style={styles.splitScreenLayout}>
                            {/* Left Side: The Lesson Reader */}
                            <div className="lesson-reader" style={styles.leftColumn}>

                                <button onClick={() => setExpandedLessonId(null)} style={styles.backBtn}>
                                    ← العودة للدروس
                                </button>

                                {(() => {
                                    const lesson = lessons.find(l => l.id === expandedLessonId);
                                    if (!lesson) return null;
                                    return (
                                        <div style={{ padding: '20px 0', height: '100%', display: 'flex', flexDirection: 'column' }}>
                                            <h1 style={{ fontSize: '28px', color: '#1e293b', marginBottom: '20px', textAlign: 'right' }}>{lesson.title}</h1>

                                            <div style={{
                                                fontSize: '18px', lineHeight: '1.8', color: '#334155',
                                                backgroundColor: 'white', padding: '40px', borderRadius: '16px',
                                                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
                                                textAlign: 'right',
                                                whiteSpace: 'pre-wrap',
                                                overflowY: 'auto',
                                                flex: 1
                                            }}>
                                                {lesson.content}
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>

                            {/* Right Side: Tabbed Tool Sidebar */}
                            <div style={styles.rightSidebar}>
                                <div style={styles.sidebarTabs}>
                                    <button onClick={() => setActiveTab('ai')} style={activeTab === 'ai' ? styles.activeTab : styles.inactiveTab}>
                                        🤖 المساعد الذكي
                                    </button>
                                    <button onClick={() => setActiveTab('podcast')} style={activeTab === 'podcast' ? styles.activeTab : styles.inactiveTab}>
                                        🎧 استماع للدرس
                                    </button>
                                    <button onClick={() => setActiveTab('quiz')} style={activeTab === 'quiz' ? styles.activeTab : styles.inactiveTab}>
                                        📝 اختبر نفسك
                                    </button>
                                </div>

                                <div style={styles.sidebarContent}>
                                    {activeTab === 'ai' && (
                                        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                                            <div dir="rtl" style={{ padding: '15px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontSize: '14px', color: '#475569', textAlign: 'right' }}>
                                                💡 تلميح: يمكنك نسخ أي نص من الدرس وسؤالي عنه لمزيد من الشرح!
                                            </div>
                                            <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                                                <StudentChat lessonId={expandedLessonId} studentId={studentId} />
                                            </div>
                                        </div>
                                    )}

                                    {activeTab === 'podcast' && (
                                        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', height: '100%' }}>
                                            <div style={{ padding: '20px', background: '#f1f5f9', borderRadius: '12px', textAlign: 'center', marginBottom: '20px' }}>
                                                <div style={{ fontSize: '48px', cursor: 'pointer' }}>▶️</div>
                                                <div style={{ height: '6px', background: '#cbd5e1', borderRadius: '3px', width: '100%', marginTop: '15px' }}>
                                                    <div style={{ height: '100%', background: '#3b82f6', borderRadius: '3px', width: '30%' }}></div>
                                                </div>
                                            </div>
                                            <h4 dir="rtl" style={{ marginBottom: '10px', textAlign: 'right' }}>النص الصوتي:</h4>
                                            <div dir="rtl" style={{ fontSize: '15px', lineHeight: '1.6', color: '#475569', overflowY: 'auto', flex: 1, textAlign: 'right', whiteSpace: 'pre-wrap' }}>
                                                {lessons.find(l => l.id === expandedLessonId)?.podcast_script || "عذراً، النص الصوتي غير متوفر."}
                                            </div>
                                        </div>
                                    )}

                                    {activeTab === 'quiz' && (() => {
                                        const lesson = lessons.find(l => l.id === expandedLessonId);
                                        const isSubmitted = !!quizSubmitted[lesson!.id];
                                        const answers = quizAnswers[lesson!.id] || {};

                                        let correct = 0;
                                        (lesson!.questions || []).forEach(q => { if (answers[q.id] === q.correct_index) correct++; });
                                        const total = lesson!.questions?.length || 0;
                                        const percentage = total > 0 ? Math.round((correct / total) * 100) : 0;

                                        return (
                                            <div dir="rtl" style={{ padding: '20px', overflowY: 'auto', height: '100%', paddingBottom: '40px' }}>
                                                <h3 style={{ marginBottom: '20px', textAlign: 'right' }}>تمرين سريع ({total} أسئلة)</h3>

                                                {isSubmitted ? (
                                                    <div style={{ padding: '30px', background: percentage >= 70 ? '#f0fdf4' : '#fff7ed', borderRadius: '16px', textAlign: 'center', border: `2px solid ${percentage >= 70 ? '#bbf7d0' : '#ffedd5'}`, marginBottom: '40px' }}>
                                                        <div style={{ fontSize: '48px', marginBottom: '15px' }}>{percentage >= 70 ? '🏆' : '📚'}</div>
                                                        <div style={{ fontSize: '24px', fontWeight: 800, color: percentage >= 70 ? '#16a34a' : '#ea580c' }}>
                                                            النتيجة: {percentage}%
                                                        </div>
                                                        {percentage >= 70 && (
                                                            <div style={{ marginTop: '10px', color: '#15803d', fontWeight: 600 }}>
                                                                + {earnedPoints} نقطة ذكاء! 🧠
                                                            </div>
                                                        )}
                                                        <div style={{ color: '#475569', marginTop: '15px' }}>لقد تدرّبت بشكل رائع.</div>
                                                    </div>
                                                ) : (
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: '40px' }}>
                                                        {(lesson!.questions || []).map((q, qIdx) => (
                                                            <div key={q.id} style={{ padding: '20px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                                                <div style={{ marginBottom: '15px', fontWeight: 600, fontSize: '15px', textAlign: 'right' }}>
                                                                    {qIdx + 1}. {q.question}
                                                                </div>
                                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                                                    {(q.choices || []).map((choice, cIdx) => (
                                                                        <button key={cIdx}
                                                                            onClick={() => handleAnswerSelect(lesson!.id, q.id, cIdx)}
                                                                            style={{
                                                                                padding: '12px 15px', borderRadius: '8px', textAlign: 'right', fontSize: '14px',
                                                                                border: answers[q.id] === cIdx ? '2px solid #3b82f6' : '1px solid #cbd5e1',
                                                                                background: answers[q.id] === cIdx ? '#eff6ff' : 'white',
                                                                                color: answers[q.id] === cIdx ? '#1e40af' : '#334155',
                                                                                cursor: 'pointer', transition: 'all 0.2s'
                                                                            }}
                                                                        >
                                                                            {choice}
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        ))}
                                                        <button onClick={() => submitQuiz(lesson!.id)}
                                                            style={{ padding: '15px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 700, fontSize: '16px', cursor: 'pointer', marginTop: '10px' }}>
                                                            ✅ تأكيد الإجابات
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })()}
                                </div>
                            </div>
                        </div>
                    )}
                </main>

                {/* --- Overlays & Gamification --- */}

                {showConfetti && (
                    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 9999, backgroundImage: 'url("https://i.imgur.com/39A8n3V.gif")', backgroundSize: 'cover', opacity: 0.5 }}></div>
                )}
                <LevelUpToast show={showLevelUp} newLevel={currentLevel} />

                {/* Global Styles for Animations */}
                <style jsx global>{`
                    @keyframes slideDown {
                        from { top: -100px; opacity: 0; }
                        to { top: 20px; opacity: 1; }
                    }
                    * { box-sizing: border-box; }
                `}</style>
            </div>
        );
    }

    return (
        <div style={styles.loginPage}>
            <div style={styles.loginCard}>
                <div style={{ fontSize: '64px', marginBottom: '24px' }}>🎓</div>
                <h1 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '8px' }}>مرحباً بك في الفصل</h1>
                <p style={{ color: '#64748b', marginBottom: '32px' }}>
                    رمز الفصل: <code style={{ background: '#f1f5f9', padding: '4px 8px', borderRadius: '6px' }}>{classId}</code>
                </p>

                <div style={{ marginBottom: '24px' }}>
                    <label dir="rtl" style={{ display: 'block', marginBottom: '8px', color: '#475569', fontWeight: 600, textAlign: 'right' }}>الاسم بالكامل:</label>
                    <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="أدخل اسمك الحقيقي..."
                        style={{ width: '100%', padding: '12px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '16px', outline: 'none' }} disabled={loading} dir="rtl" />
                </div>

                {error && <div dir="rtl" style={{ color: '#ef4444', backgroundColor: '#fef2f2', padding: '12px', borderRadius: '8px', marginBottom: '24px', textAlign: 'right' }}>⚠️ {error}</div>}

                <button onClick={handleJoin} disabled={loading || !name.trim()}
                    style={{ width: '100%', padding: '14px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: 600, cursor: loading || !name.trim() ? 'not-allowed' : 'pointer', opacity: loading || !name.trim() ? 0.7 : 1 }}>
                    {loading ? 'جاري الانضمام...' : 'دخول الفصل 🚀'}
                </button>
            </div>
        </div>
    );
}

// --- Inline Styles ---
const styles: Record<string, React.CSSProperties> = {
    page: { minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#f8fafc', fontFamily: "'Inter', sans-serif", color: '#1e293b' },
    header: { backgroundColor: '#fff', borderBottom: '1px solid #e2e8f0', padding: '16px 24px', position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' },
    headerInner: { maxWidth: '1400px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    classChip: { backgroundColor: '#f1f5f9', padding: '8px 16px', borderRadius: '20px', fontSize: '14px', fontWeight: 600, color: '#475569', display: 'flex', alignItems: 'center', gap: '8px' },
    studentProfile: { display: 'flex', alignItems: 'center', gap: '12px' },
    avatar: { width: '36px', height: '36px', backgroundColor: '#3b82f6', color: '#fff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '14px' },
    studentName: { fontWeight: 600, fontSize: '15px' },

    // Split Screen Layout
    mainContainer: { flex: 1, maxWidth: '1400px', width: '100%', margin: '0 auto', height: 'calc(100vh - 75px)', display: 'flex', flexDirection: 'column' },
    splitScreenLayout: { display: 'flex', flex: 1, gap: '20px', padding: '20px', minHeight: '0' },

    leftColumn: {
        flex: '1',
        overflowY: 'auto',
        paddingRight: '20px',
    },
    rightSidebar: {
        width: '450px',
        minWidth: '450px',
        backgroundColor: '#fff',
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        height: '100%'
    },

    // Sidebar Tabs
    sidebarTabs: { display: 'flex', borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc', minHeight: '52px' },
    activeTab: { flex: 1, padding: '15px 10px', border: 'none', background: 'white', color: '#3b82f6', fontWeight: 700, borderBottom: '2px solid #3b82f6', cursor: 'pointer', fontSize: '14px' },
    inactiveTab: { flex: 1, padding: '15px 10px', border: 'none', background: 'transparent', color: '#64748b', fontWeight: 600, cursor: 'pointer', fontSize: '14px', transition: 'all 0.2s' },
    sidebarContent: { flex: 1, overflow: 'hidden', position: 'relative' },

    // List View Styles
    lessonList: { maxWidth: '800px', width: '100%', margin: '40px auto', padding: '0 20px' },
    lessonListItem: { padding: '24px', backgroundColor: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', transition: 'transform 0.2s, boxShadow 0.2s', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' },
    startBtn: { padding: '10px 20px', backgroundColor: '#f1f5f9', color: '#3b82f6', borderRadius: '8px', border: 'none', fontWeight: 600, fontSize: '14px', cursor: 'pointer' },
    backBtn: { background: 'transparent', border: 'none', color: '#64748b', fontSize: '15px', fontWeight: 600, cursor: 'pointer', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' },

    // Others
    loadingContainer: { textAlign: 'center', padding: '40px', color: '#64748b', marginTop: '100px' },
    emptyState: { textAlign: 'center', padding: '60px 20px', backgroundColor: 'white', borderRadius: '16px', border: '1px dashed #cbd5e1', color: '#64748b', margin: '40px auto', maxWidth: '600px' },
    loginPage: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc', padding: '20px' },
    loginCard: { backgroundColor: '#fff', padding: '48px', borderRadius: '24px', width: '100%', maxWidth: '440px', textAlign: 'center', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.05), 0 8px 10px -6px rgba(0,0,0,0.01)', border: '1px solid #f1f5f9' },
};
