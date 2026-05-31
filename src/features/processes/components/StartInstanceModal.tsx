import { useState } from 'react';
import { X, Plus, Trash2, Play } from 'lucide-react';
import Button from '@/shared/ui/Button';
import type { StartProcessBody } from '@/features/processes/api/types';
import type { VariablesMap } from '@/shared/api/types';

/* ── Variable types Camunda accepts on start ──────────────── */

const VARIABLE_TYPES = [
  'String',
  'Boolean',
  'Integer',
  'Long',
  'Short',
  'Double',
  'Date',
  'Json',
  'Null',
] as const;

type VariableType = (typeof VARIABLE_TYPES)[number];

interface VariableRow {
  /** stable key for React list rendering */
  rowId: string;
  name: string;
  type: VariableType;
  value: string;
}

/* ── Shared input styles (match the rest of the admin forms) ─ */

const inputStyle: React.CSSProperties = {
  backgroundColor: 'var(--bg-elevated)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-md)',
  color: 'var(--text-primary)',
  padding: '0.5rem 0.75rem',
  width: '100%',
  outline: 'none',
  fontSize: '0.875rem',
};

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  appearance: 'none',
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 0.5rem center',
  paddingRight: '1.75rem',
};

const labelStyle: React.CSSProperties = { color: 'var(--text-secondary)' };

let rowCounter = 0;
function newRow(): VariableRow {
  rowCounter += 1;
  return { rowId: `var-${rowCounter}`, name: '', type: 'String', value: '' };
}

/**
 * Coerce a raw string + type into the JS value Camunda expects.
 * Throws on malformed numeric/JSON so the caller can surface a field error.
 */
function coerceValue(type: VariableType, raw: string): unknown {
  switch (type) {
    case 'Boolean':
      return raw.trim().toLowerCase() === 'true';
    case 'Integer':
    case 'Long':
    case 'Short': {
      const n = parseInt(raw, 10);
      if (Number.isNaN(n)) throw new Error('not an integer');
      return n;
    }
    case 'Double': {
      const n = parseFloat(raw);
      if (Number.isNaN(n)) throw new Error('not a number');
      return n;
    }
    case 'Json':
      // Validate, but send the JSON as a string (Camunda's "Json" value type).
      JSON.parse(raw);
      return raw;
    case 'Null':
      return null;
    case 'Date':
    case 'String':
    default:
      return raw;
  }
}

interface StartInstanceModalProps {
  open: boolean;
  processName: string;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (body: StartProcessBody) => void;
}

