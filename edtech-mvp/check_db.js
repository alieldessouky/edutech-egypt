const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://elvsyidaanohbzqbdgsv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVsdnN5aWRhYW5vaGJ6cWJkZ3N2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3Nzc2MzQsImV4cCI6MjA4NTM1MzYzNH0.HoO4jmEXhknaM1q9wdWhidvpszqrF9Ud3nhZjeYzOoc';

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const { data: lessons, error } = await supabase.from('lessons').select('*').order('created_at', { ascending: false });
    if (error) {
        console.error('Error fetching lessons:', error);
        return;
    }
    console.log(`Found ${lessons.length} lessons`);

    const countByTitle = {};
    lessons.forEach(l => {
        countByTitle[l.title] = (countByTitle[l.title] || 0) + 1;
    });

    console.log('Title counts:', countByTitle);

    // Check if we can delete
    const duplicates = [];
    const seen = new Set();
    lessons.forEach(l => {
        if (seen.has(l.title)) duplicates.push(l.id);
        else seen.add(l.title);
    });

    console.log(`Found ${duplicates.length} duplicates to delete.`);
    if (duplicates.length > 0) {
        const { data, error: delError } = await supabase.from('lessons').delete().in('id', duplicates);
        if (delError) {
            console.error('Failed to delete duplicates:', delError);
        } else {
            console.log('Successfully deleted duplicates:', data);
        }
    }
}

check();
