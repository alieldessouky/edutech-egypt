'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Lesson, Question, Attempt, loadLessons, saveLessons, loadAllAttempts, clearData, exportData, importData, deDuplicateLessons } from '../lib/storage';
import { migrateToCloud } from '../lib/migration';
import { supabase } from '../lib/supabase';

// Types for Review Section
type ReviewLesson = {
    id: string;
    title: string;
    questions: {
        id: string;
        question: string;
        choices: string[];
        correct_index: number;
    }[];
};

type ReviewAttempt = {
    id: string;
    created_at: string;
    score: number;
    students: {
        display_name: string;
    } | null;
    attempt_answers?: {
        is_correct: boolean;
        selected_choice: string;
        questions: {
            question: string;
            correct_index: number;
        };
    }[];
};

/* ─── Shared style constants ─── */
const S = {
    card: {
        backgroundColor: '#fff',
        border: '1px solid #e8ecf0',
        borderRadius: 14,
        overflow: 'hidden' as const,
    },
    cardHeader: {
        padding: '20px 24px',
        borderBottom: '1px solid #f1f5f9',
    },
    cardBody: {
        padding: 24,
    },
    sectionTag: {
        display: 'inline-block' as const,
        fontSize: 12,
        fontWeight: 600 as const,
        padding: '3px 10px',
        borderRadius: 6,
        marginBottom: 10,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: 700 as const,
        color: '#0f172a',
        margin: '0 0 4px',
        letterSpacing: -0.3,
    },
    sectionDesc: {
        fontSize: 14,
        color: '#64748b',
        margin: 0,
    },
    input: {
        width: '100%',
        padding: '10px 14px',
        fontSize: 14,
        border: '1px solid #e2e8f0',
        borderRadius: 10,
        outline: 'none',
        backgroundColor: '#fff',
        color: '#1e293b',
        transition: 'border-color 0.2s',
        boxSizing: 'border-box' as const,
    },
    label: {
        display: 'block' as const,
        fontSize: 13,
        fontWeight: 600 as const,
        color: '#374151',
        marginBottom: 6,
    },
    btnPrimary: {
        display: 'inline-flex' as const,
        alignItems: 'center' as const,
        gap: 6,
        padding: '10px 20px',
        fontSize: 14,
        fontWeight: 600 as const,
        color: '#fff',
        backgroundColor: '#1a56db',
        border: 'none',
        borderRadius: 10,
        cursor: 'pointer',
        transition: 'background-color 0.2s',
    },
    btnSecondary: {
        display: 'inline-flex' as const,
        alignItems: 'center' as const,
        gap: 6,
        padding: '8px 14px',
        fontSize: 13,
        fontWeight: 500 as const,
        color: '#374151',
        backgroundColor: '#fff',
        border: '1px solid #e2e8f0',
        borderRadius: 8,
        cursor: 'pointer',
        transition: 'all 0.2s',
    },
    btnDanger: {
        display: 'inline-flex' as const,
        alignItems: 'center' as const,
        gap: 6,
        padding: '8px 14px',
        fontSize: 13,
        fontWeight: 500 as const,
        color: '#dc2626',
        backgroundColor: '#fef2f2',
        border: '1px solid #fecaca',
        borderRadius: 8,
        cursor: 'pointer',
    },
    badge: (bg: string, fg: string) => ({
        display: 'inline-block' as const,
        fontSize: 12,
        fontWeight: 600 as const,
        padding: '3px 10px',
        borderRadius: 100,
        backgroundColor: bg,
        color: fg,
    }),
    emptyState: {
        textAlign: 'center' as const,
        padding: '32px 24px',
        color: '#94a3b8',
        fontSize: 14,
    },
};

