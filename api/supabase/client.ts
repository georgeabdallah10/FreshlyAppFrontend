// api/supabase/client.ts
import { createClient } from "@supabase/supabase-js";
import * as SecureStore from "expo-secure-store";

const ExpoSecureStoreAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

// Must exist in your .env or app.json extra section
const SUPABASE_URL = "https://pvpshqpyetlizobsgbtd.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB2cHNocXB5ZXRsaXpvYnNnYnRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc4Nzk1ODQsImV4cCI6MjA3MzQ1NTU4NH0.m4h3z_3yPRO778S8z5K6VROg4AQ6TvLQ7O83E7H1GqQ";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export const createSupabaseClient = () => supabase;