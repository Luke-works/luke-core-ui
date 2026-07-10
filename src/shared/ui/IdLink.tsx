import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Clipboard, Check } from 'lucide-react';

interface IdLinkProps {
  /** Full id to display (capped + ellipsized) and copy. */
  id: string;
  /** Route to navigate to when the id is clicked. */
  to: string;
  className?: string;
  /** Max width of the id text (CSS length). */
  maxWidth?: string;
}

/**
 * A clickable, copyable id — like CopyId, but the id text is a router link to a
 * detail page. The full id is shown, capped with an ellipsis so long UUIDs
 * don't bloat table columns; hover/copy reveal the full value.
 */
export default function IdLink({ id, to, className = '', maxWidth = '16ch' }: IdLinkProps) {
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
    <span className={`group inline-flex max-w-full items-center gap-1.5 ${className}`}>
      <Link
        to={to}
        onClick={(e) => e.stopPropagation()}
        className="font-mono-id text-theme-xs text-brand-500 hover:underline dark:text-brand-400"
        style={{
          display: 'inline-block',
          maxWidth,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          verticalAlign: 'bottom',
          minWidth: 0,
        }}
        title={id}
      >
        {id}
      </Link>
      <button
        type="button"
        onClick={handleCopy}
        className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
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
