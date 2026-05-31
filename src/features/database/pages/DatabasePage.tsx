import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Table2,
  Play,
  ChevronRight,
  ChevronDown,
  Columns3,
  Info,
  Loader2,
  AlertTriangle,
  Filter,
} from 'lucide-react';
import PageHeader from '@/shared/layout/PageHeader';
import Card from '@/shared/ui/Card';
import Button from '@/shared/ui/Button';
import Tabs from '@/shared/ui/Tabs';
import {
  getTables,
  getColumns,
  getTableData,
  executeQuery,
  getDatabaseInfo,
  type TableInfo,
  type ColumnInfo,
  type QueryResult,
} from '@/features/database/api/endpoints';

const tabs = [
  { id: 'browser', label: 'Schema Browser' },
  { id: 'query', label: 'SQL Query' },
  { id: 'info', label: 'DB Info' },
];

export default function DatabasePage() {
  const [activeTab, setActiveTab] = useState('browser');

  return (
    <div>
      <PageHeader
        title="Database"
        subtitle="Browse schema, view data, and run queries"
      />
      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab}>
        <div className="mt-4">
          {activeTab === 'browser' && <SchemaBrowser />}
          {activeTab === 'query' && <SqlQueryEditor />}
          {activeTab === 'info' && <DbInfoPanel />}
        </div>
      </Tabs>
    </div>
  );
}

