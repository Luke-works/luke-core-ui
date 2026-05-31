import axios from 'axios';
import { useAuthStore } from '@/features/auth/stores/authStore';
import { useTenantStore } from '@/shared/stores/tenantStore';

const baseURL = import.meta.env.VITE_API_BASE_URL
  ? `${import.meta.env.VITE_API_BASE_URL}/api`
  : '/api';

const calApi = axios.create({ baseURL });

calApi.interceptors.request.use((config) => {
  const { username, password } = useAuthStore.getState();
  if (username && password) config.headers.set('Authorization', `Basic ${btoa(`${username}:${password}`)}`);
  const tenantId = useTenantStore.getState().activeTenantId;
  if (tenantId) config.headers.set('X-Tenant-Id', tenantId);
  return config;
});

/* ── Types ─────────────────────────────────────────────────── */

export interface BusinessCalendar {
  id: string;
  calendarCode: string;
  name: string;
  description: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CalendarLocation {
  id: string;
  calendarId: string;
  locationCode: string;
  name: string;
  timezone: string;
  country: string | null;
  region: string | null;
  city: string | null;
  enabled: boolean;
  sortOrder: number;
}

export interface BusinessHours {
  id: string;
  locationId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  label: string | null;
  partial: boolean;
  capacityPercent: number;
  partialReason: string | null;
  active: boolean;
  effectiveFrom: string | null;
  effectiveUntil: string | null;
}

export interface Holiday {
  id: string;
  locationId: string;
  date: string;
  name: string;
  type: string;
  openFrom: string | null;
  openUntil: string | null;
  closed: boolean;
  description: string | null;
  recurring: boolean;
}

export interface ProcessCalendarAssociation {
  id: string;
  processDefinitionKey: string;
  calendarCode: string;
  slaBusinessDays: number | null;
  slaBusinessMinutes: number | null;
  priority: string | null;
  active: boolean;
}

export interface SlaResult {
  receivedDateTimeUtc: string;
  dueDateTimeUtc: string;
  dueDateTimeLocal: string;
  totalBusinessMinutesConsumed: number;
  calendarCode: string;
  locationsUsed: string[];
}

export interface AvailabilityWindow {
  start: string;
  end: string;
  durationMinutes: number;
  activeLocations: string[];
}

/* ── Calendar CRUD ─────────────────────────────────────────── */

export const getCalendars = async (): Promise<BusinessCalendar[]> =>
  (await calApi.get('/business-calendars')).data;

export const getCalendar = async (code: string): Promise<BusinessCalendar> =>
  (await calApi.get(`/business-calendars/${code}`)).data;

export const createCalendar = async (body: Partial<BusinessCalendar>): Promise<BusinessCalendar> =>
  (await calApi.post('/business-calendars', body)).data;

export const updateCalendar = async (code: string, body: Partial<BusinessCalendar>): Promise<BusinessCalendar> =>
  (await calApi.put(`/business-calendars/${code}`, body)).data;

export const deleteCalendar = async (code: string): Promise<void> =>
  calApi.delete(`/business-calendars/${code}`);

/* ── Location CRUD ─────────────────────────────────────────── */

export const getLocations = async (calCode: string): Promise<CalendarLocation[]> =>
  (await calApi.get(`/business-calendars/${calCode}/locations`)).data;

export const createLocation = async (calCode: string, body: Partial<CalendarLocation>): Promise<CalendarLocation> =>
  (await calApi.post(`/business-calendars/${calCode}/locations`, body)).data;

export const updateLocation = async (calCode: string, locCode: string, body: Partial<CalendarLocation>): Promise<CalendarLocation> =>
  (await calApi.put(`/business-calendars/${calCode}/locations/${locCode}`, body)).data;

export const deleteLocation = async (calCode: string, locCode: string): Promise<void> =>
  calApi.delete(`/business-calendars/${calCode}/locations/${locCode}`);

/* ── Business Hours CRUD ───────────────────────────────────── */

export const getBusinessHours = async (calCode: string, locCode: string): Promise<BusinessHours[]> =>
  (await calApi.get(`/business-calendars/${calCode}/locations/${locCode}/business-hours`)).data;

export const createBusinessHours = async (calCode: string, locCode: string, body: Partial<BusinessHours>): Promise<BusinessHours> =>
  (await calApi.post(`/business-calendars/${calCode}/locations/${locCode}/business-hours`, body)).data;

export const deleteBusinessHoursById = async (calCode: string, locCode: string, id: string): Promise<void> =>
  calApi.delete(`/business-calendars/${calCode}/locations/${locCode}/business-hours/${id}`);

/* ── Holiday CRUD ──────────────────────────────────────────── */

export const getHolidays = async (calCode: string, locCode: string, from?: string, to?: string): Promise<Holiday[]> =>
  (await calApi.get(`/business-calendars/${calCode}/locations/${locCode}/holidays`, { params: { from, to } })).data;

export const createHoliday = async (calCode: string, locCode: string, body: Partial<Holiday>): Promise<Holiday> =>
  (await calApi.post(`/business-calendars/${calCode}/locations/${locCode}/holidays`, body)).data;

export const autoImportHolidays = async (calCode: string, locCode: string, year: number): Promise<any> =>
  (await calApi.post(`/business-calendars/${calCode}/locations/${locCode}/holidays/auto-import?year=${year}`)).data;

export const previewHolidays = async (calCode: string, locCode: string, countryCode: string, year: number): Promise<any> =>
  (await calApi.get(`/business-calendars/${calCode}/locations/${locCode}/holidays/preview?countryCode=${countryCode}&year=${year}`)).data;

export const getAvailableCountries = async (calCode: string, locCode: string): Promise<any[]> =>
  (await calApi.get(`/business-calendars/${calCode}/locations/${locCode}/holidays/available-countries`)).data;

export const deleteHolidayById = async (calCode: string, locCode: string, id: string): Promise<void> =>
  calApi.delete(`/business-calendars/${calCode}/locations/${locCode}/holidays/${id}`);

/* ── Process Calendar Association ──────────────────────────── */

export const getProcessAssociations = async (): Promise<ProcessCalendarAssociation[]> =>
  (await calApi.get('/process-calendars')).data;

export const createProcessAssociation = async (body: Partial<ProcessCalendarAssociation>): Promise<ProcessCalendarAssociation> =>
  (await calApi.post('/process-calendars', body)).data;

export const deleteProcessAssociation = async (key: string): Promise<void> =>
  calApi.delete(`/process-calendars/${key}`);

/* ── SLA Engine ────────────────────────────────────────────── */

export const calculateSla = async (body: { calendarCode: string; receivedDateTime: string; receivedTimezone: string; sla: { businessDays: number; businessMinutes: number } }): Promise<SlaResult> =>
  (await calApi.post('/sla/calculate', body)).data;

export const isCalendarOpen = async (calCode: string): Promise<{ open: boolean; openLocations: string[] }> =>
  (await calApi.get(`/business-calendars/${calCode}/is-open`)).data;

export const getAvailability = async (calCode: string, from: string, to: string): Promise<AvailabilityWindow[]> =>
  (await calApi.get(`/business-calendars/${calCode}/availability`, { params: { from, to } })).data;
