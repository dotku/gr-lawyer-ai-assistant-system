import { NextResponse } from 'next/server';

// AssemblyAI Universal Streaming API (v3) uses API key directly
// This endpoint returns the API key for client-side WebSocket connection
// Note: In production, consider using a proxy server for better security
export async function GET() {
  try {
    if (!process.env.ASSEMBLYAI_API_KEY) {
      return NextResponse.json(
        { error: 'AssemblyAI API key not configured' },
        { status: 500 }
      );
    }

    // Return the API key for Universal Streaming WebSocket connection
    // The new v3 API authenticates directly with the API key
    return NextResponse.json({
      apiKey: process.env.ASSEMBLYAI_API_KEY,
      wsUrl: 'wss://streaming.assemblyai.com/v3/ws'
    });
  } catch (error) {
    console.error('Token generation error:', error);
    return NextResponse.json(
      { error: 'Failed to get credentials' },
      { status: 500 }
    );
  }
}
