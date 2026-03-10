/**
 * Matching Question Component
 */

'use client';

import React from 'react';
import type { Question, MatchingData } from '@/app/lib/storage';
import type { MatchingAnswer } from '@/app/lib/grading';
import type { QuestionRendererProps } from './QuestionRenderer';

export default function MatchingQuestion({
    question,
    answer,
    isSubmitted,
    isCorrect,
    onAnswerChange
}: QuestionRendererProps) {
    const data = question.type_data as MatchingData;
    const currentAnswer = answer as MatchingAnswer | undefined;

    // Initialize matches array if not exists
    const matches = currentAnswer?.matches || new Array(data.pairs.length).fill('');

    const handleMatchChange = (leftIndex: number, rightValue: string) => {
        if (isSubmitted) return;

        const newMatches = [...matches];
        newMatches[leftIndex] = rightValue;
        onAnswerChange({ matches: newMatches });
    };

    // Get all right values for dropdown options
    const rightValues = data.pairs.map(pair => pair.right);

    return (
        <div style={{ marginTop: '1rem' }}>
            {/* Instructions */}
            <div style={{
                padding: '0.75rem',
                backgroundColor: '#e7f3ff',
                borderRadius: '0.5rem',
                marginBottom: '1rem',
                direction: 'rtl',
                textAlign: 'right',
                fontSize: '0.875rem',
                color: '#004085'
            }}>
                💡 اختر المطابقة الصحيحة لكل عنصر
            </div>

            {/* Matching pairs */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {data.pairs.map((pair, index) => {
                    const selectedRight = matches[index];
                    const isCorrectMatch = selectedRight === pair.right;

                    // Determine styling based on submission state
                    let backgroundColor = '#ffffff';
                    let borderColor = '#e0e0e0';

                    if (isSubmitted) {
                        if (isCorrectMatch) {
                            backgroundColor = '#d4edda';
                            borderColor = '#28a745';
                        } else {
                            backgroundColor = '#f8d7da';
                            borderColor = '#dc3545';
                        }
                    }

                    return (
                        <div
                            key={index}
                            style={{
                                padding: '1rem',
                                backgroundColor,
                                border: `2px solid ${borderColor}`,
                                borderRadius: '0.5rem',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '1rem',
                                flexWrap: 'wrap' as const
                            }}>
                                {/* Left item (fixed) */}
                                <div style={{
                                    flex: '1 1 200px',
                                    padding: '0.75rem',
                                    backgroundColor: '#f8f9fa',
                                    borderRadius: '0.375rem',
                                    direction: 'rtl',
                                    textAlign: 'right',
                                    fontWeight: '600'
                                }}>
                                    {pair.left}
                                </div>

                                {/* Arrow */}
                                <div style={{
                                    fontSize: '1.5rem',
                                    color: '#666',
                                    flexShrink: 0
                                }}>
                                    ←
                                </div>

                                {/* Right item (dropdown) */}
                                <div style={{ flex: '1 1 200px' }}>
                                    <select
                                        value={selectedRight}
                                        onChange={(e) => handleMatchChange(index, e.target.value)}
                                        disabled={isSubmitted}
                                        style={{
                                            width: '100%',
                                            padding: '0.75rem',
                                            fontSize: '1rem',
                                            border: '2px solid #d0d0d0',
                                            borderRadius: '0.375rem',
                                            backgroundColor: '#ffffff',
                                            direction: 'rtl',
                                            cursor: isSubmitted ? 'default' : 'pointer'
                                        }}
                                    >
                                        <option value="">اختر...</option>
                                        {rightValues.map((rightValue, idx) => (
                                            <option key={idx} value={rightValue}>
                                                {rightValue}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Feedback icon (after submission) */}
                                {isSubmitted && (
                                    <div style={{
                                        fontSize: '1.5rem',
                                        flexShrink: 0
                                    }}>
                                        {isCorrectMatch ? '✓' : '✗'}
                                    </div>
                                )}
                            </div>

                            {/* Show correct answer if wrong */}
                            {isSubmitted && !isCorrectMatch && (
                                <div style={{
                                    marginTop: '0.5rem',
                                    padding: '0.5rem',
                                    backgroundColor: '#fff3cd',
                                    borderRadius: '0.375rem',
                                    fontSize: '0.875rem',
                                    direction: 'rtl',
                                    textAlign: 'right',
                                    color: '#856404'
                                }}>
                                    الإجابة الصحيحة: <strong>{pair.right}</strong>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Partial credit message */}
            {isSubmitted && data.allowPartialCredit && !isCorrect && (
                <div style={{
                    marginTop: '1rem',
                    padding: '0.75rem',
                    backgroundColor: '#fff3cd',
                    border: '1px solid #ffc107',
                    borderRadius: '0.375rem',
                    direction: 'rtl',
                    textAlign: 'right',
                    fontSize: '0.875rem'
                }}>
                    💡 حصلت على نقاط جزئية بناءً على الإجابات الصحيحة
                </div>
            )}
        </div>
    );
}
