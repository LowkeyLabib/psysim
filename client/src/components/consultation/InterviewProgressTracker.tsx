import React from 'react';
import { InterviewObjectiveItem } from '../../types/api.js';
import { CheckCircle2, Circle, Lock, Unlock, Clock, FileCheck } from 'lucide-react';

interface InterviewProgressTrackerProps {
  objectives: InterviewObjectiveItem[];
  canSubmitDiagnosis: boolean;
  onOpenDiagnosisModal: () => void;
  elapsedSeconds: number;
}

export const InterviewProgressTracker: React.FC<InterviewProgressTrackerProps> = ({
  objectives,
  canSubmitDiagnosis,
  onOpenDiagnosisModal,
  elapsedSeconds,
}) => {
  const mandatoryObjs = objectives.filter((o) => o.isMandatory);
  const completedMandatory = mandatoryObjs.filter((o) => o.status === 'COMPLETED').length;
  const progressPct =
    mandatoryObjs.length > 0 ? Math.round((completedMandatory / mandatoryObjs.length) * 100) : 0;

  const formatTimer = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-5">
      {/* Timer & Completion Status */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div>
          <h3 className="font-bold text-sm text-slate-900">Clinical Assessment</h3>
          <span className="text-xs text-slate-500">Mandatory Objective Tracker</span>
        </div>
        <div className="flex items-center space-x-1.5 px-3 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-mono font-medium">
          <Clock className="w-3.5 h-3.5 text-slate-500" />
          <span>{formatTimer(elapsedSeconds)}</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium text-slate-700">Interview Completion</span>
          <span className="font-bold text-slate-900">{progressPct}%</span>
        </div>
        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${
              canSubmitDiagnosis ? 'bg-emerald-500' : 'bg-psysim-coral'
            }`}
            style={{ width: `${progressPct}%` }}
          ></div>
        </div>
        <span className="text-[11px] text-slate-400 block">
          {completedMandatory} of {mandatoryObjs.length} mandatory clinical goals satisfied
        </span>
      </div>

      {/* Objectives Checklist */}
      <div className="space-y-3">
        <span className="text-xs font-bold text-slate-600 uppercase tracking-wider block">
          Required Assessment Goals
        </span>
        <div className="space-y-2.5 max-h-[290px] overflow-y-auto pr-1">
          {objectives.map((obj) => {
            const isDone = obj.status === 'COMPLETED';
            return (
              <div
                key={obj.id}
                className={`p-3 rounded-lg border text-xs transition-all ${
                  isDone
                    ? 'bg-emerald-50/60 border-emerald-200 text-slate-800'
                    : 'bg-slate-50/60 border-slate-200 text-slate-600'
                }`}
              >
                <div className="flex items-start space-x-2.5">
                  <div className="mt-0.5 flex-shrink-0">
                    {isDone ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Circle className="w-4 h-4 text-slate-400" />
                    )}
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className={`font-semibold ${isDone ? 'text-emerald-900' : 'text-slate-800'}`}>
                        {obj.title}
                      </span>
                      {obj.isMandatory && (
                        <span className="text-[10px] uppercase font-bold text-psysim-coral bg-psysim-coral/10 px-1.5 py-0.2 rounded">
                          Req
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 leading-normal">{obj.description}</p>
                    {isDone && obj.evidenceQuote && (
                      <div className="mt-1.5 text-[10px] text-emerald-700 italic bg-white/80 p-1.5 rounded border border-emerald-100">
                        Evidence: "{obj.evidenceQuote}"
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Diagnosis Submission Gate Button */}
      <div className="pt-2">
        {canSubmitDiagnosis ? (
          <button
            onClick={onOpenDiagnosisModal}
            className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md flex items-center justify-center space-x-2 transition-all transform hover:-translate-y-0.5 animate-pulse"
          >
            <Unlock className="w-4 h-4" />
            <span>Submit Written Diagnosis</span>
          </button>
        ) : (
          <div className="w-full py-3 px-4 rounded-xl bg-slate-100 border border-slate-200 text-slate-400 text-xs font-medium flex items-center justify-center space-x-2 cursor-not-allowed">
            <Lock className="w-4 h-4 text-slate-400" />
            <span>Submission Locked (Incomplete)</span>
          </div>
        )}
        <p className="text-[11px] text-slate-400 text-center mt-2">
          {canSubmitDiagnosis
            ? 'Mandatory objectives satisfied. You may now formulate and submit your diagnosis.'
            : 'Fulfill all mandatory interview goals through dialogue to unlock diagnosis submission.'}
        </p>
      </div>
    </div>
  );
};
