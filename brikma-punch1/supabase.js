import { createClient } from '@supabase/supabase-js'
const SUPABASE_URL = 'https://dzhbgfbizufgmmrhdjqi.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR6aGJnZmJpenVmZ21tcmhkanFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2NjY2ODgsImV4cCI6MjA5MjI0MjY4OH0.PpQcYCLoV8rUS2tNbCjmt8Vad58euGc7AeVP5o1VWT8'
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
