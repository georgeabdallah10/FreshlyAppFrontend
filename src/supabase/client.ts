// api/supabase/client.ts
import { createClient } from "@supabase/supabase-js";
import { Platform } from "react-native";
import { Storage as  CrossPlatformStorageAdapter} from "../utils/storage";

// Must exist in your .env or app.json extra section
const SUPABASE_URL = "https://pvpshqpyetlizobsgbtd.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB2cHNocXB5ZXRsaXpvYnNnYnRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc4Nzk1ODQsImV4cCI6MjA3MzQ1NTU4NH0.m4h3z_3yPRO778S8z5K6VROg4AQ6TvLQ7O83E7H1GqQ";

const SupabaseStorage = {
  getItem: (key: string): string | null => {
    if (typeof window !== "undefined") {
      return sessionStorage.getItem(key);
    }
    return null;
  },
  setItem: (key: string, value: string): void => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem(key, value);
    }
  },
  removeItem: (key: string): void => {
    if (typeof window !== "undefined") {
      sessionStorage.removeItem(key);
    }
  },
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: SupabaseStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export const createSupabaseClient = () => supabase;