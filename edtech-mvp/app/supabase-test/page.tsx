'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export default function SupabaseTestPage() {
    const [status, setStatus] = useState('Testing...');
    const [result, setResult] = useState<any>(null);

    useEffect(() => {
        async function checkConnection() {
            const { data, error } = await supabase.from('classes').select('*').limit(5);
            if (error) {
                setStatus('Error');
                setResult(error);
            } else {
                setStatus('Connected');
                setResult(data);
            }
        }
        checkConnection();
    }, []);

    return (
        <div style={{ padding: '20px', fontFamily: 'monospace' }}>
            <h1>Supabase Connection Test</h1>
            <p>Status: <strong>{status}</strong></p>
            <pre style={{ background: '#f4f4f4', padding: '10px', borderRadius: '5px' }}>
                {JSON.stringify(result, null, 2)}
            </pre>
        </div>
    );
}
