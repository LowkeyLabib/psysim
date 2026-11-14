export const demoMode =
  import.meta.env.DEV && import.meta.env.VITE_DEMO_MODE === "true";
export const localDevelopment =
  import.meta.env.DEV &&
  import.meta.env.VITE_LOCAL_DEVELOPMENT === "true" &&
  ["127.0.0.1", "localhost"].includes(window.location.hostname);
export const apiBase = (import.meta.env.VITE_API_BASE_URL || "/api").replace(
  /\/$/,
  "",
);
export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
export const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";
export const setupMissing =
  !demoMode && !localDevelopment && (!supabaseUrl || !supabaseKey);
