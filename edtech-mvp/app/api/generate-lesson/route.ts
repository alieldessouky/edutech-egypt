import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest, NextResponse } from 'next/server';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(request: NextRequest) {
    try {
        const { content } = await request.json();

        if (!content || content.trim().length < 50) {
            return NextResponse.json(
                { error: 'Content is too short. Please provide more chapter content.' },
                { status: 400 }
            );
        }

        if (!process.env.GEMINI_API_KEY) {
            return NextResponse.json(
                { error: 'GEMINI_API_KEY is not configured' },
                { status: 500 }
            );
        }

        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

        const prompt = `You are an expert Egyptian education content creator for Grade 6 students (ages 11-12).

Given the following chapter content in Arabic, create a complete structured lesson with an adaptive quiz system.

CHAPTER CONTENT:
${content}

Create the following in Arabic:
1. A clear, concise lesson title
2. 3-5 specific learning objectives (what students will learn)
3. A clear summary of the content (2-3 paragraphs)
4. 13 quiz questions across THREE difficulty levels and FOUR question types

QUIZ STRUCTURE (EXACTLY 13 questions):

EASY LEVEL (5 questions - 10 points each):
- Test basic recall and recognition
- 2 MCQ questions (4 choices each)
- 2 True/False questions
- 1 Fill-in-blank question

MEDIUM LEVEL (5 questions - 20 points each):
- Test understanding and application
- 2 MCQ questions (4 choices each)
- 1 True/False question
- 2 Fill-in-blank questions

HARD LEVEL (3 questions - 40 points each):
- Test analysis and synthesis
- 1 MCQ question (4 choices)
- 1 Fill-in-blank question
- 1 Matching question (2-3 pairs)

QUESTION TYPE FORMATS:

1. MCQ (Multiple Choice):
{
    "difficulty": "easy" | "medium" | "hard",
    "question_type": "mcq",
    "text": "نص السؤال؟",
    "type_data": {
        "choices": ["اختيار أ", "اختيار ب", "اختيار ج", "اختيار د"],
        "correctIndex": 0
    },
    "points": 10 | 20 | 40
}

2. True/False:
{
    "difficulty": "easy" | "medium" | "hard",
    "question_type": "true_false",
    "text": "عبارة للتحقق من صحتها",
    "type_data": {
        "correctAnswer": true
    },
    "points": 10 | 20 | 40
}

3. Fill-in-blank (use ____ for blank in the question text):
{
    "difficulty": "easy" | "medium" | "hard",
    "question_type": "fill_blank",
    "text": "نص السؤال مع ____ في الفراغ",
    "type_data": {
        "acceptedAnswers": ["إجابة ١", "إجابة ٢"],
        "caseSensitive": false,
        "hint": "مساعدة اختيارية"
    },
    "points": 10 | 20 | 40
}

4. Matching:
{
    "difficulty": "hard",
    "question_type": "matching",
    "text": "طابق العناصر التالية",
    "type_data": {
        "pairs": [
            {"left": "عنصر أيسر ١", "right": "عنصر أيمن ١"},
            {"left": "عنصر أيسر ٢", "right": "عنصر أيمن ٢"}
        ],
        "allowPartialCredit": true
    },
    "points": 40
}

IMPORTANT RULES:
- All text must be in Arabic
- Questions should test different cognitive levels based on difficulty
- Easy questions: simple recall and recognition
- Medium questions: understanding and application
- Hard questions: analysis and synthesis
- Fill-in-blank: include ____ in the text where the blank should be
- Fill-in-blank: provide multiple accepted answers (including different spellings)
- Matching: 2-3 pairs that relate to the lesson content
- Points must match difficulty: easy=10, medium=20, hard=40

Respond ONLY with valid JSON in this exact format:
{
    "title": "عنوان الدرس",
    "objectives": ["هدف ١", "هدف ٢", "هدف ٣"],
    "summary": "ملخص الدرس...",
    "questions": [
        { /* question 1 - easy mcq */ },
        { /* question 2 - easy mcq */ },
        { /* question 3 - easy true_false */ },
        { /* question 4 - easy true_false */ },
        { /* question 5 - easy fill_blank */ },
        { /* question 6 - medium mcq */ },
        { /* question 7 - medium mcq */ },
        { /* question 8 - medium true_false */ },
        { /* question 9 - medium fill_blank */ },
        { /* question 10 - medium fill_blank */ },
        { /* question 11 - hard mcq */ },
        { /* question 12 - hard fill_blank */ },
        { /* question 13 - hard matching */ }
    ]
}`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // Extract JSON from response (handle markdown code blocks)
        let jsonStr = text;
        const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonMatch) {
            jsonStr = jsonMatch[1].trim();
        }

        const parsed = JSON.parse(jsonStr);

        // Validate structure
        if (!parsed.title || !parsed.objectives || !parsed.summary || !parsed.questions) {
            throw new Error('Invalid response structure from AI');
        }

        // Ensure we have exactly 13 questions
        if (!Array.isArray(parsed.questions) || parsed.questions.length !== 13) {
            throw new Error(`Expected exactly 13 questions, got ${parsed.questions?.length || 0}`);
        }

        // Validate and normalize each question
        const validatedQuestions = parsed.questions.map((q: any, idx: number) => {
            // Validate required fields
            if (!q.difficulty || !q.question_type || !q.text || !q.type_data || !q.points) {
                throw new Error(`Question ${idx + 1} is missing required fields`);
            }

            // Validate difficulty
            if (!['easy', 'medium', 'hard'].includes(q.difficulty)) {
                throw new Error(`Question ${idx + 1} has invalid difficulty: ${q.difficulty}`);
            }

            // Validate question type
            if (!['mcq', 'true_false', 'fill_blank', 'matching'].includes(q.question_type)) {
                throw new Error(`Question ${idx + 1} has invalid question_type: ${q.question_type}`);
            }

            // Validate points match difficulty
            const expectedPoints = q.difficulty === 'easy' ? 10 : q.difficulty === 'medium' ? 20 : 40;
            if (q.points !== expectedPoints) {
                console.warn(`Question ${idx + 1}: Points (${q.points}) don't match difficulty (${q.difficulty}), adjusting to ${expectedPoints}`);
                q.points = expectedPoints;
            }

            // Validate type-specific data
            switch (q.question_type) {
                case 'mcq':
                    if (!Array.isArray(q.type_data.choices) || q.type_data.choices.length !== 4) {
                        throw new Error(`Question ${idx + 1} (MCQ): Must have exactly 4 choices`);
                    }
                    if (typeof q.type_data.correctIndex !== 'number' || q.type_data.correctIndex < 0 || q.type_data.correctIndex > 3) {
                        throw new Error(`Question ${idx + 1} (MCQ): correctIndex must be 0-3`);
                    }
                    break;

                case 'true_false':
                    if (typeof q.type_data.correctAnswer !== 'boolean') {
                        throw new Error(`Question ${idx + 1} (True/False): correctAnswer must be boolean`);
                    }
                    break;

                case 'fill_blank':
                    if (!Array.isArray(q.type_data.acceptedAnswers) || q.type_data.acceptedAnswers.length === 0) {
                        throw new Error(`Question ${idx + 1} (Fill-blank): Must have at least one accepted answer`);
                    }
                    if (!q.text.includes('____')) {
                        console.warn(`Question ${idx + 1} (Fill-blank): Text should include ____ for the blank`);
                    }
                    // Ensure caseSensitive is boolean
                    q.type_data.caseSensitive = q.type_data.caseSensitive === true;
                    break;

                case 'matching':
                    if (!Array.isArray(q.type_data.pairs) || q.type_data.pairs.length < 2) {
                        throw new Error(`Question ${idx + 1} (Matching): Must have at least 2 pairs`);
                    }
                    for (let i = 0; i < q.type_data.pairs.length; i++) {
                        const pair = q.type_data.pairs[i];
                        if (!pair.left || !pair.right) {
                            throw new Error(`Question ${idx + 1} (Matching): Pair ${i + 1} missing left or right value`);
                        }
                    }
                    // Ensure allowPartialCredit is boolean
                    q.type_data.allowPartialCredit = q.type_data.allowPartialCredit !== false;
                    break;
            }

            return {
                difficulty: q.difficulty,
                question_type: q.question_type,
                text: q.text,
                type_data: q.type_data,
                points: q.points
            };
        });

        return NextResponse.json({
            title: parsed.title,
            objectives: Array.isArray(parsed.objectives) ? parsed.objectives : [],
            summary: parsed.summary,
            questions: validatedQuestions
        });

    } catch (error: any) {
        console.error('Lesson generation error:', error);

        if (error.message?.includes('JSON')) {
            return NextResponse.json(
                { error: 'Failed to parse AI response. Please try again.' },
                { status: 500 }
            );
        }

        return NextResponse.json(
            { error: error.message || 'Failed to generate lesson' },
            { status: 500 }
        );
    }
}
