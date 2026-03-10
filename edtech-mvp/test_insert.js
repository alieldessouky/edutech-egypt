const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function test() {
    const { data: lessons } = await supabase.from('lessons').select('id, quizzes(id)').limit(1);
    const lessonId = lessons[0].id;
    const quizId = lessons[0].quizzes[0].id;

    console.log("Trying insert WITH quizId...");
    const { error: err1 } = await supabase.from('attempts').insert({
        id: crypto.randomUUID(),
        student_name: 'Student',
        lesson_id: lessonId,
        quiz_id: quizId,
        score: 1,
        total_questions: 1,
        demo_key: process.env.NEXT_PUBLIC_DEMO_KEY,
        created_at: new Date().toISOString()
    });
    console.log(err1 || 'Success 1');

    console.log("Trying insert WITHOUT quizId...");
    const { error: err2 } = await supabase.from('attempts').insert({
        id: crypto.randomUUID(),
        student_name: 'Student',
        lesson_id: lessonId,
        quiz_id: undefined,
        score: 1,
        total_questions: 1,
        demo_key: process.env.NEXT_PUBLIC_DEMO_KEY,
        created_at: new Date().toISOString()
    });
    console.log(err2 || 'Success 2');
}
test();
