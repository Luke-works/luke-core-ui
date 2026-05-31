import { useState, useEffect, useRef, useCallback } from 'react';

interface UsePollingOptions {
  enabled?: boolean;
  intervalMs?: number;
}

interface UsePollingResult {
  /** Seconds remaining until next refetch */
  secondsRemaining: number;
  /** Whether polling is currently paused */
  isPaused: boolean;
  /** Toggle the polling pause state */
  togglePause: () => void;
  /** The value to pass to TanStack Query's refetchInterval option */
  refetchInterval: number | false;
}

export function usePolling({
  enabled = true,
  intervalMs = 30_000,
}: UsePollingOptions = {}): UsePollingResult {
  const [isPaused, setIsPaused] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(
    Math.floor(intervalMs / 1000),
  );
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const togglePause = useCallback(() => {
    setIsPaused((prev) => !prev);
  }, []);

  const isActive = enabled && !isPaused;

  useEffect(() => {
    if (!isActive) {
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
      }
      return;
    }

    // Reset countdown when polling becomes active
    setSecondsRemaining(Math.floor(intervalMs / 1000));

    countdownRef.current = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          return Math.floor(intervalMs / 1000);
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
      }
    };
  }, [isActive, intervalMs]);

  return {
    secondsRemaining,
    isPaused,
    togglePause,
    refetchInterval: isActive ? intervalMs : false,
  };
}
