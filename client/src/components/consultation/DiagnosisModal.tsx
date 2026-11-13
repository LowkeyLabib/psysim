import React, { useState } from 'react';
import { Stethoscope, AlertTriangle, X } from 'lucide-react';

interface DiagnosisModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (diagnosis: string, reasoning: string) => Promise<void>;
  submitting: boolean;
}

export const DiagnosisModal: React.FC<DiagnosisModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  submitting,
}) => {
  const [diagnosis, setDiagnosis] = useState('');
  const [reasoning, setReasoning] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!diagnosis.trim() || submitting) return;
    await onSubmit(diagnosis.trim(), reasoning.trim());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-psysim-coral text-white flex items-center justify-center shadow">
              <Stethoscope className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-psysim-navy">Submit Diagnostic Impression</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Primary Psychiatric Diagnosis <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
              placeholder="e.g. Major Depressive Disorder or বাইপোলার ১ ডিজঅর্ডার..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-psysim-coral/50 focus:border-psysim-coral font-sans"
            />
            <span className="text-[11px] text-slate-400 block mt-1">
              Supports English terminology, standard acronyms (e.g. MDD, BPAD, GAD, OCD), and Bengali terms.
            </span>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Clinical Rationale & Supporting Evidence (Optional)
            </label>
            <textarea
              rows={3}
              value={reasoning}
              onChange={(e) => setReasoning(e.target.value)}
              placeholder="Cite the key clinical findings, symptom duration, vegetative signs, or risk factors supporting your formulation..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-psysim-coral/50 focus:border-psysim-coral font-sans"
            />
          </div>

          {/* Warning box */}
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start space-x-2.5 text-xs text-amber-800">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <span>
              Submission is permanent and finalized immediately. You will receive an educational rubric
              evaluation and ground-truth comparison.
            </span>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Resume Interview
            </button>
            <button
              type="submit"
              disabled={!diagnosis.trim() || submitting}
              className="px-5 py-2.5 rounded-xl bg-psysim-navy hover:bg-psysim-navy-light text-white text-xs font-bold shadow transition-all disabled:opacity-50"
            >
              {submitting ? 'Evaluating Submission...' : 'Confirm & Submit Diagnosis'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
