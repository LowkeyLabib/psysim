import { useState, useEffect, type FormEvent } from 'react';
import {
  KeyRound,
  Sparkles,
  Check,
  AlertCircle,
  ExternalLink,
  Eye,
  EyeOff,
  Trash2,
  LoaderCircle,
  ShieldCheck,
} from 'lucide-react';
import {
  getGeminiApiKey,
  setGeminiApiKey,
  clearGeminiApiKey,
  validateGeminiApiKey,
  getGeminiModel,
  maskGeminiApiKey,
} from '../lib/geminiKey';
import { Modal } from './ui';

interface GeminiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onIntegrated?: () => void;
}

export function GeminiKeyModal({ isOpen, onClose, onIntegrated }: GeminiKeyModalProps) {
  const [keyInput, setKeyInput] = useState('');
  const [savedKey, setSavedKey] = useState('');
  const [activeModel, setActiveModel] = useState(() => getGeminiModel());
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [status, setStatus] = useState<{
    type: 'idle' | 'success' | 'error';
    message?: string;
  }>({ type: 'idle' });

  useEffect(() => {
    if (isOpen) {
      const current = getGeminiApiKey();
      setKeyInput(current);
      setSavedKey(current);
      setActiveModel(getGeminiModel());
      setStatus(
        current
          ? {
              type: 'success',
              message: `Gemini API key (${maskGeminiApiKey(current)}) is integrated and active on model ${getGeminiModel()}.`,
            }
          : { type: 'idle' },
      );
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTestAndSave = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = keyInput.trim();
    if (!trimmed) {
      clearGeminiApiKey();
      setSavedKey('');
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
      setSavedKey(trimmed);
      const modelUsed = result.model || getGeminiModel();
      setActiveModel(modelUsed);
      setStatus({
        type: 'success',
        message: `API Key Integrated! Live Gemini AI (${modelUsed}) is now active for all patient consultations.`,
      });
      onIntegrated?.();
    } else {
      setStatus({
        type: 'error',
        message: result.error || 'API key verification failed. Check your key and try again.',
      });
    }
  };

  const handleForceSave = () => {
    const trimmed = keyInput.trim();
    if (!trimmed) return;
    setGeminiApiKey(trimmed);
    setSavedKey(trimmed);
    const modelUsed = getGeminiModel();
    setActiveModel(modelUsed);
    setStatus({
      type: 'success',
      message: `API Key saved directly (${maskGeminiApiKey(trimmed)}). Live Gemini AI mode is now enabled.`,
    });
    onIntegrated?.();
  };

  const handleClear = () => {
    clearGeminiApiKey();
    setKeyInput('');
    setSavedKey('');
    setStatus({ type: 'idle' });
  };

  return (
    <Modal title="Google Gemini Live AI Integration" close={onClose}>
      <form
        onSubmit={handleTestAndSave}
        style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
            padding: '14px 16px',
            borderRadius: '8px',
            background: savedKey ? 'rgba(16, 185, 129, 0.12)' : 'var(--charcoal)',
            border: savedKey
              ? '1px solid rgba(16, 185, 129, 0.4)'
              : '1px solid var(--line)',
          }}
        >
          {savedKey ? (
            <ShieldCheck
              size={20}
              style={{ color: '#34d399', marginTop: '2px', flexShrink: 0 }}
            />
          ) : (
            <Sparkles
              size={20}
              style={{ color: 'var(--blue)', marginTop: '2px', flexShrink: 0 }}
            />
          )}
          <div style={{ flex: 1 }}>
            <div
              style={{
                fontSize: '11px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.8px',
                color: savedKey ? '#6ee7b7' : 'var(--sand)',
                marginBottom: '4px',
              }}
            >
              {savedKey
                ? `✓ Live Gemini AI Integrated · Model: ${activeModel}`
                : 'Connect Live Patient AI Simulation'}
            </div>
            <p
              style={{
                fontSize: '12px',
                lineHeight: 1.6,
                margin: 0,
                color: savedKey ? '#a7f3d0' : 'var(--muted)',
              }}
            >
              {savedKey
                ? `Active Key: ${maskGeminiApiKey(savedKey)} — Your consultations are powered by live Google Gemini AI with clinical persona memory and objective assessment.`
                : 'Paste your free-tier Google Gemini API key below. Once integrated, every consultation speaks with a live AI psychiatric patient in English, বাংলা, or Banglish.'}
            </p>
          </div>
        </div>

        <div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '8px',
            }}
          >
            <label
              htmlFor="gemini-key-input"
              style={{ margin: 0, fontSize: '13px', fontWeight: 500, color: 'var(--sand)' }}
            >
              Gemini API Key
            </label>
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '12px',
                color: '#7da5ff',
                fontWeight: 600,
              }}
            >
              Get Free API Key <ExternalLink size={12} />
            </a>
          </div>

          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <KeyRound
              size={16}
              style={{
                position: 'absolute',
                left: '12px',
                color: 'var(--muted)',
                pointerEvents: 'none',
              }}
            />
            <input
              id="gemini-key-input"
              type={showKey ? 'text' : 'password'}
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              placeholder="Paste AIzaSy... key here"
              autoComplete="off"
              spellCheck={false}
              style={{
                width: '100%',
                paddingLeft: '38px',
                paddingRight: '44px',
                paddingTop: '12px',
                paddingBottom: '12px',
                borderRadius: '7px',
                border: '1px solid var(--line)',
                fontSize: '13px',
                color: 'var(--sand)',
                background: 'var(--charcoal)',
              }}
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="icon-button"
              style={{ position: 'absolute', right: '4px' }}
              title={showKey ? 'Hide key' : 'Show key'}
              aria-label={showKey ? 'Hide key' : 'Show key'}
            >
              {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <small
            style={{
              display: 'block',
              marginTop: '6px',
              color: 'var(--muted)',
              fontSize: '11px',
            }}
          >
            Stored locally in your browser (`localStorage`) for standalone GitHub Pages use. Never pushed to Git.
          </small>
        </div>

        {status.type === 'error' && (
          <div
            className="error-notice"
            role="alert"
            style={{ margin: 0, flexDirection: 'column', alignItems: 'stretch' }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
              <AlertCircle size={16} style={{ marginTop: '2px', flexShrink: 0 }} />
              <span>{status.message}</span>
            </div>
            {keyInput.trim().startsWith('AIza') && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={handleForceSave}
                  className="button secondary"
                  style={{ minHeight: '34px', padding: '6px 12px', fontSize: '12px' }}
                >
                  Save & Activate Key Anyway
                </button>
              </div>
            )}
          </div>
        )}

        {status.type === 'success' && (
          <div
            className="notice"
            role="status"
            style={{
              margin: 0,
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              background: 'rgba(16, 185, 129, 0.14)',
              borderColor: 'rgba(16, 185, 129, 0.45)',
              color: '#a7f3d0',
              fontWeight: 600,
            }}
          >
            <Check size={18} style={{ color: '#34d399', flexShrink: 0 }} />
            <span>{status.message}</span>
          </div>
        )}

        <div
          className="modal-actions"
          style={{
            justifyContent: 'space-between',
            alignItems: 'center',
            borderTop: '1px solid var(--line)',
            paddingTop: '16px',
            marginTop: '4px',
          }}
        >
          <div>
            {savedKey && (
              <button
                type="button"
                onClick={handleClear}
                className="button secondary"
                style={{
                  color: '#fca5a5',
                  borderColor: 'rgba(248, 113, 113, 0.35)',
                  background: 'rgba(127, 29, 29, 0.25)',
                  minHeight: '40px',
                  padding: '8px 14px',
                }}
              >
                <Trash2 size={14} />
                <span>Remove Key</span>
              </button>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={testing}
              className="button secondary"
              style={{ minHeight: '40px', padding: '8px 16px' }}
            >
              {savedKey && status.type === 'success' ? 'Done' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={testing || !keyInput.trim()}
              className="button primary"
              style={{ minHeight: '40px', padding: '8px 18px' }}
            >
              {testing ? (
                <>
                  <LoaderCircle className="spin" size={16} />
                  <span>Verifying & Integrating…</span>
                </>
              ) : savedKey && keyInput.trim() === savedKey ? (
                <>
                  <Check size={16} />
                  <span>Re-Verify Key</span>
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  <span>Verify & Integrate API Key</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
