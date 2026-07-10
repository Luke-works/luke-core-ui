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
      <span className="text-sm italic text-gray-400 dark:text-gray-500">
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
      <span className="font-mono-id text-sm text-gray-800 dark:text-white/90">
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
          <span className="text-sm text-gray-800 dark:text-white/90">
            {str.slice(0, 80)}...
          </span>
        </Tooltip>
      );
    }
    return (
      <span className="text-sm text-gray-800 dark:text-white/90">
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
          className="text-sm font-medium cursor-pointer bg-transparent border-none p-0 underline text-brand-500 dark:text-brand-400"
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
        <span className="text-sm text-gray-800 dark:text-white/90">
          {relativeTime(dateStr)}
        </span>
      </Tooltip>
    );
  }

  // Bytes
  if (normalizedType === 'bytes' || normalizedType === 'file') {
    return (
      <span className="text-sm italic text-gray-400 dark:text-gray-500">
        (binary)
      </span>
    );
  }

  // Fallback: render as string
  return (
    <span className="text-sm text-gray-800 dark:text-white/90">
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
      <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-[2px]" />
      <div
        className="relative rounded-2xl border border-gray-200 bg-white shadow-theme-xl w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col dark:border-gray-800 dark:bg-gray-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-200 shrink-0 dark:border-gray-800">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-medium text-gray-800 dark:text-white/90">
              Inspect {name ? `"${name}"` : ''} variable
            </h2>
            <button
              className="flex items-center justify-center w-9 h-9 rounded-lg cursor-pointer bg-transparent border-none text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/[0.05] dark:hover:text-white transition-colors"
              onClick={onClose}
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>

          {/* Metadata fields */}
          <div className="space-y-2">
            {objectTypeName && (
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-medium text-gray-800 dark:text-white/90">
                  Object Type Name:
                </span>
                <span className="text-sm font-mono-id text-gray-600 dark:text-gray-300">
                  {objectTypeName}
                </span>
              </div>
            )}
            {serializationDataFormat && (
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-medium text-gray-800 dark:text-white/90">
                  Serialization Data Format:
                </span>
                <span className="text-sm font-mono-id text-gray-600 dark:text-gray-300">
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
                    <p className="text-xs text-gray-600 dark:text-gray-300">Deserializing…</p>
                  ) : deserErr ? (
                    <p className="text-xs text-gray-600 dark:text-gray-300">{deserErr}</p>
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
      className={`rounded-lg p-1 transition-colors cursor-pointer bg-transparent border-none ${
        copied ? 'text-success-500' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
      }`}
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
        <span className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
          Value
        </span>
        <CopyButton text={content} />
      </div>
      <pre className="font-mono-id text-xs rounded-lg p-4 whitespace-pre-wrap break-all text-gray-800 bg-gray-50 border border-gray-200 dark:text-gray-200 dark:bg-gray-800 dark:border-gray-700">
        {content}
      </pre>
    </div>
  );
}