export default function TeacherPage() {
    const [lessons, setLessons] = useState<Lesson[]>([]);
    const [activeTabs, setActiveTabs] = useState<Record<string, 'podcast' | 'reader' | 'quiz'>>({});
    const [allAttempts, setAllAttempts] = useState<Attempt[]>([]);
    const [migrating, setMigrating] = useState(false);

    // Class Creation State
    const [className, setClassName] = useState('');
    const [activeClassId, setActiveClassId] = useState('');
    const [inviteLink, setInviteLink] = useState('');
    const [classStatus, setClassStatus] = useState('');

    // Class Stats State
    const [studentCount, setStudentCount] = useState(0);
    const [attemptsCount, setAttemptsCount] = useState(0);
    const [loadingStats, setLoadingStats] = useState(false);

    // Review Section State
    const [reviewLessons, setReviewLessons] = useState<ReviewLesson[]>([]);
    const [selectedReviewLessonId, setSelectedReviewLessonId] = useState('');
    const [reviewAttempts, setReviewAttempts] = useState<ReviewAttempt[]>([]);
    const [loadingReview, setLoadingReview] = useState(false);
    const [expandedAttemptId, setExpandedAttemptId] = useState<string | null>(null);
    const [expandedAttemptDetails, setExpandedAttemptDetails] = useState<any[]>([]);

    // Student Progress State
    const [studentProgressData, setStudentProgressData] = useState<any[]>([]);
    const [loadingProgress, setLoadingProgress] = useState(false);

    // Saving Status
    const [saveStatus, setSaveStatus] = useState('');

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Lesson state
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');

    // Question state
    const [questions, setQuestions] = useState<Question[]>([]);
    const [qText, setQText] = useState('');
    const [choices, setChoices] = useState<string[]>(['', '', '', '']);
    const [correctIndex, setCorrectIndex] = useState(0);
    const [cleaning, setCleaning] = useState(false);

    // UI state
    const [showTools, setShowTools] = useState(false);

    /* ─── Data loading (unchanged) ─── */

    const refreshData = async () => {
        try {
            const lessons = await loadLessons();
            setLessons(lessons);
        } catch (err: any) {
            console.error('Failed to load lessons:', err);
        }
        try {
            const attempts = await loadAllAttempts();
            setAllAttempts(attempts);
        } catch (err: any) {
            console.error('Failed to load attempts:', err);
        }
    };

    useEffect(() => {
        refreshData();
        const savedClassId = localStorage.getItem('edtech_active_class_id_v1');
        if (savedClassId) {
            setActiveClassId(savedClassId);
            fetchClassDetails(savedClassId);
            fetchClassStats(savedClassId);
            fetchReviewLessons(savedClassId);
            fetchStudentProgress(savedClassId);
        }
    }, []);

    const fetchClassDetails = async (id: string) => {
        try {
            const { data, error } = await supabase.from('classes').select('title').eq('id', id).single();
            if (data) {
                setClassStatus(`Active class: ${data.title}`);
                setInviteLink(`${window.location.origin}/c/${id}`);
            }
        } catch (e) {
            console.error(e);
        }
    };

    const fetchClassStats = async (classId: string) => {
        setLoadingStats(true);
        try {
            const { count: sCount, error: sError } = await supabase
                .from('students')
                .select('*', { count: 'exact', head: true })
                .eq('class_id', classId);
            if (!sError) setStudentCount(sCount || 0);

            const { data: classLessons } = await supabase
                .from('lessons')
                .select('id')
                .eq('class_id', classId);

            if (classLessons && classLessons.length > 0) {
                const lessonIds = classLessons.map(l => l.id);
                const { count: aCount, error: aError } = await supabase
                    .from('attempts')
                    .select('*', { count: 'exact', head: true })
                    .in('lesson_id', lessonIds);
                if (!aError) setAttemptsCount(aCount || 0);
            } else {
                setAttemptsCount(0);
            }
        } catch (e) {
            console.error('Error fetching stats:', e);
        } finally {
            setLoadingStats(false);
        }
    };

    const fetchReviewLessons = async (classId: string) => {
        try {
            const { data, error } = await supabase
                .from('lessons')
                .select('id, title, quizzes(questions(*))')
                .eq('class_id', classId)
                .order('created_at', { ascending: false });
            if (data) {
                const mapped = data.map((l: any) => ({
                    id: l.id,
                    title: l.title,
                    questions: l.quizzes?.[0]?.questions || []
                }));
                setReviewLessons(mapped as ReviewLesson[]);
            }
        } catch (e) {
            console.error('Error fetching review lessons:', e);
        }
    };

    const fetchStudentProgress = async (classId: string) => {
        setLoadingProgress(true);
        try {
            const { data: students, error: studentsError } = await supabase
                .from('students')
                .select('id, display_name')
                .eq('class_id', classId);
            if (studentsError) throw studentsError;
            if (!students || students.length === 0) {
                setStudentProgressData([]);
                setLoadingProgress(false);
                return;
            }

            const studentIds = students.map(s => s.id);

            const { data: stats, error: statsError } = await supabase
                .from('student_stats')
                .select('*')
                .in('student_id', studentIds);
            if (statsError) throw statsError;

            const { data: progress, error: progressError } = await supabase
                .from('student_progress')
                .select(`*, lessons (id, title)`)
                .in('student_id', studentIds);
            if (progressError) throw progressError;

            const combined = students.map(student => {
                const studentStat = stats?.find(s => s.student_id === student.id);
                const studentProgress = progress?.filter(p => p.student_id === student.id) || [];
                return {
                    student_id: student.id,
                    student_name: student.display_name,
                    total_points: studentStat?.total_points || 0,
                    current_streak: studentStat?.current_streak || 0,
                    level: studentStat?.level || 1,
                    total_quizzes: studentStat?.total_quizzes || 0,
                    lessons_progress: studentProgress.map(p => ({
                        lesson_id: p.lesson_id,
                        lesson_title: p.lessons?.title || 'Unknown',
                        current_difficulty: p.current_difficulty,
                        easy_mastered: p.easy_mastered,
                        medium_mastered: p.medium_mastered,
                        hard_mastered: p.hard_mastered,
                        easy_accuracy: p.easy_total > 0 ? Math.round((p.easy_correct / p.easy_total) * 100) : 0,
                        medium_accuracy: p.medium_total > 0 ? Math.round((p.medium_correct / p.medium_total) * 100) : 0,
                        hard_accuracy: p.hard_total > 0 ? Math.round((p.hard_correct / p.hard_total) * 100) : 0,
                    }))
                };
            });
            setStudentProgressData(combined);
        } catch (e) {
            console.error('Error fetching student progress:', e);
        } finally {
            setLoadingProgress(false);
        }
    };

    const handleSelectReviewLesson = async (lessonId: string) => {
        setSelectedReviewLessonId(lessonId);
        setExpandedAttemptId(null);
        setExpandedAttemptDetails([]);
        if (!lessonId) { setReviewAttempts([]); return; }
        setLoadingReview(true);
        try {
            const { data, error } = await supabase
                .from('attempts')
                .select('id, created_at, score, students(display_name)')
                .eq('lesson_id', lessonId)
                .order('created_at', { ascending: false });
            if (error) throw error;
            if (data) setReviewAttempts(data.map(d => ({ ...d, score: d.score })) as any);
        } catch (e) {
            console.error('Error fetching attempts:', e);
            alert('Failed to fetch attempts.');
        } finally {
            setLoadingReview(false);
        }
    };

    const toggleExpandAttempt = async (attemptId: string) => {
        if (expandedAttemptId === attemptId) { setExpandedAttemptId(null); return; }
        setExpandedAttemptId(attemptId);
        try {
            const { data, error } = await supabase
                .from('attempt_answers')
                .select(`is_correct, selected_choice, questions (question, choices, correct_index)`)
                .eq('attempt_id', attemptId);
            if (error) { alert(`Error: ${error.message}`); throw error; }
            if (data) setExpandedAttemptDetails(data);
        } catch (e: any) {
            console.error('Failed to fetch answer details:', e);
        }
    };

    const handleCreateClass = async () => {
        if (!className.trim()) { alert('Please enter a class name.'); return; }
        try {
            const { data, error } = await supabase
                .from('classes')
                .insert({ title: className.trim() })
                .select('id')
                .single();
            if (error) { alert(`Failed to create class:\n${error.message}`); return; }
            if (data) {
                const id = data.id;
                setActiveClassId(id);
                localStorage.setItem('edtech_active_class_id_v1', id);
                setInviteLink(`${window.location.origin}/c/${id}`);
                setClassStatus(`Active class: ${className.trim()}`);
                setClassName('');
                alert(`Class "${className.trim()}" created!`);
                setStudentCount(0);
                setAttemptsCount(0);
                setReviewLessons([]);
                setReviewAttempts([]);
            }
        } catch (err: any) {
            alert(`Unexpected error: ${err.message}`);
        }
    };

    const copyToClipboard = () => {
        if (!inviteLink) return;
        navigator.clipboard.writeText(inviteLink);
        alert('Link copied to clipboard!');
    };

    const handleChoiceChange = (index: number, value: string) => {
        const newChoices = [...choices];
        newChoices[index] = value;
        setChoices(newChoices);
    };

    const addQuestion = () => {
        if (!qText || choices.some(c => !c)) return;
        setQuestions([...questions, { id: crypto.randomUUID(), quizId: '', text: qText, choices, correctIndex }]);
        setQText('');
        setChoices(['', '', '', '']);
        setCorrectIndex(0);
    };

    const handleAddLesson = async () => {
        if (!title || !content) return;
        setSaveStatus('Saving...');
        const newLesson: Lesson = {
            id: crypto.randomUUID(), title, content, subject: 'General', grade: 1,
            quizzes: [], questions, createdAt: Date.now(),
        };
        const updatedLessons = [...lessons, newLesson];
        setLessons(updatedLessons);
        await saveLessons(updatedLessons);

        if (activeClassId) {
            try {
                const { error: lessonError } = await supabase
                    .from('lessons')
                    .insert({ id: newLesson.id, class_id: activeClassId, title: newLesson.title, content: newLesson.content, created_at: new Date(newLesson.createdAt).toISOString() })
                    .select('id').single();
                if (lessonError) throw lessonError;
                if (questions.length > 0) {
                    const { error: qError } = await supabase
                        .from('questions')
                        .insert(questions.map(q => ({ lesson_id: newLesson.id, question: q.text, choices: q.choices, correct_index: q.correctIndex })));
                    if (qError) throw qError;
                }
                setSaveStatus('Saved to cloud');
                setTimeout(() => setSaveStatus(''), 3000);
                fetchReviewLessons(activeClassId);
            } catch (err) {
                console.error('Failed to sync to Supabase:', err);
                setSaveStatus('Saved locally (cloud sync failed)');
            }
        } else {
            setSaveStatus('Saved locally');
            setTimeout(() => setSaveStatus(''), 3000);
        }
        setTitle(''); setContent(''); setQuestions([]);
    };

    const handleResetData = async () => {
        if (window.confirm('Are you sure you want to delete ALL lessons and quiz attempts? This cannot be undone.')) {
            await clearData(); refreshData();
        }
    };

    const handleExportData = async () => {
        const jsonString = await exportData();
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `edtech_backup_${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleImportFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (event) => {
            const result = event.target?.result as string;
            if (result) {
                const success = await importData(result);
                if (success) { alert('Data imported successfully!'); refreshData(); }
                else { alert('Failed to import data. Please check the file format.'); }
            }
            if (fileInputRef.current) fileInputRef.current.value = '';
        };
        reader.readAsText(file);
    };

    const handleCleanup = async () => {
        if (!confirm('This will remove duplicate lessons by title. Continue?')) return;
        setCleaning(true);
        try { await deDuplicateLessons(); await refreshData(); alert('Cleanup complete!'); }
        catch (e) { console.error(e); alert('Cleanup failed'); }
        finally { setCleaning(false); }
    };

    const handleMigrate = async () => {
        if (!window.confirm('This will upload all local lessons to Supabase. Continue?')) return;
        setMigrating(true);
        const result = await migrateToCloud();
        setMigrating(false);
        alert(result.message);
    };

    const getLessonStats = (lesson: Lesson) => {
        if (!lesson.questions || lesson.questions.length === 0) return null;
        const attempts = allAttempts.filter(a => a.lessonId === lesson.id);
        if (attempts.length === 0) return { count: 0, avgScore: 0, attempts: [], topMissed: [] };
        const totalScorePercent = attempts.reduce((sum, a) => {
            const qCount = lesson.questions!.length;
            if (qCount === 0) return sum;
            return sum + (a.score / qCount) * 100;
        }, 0);
        const avg = Math.round(totalScorePercent / attempts.length);
        const questionStats = lesson.questions.map((q, idx) => {
            const incorrectCount = attempts.filter(a => {
                const ansStr = a.answers[String(idx)];
                const val = ansStr ? parseInt(ansStr, 10) : -1;
                return val !== q.correctIndex;
            }).length;
            const rate = Math.round((incorrectCount / attempts.length) * 100);
            return { question: q, incorrectCount, rate };
        });
        const topMissed = questionStats.sort((a, b) => b.incorrectCount - a.incorrectCount).filter(s => s.incorrectCount > 0).slice(0, 3);
        return { count: attempts.length, avgScore: avg, attempts, topMissed };
    };

    /* ════════════════════════════════════════════════════════
       RENDER
    ════════════════════════════════════════════════════════ */

    return (
        <div style={{ backgroundColor: '#f8fafc', minHeight: '100vh', paddingTop: 80 }}>
            <div style={{ maxWidth: 960, margin: '0 auto', padding: '32px 24px 64px' }}>

                {/* ─── Page Header ─── */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32, flexWrap: 'wrap', gap: 16 }}>
                    <div>
                        <h1 style={{ fontSize: 28, fontWeight: 800, color: '#0f172a', margin: '0 0 6px', letterSpacing: -0.5 }}>
                            Teacher Portal
                        </h1>
                        <p style={{ fontSize: 15, color: '#64748b', margin: 0 }}>
                            Manage your classes, lessons, and track student progress.
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                        <Link
                            href="/teacher/studio"
                            style={{
                                ...S.btnPrimary,
                                textDecoration: 'none',
                                backgroundColor: '#7c3aed',
                            }}
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v18"/><path d="M5 12h14"/></svg>
                            AI Lesson Studio
                        </Link>
                        <div style={{ position: 'relative' }}>
                            <button onClick={() => setShowTools(!showTools)} style={{ ...S.btnSecondary }}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
                                Tools
                            </button>
                            {showTools && (
                                <div style={{
                                    position: 'absolute', right: 0, top: '100%', marginTop: 6, zIndex: 50,
                                    backgroundColor: '#fff', border: '1px solid #e8ecf0', borderRadius: 12,
                                    boxShadow: '0 8px 24px rgba(0,0,0,0.08)', padding: 8, minWidth: 200,
                                }}>
                                    <ToolBtn label={migrating ? 'Migrating...' : 'Migrate to Cloud'} onClick={handleMigrate} disabled={migrating} />
                                    <ToolBtn label={cleaning ? 'Cleaning...' : 'Cleanup Duplicates'} onClick={handleCleanup} disabled={cleaning} />
                                    <ToolBtn label="Export Data" onClick={handleExportData} />
                                    <label style={{ display: 'block', padding: '8px 12px', fontSize: 13, color: '#374151', cursor: 'pointer', borderRadius: 8 }}>
                                        Import Data
                                        <input type="file" ref={fileInputRef} onChange={handleImportFileChange} accept=".json" style={{ display: 'none' }} />
                                    </label>
                                    <div style={{ height: 1, backgroundColor: '#f1f5f9', margin: '4px 0' }} />
                                    <ToolBtn label="Reset All Data" onClick={handleResetData} danger />
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* ─── Class Management ─── */}
                <section style={{ ...S.card, marginBottom: 24 }}>
                    <div style={S.cardHeader}>
                        <div style={{ ...S.sectionTag, backgroundColor: '#f0f5ff', color: '#1a56db' }}>Class Management</div>
                        <h2 style={S.sectionTitle}>Your Classroom</h2>
                        <p style={S.sectionDesc}>Create a class and share the invite link with your students.</p>
                    </div>
                    <div style={S.cardBody}>
                        {classStatus && (
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: 10,
                                padding: '12px 16px', backgroundColor: '#f0f9ff', border: '1px solid #bae6fd',
                                borderRadius: 10, marginBottom: 20, fontSize: 14, color: '#0369a1', fontWeight: 500,
                            }}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                                {classStatus}
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
                            <input
                                type="text"
                                placeholder="Class name (e.g. Math 101)"
                                value={className}
                                onChange={(e) => setClassName(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleCreateClass()}
                                style={{ ...S.input, flex: 1 }}
                            />
                            <button onClick={handleCreateClass} style={S.btnPrimary}>Create Class</button>
                        </div>

                        {activeClassId && (
                            <>
                                {/* Invite link */}
                                <div style={{
                                    display: 'flex', alignItems: 'center', gap: 10,
                                    padding: '10px 14px', backgroundColor: '#fafbfd', border: '1px solid #e8ecf0',
                                    borderRadius: 10, marginBottom: 20, fontSize: 13,
                                }}>
                                    <span style={{ color: '#64748b', fontWeight: 500, whiteSpace: 'nowrap' }}>Share link:</span>
                                    <code style={{ flex: 1, color: '#1a56db', fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {inviteLink}
                                    </code>
                                    <button onClick={copyToClipboard} style={{ ...S.btnSecondary, padding: '6px 12px', fontSize: 12 }}>
                                        Copy
                                    </button>
                                </div>

                                {/* Stats row */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                                    <StatCard label="Students" value={studentCount} color="#1a56db" />
                                    <StatCard label="Attempts" value={attemptsCount} color="#059669" />
                                    <div style={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        backgroundColor: '#fafbfd', border: '1px solid #e8ecf0', borderRadius: 10, padding: 12,
                                    }}>
                                        <button
                                            onClick={() => { fetchClassStats(activeClassId); fetchReviewLessons(activeClassId); fetchStudentProgress(activeClassId); }}
                                            style={{ ...S.btnSecondary, border: 'none', backgroundColor: 'transparent', fontSize: 13, color: '#64748b' }}
                                        >
                                            {loadingStats ? 'Loading...' : 'Refresh Stats'}
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </section>

                {/* ─── Student Progress ─── */}
                {activeClassId && (
                    <section style={{ ...S.card, marginBottom: 24 }}>
                        <div style={S.cardHeader}>
                            <div style={{ ...S.sectionTag, backgroundColor: '#fef3c7', color: '#92400e' }}>Student Progress</div>
                            <h2 style={S.sectionTitle}>Adaptive Difficulty Tracking</h2>
                            <p style={S.sectionDesc}>Monitor each student&apos;s mastery progression across difficulty levels.</p>
                        </div>
                        <div style={S.cardBody}>
                            {loadingProgress ? (
                                <p style={{ color: '#64748b', fontSize: 14 }}>Loading student progress...</p>
                            ) : studentProgressData.length === 0 ? (
                                <div style={S.emptyState}>No students have started any quizzes yet.</div>
                            ) : (
                                <div style={{ display: 'grid', gap: 16 }}>
                                    {studentProgressData.map(student => (
                                        <div key={student.student_id} style={{ border: '1px solid #e8ecf0', borderRadius: 12, overflow: 'hidden' }}>
                                            {/* Student header */}
                                            <div style={{
                                                padding: '16px 20px', backgroundColor: '#fafbfd',
                                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                                borderBottom: '1px solid #f1f5f9',
                                            }}>
                                                <div>
                                                    <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>{student.student_name}</div>
                                                    <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>
                                                        Level {student.level} &middot; {student.total_quizzes} quizzes
                                                    </div>
                                                </div>
                                                <div style={{ display: 'flex', gap: 20 }}>
                                                    <div style={{ textAlign: 'center' }}>
                                                        <div style={{ fontSize: 20, fontWeight: 800, color: '#1a56db' }}>{student.total_points}</div>
                                                        <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 500 }}>Points</div>
                                                    </div>
                                                    <div style={{ textAlign: 'center' }}>
                                                        <div style={{ fontSize: 20, fontWeight: 800, color: '#ea580c' }}>{student.current_streak}</div>
                                                        <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 500 }}>Streak</div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Lessons progress */}
                                            <div style={{ padding: '16px 20px' }}>
                                                {student.lessons_progress.length === 0 ? (
                                                    <p style={{ fontSize: 13, color: '#94a3b8', margin: 0 }}>No lesson progress yet</p>
                                                ) : (
                                                    <div style={{ display: 'grid', gap: 12 }}>
                                                        {student.lessons_progress.map((lp: any) => (
                                                            <div key={lp.lesson_id} style={{ padding: 14, backgroundColor: '#fafbfd', borderRadius: 10, border: '1px solid #f1f5f9' }}>
                                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                                                    <span style={{ fontWeight: 600, fontSize: 14, color: '#1e293b' }}>{lp.lesson_title}</span>
                                                                    <span style={S.badge(
                                                                        lp.current_difficulty === 'easy' ? '#dcfce7' : lp.current_difficulty === 'medium' ? '#fef9c3' : '#fce7f3',
                                                                        lp.current_difficulty === 'easy' ? '#166534' : lp.current_difficulty === 'medium' ? '#854d0e' : '#9f1239',
                                                                    )}>
                                                                        {lp.current_difficulty === 'easy' ? 'Easy' : lp.current_difficulty === 'medium' ? 'Medium' : 'Hard'}
                                                                    </span>
                                                                </div>
                                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                                                                    <DifficultyCell level="Easy" mastered={lp.easy_mastered} accuracy={lp.easy_accuracy} unlocked={true} />
                                                                    <DifficultyCell level="Medium" mastered={lp.medium_mastered} accuracy={lp.medium_accuracy} unlocked={lp.easy_mastered} />
                                                                    <DifficultyCell level="Hard" mastered={lp.hard_mastered} accuracy={lp.hard_accuracy} unlocked={lp.medium_mastered} />
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </section>
                )}

                {/* ─── Attempt Review ─── */}
                {activeClassId && (
                    <section style={{ ...S.card, marginBottom: 24 }}>
                        <div style={S.cardHeader}>
                            <div style={{ ...S.sectionTag, backgroundColor: '#ecfdf5', color: '#065f46' }}>Analytics</div>
                            <h2 style={S.sectionTitle}>Attempt Review</h2>
                            <p style={S.sectionDesc}>Drill into individual quiz attempts and see per-question breakdowns.</p>
                        </div>
                        <div style={S.cardBody}>
                            <div style={{ marginBottom: 20 }}>
                                <label style={S.label}>Select a lesson</label>
                                <select
                                    value={selectedReviewLessonId}
                                    onChange={(e) => handleSelectReviewLesson(e.target.value)}
                                    style={{ ...S.input, cursor: 'pointer' }}
                                >
                                    <option value="">Choose a lesson...</option>
                                    {reviewLessons.map(l => (
                                        <option key={l.id} value={l.id}>{l.title}</option>
                                    ))}
                                </select>
                            </div>

                            {selectedReviewLessonId && (
                                <>
                                    {loadingReview ? (
                                        <p style={{ color: '#64748b', fontSize: 14 }}>Loading attempts...</p>
                                    ) : reviewAttempts.length === 0 ? (
                                        <div style={S.emptyState}>No attempts yet for this lesson.</div>
                                    ) : (
                                        <div>
                                            <div style={{ fontSize: 13, color: '#64748b', marginBottom: 12 }}>
                                                <strong style={{ color: '#1e293b' }}>{reviewAttempts.length}</strong> total attempts
                                            </div>
                                            <div style={{ display: 'grid', gap: 8 }}>
                                                {reviewAttempts.map(attempt => {
                                                    const isExpanded = expandedAttemptId === attempt.id;
                                                    const studentName = attempt.students?.display_name || 'Unknown Student';
                                                    const lesson = reviewLessons.find(l => l.id === selectedReviewLessonId);
                                                    const qCount = lesson?.questions.length || 0;
                                                    const pct = qCount > 0 ? Math.round((attempt.score / qCount) * 100) : 0;

                                                    return (
                                                        <div key={attempt.id} style={{ border: '1px solid #e8ecf0', borderRadius: 10, overflow: 'hidden' }}>
                                                            <div
                                                                onClick={() => toggleExpandAttempt(attempt.id)}
                                                                style={{
                                                                    padding: '12px 16px', cursor: 'pointer',
                                                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                                                    backgroundColor: isExpanded ? '#f0f5ff' : '#fff',
                                                                    transition: 'background-color 0.15s',
                                                                }}
                                                            >
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                                                    <div style={{
                                                                        width: 36, height: 36, borderRadius: 8,
                                                                        backgroundColor: pct >= 80 ? '#dcfce7' : pct >= 50 ? '#fef9c3' : '#fef2f2',
                                                                        color: pct >= 80 ? '#166534' : pct >= 50 ? '#854d0e' : '#991b1b',
                                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                        fontSize: 13, fontWeight: 800,
                                                                    }}>
                                                                        {pct}%
                                                                    </div>
                                                                    <div>
                                                                        <div style={{ fontSize: 14, fontWeight: 600, color: '#1e293b' }}>{studentName}</div>
                                                                        <div style={{ fontSize: 12, color: '#94a3b8' }}>
                                                                            {new Date(attempt.created_at).toLocaleString()}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2"
                                                                    style={{ transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                                                                    <polyline points="6 9 12 15 18 9" />
                                                                </svg>
                                                            </div>

                                                            {isExpanded && (
                                                                <div style={{ padding: '16px 20px', borderTop: '1px solid #f1f5f9', backgroundColor: '#fafbfd' }}>
                                                                    {expandedAttemptDetails.length === 0 ? (
                                                                        <p style={{ fontSize: 13, color: '#94a3b8', textAlign: 'center', margin: 0 }}>
                                                                            No granular answer data for this attempt.
                                                                        </p>
                                                                    ) : (
                                                                        <div style={{ display: 'grid', gap: 10 }}>
                                                                            {expandedAttemptDetails.map((detail, idx) => {
                                                                                const q = detail.questions;
                                                                                const qText = q?.question || 'Question deleted';
                                                                                const isCorrect = detail.is_correct;
                                                                                const correctChoice = q?.choices?.[q?.correct_index] || 'Unknown';
                                                                                const selectedText = detail.selected_choice || '(Unanswered)';
                                                                                return (
                                                                                    <div key={idx} style={{
                                                                                        padding: '10px 14px', borderRadius: 8,
                                                                                        backgroundColor: isCorrect ? '#f0fdf4' : '#fff',
                                                                                        border: `1px solid ${isCorrect ? '#bbf7d0' : '#fecaca'}`,
                                                                                    }}>
                                                                                        <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b', marginBottom: 4 }}>
                                                                                            Q{idx + 1}: {qText}
                                                                                        </div>
                                                                                        <div style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
                                                                                            <span style={{
                                                                                                fontWeight: 600, fontSize: 12,
                                                                                                color: isCorrect ? '#166534' : detail.selected_choice === null ? '#92400e' : '#991b1b',
                                                                                            }}>
                                                                                                {isCorrect ? 'Correct' : detail.selected_choice === null ? 'Unanswered' : 'Wrong'}
                                                                                            </span>
                                                                                            <span style={{ color: '#64748b' }}>
                                                                                                {isCorrect ? `Answer: ${selectedText}` : `Chose: ${selectedText}`}
                                                                                            </span>
                                                                                        </div>
                                                                                        {!isCorrect && (
                                                                                            <div style={{ fontSize: 12, color: '#166534', marginTop: 4 }}>
                                                                                                Correct: {correctChoice}
                                                                                            </div>
                                                                                        )}
                                                                                    </div>
                                                                                );
                                                                            })}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </section>
                )}

                {/* ─── Create Lesson ─── */}
                <section style={{ ...S.card, marginBottom: 24 }}>
                    <div style={S.cardHeader}>
                        <div style={{ ...S.sectionTag, backgroundColor: '#ede9fe', color: '#5b21b6' }}>Create</div>
                        <h2 style={S.sectionTitle}>New Lesson</h2>
                        <p style={S.sectionDesc}>Add a lesson with optional quiz questions. For AI-generated quizzes, use the Lesson Studio.</p>
                    </div>
                    <div style={S.cardBody}>
                        <div style={{ marginBottom: 16 }}>
                            <label style={S.label}>Lesson Title</label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                style={S.input}
                                placeholder="e.g. Introduction to Algebra"
                            />
                        </div>
                        <div style={{ marginBottom: 24 }}>
                            <label style={S.label}>Content</label>
                            <textarea
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                style={{ ...S.input, height: 120, resize: 'vertical' as const }}
                                placeholder="Write your lesson content here..."
                            />
                        </div>

                        <div style={{ height: 1, backgroundColor: '#f1f5f9', margin: '0 0 24px' }} />

                        {/* Quiz builder */}
                        <div style={{ ...S.sectionTag, backgroundColor: '#f0f5ff', color: '#1a56db', marginBottom: 16 }}>Quiz Questions (Optional)</div>
                        <div style={{ padding: 20, backgroundColor: '#fafbfd', borderRadius: 12, border: '1px solid #e8ecf0' }}>
                            <div style={{ marginBottom: 14 }}>
                                <label style={S.label}>Question Text</label>
                                <input type="text" value={qText} onChange={(e) => setQText(e.target.value)} style={S.input} placeholder="Enter your question..." />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
                                {choices.map((choice, idx) => (
                                    <div key={idx}>
                                        <label style={{ ...S.label, fontSize: 12, color: '#94a3b8' }}>Choice {idx + 1}</label>
                                        <input type="text" value={choice} onChange={(e) => handleChoiceChange(idx, e.target.value)} style={S.input} />
                                    </div>
                                ))}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                                <label style={{ ...S.label, marginBottom: 0 }}>Correct Answer:</label>
                                <select value={correctIndex} onChange={(e) => setCorrectIndex(Number(e.target.value))}
                                    style={{ ...S.input, width: 'auto', cursor: 'pointer' }}>
                                    {[0, 1, 2, 3].map(i => (
                                        <option key={i} value={i}>Choice {i + 1}</option>
                                    ))}
                                </select>
                            </div>
                            <button onClick={addQuestion} style={S.btnSecondary}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
                                Add Question
                            </button>
                        </div>

                        {questions.length > 0 && (
                            <div style={{ marginTop: 16 }}>
                                <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
                                    {questions.length} question{questions.length > 1 ? 's' : ''} added:
                                </div>
                                <div style={{ display: 'grid', gap: 6 }}>
                                    {questions.map((q, i) => (
                                        <div key={i} style={{
                                            display: 'flex', alignItems: 'center', gap: 10,
                                            padding: '8px 12px', backgroundColor: '#f0f5ff', borderRadius: 8,
                                            fontSize: 13, color: '#1e293b',
                                        }}>
                                            <span style={{ fontWeight: 700, color: '#1a56db', fontSize: 12, minWidth: 24 }}>Q{i + 1}</span>
                                            {q.text}
                                            <span style={{ marginLeft: 'auto', fontSize: 12, color: '#64748b' }}>Answer: Choice {q.correctIndex + 1}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div style={{ marginTop: 24, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 12 }}>
                            {saveStatus && (
                                <span style={{
                                    fontSize: 13, fontWeight: 500,
                                    color: saveStatus.includes('failed') ? '#dc2626' : '#059669',
                                }}>
                                    {saveStatus}
                                </span>
                            )}
                            <button onClick={handleAddLesson} style={{ ...S.btnPrimary, padding: '12px 28px', fontSize: 15 }}>
                                Create Lesson
                            </button>
                        </div>
                    </div>
                </section>

                {/* ─── Existing Lessons ─── */}
                <section>
                    <div style={{ marginBottom: 16 }}>
                        <div style={{ ...S.sectionTag, backgroundColor: '#f1f5f9', color: '#475569' }}>Library</div>
                        <h2 style={{ ...S.sectionTitle, marginTop: 4 }}>Existing Lessons</h2>
                    </div>

                    {lessons.length === 0 ? (
                        <div style={{ ...S.card, ...S.emptyState }}>No lessons created yet.</div>
                    ) : (
                        <div style={{ display: 'grid', gap: 16 }}>
                            {lessons.map((lesson) => {
                                const stats = getLessonStats(lesson);
                                return (
                                    <div key={lesson.id} style={S.card}>
                                        <div style={{
                                            padding: '18px 22px',
                                            display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                                            backgroundColor: '#fafbfd', borderBottom: '1px solid #f1f5f9',
                                        }}>
                                            <div>
                                                <h3 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 700, color: '#1e293b' }}>{lesson.title}</h3>
                                                <div style={{ display: 'flex', gap: 6 }}>
                                                    <span style={S.badge('#f0f5ff', '#1a56db')}>
                                                        {lesson.questions?.length || 0} questions
                                                    </span>
                                                    <span style={S.badge('#f1f5f9', '#64748b')}>
                                                        Grade {lesson.grade || 6}
                                                    </span>
                                                </div>
                                            </div>
                                            {stats && stats.count > 0 ? (
                                                <div style={{ display: 'flex', gap: 16, fontSize: 13 }}>
                                                    <div style={{ color: '#64748b' }}>
                                                        <strong style={{ color: '#1a56db' }}>{stats.count}</strong> Attempts
                                                    </div>
                                                    <div style={{ color: '#64748b' }}>
                                                        <strong style={{ color: stats.avgScore >= 70 ? '#059669' : '#ea580c' }}>{stats.avgScore}%</strong> Avg
                                                    </div>
                                                </div>
                                            ) : (
                                                <span style={{ fontSize: 12, color: '#94a3b8' }}>No attempts</span>
                                            )}
                                        </div>

                                        <div style={{ padding: 18, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
                                            {/* Content preview */}
                                            <div style={{ padding: 14, backgroundColor: '#fafbfd', borderRadius: 10, border: '1px solid #f1f5f9', fontSize: 13 }}>
                                                <div style={{ fontWeight: 600, color: '#374151', marginBottom: 8, fontSize: 13 }}>Lesson Content</div>
                                                <div style={{ color: '#64748b', maxHeight: 72, overflow: 'hidden', lineHeight: 1.5 }}>
                                                    {lesson.simplified_arabic || lesson.content || 'No content.'}
                                                </div>
                                            </div>

                                            {/* Quiz preview */}
                                            <div style={{ padding: 14, backgroundColor: '#fafbfd', borderRadius: 10, border: '1px solid #f1f5f9', fontSize: 13 }}>
                                                <div style={{ fontWeight: 600, color: '#374151', marginBottom: 8, fontSize: 13 }}>Quiz Preview</div>
                                                {(lesson.questions || []).length === 0 ? (
                                                    <div style={{ color: '#94a3b8' }}>No questions.</div>
                                                ) : (
                                                    <div style={{ display: 'grid', gap: 6 }}>
                                                        {(lesson.questions || []).slice(0, 3).map((q, qIdx) => (
                                                            <div key={q.id || qIdx} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                                                                <span style={{ fontWeight: 700, color: '#1a56db', fontSize: 11, marginTop: 1 }}>Q{qIdx + 1}</span>
                                                                <span style={{ color: '#475569', fontSize: 12, lineHeight: 1.4 }}>
                                                                    {(q.text || q.question || '').slice(0, 60)}{(q.text || q.question || '').length > 60 ? '...' : ''}
                                                                </span>
                                                            </div>
                                                        ))}
                                                        {(lesson.questions || []).length > 3 && (
                                                            <span style={{ fontSize: 11, color: '#94a3b8' }}>+{(lesson.questions || []).length - 3} more</span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
}

/* ─── Helper Components ─── */

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
    return (
        <div style={{
            padding: '16px 20px', backgroundColor: '#fafbfd',
            border: '1px solid #e8ecf0', borderRadius: 10,
        }}>
            <div style={{ fontSize: 28, fontWeight: 800, color, letterSpacing: -1 }}>{value}</div>
            <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 500, marginTop: 2 }}>{label}</div>
        </div>
    );
}

function DifficultyCell({ level, mastered, accuracy, unlocked }: { level: string; mastered: boolean; accuracy: number; unlocked: boolean }) {
    const locked = !unlocked && !mastered;
    return (
        <div style={{
            padding: '10px 12px', borderRadius: 8,
            backgroundColor: mastered ? '#f0fdf4' : locked ? '#f8fafc' : '#fff',
            border: `1px solid ${mastered ? '#bbf7d0' : '#e8ecf0'}`,
            opacity: locked ? 0.5 : 1,
        }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: mastered ? '#166534' : '#374151', marginBottom: 2 }}>
                {level} {mastered && <span style={{ color: '#16a34a' }}>&#10003;</span>}
            </div>
            <div style={{ fontSize: 11, color: '#64748b' }}>{accuracy}% accuracy</div>
            <div style={{ fontSize: 10, fontWeight: 500, color: mastered ? '#16a34a' : locked ? '#94a3b8' : '#64748b', marginTop: 2 }}>
                {mastered ? 'Mastered' : locked ? 'Locked' : 'In Progress'}
            </div>
        </div>
    );
}

function ToolBtn({ label, onClick, disabled, danger }: { label: string; onClick: () => void; disabled?: boolean; danger?: boolean }) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            style={{
                display: 'block', width: '100%', textAlign: 'left' as const,
                padding: '8px 12px', fontSize: 13, border: 'none', borderRadius: 8,
                backgroundColor: 'transparent', cursor: disabled ? 'wait' : 'pointer',
                color: danger ? '#dc2626' : '#374151',
                opacity: disabled ? 0.5 : 1,
            }}
        >
            {label}
        </button>
    );
}
