import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

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

Given the following chapter content in Arabic, create a complete structured lesson pack.
CRITICAL RULE: You MUST strictly base all content ONLY on the provided text. DO NOT include any outside research, extra facts, or historical details not present in the text. This is a non-negotiable constraint.

CHAPTER CONTENT:
${content}

Return ONLY a valid JSON object with this EXACT structure:
{
    "title": "عنوان الدرس بالعربية",
    "formattedContent": "النص الكامل للدرس منظّم بشكل جميل للطالب",
    "simplified_arabic": "شرح مبسط ومفصل للطلاب بالعربية الفصحى (3-4 فقرات) بناء على النص فقط",
    "podcast_script": "نص بودكاست تعليمي بالعربية المصرية العامية، يشرح الموضوع بأسلوب قصصي بناء على النص فقط (حوالي 200 كلمة)",
    "quiz_questions": [
        {
            "text": "نص السؤال؟",
            "choices": ["الاختيار الأول", "الاختيار الثاني", "الاختيار الثالث", "الاختيار الرابع"],
            "correctIndex": 0
        }
    ]
}

RULES FOR formattedContent:
- Take the raw chapter content and rewrite it as a clean, structured lesson for Grade 6 students in Arabic
- Use **عنوان القسم** (double asterisks) to mark section headings
- Use "- " at the start of lines for bullet points
- Separate paragraphs with blank lines
- Remove any OCR artifacts, page numbers, headers/footers, or formatting noise
- Keep ALL factual content accurate — only improve structure and readability
- Write in clear, formal Arabic (فصحى) suitable for Grade 6

CRITICAL REQUIREMENTS:
- Generate EXACTLY 10 quiz questions.
- Each question must have EXACTLY 4 choices.
- correctIndex must be 0, 1, 2, or 3 (the index of the correct answer).
- All text must be in Arabic.
- The podcast_script should be engaging Egyptian colloquial Arabic (العامية المصرية).
- Quiz questions should test deep understanding of the provided text, not just memorization.
- ABSOLUTELY NO OUTSIDE KNOWLEDGE. If a fact isn't in the chapter content, do not mention it.`;

        const result = await model.generateContent({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: {
                responseMimeType: "application/json",
            }
        });

        const responseText = result.response.text();
        console.log('[API] Raw AI Response Length:', responseText?.length);
        console.log('[API] Raw AI Response Starts With:', responseText?.substring(0, 100));
        console.log('[API] Raw AI Response Ends With:', responseText?.substring(responseText.length - 100));

        // Advanced sanitization
        let cleanText = responseText.trim();

        // Remove markdown block backticks if present
        if (cleanText.startsWith('```')) {
            cleanText = cleanText.replace(/^```[a-zA-Z]*\n?/, '');
            cleanText = cleanText.replace(/\n?```$/, '');
            cleanText = cleanText.trim();
        }

        console.log('[API] Clean Text Starts With:', cleanText.substring(0, 100));

        let parsed;
        try {
            parsed = JSON.parse(cleanText);
        } catch (parseError: any) {
            console.error('[API] JSON Parse Error Details:', parseError.message);
            console.error('[API] FULL FAILED TEXT TO PARSE:', cleanText);
            throw parseError; // Re-throw to be caught by the outer catch
        }

        // Validate structure
        if (!parsed.title || !parsed.simplified_arabic || !parsed.podcast_script || !parsed.quiz_questions) {
            throw new Error('Invalid response structure from AI - missing required fields');
        }
        // formattedContent is optional — fall back to raw input if AI omits it
        const formattedContent = parsed.formattedContent || content;

        // Validate quiz questions
        if (!Array.isArray(parsed.quiz_questions) || parsed.quiz_questions.length === 0) {
            throw new Error('quiz_questions must be a non-empty array');
        }

        const validatedQuestions = parsed.quiz_questions.map((q: any, idx: number) => {
            if (!q.text || typeof q.text !== 'string') {
                throw new Error(`Question ${idx + 1} has invalid or missing text`);
            }
            if (!Array.isArray(q.choices) || q.choices.length !== 4) {
                throw new Error(`Question ${idx + 1} must have exactly 4 choices`);
            }
            if (typeof q.correctIndex !== 'number' || q.correctIndex < 0 || q.correctIndex > 3) {
                throw new Error(`Question ${idx + 1} has invalid correctIndex: ${q.correctIndex}`);
            }
            return {
                text: q.text,
                choices: q.choices,
                correctIndex: q.correctIndex
            };
        });

        return NextResponse.json({
            title: parsed.title,
            formattedContent,
            simplified_arabic: parsed.simplified_arabic,
            podcast_script: parsed.podcast_script,
            quiz_questions: validatedQuestions
        });

    } catch (error: any) {
        console.error('Lesson generation error:', error);

        if (error.message?.includes('JSON') || error instanceof SyntaxError) {
            return NextResponse.json(
                { error: 'Failed to parse AI response. Please try again.' },
                { status: 500 }
            );
        }

        return NextResponse.json(
            { error: error.message || 'Failed to generate lesson from notebook' },
            { status: 500 }
        );
    }
}
