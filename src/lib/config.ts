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
export const neonAuthUrl = import.meta.env.VITE_NEON_AUTH_URL || "";
export const setupMissing = !demoMode && !localDevelopment && !neonAuthUrl;
