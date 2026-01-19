import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const maxDuration = 60;

async function uploadToSupabase(audioBlob: Blob, fileName: string): Promise<string> {
  const buffer = Buffer.from(await audioBlob.arrayBuffer());
  const filePath = `recordings/${Date.now()}-${fileName}`;

  const { error } = await supabase.storage
    .from('audio')
    .upload(filePath, buffer, {
      contentType: audioBlob.type || 'audio/webm',
      cacheControl: '3600',
    });

  if (error) {
    console.error('Supabase upload error:', error);
    throw new Error('Failed to upload audio file');
  }

  const { data: urlData } = supabase.storage
    .from('audio')
    .getPublicUrl(filePath);

  return urlData.publicUrl;
}

async function transcribeWithWhisper(audioBlob: Blob, fileName: string) {
  const formData = new FormData();
  const file = new File([audioBlob], fileName, { type: audioBlob.type || 'audio/webm' });
  formData.append('file', file);
  formData.append('model', 'whisper-1');
  formData.append('response_format', 'verbose_json');
  formData.append('timestamp_granularities[]', 'segment');

  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Whisper API error:', errorText);
    throw new Error('Whisper transcription failed');
  }

  return response.json();
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File | null;
    const saveToStorage = formData.get('save') === 'true';

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

    const audioBlob = new Blob([await audioFile.arrayBuffer()], { type: audioFile.type });
    let audioUrl: string | null = null;

    // Upload to Supabase Storage if requested
    if (saveToStorage) {
      try {
        audioUrl = await uploadToSupabase(audioBlob, audioFile.name || 'recording.webm');
        console.log('Audio saved to:', audioUrl);
      } catch (error) {
        console.error('Storage upload failed, continuing without save:', error);
        // Continue with transcription even if storage fails
      }
    }

    // Transcribe with OpenAI Whisper
    const result = await transcribeWithWhisper(audioBlob, audioFile.name || 'audio.webm');

    // Format segments with timing info
    const segments = result.segments?.map((seg: { id: number; text: string; start: number; end: number }, index: number) => ({
      id: `segment-${index}`,
      text: seg.text.trim(),
      startTime: seg.start,
      endTime: seg.end,
    })) || [];

    return NextResponse.json({
      success: true,
      transcription: result.text,
      segments,
      audioUrl,
      duration: result.duration,
      language: result.language,
      provider: 'openai',
    });
  } catch (error) {
    console.error('Transcription error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to transcribe audio' },
      { status: 500 }
    );
  }
}
