import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { UserProfile } from "../../shared/contracts";
import { api, ApiError, localSignIn, localSignOut } from "./api";
import { demoMode, setupMissing, localDevelopment } from "./config";
import { getGeminiApiKey, hasLiveAiAccess } from "./geminiKey";
import { neonAuth } from "./neonAuth";
import { errorMessage } from "./session";

const STANDALONE_ACTIVE_KEY = "psysim_standalone_active";
const standaloneMode = import.meta.env.DEV && !demoMode && !localDevelopment && !neonAuth;

interface AuthValue {
  user: UserProfile | null;
  loading: boolean;
  error: string;
  refresh: () => void;
  signOut: () => Promise<void>;
  enterLocal: () => Promise<void>;
  enterStandalone: () => Promise<void>;
}

const Context = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const refresh = useCallback(() => setRevision(v => v + 1), []);

  useEffect(() => {
    let active = true;
    let generation = 0;
    async function load() {
      const current = ++generation;
      setLoading(true);
      setError("");
      try {
        if (demoMode) {
          const profile = await api.me();
          if (active && current === generation) setUser(profile);
        } else if (!setupMissing && neonAuth) {
          const { data, error: authError } = await neonAuth.getSession();
          if (authError) throw authError;
          const profile = data?.session ? await api.me() : null;
          if (active && current === generation) setUser(profile);
        } else if (localDevelopment) {
          try {
            const profile = await api.me();
            if (active && current === generation) setUser(profile);
          } catch (e) {
            if (!(e instanceof ApiError && e.status === 401)) throw e;
            if (active && current === generation) setUser(null);
          }
        } else if (standaloneMode) {
          const pref = localStorage.getItem(STANDALONE_ACTIVE_KEY);
          const isSignedIn =
            pref === "true" ||
            (pref === null && (Boolean(getGeminiApiKey()) || hasLiveAiAccess()));
          if (isSignedIn) {
            const profile = await api.me();
            if (active && current === generation) setUser(profile);
          } else if (active && current === generation) {
            setUser(null);
          }
        } else if (active && current === generation) setUser(null);
      } catch (e) {
        if (active && current === generation) {
          setUser(null);
          setError(errorMessage(e));
        }
      } finally {
        if (active && current === generation) setLoading(false);
      }
    }
    void load();
    const invalidate = () => { generation++; setUser(null); setLoading(false); };
    const restore = () => { if (neonAuth) void load(); };
    window.addEventListener("psysim:unauthenticated", invalidate);
    window.addEventListener("focus", restore);

    return () => {
      active = false;

      window.removeEventListener("psysim:unauthenticated", invalidate);
      window.removeEventListener("focus", restore);
    };
  }, [revision]);

  const enterLocal = async () => {
    await localSignIn();
    setRevision((v) => v + 1);
  };

  const enterStandalone = async () => {
    try {
      localStorage.setItem(STANDALONE_ACTIVE_KEY, "true");
    } catch {
      // ignore storage failure
    }
    setRevision((v) => v + 1);
  };

  const signOut = async () => {
    if (neonAuth) {
      const { error } = await neonAuth.signOut();
      if (error) throw error;
    }
    if (localDevelopment) await localSignOut();
    if (standaloneMode) {
      try {
        localStorage.setItem(STANDALONE_ACTIVE_KEY, "false");
      } catch {
        // ignore storage failure
      }
    }
    setUser(null);
  };

  return (
    <Context.Provider
      value={{
        user,
        loading,
        error,
        refresh,
        signOut,
        enterLocal,
        enterStandalone,
      }}
    >
      {neonAuth && <NeonSessionObserver onChange={refresh} />}
      {children}
    </Context.Provider>
  );
}

export function useAuth() {
  const value = useContext(Context);
  if (!value) throw new Error("AuthProvider is missing");
  return value;
}

function NeonSessionObserver({ onChange }: { onChange: () => void }) {
  const { data, isPending } = neonAuth!.useSession();
  const identity = data?.user.id;
  useEffect(() => { if (!isPending) onChange(); }, [identity, isPending, onChange]);
  return null;
}
