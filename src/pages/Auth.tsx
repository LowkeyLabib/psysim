import { useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { ArrowRight, LockKeyhole, Sparkles } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { setupMissing } from '../lib/config';
import { useAuth } from '../lib/auth';
import { errorMessage } from '../lib/session';
import { Logo } from '../components/Layout';
import { ErrorNotice, Loading } from '../components/ui';

export default function Auth() {
  const { user, loading, error: profileError, refresh, enterStandalone } = useAuth();
  const [signup, setSignup] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  if (loading) return <Loading />;
  if (user) return <Navigate to="/" replace />;

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!supabase || busy) return;
    setBusy(true);
    setError('');
    setNotice('');
    const data = new FormData(e.currentTarget);
    const credentials = { email: String(data.get('email')), password: String(data.get('password')) };
    try {
      const response = signup
        ? await supabase.auth.signUp({
            ...credentials,
            options: {
              data: { display_name: String(data.get('name')) },
              emailRedirectTo: `${window.location.origin}/auth`,
            },
          })
        : await supabase.auth.signInWithPassword(credentials);
      if (response.error) throw response.error;
      if (signup && !response.data.session) {
        setNotice('Check your email to confirm your account, then sign in.');
      } else {
        refresh();
      }
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-story">
        <Logo />
        <div>
          <span className="eyebrow">THE ART OF ASKING. THE SCIENCE OF LISTENING.</span>
          <h1>
            Every conversation
            <br />
            is a chance to
            <br />
            <em>understand.</em>
          </h1>
          <p>
            A thoughtful space to practice psychiatric interviewing, build clinical reasoning, and learn at your own
            pace.
          </p>
        </div>
        <span>English · বাংলা · Banglish</span>
      </div>
      <div className="auth-form-wrap">
        <div className="auth-form">
          <LockKeyhole size={28} />
          <h2>{signup ? 'Begin your learning journey' : 'Welcome back'}</h2>
          <p>{signup ? 'Create your PsySim learning account.' : 'Make room for your next conversation.'}</p>
          {setupMissing ? (
            <div className="setup-panel">
              <h3>Client-Side Clinical Simulation</h3>
              <p>
                Ready for live psychiatric interview simulations powered by the Google Gemini API directly in your browser.
              </p>
              <button
                type="button"
                className="button primary full"
                style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                onClick={() => enterStandalone()}
              >
                <Sparkles size={16} /> Enter Simulation Workspace <ArrowRight size={17} />
              </button>
              <p className="fine-print" style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: 'var(--color-muted)' }}>
                To connect a custom Supabase database, set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.
              </p>
            </div>
          ) : (
            <form onSubmit={submit}>
              {signup && (
                <label>
                  Full name
                  <input name="name" autoComplete="name" required maxLength={100} />
                </label>
              )}
              <label>
                Email address
                <input name="email" type="email" autoComplete="email" required />
              </label>
              <label>
                Password
                <input
                  name="password"
                  type="password"
                  autoComplete={signup ? 'new-password' : 'current-password'}
                  minLength={signup ? 8 : 1}
                  required
                />
              </label>
              {(error || profileError) && (
                <ErrorNotice message={error || profileError} retry={profileError ? refresh : undefined} />
              )}
              {notice && (
                <p className="notice" role="status">
                  {notice}
                </p>
              )}
              <button className="button primary full" disabled={busy}>
                {busy ? 'Please wait…' : signup ? 'Create account' : 'Sign in'}
                <ArrowRight size={17} />
              </button>
              <button
                type="button"
                className="text-button"
                onClick={() => {
                  setSignup(!signup);
                  setError('');
                  setNotice('');
                }}
              >
                {signup ? 'Already have an account? Sign in' : 'New to PsySim? Create an account'}
              </button>
            </form>
          )}
          <p className="fine-print">For educational simulation. Use fictional patient information only.</p>
        </div>
      </div>
    </div>
  );
}
