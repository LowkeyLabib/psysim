import React, { useState, useEffect } from 'react';
import { api } from '../services/api.js';
import { SessionMetadata, ConsultationMessage, InterviewObjectiveItem } from '../types/api.js';
import { ChatWindow } from '../components/consultation/ChatWindow.js';
import { InterviewProgressTracker } from '../components/consultation/InterviewProgressTracker.js';
import { DiagnosisModal } from '../components/consultation/DiagnosisModal.js';
import { ChevronLeft } from 'lucide-react';

interface ConsultationPageProps {
  sessionId: string;
  onFinishEvaluation: (sessionId: string) => void;
  onReturnDashboard: () => void;
}

export const ConsultationPage: React.FC<ConsultationPageProps> = ({
  sessionId,
  onFinishEvaluation,
  onReturnDashboard,
}) => {
  const [session, setSession] = useState<SessionMetadata | null>(null);
  const [messages, setMessages] = useState<ConsultationMessage[]>([]);
  const [objectives, setObjectives] = useState<InterviewObjectiveItem[]>([]);
  const [canSubmitDiagnosis, setCanSubmitDiagnosis] = useState(false);
  const [loadingReply, setLoadingReply] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submittingDiag, setSubmittingDiag] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Timer interval
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch initial session & progress
  const loadData = async () => {
    try {
      const sess = await api.getSession(sessionId);
      setSession(sess);

      const msgs = await api.getMessages(sessionId);
      setMessages(msgs.messages || []);

      const prog = await api.getProgress(sessionId);
      setObjectives(prog.objectives || []);
      setCanSubmitDiagnosis(prog.can_submit_diagnosis);
    } catch (err: any) {
      console.error('Failed to load consultation session:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, [sessionId]);

  const handleSendMessage = async (text: string) => {
    // Optimistic student message
    const tempStudentMsg: ConsultationMessage = {
      id: `temp_${Date.now()}`,
      sessionId,
      sender: 'student',
      content: text,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempStudentMsg]);
    setLoadingReply(true);

    try {
      const res = await api.sendMessage(sessionId, text);
      setMessages((prev) => [...prev, res.patient_message]);

      // Re-fetch progress to update checklist
      const prog = await api.getProgress(sessionId);
      setObjectives(prog.objectives || []);
      setCanSubmitDiagnosis(prog.can_submit_diagnosis);
    } catch (err: any) {
      alert(err.message || 'Failed to communicate with patient simulator.');
    } finally {
      setLoadingReply(false);
    }
  };

  const handleSubmitDiagnosis = async (diagnosis: string, clinicalReasoning: string) => {
    setSubmittingDiag(true);
    try {
      await api.submitDiagnosis(sessionId, diagnosis, clinicalReasoning);
      setIsModalOpen(false);
      onFinishEvaluation(sessionId);
    } catch (err: any) {
      alert(err.message || 'Failed to submit diagnosis.');
    } finally {
      setSubmittingDiag(false);
    }
  };

  if (!session) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center text-slate-500 text-sm">
        Preparing clinical patient consultation...
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">
      {/* Back button */}
      <div className="flex items-center justify-between">
        <button
          onClick={onReturnDashboard}
          className="inline-flex items-center space-x-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Exit to Dashboard</span>
        </button>
        <span className="text-xs text-slate-500 font-mono">
          Session ID: {session.id.substring(0, 12)}...
        </span>
      </div>

      {/* Main Consultation Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Column: Chat Window (2 cols) */}
        <div className="lg:col-span-2">
          <ChatWindow
            patient={session.patient}
            messages={messages}
            loadingReply={loadingReply}
            onSendMessage={handleSendMessage}
          />
        </div>

        {/* Right Column: Progress Tracker (1 col) */}
        <div className="lg:col-span-1">
          <InterviewProgressTracker
            objectives={objectives}
            canSubmitDiagnosis={canSubmitDiagnosis}
            onOpenDiagnosisModal={() => setIsModalOpen(true)}
            elapsedSeconds={elapsedSeconds}
          />
        </div>
      </div>

      {/* Diagnosis Modal */}
      <DiagnosisModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSubmitDiagnosis}
        submitting={submittingDiag}
      />
    </div>
  );
};
