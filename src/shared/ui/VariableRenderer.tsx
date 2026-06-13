import { useEffect, useState } from 'react';
import { X, Clipboard, Check } from 'lucide-react';
import Badge from './Badge';
import Tooltip from './Tooltip';
import Tabs from './Tabs';
import { relativeTime, absoluteTime } from '@/shared/utils/date';
import { getProcessVariableDeserialized } from '@/features/processes/api/endpoints';

interface VariableRendererProps {
  variable: {
    value: unknown;
    type: string;
    valueInfo?: Record<string, any>;
  };
  /** Variable name — used in the inspect modal title */
  name?: string;
  /** Process instance id — enables on-demand deserialization of Object variables. */
  instanceId?: string;
}

export default function VariableRenderer({ variable, name, instanceId }: VariableRendererProps) {
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
            type={normalizedType}
            valueInfo={variable.valueInfo}
            instanceId={instanceId}
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
  type,
  valueInfo,
  instanceId,
  onClose,
}: {
  name?: string;
  value: unknown;
  type?: string;
  valueInfo?: Record<string, any>;
  instanceId?: string;
  onClose: () => void;
}) {
  const [activeTab, setActiveTab] = useState('serialized');

  const objectTypeName = valueInfo?.objectTypeName ?? null;
  const serializationDataFormat = valueInfo?.serializationDataFormat ?? null;
  // JSON if the engine says so by type OR by serialization format. Anything else
  // (e.g. application/x-java-serialized-object) is treated as an Object.
  const isJson = type === 'json' || serializationDataFormat === 'application/json';

  // Raw serialized value as a string.
  const serialized = typeof value === 'string' ? value : JSON.stringify(value);

  // JSON: pretty-print the JSON string directly (a single view — no tabs).
  const jsonPretty = (() => {
    const parsed = typeof value === 'string' ? tryParseJson(value) : value;
    return typeof parsed === 'object' && parsed !== null ? JSON.stringify(parsed, null, 2) : serialized;
  })();

  // Object: the deserialized form must come from the engine (a Java-serialized
  // object can't be parsed in the browser). Fetched on demand when the
  // Deserialized tab is opened.
  const [deser, setDeser] = useState<unknown>(undefined);
  const [deserLoading, setDeserLoading] = useState(false);
  const [deserErr, setDeserErr] = useState<string | null>(null);

  useEffect(() => {
    if (isJson || activeTab !== 'deserialized' || !instanceId || !name || deser !== undefined || deserLoading) return;
    setDeserLoading(true);
    setDeserErr(null);
    getProcessVariableDeserialized(instanceId, name)
      .then((r) => setDeser(r.value ?? null))
      .catch((e: any) => setDeserErr(e?.message ?? 'Could not deserialize this variable.'))
      .finally(() => setDeserLoading(false));
  }, [isJson, activeTab, instanceId, name, deser, deserLoading]);

  const objectDeserStr =
    deser === undefined ? null : typeof deser === 'object' && deser !== null ? JSON.stringify(deser, null, 2) : String(deser);

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

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {isJson ? (
            // JSON → a single view of the JSON (no Serialized/Deserialized split).
            <div className="p-4 overflow-auto" style={{ maxHeight: 'calc(80vh - 180px)' }}>
              <ValuePane content={jsonPretty} />
            </div>
          ) : (
            // Object → raw serialized blob + the engine-deserialized form.
            <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab}>
              <div className="p-4 overflow-auto" style={{ maxHeight: 'calc(80vh - 180px)' }}>
                {activeTab === 'serialized' && <ValuePane content={serialized} />}
                {activeTab === 'deserialized' &&
                  (deserLoading ? (
                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Deserializing…</p>
                  ) : deserErr ? (
                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{deserErr}</p>
                  ) : (
                    <ValuePane content={objectDeserStr ?? (instanceId ? '' : 'Open from a process instance to deserialize.')} />
                  ))}
              </div>
            </Tabs>
          )}
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

/* Copy-to-clipboard: click → turns into a tick → reverts after a moment. */
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  };
  return (
    <button
      type="button"
      onClick={onCopy}
      title={copied ? 'Copied' : 'Copy value'}
      aria-label="Copy value"
      className="rounded p-1 transition-colors cursor-pointer bg-transparent border-none"
      style={{ color: copied ? '#22c55e' : 'var(--text-secondary)' }}
    >
      {copied ? <Check size={16} /> : <Clipboard size={16} />}
    </button>
  );
}

/* A value box with a "Value" label and a copy button above it. */
function ValuePane({ content }: { content: string }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
          Value
        </span>
        <CopyButton text={content} />
      </div>
      <pre
        className="font-mono-id text-xs rounded p-4 whitespace-pre-wrap break-all"
        style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
      >
        {content}
      </pre>
    </div>
  );
}
