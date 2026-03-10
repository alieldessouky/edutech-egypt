import { NextRequest, NextResponse } from 'next/server';
import { TextToSpeechClient } from '@google-cloud/text-to-speech';

// Function to create the client - handles usage of GOOGLE_APPLICATION_CREDENTIALS env var automatically
const client = new TextToSpeechClient();

export async function POST(req: NextRequest) {
    try {
        const { text, voiceName = 'ar-XA-Wavenet-A', gender = 'FEMALE' } = await req.json();

        if (!text) {
            return NextResponse.json({ error: 'Missing text' }, { status: 400 });
        }

        // Construct the request
        const request = {
            input: { text: text },
            // Select the language and voice
            voice: {
                languageCode: 'ar-XA',
                name: voiceName,
                ssmlGender: gender as any, // 'FEMALE', 'MALE', or 'NEUTRAL'
            },
            // Select the type of audio encoding
            audioConfig: {
                audioEncoding: 'MP3' as const,
                speakingRate: 0.9, // Slightly slower for clarity
                effectsProfileId: ['small-bluetooth-speaker-class-device'], // Optimize for likely device
            },
        };

        // Performs the text-to-speech request
        const [response] = await client.synthesizeSpeech(request);
        const audioContent = response.audioContent;

        if (!audioContent) {
            throw new Error('No audio content received');
        }

        // Return base64 encoded audio
        // The library returns Buffer or string (base64) depending on encoding, 
        // usually it's a Buffer we need to convert to base64 for JSON response
        const audioBase64 = Buffer.from(audioContent).toString('base64');

        return NextResponse.json({
            audioContent: audioBase64,
        });

    } catch (error: any) {
        console.error('TTS API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
