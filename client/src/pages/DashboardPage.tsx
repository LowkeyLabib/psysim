import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { api } from '../services/api.js';
import { PastSessionItem } from '../types/api.js';
import { Card } from '../components/common/Card.js';
import { Badge } from '../components/common/Badge.js';
import {
  Activity,
  Award,
  CheckCircle2,
  Clock,
  ArrowRight,
  TrendingUp,
  Brain,
  Sparkles,
} from 'lucide-react';

interface DashboardPageProps {
  onStartSimulation: () => void;
  onViewResults: (sessionId: string) => void;
  onResumeSession: (sessionId: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  onStartSimulation,
  onViewResults,
  onResumeSession,
}) => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<PastSessionItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getMySessions()
      .then((res) => {
        setSessions(res.sessions || []);
      })
      .catch((err) => {
        console.warn('Could not load sessions:', err);
      })
      .finally(() => setLoading(false));
  }, []);

  const completedSessions = sessions.filter((s) => s.status === 'EVALUATED');
  const correctCount = completedSessions.filter((s) => s.outcome === 'CORRECT').length;
  const accuracyRate =
    completedSessions.length > 0 ? Math.round((correctCount / completedSessions.length) * 100) : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-psysim-navy via-psysim-navy-light to-slate-900 rounded-2xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-psysim-coral/20 border border-psysim-coral/40 text-psysim-coral text-xs font-semibold mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Interactive Psychiatric Clinical Assessment</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Welcome back, {user?.name || 'Doctor'}
          </h1>
          <p className="mt-2 text-slate-300 text-sm sm:text-base leading-relaxed">
            Practice psychiatric interviewing with synthetic clinical patients. Elicit core
            symptoms, satisfy mandatory clinical objectives in English or বাংলা, and formulate your
            diagnostic impression.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={onStartSimulation}
              className="px-5 py-2.5 rounded-xl bg-psysim-coral hover:bg-psysim-coral-hover text-white text-sm font-semibold shadow-md flex items-center space-x-2 transition-all transform hover:-translate-y-0.5"
            >
              <Activity className="w-4 h-4" />
              <span>Begin Patient Consultation</span>
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <Card className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Total Consultations
            </span>
            <div className="text-2xl font-bold text-slate-900">{sessions.length}</div>
          </div>
        </Card>

        <Card className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Diagnostic Accuracy
            </span>
            <div className="text-2xl font-bold text-slate-900">
              {completedSessions.length > 0 ? `${accuracyRate}%` : 'N/A'}
            </div>
          </div>
        </Card>

        <Card className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Cases Completed
            </span>
            <div className="text-2xl font-bold text-slate-900">{completedSessions.length}</div>
          </div>
        </Card>
      </div>

      {/* Practice History */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">Clinical Consultation History</h2>
          <span className="text-xs text-slate-500">{sessions.length} recorded sessions</span>
        </div>

        {loading ? (
          <div className="text-center py-12 text-slate-400 text-sm">Loading practice history...</div>
        ) : sessions.length === 0 ? (
          <Card className="text-center py-12">
            <Brain className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <h3 className="text-base font-semibold text-slate-700">No Consultation History Yet</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
              Start your first psychiatric consultation to test your clinical interviewing and
              diagnostic accuracy.
            </p>
            <button
              onClick={onStartSimulation}
              className="px-4 py-2 rounded-lg bg-psysim-navy text-white text-xs font-medium hover:bg-psysim-navy-light transition-colors"
            >
              Start Clinical Challenge
            </button>
          </Card>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="divide-y divide-slate-100">
              {sessions.map((item) => (
                <div
                  key={item.id}
                  className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold text-slate-900 text-sm">
                        {item.patient_name}
                      </span>
                      <span className="text-xs text-slate-500">({item.patient_age} yrs)</span>
                      <Badge variant="neutral">{item.difficulty}</Badge>
                      <Badge variant="info">
                        {item.mode === 'CLINICAL_CHALLENGE' ? 'Challenge' : 'Custom'}
                      </Badge>
                    </div>
                    <div className="text-xs text-slate-500 flex items-center space-x-2">
                      <span>Started: {new Date(item.created_at).toLocaleDateString()}</span>
                      {item.completed_at && (
                        <span>• Evaluated: {new Date(item.completed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    {item.status === 'EVALUATED' && (
                      <Badge
                        variant={
                          item.outcome === 'CORRECT'
                            ? 'success'
                            : item.outcome === 'PARTIALLY_CORRECT'
                            ? 'warning'
                            : 'error'
                        }
                      >
                        {item.outcome === 'CORRECT'
                          ? 'Correct Diagnosis'
                          : item.outcome === 'PARTIALLY_CORRECT'
                          ? 'Partially Correct'
                          : 'Incorrect'}
                      </Badge>
                    )}

                    {item.status === 'EVALUATED' ? (
                      <button
                        onClick={() => onViewResults(item.id)}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium text-psysim-navy bg-slate-100 hover:bg-slate-200 transition-colors flex items-center space-x-1"
                      >
                        <span>View Evaluation</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <button
                        onClick={() => onResumeSession(item.id)}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-psysim-coral hover:bg-psysim-coral-hover transition-colors flex items-center space-x-1"
                      >
                        <span>Resume Interview</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
