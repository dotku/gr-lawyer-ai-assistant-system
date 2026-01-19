import { NextRequest, NextResponse } from 'next/server';
import { chatWithContext, generateSummary } from '@/lib/openai';

export const maxDuration = 60;

interface ChatRequest {
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  context: string;
  action?: 'chat' | 'summarize';
}

export async function POST(request: NextRequest) {
  try {
    const body: ChatRequest = await request.json();
    const { messages, context, action = 'chat' } = body;

    if (!context || context.trim().length === 0) {
      return NextResponse.json(
        { error: 'No context provided. Please add transcripts or documents first.' },
        { status: 400 }
      );
    }

    if (action === 'summarize') {
      const summary = await generateSummary(context);
      return NextResponse.json({
        success: true,
        summary,
      });
    }

    if (!messages || messages.length === 0) {
      return NextResponse.json(
        { error: 'No messages provided' },
        { status: 400 }
      );
    }

    const response = await chatWithContext(messages, context);

    return NextResponse.json({
      success: true,
      response,
    });
  } catch (error) {
    console.error('Chat error:', error);
    return NextResponse.json(
      { error: 'Failed to process chat request' },
      { status: 500 }
    );
  }
}
