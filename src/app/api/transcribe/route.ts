import { NextRequest, NextResponse } from 'next/server';
import { transcribeAudio, transcribeAudioVerbose } from '@/lib/openai';

export const maxDuration = 60; // Allow up to 60 seconds for transcription

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File | null;
    const verbose = formData.get('verbose') === 'true';

    if (!audioFile) {
      return NextResponse.json(
        { error: 'No audio file provided' },
        { status: 400 }
      );
    }

    // Check file size (max 25MB for Whisper)
    if (audioFile.size > 25 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'Audio file too large. Maximum size is 25MB.' },
        { status: 400 }
      );
    }

    // Get the transcription
    if (verbose) {
      const result = await transcribeAudioVerbose(audioFile, audioFile.name);
      return NextResponse.json({
        success: true,
        transcription: result.text,
        segments: result.segments,
        language: result.language,
        duration: result.duration,
      });
    } else {
      const transcription = await transcribeAudio(audioFile, audioFile.name);
      return NextResponse.json({
        success: true,
        transcription,
      });
    }
  } catch (error) {
    console.error('Transcription error:', error);
    return NextResponse.json(
      { error: 'Failed to transcribe audio' },
      { status: 500 }
    );
  }
}