export default function StartInstanceModal({
  open,
  processName,
  isSubmitting,
  onClose,
  onSubmit,
}: StartInstanceModalProps) {
  const [businessKey, setBusinessKey] = useState('');
  const [variables, setVariables] = useState<VariableRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Reset form whenever the modal transitions to open for a fresh process.
  function reset() {
    setBusinessKey('');
    setVariables([]);
    setError(null);
  }

  function handleClose() {
    if (isSubmitting) return;
    reset();
    onClose();
  }

  function updateRow(rowId: string, patch: Partial<VariableRow>) {
    setVariables((rows) =>
      rows.map((r) => (r.rowId === rowId ? { ...r, ...patch } : r)),
    );
  }

  function handleSubmit() {
    setError(null);

    // Build the Camunda variables map, validating each row.
    const map: VariablesMap = {};
    for (const row of variables) {
      const name = row.name.trim();
      if (!name) {
        setError('Every variable needs a name.');
        return;
      }
      if (map[name]) {
        setError(`Duplicate variable name: "${name}".`);
        return;
      }
      try {
        map[name] = { value: coerceValue(row.type, row.value), type: row.type, valueInfo: {} };
      } catch {
        setError(`Variable "${name}" has an invalid ${row.type} value.`);
        return;
      }
    }

    const body: StartProcessBody = {
      businessKey: businessKey.trim() || undefined,
      variables: Object.keys(map).length > 0 ? map : undefined,
    };
    onSubmit(body);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-gray-900/50 backdrop-blur-[2px]"
        onClick={handleClose}
      />

      {/* Modal */}
      <div
        className="relative z-10 w-full max-w-lg max-h-[85vh] flex flex-col rounded-2xl border bg-white shadow-theme-xl dark:bg-gray-900"
        style={{ borderColor: 'var(--border)' }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 shrink-0 border-b"
          style={{ borderColor: 'var(--border)' }}
        >
          <div className="min-w-0">
            <h2 className="text-base font-medium" style={{ color: 'var(--text-primary)' }}>
              Start Instance
            </h2>
            <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }} title={processName}>
              {processName}
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="flex items-center justify-center w-9 h-9 rounded-lg"
            style={{ color: 'var(--text-muted)' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-4">
          {/* Business key */}
          <div>
            <label className="block text-sm mb-1" style={labelStyle}>
              Business Key <span style={{ color: 'var(--text-muted)' }}>(optional)</span>
            </label>
            <input
              type="text"
              placeholder="e.g. order-1024"
              value={businessKey}
              onChange={(e) => setBusinessKey(e.target.value)}
              style={inputStyle}
              onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--accent-blue)')}
              onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
            />
          </div>

          {/* Variables */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm" style={labelStyle}>
                Variables <span style={{ color: 'var(--text-muted)' }}>(optional)</span>
              </label>
              <Button variant="ghost" size="sm" onClick={() => setVariables((r) => [...r, newRow()])}>
                <span className="inline-flex items-center gap-1.5">
                  <Plus size={14} />
                  Add Variable
                </span>
              </Button>
            </div>

            {variables.length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                No variables. Click "Add Variable" to pass process variables.
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {/* Column headers */}
                <div className="flex items-center gap-2 px-1">
                  <span className="text-[11px] uppercase tracking-wider" style={{ color: 'var(--text-muted)', flex: '1 1 0' }}>Name</span>
                  <span className="text-[11px] uppercase tracking-wider" style={{ color: 'var(--text-muted)', width: 96 }}>Type</span>
                  <span className="text-[11px] uppercase tracking-wider" style={{ color: 'var(--text-muted)', flex: '1 1 0' }}>Value</span>
                  <span style={{ width: 28 }} />
                </div>

                {variables.map((row) => (
                  <div key={row.rowId} className="flex items-start gap-2">
                    <input
                      type="text"
                      placeholder="name"
                      value={row.name}
                      onChange={(e) => updateRow(row.rowId, { name: e.target.value })}
                      style={{ ...inputStyle, flex: '1 1 0' }}
                    />
                    <select
                      value={row.type}
                      onChange={(e) => updateRow(row.rowId, { type: e.target.value as VariableType, value: '' })}
                      style={{ ...selectStyle, width: 96 }}
                    >
                      {VARIABLE_TYPES.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>

                    {/* Type-aware value input */}
                    <div style={{ flex: '1 1 0' }}>
                      {row.type === 'Null' ? (
                        <input type="text" value="null" disabled style={{ ...inputStyle, opacity: 0.6 }} />
                      ) : row.type === 'Boolean' ? (
                        <select
                          value={row.value || 'true'}
                          onChange={(e) => updateRow(row.rowId, { value: e.target.value })}
                          style={selectStyle}
                        >
                          <option value="true">true</option>
                          <option value="false">false</option>
                        </select>
                      ) : row.type === 'Json' ? (
                        <textarea
                          placeholder='{"key":"value"}'
                          value={row.value}
                          onChange={(e) => updateRow(row.rowId, { value: e.target.value })}
                          rows={2}
                          style={{ ...inputStyle, fontFamily: 'var(--font-mono, monospace)', resize: 'vertical' }}
                        />
                      ) : (
                        <input
                          type={
                            ['Integer', 'Long', 'Short', 'Double'].includes(row.type)
                              ? 'number'
                              : row.type === 'Date'
                                ? 'datetime-local'
                                : 'text'
                          }
                          placeholder="value"
                          value={row.value}
                          onChange={(e) => updateRow(row.rowId, { value: e.target.value })}
                          style={inputStyle}
                        />
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => setVariables((rows) => rows.filter((r) => r.rowId !== row.rowId))}
                      className="flex items-center justify-center shrink-0"
                      style={{ width: 28, height: 36, color: 'var(--accent-red)' }}
                      title="Remove variable"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {error && (
            <p className="text-sm" style={{ color: 'var(--accent-red)' }}>
              {error}
            </p>
          )}
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-end gap-2 px-6 py-4 shrink-0 border-t"
          style={{ borderColor: 'var(--border)' }}
        >
          <Button variant="ghost" size="sm" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" onClick={handleSubmit} disabled={isSubmitting}>
            <span className="inline-flex items-center gap-1.5">
              <Play size={14} />
              {isSubmitting ? 'Starting...' : 'Start Instance'}
            </span>
          </Button>
        </div>
      </div>
    </div>
  );
}
