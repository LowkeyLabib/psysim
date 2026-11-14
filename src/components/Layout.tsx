import { useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { Menu, X, LogOut, ArrowUpRight } from "lucide-react";
import { useAuth } from "../lib/auth";
import { demoMode, localDevelopment } from "../lib/config";
import { errorMessage } from "../lib/session";
import { ErrorNotice } from "./ui";
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
      {(demoMode || localDevelopment) && (
        <div className="development-banner">
          <span className="status-dot" />
          <strong>
            {demoMode ? "Scripted UI preview" : "Local development"}
          </strong>
          <span>
            {demoMode
              ? "No live AI or clinical grading."
              : "Unreviewed fictional cases · for development testing."}
          </span>
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
    </div>
  );
}
