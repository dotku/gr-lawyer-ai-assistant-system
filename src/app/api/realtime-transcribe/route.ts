import { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// This endpoint handles transcription of audio chunks using AssemblyAI
// Currently used as a fallback/utility endpoint

// Process audio chunk through AssemblyAI batch API
async function processAudioChunk(audioBuffer: Buffer): Promise<{ text: string; speaker?: string } | null> {
  const apiKey = process.env.ASSEMBLYAI_API_KEY;
  if (!apiKey) {
    throw new Error('AssemblyAI API key not configured');
  }

  // Convert Buffer to Uint8Array for fetch body compatibility
  const uint8Array = new Uint8Array(audioBuffer);

  // Upload audio to AssemblyAI
  const uploadResponse = await fetch('https://api.assemblyai.com/v2/upload', {
    method: 'POST',
    headers: {
      'Authorization': apiKey,
      'Content-Type': 'application/octet-stream',
    },
    body: uint8Array,
  });

  if (!uploadResponse.ok) {
    console.error('Upload failed:', await uploadResponse.text());
    return null;
  }

  const { upload_url } = await uploadResponse.json();

  // Start transcription with speaker labels
  const transcriptResponse = await fetch('https://api.assemblyai.com/v2/transcript', {
    method: 'POST',
    headers: {
      'Authorization': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      audio_url: upload_url,
      speaker_labels: true,
      speakers_expected: 2,
    }),
  });

  if (!transcriptResponse.ok) {
    console.error('Transcription start failed:', await transcriptResponse.text());
    return null;
  }

  const { id: transcriptId } = await transcriptResponse.json();

  // Poll for completion (with timeout for quick processing)
  const maxAttempts = 30; // 30 seconds max
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await new Promise(resolve => setTimeout(resolve, 1000));

    const pollResponse = await fetch(`https://api.assemblyai.com/v2/transcript/${transcriptId}`, {
      headers: { 'Authorization': apiKey },
    });

    if (!pollResponse.ok) continue;

    const result = await pollResponse.json();

    if (result.status === 'completed') {
      // Get the main speaker from utterances if available
      let speaker = 'A';
      if (result.utterances && result.utterances.length > 0) {
        speaker = result.utterances[0].speaker;
      }
      return { text: result.text || '', speaker };
    }

    if (result.status === 'error') {
      console.error('Transcription error:', result.error);
      return null;
    }
  }

  return null;
}

// POST: Receive audio chunk and process it
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio') as Blob | null;

    if (!audioFile) {
      return new Response(JSON.stringify({ error: 'No audio provided' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const audioBuffer = Buffer.from(await audioFile.arrayBuffer());

    // Process the audio chunk
    const result = await processAudioChunk(audioBuffer);

    if (!result || !result.text.trim()) {
      return new Response(JSON.stringify({
        success: true,
        text: '',
        speaker: 'A',
        message: 'No speech detected'
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      success: true,
      text: result.text,
      speaker: result.speaker || 'A',
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Real-time transcription error:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Transcription failed'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
