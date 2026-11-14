import { expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Results from '../pages/Results';
import type { Outcome, SessionResult } from '../../shared/contracts';
const mocks = vi.hoisted(() => ({ results: vi.fn(), session: vi.fn() }));
vi.mock('../lib/api', () => ({ api: mocks }));
it.each([
  ['CORRECT', 'Diagnosis matched'], ['PARTIALLY_CORRECT', 'Partially correct'],
  ['INCORRECT', 'A chance to reflect'], ['REVIEW_REQUIRED', 'Review required'],
] as [Outcome, string][])('renders %s distinctly without replacing backend evidence', async (outcome, heading) => {
  const result: SessionResult = { sessionId: 'session', outcome, approvedDiagnosis: 'Server-approved fixture', submittedDiagnosis: 'Submitted fixture', supportingFindings: [], negativeFindings: [], explanation: { text: 'Explanation from server', messageIds: ['message-1'], caseReferences: ['case-section-1'] }, learningPoints: [], missedObjectives: [], rubric: [] };
  mocks.results.mockResolvedValue(result); mocks.session.mockResolvedValue({ patient: { name: 'Fictional patient' }, messages: [], difficulty: 'beginner' });
  render(<BrowserRouter><Results/></BrowserRouter>);
  expect(await screen.findByRole('heading', { name: heading })).toBeInTheDocument();
  expect(screen.getByText('Server-approved fixture')).toBeInTheDocument();
  expect(screen.getByText('Explanation from server')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Transcript evidence 1' })).toHaveAttribute('href', '#evidence-message-1');
});
