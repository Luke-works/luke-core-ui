import { Component, type ErrorInfo, type ReactNode } from 'react';
import { getErrorMessage } from '@/shared/utils/errorHandler';
import { reportError } from '@/shared/utils/reportError';

type Props = {
  children: ReactNode;
  /** Custom fallback; receives the caught error and a reset callback. */
  fallback?: (error: Error, reset: () => void) => ReactNode;
  /** When any value here changes, the boundary clears its error (e.g. the route path). */
  resetKeys?: unknown[];
  /** Label included in error reports to identify which boundary caught it. */
  label?: string;
};

type State = { error: Error | null };

/**
 * Catches render-time errors in its subtree so one bad page degrades to a
 * recoverable fallback instead of unmounting the whole console (the shell/nav
 * survive). Forwards to {@link reportError}; resets when `resetKeys` change.
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    reportError(error, { componentStack: info.componentStack, label: this.props.label });
  }

  componentDidUpdate(prev: Props) {
    if (this.state.error && !shallowEqual(prev.resetKeys, this.props.resetKeys)) {
      this.setState({ error: null });
    }
  }

  reset = () => this.setState({ error: null });

  render() {
    const { error } = this.state;
    if (error) {
      return this.props.fallback
        ? this.props.fallback(error, this.reset)
        : <DefaultFallback error={error} onReset={this.reset} />;
    }
    return this.props.children;
  }
}

function shallowEqual(a?: unknown[], b?: unknown[]): boolean {
  if (a === b) return true;
  if (!a || !b || a.length !== b.length) return false;
  return a.every((v, i) => Object.is(v, b[i]));
}

function DefaultFallback({ error, onReset }: { error: Error; onReset: () => void }) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center gap-3 p-10 text-center"
      style={{ minHeight: '60vh' }}
    >
      <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">
        Something went wrong
      </h2>
      <p className="max-w-md text-sm text-gray-600 dark:text-gray-300">
        {getErrorMessage(error)}
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onReset}
          className="cursor-pointer rounded-lg px-3 py-1.5 text-sm font-medium text-white bg-brand-500 shadow-theme-xs hover:bg-brand-600 transition-colors"
        >
          Try again
        </button>
        <button
          type="button"
          onClick={() => {
            window.location.href = '/dashboard';
          }}
          className="cursor-pointer rounded-lg px-3 py-1.5 text-sm font-medium border border-gray-200 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03] transition-colors"
        >
          Go to dashboard
        </button>
      </div>
    </div>
  );
}
