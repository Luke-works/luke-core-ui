import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CalendarDays,
  MapPin,
  Plus,
  Trash2,
  Check,
  X,
  Activity,
} from 'lucide-react';
import { toast } from 'sonner';

import PageHeader from '@/shared/layout/PageHeader';
import Card from '@/shared/ui/Card';
import Button from '@/shared/ui/Button';
import Badge from '@/shared/ui/Badge';
import Skeleton from '@/shared/ui/Skeleton';

import {
  getCalendars,
  getLocations,
  isCalendarOpen,
  createCalendar,
  deleteCalendar,
  getProcessAssociations,
} from '@/features/calendars/api/endpoints';

import type { BusinessCalendar } from '@/features/calendars/api/endpoints';

// ---------------------------------------------------------------------------
// KPI Card (matches DashboardPage pattern)
// ---------------------------------------------------------------------------

interface KpiCardProps {
  label: string;
  value: number | undefined;
  isLoading: boolean;
  isError: boolean;
  color: string;
  icon: React.ReactNode;
}

function KpiCard({ label, value, isLoading, isError, color, icon }: KpiCardProps) {
  return (
    <Card>
      <div className="flex items-start justify-between">
        <div>
          {isLoading ? (
            <Skeleton width={72} height={36} />
          ) : isError ? (
            <span className="text-3xl font-heading" style={{ color: 'var(--text-muted)' }}>
              --
            </span>
          ) : (
            <span className="text-3xl font-heading" style={{ color }}>
              {value?.toLocaleString() ?? 0}
            </span>
          )}
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            {label}
          </p>
        </div>
        <span style={{ color: 'var(--text-muted)' }}>{icon}</span>
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Calendar Card
// ---------------------------------------------------------------------------

interface CalendarCardProps {
  calendar: BusinessCalendar;
  onDelete: (code: string) => void;
  isDeleting: boolean;
}

function CalendarCard({ calendar, onDelete, isDeleting }: CalendarCardProps) {
  const navigate = useNavigate();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const locationsQuery = useQuery({
    queryKey: ['calendar-locations', calendar.calendarCode],
    queryFn: () => getLocations(calendar.calendarCode),
  });

  const openStatusQuery = useQuery({
    queryKey: ['calendar-open-status', calendar.calendarCode],
    queryFn: () => isCalendarOpen(calendar.calendarCode),
    refetchInterval: 30_000,
  });

  const locationCount = locationsQuery.data?.length ?? 0;
  const isOpen = openStatusQuery.data?.open ?? false;

  return (
    <div
      className="cursor-pointer transition-all duration-150"
      style={{
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: '1.25rem',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'var(--accent-blue)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--border)';
      }}
      onClick={() => navigate(`/calendars/${calendar.calendarCode}`)}
    >
      {/* Header row */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <Badge variant="info">{calendar.calendarCode}</Badge>
          <h3
            className="text-sm font-semibold truncate"
            style={{ color: 'var(--text-primary)' }}
          >
            {calendar.name}
          </h3>
        </div>
        <Badge variant={calendar.active ? 'success' : 'muted'}>
          {calendar.active ? 'Active' : 'Inactive'}
        </Badge>
      </div>

      {/* Description */}
      {calendar.description && (
        <p
          className="text-xs mb-3 line-clamp-2"
          style={{ color: 'var(--text-muted)' }}
        >
          {calendar.description}
        </p>
      )}

      {/* Stats row */}
      <div className="flex items-center gap-4 mb-3">
        {/* Location count */}
        <div className="flex items-center gap-1.5">
          <MapPin size={13} style={{ color: 'var(--text-muted)' }} />
          {locationsQuery.isLoading ? (
            <Skeleton width={20} height={14} />
          ) : (
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              {locationCount} location{locationCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Open status */}
        <div className="flex items-center gap-1.5">
          {openStatusQuery.isLoading ? (
            <Skeleton width={60} height={14} />
          ) : (
            <>
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  backgroundColor: isOpen ? 'var(--accent-green)' : 'var(--accent-red)',
                  display: 'inline-block',
                  flexShrink: 0,
                }}
              />
              <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                {isOpen ? 'Open now' : 'Closed'}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Delete button */}
      <div
        className="flex justify-end"
        onClick={(e) => e.stopPropagation()}
      >
        {confirmDelete ? (
          <div className="flex items-center gap-1">
            <span className="text-xs mr-1" style={{ color: 'var(--text-muted)' }}>
              Delete?
            </span>
            <Button
              variant="danger"
              size="sm"
              disabled={isDeleting}
              onClick={() => onDelete(calendar.calendarCode)}
            >
              <Check size={14} />
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setConfirmDelete(false)}
            >
              <X size={14} />
            </Button>
          </div>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setConfirmDelete(true)}
          >
            <Trash2 size={14} style={{ color: 'var(--text-muted)' }} />
          </Button>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Create Calendar Modal
// ---------------------------------------------------------------------------

interface CreateModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: { calendarCode: string; name: string; description: string }) => void;
  isSubmitting: boolean;
}

function CreateCalendarModal({ open, onClose, onSubmit, isSubmitting }: CreateModalProps) {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ calendarCode: code.trim(), name: name.trim(), description: description.trim() });
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.5rem 0.75rem',
    fontSize: '0.875rem',
    backgroundColor: 'var(--bg-elevated)',
    color: 'var(--text-primary)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    outline: 'none',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '0.75rem',
    fontWeight: 500,
    marginBottom: '0.25rem',
    color: 'var(--text-secondary)',
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md"
        style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.5rem',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          className="text-base font-semibold mb-4"
          style={{ color: 'var(--text-primary)' }}
        >
          Create Calendar
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label style={labelStyle}>Calendar Code</label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="e.g. US-BUSINESS"
              required
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. US Business Hours"
              required
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
              style={inputStyle}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              disabled={isSubmitting || !code.trim() || !name.trim()}
            >
              {isSubmitting ? 'Creating...' : 'Create'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Calendar Dashboard Page
// ---------------------------------------------------------------------------

export default function CalendarDashboardPage() {
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);

  // ---- Data queries -------------------------------------------------------

  const calendarsQuery = useQuery({
    queryKey: ['calendars'],
    queryFn: getCalendars,
  });

  const processAssociationsQuery = useQuery({
    queryKey: ['calendar-process-associations'],
    queryFn: getProcessAssociations,
  });

  // Fetch location counts for all calendars for the KPI total
  const allLocationsQueries = useQuery({
    queryKey: ['calendar-all-locations', calendarsQuery.data?.map((c) => c.calendarCode)],
    queryFn: async () => {
      const calendars = calendarsQuery.data ?? [];
      const results = await Promise.all(
        calendars.map((cal) => getLocations(cal.calendarCode)),
      );
      return results.flat();
    },
    enabled: !!calendarsQuery.data,
  });

  // ---- Mutations ----------------------------------------------------------

  const createMutation = useMutation({
    mutationFn: createCalendar,
    onSuccess: (newCal) => {
      toast.success(`Calendar "${newCal.name}" created`);
      queryClient.invalidateQueries({ queryKey: ['calendars'] });
      setShowCreateModal(false);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message ?? 'Failed to create calendar');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCalendar,
    onSuccess: () => {
      toast.success('Calendar deleted');
      queryClient.invalidateQueries({ queryKey: ['calendars'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message ?? 'Failed to delete calendar');
    },
  });

  // ---- Derived data -------------------------------------------------------

  const calendars = calendarsQuery.data ?? [];
  const activeCount = calendars.filter((c) => c.active).length;
  const totalLocations = allLocationsQueries.data?.length ?? 0;
  const processAssociationCount = processAssociationsQuery.data?.length ?? 0;

  // ---- Render -------------------------------------------------------------

  return (
    <div>
      <PageHeader
        title="Business Calendars"
        subtitle="Manage calendars, locations, and SLA rules"
        actions={
          <Button variant="primary" onClick={() => setShowCreateModal(true)}>
            <Plus size={16} className="mr-1.5" />
            Create Calendar
          </Button>
        }
      />

      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard
          label="Total Calendars"
          value={calendars.length}
          isLoading={calendarsQuery.isLoading}
          isError={calendarsQuery.isError}
          color="var(--accent-blue)"
          icon={<CalendarDays size={20} />}
        />
        <KpiCard
          label="Active Calendars"
          value={activeCount}
          isLoading={calendarsQuery.isLoading}
          isError={calendarsQuery.isError}
          color="var(--accent-green)"
          icon={<Check size={20} />}
        />
        <KpiCard
          label="Total Locations"
          value={totalLocations}
          isLoading={allLocationsQueries.isLoading}
          isError={allLocationsQueries.isError}
          color="var(--accent-blue)"
          icon={<MapPin size={20} />}
        />
        <KpiCard
          label="Process Associations"
          value={processAssociationCount}
          isLoading={processAssociationsQuery.isLoading}
          isError={processAssociationsQuery.isError}
          color="var(--accent-blue)"
          icon={<Activity size={20} />}
        />
      </div>

      {/* Calendars Grid */}
      {calendarsQuery.isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <div className="space-y-3">
                <Skeleton width="60%" height={20} />
                <Skeleton width="80%" height={14} />
                <Skeleton width="40%" height={14} />
              </div>
            </Card>
          ))}
        </div>
      ) : calendarsQuery.isError ? (
        <Card>
          <div
            className="flex items-center justify-center text-sm py-12"
            style={{ color: 'var(--text-muted)' }}
          >
            Failed to load calendars
          </div>
        </Card>
      ) : calendars.length === 0 ? (
        <Card>
          <div
            className="flex flex-col items-center justify-center text-sm py-12 gap-3"
            style={{ color: 'var(--text-muted)' }}
          >
            <CalendarDays size={32} />
            <p>No calendars configured yet</p>
            <Button variant="primary" size="sm" onClick={() => setShowCreateModal(true)}>
              <Plus size={14} className="mr-1" />
              Create your first calendar
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {calendars.map((cal) => (
            <CalendarCard
              key={cal.id}
              calendar={cal}
              onDelete={(code) => deleteMutation.mutate(code)}
              isDeleting={deleteMutation.isPending}
            />
          ))}
        </div>
      )}

      {/* Create Modal */}
      <CreateCalendarModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={(data) => createMutation.mutate(data)}
        isSubmitting={createMutation.isPending}
      />
    </div>
  );
}
