/**
 * Grading Logic for All Question Types
 *
 * This module handles auto-grading for:
 * - Multiple Choice Questions (MCQ)
 * - True/False Questions
 * - Fill-in-the-blank Questions
 * - Matching Questions
 *
 * Each question type has its own grading rules and partial credit support.
 */

import type {
    Question,
    QuestionType,
    MCQData,
    TrueFalseData,
    FillBlankData,
    MatchingData,
    GradeResult
} from './storage';

/**
 * Answer formats for each question type
 */
export type MCQAnswer = {
    selectedIndex: number;
};

export type TrueFalseAnswer = {
    value: boolean;
};

export type FillBlankAnswer = {
    text: string;
};

export type MatchingAnswer = {
    matches: string[]; // Array of right values in order of left items
};

export type QuestionAnswer = MCQAnswer | TrueFalseAnswer | FillBlankAnswer | MatchingAnswer;

/**
 * Grade a single question based on its type and student's answer
 *
 * @param question - The question to grade
 * @param answer - The student's answer
 * @returns Grading result with correctness and points
 */
export function gradeQuestion(question: Question, answer: QuestionAnswer): GradeResult {
    switch (question.question_type) {
        case 'mcq':
            return gradeMCQ(question, answer as MCQAnswer);

        case 'true_false':
            return gradeTrueFalse(question, answer as TrueFalseAnswer);

        case 'fill_blank':
            return gradeFillBlank(question, answer as FillBlankAnswer);

        case 'matching':
            return gradeMatching(question, answer as MatchingAnswer);

        default:
            console.warn(`Unknown question type: ${question.question_type}`);
            return { isCorrect: false, points: 0 };
    }
}

/**
 * Grade Multiple Choice Question
 */
function gradeMCQ(question: Question, answer: MCQAnswer): GradeResult {
    const data = question.type_data as MCQData;

    const isCorrect = answer.selectedIndex === data.correctIndex;
    const points = isCorrect ? question.points : 0;

    return { isCorrect, points };
}

/**
 * Grade True/False Question
 */
function gradeTrueFalse(question: Question, answer: TrueFalseAnswer): GradeResult {
    const data = question.type_data as TrueFalseData;

    const isCorrect = answer.value === data.correctAnswer;
    const points = isCorrect ? question.points : 0;

    return { isCorrect, points };
}

/**
 * Grade Fill-in-the-blank Question
 *
 * Supports:
 * - Multiple accepted answers
 * - Case sensitivity option
 * - Whitespace trimming
 */
function gradeFillBlank(question: Question, answer: FillBlankAnswer): GradeResult {
    const data = question.type_data as FillBlankData;

    // Normalize student answer
    let studentAnswer = answer.text.trim();
    if (!data.caseSensitive) {
        studentAnswer = studentAnswer.toLowerCase();
    }

    // Normalize accepted answers
    const acceptedAnswers = data.acceptedAnswers.map(a => {
        const normalized = a.trim();
        return data.caseSensitive ? normalized : normalized.toLowerCase();
    });

    // Check if student answer matches any accepted answer
    const isCorrect = acceptedAnswers.includes(studentAnswer);
    const points = isCorrect ? question.points : 0;

    return { isCorrect, points };
}

/**
 * Grade Matching Question
 *
 * Supports:
 * - Partial credit (if enabled in question)
 * - All-or-nothing grading (if partial credit disabled)
 */
function gradeMatching(question: Question, answer: MatchingAnswer): GradeResult {
    const data = question.type_data as MatchingData;

    if (!answer.matches || answer.matches.length !== data.pairs.length) {
        return { isCorrect: false, points: 0 };
    }

    // Count correct matches
    let correctMatches = 0;
    for (let i = 0; i < data.pairs.length; i++) {
        const expectedRight = data.pairs[i].right;
        const studentRight = answer.matches[i];

        if (expectedRight === studentRight) {
            correctMatches++;
        }
    }

    const totalPairs = data.pairs.length;
    const allCorrect = correctMatches === totalPairs;

    // Calculate points
    let points = 0;
    if (allCorrect) {
        points = question.points;
    } else if (data.allowPartialCredit) {
        points = Math.floor((correctMatches / totalPairs) * question.points);
    }

    return {
        isCorrect: allCorrect,
        points,
        partialCredit: correctMatches / totalPairs
    };
}

