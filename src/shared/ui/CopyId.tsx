import { useState } from 'react';
import { Clipboard, Check } from 'lucide-react';

interface CopyIdProps {
  id: string;
  className?: string;
  /**
   * When true (default), cap the displayed id width and ellipsize the overflow
   * (good for long UUIDs) — the full value stays available via the copy button
   * and the hover tooltip. Pass false for short, human-readable ids.
   */
  truncate?: boolean;
  /** Max width of the id text when truncating (CSS length). */
  maxWidth?: string;
}

export default function CopyId({
  id,
  className = '',
  truncate = true,
  maxWidth = '16ch',
}: CopyIdProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(id);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard API may fail in some contexts
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={`group inline-flex max-w-full items-center gap-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 ${className}`}
      title={id}
    >
      <span
        className="font-mono-id text-theme-xs"
        style={
          truncate
            ? {
                display: 'inline-block',
                maxWidth,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                verticalAlign: 'bottom',
                minWidth: 0,
              }
            : undefined
        }
      >
        {id}
      </span>
      <span className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        {copied ? (
          <Check size={13} className="text-success-500" />
        ) : (
          <Clipboard size={13} />
        )}
      </span>
    </button>
  );
}
