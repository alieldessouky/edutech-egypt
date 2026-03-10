'use client';

import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';

// Local type for this page's preview shape (flat questions, no quizzes nesting)
type GeneratedLessonPreview = {
    title: string;
    objectives: string[];
    summary: string;
    content: string;
    questions: {
        text: string;
        choices: string[];
        correctIndex: number;
    }[];
};

export default function GenerateLessonPage() {
    // Input state
    const [chapterContent, setChapterContent] = useState('');

    // Generation state
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState('');

    // Preview state
    const [preview, setPreview] = useState<GeneratedLessonPreview | null>(null);

    // Publishing state
    const [isPublishing, setIsPublishing] = useState(false);
    const [publishSuccess, setPublishSuccess] = useState(false);

    // Get active class from localStorage
    const getActiveClassId = () => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('edtech_active_class_id_v1') || '';
        }
        return '';
    };

    const handleGenerate = async () => {
        if (!chapterContent.trim() || chapterContent.length < 50) {
            setError('Please enter at least 50 characters of chapter content.');
            return;
        }

        setError('');
        setIsGenerating(true);
        setPreview(null);

        try {
            const response = await fetch('/api/generate-lesson', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: chapterContent })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to generate lesson');
            }

            setPreview({
                title: data.title,
                objectives: data.objectives,
                summary: data.summary,
                content: chapterContent,
                questions: data.questions
            });
        } catch (err: any) {
            setError(err.message || 'Failed to generate lesson. Please try again.');
        } finally {
            setIsGenerating(false);
        }
    };

    const handlePublish = async () => {
        if (!preview) return;

        const classId = getActiveClassId();
        if (!classId) {
            setError('No active class. Please create or select a class first from the Teacher Portal.');
            return;
        }

        setIsPublishing(true);
        setError('');

        try {
            // 1. Create lesson in Supabase
            const lessonId = crypto.randomUUID();
            const { error: lessonError } = await supabase
                .from('lessons')
                .insert({
                    id: lessonId,
                    class_id: classId,
                    title: preview.title,
                    content: `## الأهداف التعليمية\n${preview.objectives.map(o => `- ${o}`).join('\n')}\n\n## الملخص\n${preview.summary}\n\n---\n\n## المحتوى الأصلي\n${preview.content}`,
                    created_at: new Date().toISOString()
                });

            if (lessonError) throw lessonError;

            // 2. Create quiz for the lesson
            const quizId = crypto.randomUUID();
            const { error: quizError } = await supabase
                .from('quizzes')
                .insert({
                    id: quizId,
                    lesson_id: lessonId,
                    title: `اختبار: ${preview.title}`,
                    passing_score: 50,
                    created_at: new Date().toISOString()
                });

            if (quizError) throw quizError;

            // 3. Create questions in Supabase
            if (preview.questions.length > 0) {
                const questionsToInsert = preview.questions.map(q => ({
                    quiz_id: quizId,
                    question: q.text,
                    choices: q.choices,
                    correct_index: q.correctIndex
                }));

                const { error: qError } = await supabase
                    .from('questions')
                    .insert(questionsToInsert);

                if (qError) throw qError;
            }

            setPublishSuccess(true);

        } catch (err: any) {
            console.error('Publish error:', err);
            setError(err.message || 'Failed to publish lesson. Please try again.');
        } finally {
            setIsPublishing(false);
        }
    };

    const handleEditTitle = (value: string) => {
        if (preview) {
            setPreview({ ...preview, title: value });
        }
    };

    const handleEditSummary = (value: string) => {
        if (preview) {
            setPreview({ ...preview, summary: value });
        }
    };

    const handleEditObjective = (index: number, value: string) => {
        if (preview) {
            const newObjectives = [...preview.objectives];
            newObjectives[index] = value;
            setPreview({ ...preview, objectives: newObjectives });
        }
    };

    const handleRemoveObjective = (index: number) => {
        if (preview) {
            const newObjectives = preview.objectives.filter((_, i) => i !== index);
            setPreview({ ...preview, objectives: newObjectives });
        }
    };

    const handleEditQuestion = (qIndex: number, field: 'text' | 'correctIndex', value: any) => {
        if (preview) {
            const newQuestions = [...preview.questions];
            newQuestions[qIndex] = { ...newQuestions[qIndex], [field]: value };
            setPreview({ ...preview, questions: newQuestions });
        }
    };

    const handleEditChoice = (qIndex: number, cIndex: number, value: string) => {
        if (preview) {
            const newQuestions = [...preview.questions];
            const newChoices = [...newQuestions[qIndex].choices];
            newChoices[cIndex] = value;
            newQuestions[qIndex] = { ...newQuestions[qIndex], choices: newChoices };
            setPreview({ ...preview, questions: newQuestions });
        }
    };

    const handleRemoveQuestion = (qIndex: number) => {
        if (preview) {
            const newQuestions = preview.questions.filter((_, i) => i !== qIndex);
            setPreview({ ...preview, questions: newQuestions });
        }
    };

    const handleReset = () => {
        setPreview(null);
        setPublishSuccess(false);
        setChapterContent('');
        setError('');
    };

    if (publishSuccess) {
        return (
            <div style={{ padding: '40px', fontFamily: 'sans-serif', maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
                <div style={{
                    backgroundColor: '#e8f5e9',
                    padding: '40px',
                    borderRadius: '12px',
                    border: '2px solid #4caf50'
                }}>
                    <div style={{ fontSize: '48px', marginBottom: '20px' }}>✅</div>
                    <h1 style={{ color: '#2e7d32', marginBottom: '10px' }}>Lesson Published!</h1>
                    <p style={{ color: '#558b2f', fontSize: '18px', marginBottom: '30px' }}>
                        Your AI-generated lesson is now available for students.
                    </p>
                    <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
                        <a
                            href="/teacher"
                            style={{
                                padding: '12px 24px',
                                backgroundColor: '#4caf50',
                                color: 'white',
                                textDecoration: 'none',
                                borderRadius: '6px',
                                fontWeight: 'bold'
                            }}
                        >
                            Back to Dashboard
                        </a>
                        <button
                            onClick={handleReset}
                            style={{
                                padding: '12px 24px',
                                backgroundColor: '#fff',
                                color: '#4caf50',
                                border: '2px solid #4caf50',
                                borderRadius: '6px',
                                fontWeight: 'bold',
                                cursor: 'pointer'
                            }}
                        >
                            Generate Another
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div style={{ padding: '20px', fontFamily: 'sans-serif', maxWidth: '900px', margin: '0 auto' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <div>
                    <h1 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '32px' }}>✨</span>
                        AI Lesson Generator
                    </h1>
                    <p style={{ color: '#666', margin: '5px 0 0 0' }}>
                        Paste your chapter content and let AI create a structured lesson with quiz
                    </p>
                </div>
                <a
                    href="/teacher"
                    style={{
                        padding: '8px 16px',
                        color: '#666',
                        textDecoration: 'none',
                        border: '1px solid #ddd',
                        borderRadius: '4px'
                    }}
                >
                    ← Back
                </a>
            </div>

            {/* Error Display */}
            {error && (
                <div style={{
                    padding: '15px',
                    backgroundColor: '#ffebee',
                    border: '1px solid #ef5350',
                    borderRadius: '8px',
                    color: '#c62828',
                    marginBottom: '20px'
                }}>
                    ⚠️ {error}
                </div>
            )}

            {!preview ? (
                /* Step 1: Input Section */
                <div style={{
                    border: '2px solid #673ab7',
                    borderRadius: '12px',
                    padding: '25px',
                    backgroundColor: '#f3e5f5'
                }}>
                    <h2 style={{ color: '#673ab7', marginTop: 0 }}>Step 1: Paste Chapter Content</h2>
                    <p style={{ color: '#666', marginBottom: '20px' }}>
                        Paste the Arabic text from your textbook chapter (Arabic or History for Grade 6)
                    </p>

                    <textarea
                        value={chapterContent}
                        onChange={(e) => setChapterContent(e.target.value)}
                        placeholder="الصق محتوى الفصل هنا..."
                        dir="rtl"
                        style={{
                            width: '100%',
                            height: '250px',
                            padding: '15px',
                            fontSize: '16px',
                            fontFamily: 'inherit',
                            border: '1px solid #ce93d8',
                            borderRadius: '8px',
                            resize: 'vertical',
                            marginBottom: '20px'
                        }}
                    />

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: '#888', fontSize: '14px' }}>
                            {chapterContent.length} characters
                            {chapterContent.length < 50 && chapterContent.length > 0 && (
                                <span style={{ color: '#f57c00' }}> (minimum 50 required)</span>
                            )}
                        </span>
                        <button
                            onClick={handleGenerate}
                            disabled={isGenerating || chapterContent.length < 50}
                            style={{
                                padding: '14px 28px',
                                fontSize: '16px',
                                fontWeight: 'bold',
                                backgroundColor: isGenerating || chapterContent.length < 50 ? '#ccc' : '#673ab7',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                cursor: isGenerating || chapterContent.length < 50 ? 'not-allowed' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px'
                            }}
                        >
                            {isGenerating ? (
                                <>
                                    <span className="spinner" style={{
                                        display: 'inline-block',
                                        width: '18px',
                                        height: '18px',
                                        border: '3px solid rgba(255,255,255,0.3)',
                                        borderTop: '3px solid white',
                                        borderRadius: '50%',
                                        animation: 'spin 1s linear infinite'
                                    }}></span>
                                    Generating...
                                </>
                            ) : (
                                <>✨ Generate Lesson with AI</>
                            )}
                        </button>
                    </div>

                    <style jsx>{`
                        @keyframes spin {
                            0% { transform: rotate(0deg); }
                            100% { transform: rotate(360deg); }
                        }
                    `}</style>
                </div>
            ) : (
                /* Step 2: Preview & Edit Section */
                <div>
                    <div style={{
                        backgroundColor: '#e8f5e9',
                        padding: '15px 20px',
                        borderRadius: '8px',
                        marginBottom: '25px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}>
                        <span style={{ color: '#2e7d32', fontWeight: 'bold' }}>
                            ✓ Lesson generated! Review and edit below, then publish.
                        </span>
                        <button
                            onClick={handleReset}
                            style={{
                                padding: '8px 16px',
                                backgroundColor: 'transparent',
                                border: '1px solid #2e7d32',
                                color: '#2e7d32',
                                borderRadius: '4px',
                                cursor: 'pointer'
                            }}
                        >
                            Start Over
                        </button>
                    </div>

                    {/* Title */}
                    <div style={{ marginBottom: '25px' }}>
                        <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px', color: '#333' }}>
                            Lesson Title
                        </label>
                        <input
                            type="text"
                            value={preview.title}
                            onChange={(e) => handleEditTitle(e.target.value)}
                            dir="rtl"
                            style={{
                                width: '100%',
                                padding: '12px',
                                fontSize: '18px',
                                border: '1px solid #ddd',
                                borderRadius: '6px'
                            }}
                        />
                    </div>

                    {/* Objectives */}
                    <div style={{ marginBottom: '25px' }}>
                        <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px', color: '#333' }}>
                            Learning Objectives (الأهداف التعليمية)
                        </label>
                        {preview.objectives.map((obj, idx) => (
                            <div key={idx} style={{ display: 'flex', gap: '10px', marginBottom: '8px' }}>
                                <input
                                    type="text"
                                    value={obj}
                                    onChange={(e) => handleEditObjective(idx, e.target.value)}
                                    dir="rtl"
                                    style={{
                                        flex: 1,
                                        padding: '10px',
                                        border: '1px solid #ddd',
                                        borderRadius: '4px'
                                    }}
                                />
                                <button
                                    onClick={() => handleRemoveObjective(idx)}
                                    style={{
                                        padding: '10px 15px',
                                        backgroundColor: '#ffebee',
                                        border: 'none',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        color: '#c62828'
                                    }}
                                >
                                    ✕
                                </button>
                            </div>
                        ))}
                    </div>

                    {/* Summary */}
                    <div style={{ marginBottom: '25px' }}>
                        <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px', color: '#333' }}>
                            Summary (الملخص)
                        </label>
                        <textarea
                            value={preview.summary}
                            onChange={(e) => handleEditSummary(e.target.value)}
                            dir="rtl"
                            style={{
                                width: '100%',
                                height: '150px',
                                padding: '12px',
                                fontSize: '16px',
                                border: '1px solid #ddd',
                                borderRadius: '6px',
                                resize: 'vertical'
                            }}
                        />
                    </div>

                    {/* Quiz Questions */}
                    <div style={{ marginBottom: '30px' }}>
                        <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '15px', color: '#333', fontSize: '18px' }}>
                            Quiz Questions ({preview.questions.length})
                        </label>

                        {preview.questions.map((q, qIdx) => (
                            <div key={qIdx} style={{
                                border: '1px solid #e0e0e0',
                                borderRadius: '8px',
                                padding: '20px',
                                marginBottom: '15px',
                                backgroundColor: '#fafafa'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
                                    <span style={{ fontWeight: 'bold', color: '#673ab7' }}>Question {qIdx + 1}</span>
                                    <button
                                        onClick={() => handleRemoveQuestion(qIdx)}
                                        style={{
                                            padding: '5px 10px',
                                            backgroundColor: '#ffebee',
                                            border: 'none',
                                            borderRadius: '4px',
                                            cursor: 'pointer',
                                            color: '#c62828',
                                            fontSize: '12px'
                                        }}
                                    >
                                        Remove
                                    </button>
                                </div>

                                <input
                                    type="text"
                                    value={q.text}
                                    onChange={(e) => handleEditQuestion(qIdx, 'text', e.target.value)}
                                    dir="rtl"
                                    style={{
                                        width: '100%',
                                        padding: '10px',
                                        marginBottom: '15px',
                                        border: '1px solid #ddd',
                                        borderRadius: '4px',
                                        fontSize: '15px'
                                    }}
                                />

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                    {q.choices.map((choice, cIdx) => (
                                        <div key={cIdx} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <input
                                                type="radio"
                                                name={`correct-${qIdx}`}
                                                checked={q.correctIndex === cIdx}
                                                onChange={() => handleEditQuestion(qIdx, 'correctIndex', cIdx)}
                                                style={{ accentColor: '#4caf50' }}
                                            />
                                            <input
                                                type="text"
                                                value={choice}
                                                onChange={(e) => handleEditChoice(qIdx, cIdx, e.target.value)}
                                                dir="rtl"
                                                style={{
                                                    flex: 1,
                                                    padding: '8px',
                                                    border: q.correctIndex === cIdx ? '2px solid #4caf50' : '1px solid #ddd',
                                                    borderRadius: '4px',
                                                    backgroundColor: q.correctIndex === cIdx ? '#e8f5e9' : 'white'
                                                }}
                                            />
                                        </div>
                                    ))}
                                </div>
                                <p style={{ fontSize: '12px', color: '#888', marginTop: '10px', marginBottom: 0 }}>
                                    Select the radio button next to the correct answer
                                </p>
                            </div>
                        ))}
                    </div>

                    {/* Publish Button */}
                    <div style={{
                        borderTop: '2px solid #e0e0e0',
                        paddingTop: '25px',
                        display: 'flex',
                        justifyContent: 'flex-end',
                        gap: '15px'
                    }}>
                        <button
                            onClick={handleReset}
                            style={{
                                padding: '14px 28px',
                                backgroundColor: 'white',
                                border: '1px solid #ddd',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontSize: '16px'
                            }}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handlePublish}
                            disabled={isPublishing || preview.questions.length === 0}
                            style={{
                                padding: '14px 32px',
                                fontSize: '16px',
                                fontWeight: 'bold',
                                backgroundColor: isPublishing ? '#ccc' : '#4caf50',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                cursor: isPublishing ? 'not-allowed' : 'pointer'
                            }}
                        >
                            {isPublishing ? 'Publishing...' : '🚀 Publish Lesson'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
