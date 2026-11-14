import { Component, lazy, Suspense, useEffect, type ErrorInfo, type ReactNode } from 'react';
import { BrowserRouter, Link, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { MotionConfig } from 'motion/react';
import { AuthProvider, useAuth } from './lib/auth';
import Layout from './components/Layout';
import { ErrorNotice, Loading } from './components/ui';
const Auth = lazy(() => import('./pages/Auth'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const NewSession = lazy(() => import('./pages/NewSession'));
const Consultation = lazy(() => import('./pages/Consultation'));
const Results = lazy(() => import('./pages/Results'));
const Supervisor = lazy(() => import('./pages/Supervisor'));
const Guide = lazy(() => import('./pages/Guide'));
function Protected() { const { user, loading } = useAuth(); if (loading) return <Loading/>; return user ? <Layout/> : <Navigate to="/auth" replace/>; }
function NavigationFocus() { const location = useLocation(); useEffect(() => { window.scrollTo(0, 0); document.getElementById('main')?.focus(); }, [location.pathname]); return null; }
class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(_error: Error, _info: ErrorInfo) { /* Do not log clinical data or tokens. */ }
  render() { return this.state.failed ? <div className="fatal-error"><h1>Something interrupted your workspace.</h1><ErrorNotice message="Reload to reconnect. Your server-saved sessions are preserved."/><button className="button primary" onClick={() => window.location.reload()}>Reload PsySim</button></div> : this.props.children; }
}
const basename = typeof window !== 'undefined' && window.location.pathname.startsWith('/psysim') ? '/psysim' : undefined;

export default function App() { return <ErrorBoundary><MotionConfig reducedMotion="user"><BrowserRouter basename={basename}><AuthProvider><NavigationFocus/><Suspense fallback={<Loading/>}><Routes><Route path="/auth" element={<Auth/>}/><Route element={<Protected/>}><Route index element={<Dashboard/>}/><Route path="new" element={<NewSession/>}/><Route path="history" element={<Dashboard history/>}/><Route path="sessions/:id" element={<Consultation/>}/><Route path="sessions/:id/results" element={<Results/>}/><Route path="supervisor" element={<Supervisor/>}/><Route path="guide" element={<Guide/>}/><Route path="*" element={<div className="empty-state"><h1>Page not found</h1><Link to="/">Return to your workspace</Link></div>}/></Route></Routes></Suspense></AuthProvider></BrowserRouter></MotionConfig></ErrorBoundary>; }
