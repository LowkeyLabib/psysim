import { useState, type FormEvent } from "react";
import { Navigate } from "react-router-dom";
import { ArrowRight, KeyRound, LockKeyhole, Sparkles } from "lucide-react";
import { neonAuth } from "../lib/neonAuth";
import { setupMissing, localDevelopment, demoMode } from "../lib/config";
import {
  getGeminiApiKey,
  getGeminiProxyUrl,
  maskGeminiApiKey,
} from "../lib/geminiKey";

const standaloneMode = import.meta.env.DEV && !demoMode && !localDevelopment && !neonAuth;
import { useAuth } from "../lib/auth";
import { errorMessage } from "../lib/session";
import { Logo } from "../components/Layout";
import { GeminiKeyModal } from "../components/GeminiKeyModal";
import { ErrorNotice, Loading } from "../components/ui";

export default function Auth() {
  const {
    user,
    loading,
    error: profileError,
    refresh,
    enterLocal,
    enterStandalone,
  } = useAuth();
  const [signup, setSignup] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [keyModalOpen, setKeyModalOpen] = useState(false);
  const [savedKey, setSavedKey] = useState(() => getGeminiApiKey());
  const proxyConfigured = Boolean(getGeminiProxyUrl());

  if (loading) return <Loading />;
  if (user) return <Navigate to="/" replace />;

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!neonAuth || busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    const data = new FormData(e.currentTarget);
    const credentials = {
      email: String(data.get("email")),
      password: String(data.get("password")),
    };
    try {
      if (signup && credentials.password !== String(data.get("confirmPassword"))) {
        setError("Passwords do not match.");
        return;
      }
      const callbackURL = new URL("auth", new URL(import.meta.env.BASE_URL, window.location.href)).href;
      const response = signup
        ? await neonAuth.signUp.email({ ...credentials, name: String(data.get("name")).trim(), callbackURL })
        : await neonAuth.signIn.email({ ...credentials, callbackURL });
      if (response.error) {
        setError(signup
          ? "Unable to create the account. Check your details, or sign in if you already registered."
          : "Unable to sign in. Check your email and password, and confirm your email if required.");
        return;
      }
      const session = await neonAuth.getSession();
      if (!session.data?.session) {
        setNotice("Check your email to confirm your account, then sign in.");
      } else {
        refresh();
      }
    } catch {
      setError("Account service unavailable. Please try again shortly.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-story">
        <Logo />
        <div>
          <span className="eyebrow">
            THE ART OF ASKING. THE SCIENCE OF LISTENING.
          </span>
          <h1>
            Every conversation
            <br />
            is a chance to
            <br />
            <em>understand.</em>
          </h1>
          <p>
            A thoughtful space to practice psychiatric interviewing, build
            clinical reasoning, and learn at your own pace.
          </p>
        </div>
        <span>English · বাংলা · Banglish</span>
      </div>
      <div className="auth-form-wrap">
        <div className="auth-form">
          <LockKeyhole size={28} />
          <h2>{signup ? "Begin your learning journey" : "Welcome back"}</h2>
          <p>
            {signup
              ? "Create your PsySim learning account."
              : "Make room for your next conversation."}
          </p>
          {localDevelopment ? (
            <div className="setup-panel">
              <span className="badge">LOCAL DEVELOPMENT</span>
              <h3>Your private practice workspace</h3>
              <p>
                Try the connected AI with fictional, unreviewed development
                cases. Your sessions are saved on this computer.
              </p>
              {(error || profileError) && (
                <ErrorNotice message={error || profileError} />
              )}
              <button
                type="button"
                className="button primary full"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  setError("");
                  try {
                    await enterLocal();
                  } catch (e) {
                    setError(errorMessage(e));
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                <Sparkles size={16} />
                {busy ? "Connecting…" : "Enter local workspace"}
                <ArrowRight size={17} />
              </button>
            </div>
          ) : standaloneMode ? (
            <div className="setup-panel">
              <span className="badge sage">
                {proxyConfigured ? "LIVE GEMINI AI READY" : "STANDALONE LIVE AI"}
              </span>
              <h3>
                {proxyConfigured
                  ? "Enter Clinical Practice"
                  : "Connect Gemini AI & Practice"}
              </h3>
              <p>
                {savedKey
                  ? `Personal Gemini API key (${maskGeminiApiKey(savedKey)}) is connected. Enter your clinical workspace to interview live AI psychiatric patients.`
                  : proxyConfigured
                    ? "Live AI psychiatric patient simulation is ready in English, বাংলা, and Banglish. No API key setup required."
                    : "Enter your free Google Gemini API key to interview live AI psychiatric patients in English, বাংলা, or Banglish directly in your browser."}
              </p>
              {(error || profileError) && (
                <ErrorNotice message={error || profileError} />
              )}
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <button
                  type="button"
                  className="button primary full"
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    setError("");
                    try {
                      await enterStandalone();
                    } catch (e) {
                      setError(errorMessage(e));
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  <Sparkles size={16} />
                  {busy ? "Opening…" : "Enter clinical workspace"}
                  <ArrowRight size={17} />
                </button>
                <button
                  type="button"
                  className="button secondary full"
                  onClick={() => setKeyModalOpen(true)}
                >
                  <KeyRound size={16} />
                  {savedKey ? "Manage Gemini API Key" : "Set Gemini API Key"}
                </button>
              </div>
              <GeminiKeyModal
                isOpen={keyModalOpen}
                onClose={() => {
                  setSavedKey(getGeminiApiKey());
                  setKeyModalOpen(false);
                }}
                onIntegrated={() => {
                  setSavedKey(getGeminiApiKey());
                  setKeyModalOpen(false);
                  void enterStandalone();
                }}
              />
            </div>
          ) : setupMissing ? (
            <div className="setup-panel">
              <h3>Workspace not connected</h3>
              <p>
                Account access will be available when your institution connects
                PsySim. This preview does not collect credentials.
              </p>
            </div>
          ) : (
            <form onSubmit={submit}>
              {signup && (
                <label>
                  Full name
                  <input
                    name="name"
                    autoComplete="name"
                    required
                    maxLength={100}
                  />
                </label>
              )}
              <label>
                Email address
                <input
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                />
              </label>
              <label>
                Password
                <input
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete={signup ? "new-password" : "current-password"}
                  minLength={signup ? 8 : 1}
                  required
                />
              </label>
              {signup && (
                <label>Confirm password
                  <input name="confirmPassword" type={showPassword ? "text" : "password"}
                    autoComplete="new-password" minLength={8} required />
                </label>
              )}
              <button type="button" className="text-button" aria-pressed={showPassword}
                onClick={() => setShowPassword(v => !v)}>
                {showPassword ? "Hide passwords" : "Show passwords"}
              </button>
              {(error || profileError) && (
                <ErrorNotice
                  message={error || profileError}
                  retry={profileError ? refresh : undefined}
                />
              )}
              {notice && (
                <p className="notice" role="status">
                  {notice}
                </p>
              )}
              <button className="button primary full" disabled={busy}>
                {busy ? "Please wait…" : signup ? "Create account" : "Sign in"}
                <ArrowRight size={17} />
              </button>
              <button
                type="button"
                className="text-button"
                onClick={() => {
                  setSignup(!signup);
                  setError("");
                  setNotice("");
                }}
              >
                {signup
                  ? "Already have an account? Sign in"
                  : "New to PsySim? Create an account"}
              </button>
            </form>
          )}
          <p className="fine-print">
            For educational simulation. Use fictional patient information only.
          </p>
        </div>
      </div>
    </div>
  );
}
