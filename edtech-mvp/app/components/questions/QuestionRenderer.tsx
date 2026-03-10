/**
 * QuestionRenderer Component
 *
 * Central router that renders the appropriate question component
 * based on the question type.
 */

'use client';

import React from 'react';
import type { Question } from '@/app/lib/storage';
import type { QuestionAnswer } from '@/app/lib/grading';
import MCQQuestion from './MCQQuestion';
import TrueFalseQuestion from './TrueFalseQuestion';
import FillBlankQuestion from './FillBlankQuestion';
import MatchingQuestion from './MatchingQuestion';

export interface QuestionRendererProps {
    question: Question;
    answer: QuestionAnswer | undefined;
    isSubmitted: boolean;
    isCorrect?: boolean;
    onAnswerChange: (answer: QuestionAnswer) => void;
}

export default function QuestionRenderer({
    question,
    answer,
    isSubmitted,
    isCorrect,
    onAnswerChange
}: QuestionRendererProps) {
    switch (question.question_type) {
        case 'mcq':
            return (
                <MCQQuestion
                    question={question}
                    answer={answer}
                    isSubmitted={isSubmitted}
                    isCorrect={isCorrect}
                    onAnswerChange={onAnswerChange}
                />
            );

        case 'true_false':
            return (
                <TrueFalseQuestion
                    question={question}
                    answer={answer}
                    isSubmitted={isSubmitted}
                    isCorrect={isCorrect}
                    onAnswerChange={onAnswerChange}
                />
            );

        case 'fill_blank':
            return (
                <FillBlankQuestion
                    question={question}
                    answer={answer}
                    isSubmitted={isSubmitted}
                    isCorrect={isCorrect}
                    onAnswerChange={onAnswerChange}
                />
            );

        case 'matching':
            return (
                <MatchingQuestion
                    question={question}
                    answer={answer}
                    isSubmitted={isSubmitted}
                    isCorrect={isCorrect}
                    onAnswerChange={onAnswerChange}
                />
            );

        default:
            return (
                <div style={{ padding: '1rem', backgroundColor: '#fff3cd', borderRadius: '0.5rem' }}>
                    <p>⚠️ Unsupported question type: {question.question_type}</p>
                </div>
            );
    }
}
