import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import ErrorBoundary from './ErrorBoundary';

vi.mock('@/shared/utils/reportError', () => ({ reportError: vi.fn() }));
import { reportError } from '@/shared/utils/reportError';

function Boom({ explode }: { explode: boolean }) {
  if (explode) throw new Error('kaboom');
  return <div>safe content</div>;
}

describe('ErrorBoundary (#24)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows a recoverable fallback and reports instead of crashing', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <ErrorBoundary>
        <Boom explode />
      </ErrorBoundary>,
    );
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    expect(reportError).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });

  it('resets when resetKeys change (navigation recovers without reload)', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    function Harness() {
      const [key, setKey] = useState('a');
      return (
        <>
          <button onClick={() => setKey('b')}>navigate</button>
          <ErrorBoundary resetKeys={[key]}>
            <Boom explode={key === 'a'} />
          </ErrorBoundary>
        </>
      );
    }

    render(<Harness />);
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    await userEvent.click(screen.getByText('navigate'));
    expect(screen.getByText('safe content')).toBeInTheDocument();
    spy.mockRestore();
  });
});
