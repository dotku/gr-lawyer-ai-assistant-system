import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let supabaseClient: SupabaseClient | null = null;

export function isSupabaseConfigured(): boolean {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export function getSupabaseClient(): SupabaseClient | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  if (!supabaseClient) {
    supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
  }

  return supabaseClient;
}

// Types for our Supabase tables
export interface Transcript {
  id: string;
  session_id: string;
  source_type: 'recording' | 'upload' | 'document';
  source_name: string;
  content: string;
  speaker_segments?: SpeakerSegment[];
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface SpeakerSegment {
  speaker: string;
  text: string;
  start_time?: number;
  end_time?: number;
}

export interface ChatSession {
  id: string;
  title: string;
  transcript_ids: string[];
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  session_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

// Helper functions for Supabase operations
export async function saveTranscript(transcript: Omit<Transcript, 'id' | 'created_at' | 'updated_at'>) {
  const supabase = getSupabaseClient();
  if (!supabase) {
    console.warn('Supabase not configured, cannot save transcript');
    return null;
  }
  const { data, error } = await supabase
    .from('transcripts')
    .insert(transcript)
    .select()
    .single();

  if (error) throw error;
  return data as Transcript;
}

export async function getTranscriptsBySession(sessionId: string) {
  const supabase = getSupabaseClient();
  if (!supabase) {
    console.warn('Supabase not configured, cannot get transcripts');
    return [];
  }
  const { data, error } = await supabase
    .from('transcripts')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data as Transcript[];
}

export async function saveChatMessage(message: Omit<ChatMessage, 'id' | 'created_at'>) {
  const supabase = getSupabaseClient();
  if (!supabase) {
    console.warn('Supabase not configured, cannot save chat message');
    return null;
  }
  const { data, error } = await supabase
    .from('chat_messages')
    .insert(message)
    .select()
    .single();

  if (error) throw error;
  return data as ChatMessage;
}

export async function getChatMessages(sessionId: string) {
  const supabase = getSupabaseClient();
  if (!supabase) {
    console.warn('Supabase not configured, cannot get chat messages');
    return [];
  }
  const { data, error } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data as ChatMessage[];
}

export async function uploadFile(bucket: string, path: string, file: File | Blob) {
  const supabase = getSupabaseClient();
  if (!supabase) {
    console.warn('Supabase not configured, cannot upload file');
    return null;
  }
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (error) throw error;
  return data;
}

export async function getFileUrl(bucket: string, path: string) {
  const supabase = getSupabaseClient();
  if (!supabase) {
    console.warn('Supabase not configured, cannot get file URL');
    return null;
  }
  const { data } = supabase.storage
    .from(bucket)
    .getPublicUrl(path);

  return data.publicUrl;
}
