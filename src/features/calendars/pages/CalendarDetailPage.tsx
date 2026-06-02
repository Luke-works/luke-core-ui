import { useState, useMemo, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  CalendarDays, MapPin, Clock, Sun, Calculator, BarChart3,
  Plus, Trash2, Download, Info, CheckCircle2, XCircle,
  Hash, Type, FileText, ToggleLeft,
} from 'lucide-react';

import DetailPanel from '@/shared/ui/DetailPanel';
import Tabs from '@/shared/ui/Tabs';
import Badge from '@/shared/ui/Badge';
import Button from '@/shared/ui/Button';
import Card from '@/shared/ui/Card';
import Skeleton from '@/shared/ui/Skeleton';
import SearchInput from '@/shared/ui/SearchInput';
import { absoluteTime } from '@/shared/utils/date';
import { TIMEZONES, COUNTRIES, REGIONS, CITIES } from '@/features/calendars/data/locations';

import {
  getCalendar,
  getLocations,
  createLocation,
  deleteLocation,
  getBusinessHours,
  createBusinessHours,
  deleteBusinessHoursById,
  getHolidays,
  autoImportHolidays,
  deleteHolidayById,
  calculateSla,
  isCalendarOpen,
  getAvailability,
  getProcessAssociations,
  createProcessAssociation,
  deleteProcessAssociation,
  type BusinessCalendar,
  type CalendarLocation,
  type BusinessHours,
  type Holiday,
  type ProcessCalendarAssociation,
  type SlaResult,
  type AvailabilityWindow,
} from '@/features/calendars/api/endpoints';

/* ── Helpers ───────────────────────────────────────────────── */

const DAY_NAMES = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function getMonday(d: Date): string {
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d);
  monday.setDate(diff);
  return monday.toISOString().slice(0, 10);
}

function getFriday(d: Date): string {
  const monday = new Date(getMonday(d));
  monday.setDate(monday.getDate() + 4);
  return monday.toISOString().slice(0, 10);
}

/* ── Shared input style ────────────────────────────────────── */

const inputStyle: React.CSSProperties = {
  backgroundColor: 'var(--bg-elevated)',
  border: '1px solid var(--border)',
  color: 'var(--text-primary)',
};

const labelStyle: React.CSSProperties = {
  color: 'var(--text-secondary)',
};

/* ── Table header style ────────────────────────────────────── */

const thStyle: React.CSSProperties = {
  color: 'var(--text-primary)',
  borderBottom: '2px solid var(--border)',
  position: 'sticky' as const,
  top: 0,
  backgroundColor: 'var(--bg-surface)',
};

/* ================================================================== */
/*  Component                                                          */
/* ================================================================== */

