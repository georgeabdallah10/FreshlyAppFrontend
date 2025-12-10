// api/supabase/client.ts
import { createClient } from "@supabase/supabase-js";
import Constants from 'expo-constants';
import { Storage as CrossPlatformStorageAdapter } from "../utils/storage";

// Get Supabase credentials from app.json extra config or fallback to hardcoded values
const SUPABASE_URL = 
  Constants.expoConfig?.extra?.supabaseUrl ?? 
  "https://pvpshqpyetlizobsgbtd.supabase.co";

const SUPABASE_ANON_KEY = 
  Constants.expoConfig?.extra?.supabaseAnonKey ?? 
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB2cHNocXB5ZXRsaXpvYnNnYnRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc4Nzk1ODQsImV4cCI6MjA3MzQ1NTU4NH0.m4h3z_3yPRO778S8z5K6VROg4AQ6TvLQ7O83E7H1GqQ";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: CrossPlatformStorageAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export const createSupabaseClient = () => supabase;