/**
 * Grade an entire quiz attempt
 *
 * @param questions - All questions in the quiz
 * @param answers - Student's answers (keyed by question ID)
 * @returns Overall grading results
 */
export function gradeQuiz(
    questions: Question[],
    answers: Record<string, QuestionAnswer>
): {
    totalCorrect: number;
    totalQuestions: number;
    totalPoints: number;
    maxPoints: number;
    percentage: number;
    results: Array<{
        questionId: string;
        result: GradeResult;
    }>;
} {
    let totalCorrect = 0;
    let totalPoints = 0;
    let maxPoints = 0;
    const results: Array<{ questionId: string; result: GradeResult }> = [];

    for (const question of questions) {
        maxPoints += question.points;

        const answer = answers[question.id];
        if (!answer) {
            // No answer provided
            results.push({
                questionId: question.id,
                result: { isCorrect: false, points: 0 }
            });
            continue;
        }

        const result = gradeQuestion(question, answer);
        results.push({
            questionId: question.id,
            result
        });

        if (result.isCorrect) {
            totalCorrect++;
        }

        totalPoints += result.points;
    }

    const percentage = maxPoints > 0 ? (totalPoints / maxPoints) * 100 : 0;

    return {
        totalCorrect,
        totalQuestions: questions.length,
        totalPoints,
        maxPoints,
        percentage,
        results
    };
}

/**
 * Validate answer format for a question type
 *
 * @param questionType - Type of question
 * @param answer - Answer to validate
 * @returns Whether answer is valid
 */
export function validateAnswer(questionType: QuestionType, answer: any): boolean {
    switch (questionType) {
        case 'mcq':
            return typeof answer === 'object' &&
                   typeof answer.selectedIndex === 'number' &&
                   answer.selectedIndex >= 0;

        case 'true_false':
            return typeof answer === 'object' &&
                   typeof answer.value === 'boolean';

        case 'fill_blank':
            return typeof answer === 'object' &&
                   typeof answer.text === 'string';

        case 'matching':
            return typeof answer === 'object' &&
                   Array.isArray(answer.matches) &&
                   answer.matches.every((m: any) => typeof m === 'string');

        default:
            return false;
    }
}

/**
 * Get feedback message based on grading result
 *
 * @param result - Grading result
 * @param question - The question
 * @returns Feedback message for student
 */
export function getFeedbackMessage(result: GradeResult, question: Question): string {
    if (result.isCorrect) {
        return '✓ Correct!';
    }

    if (result.partialCredit && result.partialCredit > 0) {
        const percentage = Math.round(result.partialCredit * 100);
        return `Partially correct (${percentage}%)`;
    }

    return '✗ Incorrect';
}

/**
 * Get correct answer display text
 *
 * @param question - The question
 * @returns Human-readable correct answer
 */
export function getCorrectAnswerText(question: Question): string {
    switch (question.question_type) {
        case 'mcq': {
            const data = question.type_data as MCQData;
            return data.choices[data.correctIndex];
        }

        case 'true_false': {
            const data = question.type_data as TrueFalseData;
            return data.correctAnswer ? 'صح (True)' : 'خطأ (False)';
        }

        case 'fill_blank': {
            const data = question.type_data as FillBlankData;
            return data.acceptedAnswers.join(' أو ');
        }

        case 'matching': {
            const data = question.type_data as MatchingData;
            return data.pairs.map(p => `${p.left} → ${p.right}`).join('\n');
        }

        default:
            return 'N/A';
    }
}
