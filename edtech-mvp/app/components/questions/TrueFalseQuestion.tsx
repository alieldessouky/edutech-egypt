/**
 * True/False Question Component
 */

'use client';

import React from 'react';
import type { Question, TrueFalseData } from '@/app/lib/storage';
import type { TrueFalseAnswer } from '@/app/lib/grading';
import type { QuestionRendererProps } from './QuestionRenderer';

export default function TrueFalseQuestion({
    question,
    answer,
    isSubmitted,
    isCorrect,
    onAnswerChange
}: QuestionRendererProps) {
    const data = question.type_data as TrueFalseData;
    const currentAnswer = answer as TrueFalseAnswer | undefined;

    const handleOptionClick = (value: boolean) => {
        if (isSubmitted) return;
        onAnswerChange({ value });
    };

    const renderOption = (value: boolean, label: string, icon: string) => {
        const isSelected = currentAnswer?.value === value;
        const isCorrectOption = value === data.correctAnswer;

        // Determine styling
        let backgroundColor = '#ffffff';
        let borderColor = '#e0e0e0';
        let textColor = '#000000';

        if (isSubmitted) {
            if (isCorrectOption) {
                backgroundColor = '#d4edda';
                borderColor = '#28a745';
                textColor = '#155724';
            } else if (isSelected && !isCorrectOption) {
                backgroundColor = '#f8d7da';
                borderColor = '#dc3545';
                textColor = '#721c24';
            }
        } else if (isSelected) {
            backgroundColor = '#e3f2fd';
            borderColor = '#2196F3';
        }

        return (
            <div
                onClick={() => handleOptionClick(value)}
                style={{
                    flex: 1,
                    padding: '2rem 1rem',
                    backgroundColor,
                    border: `3px solid ${borderColor}`,
                    borderRadius: '0.75rem',
                    cursor: isSubmitted ? 'default' : 'pointer',
                    transition: 'all 0.2s ease',
                    textAlign: 'center',
                    color: textColor,
                    fontWeight: '600',
                    fontSize: '1.125rem',
                    position: 'relative' as const
                }}
                role="button"
                tabIndex={0}
            >
                {/* Icon */}
                <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>
                    {icon}
                </div>

                {/* Label */}
                <div style={{ direction: 'rtl' }}>
                    {label}
                </div>

                {/* Feedback (after submission) */}
                {isSubmitted && (
                    <div style={{
                        position: 'absolute',
                        top: '0.5rem',
                        right: '0.5rem',
                        fontSize: '1.5rem'
                    }}>
                        {isCorrectOption ? '✓' : (isSelected ? '✗' : '')}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div style={{ marginTop: '1rem' }}>
            <div style={{
                display: 'flex',
                gap: '1rem',
                flexWrap: 'wrap' as const
            }}>
                {renderOption(true, 'صح (True)', '✓')}
                {renderOption(false, 'خطأ (False)', '✗')}
            </div>
        </div>
    );
}
