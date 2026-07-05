import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ConfirmButton from './ConfirmButton';

/**
 * ConfirmButton is the shared destructive-action gate (#34): the action must NOT
 * fire on the first click — only after the user confirms in the dialog. It also
 * needs an accessible name for icon-only triggers (#35).
 */
describe('ConfirmButton (#34 destructive confirm)', () => {
  function setup() {
    const onConfirm = vi.fn();
    render(
      <ConfirmButton
        onConfirm={onConfirm}
        aria-label="Delete user alice"
        confirmTitle="Delete user"
        confirmMessage="Delete user alice?"
        confirmLabel="Delete"
      >
        <span>icon</span>
      </ConfirmButton>,
    );
    return { onConfirm };
  }

  it('does not fire onConfirm until the dialog is confirmed', () => {
    const { onConfirm } = setup();

    // First click opens the dialog but must NOT run the action.
    fireEvent.click(screen.getByRole('button', { name: 'Delete user alice' }));
    expect(onConfirm).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    // Confirming runs it exactly once.
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('cancelling closes the dialog without firing the action', () => {
    const { onConfirm } = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Delete user alice' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onConfirm).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('exposes the aria-label on the icon-only trigger (#35)', () => {
    setup();
    expect(
      screen.getByRole('button', { name: 'Delete user alice' }),
    ).toBeInTheDocument();
  });
});
