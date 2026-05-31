import axios from 'axios';
import { useAuthStore } from '@/features/auth/stores/authStore';
import { useTenantStore } from '@/shared/stores/tenantStore';

const baseURL = import.meta.env.VITE_CAMUNDA_BASE_URL
  ? `${import.meta.env.VITE_CAMUNDA_BASE_URL}/api/database`
  : '/api/database';

const dbApi = axios.create({ baseURL });

dbApi.interceptors.request.use((config) => {
  const { username, password } = useAuthStore.getState();
  if (username && password) {
    const encoded = btoa(`${username}:${password}`);
    config.headers.set('Authorization', `Basic ${encoded}`);
  }
  const tenantId = useTenantStore.getState().activeTenantId;
  if (tenantId) {
    config.headers.set('X-Tenant-Id', tenantId);
  }
  return config;
});

export interface TableInfo {
  name: string;
  type: string;
  schema: string;
  tenantAware: boolean;
}

export interface ColumnInfo {
  name: string;
  type: string;
  size: number;
  nullable: boolean;
  position: number;
}

export interface TableData {
  columns: string[];
  rows: Record<string, string | null>[];
  total: number;
  offset: number;
  limit: number;
}

export interface QueryResult {
  columns: string[];
  rows: Record<string, string | null>[];
  rowCount: number;
  durationMs: number;
  error?: string;
}

export interface DatabaseInfo {
  product: string;
  version: string;
  driver: string;
  driverVersion: string;
  url: string;
  username: string;
  maxConnections: number;
}

export async function getTables(): Promise<TableInfo[]> {
  const { data } = await dbApi.get('/tables');
  return data;
}

export async function getColumns(tableName: string): Promise<ColumnInfo[]> {
  const { data } = await dbApi.get(`/tables/${tableName}/columns`);
  return data;
}

export async function getTableRowCount(tableName: string): Promise<{ table: string; count: number }> {
  const { data } = await dbApi.get(`/tables/${tableName}/count`);
  return data;
}

export async function getTableData(tableName: string, offset = 0, limit = 50): Promise<TableData> {
  const { data } = await dbApi.get(`/tables/${tableName}/data`, { params: { offset, limit } });
  return data;
}

export async function executeQuery(sql: string): Promise<QueryResult> {
  const { data } = await dbApi.post('/query', { sql });
  return data;
}

export async function getDatabaseInfo(): Promise<DatabaseInfo> {
  const { data } = await dbApi.get('/info');
  return data;
}
