const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://elvsyidaanohbzqbdgsv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVsdnN5aWRhYW5vaGJ6cWJkZ3N2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3Nzc2MzQsImV4cCI6MjA4NTM1MzYzNH0.HoO4jmEXhknaM1q9wdWhidvpszqrF9Ud3nhZjeYzOoc';

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const { data: lessons, error } = await supabase.from('lessons').select('id, title').order('created_at', { ascending: false });
    if (error) {
        console.error('Error fetching lessons:', error);
        return;
    }
    console.log(`Found ${lessons.length} lessons in total`);
    lessons.forEach(l => {
        console.log(`- "${l.title}" (${l.id})`);
    });
}
check();
