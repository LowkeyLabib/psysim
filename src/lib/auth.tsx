import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { UserProfile } from '../../shared/contracts';
import { api } from './api';
import { demoMode, setupMissing } from './config';
import { supabase } from './supabase';
import { errorMessage } from './session';
interface AuthValue { user: UserProfile | null; loading: boolean; error: string; refresh: () => void; signOut: () => Promise<void> }
const Context = createContext<AuthValue | null>(null);
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true; let generation = 0;
    async function load() {
      const current = ++generation; setLoading(true); setError('');
      try {
        if (demoMode) { const profile = await api.me(); if (active && current === generation) setUser(profile); }
        else if (!setupMissing && supabase) {
          const { data, error: authError } = await supabase.auth.getSession();
          if (authError) throw authError;
          const profile = data.session ? await api.me() : null;
          if (active && current === generation) setUser(profile);
        }
      } catch (e) { if (active && current === generation) { setUser(null); setError(errorMessage(e)); } }
      finally { if (active && current === generation) setLoading(false); }
    }
    void load();
    const subscription = supabase?.auth.onAuthStateChange(() => { setTimeout(() => { if (active) void load(); }, 0); });
    return () => { active = false; subscription?.data.subscription.unsubscribe(); };
  }, [revision]);
  return <Context.Provider value={{ user, loading, error, refresh: () => setRevision(v => v + 1), signOut: async () => {
    if (supabase) { const { error } = await supabase.auth.signOut(); if (error) throw error; }
    setUser(null);
  } }}>{children}</Context.Provider>;
}
export function useAuth() { const value = useContext(Context); if (!value) throw new Error('AuthProvider is missing'); return value; }
