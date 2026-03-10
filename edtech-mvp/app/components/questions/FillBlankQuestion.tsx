/**
 * Fill-in-the-blank Question Component
 */

'use client';

import React, { useState } from 'react';
import type { Question, FillBlankData } from '@/app/lib/storage';
import type { FillBlankAnswer } from '@/app/lib/grading';
import type { QuestionRendererProps } from './QuestionRenderer';

export default function FillBlankQuestion({
    question,
    answer,
    isSubmitted,
    isCorrect,
    onAnswerChange
}: QuestionRendererProps) {
    const data = question.type_data as FillBlankData;
    const currentAnswer = answer as FillBlankAnswer | undefined;
    const [showHint, setShowHint] = useState(false);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (isSubmitted) return;
        onAnswerChange({ text: e.target.value });
    };

    // Determine input styling
    let borderColor = '#d0d0d0';
    let backgroundColor = '#ffffff';
    let textColor = '#000000';

    if (isSubmitted) {
        if (isCorrect) {
            borderColor = '#28a745';
            backgroundColor = '#d4edda';
            textColor = '#155724';
        } else {
            borderColor = '#dc3545';
            backgroundColor = '#f8d7da';
            textColor = '#721c24';
        }
    }

    return (
        <div style={{ marginTop: '1rem' }}>
            {/* Question text with blank indicator */}
            <div
                style={{
                    fontSize: '1.125rem',
                    marginBottom: '1rem',
                    direction: 'rtl',
                    textAlign: 'right',
                    lineHeight: '1.6'
                }}
            >
                {question.text.split('____').map((part, index, array) => (
                    <React.Fragment key={index}>
                        {part}
                        {index < array.length - 1 && (
                            <span style={{
                                display: 'inline-block',
                                borderBottom: '2px solid #666',
                                minWidth: '100px',
                                margin: '0 0.25rem',
                                textAlign: 'center',
                                fontWeight: '600'
                            }}>
                                _______
                            </span>
                        )}
                    </React.Fragment>
                ))}
            </div>

            {/* Input field */}
            <input
                type="text"
                value={currentAnswer?.text || ''}
                onChange={handleInputChange}
                disabled={isSubmitted}
                placeholder="اكتب إجابتك هنا..."
                style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    fontSize: '1rem',
                    border: `2px solid ${borderColor}`,
                    borderRadius: '0.5rem',
                    backgroundColor,
                    color: textColor,
                    direction: 'rtl',
                    textAlign: 'right',
                    transition: 'all 0.2s ease',
                    fontWeight: isSubmitted && isCorrect ? '600' : '400'
                }}
            />

            {/* Hint button */}
            {data.hint && !isSubmitted && (
                <div style={{ marginTop: '0.75rem' }}>
                    <button
                        onClick={() => setShowHint(!showHint)}
                        style={{
                            padding: '0.5rem 1rem',
                            backgroundColor: '#f0f0f0',
                            border: '1px solid #ccc',
                            borderRadius: '0.375rem',
                            cursor: 'pointer',
                            fontSize: '0.875rem',
                            direction: 'rtl'
                        }}
                    >
                        {showHint ? '🙈 إخفاء المساعدة' : '💡 عرض مساعدة'}
                    </button>

                    {showHint && (
                        <div
                            style={{
                                marginTop: '0.5rem',
                                padding: '0.75rem',
                                backgroundColor: '#fff3cd',
                                border: '1px solid #ffc107',
                                borderRadius: '0.375rem',
                                fontSize: '0.875rem',
                                direction: 'rtl',
                                textAlign: 'right'
                            }}
                        >
                            💡 {data.hint}
                        </div>
                    )}
                </div>
            )}

            {/* Feedback (after submission) */}
            {isSubmitted && (
                <div style={{ marginTop: '0.75rem' }}>
                    {isCorrect ? (
                        <div style={{
                            padding: '0.75rem',
                            backgroundColor: '#d4edda',
                            border: '1px solid #28a745',
                            borderRadius: '0.375rem',
                            color: '#155724',
                            direction: 'rtl',
                            textAlign: 'right'
                        }}>
                            ✓ إجابة صحيحة!
                        </div>
                    ) : (
                        <div style={{
                            padding: '0.75rem',
                            backgroundColor: '#f8d7da',
                            border: '1px solid #dc3545',
                            borderRadius: '0.375rem',
                            color: '#721c24',
                            direction: 'rtl',
                            textAlign: 'right'
                        }}>
                            <div>✗ إجابة غير صحيحة</div>
                            <div style={{ marginTop: '0.5rem', fontSize: '0.875rem' }}>
                                الإجابة الصحيحة: <strong>{data.acceptedAnswers.join(' أو ')}</strong>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
