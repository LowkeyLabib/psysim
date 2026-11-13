import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { Stethoscope, UserCheck, ShieldCheck, ArrowRight } from 'lucide-react';

interface AuthPageProps {
  onSuccess: () => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({ onSuccess }) => {
  const { setUserProfile } = useAuth();
  const [email, setEmail] = useState('student@psysim.edu');
  const [name, setName] = useState('Dr. Sarah Khan (Resident)');
  const [isRegister, setIsRegister] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setUserProfile(name, 'student');
    onSuccess();
  };

  const handleQuickDemo = (role: 'student' | 'supervisor') => {
    if (role === 'supervisor') {
      setUserProfile('Prof. M. Rahman (Supervising Psychiatrist)', 'supervisor');
    } else {
      setUserProfile('Dr. Sarah Khan (Psychiatry Trainee)', 'student');
    }
    onSuccess();
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-200 p-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-psysim-coral text-white shadow-lg mb-3">
            <Stethoscope className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-psysim-navy">Welcome to PsySim</h1>
          <p className="text-sm text-slate-500 mt-1">
            Psychiatric Patient Simulation & Diagnostic Training
          </p>
        </div>

        {/* Quick Demo Access Bar */}
        <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 mb-6">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2.5">
            Instant Demo Access
          </span>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => handleQuickDemo('student')}
              className="flex items-center justify-center space-x-2 py-2 px-3 rounded-lg text-xs font-medium bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 shadow-sm transition-all"
            >
              <UserCheck className="w-4 h-4 text-emerald-600" />
              <span>Enter as Student</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickDemo('supervisor')}
              className="flex items-center justify-center space-x-2 py-2 px-3 rounded-lg text-xs font-medium bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 shadow-sm transition-all"
            >
              <ShieldCheck className="w-4 h-4 text-psysim-coral" />
              <span>Enter as Supervisor</span>
            </button>
          </div>
        </div>

        <div className="relative flex py-2 items-center mb-6">
          <div className="flex-grow border-t border-slate-200"></div>
          <span className="flex-shrink mx-4 text-xs font-medium text-slate-400">or sign in with email</span>
          <div className="flex-grow border-t border-slate-200"></div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Full Name & Title</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-psysim-coral/50 focus:border-psysim-coral transition-colors"
              placeholder="e.g. Dr. Sarah Khan"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Institutional Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-psysim-coral/50 focus:border-psysim-coral transition-colors"
              placeholder="trainee@medical.edu"
            />
          </div>

          <button
            type="submit"
            className="w-full mt-2 py-2.5 px-4 rounded-xl bg-psysim-navy hover:bg-psysim-navy-light text-white text-sm font-semibold shadow flex items-center justify-center space-x-2 transition-all"
          >
            <span>{isRegister ? 'Create Account' : 'Sign In to Portal'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-slate-400">
          Complies with WHO ICD-11 & DSM-5 educational standards. Text-only simulation MVP.
        </p>
      </div>
    </div>
  );
};
