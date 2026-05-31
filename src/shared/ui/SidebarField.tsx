import { useState } from 'react';
import { Clipboard, Check } from 'lucide-react';

interface SidebarFieldProps {
  label: string;
  value?: string;
  mono?: boolean;
  muted?: boolean;
  children?: React.ReactNode;
}

export default function SidebarField({ label, value, mono, muted, children }: SidebarFieldProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* clipboard may not be available */ }
  };

  return (
    <div>
      <dt className="flex items-center gap-1 group mb-1">
        <span className="text-theme-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
          {label}
        </span>
        {value && (
          <button
            type="button"
            onClick={handleCopy}
            className={`shrink-0 transition-opacity opacity-0 group-hover:opacity-100 ${
              copied ? 'text-success-500' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'
            }`}
            title="Copy to clipboard"
          >
            {copied ? <Check size={11} /> : <Clipboard size={11} />}
          </button>
        )}
      </dt>
      {children != null ? (
        <dd className="text-theme-sm text-gray-800 dark:text-white/90">{children}</dd>
      ) : (
        <dd
          className={`text-theme-sm break-all ${
            muted
              ? 'text-gray-500 dark:text-gray-400'
              : 'text-gray-800 dark:text-white/90'
          } ${mono ? 'font-mono-id' : ''}`}
        >
          {value}
        </dd>
      )}
    </div>
  );
}
