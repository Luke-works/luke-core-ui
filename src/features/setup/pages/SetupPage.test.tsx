import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { toast } from 'sonner';
import SetupPage from './SetupPage';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

function renderPage() {
  return render(
    <MemoryRouter>
      <SetupPage />
    </MemoryRouter>,
  );
}

// Welcome -> Admin (fill a valid password) -> Database step.
async function reachDatabaseStep(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: /next/i })); // welcome -> admin
  await user.type(screen.getByPlaceholderText('Min 4 characters'), 'pass');
  await user.type(screen.getByPlaceholderText('Re-enter password'), 'pass');
  await user.click(screen.getByRole('button', { name: /next/i })); // admin -> database
}

// From the Database step (H2 default) advance to Finish and submit.
async function finishWithH2(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: /next/i })); // database -> services
  await user.click(screen.getByRole('button', { name: /next/i })); // services -> finish
  await user.click(screen.getByRole('button', { name: /finish setup/i }));
}

describe('SetupPage', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('does NOT mark setup complete when the backend fails (#29)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({ error: 'db down' }) }),
    );
    const user = userEvent.setup();
    renderPage();
    await reachDatabaseStep(user);
    await finishWithH2(user);

    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(localStorage.getItem('luke-setup-complete')).toBeNull();
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('treats a 404 (no /api/setup endpoint) as a supported complete (#29)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 404, json: async () => ({}) }),
    );
    const user = userEvent.setup();
    renderPage();
    await reachDatabaseStep(user);
    await finishWithH2(user);

    await waitFor(() => expect(localStorage.getItem('luke-setup-complete')).toBe('true'));
    expect(toast.success).toHaveBeenCalled();
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('blocks PostgreSQL setup until a non-default credential is entered (#30)', async () => {
    const user = userEvent.setup();
    renderPage();
    await reachDatabaseStep(user);

    await user.click(screen.getByText('PostgreSQL'));
    // No default username/password is shipped, so the operator cannot proceed.
    expect(screen.getByRole('button', { name: /next/i })).toBeDisabled();

    await user.type(screen.getByPlaceholderText('Database user'), 'dbuser');
    await user.type(screen.getByPlaceholderText('At least 8 characters'), 'short');
    expect(screen.getByRole('button', { name: /next/i })).toBeDisabled(); // < 8 chars

    await user.clear(screen.getByPlaceholderText('At least 8 characters'));
    await user.type(screen.getByPlaceholderText('At least 8 characters'), 'longenoughpw');
    expect(screen.getByRole('button', { name: /next/i })).toBeEnabled();
  });
});
