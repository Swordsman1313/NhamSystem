import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://gqrqiavqxxxgqwukibuq.supabase.co';
const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxcnFpYXZxeHh4Z3F3dWtpYnVxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEyMTQwNzksImV4cCI6MjEwNjc5MDA3OX0.TtMvTm0TpHeB9ABIb_TVq7umhMcC-hu_e4vciKn3Yuo';

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});
