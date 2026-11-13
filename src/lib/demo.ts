import type { Category, PublicSession, PsySimApi, ScenarioDraft, SessionResult, Message } from '../../shared/contracts';
const STORAGE = 'psysim-demo-v1';
interface Store { sessions: PublicSession[]; results: Record<string, SessionResult>; scenarios: ScenarioDraft[]; receipts: Record<string, PublicSession> }
const empty = (): Store => ({ sessions: [], results: {}, scenarios: [], receipts: {} });
function read(): Store {
  const saved = localStorage.getItem(STORAGE);
  if (!saved) return empty();
  try { const value = JSON.parse(saved); if (!Array.isArray(value.sessions) || !value.results || !Array.isArray(value.scenarios) || !value.receipts) throw Error(); return value; }
  catch { throw new Error('Demo storage is unreadable. Clear PsySim demo data in browser storage to start again.'); }
}
const write = (store: Store) => { try { localStorage.setItem(STORAGE, JSON.stringify(store)); } catch { throw new Error('Browser storage is unavailable or full. Enable storage to save this demo.'); } };
const uuid = () => crypto.randomUUID();
const now = () => new Date().toISOString();
const message = (role: Message['role'], content: string): Message => ({ id: uuid(), role, content, createdAt: now() });
const categories: Category[] = [
  { id: 'psychotic', name: 'Schizophrenia spectrum & psychotic disorders', description: 'Explore experiences, perception, and thought.' },
  { id: 'depressive', name: 'Depressive disorders', description: 'Explore mood, motivation, and everyday functioning.' },
  { id: 'bipolar', name: 'Bipolar & related disorders', description: 'Understand changes in mood, energy, and activity.' },
  { id: 'anxiety', name: 'Anxiety disorders', description: 'Explore worry, fear, and avoidance.' },
  { id: 'ocd', name: 'Obsessive-compulsive & related disorders', description: 'Explore intrusive thoughts and repetitive behaviors.' },
  { id: 'trauma', name: 'Trauma & stressor-related disorders', description: 'Understand experiences in their personal context.' },
  { id: 'substance', name: 'Substance-related disorders', description: 'Explore patterns of use and their impact.' },
];
const titles = ['Presenting complaint', 'Onset, course & severity', 'Everyday functioning', 'Relevant history', 'Risk & protective factors', 'Distinguishing features'];
const guidance = ['Begin with an open invitation to talk.', 'Clarify timing, change over time, and intensity.', 'Explore the impact on work, relationships, and self-care.', 'Ask about psychiatric and medical history, medication, and substance use.', 'Explore safety sensitively and identify available support.', 'Clarify the presentation and consider relevant alternatives.'];
const replies = {
  en: 'This is a scripted interface preview. I have been finding everyday life difficult lately. Live patient responses require the connected simulation service.',
  bn: 'এটি ইন্টারফেস দেখার জন্য লেখা নমুনা উত্তর। ইদানীং দৈনন্দিন কাজ করতে কষ্ট হচ্ছে। বাস্তব সিমুলেশনের জন্য সার্ভার সংযোগ প্রয়োজন।',
  banglish: 'Eta interface dekhar jonno lekha demo uttor. Idaning rojkar kaj korte koshto hocche. Live simulation er jonno server connection dorkar.',
  mixed: 'ইদানীং everyday কাজগুলো কঠিন লাগছে। This is a scripted demo response; live simulation needs a backend connection.',
};
const get = (store: Store, id: string) => { const session = store.sessions.find(s => s.id === id); if (!session) throw new Error('Session not found.'); return session; };
function mutate(id: string, action: (s: PublicSession, store: Store) => void, key?: string) {
  const store = read();
  if (key && store.receipts[key]) return structuredClone(store.receipts[key]);
  const session = get(store, id); action(session, store); session.version++; session.updatedAt = now();
  if (key) store.receipts[key] = structuredClone(session);
  write(store); return structuredClone(session);
}
export const demoApi: PsySimApi = {
  async me() { return { id: 'demo-student', displayName: 'Demo learner', email: 'demo@local.invalid', role: 'student' }; },
  async categories() { return categories; },
  async sessions() { const store = read(); const items = [...store.sessions].reverse().map(s => ({ id: s.id, patientName: s.patient.name, mode: s.mode, difficulty: s.difficulty, state: s.state, createdAt: s.createdAt, outcome: store.results[s.id]?.outcome })); return { items, nextCursor: null, stats: { completed: items.filter(s => s.state === 'EVALUATED').length, graded: 0, correct: 0, total: items.length } }; },
  async create(input, key) {
    const store = read(); if (store.receipts[key]) return store.receipts[key];
    if (input.mode === 'custom' && !categories.some(c => c.id === input.categoryId)) throw new Error('Choose a category.');
    const s: PublicSession = { id: uuid(), version: 1, state: 'IN_PROGRESS', ...input, createdAt: now(), updatedAt: now(),
      patient: { name: 'Samira Ahmed', age: 27, occupation: 'University student', presentingComplaint: 'Everyday things have felt difficult lately.' },
      messages: [message('patient', input.language === 'bn' ? 'ইদানীং আমার ভালো লাগছে না। কোথা থেকে শুরু করব বুঝতে পারছি না।' : input.language === 'banglish' ? 'Idaning amar bhalo lagche na. Kotha theke shuru korbo bujhte parchi na.' : input.language === 'mixed' ? 'ইদানীং ভালো লাগছে না। I am not sure where to begin.' : 'I haven’t been feeling like myself lately. I’m not really sure where to begin.')],
      progress: { eligible: false, objectives: titles.map((title, i) => ({ id: `o${i}`, title, required: true, completed: false, evidenceMessageIds: [], confidence: null, guidance: guidance[i] })) }, simulation: 'mock' };
    store.sessions.push(s); store.receipts[key] = s; write(store); return structuredClone(s);
  },
  async session(id) { return structuredClone(get(read(), id)); },
  async send(id, content, version, key) { return mutate(id, s => {
    if (!['IN_PROGRESS', 'INTERVIEW_COMPLETE'].includes(s.state)) throw new Error('This session is finalized.');
    if (version !== s.version) throw new Error('Session changed. Refresh before continuing.');
    if (!content.trim() || content.length > 4000) throw new Error('Enter a message of 1–4,000 characters.');
    s.messages.push(message('student', content.trim()), message('patient', replies[s.language]));
  }, key); },
  async demoComplete(id, objectiveId) { return mutate(id, s => {
    if (!['IN_PROGRESS', 'INTERVIEW_COMPLETE'].includes(s.state)) throw new Error('This session is finalized.');
    const objective = s.progress.objectives.find(o => o.id === objectiveId); if (!objective) throw new Error('Unknown objective.');
    objective.completed = true; // Explicit UI testing control, NOT transcript assessment.
    s.progress.eligible = s.progress.objectives.filter(o => o.required).every(o => o.completed);
    if (s.progress.eligible) s.state = 'INTERVIEW_COMPLETE';
  }); },
  async diagnose(id, input, key) { return mutate(id, (s, store) => {
    if (s.state !== 'INTERVIEW_COMPLETE' || !s.progress.eligible) throw new Error('Complete the demo objectives first.');
    if (input.expectedVersion !== s.version) throw new Error('Session changed. Refresh before submitting.');
    if (!input.diagnosis.trim() || input.diagnosis.length > 500 || (input.reasoning?.length || 0) > 4000) throw new Error('Check diagnosis and reasoning lengths.');
    s.state = 'EVALUATED'; const claim = (text: string) => ({ text, messageIds: [], caseReferences: [] });
    store.results[id] = { sessionId: id, outcome: 'REVIEW_REQUIRED', submittedDiagnosis: input.diagnosis.trim(), submittedReasoning: input.reasoning,
      approvedDiagnosis: null, supportingFindings: [], negativeFindings: [], missedObjectives: [], rubric: [],
      explanation: claim('This development demo does not assess clinical correctness. A connected backend and a clinician-approved case are required for diagnostic evaluation.'),
      learningPoints: [claim('Use the live service to receive evidence-linked feedback. Demo controls only preview the submission workflow.')] };
  }, key); },
  async results(id) { const r = read().results[id]; if (!r) throw new Error('Results are not available yet.'); return r; },
  async scenarios() { return read().scenarios; },
  async saveScenario(input, id, version) {
    const store = read(); const existing = id ? store.scenarios.find(s => s.id === id) : undefined;
    if (id && (!existing || existing.version !== version)) throw new Error('Case changed. Reload the case list.');
    const draft: ScenarioDraft = { ...input, id: id || uuid(), version: (existing?.version || 0) + 1 };
    store.scenarios = [...store.scenarios.filter(s => s.id !== draft.id), draft]; write(store); return draft;
  },
  async reviewScenario() { throw new Error('Demo cases cannot be approved. Connect the backend and sign in as an authorized supervisor.'); },
};
