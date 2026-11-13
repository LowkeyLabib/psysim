import { useState, useEffect } from 'react';
import { NavLink, Outlet, Link, useNavigate } from 'react-router-dom';
import { ArrowUpRight, BookOpen, FlaskConical, History, LayoutDashboard, LogOut, ShieldCheck, Sparkles, X, Menu, KeyRound } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { demoMode } from '../lib/config';
import { errorMessage } from '../lib/session';
import { getGeminiApiKey } from '../lib/geminiKey';
import { GeminiKeyModal } from './GeminiKeyModal';
import { ErrorNotice } from './ui';

export function Logo() {
  return (
    <Link className="logo" to="/">
      <span className="logo-mark">ψ</span>
      <span>
        PsySim<span className="logo-dot">.</span>
      </span>
    </Link>
  );
}

export default function Layout() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const [keyModalOpen, setKeyModalOpen] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(() => Boolean(getGeminiApiKey()));

  useEffect(() => {
    const handleKeyChange = () => {
      setHasApiKey(Boolean(getGeminiApiKey()));
    };
    window.addEventListener('psysim_api_key_changed', handleKeyChange);
    return () => window.removeEventListener('psysim_api_key_changed', handleKeyChange);
  }, []);

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        Skip to content
      </a>

      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <Logo />
          <button className="mobile-only icon-button" aria-label="Close navigation" onClick={() => setOpen(false)}>
            <X />
          </button>
        </div>
        <div className="workspace-label">LEARNING WORKSPACE</div>

        <nav aria-label="Main navigation" onClick={() => setOpen(false)}>
          <NavLink to="/" end>
            <LayoutDashboard size={19} />Overview
          </NavLink>
          <NavLink to="/new">
            <Sparkles size={19} />Practice room<span className="nav-dot" />
          </NavLink>
          <NavLink to="/history">
            <History size={19} />Practice history
          </NavLink>
          <NavLink to="/guide">
            <BookOpen size={19} />Interview guide
          </NavLink>
          {(demoMode || user?.role !== 'student') && (
            <NavLink to="/supervisor">
              <ShieldCheck size={19} />
              {demoMode ? 'Supervisor preview' : 'Supervisor'}
            </NavLink>
          )}
        </nav>

        <div className="sidebar-bottom">
          <div className="practice-note">
            <span className="tiny-label">A SPACE TO GROW</span>
            <p>
              Better conversations.
              <br />
              Better clinical thinking.
            </p>
            <span>One patient at a time.</span>
          </div>
          <div className="user-profile">
            <span className="avatar">{user?.displayName.slice(0, 1) || 'L'}</span>
            <div>
              <strong>{user?.displayName}</strong>
              <small>{hasApiKey ? 'Live Gemini AI' : demoMode ? 'Development workspace' : 'Clinical learner'}</small>
            </div>
            {!demoMode && (
              <button
                className="icon-button"
                aria-label="Sign out"
                onClick={async () => {
                  try {
                    await signOut();
                    navigate('/auth');
                  } catch (e) {
                    setError(errorMessage(e));
                  }
                }}
              >
                <LogOut size={18} />
              </button>
            )}
          </div>
        </div>
      </aside>

      <div className="main-shell">
        <div className="topbar">
          <div className="topbar-context">
            <button className="mobile-only icon-button" aria-label="Open navigation" onClick={() => setOpen(true)}>
              <Menu />
            </button>
            <span>Clinical learning</span>
            <span className="slash">/</span>
            <strong>Your practice, with purpose</strong>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button
              onClick={() => setKeyModalOpen(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.35rem 0.75rem',
                borderRadius: '9999px',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
                border: hasApiKey ? '1px solid #10b981' : '1px solid #f59e0b',
                background: hasApiKey ? '#ecfdf5' : '#fffbeb',
                color: hasApiKey ? '#065f46' : '#92400e',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                transition: 'all 0.15s ease',
              }}
              title="Configure your Google Gemini API Key for live AI patient simulation"
            >
              {hasApiKey ? (
                <>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981' }}></span>
                  <Sparkles size={13} />
                  <span>Gemini Live AI Active</span>
                </>
              ) : (
                <>
                  <KeyRound size={13} />
                  <span>Enter Gemini API Key</span>
                </>
              )}
            </button>

            <Link to="/guide" className="topbar-link">
              How it works <ArrowUpRight size={15} />
            </Link>
          </div>
        </div>

        {!hasApiKey && (
          <div
            style={{
              padding: '0.65rem 1.25rem',
              background: '#fef3c7',
              borderBottom: '1px solid #fde68a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.78rem',
              color: '#92400e',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <KeyRound size={15} />
              <span>
                <strong>Live AI mode ready:</strong> Click to enter your free Google Gemini API key to interview real AI psychiatric patients.
              </span>
            </div>
            <button
              onClick={() => setKeyModalOpen(true)}
              style={{
                textDecoration: 'underline',
                fontWeight: 600,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#78350f',
              }}
            >
              Set API Key →
            </button>
          </div>
        )}

        <main id="main" tabIndex={-1}>
          {error && <ErrorNotice message={error} />}
          <Outlet />
        </main>

        <footer>
          <span>PsySim · Thoughtful practice. Confident conversations.</span>
          <span>For education · Synthetic patients only</span>
        </footer>
      </div>

      <GeminiKeyModal isOpen={keyModalOpen} onClose={() => setKeyModalOpen(false)} />
    </div>
  );
}
