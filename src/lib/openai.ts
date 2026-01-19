import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default openai;

// Transcribe audio using Whisper
export async function transcribeAudio(audioFile: File | Blob, fileName: string = 'audio.webm'): Promise<string> {
  const file = new File([audioFile], fileName, { type: audioFile.type || 'audio/webm' });

  const response = await openai.audio.transcriptions.create({
    file,
    model: 'whisper-1',
    language: 'en', // Can be changed based on needs
    response_format: 'text',
  });

  return response;
}

// Transcribe with timestamps for speaker diarization
export async function transcribeAudioVerbose(audioFile: File | Blob, fileName: string = 'audio.webm') {
  const file = new File([audioFile], fileName, { type: audioFile.type || 'audio/webm' });

  const response = await openai.audio.transcriptions.create({
    file,
    model: 'whisper-1',
    language: 'en',
    response_format: 'verbose_json',
    timestamp_granularities: ['segment'],
  });

  return response;
}

// Chat completion with context
export async function chatWithContext(
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
  context: string,
  model: string = 'gpt-4o'
) {
  const systemMessage = {
    role: 'system' as const,
    content: `You are an AI legal assistant helping lawyers analyze client interviews, documents, and case materials.

You have access to the following context from transcripts and documents:

<context>
${context}
</context>

Based on this context, help the user with their questions. Be precise, professional, and reference specific parts of the context when relevant.
If the user asks something not covered in the context, clearly state that you don't have that information.`,
  };

  const response = await openai.chat.completions.create({
    model,
    messages: [systemMessage, ...messages],
    temperature: 0.7,
    max_tokens: 2000,
  });

  return response.choices[0].message.content;
}

// Extract text from documents using GPT-4 Vision (for images/PDFs)
export async function extractTextFromImage(imageBase64: string): Promise<string> {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: 'Extract all text from this document image. Maintain the original structure and formatting as much as possible. If there are any forms, tables, or structured content, preserve that structure.',
          },
          {
            type: 'image_url',
            image_url: {
              url: imageBase64.startsWith('data:') ? imageBase64 : `data:image/png;base64,${imageBase64}`,
            },
          },
        ],
      },
    ],
    max_tokens: 4000,
  });

  return response.choices[0].message.content || '';
}

// Generate summary of content
export async function generateSummary(content: string): Promise<string> {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: 'You are a legal assistant. Generate a concise summary of the following content, highlighting key facts, dates, parties involved, and potential legal issues.',
      },
      {
        role: 'user',
        content,
      },
    ],
    temperature: 0.5,
    max_tokens: 1000,
  });

  return response.choices[0].message.content || '';
}
