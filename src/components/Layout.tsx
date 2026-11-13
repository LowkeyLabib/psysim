import { useState } from 'react';
import { NavLink, Outlet, Link, useNavigate } from 'react-router-dom';
import { ArrowUpRight, BookOpen, FlaskConical, History, LayoutDashboard, LogOut, ShieldCheck, Sparkles, X, Menu } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { demoMode } from '../lib/config';
import { errorMessage } from '../lib/session';
import { ErrorNotice } from './ui';
export function Logo() { return <Link className="logo" to="/"><span className="logo-mark">ψ</span><span>PsySim<span className="logo-dot">.</span></span></Link>; }
export default function Layout() {
  const { user, signOut } = useAuth(); const navigate = useNavigate(); const [open, setOpen] = useState(false); const [error, setError] = useState('');
  return <div className="app-shell"><a className="skip-link" href="#main">Skip to content</a>
    <aside className={`sidebar ${open ? 'open' : ''}`}><div className="sidebar-brand"><Logo/><button className="mobile-only icon-button" aria-label="Close navigation" onClick={() => setOpen(false)}><X/></button></div><div className="workspace-label">LEARNING WORKSPACE</div>
      <nav aria-label="Main navigation" onClick={() => setOpen(false)}><NavLink to="/" end><LayoutDashboard size={19}/>Overview</NavLink><NavLink to="/new"><Sparkles size={19}/>Practice room<span className="nav-dot"/></NavLink><NavLink to="/history"><History size={19}/>Practice history</NavLink><NavLink to="/guide"><BookOpen size={19}/>Interview guide</NavLink>{(demoMode || user?.role !== 'student') && <NavLink to="/supervisor"><ShieldCheck size={19}/>{demoMode ? 'Supervisor preview' : 'Supervisor'}</NavLink>}</nav>
      <div className="sidebar-bottom"><div className="practice-note"><span className="tiny-label">A SPACE TO GROW</span><p>Better conversations.<br/>Better clinical thinking.</p><span>One patient at a time.</span></div><div className="user-profile"><span className="avatar">{user?.displayName.slice(0, 1) || 'L'}</span><div><strong>{user?.displayName}</strong><small>{demoMode ? 'Development workspace' : 'Clinical learner'}</small></div>{!demoMode && <button className="icon-button" aria-label="Sign out" onClick={async () => { try { await signOut(); navigate('/auth'); } catch (e) { setError(errorMessage(e)); } }}><LogOut size={18}/></button>}</div></div>
    </aside><div className="main-shell"><div className="topbar"><div className="topbar-context"><button className="mobile-only icon-button" aria-label="Open navigation" onClick={() => setOpen(true)}><Menu/></button><span>Clinical learning</span><span className="slash">/</span><strong>Your practice, with purpose</strong></div><Link to="/guide" className="topbar-link">How it works <ArrowUpRight size={15}/></Link></div>
      {demoMode && <div className="demo-banner"><FlaskConical size={15}/><span><strong>Development demo</strong> · Scripted responses, local data, no AI or clinical scoring.</span></div>}
      <main id="main" tabIndex={-1}>{error && <ErrorNotice message={error}/>}<Outlet/></main><footer><span>PsySim · Thoughtful practice. Confident conversations.</span><span>For education · Synthetic patients only</span></footer>
    </div></div>;
}
