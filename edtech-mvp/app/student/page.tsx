"use client";

import { useEffect, useState } from "react";
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

export default function StudentPage() {
    const [lessons, setLessons] = useState<Lesson[]>([]);
    const [openLessonId, setOpenLessonId] = useState<string | null>(null);

    // Quiz state
    const [answers, setAnswers] = useState<Record<string, number>>({});
    const [attempts, setAttempts] = useState<Attempt[]>([]);
    const [loadingAttempts, setLoadingAttempts] = useState(false);

    // Real-time feedback state
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answeredCorrect, setAnsweredCorrect] = useState<Set<number>>(new Set());
    const [showFeedback, setShowFeedback] = useState<{
        index: number;
        isCorrect: boolean;
        points: number;
    } | null>(null);

    // Celebration state
    const [showConfetti, setShowConfetti] = useState(false);
    const [newAchievements, setNewAchievements] = useState<Achievement[]>([]);
    const [levelUpInfo, setLevelUpInfo] = useState<{
        show: boolean;
        oldLevel: number;
        newLevel: number;
    }>({ show: false, oldLevel: 1, newLevel: 1 });

    // Points and progression
    const [pointsEarned, setPointsEarned] = useState(0);
    const [progressionMessage, setProgressionMessage] = useState<string>('');

    // Student ID (hardcoded for MVP)
    const [studentId] = useState('student-default'); // TODO: Replace with real auth

    // TTS Hook for summary
    const { speak: speakSummary, stop: stopSummary, isPlaying: isSummaryPlaying } = useCloudTTS();

    useEffect(() => {
        loadLessons().then(loadedLessons => {
            // Migrate old questions to new format
            const migratedLessons = loadedLessons.map(lesson => ({
                ...lesson,
                questions: lesson.questions?.map((q, idx) => ({
                    ...q,
                    id: q.id || `q-${lesson.id}-${idx}`, // Generate ID if missing
                    difficulty: q.difficulty || 'easy',
                    points: q.points || 10,
                    question_type: q.question_type || 'mcq',
                    type_data: q.type_data || {
                        choices: q.choices || [],
                        correctIndex: q.correctIndex || 0
                    }
                }))
            }));
            setLessons(migratedLessons);
        });
    }, []);

    // Load attempts when opening a lesson
    useEffect(() => {
        if (openLessonId) {
            setLoadingAttempts(true);
            loadAttemptsByLesson(openLessonId).then(data => {
                setAttempts(data);
                setAnswers({}); // Reset answers
                setLoadingAttempts(false);
            });

            // Reset quiz state
            setCurrentQuestionIndex(0);
            setAnsweredCorrect(new Set());
            setShowFeedback(null);
            setPointsEarned(0);
            setProgressionMessage('');
        } // No cleanup needed for now
    }, [openLessonId]);

    const handleAnswerChange = (questionIndex: number, choiceIndex: number) => {
        setAnswers(prev => ({ ...prev, [questionIndex]: choiceIndex }));
    };

    const handleAnswerWithFeedback = (
        questionIndex: number,
        choiceIndex: number,
        question: Question
    ) => {
        // 1. Save answer
        handleAnswerChange(questionIndex, choiceIndex);

        // 2. Check if correct
        const isCorrect = choiceIndex === question.correctIndex;

        // 3. Update correct answers tracker
        if (isCorrect) {
            setAnsweredCorrect(prev => new Set(prev).add(questionIndex));
        } else {
            setAnsweredCorrect(prev => {
                const updated = new Set(prev);
                updated.delete(questionIndex);
                return updated;
            });
        }

        // 4. Show feedback with points
        setShowFeedback({
            index: questionIndex,
            isCorrect,
            points: isCorrect ? (question.points || 10) : 0
        });

        // 5. Auto-hide feedback after 2 seconds
        setTimeout(() => {
            setShowFeedback(null);
        }, 2000);
    };

    const submitQuiz = async (lessonId: string, questions: NonNullable<Lesson['questions']>) => {
        try {
            // 1. Convert answers to grading format
            // Current format: answers[index] = choiceIndex
            // Needed format: answers[questionId] = { selectedIndex: choiceIndex }
            const answersForGrading: Record<string, { selectedIndex: number }> = {};
            questions.forEach((q, idx) => {
                if (answers[idx] !== undefined) {
                    answersForGrading[q.id] = { selectedIndex: answers[idx] };
                }
            });

            // 2. Grade the quiz using grading system
            const gradingResult = gradeQuiz(questions, answersForGrading);

            // 3. Create attempt record
            const answersRecord: Record<string, string> = {};
            questions.forEach((_, idx) => {
                if (answers[idx] !== undefined) {
                    answersRecord[String(idx)] = String(answers[idx]);
                }
            });

            const newAttempt: Attempt = {
                id: crypto.randomUUID(),
                studentName: 'Student',
                lessonId,
                answers: answersRecord,
                score: gradingResult.totalCorrect,
                totalQuestions: questions.length,
                createdAt: Date.now(),
                points_earned: gradingResult.totalPoints
            };

            // 4. Save attempt to database
            await saveAttempt(newAttempt);

            // 5. GAMIFICATION: Process quiz completion
            let gamificationResult;
            try {
                gamificationResult = await processQuizCompletion(
                    studentId,
                    lessonId,
                    questions,
                    gradingResult.results,
                    attempts.length === 0 // isFirstAttempt
                );
                console.log('✅ Gamification success:', gamificationResult);
            } catch (gamError) {
                console.warn('⚠️ Gamification failed (quiz still saved):', gamError);
                // Set defaults so quiz still works
                gamificationResult = {
                    pointsEarned: gradingResult.totalPoints,
                    isPerfect: gradingResult.totalCorrect === questions.length,
                    leveledUp: false,
                    streakUpdate: { streakIncreased: false, streakBroken: false, currentStreak: 0 },
                    newAchievements: [],
                    motivationalMessage: ''
                };
            }

            // 6. ADAPTIVE: Update difficulty progression
            let adaptiveResult;
            try {
                adaptiveResult = await updateStudentProgress(
                    studentId,
                    lessonId,
                    newAttempt
                );
                console.log('✅ Adaptive success:', adaptiveResult);
            } catch (adaptError) {
                console.warn('⚠️ Adaptive progression failed (quiz still saved):', adaptError);
                adaptiveResult = {};
            }

            // 7. Update UI state with results
            setPointsEarned(gamificationResult.pointsEarned);

            // 8. Show confetti if perfect score
            if (gamificationResult.isPerfect) {
                setShowConfetti(true);
                setTimeout(() => setShowConfetti(false), 5000);
            }

            // 9. Show level-up toast if leveled up
            if (gamificationResult.leveledUp) {
                setLevelUpInfo({
                    show: true,
                    oldLevel: gamificationResult.oldLevel!,
                    newLevel: gamificationResult.newLevel!
                });
            }

            // 10. Show achievements modal if any earned
            if (gamificationResult.newAchievements.length > 0) {
                setNewAchievements(gamificationResult.newAchievements);
            }

            // 11. Update progression message
            if (adaptiveResult.progressionMessage) {
                setProgressionMessage(adaptiveResult.progressionMessage);
            }

            // 12. Reload attempts to show results
            const freshAttempts = await loadAttemptsByLesson(lessonId);
            setAttempts(freshAttempts);

        } catch (e) {
            console.error('Quiz submission error:', e);
            alert('Failed to save result. Please try again.');
        }
    };

    const getLatestAttempt = (lessonId: string) => {
        if (attempts.length === 0) return null;
        // storage returns sorted desc, so [0] is latest
        return attempts[0];
    };

    const toggleLesson = (id: string) => {
        if (openLessonId === id) {
            setOpenLessonId(null);
            stopSummary(); // Stop audio if closing
        } else {
            setOpenLessonId(id);
        }
    };

    return (
        <main style={{ padding: 24, fontFamily: "system-ui", maxWidth: 800, margin: '0 auto' }}>
            <h1 style={{ marginBottom: 8, color: '#333' }}>Student Portal</h1>
            <p style={{ marginTop: 0, marginBottom: 24, color: '#666' }}>
                Your lessons (read-only MVP).
            </p>

            {lessons.length === 0 ? (
                <section
                    style={{
                        border: "1px solid #eee",
                        borderRadius: 12,
                        padding: 24,
                        textAlign: 'center',
                        backgroundColor: '#f9f9f9'
                    }}
                >
                    <h2 style={{ marginTop: 0, color: '#555' }}>No lessons yet</h2>
                    <p style={{ marginBottom: 0, color: '#777' }}>
                        Ask your teacher to create a lesson at{" "}
                        <a href="/teacher" style={{ color: '#0070f3' }}>/teacher</a>, then come back here.
                    </p>
                </section>
            ) : (
                <section style={{ display: "grid", gap: 20 }}>
                    {lessons.map((lesson) => {
                        const isOpen = openLessonId === lesson.id;
                        const attempt = isOpen ? getLatestAttempt(lesson.id) : null;
                        const hasQuiz = lesson.questions && lesson.questions.length > 0;
                        const totalQuestions = lesson.questions?.length || 0;

                        return (
                            <div
                                key={lesson.id}
                                style={{
                                    border: '1px solid #e0e0e0',
                                    borderRadius: '12px',
                                    overflow: 'hidden',
                                    boxShadow: '0 2px 5px rgba(0,0,0,0.03)',
                                    backgroundColor: '#fff'
                                }}
                            >
                                <div
                                    onClick={() => toggleLesson(lesson.id)}
                                    style={{
                                        padding: '20px',
                                        backgroundColor: '#fff',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        borderBottom: isOpen ? '1px solid #f0f0f0' : 'none'
                                    }}
                                >
                                    <div>
                                        <h3 style={{ margin: 0, fontSize: '18px', color: '#1a1a1a', fontWeight: 600 }}>{lesson.title}</h3>
                                        <div style={{ fontSize: '12px', color: '#888', marginTop: '6px' }}>
                                            {new Date(lesson.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                                        </div>
                                    </div>
                                    <span style={{ color: '#999', fontSize: '14px' }}>{isOpen ? 'Collapse ▲' : 'Open ▼'}</span>
                                </div>

                                {isOpen && (
                                    <div style={{ padding: '24px' }}>
                                        {/* Content Section with "Listen" Button */}
                                        <div style={{ marginBottom: '32px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                                <h4 style={{ margin: 0, color: '#444' }}>Lesson Content</h4>
                                                <button
                                                    onClick={() => isSummaryPlaying ? stopSummary() : speakSummary(lesson.content)}
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '6px',
                                                        background: isSummaryPlaying ? '#ffebee' : '#e3f2fd',
                                                        color: isSummaryPlaying ? '#c62828' : '#1565c0',
                                                        border: 'none',
                                                        padding: '6px 12px',
                                                        borderRadius: '20px',
                                                        cursor: 'pointer',
                                                        fontSize: '13px',
                                                        fontWeight: 500
                                                    }}
                                                >
                                                    {isSummaryPlaying ? 'Stop ⏹' : 'Listen 🔈'}
                                                </button>
                                            </div>
                                            <div style={{ lineHeight: '1.6', fontSize: '16px', color: '#333' }}>
                                                {lesson.content}
                                            </div>
                                        </div>

                                        {/* AI Tutor Chat Section */}
                                        <div style={{ marginBottom: '32px', borderTop: '1px solid #eee', paddingTop: '24px' }}>
                                            <StudentChat lessonId={lesson.id} />
                                        </div>

                                        {hasQuiz && (
                                            <div style={{ borderTop: '1px solid #eee', paddingTop: '24px' }}>
                                                <h4 style={{ marginTop: 0, marginBottom: '20px', color: '#444', fontSize: '18px' }}>Quiz Section</h4>

                                                {loadingAttempts ? (
                                                    <p>Loading results...</p>
                                                ) : attempt ? (
                                                    // Result View
                                                    <div style={{ backgroundColor: '#f8f9fa', padding: '20px', borderRadius: '10px', border: '1px solid #e9ecef' }}>
                                                        {/* Confetti celebration */}
                                                        <ConfettiCelebration trigger={showConfetti} duration={5000} />

                                                        {/* Level-up toast */}
                                                        <LevelUpToast
                                                            show={levelUpInfo.show}
                                                            oldLevel={levelUpInfo.oldLevel}
                                                            newLevel={levelUpInfo.newLevel}
                                                            onClose={() => setLevelUpInfo({ ...levelUpInfo, show: false })}
                                                        />

                                                        {/* Achievement modal */}
                                                        {newAchievements.length > 0 && (
                                                            <AchievementUnlockModal
                                                                achievements={newAchievements}
                                                                onClose={() => setNewAchievements([])}
                                                            />
                                                        )}

                                                        <div style={{ marginBottom: '20px', borderBottom: '1px solid #e9ecef', paddingBottom: '16px' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                                <h2 style={{ margin: 0, fontSize: '24px', color: '#2c3e50' }}>
                                                                    Score: {attempt.score} / {totalQuestions}
                                                                </h2>
                                                                <span style={{ fontSize: '24px' }}>
                                                                    {attempt.score === totalQuestions ? '🎉' : attempt.score >= totalQuestions / 2 ? '👍' : '📚'}
                                                                </span>
                                                            </div>

                                                            {/* Points earned display */}
                                                            {pointsEarned > 0 && (
                                                                <div style={{
                                                                    fontSize: '18px',
                                                                    fontWeight: 600,
                                                                    color: '#FFD700',
                                                                    marginTop: '8px',
                                                                    direction: 'rtl'
                                                                }}>
                                                                    🏆 كسبت {pointsEarned} نقطة!
                                                                </div>
                                                            )}

                                                            {/* Progression message */}
                                                            {progressionMessage && (
                                                                <div style={{
                                                                    marginTop: '12px',
                                                                    padding: '12px',
                                                                    backgroundColor: '#d4edda',
                                                                    borderRadius: '8px',
                                                                    color: '#155724',
                                                                    direction: 'rtl'
                                                                }}>
                                                                    {progressionMessage}
                                                                </div>
                                                            )}

                                                            <p style={{ margin: '8px 0 0 0', color: '#6c757d', fontSize: '13px' }}>
                                                                Submitted: {new Date(attempt.createdAt).toLocaleString()}
                                                            </p>
                                                        </div>

                                                        {/* Focus Areas Section */}
                                                        {attempt.score < totalQuestions && (
                                                            <div style={{ marginBottom: '24px' }}>
                                                                <h5 style={{ margin: '0 0 12px 0', color: '#d32f2f', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700 }}>
                                                                    🚀 Focus Areas (Missed Questions)
                                                                </h5>
                                                                <ul style={{ margin: 0, paddingLeft: '20px', color: '#d32f2f' }}>
                                                                    {lesson.questions?.map((q, qIdx) => {
                                                                        const selectedVal = attempt.answers[String(qIdx)];
                                                                        const userChoice = selectedVal !== undefined ? parseInt(selectedVal, 10) : -1;

                                                                        if (userChoice !== q.correctIndex) {
                                                                            return <li key={qIdx} style={{ marginBottom: '6px' }}>{q.text}</li>;
                                                                        }
                                                                        return null;
                                                                    })}
                                                                </ul>
                                                            </div>
                                                        )}

                                                        <div style={{ marginTop: '20px' }}>
                                                            <button
                                                                onClick={() => {
                                                                    setOpenLessonId(null);
                                                                    setTimeout(() => setOpenLessonId(lesson.id), 0); // Force reload
                                                                }}
                                                                style={{
                                                                    padding: '10px 20px',
                                                                    cursor: 'pointer',
                                                                    backgroundColor: '#fff',
                                                                    border: '1px solid #ced4da',
                                                                    borderRadius: '6px',
                                                                    fontSize: '14px',
                                                                    color: '#495057',
                                                                    fontWeight: 500,
                                                                    transition: 'all 0.2s'
                                                                }}
                                                            >
                                                                Retake Quiz
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    // Quiz Taking View
                                                    <div>
                                                        {/* Progress Bar */}
                                                        {lesson.questions && lesson.questions.length > 0 && (
                                                            <div style={{ marginBottom: '20px' }}>
                                                                <QuizProgressBar
                                                                    current={Object.keys(answers).length + 1}
                                                                    total={lesson.questions.length}
                                                                    correctCount={answeredCorrect.size}
                                                                />
                                                            </div>
                                                        )}

                                                        {lesson.questions?.map((q, qIdx) => (
                                                            <div key={qIdx} style={{ marginBottom: "24px", padding: '16px', backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #f0f0f0', position: 'relative' }}>
                                                                {/* Question header with difficulty badge */}
                                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                                                    <p style={{ fontWeight: 600, margin: 0, color: '#2c3e50' }}>
                                                                        {qIdx + 1}. {q.text}
                                                                    </p>
                                                                    <DifficultyBadge
                                                                        difficulty={q.difficulty || 'easy'}
                                                                        animated={false}
                                                                    />
                                                                </div>

                                                                {/* Choices */}
                                                                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                                                                    {q.choices.map((choice, cIdx) => (
                                                                        <label
                                                                            key={cIdx}
                                                                            onClick={() => handleAnswerWithFeedback(qIdx, cIdx, q)}
                                                                            style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: "12px", padding: '8px 12px', borderRadius: '6px', backgroundColor: answers[qIdx] === cIdx ? '#e7f5ff' : 'transparent', transition: 'background-color 0.2s' }}
                                                                        >
                                                                            <input
                                                                                type="radio"
                                                                                name={`q-${lesson.id}-${qIdx}`}
                                                                                checked={answers[qIdx] === cIdx}
                                                                                onChange={() => {}} // Handled by onClick
                                                                                style={{ accentColor: '#0070f3', width: '18px', height: '18px' }}
                                                                            />
                                                                            <span style={{ color: '#444' }}>{choice}</span>
                                                                        </label>
                                                                    ))}
                                                                </div>

                                                                {/* Answer feedback */}
                                                                {showFeedback && showFeedback.index === qIdx && (
                                                                    <div style={{ marginTop: '12px' }}>
                                                                        <AnswerFeedback
                                                                            show={true}
                                                                            isCorrect={showFeedback.isCorrect}
                                                                            points={showFeedback.points}
                                                                        />
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ))}

                                                        <button
                                                            onClick={() => submitQuiz(lesson.id, lesson.questions!)}
                                                            disabled={Object.keys(answers).length !== lesson.questions!.length}
                                                            style={{
                                                                padding: "12px 24px",
                                                                backgroundColor: Object.keys(answers).length !== lesson.questions!.length ? '#e9ecef' : "#0070f3",
                                                                color: Object.keys(answers).length !== lesson.questions!.length ? '#adb5bd' : "white",
                                                                border: "none",
                                                                borderRadius: "6px",
                                                                cursor: Object.keys(answers).length !== lesson.questions!.length ? 'not-allowed' : "pointer",
                                                                fontSize: "16px",
                                                                fontWeight: 600,
                                                                width: '100%'
                                                            }}
                                                        >
                                                            Submit Quiz
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </section>
            )}
        </main>
    );
}
