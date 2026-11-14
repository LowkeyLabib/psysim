import { expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import Supervisor from '../pages/Supervisor';
const cases = vi.hoisted(() => vi.fn());
vi.mock('../lib/config', () => ({ demoMode: false }));
vi.mock('../lib/auth', () => ({ useAuth: () => ({ user: { id: 'student', role: 'student' } }) }));
vi.mock('../lib/api', () => ({ api: { scenarios: cases } }));
it('does not request privileged case data for a live student', () => {
  render(<Supervisor/>);
  expect(screen.getByRole('alert')).toHaveTextContent('Supervisor access is required');
  expect(cases).not.toHaveBeenCalled();
});
