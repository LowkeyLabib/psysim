import React, { useEffect, useState } from 'react';
import { api } from '../services/api.js';
import { EvaluationResult } from '../types/api.js';
import { Card } from '../components/common/Card.js';
import { Badge } from '../components/common/Badge.js';
import {
  CheckCircle2,
  AlertCircle,
  XCircle,
  HelpCircle,
  Award,
  BookOpen,
  ArrowRight,
  RotateCcw,
  Stethoscope,
  ChevronRight,
} from 'lucide-react';

interface ResultsPageProps {
  sessionId: string;
  onNewSimulation: () => void;
  onReturnDashboard: () => void;
}

export const ResultsPage: React.FC<ResultsPageProps> = ({
  sessionId,
  onNewSimulation,
  onReturnDashboard,
}) => {
  const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getResults(sessionId)
      .then((data) => setEvaluation(data))
      .catch((err) => console.error('Failed to load evaluation:', err))
      .finally(() => setLoading(false));
  }, [sessionId]);

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center text-slate-500 text-sm">
        Compiling clinical evaluation and educational rubric...
      </div>
    );
  }

  if (!evaluation) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center space-y-4">
        <h2 className="text-lg font-bold text-slate-800">Evaluation Not Found</h2>
        <p className="text-xs text-slate-500">Could not retrieve results for this session.</p>
        <button
          onClick={onReturnDashboard}
          className="px-4 py-2 rounded-xl bg-psysim-navy text-white text-xs font-semibold"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  const outcomeConfig = {
    CORRECT: {
      title: 'Diagnostic Formulation Correct',
      badge: 'Success',
      badgeVariant: 'success' as const,
      icon: CheckCircle2,
      border: 'border-emerald-300',
      bg: 'bg-emerald-500/10',
      text: 'text-emerald-800',
    },
    PARTIALLY_CORRECT: {
      title: 'Partially Correct Diagnosis',
      badge: 'Partial Match',
      badgeVariant: 'warning' as const,
      icon: AlertCircle,
      border: 'border-amber-300',
      bg: 'bg-amber-500/10',
      text: 'text-amber-800',
    },
    INCORRECT: {
      title: 'Diagnostic Formulation Incorrect',
      badge: 'Needs Review',
      badgeVariant: 'error' as const,
      icon: XCircle,
      border: 'border-rose-300',
      bg: 'bg-rose-500/10',
      text: 'text-rose-800',
    },
    REVIEW_REQUIRED: {
      title: 'Clinical Review Required',
      badge: 'Supervisor Review',
      badgeVariant: 'info' as const,
      icon: HelpCircle,
      border: 'border-sky-300',
      bg: 'bg-sky-500/10',
      text: 'text-sky-800',
    },
  }[evaluation.outcome];

  const OutcomeIcon = outcomeConfig.icon;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      {/* Outcome Banner */}
      <div
        className={`rounded-2xl border ${outcomeConfig.border} ${outcomeConfig.bg} p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4`}
      >
        <div className="flex items-start space-x-4">
          <div className="p-2.5 rounded-xl bg-white shadow-sm flex-shrink-0">
            <OutcomeIcon className={`w-8 h-8 ${outcomeConfig.text}`} />
          </div>
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
                {outcomeConfig.title}
              </h1>
              <Badge variant={outcomeConfig.badgeVariant}>{outcomeConfig.badge}</Badge>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              {evaluation.outcome_explanation}
            </p>
          </div>
        </div>

        <div className="text-right sm:border-l sm:border-slate-200/80 sm:pl-6 flex-shrink-0">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Overall Interview Score
          </span>
          <div className="text-3xl font-extrabold text-psysim-navy">
            {evaluation.educational_rubric.overallScore}
            <span className="text-sm font-normal text-slate-400">/100</span>
          </div>
        </div>
      </div>

      {/* Diagnosis Comparison Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Approved Ground Truth */}
        <Card className="border-l-4 border-l-emerald-500 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
              Approved Ground-Truth Diagnosis
            </span>
            <Badge variant="success">Clinician Approved</Badge>
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">{evaluation.actual_diagnosis.name}</h2>
            <div className="flex items-center space-x-2 mt-1 text-xs text-slate-500">
              <span>ICD-11: {evaluation.actual_diagnosis.icd11Code}</span>
              <span>•</span>
              <span>DSM-5: {evaluation.actual_diagnosis.dsm5Code}</span>
            </div>
          </div>
          <span className="text-xs text-slate-600 block">
            Category: {evaluation.actual_diagnosis.category}
          </span>
        </Card>

        {/* Submitted Diagnosis */}
        <Card className="border-l-4 border-l-psysim-navy space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
              Your Submitted Formulation
            </span>
            <Badge variant="neutral">Student Impression</Badge>
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">{evaluation.submitted_diagnosis}</h2>
            {evaluation.clinical_reasoning ? (
              <p className="text-xs text-slate-600 mt-1 italic">
                "{evaluation.clinical_reasoning}"
              </p>
            ) : (
              <p className="text-xs text-slate-400 mt-1">No clinical rationale provided.</p>
            )}
          </div>
        </Card>
      </div>

      {/* Clinical Findings Review */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="space-y-3">
          <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Key Positive Findings (Supporting)</span>
          </h3>
          <ul className="space-y-2">
            {evaluation.key_positive_findings.map((f, i) => (
              <li key={i} className="text-xs text-slate-700 flex items-start space-x-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0"></span>
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="space-y-3">
          <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-1.5">
            <AlertCircle className="w-4 h-4 text-sky-600" />
            <span>Relevant Negative Findings (Differentials Excluded)</span>
          </h3>
          <ul className="space-y-2">
            {evaluation.relevant_negative_findings.map((f, i) => (
              <li key={i} className="text-xs text-slate-700 flex items-start space-x-2">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-500 mt-1.5 flex-shrink-0"></span>
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {/* Educational Rubric Breakdown */}
      <Card className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
            <Award className="w-5 h-5 text-psysim-coral" />
            <span>Educational Clinical Rubric</span>
          </h3>
          <span className="text-xs text-slate-400">Standardized Competency Evaluation</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {evaluation.educational_rubric.domains.map((dom, idx) => (
            <div key={idx} className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/50 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-xs text-slate-900">{dom.name}</span>
                <span className="px-2 py-0.5 rounded text-xs font-bold bg-white text-psysim-navy border border-slate-200">
                  {dom.score}/{dom.maxScore}
                </span>
              </div>
              <p className="text-[11px] text-slate-600 leading-normal">{dom.feedback}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Key Clinical Learning Points */}
      <Card className="space-y-3 bg-psysim-cream-light/60 border-amber-200">
        <h3 className="text-sm font-bold text-psysim-navy flex items-center space-x-2">
          <BookOpen className="w-4 h-4 text-psysim-coral" />
          <span>Clinical Learning Points & Differential Takeaways</span>
        </h3>
        <ul className="space-y-2">
          {evaluation.learning_points.map((pt, idx) => (
            <li key={idx} className="text-xs text-slate-700 flex items-start space-x-2">
              <ChevronRight className="w-4 h-4 text-psysim-coral flex-shrink-0 mt-0.5" />
              <span>{pt}</span>
            </li>
          ))}
        </ul>
      </Card>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-200">
        <button
          onClick={onReturnDashboard}
          className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
        >
          Return to Dashboard
        </button>

        <button
          onClick={onNewSimulation}
          className="px-6 py-2.5 rounded-xl bg-psysim-coral hover:bg-psysim-coral-hover text-white text-xs font-bold shadow flex items-center space-x-2 transition-all"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Launch Another Simulation</span>
        </button>
      </div>
    </div>
  );
};
