import { useState, type ReactNode } from 'react';
import Button from './Button';
import Modal from './Modal';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ConfirmButtonProps {
  /** Fired only after the user confirms. */
  onConfirm: () => void;
  /** Trigger button content (label/icon). */
  children: ReactNode;
  confirmTitle: string;
  confirmMessage: string;
  confirmLabel?: string;
  /** Variant for the confirm (commit) button in the dialog. */
  confirmVariant?: ButtonVariant;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  disabled?: boolean;
  title?: string; // native tooltip on the trigger
  /** Accessible name for icon-only triggers (#35). */
  'aria-label'?: string;
}

/**
 * A trigger button that requires an explicit confirmation step before firing its
 * action — the shared pattern for destructive ops so deletes/retries aren't
 * single-click (#34). Uses the accessible shared Modal (focus-trap + Esc).
 */
export default function ConfirmButton({
  onConfirm,
  children,
  confirmTitle,
  confirmMessage,
  confirmLabel = 'Confirm',
  confirmVariant = 'danger',
  variant = 'ghost',
  size = 'sm',
  className,
  disabled,
  title,
  'aria-label': ariaLabel,
}: ConfirmButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant={variant}
        size={size}
        className={className}
        disabled={disabled}
        title={title}
        aria-label={ariaLabel}
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
      >
        {children}
      </Button>

      <Modal open={open} onClose={() => setOpen(false)} title={confirmTitle} width={420}>
        <p className="text-sm text-gray-600 dark:text-gray-300">{confirmMessage}</p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            variant={confirmVariant}
            size="sm"
            onClick={() => {
              setOpen(false);
              onConfirm();
            }}
          >
            {confirmLabel}
          </Button>
        </div>
      </Modal>
    </>
  );
}
