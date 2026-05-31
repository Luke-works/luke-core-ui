import { useState } from 'react';
import { Clipboard, Check } from 'lucide-react';
import { truncateId } from '@/shared/utils/camunda';

interface CopyIdProps {
  id: string;
  className?: string;
}

export default function CopyId({ id, className = '' }: CopyIdProps) {
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
      className={`group inline-flex items-center gap-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 ${className}`}
      title={id}
    >
      <span className="font-mono-id text-theme-xs">{truncateId(id)}</span>
      <span className="opacity-0 group-hover:opacity-100 transition-opacity">
        {copied ? (
          <Check size={13} className="text-success-500" />
        ) : (
          <Clipboard size={13} />
        )}
      </span>
    </button>
  );
}
