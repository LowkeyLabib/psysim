import React, { useState, useEffect } from 'react';
import { api } from '../services/api.js';
import { ApplicationMode, DifficultyLevel, ScenarioCategory } from '../types/api.js';
import { Card } from '../components/common/Card.js';
import { Badge } from '../components/common/Badge.js';
import {
  Sparkles,
  Sliders,
  Check,
  Brain,
  ShieldAlert,
  GraduationCap,
  ArrowRight,
  ChevronLeft,
} from 'lucide-react';

interface ModeSelectionPageProps {
  onSessionCreated: (sessionId: string) => void;
  onCancel: () => void;
}

export const ModeSelectionPage: React.FC<ModeSelectionPageProps> = ({
  onSessionCreated,
  onCancel,
}) => {
  const [mode, setMode] = useState<ApplicationMode>('CLINICAL_CHALLENGE');
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('BEGINNER');
  const [categories, setCategories] = useState<ScenarioCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.getCategories().then((res) => {
      setCategories(res.categories || []);
      if (res.categories && res.categories.length > 0) {
        setSelectedCategory(res.categories[0].id);
      }
    });
  }, []);

  const handleStart = async () => {
    setLoading(true);
    try {
      const res = await api.createSession({
        mode,
        difficulty,
        categoryId: mode === 'CUSTOM_CASE' ? selectedCategory : null,
      });
      onSessionCreated(res.session.id);
    } catch (err: any) {
      alert(err.message || 'Failed to initialize clinical simulation.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* Back button */}
      <button
        onClick={onCancel}
        className="inline-flex items-center space-x-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
        <span>Return to Dashboard</span>
      </button>

      <div>
        <h1 className="text-2xl font-bold text-psysim-navy">Configure Clinical Consultation</h1>
        <p className="text-sm text-slate-500 mt-1">
          Select simulation mode, patient difficulty level, and optional diagnostic domain.
        </p>
      </div>

      {/* Step 1: Application Mode */}
      <div className="space-y-3">
        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
          Step 1: Choose Simulation Mode
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card
            onClick={() => setMode('CLINICAL_CHALLENGE')}
            hoverable
            className={`border-2 transition-all ${
              mode === 'CLINICAL_CHALLENGE'
                ? 'border-psysim-coral bg-psysim-coral-light/20 shadow-md'
                : 'border-slate-200'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-psysim-coral/10 text-psysim-coral flex items-center justify-center font-bold">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Mode A: Clinical Challenge</h3>
                  <Badge variant="coral">Recommended</Badge>
                </div>
              </div>
              {mode === 'CLINICAL_CHALLENGE' && (
                <div className="w-6 h-6 rounded-full bg-psysim-coral text-white flex items-center justify-center">
                  <Check className="w-4 h-4" />
                </div>
              )}
            </div>
            <p className="mt-3 text-xs text-slate-600 leading-relaxed">
              Randomized psychiatric presentation from any approved ICD-11 / DSM-5 category. The
              diagnosis remains strictly hidden until your interview and submission are complete.
            </p>
          </Card>

          <Card
            onClick={() => setMode('CUSTOM_CASE')}
            hoverable
            className={`border-2 transition-all ${
              mode === 'CUSTOM_CASE'
                ? 'border-psysim-coral bg-psysim-coral-light/20 shadow-md'
                : 'border-slate-200'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center font-bold">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Mode B: Custom Case</h3>
                  <Badge variant="info">Targeted Study</Badge>
                </div>
              </div>
              {mode === 'CUSTOM_CASE' && (
                <div className="w-6 h-6 rounded-full bg-psysim-coral text-white flex items-center justify-center">
                  <Check className="w-4 h-4" />
                </div>
              )}
            </div>
            <p className="mt-3 text-xs text-slate-600 leading-relaxed">
              Target a specific psychiatric diagnostic category (e.g. Bipolar, Anxiety, Psychosis)
              to practice differential diagnosis within that specific presentation cluster.
            </p>
          </Card>
        </div>
      </div>

      {/* Step 2: Difficulty Level */}
      <div className="space-y-3">
        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
          Step 2: Difficulty Level
        </label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            {
              id: 'BEGINNER',
              title: 'Beginner',
              badge: 'Direct & Cooperative',
              icon: GraduationCap,
              desc: 'Clear typical symptoms, open history-telling, straightforward clinical chronology.',
            },
            {
              id: 'INTERMEDIATE',
              title: 'Intermediate',
              badge: 'Realistic & Hesitant',
              icon: Brain,
              desc: 'Subtle overlapping symptoms, hesitant patient disclosure, requires systematic history taking.',
            },
            {
              id: 'ADVANCED',
              title: 'Advanced',
              badge: 'Complex & Guarded',
              icon: ShieldAlert,
              desc: 'Guarded or suspicious patient, overlapping psychiatric differentials, relevant negative findings.',
            },
          ].map((lvl) => {
            const Icon = lvl.icon;
            const isSelected = difficulty === lvl.id;
            return (
              <Card
                key={lvl.id}
                onClick={() => setDifficulty(lvl.id as DifficultyLevel)}
                hoverable
                className={`border-2 p-4 transition-all ${
                  isSelected
                    ? 'border-psysim-navy bg-slate-50 shadow-sm'
                    : 'border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-sm text-slate-900">{lvl.title}</span>
                  <Icon className={`w-4 h-4 ${isSelected ? 'text-psysim-coral' : 'text-slate-400'}`} />
                </div>
                <Badge variant={isSelected ? 'neutral' : 'neutral'} className="mb-2">
                  {lvl.badge}
                </Badge>
                <p className="text-xs text-slate-500 leading-relaxed">{lvl.desc}</p>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Step 3: Category Selection (If Custom Case) */}
      {mode === 'CUSTOM_CASE' && (
        <div className="space-y-3 p-4 bg-white rounded-xl border border-slate-200">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
            Step 3: Select Diagnostic Category
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`p-3 text-left rounded-lg border text-xs font-medium transition-all flex items-center justify-between ${
                  selectedCategory === cat.id
                    ? 'border-psysim-coral bg-psysim-coral-light/30 text-psysim-navy font-semibold'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <span>{cat.name}</span>
                {selectedCategory === cat.id && <Check className="w-4 h-4 text-psysim-coral" />}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Action Button */}
      <div className="pt-4 flex justify-end">
        <button
          onClick={handleStart}
          disabled={loading}
          className="px-6 py-3 rounded-xl bg-psysim-navy hover:bg-psysim-navy-light text-white text-sm font-semibold shadow-lg flex items-center space-x-2 transition-all disabled:opacity-50"
        >
          <span>{loading ? 'Initializing Patient...' : 'Launch Consultation Session'}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
