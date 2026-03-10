/**
 * Multiple Choice Question Component
 */

'use client';

import React from 'react';
import type { Question, MCQData } from '@/app/lib/storage';
import type { MCQAnswer } from '@/app/lib/grading';
import type { QuestionRendererProps } from './QuestionRenderer';

export default function MCQQuestion({
    question,
    answer,
    isSubmitted,
    isCorrect,
    onAnswerChange
}: QuestionRendererProps) {
    const data = question.type_data as MCQData;
    const currentAnswer = answer as MCQAnswer | undefined;

    const handleChoiceClick = (index: number) => {
        if (isSubmitted) return; // Prevent changes after submission
        onAnswerChange({ selectedIndex: index });
    };

    return (
        <div style={{ marginTop: '1rem' }}>
            {/* Question Image (if exists) */}
            {question.imageUrl && (
                <div style={{ marginBottom: '1rem' }}>
                    <img
                        src={question.imageUrl}
                        alt="Question visual"
                        style={{
                            maxWidth: '100%',
                            height: 'auto',
                            borderRadius: '0.5rem'
                        }}
                    />
                </div>
            )}

            {/* Choices */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {data.choices.map((choice, index) => {
                    const isSelected = currentAnswer?.selectedIndex === index;
                    const isCorrectChoice = index === data.correctIndex;

                    // Determine background color
                    let backgroundColor = '#ffffff';
                    let borderColor = '#e0e0e0';
                    let textColor = '#000000';

                    if (isSubmitted) {
                        if (isCorrectChoice) {
                            backgroundColor = '#d4edda'; // Green for correct
                            borderColor = '#28a745';
                            textColor = '#155724';
                        } else if (isSelected && !isCorrectChoice) {
                            backgroundColor = '#f8d7da'; // Red for wrong selection
                            borderColor = '#dc3545';
                            textColor = '#721c24';
                        }
                    } else if (isSelected) {
                        backgroundColor = '#e3f2fd'; // Light blue for selected
                        borderColor = '#2196F3';
                    }

                    return (
                        <div
                            key={index}
                            onClick={() => handleChoiceClick(index)}
                            style={{
                                padding: '1rem',
                                backgroundColor,
                                border: `2px solid ${borderColor}`,
                                borderRadius: '0.5rem',
                                cursor: isSubmitted ? 'default' : 'pointer',
                                transition: 'all 0.2s ease',
                                color: textColor,
                                fontWeight: isSelected ? '600' : '400'
                            }}
                            role="button"
                            tabIndex={0}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                {/* Radio indicator */}
                                <div
                                    style={{
                                        width: '20px',
                                        height: '20px',
                                        borderRadius: '50%',
                                        border: `2px solid ${borderColor}`,
                                        backgroundColor: isSelected ? borderColor : 'transparent',
                                        flexShrink: 0
                                    }}
                                />

                                {/* Choice text */}
                                <span style={{ flex: 1, direction: 'rtl', textAlign: 'right' }}>
                                    {choice}
                                </span>

                                {/* Feedback icon (after submission) */}
                                {isSubmitted && (
                                    <span style={{ fontSize: '1.25rem', flexShrink: 0 }}>
                                        {isCorrectChoice ? '✓' : (isSelected ? '✗' : '')}
                                    </span>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
