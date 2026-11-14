import { createClient } from "@supabase/supabase-js";
import { config } from "../config";
export function getSupabase() {
  if (!config.supabase.isConfigured) return null;
  return createClient(config.supabase.url, config.supabase.anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