export default function CalendarDetailPage() {
  const { calendarCode } = useParams<{ calendarCode: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  /* ── Core state ──────────────────────────────────────────── */

  const [activeTab, setActiveTab] = useState('locations');
  const [selectedLocationCode, setSelectedLocationCode] = useState<string | null>(null);
  const [showAddProcess, setShowAddProcess] = useState(false);
  const [processForm, setProcessForm] = useState({ processDefinitionKey: '', slaBusinessDays: 0, slaBusinessMinutes: 0, priority: '' });

  /* ── Form visibility toggles ─────────────────────────────── */

  const [showAddLocation, setShowAddLocation] = useState(false);
  const [showAddHours, setShowAddHours] = useState(false);
  const [showAddHoliday, setShowAddHoliday] = useState(false);

  /* ── Form state: Add Location ───────────────────────────── */

  const [locForm, setLocForm] = useState({
    locationCode: '', name: '', timezone: '', country: '', region: '', city: '',
  });

  /* ── Form state: Add Business Hours ─────────────────────── */

  const [hoursForm, setHoursForm] = useState({
    dayOfWeek: 1, startTime: '09:00', endTime: '17:00', label: '', partial: false, capacityPercent: 100,
  });

  /* ── Form state: Add Holiday ────────────────────────────── */

  const [holidayForm, setHolidayForm] = useState({
    date: '', name: '', type: 'PUBLIC_HOLIDAY', closed: true, description: '',
  });

  /* ── Holiday search + auto-import year ──────────────────── */

  const [holidaySearch, setHolidaySearch] = useState('');
  const [importYear, setImportYear] = useState(new Date().getFullYear());
  const [showImport, setShowImport] = useState(false);

  /* ── SLA Calculator state ───────────────────────────────── */

  const [slaForm, setSlaForm] = useState({
    receivedDateTime: '', receivedTimezone: '', slaBusinessDays: 0, slaBusinessMinutes: 0,
  });
  const [slaResult, setSlaResult] = useState<SlaResult | null>(null);

  /* ── Availability state ─────────────────────────────────── */

  const [availFrom, setAvailFrom] = useState(getMonday(new Date()));
  const [availTo, setAvailTo] = useState(getFriday(new Date()));

  /* ── Queries ─────────────────────────────────────────────── */

  const calendarQuery = useQuery({
    queryKey: ['calendar', calendarCode],
    queryFn: () => getCalendar(calendarCode!),
    enabled: !!calendarCode,
  });

  const locationsQuery = useQuery({
    queryKey: ['calendarLocations', calendarCode],
    queryFn: () => getLocations(calendarCode!),
    enabled: !!calendarCode,
  });

  const openQuery = useQuery({
    queryKey: ['calendarOpen', calendarCode],
    queryFn: () => isCalendarOpen(calendarCode!),
    enabled: !!calendarCode,
    refetchInterval: 60_000,
  });

  const hoursQuery = useQuery({
    queryKey: ['businessHours', calendarCode, selectedLocationCode],
    queryFn: () => getBusinessHours(calendarCode!, selectedLocationCode!),
    enabled: !!calendarCode && !!selectedLocationCode,
  });

  const holidaysQuery = useQuery({
    queryKey: ['holidays', calendarCode, selectedLocationCode],
    queryFn: () => getHolidays(calendarCode!, selectedLocationCode!),
    enabled: !!calendarCode && !!selectedLocationCode,
  });

  const availabilityQuery = useQuery({
    queryKey: ['availability', calendarCode, availFrom, availTo],
    queryFn: () => getAvailability(calendarCode!, availFrom, availTo),
    enabled: !!calendarCode && !!availFrom && !!availTo && activeTab === 'availability',
  });

  /* ── Auto-select first location when switching tabs ──────── */

  const autoSelectFirst = useCallback(() => {
    if (!selectedLocationCode && locationsQuery.data && locationsQuery.data.length > 0) {
      setSelectedLocationCode(locationsQuery.data[0].locationCode);
    }
  }, [selectedLocationCode, locationsQuery.data]);

  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab);
    if (tab === 'hours' || tab === 'holidays') {
      autoSelectFirst();
    }
  }, [autoSelectFirst]);

  /* ── Set default SLA timezone from first location ────────── */

  useEffect(() => {
    if (locationsQuery.data && locationsQuery.data.length > 0 && !slaForm.receivedTimezone) {
      setSlaForm((prev) => ({ ...prev, receivedTimezone: locationsQuery.data![0].timezone }));
    }
  }, [locationsQuery.data, slaForm.receivedTimezone]);

  /* ── Mutations ──────────────────────────────────────────── */

  const createLocationMut = useMutation({
    mutationFn: () => createLocation(calendarCode!, locForm),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendarLocations', calendarCode] });
      toast.success('Location created');
      setShowAddLocation(false);
      setLocForm({ locationCode: '', name: '', timezone: '', country: '', region: '', city: '' });
    },
    onError: () => toast.error('Failed to create location'),
  });

  const deleteLocationMut = useMutation({
    mutationFn: (locCode: string) => deleteLocation(calendarCode!, locCode),
    onSuccess: (_d, locCode) => {
      queryClient.invalidateQueries({ queryKey: ['calendarLocations', calendarCode] });
      if (selectedLocationCode === locCode) setSelectedLocationCode(null);
      toast.success('Location deleted');
    },
    onError: () => toast.error('Failed to delete location'),
  });

  const createHoursMut = useMutation({
    mutationFn: () => createBusinessHours(calendarCode!, selectedLocationCode!, hoursForm),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['businessHours', calendarCode, selectedLocationCode] });
      toast.success('Business hours added');
      setShowAddHours(false);
      setHoursForm({ dayOfWeek: 1, startTime: '09:00', endTime: '17:00', label: '', partial: false, capacityPercent: 100 });
    },
    onError: () => toast.error('Failed to add business hours'),
  });

  const deleteHoursMut = useMutation({
    mutationFn: (id: string) => deleteBusinessHoursById(calendarCode!, selectedLocationCode!, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['businessHours', calendarCode, selectedLocationCode] });
      toast.success('Business hours deleted');
    },
    onError: () => toast.error('Failed to delete business hours'),
  });

  const deleteHolidayMut = useMutation({
    mutationFn: (id: string) => deleteHolidayById(calendarCode!, selectedLocationCode!, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['holidays', calendarCode, selectedLocationCode] });
      toast.success('Holiday deleted');
    },
    onError: () => toast.error('Failed to delete holiday'),
  });

  const autoImportMut = useMutation({
    mutationFn: () => autoImportHolidays(calendarCode!, selectedLocationCode!, importYear),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['holidays', calendarCode, selectedLocationCode] });
      toast.success(`Imported ${data.imported ?? 0} holidays`);
      setShowImport(false);
    },
    onError: () => toast.error('Failed to auto-import holidays'),
  });

  const slaMut = useMutation({
    mutationFn: () =>
      calculateSla({
        calendarCode: calendarCode!,
        receivedDateTime: slaForm.receivedDateTime,
        receivedTimezone: slaForm.receivedTimezone,
        sla: {
          businessDays: slaForm.slaBusinessDays,
          businessMinutes: slaForm.slaBusinessMinutes,
        },
      }),
    onSuccess: (data) => setSlaResult(data),
    onError: () => toast.error('SLA calculation failed'),
  });

  /* ── Process associations ────────────────────────────────── */

  const processQuery = useQuery({
    queryKey: ['processAssociations', calendarCode],
    queryFn: async () => {
      const all = await getProcessAssociations();
      return all.filter(a => a.calendarCode === calendarCode);
    },
    enabled: !!calendarCode && activeTab === 'processes',
  });

  const createProcessMut = useMutation({
    mutationFn: () => createProcessAssociation({ ...processForm, calendarCode: calendarCode! }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['processAssociations'] });
      toast.success('Process associated');
      setShowAddProcess(false);
      setProcessForm({ processDefinitionKey: '', slaBusinessDays: 0, slaBusinessMinutes: 0, priority: '' });
    },
    onError: () => toast.error('Failed to associate process'),
  });

  const deleteProcessMut = useMutation({
    mutationFn: (key: string) => deleteProcessAssociation(key),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['processAssociations'] });
      toast.success('Association removed');
    },
    onError: () => toast.error('Failed to remove association'),
  });

  /* ── Tab definitions ─────────────────────────────────────── */

  const tabs = useMemo(() => [
    { id: 'locations', label: 'Locations' },
    { id: 'hours', label: 'Business Hours' },
    { id: 'holidays', label: 'Holidays' },
    { id: 'processes', label: 'Processes' },
    { id: 'sla', label: 'SLA Calculator' },
    { id: 'availability', label: 'Availability' },
  ], []);

  /* ── Filtered holidays ──────────────────────────────────── */

  const filteredHolidays = useMemo(() => {
    if (!holidaysQuery.data) return [];
    if (!holidaySearch.trim()) return holidaysQuery.data;
    const q = holidaySearch.toLowerCase();
    return holidaysQuery.data.filter(
      (h) =>
        h.name.toLowerCase().includes(q) ||
        h.date.includes(q) ||
        h.type.toLowerCase().includes(q),
    );
  }, [holidaysQuery.data, holidaySearch]);

  /* ── Loading state ──────────────────────────────────────── */

  if (calendarQuery.isLoading) {
    return (
      <div className="p-6">
        <Skeleton width="40%" height="1.5rem" />
        <Skeleton height="120px" className="mt-4" />
        <Skeleton height="300px" className="mt-4" />
      </div>
    );
  }

  if (calendarQuery.isError || !calendarQuery.data) {
    return (
      <div className="p-6">
        <Card>
          <div className="flex flex-col items-center gap-3 py-8">
            <XCircle size={32} style={{ color: 'var(--accent-red)' }} />
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Failed to load calendar. It may not exist.
            </p>
            <Button variant="secondary" size="sm" onClick={() => navigate('/calendars')}>
              Back to Calendars
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const cal: BusinessCalendar = calendarQuery.data;

  /* ── Render ─────────────────────────────────────────────── */

  return (
    <div className="flex flex-col p-6" style={{ minHeight: 0 }}>
      {/* Breadcrumb */}
      <div
        className="flex items-center gap-1.5 mb-4 text-sm shrink-0"
        style={{ borderBottom: '1px solid var(--border)', paddingBottom: 8 }}
      >
        <button
          className="bg-transparent border-none cursor-pointer p-0"
          style={{ color: 'var(--accent-blue)' }}
          onClick={() => navigate('/dashboard')}
        >
          Dashboard
        </button>
        <span style={{ color: 'var(--text-muted)' }}>&raquo;</span>
        <button
          className="bg-transparent border-none cursor-pointer p-0"
          style={{ color: 'var(--accent-blue)' }}
          onClick={() => navigate('/calendars')}
        >
          Calendars
        </button>
        <span style={{ color: 'var(--text-muted)' }}>&raquo;</span>
        <span style={{ color: 'var(--text-primary)' }}>{calendarCode}</span>
      </div>

      {/* Detail Panel */}
      <DetailPanel
        title="Calendar Details"
        icon={CalendarDays}
        defaultOpen={false}
        badge={
          <Badge variant={cal.active ? 'success' : 'danger'}>
            {cal.active ? 'Active' : 'Inactive'}
          </Badge>
        }
        items={[
          { label: 'Calendar Code', value: cal.calendarCode, icon: Hash },
          { label: 'Name', value: cal.name, icon: Type },
          { label: 'Description', value: cal.description ?? '--', icon: FileText, muted: !cal.description },
          { label: 'Active', value: cal.active ? 'Yes' : 'No', icon: ToggleLeft, accent: cal.active ? 'green' : 'red' },
          { label: 'Created', value: absoluteTime(cal.createdAt), icon: Clock },
          { label: 'Updated', value: absoluteTime(cal.updatedAt), icon: Clock },
        ]}
      />

      {/* Status bar */}
      <div
        className="flex items-center gap-3 px-4 py-2.5 mb-3"
        style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
        }}
      >
        {openQuery.isLoading ? (
          <Skeleton width="200px" height="1rem" />
        ) : openQuery.data ? (
          <>
            {openQuery.data.open ? (
              <CheckCircle2 size={16} style={{ color: 'var(--accent-green)' }} />
            ) : (
              <XCircle size={16} style={{ color: 'var(--accent-red)' }} />
            )}
            <span
              className="text-sm font-medium"
              style={{ color: openQuery.data.open ? 'var(--accent-green)' : 'var(--accent-red)' }}
            >
              {openQuery.data.open ? 'Currently Open' : 'Currently Closed'}
            </span>
            {openQuery.data.open && openQuery.data.openLocations.length > 0 && (
              <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                -- {openQuery.data.openLocations.join(', ')}
              </span>
            )}
          </>
        ) : (
          <span className="text-sm" style={{ color: 'var(--text-muted)' }}>Unable to determine status</span>
        )}
      </div>

      {/* Tabs */}
      <div
        style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
        }}
      >
        <Tabs tabs={tabs} activeTab={activeTab} onChange={handleTabChange}>
          <div className="p-4">

            {/* ── Locations Tab ────────────────────────────────── */}
            {activeTab === 'locations' && (
              <LocationsTab
                locations={locationsQuery.data ?? []}
                isLoading={locationsQuery.isLoading}
                selectedLocationCode={selectedLocationCode}
                onSelectLocation={setSelectedLocationCode}
                onDeleteLocation={(code) => deleteLocationMut.mutate(code)}
                showAddForm={showAddLocation}
                onToggleAddForm={() => setShowAddLocation((v) => !v)}
                form={locForm}
                onFormChange={setLocForm}
                onSubmit={() => createLocationMut.mutate()}
                isSubmitting={createLocationMut.isPending}
              />
            )}

            {/* ── Business Hours Tab ──────────────────────────── */}
            {activeTab === 'hours' && (
              <BusinessHoursTab
                selectedLocationCode={selectedLocationCode}
                hours={hoursQuery.data ?? []}
                isLoading={hoursQuery.isLoading}
                onDeleteHours={(id) => deleteHoursMut.mutate(id)}
                showAddForm={showAddHours}
                onToggleAddForm={() => setShowAddHours((v) => !v)}
                form={hoursForm}
                onFormChange={setHoursForm}
                onSubmit={() => createHoursMut.mutate()}
                isSubmitting={createHoursMut.isPending}
              />
            )}

            {/* ── Holidays Tab ────────────────────────────────── */}
            {activeTab === 'holidays' && (
              <HolidaysTab
                selectedLocationCode={selectedLocationCode}
                holidays={filteredHolidays}
                isLoading={holidaysQuery.isLoading}
                onDeleteHoliday={(id) => deleteHolidayMut.mutate(id)}
                searchValue={holidaySearch}
                onSearchChange={setHolidaySearch}
                showImport={showImport}
                onToggleImport={() => setShowImport((v) => !v)}
                importYear={importYear}
                onImportYearChange={setImportYear}
                onAutoImport={() => autoImportMut.mutate()}
                isImporting={autoImportMut.isPending}
                showAddForm={showAddHoliday}
                onToggleAddForm={() => setShowAddHoliday((v) => !v)}
                form={holidayForm}
                onFormChange={setHolidayForm}
              />
            )}

            {/* ── Processes Tab ─────────────────────────────── */}
            {activeTab === 'processes' && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                    Associated Processes ({processQuery.data?.length ?? 0})
                  </h3>
                  <Button size="sm" variant="primary" onClick={() => setShowAddProcess(v => !v)}>
                    <Plus size={14} className="mr-1" /> Associate Process
                  </Button>
                </div>

                {showAddProcess && (
                  <Card className="mb-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                      <div>
                        <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Process Definition Key</label>
                        <input type="text" value={processForm.processDefinitionKey}
                          onChange={(e) => setProcessForm(f => ({ ...f, processDefinitionKey: e.target.value }))}
                          placeholder="e.g. orderProcess"
                          className="w-full h-8 px-2 text-sm rounded-md outline-none"
                          style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Priority</label>
                        <select value={processForm.priority}
                          onChange={(e) => setProcessForm(f => ({ ...f, priority: e.target.value }))}
                          className="w-full h-8 px-2 text-sm rounded-md outline-none cursor-pointer"
                          style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
                          <option value="">Select Priority...</option>
                          <option value="LOW">Low</option>
                          <option value="MEDIUM">Medium</option>
                          <option value="HIGH">High</option>
                          <option value="CRITICAL">Critical</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>SLA Business Days</label>
                        <input type="number" min={0} value={processForm.slaBusinessDays}
                          onChange={(e) => setProcessForm(f => ({ ...f, slaBusinessDays: parseInt(e.target.value) || 0 }))}
                          className="w-full h-8 px-2 text-sm rounded-md outline-none"
                          style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>SLA Business Minutes</label>
                        <input type="number" min={0} value={processForm.slaBusinessMinutes}
                          onChange={(e) => setProcessForm(f => ({ ...f, slaBusinessMinutes: parseInt(e.target.value) || 0 }))}
                          className="w-full h-8 px-2 text-sm rounded-md outline-none"
                          style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="primary" onClick={() => createProcessMut.mutate()}
                        disabled={createProcessMut.isPending || !processForm.processDefinitionKey}>
                        {createProcessMut.isPending ? 'Associating...' : 'Associate'}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setShowAddProcess(false)}>Cancel</Button>
                    </div>
                  </Card>
                )}

                {processQuery.isLoading ? (
                  <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} height="2.5rem" />)}</div>
                ) : !processQuery.data || processQuery.data.length === 0 ? (
                  <div className="py-12 text-center">
                    <Info size={32} style={{ color: 'var(--text-muted)', margin: '0 auto 8px' }} />
                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No processes associated with this calendar.</p>
                  </div>
                ) : (
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr>
                        {['Process Key', 'SLA Days', 'SLA Minutes', 'Priority', 'Active', 'Actions'].map(h => (
                          <th key={h} className="text-left text-xs font-bold py-2 px-3"
                            style={{ color: 'var(--text-primary)', borderBottom: '2px solid var(--border)' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {processQuery.data.map((assoc: ProcessCalendarAssociation) => (
                        <tr key={assoc.id} style={{ borderBottom: '1px solid var(--border)' }}
                          className="hover:bg-elevated transition-colors">
                          <td className="py-2 px-3 font-mono text-xs" style={{ color: 'var(--accent-blue)' }}>{assoc.processDefinitionKey}</td>
                          <td className="py-2 px-3" style={{ color: 'var(--text-primary)' }}>{assoc.slaBusinessDays ?? '--'}</td>
                          <td className="py-2 px-3" style={{ color: 'var(--text-primary)' }}>{assoc.slaBusinessMinutes ?? '--'}</td>
                          <td className="py-2 px-3">
                            {assoc.priority ? <Badge variant={assoc.priority === 'CRITICAL' ? 'danger' : assoc.priority === 'HIGH' ? 'warning' : 'info'}>{assoc.priority}</Badge> : <span style={{ color: 'var(--text-muted)' }}>--</span>}
                          </td>
                          <td className="py-2 px-3">
                            <Badge variant={assoc.active ? 'success' : 'muted'}>{assoc.active ? 'Active' : 'Inactive'}</Badge>
                          </td>
                          <td className="py-2 px-3">
                            <Button size="sm" variant="ghost" onClick={() => deleteProcessMut.mutate(assoc.processDefinitionKey)}>
                              <Trash2 size={14} style={{ color: 'var(--accent-red)' }} />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* ── SLA Calculator Tab ──────────────────────────── */}
            {activeTab === 'sla' && (
              <SlaTab
                form={slaForm}
                onFormChange={setSlaForm}
                onCalculate={() => slaMut.mutate()}
                isCalculating={slaMut.isPending}
                result={slaResult}
              />
            )}

            {/* ── Availability Tab ────────────────────────────── */}
            {activeTab === 'availability' && (
              <AvailabilityTab
                from={availFrom}
                to={availTo}
                onFromChange={setAvailFrom}
                onToChange={setAvailTo}
                windows={availabilityQuery.data ?? []}
                isLoading={availabilityQuery.isLoading}
                onRefetch={() => availabilityQuery.refetch()}
              />
            )}
          </div>
        </Tabs>
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Locations Tab                                                      */
/* ================================================================== */

interface LocationsTabProps {
  locations: CalendarLocation[];
  isLoading: boolean;
  selectedLocationCode: string | null;
  onSelectLocation: (code: string) => void;
  onDeleteLocation: (code: string) => void;
  showAddForm: boolean;
  onToggleAddForm: () => void;
  form: { locationCode: string; name: string; timezone: string; country: string; region: string; city: string };
  onFormChange: (f: LocationsTabProps['form']) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}

function LocationsTab({
  locations, isLoading, selectedLocationCode, onSelectLocation, onDeleteLocation,
  showAddForm, onToggleAddForm, form, onFormChange, onSubmit, isSubmitting,
}: LocationsTabProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          Locations ({locations.length})
        </h3>
        <Button size="sm" variant="primary" onClick={onToggleAddForm}>
          <Plus size={14} className="mr-1" /> Add Location
        </Button>
      </div>

      {/* Add Location Form */}
      {showAddForm && (
        <Card className="mb-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            {/* Location Code */}
            <div>
              <label className="block text-xs font-medium mb-1" style={labelStyle}>Location Code</label>
              <input type="text" value={form.locationCode}
                onChange={(e) => onFormChange({ ...form, locationCode: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '') })}
                placeholder="e.g. US_CENTRAL" className="w-full h-8 px-2 text-sm rounded-md outline-none" style={inputStyle} />
            </div>
            {/* Name */}
            <div>
              <label className="block text-xs font-medium mb-1" style={labelStyle}>Name</label>
              <input type="text" value={form.name}
                onChange={(e) => onFormChange({ ...form, name: e.target.value })}
                placeholder="e.g. US Central Office" className="w-full h-8 px-2 text-sm rounded-md outline-none" style={inputStyle} />
            </div>
            {/* Country */}
            <div>
              <label className="block text-xs font-medium mb-1" style={labelStyle}>Country</label>
              <select value={form.country}
                onChange={(e) => onFormChange({ ...form, country: e.target.value, city: '' })}
                className="w-full h-8 px-2 text-sm rounded-md outline-none cursor-pointer" style={inputStyle}>
                <option value="">Select Country...</option>
                {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.name} ({c.code})</option>)}
              </select>
            </div>
            {/* Timezone */}
            <div>
              <label className="block text-xs font-medium mb-1" style={labelStyle}>Timezone</label>
              <select value={form.timezone}
                onChange={(e) => onFormChange({ ...form, timezone: e.target.value })}
                className="w-full h-8 px-2 text-sm rounded-md outline-none cursor-pointer" style={inputStyle}>
                <option value="">Select Timezone...</option>
                {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
              </select>
            </div>
            {/* Region */}
            <div>
              <label className="block text-xs font-medium mb-1" style={labelStyle}>Region</label>
              <select value={form.region}
                onChange={(e) => onFormChange({ ...form, region: e.target.value })}
                className="w-full h-8 px-2 text-sm rounded-md outline-none cursor-pointer" style={inputStyle}>
                <option value="">Select Region...</option>
                {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            {/* City */}
            <div>
              <label className="block text-xs font-medium mb-1" style={labelStyle}>City</label>
              <select value={form.city}
                onChange={(e) => onFormChange({ ...form, city: e.target.value })}
                className="w-full h-8 px-2 text-sm rounded-md outline-none cursor-pointer" style={inputStyle}>
                <option value="">Select City...</option>
                {(CITIES[form.country] ?? []).map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="primary" onClick={onSubmit} disabled={isSubmitting || !form.locationCode || !form.name || !form.timezone}>
              {isSubmitting ? 'Creating...' : 'Create'}
            </Button>
            <Button size="sm" variant="ghost" onClick={onToggleAddForm}>Cancel</Button>
          </div>
        </Card>
      )}

      {/* Locations Table */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} height="2.5rem" />)}
        </div>
      ) : locations.length === 0 ? (
        <div className="py-12 text-center">
          <MapPin size={32} style={{ color: 'var(--text-muted)', margin: '0 auto 8px' }} />
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No locations configured yet.</p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                {['Location Code', 'Name', 'Timezone', 'Country', 'City', 'Enabled', 'Actions'].map((h) => (
                  <th key={h} className="text-left text-xs font-bold py-2 px-3" style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {locations.map((loc) => {
                const isSelected = loc.locationCode === selectedLocationCode;
                return (
                  <tr
                    key={loc.id}
                    className="cursor-pointer transition-colors"
                    style={{
                      borderBottom: '1px solid var(--border)',
                      backgroundColor: isSelected ? 'var(--bg-elevated)' : 'transparent',
                    }}
                    onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.backgroundColor = 'var(--bg-elevated)'; }}
                    onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent'; }}
                    onClick={() => onSelectLocation(loc.locationCode)}
                  >
                    <td className="py-2 px-3 font-mono text-xs" style={{ color: 'var(--accent-blue)' }}>{loc.locationCode}</td>
                    <td className="py-2 px-3" style={{ color: 'var(--text-primary)' }}>{loc.name}</td>
                    <td className="py-2 px-3" style={{ color: 'var(--text-secondary)' }}>{loc.timezone}</td>
                    <td className="py-2 px-3" style={{ color: 'var(--text-secondary)' }}>{loc.country ?? '--'}</td>
                    <td className="py-2 px-3" style={{ color: 'var(--text-secondary)' }}>{loc.city ?? '--'}</td>
                    <td className="py-2 px-3">
                      <Badge variant={loc.enabled ? 'success' : 'danger'}>{loc.enabled ? 'Yes' : 'No'}</Badge>
                    </td>
                    <td className="py-2 px-3">
                      <button
                        type="button"
                        className="p-1.5 rounded-md cursor-pointer bg-transparent border-none hover:bg-elevated"
                        style={{ color: 'var(--text-muted)' }}
                        title="Delete location"
                        onClick={(e) => { e.stopPropagation(); onDeleteLocation(loc.locationCode); }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ================================================================== */
/*  Business Hours Tab                                                 */
/* ================================================================== */

interface BusinessHoursTabProps {
  selectedLocationCode: string | null;
  hours: BusinessHours[];
  isLoading: boolean;
  onDeleteHours: (id: string) => void;
  showAddForm: boolean;
  onToggleAddForm: () => void;
  form: { dayOfWeek: number; startTime: string; endTime: string; label: string; partial: boolean; capacityPercent: number };
  onFormChange: (f: BusinessHoursTabProps['form']) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}

function BusinessHoursTab({
  selectedLocationCode, hours, isLoading, onDeleteHours,
  showAddForm, onToggleAddForm, form, onFormChange, onSubmit, isSubmitting,
}: BusinessHoursTabProps) {
  if (!selectedLocationCode) {
    return (
      <div className="py-12 text-center">
        <Info size={32} style={{ color: 'var(--text-muted)', margin: '0 auto 8px' }} />
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Select a location from the Locations tab first.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          Business Hours for <span style={{ color: 'var(--accent-blue)' }}>{selectedLocationCode}</span>
        </h3>
        <Button size="sm" variant="primary" onClick={onToggleAddForm}>
          <Plus size={14} className="mr-1" /> Add Hours
        </Button>
      </div>

      {/* Add Hours Form */}
      {showAddForm && (
        <Card className="mb-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
            <div>
              <label className="block text-xs font-medium mb-1" style={labelStyle}>Day of Week</label>
              <select
                value={form.dayOfWeek}
                onChange={(e) => onFormChange({ ...form, dayOfWeek: Number(e.target.value) })}
                className="w-full h-8 px-2 text-sm rounded-md outline-none"
                style={inputStyle}
              >
                {[1, 2, 3, 4, 5, 6, 7].map((d) => (
                  <option key={d} value={d}>{DAY_NAMES[d]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={labelStyle}>Start Time</label>
              <input
                type="time"
                value={form.startTime}
                onChange={(e) => onFormChange({ ...form, startTime: e.target.value })}
                className="w-full h-8 px-2 text-sm rounded-md outline-none"
                style={inputStyle}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={labelStyle}>End Time</label>
              <input
                type="time"
                value={form.endTime}
                onChange={(e) => onFormChange({ ...form, endTime: e.target.value })}
                className="w-full h-8 px-2 text-sm rounded-md outline-none"
                style={inputStyle}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={labelStyle}>Label</label>
              <input
                type="text"
                value={form.label}
                onChange={(e) => onFormChange({ ...form, label: e.target.value })}
                placeholder="e.g. Morning shift"
                className="w-full h-8 px-2 text-sm rounded-md outline-none"
                style={inputStyle}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={labelStyle}>Capacity %</label>
              <input
                type="number"
                min={0}
                max={100}
                value={form.capacityPercent}
                onChange={(e) => onFormChange({ ...form, capacityPercent: Number(e.target.value) })}
                className="w-full h-8 px-2 text-sm rounded-md outline-none"
                style={inputStyle}
              />
            </div>
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2 cursor-pointer text-sm" style={{ color: 'var(--text-secondary)' }}>
                <input
                  type="checkbox"
                  checked={form.partial}
                  onChange={(e) => onFormChange({ ...form, partial: e.target.checked })}
                />
                Partial day
              </label>
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="primary" onClick={onSubmit} disabled={isSubmitting}>
              {isSubmitting ? 'Adding...' : 'Add'}
            </Button>
            <Button size="sm" variant="ghost" onClick={onToggleAddForm}>Cancel</Button>
          </div>
        </Card>
      )}

      {/* Hours Table */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} height="2.5rem" />)}
        </div>
      ) : hours.length === 0 ? (
        <div className="py-12 text-center">
          <Clock size={32} style={{ color: 'var(--text-muted)', margin: '0 auto 8px' }} />
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No business hours configured for this location.</p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                {['Day', 'Start Time', 'End Time', 'Label', 'Partial', 'Capacity %', 'Active', 'Actions'].map((h) => (
                  <th key={h} className="text-left text-xs font-bold py-2 px-3" style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {hours.map((h) => (
                <tr key={h.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td className="py-2 px-3" style={{ color: 'var(--text-primary)' }}>{DAY_NAMES[h.dayOfWeek] ?? h.dayOfWeek}</td>
                  <td className="py-2 px-3 font-mono text-xs" style={{ color: 'var(--text-secondary)' }}>{h.startTime}</td>
                  <td className="py-2 px-3 font-mono text-xs" style={{ color: 'var(--text-secondary)' }}>{h.endTime}</td>
                  <td className="py-2 px-3" style={{ color: 'var(--text-secondary)' }}>{h.label ?? '--'}</td>
                  <td className="py-2 px-3">
                    <Badge variant={h.partial ? 'warning' : 'muted'}>{h.partial ? 'Yes' : 'No'}</Badge>
                  </td>
                  <td className="py-2 px-3" style={{ color: 'var(--text-primary)' }}>{h.capacityPercent}%</td>
                  <td className="py-2 px-3">
                    <Badge variant={h.active ? 'success' : 'danger'}>{h.active ? 'Yes' : 'No'}</Badge>
                  </td>
                  <td className="py-2 px-3">
                    <button
                      type="button"
                      className="p-1.5 rounded-md cursor-pointer bg-transparent border-none hover:bg-elevated"
                      style={{ color: 'var(--text-muted)' }}
                      title="Delete"
                      onClick={() => onDeleteHours(h.id)}
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ================================================================== */
/*  Holidays Tab                                                       */
/* ================================================================== */

interface HolidaysTabProps {
  selectedLocationCode: string | null;
  holidays: Holiday[];
  isLoading: boolean;
  onDeleteHoliday: (id: string) => void;
  searchValue: string;
  onSearchChange: (v: string) => void;
  showImport: boolean;
  onToggleImport: () => void;
  importYear: number;
  onImportYearChange: (y: number) => void;
  onAutoImport: () => void;
  isImporting: boolean;
  showAddForm: boolean;
  onToggleAddForm: () => void;
  form: { date: string; name: string; type: string; closed: boolean; description: string };
  onFormChange: (f: HolidaysTabProps['form']) => void;
}

function HolidaysTab({
  selectedLocationCode, holidays, isLoading, onDeleteHoliday,
  searchValue, onSearchChange,
  showImport, onToggleImport, importYear, onImportYearChange, onAutoImport, isImporting,
  showAddForm, onToggleAddForm, form, onFormChange,
}: HolidaysTabProps) {
  if (!selectedLocationCode) {
    return (
      <div className="py-12 text-center">
        <Info size={32} style={{ color: 'var(--text-muted)', margin: '0 auto 8px' }} />
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Select a location from the Locations tab first.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          Holidays for <span style={{ color: 'var(--accent-blue)' }}>{selectedLocationCode}</span>
        </h3>
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={onToggleImport}>
            <Download size={14} className="mr-1" /> Auto-Import
          </Button>
          <Button size="sm" variant="primary" onClick={onToggleAddForm}>
            <Plus size={14} className="mr-1" /> Add Holiday
          </Button>
        </div>
      </div>

      {/* Auto-Import Form */}
      {showImport && (
        <Card className="mb-4">
          <div className="flex items-end gap-3">
            <div>
              <label className="block text-xs font-medium mb-1" style={labelStyle}>Year</label>
              <input
                type="number"
                value={importYear}
                onChange={(e) => onImportYearChange(Number(e.target.value))}
                className="w-28 h-8 px-2 text-sm rounded-md outline-none"
                style={inputStyle}
              />
            </div>
            <Button size="sm" variant="primary" onClick={onAutoImport} disabled={isImporting}>
              {isImporting ? 'Importing...' : 'Import'}
            </Button>
            <Button size="sm" variant="ghost" onClick={onToggleImport}>Cancel</Button>
          </div>
        </Card>
      )}

      {/* Add Holiday Form */}
      {showAddForm && (
        <Card className="mb-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
            <div>
              <label className="block text-xs font-medium mb-1" style={labelStyle}>Date</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => onFormChange({ ...form, date: e.target.value })}
                className="w-full h-8 px-2 text-sm rounded-md outline-none"
                style={inputStyle}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={labelStyle}>Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => onFormChange({ ...form, name: e.target.value })}
                placeholder="e.g. New Year's Day"
                className="w-full h-8 px-2 text-sm rounded-md outline-none"
                style={inputStyle}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={labelStyle}>Type</label>
              <input
                type="text"
                value={form.type}
                onChange={(e) => onFormChange({ ...form, type: e.target.value })}
                placeholder="e.g. PUBLIC_HOLIDAY"
                className="w-full h-8 px-2 text-sm rounded-md outline-none"
                style={inputStyle}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={labelStyle}>Description</label>
              <input
                type="text"
                value={form.description}
                onChange={(e) => onFormChange({ ...form, description: e.target.value })}
                placeholder="Optional"
                className="w-full h-8 px-2 text-sm rounded-md outline-none"
                style={inputStyle}
              />
            </div>
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2 cursor-pointer text-sm" style={{ color: 'var(--text-secondary)' }}>
                <input
                  type="checkbox"
                  checked={form.closed}
                  onChange={(e) => onFormChange({ ...form, closed: e.target.checked })}
                />
                Closed
              </label>
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="primary" disabled={!form.date || !form.name}>Create</Button>
            <Button size="sm" variant="ghost" onClick={onToggleAddForm}>Cancel</Button>
          </div>
        </Card>
      )}

      {/* Search */}
      <div className="mb-3" style={{ maxWidth: 320 }}>
        <SearchInput value={searchValue} onChange={onSearchChange} placeholder="Search holidays..." />
      </div>

      {/* Holidays Table */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} height="2.5rem" />)}
        </div>
      ) : holidays.length === 0 ? (
        <div className="py-12 text-center">
          <Sun size={32} style={{ color: 'var(--text-muted)', margin: '0 auto 8px' }} />
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No holidays found.</p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                {['Date', 'Name', 'Type', 'Closed', 'Description', 'Actions'].map((h) => (
                  <th key={h} className="text-left text-xs font-bold py-2 px-3" style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {holidays.map((h) => (
                <tr key={h.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td className="py-2 px-3 font-mono text-xs" style={{ color: 'var(--text-primary)' }}>{h.date}</td>
                  <td className="py-2 px-3" style={{ color: 'var(--text-primary)' }}>{h.name}</td>
                  <td className="py-2 px-3"><Badge variant="info">{h.type}</Badge></td>
                  <td className="py-2 px-3">
                    <Badge variant={h.closed ? 'danger' : 'success'}>{h.closed ? 'Yes' : 'No'}</Badge>
                  </td>
                  <td className="py-2 px-3" style={{ color: 'var(--text-secondary)' }}>{h.description ?? '--'}</td>
                  <td className="py-2 px-3">
                    <button
                      type="button"
                      className="p-1.5 rounded-md cursor-pointer bg-transparent border-none hover:bg-elevated"
                      style={{ color: 'var(--text-muted)' }}
                      title="Delete"
                      onClick={() => onDeleteHoliday(h.id)}
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ================================================================== */
/*  SLA Calculator Tab                                                 */
/* ================================================================== */

interface SlaTabProps {
  form: { receivedDateTime: string; receivedTimezone: string; slaBusinessDays: number; slaBusinessMinutes: number };
  onFormChange: (f: SlaTabProps['form']) => void;
  onCalculate: () => void;
  isCalculating: boolean;
  result: SlaResult | null;
}

function SlaTab({ form, onFormChange, onCalculate, isCalculating, result }: SlaTabProps) {
  return (
    <div>
      <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
        SLA Calculator
      </h3>

      <Card className="mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-xs font-medium mb-1" style={labelStyle}>Received Date/Time</label>
            <input
              type="datetime-local"
              value={form.receivedDateTime}
              onChange={(e) => onFormChange({ ...form, receivedDateTime: e.target.value })}
              className="w-full h-8 px-2 text-sm rounded-md outline-none"
              style={inputStyle}
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={labelStyle}>Received Timezone</label>
            <select
              value={form.receivedTimezone}
              onChange={(e) => onFormChange({ ...form, receivedTimezone: e.target.value })}
              className="w-full h-8 px-2 text-sm rounded-md outline-none cursor-pointer"
              style={inputStyle}
            >
              <option value="">Select Timezone...</option>
              {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={labelStyle}>SLA Business Days</label>
            <input
              type="number"
              min={0}
              value={form.slaBusinessDays}
              onChange={(e) => onFormChange({ ...form, slaBusinessDays: Number(e.target.value) })}
              className="w-full h-8 px-2 text-sm rounded-md outline-none"
              style={inputStyle}
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={labelStyle}>SLA Business Minutes</label>
            <input
              type="number"
              min={0}
              value={form.slaBusinessMinutes}
              onChange={(e) => onFormChange({ ...form, slaBusinessMinutes: Number(e.target.value) })}
              className="w-full h-8 px-2 text-sm rounded-md outline-none"
              style={inputStyle}
            />
          </div>
        </div>
        <Button
          size="sm"
          variant="primary"
          onClick={onCalculate}
          disabled={isCalculating || !form.receivedDateTime || !form.receivedTimezone}
        >
          <Calculator size={14} className="mr-1" />
          {isCalculating ? 'Calculating...' : 'Calculate'}
        </Button>
      </Card>

      {/* Result */}
      {result && (
        <Card title="SLA Result">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { label: 'Received (UTC)', value: result.receivedDateTimeUtc },
              { label: 'Due Date (UTC)', value: result.dueDateTimeUtc },
              { label: 'Due Date (Local)', value: result.dueDateTimeLocal },
              { label: 'Total Minutes Consumed', value: String(result.totalBusinessMinutesConsumed) },
              { label: 'Locations Used', value: result.locationsUsed.join(', ') || '--' },
            ].map((item) => (
              <div key={item.label}>
                <span className="block text-xs font-medium mb-0.5" style={labelStyle}>{item.label}</span>
                <span className="block text-sm font-mono" style={{ color: 'var(--text-primary)' }}>{item.value}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

/* ================================================================== */
/*  Availability Tab                                                   */
/* ================================================================== */

interface AvailabilityTabProps {
  from: string;
  to: string;
  onFromChange: (v: string) => void;
  onToChange: (v: string) => void;
  windows: AvailabilityWindow[];
  isLoading: boolean;
  onRefetch: () => void;
}

function AvailabilityTab({ from, to, onFromChange, onToChange, windows, isLoading, onRefetch }: AvailabilityTabProps) {
  return (
    <div>
      <div className="flex items-end gap-3 mb-4">
        <div>
          <label className="block text-xs font-medium mb-1" style={labelStyle}>From</label>
          <input
            type="date"
            value={from}
            onChange={(e) => onFromChange(e.target.value)}
            className="h-8 px-2 text-sm rounded-md outline-none"
            style={inputStyle}
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" style={labelStyle}>To</label>
          <input
            type="date"
            value={to}
            onChange={(e) => onToChange(e.target.value)}
            className="h-8 px-2 text-sm rounded-md outline-none"
            style={inputStyle}
          />
        </div>
        <Button size="sm" variant="secondary" onClick={onRefetch}>
          Refresh
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} height="2.5rem" />)}
        </div>
      ) : windows.length === 0 ? (
        <div className="py-12 text-center">
          <BarChart3 size={32} style={{ color: 'var(--text-muted)', margin: '0 auto 8px' }} />
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No availability windows found for this range.</p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                {['Start (UTC)', 'End (UTC)', 'Duration (min)', 'Active Locations'].map((h) => (
                  <th key={h} className="text-left text-xs font-bold py-2 px-3" style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {windows.map((w, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td className="py-2 px-3 font-mono text-xs" style={{ color: 'var(--text-primary)' }}>{w.start}</td>
                  <td className="py-2 px-3 font-mono text-xs" style={{ color: 'var(--text-primary)' }}>{w.end}</td>
                  <td className="py-2 px-3" style={{ color: 'var(--text-secondary)' }}>{w.durationMinutes}</td>
                  <td className="py-2 px-3">
                    <div className="flex gap-1 flex-wrap">
                      {w.activeLocations.map((loc) => (
                        <Badge key={loc} variant="info">{loc}</Badge>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
