import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { UserProfile } from '../../shared/contracts';
import { api } from './api';
import { demoMode, setupMissing } from './config';
import { supabase } from './supabase';
import { errorMessage } from './session';
import { getGeminiApiKey } from './geminiKey';

interface AuthValue {
  user: UserProfile | null;
  loading: boolean;
  error: string;
  refresh: () => void;
  signOut: () => Promise<void>;
  enterStandalone: () => void;
}

const Context = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let active = true;
    let generation = 0;
    async function load() {
      const current = ++generation;
      setLoading(true);
      setError('');
      try {
        if (demoMode) {
          const profile = await api.me();
          if (active && current === generation) setUser(profile);
        } else if (!setupMissing && supabase) {
          const { data, error: authError } = await supabase.auth.getSession();
          if (authError) throw authError;
          const profile = data.session ? await api.me() : null;
          if (active && current === generation) setUser(profile);
        } else {
          // In standalone mode (e.g. GitHub Pages or client-only without Supabase credentials)
          const isStandaloneHost = typeof window !== 'undefined' && window.location.hostname.includes('github.io');
          const hasKey = Boolean(getGeminiApiKey());
          const hasChosenStandalone = typeof window !== 'undefined' && localStorage.getItem('psysim_standalone_active') === 'true';

          if (isStandaloneHost || hasKey || hasChosenStandalone) {
            const profile = await api.me();
            if (active && current === generation) setUser(profile);
          } else {
            if (active && current === generation) setUser(null);
          }
        }
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
    const subscription = supabase?.auth.onAuthStateChange(() => {
      setTimeout(() => {
        if (active) void load();
      }, 0);
    });
    return () => {
      active = false;
      subscription?.data.subscription.unsubscribe();
    };
  }, [revision]);

  const enterStandalone = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('psysim_standalone_active', 'true');
    }
    setRevision((v) => v + 1);
  };

  const signOut = async () => {
    if (supabase) {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    }
    if (typeof window !== 'undefined') {
      localStorage.removeItem('psysim_standalone_active');
    }
    setUser(null);
  };

  return (
    <Context.Provider
      value={{
        user,
        loading,
        error,
        refresh: () => setRevision((v) => v + 1),
        signOut,
        enterStandalone,
      }}
    >
      {children}
    </Context.Provider>
  );
}

export function useAuth() {
  const value = useContext(Context);
  if (!value) throw new Error('AuthProvider is missing');
  return value;
}
