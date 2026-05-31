import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

const SEQUENCE_TIMEOUT = 1000;

const GOTO_MAP: Record<string, string> = {
  d: '/dashboard',
  p: '/processes',
  t: '/tasks',
  i: '/incidents',
  j: '/jobs',
  h: '/history',
  e: '/deployments',
  s: '/settings',
};

export function useKeyboardShortcuts() {
  const navigate = useNavigate();
  const [showShortcuts, setShowShortcuts] = useState(false);
  const prefixRef = useRef<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearPrefix = useCallback(() => {
    prefixRef.current = null;
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Ignore when typing in inputs, textareas, or contenteditable elements
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable
      ) {
        return;
      }

      // Ignore when modifier keys are held (except shift for ?)
      if (e.ctrlKey || e.metaKey || e.altKey) {
        return;
      }

      const key = e.key.toLowerCase();

      // ? key to toggle shortcuts modal
      if (e.key === '?') {
        e.preventDefault();
        setShowShortcuts((prev) => !prev);
        clearPrefix();
        return;
      }

      // Escape to close shortcuts modal
      if (e.key === 'Escape') {
        if (showShortcuts) {
          setShowShortcuts(false);
        }
        clearPrefix();
        return;
      }

      // Handle "g" prefix key for go-to navigation
      if (prefixRef.current === 'g') {
        const destination = GOTO_MAP[key];
        if (destination) {
          e.preventDefault();
          navigate(destination);
        }
        clearPrefix();
        return;
      }

      // Set prefix if "g" is pressed
      if (key === 'g') {
        prefixRef.current = 'g';
        timeoutRef.current = setTimeout(() => {
          prefixRef.current = null;
        }, SEQUENCE_TIMEOUT);
        return;
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [navigate, showShortcuts, clearPrefix]);

  return { showShortcuts, setShowShortcuts };
}
