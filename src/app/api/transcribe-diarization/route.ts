import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const maxDuration = 120; // Allow longer processing time for diarization

interface AssemblyAIWord {
  text: string;
  start: number;
  end: number;
  confidence: number;
  speaker: string | null;
}

interface AssemblyAIUtterance {
  confidence: number;
  end: number;
  speaker: string;
  start: number;
  text: string;
  words: AssemblyAIWord[];
}

interface AssemblyAITranscriptResponse {
  id: string;
  status: 'queued' | 'processing' | 'completed' | 'error';
  text: string | null;
  utterances: AssemblyAIUtterance[] | null;
  error: string | null;
  audio_duration: number | null;
}

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

async function uploadToAssemblyAI(audioBlob: Blob): Promise<string> {
  const response = await fetch('https://api.assemblyai.com/v2/upload', {
    method: 'POST',
    headers: {
      'Authorization': process.env.ASSEMBLYAI_API_KEY!,
      'Content-Type': 'application/octet-stream',
    },
    body: audioBlob,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('AssemblyAI upload error:', errorText);
    throw new Error('Failed to upload to AssemblyAI');
  }

  const data = await response.json();
  return data.upload_url;
}

async function startTranscription(audioUrl: string, speakersExpected?: number): Promise<string> {
  const response = await fetch('https://api.assemblyai.com/v2/transcript', {
    method: 'POST',
    headers: {
      'Authorization': process.env.ASSEMBLYAI_API_KEY!,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      audio_url: audioUrl,
      speaker_labels: true,
      speakers_expected: speakersExpected || 2, // Default to 2 speakers (lawyer + client)
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('AssemblyAI transcription start error:', errorText);
    throw new Error('Failed to start transcription');
  }

  const data = await response.json();
  return data.id;
}

async function pollTranscription(transcriptId: string): Promise<AssemblyAITranscriptResponse> {
  const maxAttempts = 60; // 60 attempts * 2 seconds = 2 minutes max
  let attempts = 0;

  while (attempts < maxAttempts) {
    const response = await fetch(`https://api.assemblyai.com/v2/transcript/${transcriptId}`, {
      headers: {
        'Authorization': process.env.ASSEMBLYAI_API_KEY!,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to poll transcription status');
    }

    const data: AssemblyAITranscriptResponse = await response.json();

    if (data.status === 'completed') {
      return data;
    }

    if (data.status === 'error') {
      throw new Error(data.error || 'Transcription failed');
    }

    // Wait 2 seconds before polling again
    await new Promise(resolve => setTimeout(resolve, 2000));
    attempts++;
  }

  throw new Error('Transcription timed out');
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File | null;
    const saveToStorage = formData.get('save') === 'true';
    const speakersExpectedStr = formData.get('speakers_expected') as string | null;
    const speakersExpected = speakersExpectedStr ? parseInt(speakersExpectedStr, 10) : 2;

    if (!audioFile) {
      return NextResponse.json(
        { error: 'No audio file provided' },
        { status: 400 }
      );
    }

    // Check file size (max 25MB)
    if (audioFile.size > 25 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'Audio file too large. Maximum size is 25MB.' },
        { status: 400 }
      );
    }

    if (!process.env.ASSEMBLYAI_API_KEY) {
      return NextResponse.json(
        { error: 'AssemblyAI API key not configured' },
        { status: 500 }
      );
    }

    const audioBlob = new Blob([await audioFile.arrayBuffer()], { type: audioFile.type });
    let supabaseAudioUrl: string | null = null;

    // Upload to Supabase Storage if requested
    if (saveToStorage) {
      try {
        supabaseAudioUrl = await uploadToSupabase(audioBlob, audioFile.name || 'recording.webm');
        console.log('Audio saved to Supabase:', supabaseAudioUrl);
      } catch (error) {
        console.error('Storage upload failed, continuing without save:', error);
      }
    }

    // Upload to AssemblyAI
    console.log('Uploading to AssemblyAI...');
    const assemblyAudioUrl = await uploadToAssemblyAI(audioBlob);

    // Start transcription with speaker diarization
    console.log('Starting transcription with speaker diarization...');
    const transcriptId = await startTranscription(assemblyAudioUrl, speakersExpected);

    // Poll for completion
    console.log('Polling for transcription result...');
    const result = await pollTranscription(transcriptId);

    // Format segments with speaker info
    const segments = result.utterances?.map((utterance, index) => ({
      id: `segment-${index}`,
      speaker: utterance.speaker, // 'A', 'B', 'C', etc.
      text: utterance.text.trim(),
      startTime: utterance.start / 1000, // Convert ms to seconds
      endTime: utterance.end / 1000,
      confidence: utterance.confidence,
    })) || [];

    // Get unique speakers
    const speakers = [...new Set(segments.map(s => s.speaker))].sort();

    return NextResponse.json({
      success: true,
      transcription: result.text,
      segments,
      speakers,
      speakerCount: speakers.length,
      audioUrl: supabaseAudioUrl,
      duration: result.audio_duration,
      provider: 'assemblyai',
    });
  } catch (error) {
    console.error('Transcription error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to transcribe audio' },
      { status: 500 }
    );
  }
}
