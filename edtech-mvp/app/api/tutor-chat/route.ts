import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        // Validation
        const geminiKey = process.env.GEMINI_API_KEY;
        if (!geminiKey) {
            return NextResponse.json({ error: 'GEMINI_API_KEY is missing' }, { status: 500 });
        }

        const { lessonId, message, sessionId, studentId } = await req.json();

        if (!lessonId || !message) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // 1. Fetch Lesson Content
        const { data: lesson, error: lessonError } = await supabaseAdmin
            .from('lessons')
            .select('title, content')
            .eq('id', lessonId)
            .single();

        if (lessonError) {
            console.error('Supabase Lesson Fetch Error:', lessonError);
            return NextResponse.json({ error: `Lesson fetch error: ${lessonError.message}` }, { status: 500 });
        }

        if (!lesson) {
            return NextResponse.json({ error: 'Lesson not found' }, { status: 404 });
        }

        // 2. Fetch or Create Session
        let currentSessionId = sessionId;
        let history: Array<{ role: string; content: string; timestamp: number }> = [];

        if (sessionId) {
            const { data: sessionData, error: sessionError } = await supabaseAdmin
                .from('tutor_sessions')
                .select('messages')
                .eq('id', sessionId)
                .single();

            if (sessionError && sessionError.code !== 'PGRST116') {
                console.error('Supabase Session Fetch Error:', sessionError);
            }

            if (sessionData && sessionData.messages) {
                history = sessionData.messages;
            }
        }

        // 3. Build system instruction (personality + rules + lesson content)
        const systemInstruction = `أنت مدرس تاريخ لطلاب الصف السادس الابتدائي في مصر. بتحب التاريخ وبتعرف تخلي الدرس ممتع وشيق. أسلوبك عربي فصيح مبسط يناسب سن 12 سنة — مش عامية شوارع ومش فصحى صعبة.

[BEHAVIOR & TONE]
1. ما تخترعش مواقف أو شخصيات أو حوارات مش موجودة في محتوى الدرس. لو الدرس فيه حوار بين طلاب ومدرس، استخدمه. لو مفيش، ما تألفش من عندك.
2. ردك يكون على قد السؤال — مختصر وواضح. ما تفضلش تكرر نفس الفكرة بصيغ مختلفة. قول المعلومة مرة واحدة بوضوح وامشي للنقطة اللي بعدها. الطالب عنده 12 سنة — مش هيقرأ مقال طويل.
3. لو الطالب طلب رد أقصر، قصّر ردك فعلاً. ما تديش رد أطول من اللي قبله.
4. نوّع في كلامك — ما تكررش نفس التحية أو نفس العبارات في كل رد.
5. لو الطالب سأل عن حاجة برا الدرس، رجّعه بلطف من غير محاضرة.
6. لو الطالب غلط أو ما فهمش، اشرح بطريقة تانية من غير ما تحسسه إنه غلطان.
7. أسلوبك زي مدرس شاطر بيحب شغله ويحب طلابه.

[TEACHING STYLE]
1. خلّي التاريخ حي وممتع. استخدم أمثلة من حياة الطالب اليومية عشان توصل المعلومة.
2. لما تشرح حدث تاريخي، قول ليه حصل وإيه اللي ترتب عليه — مش مجرد حقائق جافة.
3. اربط المعلومات ببعضها لما تقدر.
4. لو الطالب قال 'اشرحلي الدرس'، اشرح الدرس كامل بأسلوب مبسط ومنظم.

[QUIZ MODE]
1. لو الطالب طلب امتحان أو Quiz، اسأله كام سؤال يناسبوا حجم الدرس ومستوى الطالب. درس كبير = أسئلة أكتر، درس صغير = أسئلة أقل. ما تغرقوش بأسئلة كتير ومش لازم تكتفي بسؤال واحد.
2. نوّع في أنواع الأسئلة: سؤال مباشر، صح ولا غلط، اختار الإجابة الصح، اشرح ليه، أكمل الجملة. التنويع يخلي المراجعة ممتعة.
3. ابدأ بأسئلة سهلة وزوّد الصعوبة تدريجياً. لو الطالب بيجاوب صح، اسأله أسئلة أعمق عن الأسباب والنتائج. لو بيغلط، ارجع للأساسيات وسهّل الأسئلة.
4. اسأل سؤالين أو تلاتة في المرة الواحدة واستنى إجابات الطالب قبل ما تكمل. بعد ما يجاوب، قيّمه وقرر تكمل أسئلة ولا الطالب فاهم كفاية.
5. لو الطالب قال 'مش عارف' أو 'idk'، اشرحله الإجابة على طول بأسلوب بسيط. ما ترجعش تسأله يوضح السؤال — أنت اللي سألت السؤال أصلاً.

[EVALUATION]
1. لما الطالب يجاوب، قيّم فهمه للفكرة مش حفظه للكلام. لو الطالب فهم المعنى الصح بكلامه هو، ده يبقى صح. ما تطلبش منه يقول نفس الجمل اللي في الدرس بالظبط.
2. لو إجابة الطالب صح في المعنى بس ناقصها نقطة مهمة، قوله إنه صح وضيفله المعلومة الناقصة كإضافة مش كتصحيح.
3. كلمة 'صح' أو 'برافو' الأول، وبعدين لو فيه إضافة قولها. ما تبدأش بالنقص.

[TTS FORMATTING - CRITICAL]
1. ممنوع تماماً استخدام أي Markdown: لا نجوم (*)، لا bold (**)، لا hashtags (#)، لا bullet points. اكتب نص عادي فقط. لو استخدمت markdown، محرك الصوت هيقرأ علامات الترقيم بصوت عالي ويبوظ التجربة.
2. التشكيل مطلوب لضمان النطق الصحيح.

الدرس الحالي: "${lesson.title}"

محتوى الدرس:
"""
${lesson.content}
"""`;

        // 4. Convert stored history to Gemini multi-turn format (last 20 messages only)
        const recentHistory = history.slice(-20);
        const geminiHistory = recentHistory.map((msg) => ({
            role: msg.role === 'model' ? 'model' : 'user',
            parts: [{ text: msg.content }],
        }));

        // 5. Start multi-turn chat with system instruction and history
        const genAI = new GoogleGenerativeAI(geminiKey);
        const model = genAI.getGenerativeModel({
            model: 'gemini-2.0-flash',
            systemInstruction,
            generationConfig: {
                maxOutputTokens: 2048,
                temperature: 0.3,
            },
        });

        const chat = model.startChat({ history: geminiHistory });
        const result = await chat.sendMessage(message);
        const responseText = result.response.text();

        // 6. Save full history to Supabase (not capped — full history is preserved)
        const newUserMsg = { role: 'user', content: message, timestamp: Date.now() };
        const newAiMsg = { role: 'model', content: responseText, timestamp: Date.now() };
        const updatedHistory = [...history, newUserMsg, newAiMsg];

        if (currentSessionId) {
            const { error: updateError } = await supabaseAdmin
                .from('tutor_sessions')
                .update({ messages: updatedHistory, updated_at: new Date().toISOString() })
                .eq('id', currentSessionId);

            if (updateError) {
                console.error('Session Update Error:', updateError);
            }
        } else {
            const { data: newSession, error: createError } = await supabaseAdmin
                .from('tutor_sessions')
                .insert({
                    lesson_id: lessonId,
                    student_id: studentId || null,
                    messages: updatedHistory,
                })
                .select('id')
                .single();

            if (createError) {
                console.error('Session Create Error:', createError);
            } else if (newSession) {
                currentSessionId = newSession.id;
            }
        }

        return NextResponse.json({
            response: responseText,
            sessionId: currentSessionId,
        });

    } catch (error: any) {
        console.error('Tutor chat handler error:', error);
        return NextResponse.json({
            error: error.message || 'Internal Server Error',
            details: error.toString(),
        }, { status: 500 });
    }
}
