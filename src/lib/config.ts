export const demoMode = import.meta.env.VITE_DEMO_MODE === 'true';
export const apiBase = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
export const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';
export const setupMissing = !demoMode && (!apiBase || !supabaseUrl || !supabaseKey);
