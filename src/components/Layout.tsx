import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { Menu, X, LogOut, ArrowUpRight, KeyRound, Sparkles } from "lucide-react";
import { useAuth } from "../lib/auth";
import { demoMode, localDevelopment } from "../lib/config";
import { hasLiveAiAccess } from "../lib/geminiKey";
import { supabase } from "../lib/supabase";
import { errorMessage } from "../lib/session";
import { GeminiKeyModal } from "./GeminiKeyModal";
import { ErrorNotice } from "./ui";

const standaloneMode = !demoMode && !localDevelopment && !supabase;
export function Logo() {
  return (
    <Link className="logo" to="/" aria-label="PsySim home">
      <span className="logo-mark" aria-hidden="true">
        ψ
      </span>
      PsySim<span className="logo-dot">.</span>
    </Link>
  );
}
export default function Layout() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [keyModalOpen, setKeyModalOpen] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(() => hasLiveAiAccess());

  useEffect(() => {
    const syncKey = () => setHasApiKey(hasLiveAiAccess());
    window.addEventListener("psysim_api_key_changed", syncKey);
    return () => window.removeEventListener("psysim_api_key_changed", syncKey);
  }, []);
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="site-header">
        <Logo />
        <button
          className="icon-button mobile-only"
          aria-label={open ? "Close navigation" : "Open navigation"}
          aria-expanded={open}
          aria-controls="main-nav"
          onClick={() => setOpen(!open)}
        >
          {open ? <X /> : <Menu />}
        </button>
        <nav
          id="main-nav"
          className={open ? "open" : ""}
          aria-label="Main navigation"
          onClick={() => setOpen(false)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setOpen(false);
          }}
        >
          <NavLink to="/" end>
            Overview
          </NavLink>
          <NavLink to="/new">Practice room</NavLink>
          <NavLink to="/history">History</NavLink>
          <NavLink to="/guide">Interview guide</NavLink>
          {(demoMode ||
            user?.role === "supervisor" ||
            user?.role === "administrator") && (
            <NavLink to="/supervisor">
              {demoMode ? "Supervisor preview" : "Supervisor"}
            </NavLink>
          )}
        </nav>
        <div className="header-user">
          {standaloneMode && (
            <button
              type="button"
              onClick={() => setKeyModalOpen(true)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 12px",
                borderRadius: "9999px",
                fontSize: "11px",
                fontWeight: 600,
                background: hasApiKey
                  ? "rgba(16, 185, 129, 0.14)"
                  : "rgba(47, 107, 255, 0.14)",
                border: hasApiKey
                  ? "1px solid rgba(16, 185, 129, 0.45)"
                  : "1px solid rgba(47, 107, 255, 0.45)",
                color: hasApiKey ? "#6ee7b7" : "var(--sand)",
                whiteSpace: "nowrap",
              }}
              title="Configure your Google Gemini API key for live AI consultations"
            >
              {hasApiKey ? (
                <>
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: "#34d399",
                    }}
                  />
                  <Sparkles size={13} />
                  <span>Gemini Live AI Active</span>
                </>
              ) : (
                <>
                  <KeyRound size={13} />
                  <span>Set Gemini API Key</span>
                </>
              )}
            </button>
          )}
          <span className="avatar">{user?.displayName.slice(0, 1)}</span>
          <span>{user?.displayName}</span>
          {!demoMode && (
            <button
              className="icon-button"
              aria-label="Sign out"
              onClick={async () => {
                try {
                  await signOut();
                  navigate("/auth");
                } catch (e) {
                  setError(errorMessage(e));
                }
              }}
            >
              <LogOut size={17} />
            </button>
          )}
        </div>
      </header>
      {(demoMode || localDevelopment || (standaloneMode && !hasApiKey)) && (
        <div className="development-banner">
          <span className="status-dot" />
          <strong>
            {demoMode
              ? "Scripted UI preview"
              : standaloneMode
                ? "Standalone Gemini AI mode"
                : "Local development"}
          </strong>
          <span>
            {demoMode
              ? "No live AI or clinical grading."
              : standaloneMode
                ? "Running scenario fallback until you connect your free Google Gemini API key."
                : "Unreviewed fictional cases · for development testing."}
          </span>
          {standaloneMode && (
            <button
              type="button"
              className="text-button"
              style={{ fontSize: "11px", textDecoration: "underline" }}
              onClick={() => setKeyModalOpen(true)}
            >
              Set API Key →
            </button>
          )}
        </div>
      )}
      <div className="main-shell">
        <main id="main" tabIndex={-1}>
          {error && <ErrorNotice message={error} />}
          <Outlet />
        </main>
        <footer>
          <Logo />
          <span>Psychiatric education, one conversation at a time.</span>
          <Link to="/guide">
            Text only · Fictional patients <ArrowUpRight size={14} />
          </Link>
        </footer>
      </div>
      {standaloneMode && (
        <GeminiKeyModal
          isOpen={keyModalOpen}
          onClose={() => setKeyModalOpen(false)}
        />
      )}
    </div>
  );
}