/* ── Schema Browser ── */
function SchemaBrowser() {
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 50;

  const tablesQuery = useQuery({
    queryKey: ['db-tables'],
    queryFn: getTables,
  });

  const columnsQuery = useQuery({
    queryKey: ['db-columns', selectedTable],
    queryFn: () => getColumns(selectedTable!),
    enabled: !!selectedTable,
  });

  const dataQuery = useQuery({
    queryKey: ['db-table-data', selectedTable, page],
    queryFn: () => getTableData(selectedTable!, page * PAGE_SIZE, PAGE_SIZE),
    enabled: !!selectedTable,
  });

  const toggleExpand = (name: string) => {
    setExpandedTables((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const selectTable = (name: string) => {
    setSelectedTable(name);
    setPage(0);
    setExpandedTables((prev) => new Set(prev).add(name));
  };

  return (
    <div className="flex gap-4" style={{ minHeight: 500 }}>
      {/* Left: Table list */}
      <div
        className="shrink-0 overflow-y-auto rounded-lg"
        style={{
          width: 260,
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
        }}
      >
        <div
          className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wider"
          style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}
        >
          Tables ({tablesQuery.data?.length ?? 0})
        </div>
        {tablesQuery.isLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 size={18} className="animate-spin" style={{ color: 'var(--text-muted)' }} />
          </div>
        )}
        {tablesQuery.data?.map((t: TableInfo) => (
          <TableTreeItem
            key={t.name}
            table={t}
            isSelected={selectedTable === t.name}
            isExpanded={expandedTables.has(t.name)}
            onSelect={() => selectTable(t.name)}
            onToggle={() => toggleExpand(t.name)}
            columns={selectedTable === t.name ? columnsQuery.data : undefined}
          />
        ))}
      </div>

      {/* Right: Data view */}
      <div className="flex-1 min-w-0">
        {!selectedTable ? (
          <div className="flex flex-col items-center justify-center h-full" style={{ color: 'var(--text-muted)' }}>
            <Table2 size={40} className="mb-3 opacity-40" />
            <p className="text-sm">Select a table to view data</p>
          </div>
        ) : (
          <Card>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Table2 size={16} style={{ color: 'var(--accent-blue)' }} />
                <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                  {selectedTable}
                </span>
                {dataQuery.data && (
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    ({dataQuery.data.total} rows)
                  </span>
                )}
                {(dataQuery.data as any)?.filtered && (
                  <span
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium"
                    style={{ backgroundColor: 'rgba(59,130,246,0.1)', color: 'var(--accent-blue)' }}
                  >
                    <Filter size={10} /> tenant filtered
                  </span>
                )}
              </div>
              {dataQuery.data && dataQuery.data.total > PAGE_SIZE && (
                <div className="flex items-center gap-2 text-xs">
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={page === 0}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    Prev
                  </Button>
                  <span style={{ color: 'var(--text-secondary)' }}>
                    Page {page + 1} of {Math.ceil(dataQuery.data.total / PAGE_SIZE)}
                  </span>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={(page + 1) * PAGE_SIZE >= dataQuery.data.total}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              )}
            </div>
            <ResultsTable
              columns={dataQuery.data?.columns}
              rows={dataQuery.data?.rows}
              isLoading={dataQuery.isLoading}
            />
          </Card>
        )}
      </div>
    </div>
  );
}

/* ── Table tree item ── */
function TableTreeItem({
  table,
  isSelected,
  isExpanded,
  onSelect,
  onToggle,
  columns,
}: {
  table: TableInfo;
  isSelected: boolean;
  isExpanded: boolean;
  onSelect: () => void;
  onToggle: () => void;
  columns?: ColumnInfo[];
}) {
  return (
    <div>
      <div
        className="flex items-center gap-1.5 px-2 py-1.5 cursor-pointer text-sm transition-colors duration-100"
        style={{
          backgroundColor: isSelected ? 'var(--bg-elevated)' : 'transparent',
          color: isSelected ? 'var(--accent-blue)' : 'var(--text-secondary)',
        }}
        onClick={onSelect}
      >
        <button
          onClick={(e) => { e.stopPropagation(); onToggle(); }}
          className="shrink-0 p-0 bg-transparent border-none cursor-pointer"
          style={{ color: 'var(--text-muted)' }}
        >
          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>
        <Table2 size={14} className="shrink-0" />
        <span className="truncate">{table.name}</span>
      </div>
      {isExpanded && columns && (
        <div className="ml-7 py-0.5">
          {columns.map((col) => (
            <div
              key={col.name}
              className="flex items-center gap-1.5 px-2 py-1 text-xs"
              style={{ color: 'var(--text-muted)' }}
            >
              <Columns3 size={12} className="shrink-0 opacity-50" />
              <span className="truncate">{col.name}</span>
              <span className="ml-auto shrink-0 opacity-60">{col.type}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── SQL Query Editor ── */
function SqlQueryEditor() {
  const [sql, setSql] = useState('SELECT * FROM act_id_user LIMIT 20');
  const [result, setResult] = useState<QueryResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const runQuery = useCallback(async () => {
    if (!sql.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await executeQuery(sql);
      if (res.error) {
        setError(res.error);
        setResult(null);
      } else {
        setResult(res);
      }
    } catch (e: any) {
      setError(e.response?.data?.error || e.message);
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, [sql]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      runQuery();
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            SQL Editor
          </span>
          <div className="flex items-center gap-2">
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {navigator.platform.includes('Mac') ? 'Cmd' : 'Ctrl'}+Enter to run
            </span>
            <Button size="sm" onClick={runQuery} disabled={loading || !sql.trim()}>
              {loading ? <Loader2 size={14} className="animate-spin mr-1.5" /> : <Play size={14} className="mr-1.5" />}
              Run
            </Button>
          </div>
        </div>
        <textarea
          value={sql}
          onChange={(e) => setSql(e.target.value)}
          onKeyDown={handleKeyDown}
          spellCheck={false}
          rows={6}
          className="w-full resize-y text-sm font-mono p-3 rounded-md outline-none"
          style={{
            backgroundColor: 'var(--bg-base)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
          }}
          placeholder="SELECT * FROM ..."
        />
      </Card>

      {error && (
        <div
          className="flex items-start gap-2 px-4 py-3 rounded-md text-sm"
          style={{
            backgroundColor: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            color: 'var(--accent-red)',
            borderRadius: 'var(--radius-md)',
          }}
        >
          <AlertTriangle size={16} className="shrink-0 mt-0.5" />
          <span className="font-mono text-xs">{error}</span>
        </div>
      )}

      {result && (
        <Card>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              Results
            </span>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {result.rowCount} rows in {result.durationMs}ms
            </span>
          </div>
          <ResultsTable columns={result.columns} rows={result.rows} isLoading={false} />
        </Card>
      )}
    </div>
  );
}

/* ── DB Info Panel ── */
function DbInfoPanel() {
  const infoQuery = useQuery({
    queryKey: ['db-info'],
    queryFn: getDatabaseInfo,
  });

  if (infoQuery.isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 size={20} className="animate-spin" style={{ color: 'var(--text-muted)' }} />
      </div>
    );
  }

  const info = infoQuery.data;
  if (!info) return null;

  const items = [
    { label: 'Database', value: info.product },
    { label: 'Version', value: info.version },
    { label: 'Driver', value: info.driver },
    { label: 'Driver Version', value: info.driverVersion },
    { label: 'URL', value: info.url },
    { label: 'User', value: info.username },
    { label: 'Max Connections', value: String(info.maxConnections) },
  ];

  return (
    <Card>
      <div className="flex items-center gap-2 mb-4">
        <Info size={16} style={{ color: 'var(--accent-blue)' }} />
        <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
          Connection Info
        </span>
      </div>
      <div className="grid grid-cols-1 gap-3">
        {items.map((item) => (
          <div key={item.label} className="flex items-start gap-4">
            <span
              className="text-xs font-medium shrink-0"
              style={{ color: 'var(--text-muted)', width: 120 }}
            >
              {item.label}
            </span>
            <span
              className="text-sm font-mono break-all"
              style={{ color: 'var(--text-primary)' }}
            >
              {item.value}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}

/* ── Shared Results Table ── */
function ResultsTable({
  columns,
  rows,
  isLoading,
}: {
  columns?: string[];
  rows?: Record<string, string | null>[];
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={18} className="animate-spin" style={{ color: 'var(--text-muted)' }} />
      </div>
    );
  }

  if (!columns || !rows) return null;

  if (rows.length === 0) {
    return (
      <div className="text-center py-8 text-sm" style={{ color: 'var(--text-muted)' }}>
        No data
      </div>
    );
  }

  return (
    <div className="overflow-auto" style={{ maxHeight: 500 }}>
      <table className="w-full text-xs font-mono" style={{ borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col}
                className="text-left px-3 py-2 font-semibold whitespace-nowrap sticky top-0"
                style={{
                  backgroundColor: 'var(--bg-elevated)',
                  color: 'var(--text-secondary)',
                  borderBottom: '1px solid var(--border)',
                }}
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={i}
              className="transition-colors duration-75"
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-elevated)')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              {columns.map((col) => (
                <td
                  key={col}
                  className="px-3 py-1.5 whitespace-nowrap"
                  style={{
                    color: row[col] === null ? 'var(--text-muted)' : 'var(--text-primary)',
                    borderBottom: '1px solid var(--border)',
                    maxWidth: 300,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    fontStyle: row[col] === null ? 'italic' : 'normal',
                  }}
                  title={row[col] ?? 'NULL'}
                >
                  {row[col] ?? 'NULL'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
