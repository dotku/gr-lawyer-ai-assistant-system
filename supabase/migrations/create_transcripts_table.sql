-- ============================================
-- OrdoLex Lawyer Assistant - Database Setup
-- ============================================
-- Run this SQL in your Supabase Dashboard > SQL Editor
-- ============================================

-- 1. Create transcripts table for storing audio transcriptions with speaker diarization
CREATE TABLE IF NOT EXISTS transcripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('recording', 'upload', 'document')),
  source_name TEXT NOT NULL,
  content TEXT NOT NULL,
  speaker_segments JSONB,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on session_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_transcripts_session_id ON transcripts(session_id);

-- Create index on created_at for ordering
CREATE INDEX IF NOT EXISTS idx_transcripts_created_at ON transcripts(created_at);

-- 2. Create chat_messages table for storing conversation history
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on session_id for chat_messages
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON chat_messages(session_id);

-- 3. Enable Row Level Security and allow all operations (for demo)
ALTER TABLE transcripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Create policies to allow all operations (adjust for your security needs)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow all operations on transcripts') THEN
    CREATE POLICY "Allow all operations on transcripts" ON transcripts
      FOR ALL USING (true) WITH CHECK (true);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow all operations on chat_messages') THEN
    CREATE POLICY "Allow all operations on chat_messages" ON chat_messages
      FOR ALL USING (true) WITH CHECK (true);
  END IF;
END
$$;

-- 4. Create function to auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for transcripts
DROP TRIGGER IF EXISTS update_transcripts_updated_at ON transcripts;
CREATE TRIGGER update_transcripts_updated_at
  BEFORE UPDATE ON transcripts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 5. Create Storage bucket for audio files
-- NOTE: This must be done in Supabase Dashboard > Storage > New Bucket
-- Create a bucket named "audio" with public access enabled
-- Or run this in SQL:
INSERT INTO storage.buckets (id, name, public)
VALUES ('audio', 'audio', true)
ON CONFLICT (id) DO NOTHING;

-- 6. Create storage policy to allow uploads
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public uploads to audio bucket') THEN
    CREATE POLICY "Allow public uploads to audio bucket" ON storage.objects
      FOR INSERT WITH CHECK (bucket_id = 'audio');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public read from audio bucket') THEN
    CREATE POLICY "Allow public read from audio bucket" ON storage.objects
      FOR SELECT USING (bucket_id = 'audio');
  END IF;
END
$$;
