import { createAuthClient } from "@neondatabase/auth";
import { BetterAuthReactAdapter } from "@neondatabase/auth/react/adapters";
import { neonAuthUrl, demoMode, localDevelopment } from "./config";
export const neonAuth = !demoMode && !localDevelopment && neonAuthUrl
  ? createAuthClient(neonAuthUrl, { adapter: BetterAuthReactAdapter() }) : null;
