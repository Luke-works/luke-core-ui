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

function JsonNode({ value, initialCollapsed, depth, isLast = true }: JsonNodeProps) {
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  const indent = depth * 2;

  if (value === null) {
    return (
      <span style={{ color: 'var(--text-muted)' }}>
        null{isLast ? '' : ','}
      </span>
    );
  }

  if (typeof value === 'boolean') {
    return (
      <span style={{ color: 'var(--accent-purple)' }}>
        {value.toString()}{isLast ? '' : ','}
      </span>
    );
  }

  if (typeof value === 'number') {
    return (
      <span style={{ color: 'var(--accent-orange)' }}>
        {value}{isLast ? '' : ','}
      </span>
    );
  }

  if (typeof value === 'string') {
    return (
      <span style={{ color: 'var(--accent-green)' }}>
        &quot;{value}&quot;{isLast ? '' : ','}
      </span>
    );
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return <span style={{ color: 'var(--text-primary)' }}>{'[]'}{isLast ? '' : ','}</span>;
    }

    if (collapsed) {
      return (
        <span>
          <button
            type="button"
            onClick={() => setCollapsed(false)}
            className="cursor-pointer hover:opacity-80"
            style={{
              color: 'var(--text-secondary)',
              background: 'none',
              border: 'none',
              padding: 0,
              font: 'inherit',
            }}
          >
            {'['}
            <span style={{ color: 'var(--text-muted)' }}> {value.length} items </span>
            {']'}
          </button>
          {isLast ? '' : ','}
        </span>
      );
    }

    return (
      <span>
        <button
          type="button"
          onClick={() => setCollapsed(true)}
          className="cursor-pointer hover:opacity-80"
          style={{
            color: 'var(--text-secondary)',
            background: 'none',
            border: 'none',
            padding: 0,
            font: 'inherit',
          }}
        >
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
        {' '.repeat(indent)}{']'}{isLast ? '' : ','}
      </span>
    );
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>);

    if (entries.length === 0) {
      return <span style={{ color: 'var(--text-primary)' }}>{'{}'}{isLast ? '' : ','}</span>;
    }

    if (collapsed) {
      return (
        <span>
          <button
            type="button"
            onClick={() => setCollapsed(false)}
            className="cursor-pointer hover:opacity-80"
            style={{
              color: 'var(--text-secondary)',
              background: 'none',
              border: 'none',
              padding: 0,
              font: 'inherit',
            }}
          >
            {'{'}
            <span style={{ color: 'var(--text-muted)' }}> {entries.length} keys </span>
            {'}'}
          </button>
          {isLast ? '' : ','}
        </span>
      );
    }

    return (
      <span>
        <button
          type="button"
          onClick={() => setCollapsed(true)}
          className="cursor-pointer hover:opacity-80"
          style={{
            color: 'var(--text-secondary)',
            background: 'none',
            border: 'none',
            padding: 0,
            font: 'inherit',
          }}
        >
          {'{'}
        </button>
        {'\n'}
        {entries.map(([key, val], i) => (
          <span key={key}>
            {' '.repeat(indent + 2)}
            <span style={{ color: 'var(--accent-blue)' }}>&quot;{key}&quot;</span>
            <span style={{ color: 'var(--text-secondary)' }}>: </span>
            <JsonNode
              value={val}
              initialCollapsed={initialCollapsed}
              depth={depth + 1}
              isLast={i === entries.length - 1}
            />
            {'\n'}
          </span>
        ))}
        {' '.repeat(indent)}{'}'}
        {isLast ? '' : ','}
      </span>
    );
  }

  // Fallback for other types
  return (
    <span style={{ color: 'var(--text-muted)' }}>
      {String(value)}{isLast ? '' : ','}
    </span>
  );
}
