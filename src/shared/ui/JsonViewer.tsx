import { useState } from 'react';

interface JsonViewerProps {
  data: unknown;
  collapsed?: boolean;
}

export default function JsonViewer({ data, collapsed = true }: JsonViewerProps) {
  return (
    <div className="font-mono-id text-xs">
      <JsonNode value={data} initialCollapsed={collapsed} depth={0} />
    </div>
  );
}

interface JsonNodeProps {
  value: unknown;
  initialCollapsed: boolean;
  depth: number;
  isLast?: boolean;
}

// Shared chrome for the collapse/expand toggles — an inline, unstyled button that
// inherits the mono font so the JSON tree lines up.
const toggleBtn =
  'cursor-pointer hover:opacity-80 bg-transparent border-none p-0 font-[inherit] text-gray-600 dark:text-gray-300';
const muted = 'text-gray-400 dark:text-gray-500';
const primary = 'text-gray-800 dark:text-white/90';

function JsonNode({ value, initialCollapsed, depth, isLast = true }: JsonNodeProps) {
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  const indent = depth * 2;

  if (value === null) {
    return <span className={muted}>null{isLast ? '' : ','}</span>;
  }

  if (typeof value === 'boolean') {
    return (
      <span className="text-theme-purple-500">
        {value.toString()}{isLast ? '' : ','}
      </span>
    );
  }

  if (typeof value === 'number') {
    return (
      <span className="text-orange-500 dark:text-orange-400">
        {value}{isLast ? '' : ','}
      </span>
    );
  }

  if (typeof value === 'string') {
    return (
      <span className="text-success-600 dark:text-success-400">
        &quot;{value}&quot;{isLast ? '' : ','}
      </span>
    );
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return <span className={primary}>{'[]'}{isLast ? '' : ','}</span>;
    }

    if (collapsed) {
      return (
        <span>
          <button type="button" onClick={() => setCollapsed(false)} className={toggleBtn}>
            {'['}
            <span className={muted}> {value.length} items </span>
            {']'}
          </button>
          {isLast ? '' : ','}
        </span>
      );
    }

    return (
      <span>
        <button type="button" onClick={() => setCollapsed(true)} className={toggleBtn}>
          {'['}
        </button>
        {'\n'}
        {value.map((item, i) => (
          <span key={i}>
            {' '.repeat(indent + 2)}
            <JsonNode
              value={item}
              initialCollapsed={initialCollapsed}
              depth={depth + 1}
              isLast={i === value.length - 1}
            />
            {'\n'}
          </span>
        ))}
        {' '.repeat(indent)}<span className={primary}>{']'}</span>{isLast ? '' : ','}
      </span>
    );
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>);

    if (entries.length === 0) {
      return <span className={primary}>{'{}'}{isLast ? '' : ','}</span>;
    }

    if (collapsed) {
      return (
        <span>
          <button type="button" onClick={() => setCollapsed(false)} className={toggleBtn}>
            {'{'}
            <span className={muted}> {entries.length} keys </span>
            {'}'}
          </button>
          {isLast ? '' : ','}
        </span>
      );
    }

    return (
      <span>
        <button type="button" onClick={() => setCollapsed(true)} className={toggleBtn}>
          {'{'}
        </button>
        {'\n'}
        {entries.map(([key, val], i) => (
          <span key={key}>
            {' '.repeat(indent + 2)}
            <span className="text-brand-500 dark:text-brand-400">&quot;{key}&quot;</span>
            <span className="text-gray-600 dark:text-gray-300">: </span>
            <JsonNode
              value={val}
              initialCollapsed={initialCollapsed}
              depth={depth + 1}
              isLast={i === entries.length - 1}
            />
            {'\n'}
          </span>
        ))}
        {' '.repeat(indent)}<span className={primary}>{'}'}</span>
        {isLast ? '' : ','}
      </span>
    );
  }

  // Fallback for other types
  return (
    <span className={muted}>
      {String(value)}{isLast ? '' : ','}
    </span>
  );
}
