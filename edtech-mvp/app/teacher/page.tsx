'use client';

import React, { useState, useEffect, useRef } from 'react';
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
    const [expandedAttemptDetails, setExpandedAttemptDetails] = useState<any[]>([]); // Details for expanded

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
            // This is likely the "demo_key" column error. 
            // We just log it so the rest of the page still works.
        }
    };

    useEffect(() => {
        refreshData();
        // Restore active class
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
            // Count Students
            const { count: sCount, error: sError } = await supabase
                .from('students')
                .select('*', { count: 'exact', head: true })
                .eq('class_id', classId);

            if (!sError) setStudentCount(sCount || 0);

            // Count Attempts
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
            // Fetch lessons with questions via quizzes for review dropdown
            const { data, error } = await supabase
                .from('lessons')
                .select('id, title, quizzes(questions(*))')
                .eq('class_id', classId)
                .order('created_at', { ascending: false });

            if (data) {
                // Map the nested structure to match ReviewLesson type
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
            // Fetch all students in the class
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

            // Fetch student stats for all students
            const { data: stats, error: statsError } = await supabase
                .from('student_stats')
                .select('*')
                .in('student_id', studentIds);

            if (statsError) throw statsError;

            // Fetch student progress for all students
            const { data: progress, error: progressError } = await supabase
                .from('student_progress')
                .select(`
                    *,
                    lessons (
                        id,
                        title
                    )
                `)
                .in('student_id', studentIds);

            if (progressError) throw progressError;

            // Combine data for display
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
        if (!lessonId) {
            setReviewAttempts([]);
            return;
        }

        setLoadingReview(true);
        try {
            // Fetch attempts header
            const { data, error } = await supabase
                .from('attempts')
                .select('id, created_at, score, students(display_name)')
                .eq('lesson_id', lessonId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            if (data) {
                const mapped = data.map(d => ({
                    ...d,
                    score: d.score,
                }));
                setReviewAttempts(mapped as any);
            }
        } catch (e) {
            console.error('Error fetching attempts:', e);
            alert('Failed to fetch attempts.');
        } finally {
            setLoadingReview(false);
        }
    };

    const toggleExpandAttempt = async (attemptId: string) => {
        if (expandedAttemptId === attemptId) {
            setExpandedAttemptId(null);
            return;
        }

        setExpandedAttemptId(attemptId);
        console.log('Fetching details for attempt:', attemptId);
        // Fetch details for this attempt
        try {
            const { data, error } = await supabase
                .from('attempt_answers')
                .select(`
                    is_correct,
                    selected_choice,
                    questions (
                        question,
                        choices,
                        correct_index
                    )
                `)
                .eq('attempt_id', attemptId);

            if (error) {
                console.error('Supabase error fetching answers:', error);
                alert(`Error fetching attempt details: ${error.message} (Code: ${error.code})`);
                throw error;
            }
            if (data) {
                console.log('Fetched answer details:', data);
                setExpandedAttemptDetails(data);
            }
        } catch (e: any) {
            console.error('Failed to fetch answer details:', e);
            alert(`Failed setting details: ${e.message}`);
        }
    };


    const handleCreateClass = async () => {
        if (!className.trim()) {
            alert('Please enter a class name.');
            return;
        }

        try {
            const { data, error } = await supabase
                .from('classes')
                .insert({ title: className.trim() })
                .select('id')
                .single();

            if (error) {
                console.error('Supabase error creating class:', error);
                alert(`Failed to create class:\n${error.message}\n\nCode: ${error.code}`);
                return;
            }

            if (data) {
                const id = data.id;
                setActiveClassId(id);
                localStorage.setItem('edtech_active_class_id_v1', id);
                setInviteLink(`${window.location.origin}/c/${id}`);
                setClassStatus(`Active class: ${className.trim()}`);
                setClassName('');
                alert(`Class "${className.trim()}" created! ✅`);

                // Refresh stats
                setStudentCount(0);
                setAttemptsCount(0);
                setReviewLessons([]);
                setReviewAttempts([]);
            }
        } catch (err: any) {
            console.error('Unexpected error creating class:', err);
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

        // 1. Save Local (MVP Requirement: Keep existing behavior)
        const newLesson: Lesson = {
            id: crypto.randomUUID(),
            title,
            content,
            subject: 'General',
            grade: 1,
            quizzes: [],
            questions,
            createdAt: Date.now(),
        };

        const updatedLessons = [...lessons, newLesson];
        setLessons(updatedLessons);
        await saveLessons(updatedLessons);

        // 2. Sync to Supabase if Class is Active
        if (activeClassId) {
            try {
                // Insert Lesson
                const { data: lessonData, error: lessonError } = await supabase
                    .from('lessons')
                    .insert({
                        id: newLesson.id, // Keep ID consistent
                        class_id: activeClassId,
                        title: newLesson.title,
                        content: newLesson.content,
                        created_at: new Date(newLesson.createdAt).toISOString()
                    })
                    .select('id')
                    .single();

                if (lessonError) throw lessonError;

                // Insert Questions
                if (questions.length > 0) {
                    const questionsToInsert = questions.map(q => ({
                        lesson_id: newLesson.id,
                        question: q.text,
                        choices: q.choices,
                        correct_index: q.correctIndex
                    }));

                    const { error: qError } = await supabase
                        .from('questions')
                        .insert(questionsToInsert);

                    if (qError) throw qError;
                }

                setSaveStatus('Saved to cloud ✅');
                setTimeout(() => setSaveStatus(''), 3000);

                // Refresh review list
                fetchReviewLessons(activeClassId);

            } catch (err) {
                console.error('Failed to sync to Supabase:', err);
                setSaveStatus('Saved locally (Cloud sync failed) ⚠️');
            }
        } else {
            setSaveStatus('Saved locally ✅');
            setTimeout(() => setSaveStatus(''), 3000);
        }

        // Reset form
        setTitle('');
        setContent('');
        setQuestions([]);
    };

    const handleResetData = async () => {
        if (window.confirm('Are you sure you want to delete ALL lessons and quiz attempts? This cannot be undone.')) {
            await clearData();
            refreshData();
        }
    };

    const handleExportData = async () => {
        const jsonString = await exportData();
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `edtech_backup_${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
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
                if (success) {
                    alert('Data imported successfully!');
                    refreshData();
                } else {
                    alert('Failed to import data. Please check the file format.');
                }
            }
            // Reset input
            if (fileInputRef.current) fileInputRef.current.value = '';
        };
        reader.readAsText(file);
    };

    const handleCleanup = async () => {
        if (!confirm('This will remove duplicate lessons by title. Continue?')) return;
        setCleaning(true);
        try {
            await deDuplicateLessons();
            await refreshData();
            alert('Cleanup complete!');
        } catch (e) {
            console.error(e);
            alert('Cleanup failed');
        } finally {
            setCleaning(false);
        }
    };

    const handleMigrate = async () => {
        if (!window.confirm('This will upload all local lessons to Supabase. Continue?')) return;

        setMigrating(true);
        const result = await migrateToCloud();
        setMigrating(false);
        alert(result.message);
    };

    // Helper to get local stats (sync processing of loaded data)
    const getLessonStats = (lesson: Lesson) => {
        if (!lesson.questions || lesson.questions.length === 0) return null;

        const attempts = allAttempts.filter(a => a.lessonId === lesson.id);
        if (attempts.length === 0) return { count: 0, avgScore: 0, attempts: [], topMissed: [] };

        const totalScorePercent = attempts.reduce((sum, a) => {
            const qCount = lesson.questions!.length;
            if (qCount === 0) return sum;
            const percentage = (a.score / qCount) * 100;
            return sum + percentage;
        }, 0);

        const avg = Math.round(totalScorePercent / attempts.length);

        // Calculate missed questions
        // allAttempts.answers is Record<string, string> now in storage.ts
        // BUT for local mode, older data might still have issues? 
        // We normalized it in storage.ts `loadAllAttempts`.
        // So we can assume `Record<string, string>` where key is index.
        const questionStats = lesson.questions.map((q, idx) => {
            const incorrectCount = attempts.filter(a => {
                // answers is Record<string, string>
                const ansStr = a.answers[String(idx)];
                // If ansStr is present, parse it.
                // If it's missing (undefined), it's incorrect (implicit).
                // Or undefined means not answered?
                const val = ansStr ? parseInt(ansStr, 10) : -1;
                return val !== q.correctIndex;
            }).length;
            const rate = Math.round((incorrectCount / attempts.length) * 100);
            return { question: q, incorrectCount, rate };
        });

        // Sort by incorrect count desc
        const topMissed = questionStats
            .sort((a, b) => b.incorrectCount - a.incorrectCount)
            .filter(s => s.incorrectCount > 0)
            .slice(0, 3);

        return { count: attempts.length, avgScore: avg, attempts, topMissed };
    };

    return (
        <div style={{ padding: '20px', fontFamily: 'sans-serif', maxWidth: '800px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                    <h1 style={{ margin: 0 }}>Teacher Portal</h1>
                    <div style={{ fontSize: '10px', color: '#888', marginTop: '4px' }}>
                        Mode: {process.env.NEXT_PUBLIC_STORAGE_MODE || 'local'} |
                        Key: {process.env.NEXT_PUBLIC_DEMO_KEY ? process.env.NEXT_PUBLIC_DEMO_KEY.slice(0, 4) + '***' : 'None'}
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <a
                        href="/teacher/studio"
                        style={{
                            padding: '10px 20px',
                            fontSize: '14px',
                            backgroundColor: '#673ab7',
                            color: 'white',
                            textDecoration: 'none',
                            borderRadius: '6px',
                            fontWeight: 'bold',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            boxShadow: '0 2px 8px rgba(103, 58, 183, 0.3)'
                        }}
                    >
                        🧪 Teacher Studio
                    </a>
                    <button
                        onClick={handleMigrate}
                        disabled={migrating}
                        style={{
                            padding: '8px 16px',
                            fontSize: '14px',
                            backgroundColor: migrating ? '#ccc' : '#9c27b0',
                            color: 'white',
                            border: 'none',
                            cursor: migrating ? 'wait' : 'pointer',
                            borderRadius: '4px'
                        }}
                    >
                        {migrating ? 'Migrating...' : 'Migrate to Cloud'}
                    </button>
                    <button
                        onClick={handleCleanup}
                        disabled={cleaning}
                        style={{
                            padding: '8px 16px',
                            fontSize: '14px',
                            backgroundColor: cleaning ? '#ccc' : '#ff5722',
                            color: 'white',
                            border: 'none',
                            cursor: cleaning ? 'wait' : 'pointer',
                            borderRadius: '4px'
                        }}
                    >
                        {cleaning ? 'Cleaning...' : 'Cleanup Duplicates'}
                    </button>

                    <button
                        onClick={handleExportData}
                        style={{
                            padding: '8px 16px',
                            fontSize: '14px',
                            backgroundColor: '#4caf50',
                            color: 'white',
                            border: 'none',
                            cursor: 'pointer',
                            borderRadius: '4px'
                        }}
                    >
                        Export Data
                    </button>

                    <label
                        style={{
                            padding: '8px 16px',
                            fontSize: '14px',
                            backgroundColor: '#2196f3',
                            color: 'white',
                            cursor: 'pointer',
                            borderRadius: '4px',
                            display: 'inline-block'
                        }}
                    >
                        Import Data
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleImportFileChange}
                            accept=".json"
                            style={{ display: 'none' }}
                        />
                    </label>

                    <button
                        onClick={handleResetData}
                        style={{
                            padding: '8px 16px',
                            fontSize: '14px',
                            backgroundColor: '#d32f2f',
                            color: 'white',
                            border: 'none',
                            cursor: 'pointer',
                            borderRadius: '4px'
                        }}
                    >
                        Reset
                    </button>
                </div>
            </div>

            {/* Class Management Section */}
            <div style={{ marginBottom: '30px', border: '2px solid #673ab7', padding: '20px', borderRadius: '8px', backgroundColor: '#f3e5f5' }}>
                <h2 style={{ color: '#673ab7', marginTop: 0 }}>Create Class</h2>

                {classStatus && (
                    <div style={{ marginBottom: '15px', padding: '10px', backgroundColor: '#d1c4e9', borderRadius: '4px', fontWeight: 'bold' }}>
                        {classStatus}
                    </div>
                )}

                <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                    <input
                        type="text"
                        placeholder="Class Name (e.g. Math 101)"
                        value={className}
                        onChange={(e) => setClassName(e.target.value)}
                        style={{ flex: 1, padding: '10px' }}
                    />
                    <button
                        onClick={handleCreateClass}
                        style={{ padding: '10px 20px', backgroundColor: '#673ab7', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}
                    >
                        Create Class
                    </button>
                </div>

                {activeClassId && (
                    <div style={{ marginTop: '10px' }}>
                        <div style={{ fontSize: '14px', marginBottom: '15px' }}>
                            <p style={{ margin: '5px 0' }}><strong>Share Link:</strong> {inviteLink}</p>
                            <button
                                onClick={copyToClipboard}
                                style={{ padding: '5px 10px', fontSize: '12px', cursor: 'pointer' }}
                            >
                                Copy Link
                            </button>
                        </div>

                        {/* Debug Panel / Stats */}
                        <div style={{ background: '#333', color: '#fff', padding: '10px', borderRadius: '4px', fontSize: '13px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                                <strong style={{ color: '#ff9800' }}>Class Stats (Supabase)</strong>
                                <button
                                    onClick={() => {
                                        fetchClassStats(activeClassId);
                                        fetchReviewLessons(activeClassId);
                                        fetchStudentProgress(activeClassId);
                                    }}
                                    style={{ background: 'transparent', border: '1px solid #777', color: '#fff', fontSize: '11px', cursor: 'pointer', padding: '2px 5px' }}
                                >
                                    {loadingStats ? '...' : 'Refresh'}
                                </button>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                <div>Students joined: <strong style={{ fontSize: '16px', color: '#4caf50' }}>{studentCount}</strong></div>
                                <div>Attempts total: <strong style={{ fontSize: '16px', color: '#2196f3' }}>{attemptsCount}</strong></div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Student Progress Tracking Section */}
            {activeClassId && (
                <div style={{ marginBottom: '30px', border: '2px solid #ff9800', padding: '20px', borderRadius: '8px', backgroundColor: '#fff3e0' }}>
                    <h2 style={{ color: '#e65100', marginTop: 0 }}>Student Progress & Adaptive Difficulty Tracking</h2>

                    {loadingProgress ? (
                        <p>Loading student progress...</p>
                    ) : studentProgressData.length === 0 ? (
                        <p style={{ fontStyle: 'italic', color: '#666' }}>No students have started any quizzes yet.</p>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            {studentProgressData.map(student => (
                                <div key={student.student_id} style={{ marginBottom: '25px', border: '1px solid #ffcc80', borderRadius: '8px', backgroundColor: 'white', padding: '15px' }}>
                                    {/* Student Header */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', paddingBottom: '10px', borderBottom: '2px solid #ffe0b2' }}>
                                        <div>
                                            <h3 style={{ margin: 0, color: '#e65100', fontSize: '18px' }}>{student.student_name}</h3>
                                            <div style={{ fontSize: '13px', color: '#666', marginTop: '4px' }}>
                                                Level {student.level} • {student.total_quizzes} quizzes completed
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                                            <div style={{ textAlign: 'center' }}>
                                                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ff9800' }}>{student.total_points}</div>
                                                <div style={{ fontSize: '11px', color: '#666' }}>Total Points</div>
                                            </div>
                                            <div style={{ textAlign: 'center' }}>
                                                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f44336' }}>🔥 {student.current_streak}</div>
                                                <div style={{ fontSize: '11px', color: '#666' }}>Day Streak</div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Lessons Progress */}
                                    {student.lessons_progress.length === 0 ? (
                                        <p style={{ fontStyle: 'italic', color: '#999', margin: '10px 0' }}>No lesson progress yet</p>
                                    ) : (
                                        <div style={{ display: 'grid', gap: '10px' }}>
                                            {student.lessons_progress.map((lp: any) => (
                                                <div key={lp.lesson_id} style={{ border: '1px solid #ffe0b2', borderRadius: '4px', padding: '12px', backgroundColor: '#fffaf5' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                                        <div style={{ fontWeight: 'bold', color: '#333', fontSize: '15px' }}>{lp.lesson_title}</div>
                                                        <div style={{
                                                            padding: '4px 12px',
                                                            borderRadius: '12px',
                                                            fontSize: '12px',
                                                            fontWeight: 'bold',
                                                            backgroundColor: lp.current_difficulty === 'easy' ? '#d4edda' : lp.current_difficulty === 'medium' ? '#fff3cd' : '#f8d7da',
                                                            color: lp.current_difficulty === 'easy' ? '#155724' : lp.current_difficulty === 'medium' ? '#856404' : '#721c24',
                                                            border: `2px solid ${lp.current_difficulty === 'easy' ? '#28a745' : lp.current_difficulty === 'medium' ? '#ffc107' : '#dc3545'}`
                                                        }}>
                                                            Current: {lp.current_difficulty === 'easy' ? '⭐ Easy' : lp.current_difficulty === 'medium' ? '⭐⭐ Medium' : '⭐⭐⭐ Hard'}
                                                        </div>
                                                    </div>

                                                    {/* Difficulty Progress Grid */}
                                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                                                        {/* Easy */}
                                                        <div style={{
                                                            padding: '8px',
                                                            borderRadius: '4px',
                                                            backgroundColor: lp.easy_mastered ? '#d4edda' : '#f8f9fa',
                                                            border: `1px solid ${lp.easy_mastered ? '#28a745' : '#dee2e6'}`
                                                        }}>
                                                            <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#155724', marginBottom: '4px' }}>
                                                                ⭐ Easy {lp.easy_mastered && '✓'}
                                                            </div>
                                                            <div style={{ fontSize: '11px', color: '#666' }}>
                                                                {lp.easy_accuracy}% accuracy
                                                            </div>
                                                            <div style={{ fontSize: '10px', color: lp.easy_mastered ? '#28a745' : '#999', fontWeight: lp.easy_mastered ? 'bold' : 'normal' }}>
                                                                {lp.easy_mastered ? 'Mastered!' : 'In Progress'}
                                                            </div>
                                                        </div>

                                                        {/* Medium */}
                                                        <div style={{
                                                            padding: '8px',
                                                            borderRadius: '4px',
                                                            backgroundColor: lp.medium_mastered ? '#fff3cd' : '#f8f9fa',
                                                            border: `1px solid ${lp.medium_mastered ? '#ffc107' : '#dee2e6'}`
                                                        }}>
                                                            <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#856404', marginBottom: '4px' }}>
                                                                ⭐⭐ Medium {lp.medium_mastered && '✓'}
                                                            </div>
                                                            <div style={{ fontSize: '11px', color: '#666' }}>
                                                                {lp.medium_accuracy}% accuracy
                                                            </div>
                                                            <div style={{ fontSize: '10px', color: lp.medium_mastered ? '#ff9800' : '#999', fontWeight: lp.medium_mastered ? 'bold' : 'normal' }}>
                                                                {lp.medium_mastered ? 'Mastered!' : lp.easy_mastered ? 'In Progress' : 'Locked'}
                                                            </div>
                                                        </div>

                                                        {/* Hard */}
                                                        <div style={{
                                                            padding: '8px',
                                                            borderRadius: '4px',
                                                            backgroundColor: lp.hard_mastered ? '#f8d7da' : '#f8f9fa',
                                                            border: `1px solid ${lp.hard_mastered ? '#dc3545' : '#dee2e6'}`
                                                        }}>
                                                            <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#721c24', marginBottom: '4px' }}>
                                                                ⭐⭐⭐ Hard {lp.hard_mastered && '✓'}
                                                            </div>
                                                            <div style={{ fontSize: '11px', color: '#666' }}>
                                                                {lp.hard_accuracy}% accuracy
                                                            </div>
                                                            <div style={{ fontSize: '10px', color: lp.hard_mastered ? '#dc3545' : '#999', fontWeight: lp.hard_mastered ? 'bold' : 'normal' }}>
                                                                {lp.hard_mastered ? 'Mastered!' : lp.medium_mastered ? 'In Progress' : 'Locked'}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Attempt Review Section */}
            {activeClassId && (
                <div style={{ marginBottom: '30px', border: '2px solid #009688', padding: '20px', borderRadius: '8px', backgroundColor: '#e0f2f1' }}>
                    <h2 style={{ color: '#00796b', marginTop: 0 }}>Attempt Review</h2>

                    <div style={{ marginBottom: '15px' }}>
                        <label style={{ marginRight: '10px', fontWeight: 'bold' }}>Select Lesson:</label>
                        <select
                            value={selectedReviewLessonId}
                            onChange={(e) => handleSelectReviewLesson(e.target.value)}
                            style={{ padding: '8px', borderRadius: '4px', borderColor: '#ccc' }}
                        >
                            <option value="">-- Choose a lesson --</option>
                            {reviewLessons.map(l => (
                                <option key={l.id} value={l.id}>{l.title}</option>
                            ))}
                        </select>
                    </div>

                    {selectedReviewLessonId && (
                        <div>
                            {loadingReview ? (
                                <p>Loading attempts...</p>
                            ) : reviewAttempts.length === 0 ? (
                                <p style={{ fontStyle: 'italic', color: '#666' }}>No attempts yet for this lesson.</p>
                            ) : (
                                <div>
                                    <p><strong>Total Attempts:</strong> {reviewAttempts.length}</p>
                                    <div style={{ display: 'grid', gap: '10px' }}>
                                        {reviewAttempts.map(attempt => {
                                            const isExpanded = expandedAttemptId === attempt.id;
                                            const studentName = attempt.students?.display_name || 'Unknown Student';
                                            const lesson = reviewLessons.find(l => l.id === selectedReviewLessonId);

                                            return (
                                                <div key={attempt.id} style={{ border: '1px solid #b2dfdb', borderRadius: '4px', backgroundColor: 'white' }}>
                                                    <div
                                                        onClick={() => toggleExpandAttempt(attempt.id)}
                                                        style={{
                                                            padding: '10px',
                                                            cursor: 'pointer',
                                                            display: 'flex',
                                                            justifyContent: 'space-between',
                                                            alignItems: 'center',
                                                            backgroundColor: isExpanded ? '#b2dfdb' : 'transparent',
                                                            fontWeight: isExpanded ? 'bold' : 'normal'
                                                        }}
                                                    >
                                                        <span>
                                                            <strong>{studentName}</strong>
                                                            <span style={{ margin: '0 10px', color: '#666' }}>|</span>
                                                            Score: {(() => {
                                                                const qCount = lesson?.questions.length || 0;
                                                                if (qCount === 0) return '0';
                                                                return Math.round((attempt.score / qCount) * 100);
                                                            })()}%
                                                        </span>
                                                        <span style={{ fontSize: '12px', color: '#777' }}>
                                                            {new Date(attempt.created_at).toLocaleString()} {isExpanded ? '▲' : '▼'}
                                                        </span>
                                                    </div>

                                                    {isExpanded && (
                                                        <div style={{ padding: '15px', borderTop: '1px solid #eee' }}>
                                                            {expandedAttemptDetails.length === 0 ? (
                                                                <div style={{ padding: '10px', color: '#666', fontStyle: 'italic', textAlign: 'center' }}>
                                                                    No individual answer data found for this attempt.<br /> (This attempt was likely completed before granular tracking was added).<br /><br /><b>Please complete a NEW quiz attempt in the Student Portal to see this feature in action.</b>
                                                                </div>
                                                            ) : (
                                                                expandedAttemptDetails.map((detail, idx) => {
                                                                    const q = detail.questions;
                                                                    const qText = q?.question || 'Question deleted (?)';
                                                                    const isCorrect = detail.is_correct;
                                                                    const correctChoice = q?.choices?.[q?.correct_index] || 'Unknown';
                                                                    const selectedText = detail.selected_choice || '(Unanswered)';

                                                                    return (
                                                                        <div key={idx} style={{ marginBottom: '10px', paddingBottom: '10px', borderBottom: '1px dotted #ccc' }}>
                                                                            <div style={{ marginBottom: '4px', fontWeight: 600 }}>Q{idx + 1}: {qText}</div>
                                                                            <div style={{ fontSize: '14px' }}>
                                                                                <span style={{
                                                                                    color: isCorrect ? 'green' : (detail.selected_choice === null ? 'orange' : 'red'),
                                                                                    fontWeight: 'bold',
                                                                                    marginRight: '10px'
                                                                                }}>
                                                                                    {isCorrect ? '✅ Correct' : (detail.selected_choice === null ? '⚠️ Unanswered' : '❌ Wrong')}
                                                                                </span>
                                                                                {!isCorrect && <span style={{ color: '#555' }}>You chose: {selectedText}</span>}
                                                                                {isCorrect && <span style={{ color: '#555' }}>Answer: {selectedText}</span>}
                                                                            </div>
                                                                            {!isCorrect && (
                                                                                <div style={{ fontSize: '13px', color: 'green', marginTop: '2px' }}>
                                                                                    Correct Answer: {correctChoice}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    );
                                                                })
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            <div style={{ marginBottom: '30px', border: '1px solid #ccc', padding: '20px', borderRadius: '8px' }}>
                <h2>1. Lesson Details</h2>
                {/* ... (Existing Create Lesson UI) */}
                <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Title:</label>
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        style={{ width: '100%', padding: '8px', fontSize: '16px' }}
                        placeholder="e.g. Introduction to Algebra"
                    />
                </div>

                <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Content:</label>
                    <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        style={{ width: '100%', height: '120px', padding: '8px', fontSize: '16px' }}
                        placeholder="Write your lesson content here..."
                    />
                </div>

                <hr style={{ margin: '20px 0' }} />

                <h2>2. Add Quiz Questions (Optional)</h2>
                <div style={{ backgroundColor: '#f9f9f9', padding: '15px', borderRadius: '5px' }}>
                    <div style={{ marginBottom: '10px' }}>
                        <label style={{ display: 'block', marginBottom: '5px' }}>Question Text:</label>
                        <input
                            type="text"
                            value={qText}
                            onChange={(e) => setQText(e.target.value)}
                            style={{ width: '100%', padding: '8px' }}
                        />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                        {choices.map((choice, idx) => (
                            <div key={idx}>
                                <label style={{ display: 'block', fontSize: '14px' }}>Choice {idx + 1}:</label>
                                <input
                                    type="text"
                                    value={choice}
                                    onChange={(e) => handleChoiceChange(idx, e.target.value)}
                                    style={{ width: '100%', padding: '6px' }}
                                />
                            </div>
                        ))}
                    </div>

                    <div style={{ marginBottom: '15px' }}>
                        <label style={{ marginRight: '10px' }}>Correct Answer:</label>
                        <select
                            value={correctIndex}
                            onChange={(e) => setCorrectIndex(Number(e.target.value))}
                            style={{ padding: '6px' }}
                        >
                            {[0, 1, 2, 3].map(i => (
                                <option key={i} value={i}>Choice {i + 1}</option>
                            ))}
                        </select>
                    </div>

                    <button
                        onClick={addQuestion}
                        style={{ padding: '8px 16px', backgroundColor: '#333', color: 'white', border: 'none', cursor: 'pointer' }}
                    >
                        Add Question to Quiz
                    </button>
                </div>

                {questions.length > 0 && (
                    <div style={{ marginTop: '15px' }}>
                        <h3>Questions Added ({questions.length}):</h3>
                        <ul style={{ paddingLeft: '20px' }}>
                            {questions.map((q, i) => (
                                <li key={i}>{q.text} (Correct: Choice {q.correctIndex + 1})</li>
                            ))}
                        </ul>
                    </div>
                )}

                <div style={{ marginTop: '30px', textAlign: 'right', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px' }}>
                    {saveStatus && <span style={{ fontWeight: 'bold', color: saveStatus.includes('failed') ? 'red' : 'green' }}>{saveStatus}</span>}
                    <button
                        onClick={handleAddLesson}
                        style={{
                            padding: '12px 24px',
                            fontSize: '18px',
                            backgroundColor: '#0070f3',
                            color: 'white',
                            border: 'none',
                            cursor: 'pointer',
                            borderRadius: '5px'
                        }}
                    >
                        Create Lesson with Quiz
                    </button>
                </div>
            </div>

            <h2>Existing Lessons</h2>
            {lessons.length === 0 ? (
                <p>No lessons created yet.</p>
            ) : (
                <div style={{ display: 'grid', gap: '20px' }}>
                    {lessons.map((lesson) => {
                        const stats = getLessonStats(lesson);
                        const isExpanded = true; // For teacher dashboard, we can keep them mostly visible or add toggles if needed, but let's follow the student layout style

                        return (
                            <div key={lesson.id} style={{
                                border: '1px solid #ddd',
                                borderRadius: '12px',
                                backgroundColor: 'white',
                                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                                overflow: 'hidden'
                            }}>
                                <div style={{
                                    padding: '20px',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'flex-start',
                                    backgroundColor: '#f8fafc',
                                    borderBottom: '1px solid #e2e8f0'
                                }}>
                                    <div>
                                        <h3 style={{ margin: '0 0 5px 0', fontSize: '18px', color: '#1e293b' }}>{lesson.title}</h3>
                                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                            <span style={{ fontSize: '12px', color: '#64748b', backgroundColor: '#f1f5f9', padding: '2px 8px', borderRadius: '10px' }}>
                                                {lesson.questions?.length || 0} Questions
                                            </span>
                                            <span style={{ fontSize: '12px', color: '#3b82f6', backgroundColor: '#eff6ff', padding: '2px 8px', borderRadius: '10px' }}>
                                                Grade {lesson.grade || 6}
                                            </span>
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        {stats && stats.count > 0 ? (
                                            <div style={{ display: 'flex', gap: '15px', fontSize: '14px' }}>
                                                <div style={{ color: '#64748b' }}>
                                                    <span style={{ fontWeight: 'bold', color: '#2563eb' }}>{stats.count}</span> Attempts
                                                </div>
                                                <div style={{ color: '#64748b' }}>
                                                    <span style={{ fontWeight: 'bold', color: stats.avgScore >= 70 ? '#10b981' : '#f59e0b' }}>{stats.avgScore}%</span> Avg
                                                </div>
                                            </div>
                                        ) : (
                                            <span style={{ fontSize: '13px', color: '#94a3b8', fontStyle: 'italic' }}>No attempts yet</span>
                                        )}
                                    </div>
                                </div>

                                {/* Bento Preview - Same as Student Page */}
                                <div style={{
                                    padding: '20px',
                                    background: '#f8fafc',
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                                    gap: '15px'
                                }}>
                                    {/* Podcast Segment */}
                                    <div style={{
                                        background: 'white',
                                        padding: '15px',
                                        borderRadius: '10px',
                                        border: '1px solid #e2e8f0',
                                        fontSize: '13px'
                                    }}>
                                        <h4 style={{ margin: '0 0 10px 0', fontSize: '14px' }}>🎙️ بودكاست</h4>
                                        <div style={{ color: '#64748b', fontStyle: 'italic', marginBottom: '8px' }}>Preview Script:</div>
                                        <div style={{ color: '#475569', maxHeight: '80px', overflowY: 'auto', dir: 'rtl', textAlign: 'right' }}>
                                            {lesson.podcast_script || "No script generated."}
                                        </div>
                                    </div>

                                    {/* Reader Segment */}
                                    <div style={{
                                        background: 'white',
                                        padding: '15px',
                                        borderRadius: '10px',
                                        border: '1px solid #e2e8f0',
                                        fontSize: '13px',
                                        dir: 'rtl'
                                    }}>
                                        <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', textAlign: 'right' }}>📖 ملخص الدرس</h4>
                                        <div style={{ color: '#334155', maxHeight: '80px', overflowY: 'auto', textAlign: 'right' }}>
                                            {lesson.simplified_arabic || lesson.content}
                                        </div>
                                    </div>

                                    {/* Quiz Segment */}
                                    <div style={{
                                        gridColumn: '1 / -1',
                                        background: 'white',
                                        padding: '15px',
                                        borderRadius: '10px',
                                        border: '1px solid #e2e8f0',
                                        fontSize: '13px'
                                    }}>
                                        <h4 style={{ margin: '0 0 10px 0', fontSize: '14px' }}>📝 Quiz Preview</h4>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px' }}>
                                            {(lesson.questions || []).slice(0, 4).map((q, qIdx) => (
                                                <div key={q.id} style={{ padding: '8px', background: '#f1f5f9', borderRadius: '6px' }}>
                                                    <div style={{ fontWeight: 600, marginBottom: '4px', textAlign: 'right', dir: 'rtl' }}>{qIdx + 1}. {q.question?.slice(0, 40)}...</div>
                                                    <div style={{ fontSize: '11px', color: '#16a34a', textAlign: 'right' }}>✓ {q.choices?.[q.correct_index]}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

const getLessonStats = (lesson: any) => {
    // Basic stats calculation
    return { count: 0, avgScore: 0 }; // Placeholder - real implementation should be done with loadAllAttempts
};
