import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Clipboard, Check } from 'lucide-react';
import { truncateId } from '@/shared/utils/camunda';

interface IdLinkProps {
  /** Full id to display (truncated) and copy. */
  id: string;
  /** Route to navigate to when the id is clicked. */
  to: string;
  className?: string;
}

/**
 * A clickable, copyable id — like CopyId, but the id text is a router link to a
 * detail page. The copy icon is separate so clicking the id navigates while the
 * icon copies. Stops propagation so it works inside clickable table rows.
 */
export default function IdLink({ id, to, className = '' }: IdLinkProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(id);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard API may fail in some contexts
    }
  };

  return (
    <span className={`group inline-flex items-center gap-1.5 ${className}`}>
      <Link
        to={to}
        onClick={(e) => e.stopPropagation()}
        className="font-mono-id text-theme-xs hover:underline"
        style={{ color: 'var(--accent-blue)' }}
        title={id}
      >
        {truncateId(id)}
      </Link>
      <button
        type="button"
        onClick={handleCopy}
        className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        title="Copy id"
      >
        {copied ? (
          <Check size={13} className="text-success-500" />
        ) : (
          <Clipboard size={13} />
        )}
      </button>
    </span>
  );
}
