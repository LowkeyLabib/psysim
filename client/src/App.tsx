import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.js';
import { Header } from './components/common/Header.js';
import { AuthPage } from './pages/AuthPage.js';
import { DashboardPage } from './pages/DashboardPage.js';
import { ModeSelectionPage } from './pages/ModeSelectionPage.js';
import { ConsultationPage } from './pages/ConsultationPage.js';
import { ResultsPage } from './pages/ResultsPage.js';
import { SupervisorPage } from './pages/SupervisorPage.js';

type ViewMode = 'auth' | 'dashboard' | 'mode-selection' | 'consultation' | 'results' | 'supervisor';

const MainLayout: React.FC = () => {
  const { user } = useAuth();
  const [currentView, setCurrentView] = useState<ViewMode>(() => {
    return user ? 'dashboard' : 'auth';
  });
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [evaluatedSessionId, setEvaluatedSessionId] = useState<string | null>(null);

  const handleStartSimulation = () => {
    setCurrentView('mode-selection');
  };

  const handleSessionCreated = (sessionId: string) => {
    setActiveSessionId(sessionId);
    setCurrentView('consultation');
  };

  const handleResumeSession = (sessionId: string) => {
    setActiveSessionId(sessionId);
    setCurrentView('consultation');
  };

  const handleFinishEvaluation = (sessionId: string) => {
    setEvaluatedSessionId(sessionId);
    setCurrentView('results');
  };

  const handleViewResults = (sessionId: string) => {
    setEvaluatedSessionId(sessionId);
    setCurrentView('results');
  };

  return (
    <div className="min-h-screen flex flex-col bg-psysim-cream-light font-sans text-slate-800">
      <Header currentView={currentView} onNavigate={(view) => setCurrentView(view as ViewMode)} />

      <main className="flex-1">
        {currentView === 'auth' && (
          <AuthPage onSuccess={() => setCurrentView('dashboard')} />
        )}

        {currentView === 'dashboard' && (
          <DashboardPage
            onStartSimulation={handleStartSimulation}
            onViewResults={handleViewResults}
            onResumeSession={handleResumeSession}
          />
        )}

        {currentView === 'mode-selection' && (
          <ModeSelectionPage
            onSessionCreated={handleSessionCreated}
            onCancel={() => setCurrentView('dashboard')}
          />
        )}

        {currentView === 'consultation' && activeSessionId && (
          <ConsultationPage
            sessionId={activeSessionId}
            onFinishEvaluation={handleFinishEvaluation}
            onReturnDashboard={() => setCurrentView('dashboard')}
          />
        )}

        {currentView === 'results' && evaluatedSessionId && (
          <ResultsPage
            sessionId={evaluatedSessionId}
            onNewSimulation={handleStartSimulation}
            onReturnDashboard={() => setCurrentView('dashboard')}
          />
        )}

        {currentView === 'supervisor' && <SupervisorPage />}
      </main>

      <footer className="bg-white border-t border-slate-200 py-4 px-4 text-center text-xs text-slate-400">
        PsySim MVP • Clinical Psychiatric Simulator • WHO ICD-11 & DSM-5 Standards • Text-Only Training
      </footer>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainLayout />
    </AuthProvider>
  );
}
