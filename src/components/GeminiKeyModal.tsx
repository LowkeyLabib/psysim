import { useState, useEffect } from 'react';
import { KeyRound, Sparkles, Check, AlertCircle, ExternalLink, Eye, EyeOff, Trash2 } from 'lucide-react';
import { getGeminiApiKey, setGeminiApiKey, clearGeminiApiKey, validateGeminiApiKey } from '../lib/geminiKey';
import { Modal } from './ui';

interface GeminiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GeminiKeyModal({ isOpen, onClose }: GeminiKeyModalProps) {
  const [keyInput, setKeyInput] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [status, setStatus] = useState<{ type: 'idle' | 'success' | 'error'; message?: string }>({ type: 'idle' });

  useEffect(() => {
    if (isOpen) {
      setKeyInput(getGeminiApiKey());
      setStatus({ type: 'idle' });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTestAndSave = async () => {
    const trimmed = keyInput.trim();
    if (!trimmed) {
      clearGeminiApiKey();
      setStatus({ type: 'idle' });
      onClose();
      return;
    }

    setTesting(true);
    setStatus({ type: 'idle' });

    const result = await validateGeminiApiKey(trimmed);
    setTesting(false);

    if (result.valid) {
      setGeminiApiKey(trimmed);
      setStatus({ type: 'success', message: 'API key verified successfully! Live AI patient simulation is now active.' });
      setTimeout(() => {
        onClose();
      }, 1200);
    } else {
      setStatus({ type: 'error', message: result.error || 'API key verification failed.' });
    }
  };

  const handleClear = () => {
    clearGeminiApiKey();
    setKeyInput('');
    setStatus({ type: 'idle' });
  };

  return (
    <Modal title="Google Gemini AI Configuration" close={onClose}>
      <div className="space-y-4 text-sm">
        <div className="flex items-start gap-3 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-slate-700">
          <Sparkles className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-slate-900 text-xs uppercase tracking-wider">
              Real AI Patient Simulation
            </p>
            <p className="text-xs text-slate-600 leading-relaxed">
              Connect your Google Gemini API key to interview real psychiatric patients powered by live AI.
              The AI stays in character, answers in Bengali or English based on clinical ground truth, and tests your interviewing skills.
            </p>
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Gemini API Key
            </label>
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noreferrer"
              className="text-xs text-psysim-coral hover:underline inline-flex items-center gap-1 font-medium"
            >
              <span>Get Free Key (Google AI Studio)</span>
              <ExternalLink size={12} />
            </a>
          </div>

          <div className="relative flex items-center">
            <div className="absolute left-3 text-slate-400">
              <KeyRound size={16} />
            </div>
            <input
              type={showKey ? 'text' : 'password'}
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              placeholder="Paste AIzaSy... key here"
              className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-psysim-coral/40 focus:border-psysim-coral"
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute right-3 text-slate-400 hover:text-slate-600"
              title={showKey ? 'Hide key' : 'Show key'}
            >
              {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <p className="text-[11px] text-slate-400">
            🔒 Stored locally in your browser. Never committed or sent to any third party.
          </p>
        </div>

        {status.type === 'error' && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs">
            <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
            <span>{status.message}</span>
          </div>
        )}

        {status.type === 'success' && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs">
            <Check size={16} className="flex-shrink-0 mt-0.5" />
            <span>{status.message}</span>
          </div>
        )}

        <div className="flex items-center justify-between pt-3 border-t border-slate-200">
          {getGeminiApiKey() ? (
            <button
              type="button"
              onClick={handleClear}
              className="text-xs text-red-600 hover:text-red-700 flex items-center gap-1.5 font-medium"
            >
              <Trash2 size={14} />
              <span>Remove Key</span>
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={testing}
              className="px-3 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleTestAndSave}
              disabled={testing || !keyInput.trim()}
              className="px-4 py-2 rounded-lg bg-psysim-navy hover:bg-psysim-navy-light text-white text-xs font-bold shadow transition-all disabled:opacity-50"
            >
              {testing ? 'Verifying Key…' : 'Save & Activate AI'}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
