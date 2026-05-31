import { useState } from 'react';
import { X } from 'lucide-react';
import Badge from './Badge';
import Tooltip from './Tooltip';
import Tabs from './Tabs';
import { relativeTime, absoluteTime } from '@/shared/utils/date';

interface VariableRendererProps {
  variable: {
    value: unknown;
    type: string;
    valueInfo?: Record<string, any>;
  };
  /** Variable name — used in the inspect modal title */
  name?: string;
}

export default function VariableRenderer({ variable, name }: VariableRendererProps) {
  const { value, type } = variable;
  const normalizedType = type?.toLowerCase() ?? '';
  const [showModal, setShowModal] = useState(false);

  // Null
  if (value === null || value === undefined || normalizedType === 'null') {
    return (
      <span
        className="text-sm italic"
        style={{ color: 'var(--text-muted)' }}
      >
        null
      </span>
    );
  }

  // Boolean
  if (normalizedType === 'boolean') {
    return (
      <Badge variant={value ? 'success' : 'danger'}>
        {String(value)}
      </Badge>
    );
  }

  // Integer / Long / Double
  if (
    normalizedType === 'integer' ||
    normalizedType === 'long' ||
    normalizedType === 'double' ||
    normalizedType === 'short'
  ) {
    const num = typeof value === 'number' ? value : Number(value);
    return (
      <span
        className="font-mono-id text-sm"
        style={{ color: 'var(--text-primary)' }}
      >
        {num.toLocaleString()}
      </span>
    );
  }

  // String
  if (normalizedType === 'string') {
    const str = String(value);
    if (str.length > 80) {
      return (
        <Tooltip content={str}>
          <span
            className="text-sm"
            style={{ color: 'var(--text-primary)' }}
          >
            {str.slice(0, 80)}...
          </span>
        </Tooltip>
      );
    }
    return (
      <span
        className="text-sm"
        style={{ color: 'var(--text-primary)' }}
      >
        {str}
      </span>
    );
  }

  // Json / Object → "View" hyperlink + modal
  if (normalizedType === 'json' || normalizedType === 'object') {
    return (
      <>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            setShowModal(true);
          }}
          className="text-sm font-medium cursor-pointer bg-transparent border-none p-0 underline"
          style={{ color: 'var(--accent-blue)' }}
        >
          View
        </button>
        {showModal && (
          <InspectVariableModal
            name={name}
            value={value}
            valueInfo={variable.valueInfo}
            onClose={() => setShowModal(false)}
          />
        )}
      </>
    );
  }

  // Date
  if (normalizedType === 'date') {
    const dateStr = typeof value === 'string' ? value : String(value);
    return (
      <Tooltip content={absoluteTime(dateStr)}>
        <span
          className="text-sm"
          style={{ color: 'var(--text-primary)' }}
        >
          {relativeTime(dateStr)}
        </span>
      </Tooltip>
    );
  }

  // Bytes
  if (normalizedType === 'bytes' || normalizedType === 'file') {
    return (
      <span
        className="text-sm italic"
        style={{ color: 'var(--text-muted)' }}
      >
        (binary)
      </span>
    );
  }

  // Fallback: render as string
  return (
    <span
      className="text-sm"
      style={{ color: 'var(--text-primary)' }}
    >
      {String(value)}
    </span>
  );
}

/* ================================================================== */
/*  Inspect Variable Modal (matches Camunda Cockpit)                   */
/* ================================================================== */

function InspectVariableModal({
  name,
  value,
  valueInfo,
  onClose,
}: {
  name?: string;
  value: unknown;
  valueInfo?: Record<string, any>;
  onClose: () => void;
}) {
  const [activeTab, setActiveTab] = useState('serialized');

  const objectTypeName = valueInfo?.objectTypeName ?? null;
  const serializationDataFormat = valueInfo?.serializationDataFormat ?? null;

  // Serialized: the raw value as a string
  const serialized =
    typeof value === 'string' ? value : JSON.stringify(value);

  // Deserialized: try to parse JSON from the raw value
  const deserialized = typeof value === 'string' ? tryParseJson(value) : value;
  const deserializedStr =
    typeof deserialized === 'object' && deserialized !== null
      ? JSON.stringify(deserialized, null, 2)
      : String(deserialized);

  const tabs = [
    { id: 'serialized', label: 'Serialized' },
    { id: 'deserialized', label: 'Deserialized' },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/60" />
      <div
        className="relative rounded-lg border shadow-xl w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="px-5 py-4 border-b shrink-0"
          style={{ borderColor: 'var(--border)' }}
        >
          <div className="flex items-center justify-between mb-3">
            <h2
              className="text-lg font-semibold"
              style={{ color: 'var(--text-primary)' }}
            >
              Inspect {name ? `"${name}"` : ''} variable
            </h2>
            <button
              className="rounded p-1 hover:bg-white/10 transition-colors cursor-pointer bg-transparent border-none"
              style={{ color: 'var(--text-secondary)' }}
              onClick={onClose}
            >
              <X size={18} />
            </button>
          </div>

          {/* Metadata fields */}
          <div className="space-y-2">
            {objectTypeName && (
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Object Type Name:
                </span>
                <span className="text-sm font-mono-id" style={{ color: 'var(--text-secondary)' }}>
                  {objectTypeName}
                </span>
              </div>
            )}
            {serializationDataFormat && (
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Serialization Data Format:
                </span>
                <span className="text-sm font-mono-id" style={{ color: 'var(--text-secondary)' }}>
                  {serializationDataFormat}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Tabs + Content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab}>
            <div
              className="p-4 overflow-auto"
              style={{ maxHeight: 'calc(80vh - 180px)' }}
            >
              {activeTab === 'serialized' && (
                <pre
                  className="font-mono-id text-xs rounded p-4 whitespace-pre-wrap break-all"
                  style={{
                    backgroundColor: 'var(--bg-elevated)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-primary)',
                  }}
                >
                  {serialized}
                </pre>
              )}

              {activeTab === 'deserialized' && (
                <pre
                  className="font-mono-id text-xs rounded p-4 whitespace-pre-wrap break-all"
                  style={{
                    backgroundColor: 'var(--bg-elevated)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-primary)',
                  }}
                >
                  {deserializedStr}
                </pre>
              )}
            </div>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

function tryParseJson(str: string): unknown {
  try {
    return JSON.parse(str);
  } catch {
    return str;
  }
}
