'use client';

import React, { useState, useEffect } from 'react';
import { Question, Quiz } from '../lib/storage';

interface QuizCreatorProps {
    initialQuiz?: Quiz;
    // If no ID is provided in initialQuiz, a new one will be generated.
    // The parent component is responsible for saving the quiz to the lesson/storage.
    onSave: (quiz: Quiz) => void;
    onCancel: () => void;
    className?: string;
}

export default function QuizCreator({ initialQuiz, onSave, onCancel, className = '' }: QuizCreatorProps) {
    // State for the quiz being edited
    const [title, setTitle] = useState(initialQuiz?.title || '');
    const [questions, setQuestions] = useState<Question[]>(initialQuiz?.questions || []);

    // UI State
    const [isPreviewMode, setIsPreviewMode] = useState(false);
    const [activeQuestionIndex, setActiveQuestionIndex] = useState<number | null>(null);

    // Constants
    const MIN_CHOICES = 2;
    const MAX_CHOICES = 5;

    // Initialize a new question template
    const createNewQuestion = (): Question => ({
        id: crypto.randomUUID(),
        quizId: initialQuiz?.id || '', // Will be set on save if new
        text: '',
        choices: ['', '', '', ''],
        correctIndex: 0,
        imageUrl: ''
    });

    const handleAddQuestion = () => {
        const newQ = createNewQuestion();
        setQuestions([...questions, newQ]);
        setActiveQuestionIndex(questions.length); // Focus on the new question
    };

    const handleRemoveQuestion = (index: number) => {
        const newQuestions = [...questions];
        newQuestions.splice(index, 1);
        setQuestions(newQuestions);
        if (activeQuestionIndex === index) {
            setActiveQuestionIndex(null);
        } else if (activeQuestionIndex !== null && activeQuestionIndex > index) {
            setActiveQuestionIndex(activeQuestionIndex - 1);
        }
    };

    const updateQuestion = (index: number, updates: Partial<Question>) => {
        const newQuestions = [...questions];
        newQuestions[index] = { ...newQuestions[index], ...updates };
        setQuestions(newQuestions);
    };

    const handleChoiceChange = (qIndex: number, cIndex: number, value: string) => {
        const newQuestions = [...questions];
        const newChoices = [...newQuestions[qIndex].choices];
        newChoices[cIndex] = value;
        newQuestions[qIndex].choices = newChoices;
        setQuestions(newQuestions);
    };

    const addChoice = (qIndex: number) => {
        const newQuestions = [...questions];
        if (newQuestions[qIndex].choices.length < MAX_CHOICES) {
            newQuestions[qIndex].choices.push('');
            setQuestions(newQuestions);
        }
    };

    const removeChoice = (qIndex: number, cIndex: number) => {
        const newQuestions = [...questions];
        if (newQuestions[qIndex].choices.length > MIN_CHOICES) {
            const newChoices = [...newQuestions[qIndex].choices];
            newChoices.splice(cIndex, 1);

            // Adjust correct index if needed
            let newCorrectIndex = newQuestions[qIndex].correctIndex;
            if (cIndex === newCorrectIndex) {
                newCorrectIndex = 0; // Reset to first if the correct one was removed
            } else if (cIndex < newCorrectIndex) {
                newCorrectIndex--;
            }

            newQuestions[qIndex].choices = newChoices;
            newQuestions[qIndex].correctIndex = newCorrectIndex;
            setQuestions(newQuestions);
        }
    };

    const handleSave = () => {
        if (!title.trim()) {
            alert('Please enter a quiz title');
            return;
        }
        if (questions.length === 0) {
            alert('Please add at least one question');
            return;
        }
        // Validation: Check for empty questions or choices
        for (let i = 0; i < questions.length; i++) {
            const q = questions[i];
            if (!q.text.trim()) {
                alert(`Question ${i + 1} can't be empty`);
                return;
            }
            for (let j = 0; j < q.choices.length; j++) {
                if (!q.choices[j].trim()) {
                    alert(`Choice ${j + 1} in Question ${i + 1} can't be empty`);
                    return;
                }
            }
        }

        const quizToSave: Quiz = {
            id: initialQuiz?.id || crypto.randomUUID(),
            lessonId: initialQuiz?.lessonId || '', // Parent should probably handle linking if new
            title,
            questions
        };

        onSave(quizToSave);
    };

    return (
        <div className={`flex flex-col h-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg shadow-sm ${className}`} dir="rtl">

            {/* Header & Toolbar */}
            <div className="flex flex-col sm:flex-row justify-between items-center p-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 rounded-t-lg gap-4">
                <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">
                    {isPreviewMode ? 'Quiz Preview (Student View)' : 'Quiz Editor'}
                </h2>

                <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                        {isPreviewMode ? 'Editing Mode' : 'Live Preview'}
                    </span>
                    <button
                        onClick={() => setIsPreviewMode(!isPreviewMode)}
                        className={`
                    relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                    ${isPreviewMode ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'}
                `}
                    >
                        <span className={`${isPreviewMode ? '-translate-x-6' : '-translate-x-1'} inline-block h-4 w-4 transform rounded-full bg-white transition-transform`} />
                    </button>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">

                {/* Quiz Meta (Title) - Only editable in Edit Mode */}
                {!isPreviewMode ? (
                    <div className="w-full">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            عنوان الاختبار (Quiz Title)
                        </label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="e.g. Unit 1 Revision"
                            className="w-full p-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-right"
                            dir="auto"
                        />
                    </div>
                ) : (
                    <div className="text-center pb-4 border-b border-gray-200 dark:border-gray-800">
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{title || 'Untitled Quiz'}</h1>
                    </div>
                )}

                {/* Question List */}
                <div className="space-y-6">
                    {questions.map((q, qIndex) => (
                        <div key={q.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden transition-all duration-200">

                            {/* Question Header / Preview */}
                            <div
                                className={`p-4 flex gap-4 ${activeQuestionIndex === qIndex && !isPreviewMode ? 'bg-blue-50 dark:bg-blue-900/10 border-b border-blue-100 dark:border-blue-800' : ''}`}
                                onClick={() => !isPreviewMode && setActiveQuestionIndex(qIndex)}
                            >
                                <span className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 font-bold text-sm">
                                    {qIndex + 1}
                                </span>

                                <div className="flex-1">
                                    {isPreviewMode || activeQuestionIndex !== qIndex ? (
                                        <p className="text-lg font-medium text-gray-800 dark:text-gray-100 py-1 text-right" dir="auto">
                                            {q.text || <span className="text-gray-400 italic">No question text...</span>}
                                        </p>
                                    ) : (
                                        <div className="w-full">
                                            <textarea
                                                value={q.text}
                                                onChange={(e) => updateQuestion(qIndex, { text: e.target.value })}
                                                placeholder="اكتب السؤال هنا..."
                                                rows={2}
                                                className="w-full p-3 border border-blue-300 dark:border-blue-700 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-right"
                                                dir="auto"
                                                autoFocus
                                            />
                                            {/* Image URL Input (Optional) - Only visible when editing */}
                                            <div className="mt-2">
                                                <input
                                                    type="text"
                                                    value={q.imageUrl || ''}
                                                    onChange={(e) => updateQuestion(qIndex, { imageUrl: e.target.value })}
                                                    placeholder="Insert valid image URL (optional)"
                                                    className="w-full text-sm p-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded text-gray-600 dark:text-gray-400 text-right ltr-placeholder"
                                                />
                                                {q.imageUrl && (
                                                    <div className="mt-2 relative h-32 w-full max-w-sm border rounded-lg overflow-hidden">
                                                        <img src={q.imageUrl} alt="Question" className="object-cover w-full h-full" />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Actions (Delete) - Only in Edit Mode */}
                                {!isPreviewMode && (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleRemoveQuestion(qIndex); }}
                                        className="text-gray-400 hover:text-red-500 p-1"
                                        title="Delete Question"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                    </button>
                                )}
                            </div>

                            {/* Choices Area */}
                            {(activeQuestionIndex === qIndex || isPreviewMode) && (
                                <div className="p-4 bg-gray-50 dark:bg-gray-800/50">
                                    <div className="grid gap-3">
                                        {q.choices.map((choice, cIndex) => (
                                            <div
                                                key={cIndex}
                                                className={`
                                flex items-center gap-3 p-3 rounded-lg border transition-all duration-200
                                ${isPreviewMode
                                                        ? 'hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer border-transparent shadow-sm bg-white dark:bg-gray-800'
                                                        : cIndex === q.correctIndex
                                                            ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                                                            : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                                                    }
                            `}
                                            >
                                                {/* Radio Circle (Consistent UI) */}
                                                <div className={`
                                w-5 h-5 rounded-full border flex items-center justify-center shrink-0
                                ${cIndex === q.correctIndex && !isPreviewMode ? 'border-green-500 bg-green-500 text-white' : 'border-gray-300 dark:border-gray-600'}
                            `}>
                                                    {cIndex === q.correctIndex && !isPreviewMode && (
                                                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path></svg>
                                                    )}
                                                </div>

                                                {/* Choice Input or Text */}
                                                {isPreviewMode ? (
                                                    <span className="flex-1 text-right text-gray-700 dark:text-gray-200 font-medium" dir="auto">{choice}</span>
                                                ) : (
                                                    <input
                                                        type="text"
                                                        value={choice}
                                                        onChange={(e) => handleChoiceChange(qIndex, cIndex, e.target.value)}
                                                        placeholder={`Option ${cIndex + 1}`}
                                                        className="flex-1 bg-transparent border-none focus:ring-0 text-right text-gray-800 dark:text-gray-100 placeholder-gray-400"
                                                        dir="auto"
                                                    />
                                                )}

                                                {/* Edit Actions: Set Correct / Remove */}
                                                {!isPreviewMode && (
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => updateQuestion(qIndex, { correctIndex: cIndex })}
                                                            className={`text-xs px-2 py-1 rounded transition-colors ${cIndex === q.correctIndex ? 'text-green-700 bg-green-100 hover:bg-green-200' : 'text-gray-400 hover:text-green-600 hover:bg-gray-100'}`}
                                                        >
                                                            {cIndex === q.correctIndex ? 'الإجابة الصحيحة' : 'اجعلها صحيحة'}
                                                        </button>

                                                        {q.choices.length > MIN_CHOICES && (
                                                            <button
                                                                onClick={() => removeChoice(qIndex, cIndex)}
                                                                className="text-gray-400 hover:text-red-500"
                                                                title="Remove Option"
                                                            >
                                                                ✕
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>

                                    {/* Add Choice Button */}
                                    {!isPreviewMode && q.choices.length < MAX_CHOICES && (
                                        <button
                                            onClick={() => addChoice(qIndex)}
                                            className="mt-3 text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 self-start"
                                        >
                                            + إضافة خيار آخر
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}

                    {/* Empty State */}
                    {questions.length === 0 && (
                        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-dashed border-gray-300 dark:border-gray-700">
                            <p className="text-gray-500 dark:text-gray-400 mb-4">لا توجد أسئلة حتى الآن. ابدأ بإضافة سؤال جديد.</p>
                            <button
                                onClick={handleAddQuestion}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm transition-colors"
                            >
                                + إضافة سؤال جديد
                            </button>
                        </div>
                    )}
                </div>

                {/* Add Question Button (if list not empty) */}
                {!isPreviewMode && questions.length > 0 && (
                    <button
                        onClick={handleAddQuestion}
                        className="w-full py-4 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl text-gray-500 dark:text-gray-400 font-medium hover:border-blue-500 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all flex items-center justify-center gap-2"
                    >
                        <span className="text-xl">+</span> إضافة سؤال جديد
                    </button>
                )}

            </div>

            {/* Footer Actions */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 rounded-b-lg flex justify-between items-center gap-4">
                <button
                    onClick={onCancel}
                    className="px-6 py-2.5 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                    إلغاء (Cancel)
                </button>
                <button
                    onClick={handleSave}
                    className="px-8 py-2.5 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg shadow-md hover:shadow-lg transform active:scale-95 transition-all"
                >
                    حفظ الاختبار (Save Quiz)
                </button>
            </div>
        </div>
    );
}
