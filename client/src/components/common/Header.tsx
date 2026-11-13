import React from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { Stethoscope, User, ShieldCheck, Activity, BookOpen } from 'lucide-react';

interface HeaderProps {
  currentView: string;
  onNavigate: (view: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ currentView, onNavigate }) => {
  const { user, role, switchRole } = useAuth();

  return (
    <header className="bg-psysim-navy text-white shadow-md sticky top-0 z-40 border-b border-psysim-navy-light">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Platform Name */}
          <div
            className="flex items-center space-x-3 cursor-pointer group"
            onClick={() => onNavigate('dashboard')}
          >
            <div className="w-10 h-10 rounded-lg bg-psysim-coral flex items-center justify-center text-white shadow group-hover:scale-105 transition-transform">
              <Stethoscope className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="font-bold text-xl tracking-tight text-white">PsySim</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-psysim-coral/20 text-psysim-coral border border-psysim-coral/40">
                  Clinical MVP
                </span>
              </div>
              <p className="text-xs text-slate-300 font-normal">Psychiatric Patient Simulator</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1">
            <button
              onClick={() => onNavigate('dashboard')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                currentView === 'dashboard'
                  ? 'bg-psysim-navy-light text-white'
                  : 'text-slate-300 hover:text-white hover:bg-psysim-navy-light/60'
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => onNavigate('mode-selection')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                currentView === 'mode-selection'
                  ? 'bg-psysim-navy-light text-white'
                  : 'text-slate-300 hover:text-white hover:bg-psysim-navy-light/60'
              }`}
            >
              <span className="flex items-center space-x-1.5">
                <Activity className="w-4 h-4 text-psysim-coral" />
                <span>New Simulation</span>
              </span>
            </button>
            <button
              onClick={() => onNavigate('supervisor')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                currentView === 'supervisor'
                  ? 'bg-psysim-navy-light text-white'
                  : 'text-slate-300 hover:text-white hover:bg-psysim-navy-light/60'
              }`}
            >
              <span className="flex items-center space-x-1.5">
                <ShieldCheck className="w-4 h-4 text-sky-400" />
                <span>Supervisor Portal</span>
              </span>
            </button>
          </nav>

          {/* Persona & Role Switcher */}
          <div className="flex items-center space-x-3">
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-xs font-semibold text-white">{user?.name || 'Trainee'}</span>
              <span className="text-[11px] text-slate-300 capitalize">{role} Account</span>
            </div>

            {/* Quick Role Switcher Pill */}
            <button
              onClick={() => switchRole(role === 'student' ? 'supervisor' : 'student')}
              title="Click to toggle between Student and Supervisor view"
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all shadow-sm"
            >
              {role === 'student' ? (
                <>
                  <User className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Student View</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-3.5 h-3.5 text-psysim-coral" />
                  <span>Supervisor View</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
