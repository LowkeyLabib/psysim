import { createClient } from '@supabase/supabase-js';
import { demoMode, supabaseUrl, supabaseKey } from './config';
export const supabase = !demoMode && supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey) : null;
