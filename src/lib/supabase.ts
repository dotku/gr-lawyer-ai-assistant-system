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

// Billing rate types
export type BillingRateType = 'lawyer' | 'assistant' | 'vendor';

export interface BillingRate {
  id: string;
  name: string;
  type: BillingRateType;
  hourlyRate: number;
  currency: string;
  email?: string;
  phone?: string;
  notes?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Helper functions for billing rates (using localStorage for now)
const BILLING_RATES_KEY = 'ordolex_billing_rates';

const SAMPLE_BILLING_RATES: Omit<BillingRate, 'id' | 'createdAt' | 'updatedAt'>[] = [
  { name: 'James Walker', type: 'lawyer', hourlyRate: 350, currency: 'USD', email: 'j.walker@lawfirm.com', phone: '+1 (555) 100-2001', notes: 'Senior partner, specializes in family law', isActive: true },
  { name: 'Emily Chen', type: 'lawyer', hourlyRate: 275, currency: 'USD', email: 'e.chen@lawfirm.com', phone: '+1 (555) 100-2002', notes: 'Associate attorney, corporate & real estate', isActive: true },
  { name: 'Maria Lopez', type: 'assistant', hourlyRate: 120, currency: 'USD', email: 'm.lopez@lawfirm.com', phone: '+1 (555) 100-2003', notes: 'Paralegal, intake coordination', isActive: true },
  { name: 'David Kim', type: 'assistant', hourlyRate: 95, currency: 'USD', email: 'd.kim@lawfirm.com', phone: '+1 (555) 100-2004', notes: 'Legal assistant, document preparation', isActive: true },
  { name: 'Pacific Court Reporting', type: 'vendor', hourlyRate: 200, currency: 'USD', email: 'billing@pacificcourt.com', phone: '+1 (555) 300-4001', notes: 'Court reporting & transcription services', isActive: true },
  { name: 'LegalTranslate Inc.', type: 'vendor', hourlyRate: 150, currency: 'USD', email: 'invoices@legaltranslate.com', phone: '+1 (555) 300-4002', notes: 'Translation & interpretation services', isActive: true },
];

function seedSampleRates(): BillingRate[] {
  const now = new Date().toISOString();
  const rates: BillingRate[] = SAMPLE_BILLING_RATES.map((r, i) => ({
    ...r,
    id: `rate-sample-${i + 1}`,
    createdAt: now,
    updatedAt: now,
  }));
  localStorage.setItem(BILLING_RATES_KEY, JSON.stringify(rates));
  return rates;
}

export function getBillingRates(): BillingRate[] {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem(BILLING_RATES_KEY);
  if (stored) return JSON.parse(stored);
  // Seed sample data on first load
  return seedSampleRates();
}

export function saveBillingRate(rate: Omit<BillingRate, 'id' | 'createdAt' | 'updatedAt'>): BillingRate {
  const rates = getBillingRates();
  const newRate: BillingRate = {
    ...rate,
    id: `rate-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  rates.push(newRate);
  localStorage.setItem(BILLING_RATES_KEY, JSON.stringify(rates));
  return newRate;
}

export function updateBillingRate(id: string, updates: Partial<Omit<BillingRate, 'id' | 'createdAt'>>): BillingRate | null {
  const rates = getBillingRates();
  const index = rates.findIndex(r => r.id === id);
  if (index === -1) return null;

  rates[index] = {
    ...rates[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  localStorage.setItem(BILLING_RATES_KEY, JSON.stringify(rates));
  return rates[index];
}

export function deleteBillingRate(id: string): boolean {
  const rates = getBillingRates();
  const filtered = rates.filter(r => r.id !== id);
  if (filtered.length === rates.length) return false;
  localStorage.setItem(BILLING_RATES_KEY, JSON.stringify(filtered));
  return true;
}
