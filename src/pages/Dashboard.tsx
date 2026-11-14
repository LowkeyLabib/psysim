import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import {
  ArrowRight,
  ArrowUpRight,
  MessageCircle,
  Layers3,
  Sparkles,
} from "lucide-react";
import type { SessionPage, SessionSummary } from "../../shared/contracts";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { errorMessage, label } from "../lib/session";
import {
  ErrorNotice,
  Loading,
  NewSessionLink,
  PageTitle,
} from "../components/ui";
export function SessionList({ sessions }: { sessions: SessionSummary[] }) {
  return sessions.length ? (
    <div className="session-list">
      {sessions.map((s) => (
        <Link
          className="session-row"
          key={s.id}
          to={
            s.state === "EVALUATED"
              ? `/sessions/${s.id}/results`
              : `/sessions/${s.id}`
          }
        >
          <span className="patient-avatar">
            {s.patientName
              .split(" ")
              .map((n) => n[0])
              .slice(0, 2)
              .join("")}
          </span>
          <div className="session-name">
            <strong>{s.patientName}</strong>
            <span>
              {s.mode === "challenge" ? "Clinical Challenge" : "Custom Case"} ·{" "}
              {label(s.difficulty)}
            </span>
          </div>
          <time>
            {new Date(s.createdAt).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
            })}
          </time>
          <span className="badge">{label(s.outcome || s.state)}</span>
          <ArrowUpRight size={18} />
        </Link>
      ))}
    </div>
  ) : (
    <div className="empty-state">
      <MessageCircle size={26} />
      <h3>A new perspective starts here.</h3>
      <p>Your conversations and reflections will appear here.</p>
      <Link className="text-button" to="/new">
        Meet your first patient <ArrowRight size={16} />
      </Link>
    </div>
  );
}
export default function Dashboard({ history = false }: { history?: boolean }) {
  const { user } = useAuth();
  const [data, setData] = useState<SessionPage | null>(null);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  useEffect(() => {
    let active = true;
    setError("");
    api
      .sessions()
      .then((r) => {
        if (active) setData(r);
      })
      .catch((e) => {
        if (active) setError(errorMessage(e));
      });
    return () => {
      active = false;
    };
  }, [revision]);
  if (!data && !error) return <Loading />;
  const stats = data?.stats;
  return (
    <>
      {history ? (
        <PageTitle
          eyebrow="YOUR LEARNING RECORD"
          title="Practice, revisited."
          description="Return to the conversation. Find the lesson."
          action={<NewSessionLink />}
        />
      ) : (
        <div className="workspace-greeting">
          <span>YOUR PRACTICE WORKSPACE</span>
          <span>Welcome, {user?.displayName.split(" ")[0] || "learner"}</span>
        </div>
      )}
      {error && (
        <ErrorNotice message={error} retry={() => setRevision((n) => n + 1)} />
      )}
      {!history && (
        <>
          <motion.section
            className="hero"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className="hero-content">
              <span className="eyebrow">
                <span className="status-dot" /> PSYCHIATRIC INTERVIEW PRACTICE
              </span>
              <h1>
                The art of asking.
                <br />
                The practice of
                <br />
                <em>understanding.</em>
              </h1>
              <p>
                Meet a fictional patient. Listen beyond the symptoms.
                <br className="desktop-break" /> Build clinical confidence, one
                conversation at a time.
              </p>
              <div className="hero-actions">
                <Link className="button primary" to="/new">
                  Start Simulation <ArrowUpRight size={17} />
                </Link>
                <Link className="button secondary" to="/history">
                  View Previous Sessions
                </Link>
              </div>
              <div className="hero-footnote">
                <span>English</span>
                <i />
                <span lang="bn">বাংলা</span>
                <i />
                <span>Banglish</span>
              </div>
            </div>
            <div className="hero-art" aria-hidden="true">
              <span className="art-index">01 — THE LISTENING ROOM</span>
              <svg
                className="conversation-art"
                viewBox="0 0 440 430"
                fill="none"
              >
                <defs>
                  <linearGradient
                    id="sand-fade"
                    x1="30"
                    y1="0"
                    x2="400"
                    y2="430"
                    gradientUnits="userSpaceOnUse"
                  >
                    <stop stopColor="#D8CBB3" stopOpacity=".6" />
                    <stop offset="1" stopColor="#D8CBB3" stopOpacity=".05" />
                  </linearGradient>
                </defs>
                <circle cx="220" cy="215" r="178" stroke="url(#sand-fade)" />
                <circle cx="220" cy="215" r="143" stroke="url(#sand-fade)" />
                <circle cx="220" cy="215" r="108" stroke="url(#sand-fade)" />
                <path
                  d="M44 393c0-62 40-78 83-94l8-45c-26-9-39-35-39-67 0-48 27-77 64-77 40 0 54 28 53 58l19 38-23 8-3 27c-2 14-13 19-31 19v34c35 18 48 44 48 99"
                  fill="#D8CBB3"
                  fillOpacity=".07"
                  stroke="#D8CBB3"
                  strokeOpacity=".6"
                />
                <path
                  d="M398 393c0-62-40-78-83-94l-8-45c26-9 39-35 39-67 0-48-27-77-64-77-24 0-42 13-49 31"
                  stroke="#D8CBB3"
                  strokeOpacity=".3"
                />
                <path
                  d="M270 260v34c-25 13-38 30-44 56"
                  stroke="#D8CBB3"
                  strokeOpacity=".3"
                />
                <circle cx="348" cy="91" r="7" fill="#2F6BFF" />
                <path
                  d="M240 68h42M261 47v42"
                  stroke="#D8CBB3"
                  strokeOpacity=".5"
                />
              </svg>
              <div className="art-caption">
                <span>BEGIN WITH CURIOSITY.</span>
                <p>
                  Every patient
                  <br />
                  has a <em>story.</em>
                </p>
                <div className="art-rule" />
              </div>
            </div>
          </motion.section>
          <div className="stats-grid">
            <Stat
              label="Practice sessions"
              value={String(stats?.total || 0)}
              note="Conversations started"
            />
            <Stat
              label="Completed interviews"
              value={String(stats?.completed || 0)}
              note="From history to reflection"
            />
            <Stat
              label="Diagnostic accuracy"
              value={
                stats?.graded
                  ? `${Math.round((stats.correct / stats.graded) * 100)}%`
                  : "—"
              }
              note={
                stats?.graded
                  ? `${stats.correct} of ${stats.graded} graded cases`
                  : "Available after your first graded case"
              }
            />
            <div className="stat-editorial">
              <span>THE APPROACH</span>
              <p>
                Listen closely.
                <br />
                <em>Think clearly.</em>
              </p>
            </div>
          </div>
          <div className="section-heading">
            <div>
              <span className="eyebrow">TWO WAYS TO PRACTICE</span>
              <h2>Choose your next conversation.</h2>
            </div>
            <span>Same curiosity. Different starting points.</span>
          </div>
          <div className="mode-grid">
            <Link to="/new?mode=challenge" className="mode-card">
              <div className="mode-card-top">
                <Sparkles size={22} />
                <span>01 / DISCOVER</span>
                <ArrowUpRight size={23} />
              </div>
              <h3>Clinical Challenge</h3>
              <p>
                An unfamiliar patient. An open mind. Discover the presentation
                through a thoughtful clinical interview.
              </p>
              <span className="card-link">
                Enter the challenge <ArrowRight size={16} />
              </span>
            </Link>
            <Link to="/new?mode=custom" className="mode-card">
              <div className="mode-card-top">
                <Layers3 size={22} />
                <span>02 / FOCUS</span>
                <ArrowUpRight size={23} />
              </div>
              <h3>Custom Case</h3>
              <p>
                Choose a diagnostic category and your level of guidance. Focus
                your practice while the specific diagnosis stays hidden.
              </p>
              <span className="card-link">
                Shape your session <ArrowRight size={16} />
              </span>
            </Link>
          </div>
        </>
      )}
      <section className="recent-section">
        <div className="section-heading">
          <h2>{history ? "All sessions" : "Recent conversations"}</h2>
          {!history && (
            <Link className="text-button" to="/history">
              View history <ArrowUpRight size={15} />
            </Link>
          )}
        </div>
        <div className="panel">
          <SessionList
            sessions={
              history ? data?.items || [] : data?.items.slice(0, 4) || []
            }
          />
          {history && data?.nextCursor && (
            <button
              className="button secondary load-more"
              disabled={loadingMore}
              onClick={async () => {
                setLoadingMore(true);
                try {
                  const next = await api.sessions(data.nextCursor!);
                  setData({ ...next, items: [...data.items, ...next.items] });
                } catch (e) {
                  setError(errorMessage(e));
                } finally {
                  setLoadingMore(false);
                }
              }}
            >
              {loadingMore ? "Loading…" : "Load more"}
            </button>
          )}
        </div>
      </section>
    </>
  );
}
function Stat({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note: string;
}) {
  return (
    <div className="stat-card">
      <span className="stat-label">{label}</span>
      <strong>{value}</strong>
      <small>{note}</small>
    </div>
  );
}
