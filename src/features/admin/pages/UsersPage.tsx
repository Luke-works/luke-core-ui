import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Users, UserPlus, Trash2, Shield, Plus, UsersRound, X, Building2 } from 'lucide-react';
import PageHeader from '@/shared/layout/PageHeader';
import Card from '@/shared/ui/Card';
import Button from '@/shared/ui/Button';
import Badge from '@/shared/ui/Badge';
import Modal from '@/shared/ui/Modal';
import ConfirmButton from '@/shared/ui/ConfirmButton';
import EmptyState from '@/shared/ui/EmptyState';
import DataTable, { type ColumnDef } from '@/shared/ui/DataTable';
import SearchInput from '@/shared/ui/SearchInput';
import CopyId from '@/shared/ui/CopyId';
import { useAuthz } from '@/features/auth/hooks/useAuthz';
import { qk } from '@/shared/api/queryKeys';
import {
  getUsers,
  getUserCount,
  createUser,
  deleteUser,
  getGroups,
  getGroupCount,
  createGroup,
  deleteGroup,
  addGroupMember,
  removeGroupMember,
  type User,
  type Group,
} from '@/features/admin/api/users';
import {
  getTenants,
  getTenantCount,
  createTenant,
  deleteTenant,
  addTenantMember,
  removeTenantMember,
  type Tenant,
} from '@/features/admin/api/tenant';
import { onboardUser } from '@/features/admin/api/onboarding';

/** Page size for the server-paginated admin tables (#33). */
const ADMIN_PAGE = 20;

/* ── Shared input style ──────────────────────────────────── */

const inputStyle: React.CSSProperties = {
  backgroundColor: 'var(--bg-elevated)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-md)',
  color: 'var(--text-primary)',
  padding: '0.5rem 0.75rem',
  width: '100%',
  outline: 'none',
};

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  appearance: 'none' as const,
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 0.75rem center',
  paddingRight: '2rem',
};

const labelClass = 'block text-sm mb-1';
const labelStyle: React.CSSProperties = { color: 'var(--text-secondary)' };

/* ── Zod Schemas ─────────────────────────────────────────── */

const createUserSchema = z.object({
  id: z.string().min(3, 'Username must be at least 3 characters'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Must be a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type CreateUserForm = z.infer<typeof createUserSchema>;

const createGroupSchema = z.object({
  id: z.string().min(1, 'Group ID is required'),
  name: z.string().min(1, 'Group name is required'),
  type: z.enum(['ORGANIZATIONAL', 'WORKFLOW'], {
    message: 'Type is required',
  }),
});

type CreateGroupForm = z.infer<typeof createGroupSchema>;

const createTenantSchema = z.object({
  id: z.string().min(1, 'Tenant ID is required'),
  name: z.string().min(1, 'Tenant name is required'),
});

type CreateTenantForm = z.infer<typeof createTenantSchema>;

/* ── Roles (authorization spaces seeded by core-engine) ──── */

const ROLES = [
  { id: 'tenant-user', label: 'Tenant User' },
  { id: 'task-worker', label: 'Task Worker' },
  { id: 'process-operator', label: 'Process Operator' },
  { id: 'deployer', label: 'Deployer' },
  { id: 'tenant-admin', label: 'Tenant Admin' },
] as const;

const onboardUserSchema = z.object({
  id: z.string().min(3, 'Username must be at least 3 characters'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Must be a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  tenantId: z.string().min(1, 'Tenant is required'),
  role: z.string().min(1, 'Role is required'),
  accessLevel: z.enum(['READ_WRITE', 'READ_ONLY']),
});

type OnboardUserForm = z.infer<typeof onboardUserSchema>;

/* ── Users Page ──────────────────────────────────────────── */

export default function UsersPage() {
  const queryClient = useQueryClient();
  const { canAdmin } = useAuthz();
  const [userDrawerOpen, setUserDrawerOpen] = useState(false);
  const [onboardDrawerOpen, setOnboardDrawerOpen] = useState(false);
  const [groupDrawerOpen, setGroupDrawerOpen] = useState(false);
  const [managingGroup, setManagingGroup] = useState<Group | null>(null);
  const [tenantDrawerOpen, setTenantDrawerOpen] = useState(false);
  const [managingTenant, setManagingTenant] = useState<Tenant | null>(null);

  // Per-table server pagination + search state (#33). Search is sent to the
  // engine (*Like params), so it queries the whole set, not a truncated page.
  const [userPage, setUserPage] = useState(0);
  const [userSearch, setUserSearch] = useState('');
  const [groupPage, setGroupPage] = useState(0);
  const [groupSearch, setGroupSearch] = useState('');
  const [tenantPage, setTenantPage] = useState(0);
  const [tenantSearch, setTenantSearch] = useState('');

  /* ── Queries (server-paginated: firstResult/maxResults + count, #33) ── */

  // Engine matches *Like params case-sensitively with SQL % wildcards.
  const userLikeParams = userSearch
    ? { firstNameLike: `%${userSearch}%` }
    : undefined;
  const groupLikeParams = groupSearch ? { nameLike: `%${groupSearch}%` } : undefined;
  const tenantLikeParams = tenantSearch ? { nameLike: `%${tenantSearch}%` } : undefined;

  const userListParams = {
    ...userLikeParams,
    firstResult: userPage * ADMIN_PAGE,
    maxResults: ADMIN_PAGE,
  };
  const groupListParams = {
    ...groupLikeParams,
    firstResult: groupPage * ADMIN_PAGE,
    maxResults: ADMIN_PAGE,
  };
  const tenantListParams = {
    ...tenantLikeParams,
    firstResult: tenantPage * ADMIN_PAGE,
    maxResults: ADMIN_PAGE,
  };

  const {
    data: users = [],
    isLoading: usersLoading,
  } = useQuery({
    queryKey: qk.users.list(userListParams),
    queryFn: () => getUsers(userListParams),
  });

  const { data: userCount } = useQuery({
    queryKey: qk.users.count(userLikeParams),
    queryFn: () => getUserCount(userLikeParams),
  });

  const {
    data: groups = [],
    isLoading: groupsLoading,
  } = useQuery({
    queryKey: qk.groups.list(groupListParams),
    queryFn: () => getGroups(groupListParams),
  });

  const { data: groupCount } = useQuery({
    queryKey: qk.groups.count(groupLikeParams),
    queryFn: () => getGroupCount(groupLikeParams),
  });

  const {
    data: tenants = [],
    isLoading: tenantsLoading,
  } = useQuery({
    queryKey: qk.tenants.list(tenantListParams),
    queryFn: () => getTenants(tenantListParams),
  });

  const { data: tenantCount } = useQuery({
    queryKey: qk.tenants.count(tenantLikeParams),
    queryFn: () => getTenantCount(tenantLikeParams),
  });

  // Member-management pickers need every user/tenant, independent of the table's
  // current page/filter — fetch an unfiltered set for those candidate lists.
  const { data: allUsers = [] } = useQuery({
    queryKey: qk.users.list({ maxResults: 2000 }),
    queryFn: () => getUsers({ maxResults: 2000 }),
  });

  const { data: allTenants = [] } = useQuery({
    queryKey: qk.tenants.list({ maxResults: 2000 }),
    queryFn: () => getTenants({ maxResults: 2000 }),
  });

  /* ── Mutations ───────────────────────────────────────── */

  // Invalidate the whole feature subtree (list pages + count + candidate list)
  // after a create/delete — the count changed, so both the table and its total
  // must refetch (#42).
  const invalidateUsers = () =>
    queryClient.invalidateQueries({ queryKey: qk.users.all });
  const invalidateGroups = () =>
    queryClient.invalidateQueries({ queryKey: qk.groups.all });
  const invalidateTenants = () =>
    queryClient.invalidateQueries({ queryKey: qk.tenants.all });

  const deleteUserMutation = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => {
      toast.success('User deleted');
      invalidateUsers();
    },
    onError: () => {
      toast.error('Failed to delete user');
    },
  });

  const createUserMutation = useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      toast.success('User created');
      setUserDrawerOpen(false);
      invalidateUsers();
    },
    onError: () => {
      toast.error('Failed to create user');
    },
  });

  // Onboard = create the user, add them to a tenant, and assign a role group
  // (which carries the authorizations) — done atomically by core-engine.
  const onboardMutation = useMutation({
    mutationFn: (data: OnboardUserForm) => onboardUser(data),
    onSuccess: () => {
      toast.success('User onboarded');
      setOnboardDrawerOpen(false);
      // Onboarding also assigns a role group + tenant membership.
      invalidateUsers();
      invalidateGroups();
      invalidateTenants();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to onboard user');
    },
  });

  const deleteGroupMutation = useMutation({
    mutationFn: deleteGroup,
    onSuccess: () => {
      toast.success('Group deleted');
      invalidateGroups();
    },
    onError: () => {
      toast.error('Failed to delete group');
    },
  });

  const createGroupMutation = useMutation({
    mutationFn: createGroup,
    onSuccess: () => {
      toast.success('Group created');
      setGroupDrawerOpen(false);
      invalidateGroups();
    },
    onError: () => {
      toast.error('Failed to create group');
    },
  });

  const deleteTenantMutation = useMutation({
    mutationFn: deleteTenant,
    onSuccess: () => {
      toast.success('Tenant deleted');
      invalidateTenants();
    },
    onError: () => {
      toast.error('Failed to delete tenant');
    },
  });

  const createTenantMutation = useMutation({
    mutationFn: createTenant,
    onSuccess: () => {
      toast.success('Tenant created');
      setTenantDrawerOpen(false);
      invalidateTenants();
    },
    onError: () => {
      toast.error('Failed to create tenant');
    },
  });

  /* ── User Columns ────────────────────────────────────── */

  const userColumns = useMemo<ColumnDef<User, any>[]>(
    () => [
      {
        accessorKey: 'id',
        header: 'ID',
        cell: ({ row }) => <CopyId id={row.original.id} truncate={false} />,
      },
      {
        accessorKey: 'firstName',
        header: 'First Name',
      },
      {
        accessorKey: 'lastName',
        header: 'Last Name',
      },
      {
        accessorKey: 'email',
        header: 'Email',
      },
      {
        id: 'actions',
        header: 'Actions',
        enableSorting: false,
        cell: ({ row }) =>
          // Identity management is operator-only; hide the destructive control
          // (not just disable it) for non-admins (#34).
          canAdmin ? (
            <ConfirmButton
              variant="ghost"
              size="sm"
              title="Delete user"
              aria-label={`Delete user ${row.original.id}`}
              confirmTitle="Delete user"
              confirmMessage={`Delete user "${row.original.id}"? This cannot be undone.`}
              confirmLabel="Delete"
              onConfirm={() => deleteUserMutation.mutate(row.original.id)}
            >
              <Trash2 size={14} style={{ color: 'var(--accent-red)' }} />
            </ConfirmButton>
          ) : null,
      },
    ],
    [deleteUserMutation, canAdmin],
  );

  /* ── Group Columns ───────────────────────────────────── */

  const groupColumns = useMemo<ColumnDef<Group, any>[]>(
    () => [
      {
        accessorKey: 'id',
        header: 'ID',
        cell: ({ row }) => <CopyId id={row.original.id} truncate={false} />,
      },
      {
        accessorKey: 'name',
        header: 'Name',
      },
      {
        accessorKey: 'type',
        header: 'Type',
        cell: ({ row }) => (
          <Badge variant={row.original.type === 'WORKFLOW' ? 'info' : 'default'}>
            {row.original.type}
          </Badge>
        ),
      },
      {
        id: 'actions',
        header: 'Actions',
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setManagingGroup(row.original);
              }}
              title="Manage members"
              aria-label={`Manage members of group ${row.original.id}`}
            >
              <UsersRound size={14} style={{ color: 'var(--accent-blue)' }} />
            </Button>
            {canAdmin && (
              <ConfirmButton
                variant="ghost"
                size="sm"
                title="Delete group"
                aria-label={`Delete group ${row.original.id}`}
                confirmTitle="Delete group"
                confirmMessage={`Delete group "${row.original.id}"? This cannot be undone.`}
                confirmLabel="Delete"
                onConfirm={() => deleteGroupMutation.mutate(row.original.id)}
              >
                <Trash2 size={14} style={{ color: 'var(--accent-red)' }} />
              </ConfirmButton>
            )}
          </div>
        ),
      },
    ],
    [deleteGroupMutation, canAdmin],
  );

  /* ── Tenant Columns ──────────────────────────────────── */

  const tenantColumns = useMemo<ColumnDef<Tenant, any>[]>(
    () => [
      {
        accessorKey: 'id',
        header: 'ID',
        cell: ({ row }) => <CopyId id={row.original.id} truncate={false} />,
      },
      {
        accessorKey: 'name',
        header: 'Name',
      },
      {
        id: 'actions',
        header: 'Actions',
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setManagingTenant(row.original);
              }}
              title="Manage members"
              aria-label={`Manage members of tenant ${row.original.id}`}
            >
              <UsersRound size={14} style={{ color: 'var(--accent-blue)' }} />
            </Button>
            {canAdmin && (
              <ConfirmButton
                variant="ghost"
                size="sm"
                title="Delete tenant"
                aria-label={`Delete tenant ${row.original.id}`}
                confirmTitle="Delete tenant"
                confirmMessage={`Delete tenant "${row.original.id}"? This cannot be undone.`}
                confirmLabel="Delete"
                onConfirm={() => deleteTenantMutation.mutate(row.original.id)}
              >
                <Trash2 size={14} style={{ color: 'var(--accent-red)' }} />
              </ConfirmButton>
            )}
          </div>
        ),
      },
    ],
    [deleteTenantMutation, canAdmin],
  );

  /* ── Render ──────────────────────────────────────────── */

  return (
    <div>
      <PageHeader
        title="Users & Groups"
        subtitle="User and group management"
      />

      {/* ── Users Section ────────────────────────────────── */}
      <div className="space-y-6">
        <Card
          title="Users"
          action={
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setUserDrawerOpen(true)}
              >
                <span className="inline-flex items-center gap-1.5">
                  <UserPlus size={14} />
                  Create User
                </span>
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setOnboardDrawerOpen(true)}
              >
                <span className="inline-flex items-center gap-1.5">
                  <Shield size={14} />
                  Onboard User
                </span>
              </Button>
            </div>
          }
        >
          {!usersLoading && users.length === 0 && !userSearch ? (
            <EmptyState
              icon={<Users size={40} />}
              title="No Users"
              description="Create your first user to get started with access management."
              action={{
                label: 'Create User',
                onClick: () => setUserDrawerOpen(true),
              }}
            />
          ) : (
            <>
              <div className="mb-4" style={{ maxWidth: 400 }}>
                <SearchInput
                  value={userSearch}
                  onChange={(v) => {
                    setUserSearch(v);
                    setUserPage(0);
                  }}
                  placeholder="Filter by first name..."
                />
              </div>
              <DataTable
                data={users}
                columns={userColumns}
                isLoading={usersLoading}
                emptyMessage="No users found."
                pageSize={ADMIN_PAGE}
                pageIndex={userPage}
                total={userCount?.count}
                onPageChange={setUserPage}
              />
            </>
          )}
        </Card>

        {/* ── Groups Section ───────────────────────────────── */}
        <Card
          title="Groups"
          action={
            <Button
              variant="primary"
              size="sm"
              onClick={() => setGroupDrawerOpen(true)}
            >
              <span className="inline-flex items-center gap-1.5">
                <Plus size={14} />
                Create Group
              </span>
            </Button>
          }
        >
          {!groupsLoading && groups.length === 0 && !groupSearch ? (
            <EmptyState
              icon={<Shield size={40} />}
              title="No Groups"
              description="Create groups to organize users and manage permissions."
              action={{
                label: 'Create Group',
                onClick: () => setGroupDrawerOpen(true),
              }}
            />
          ) : (
            <>
              <div className="mb-4" style={{ maxWidth: 400 }}>
                <SearchInput
                  value={groupSearch}
                  onChange={(v) => {
                    setGroupSearch(v);
                    setGroupPage(0);
                  }}
                  placeholder="Filter by name..."
                />
              </div>
              <DataTable
                data={groups}
                columns={groupColumns}
                isLoading={groupsLoading}
                emptyMessage="No groups found."
                pageSize={ADMIN_PAGE}
                pageIndex={groupPage}
                total={groupCount?.count}
                onPageChange={setGroupPage}
              />
            </>
          )}
        </Card>

        {/* ── Tenants Section ──────────────────────────────── */}
        <Card
          title="Tenants"
          action={
            <Button
              variant="primary"
              size="sm"
              onClick={() => setTenantDrawerOpen(true)}
            >
              <span className="inline-flex items-center gap-1.5">
                <Plus size={14} />
                Create Tenant
              </span>
            </Button>
          }
        >
          {!tenantsLoading && tenants.length === 0 && !tenantSearch ? (
            <EmptyState
              icon={<Building2 size={40} />}
              title="No Tenants"
              description="Create a tenant, then assign users to it so they can sign in and see data."
              action={{
                label: 'Create Tenant',
                onClick: () => setTenantDrawerOpen(true),
              }}
            />
          ) : (
            <>
              <div className="mb-4" style={{ maxWidth: 400 }}>
                <SearchInput
                  value={tenantSearch}
                  onChange={(v) => {
                    setTenantSearch(v);
                    setTenantPage(0);
                  }}
                  placeholder="Filter by name..."
                />
              </div>
              <DataTable
                data={tenants}
                columns={tenantColumns}
                isLoading={tenantsLoading}
                emptyMessage="No tenants found."
                pageSize={ADMIN_PAGE}
                pageIndex={tenantPage}
                total={tenantCount?.count}
                onPageChange={setTenantPage}
              />
            </>
          )}
        </Card>
      </div>

      {/* ── Create User Drawer ─────────────────────────────── */}
      <Modal
        open={userDrawerOpen}
        onClose={() => setUserDrawerOpen(false)}
        title="Create User"
        width={400}
      >
        <CreateUserFormPanel
          isSubmitting={createUserMutation.isPending}
          onSubmit={(data) => {
            createUserMutation.mutate({
              profile: {
                id: data.id,
                firstName: data.firstName,
                lastName: data.lastName,
                email: data.email,
              },
              credentials: {
                password: data.password,
              },
            });
          }}
          onCancel={() => setUserDrawerOpen(false)}
        />
      </Modal>

      {/* ── Onboard User Drawer ────────────────────────────── */}
      <Modal
        open={onboardDrawerOpen}
        onClose={() => setOnboardDrawerOpen(false)}
        title="Onboard User"
        width={420}
      >
        <OnboardUserFormPanel
          tenants={allTenants}
          isSubmitting={onboardMutation.isPending}
          onSubmit={(data) => onboardMutation.mutate(data)}
          onCancel={() => setOnboardDrawerOpen(false)}
        />
      </Modal>

      {/* ── Create Group Drawer ────────────────────────────── */}
      <Modal
        open={groupDrawerOpen}
        onClose={() => setGroupDrawerOpen(false)}
        title="Create Group"
        width={400}
      >
        <CreateGroupFormPanel
          isSubmitting={createGroupMutation.isPending}
          onSubmit={(data) => {
            createGroupMutation.mutate({
              id: data.id,
              name: data.name,
              type: data.type,
            });
          }}
          onCancel={() => setGroupDrawerOpen(false)}
        />
      </Modal>

      {/* ── Manage Group Members Drawer ────────────────────── */}
      <Modal
        open={managingGroup !== null}
        onClose={() => setManagingGroup(null)}
        title={managingGroup ? `Manage Members — ${managingGroup.name}` : 'Manage Members'}
        width={420}
      >
        {managingGroup && (
          <ManageMembersPanel group={managingGroup} allUsers={allUsers} />
        )}
      </Modal>

      {/* ── Create Tenant Drawer ───────────────────────────── */}
      <Modal
        open={tenantDrawerOpen}
        onClose={() => setTenantDrawerOpen(false)}
        title="Create Tenant"
        width={400}
      >
        <CreateTenantFormPanel
          isSubmitting={createTenantMutation.isPending}
          onSubmit={(data) => {
            createTenantMutation.mutate({ id: data.id, name: data.name });
          }}
          onCancel={() => setTenantDrawerOpen(false)}
        />
      </Modal>

      {/* ── Manage Tenant Members Drawer ───────────────────── */}
      <Modal
        open={managingTenant !== null}
        onClose={() => setManagingTenant(null)}
        title={managingTenant ? `Manage Members — ${managingTenant.name || managingTenant.id}` : 'Manage Members'}
        width={420}
      >
        {managingTenant && (
          <ManageTenantMembersPanel tenant={managingTenant} allUsers={allUsers} />
        )}
      </Modal>
    </div>
  );
}

/* ── Create User Form ────────────────────────────────────── */

function CreateUserFormPanel({
  isSubmitting,
  onSubmit,
  onCancel,
}: {
  isSubmitting: boolean;
  onSubmit: (data: CreateUserForm) => void;
  onCancel: () => void;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateUserForm>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      id: '',
      firstName: '',
      lastName: '',
      email: '',
      password: '',
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      {/* ID (username) */}
      <div>
        <label htmlFor="cu-id" className={labelClass} style={labelStyle}>
          Username
        </label>
        <input
          id="cu-id"
          type="text"
          placeholder="john.doe"
          {...register('id')}
          style={inputStyle}
          onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--accent-blue)')}
          onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
        />
        {errors.id && (
          <p className="text-xs mt-1" style={{ color: 'var(--accent-red)' }}>
            {errors.id.message}
          </p>
        )}
      </div>

      {/* First Name */}
      <div>
        <label htmlFor="cu-firstName" className={labelClass} style={labelStyle}>
          First Name
        </label>
        <input
          id="cu-firstName"
          type="text"
          placeholder="John"
          {...register('firstName')}
          style={inputStyle}
          onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--accent-blue)')}
          onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
        />
        {errors.firstName && (
          <p className="text-xs mt-1" style={{ color: 'var(--accent-red)' }}>
            {errors.firstName.message}
          </p>
        )}
      </div>

      {/* Last Name */}
      <div>
        <label htmlFor="cu-lastName" className={labelClass} style={labelStyle}>
          Last Name
        </label>
        <input
          id="cu-lastName"
          type="text"
          placeholder="Doe"
          {...register('lastName')}
          style={inputStyle}
          onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--accent-blue)')}
          onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
        />
        {errors.lastName && (
          <p className="text-xs mt-1" style={{ color: 'var(--accent-red)' }}>
            {errors.lastName.message}
          </p>
        )}
      </div>

      {/* Email */}
      <div>
        <label htmlFor="cu-email" className={labelClass} style={labelStyle}>
          Email
        </label>
        <input
          id="cu-email"
          type="email"
          placeholder="john.doe@example.com"
          {...register('email')}
          style={inputStyle}
          onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--accent-blue)')}
          onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
        />
        {errors.email && (
          <p className="text-xs mt-1" style={{ color: 'var(--accent-red)' }}>
            {errors.email.message}
          </p>
        )}
      </div>

      {/* Password */}
      <div>
        <label htmlFor="cu-password" className={labelClass} style={labelStyle}>
          Password
        </label>
        <input
          id="cu-password"
          type="password"
          placeholder="Min 6 characters"
          {...register('password')}
          style={inputStyle}
          onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--accent-blue)')}
          onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
        />
        {errors.password && (
          <p className="text-xs mt-1" style={{ color: 'var(--accent-red)' }}>
            {errors.password.message}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-2">
        <Button type="submit" variant="primary" size="sm" disabled={isSubmitting}>
          <span className="inline-flex items-center gap-1.5">
            <UserPlus size={14} />
            {isSubmitting ? 'Creating...' : 'Create User'}
          </span>
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

/* ── Onboard User Form ───────────────────────────────────── */

function OnboardUserFormPanel({
  tenants,
  isSubmitting,
  onSubmit,
  onCancel,
}: {
  tenants: Tenant[];
  isSubmitting: boolean;
  onSubmit: (data: OnboardUserForm) => void;
  onCancel: () => void;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<OnboardUserForm>({
    resolver: zodResolver(onboardUserSchema),
    defaultValues: {
      id: '',
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      // Preselect when the operator only has access to a single tenant.
      tenantId: tenants.length === 1 ? tenants[0].id : '',
      role: 'tenant-user',
      accessLevel: 'READ_WRITE',
    },
  });

  const field = (
    name: keyof OnboardUserForm,
    label: string,
    type = 'text',
    placeholder = '',
  ) => (
    <div>
      <label htmlFor={`onboard-${name}`} className={labelClass} style={labelStyle}>
        {label}
      </label>
      <input
        id={`onboard-${name}`}
        type={type}
        placeholder={placeholder}
        {...register(name)}
        style={inputStyle}
        onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--accent-blue)')}
        onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
      />
      {errors[name] && (
        <p className="text-xs mt-1" style={{ color: 'var(--accent-red)' }}>
          {errors[name]?.message as string}
        </p>
      )}
    </div>
  );

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      {field('id', 'Username', 'text', 'john.doe')}
      {field('firstName', 'First Name', 'text', 'John')}
      {field('lastName', 'Last Name', 'text', 'Doe')}
      {field('email', 'Email', 'email', 'john.doe@example.com')}
      {field('password', 'Password', 'password', 'Min 6 characters')}

      {/* Tenant */}
      <div>
        <label htmlFor="onboard-tenantId" className={labelClass} style={labelStyle}>
          Tenant
        </label>
        <select
          id="onboard-tenantId"
          {...register('tenantId')}
          style={selectStyle}
          onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--accent-blue)')}
          onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
        >
          <option value="">Select tenant…</option>
          {tenants.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name ? `${t.name} (${t.id})` : t.id}
            </option>
          ))}
        </select>
        {errors.tenantId && (
          <p className="text-xs mt-1" style={{ color: 'var(--accent-red)' }}>
            {errors.tenantId.message}
          </p>
        )}
      </div>

      {/* Role */}
      <div>
        <label htmlFor="onboard-role" className={labelClass} style={labelStyle}>
          Role
        </label>
        <select
          id="onboard-role"
          {...register('role')}
          style={selectStyle}
          onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--accent-blue)')}
          onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
        >
          {ROLES.map((r) => (
            <option key={r.id} value={r.id}>
              {r.label}
            </option>
          ))}
        </select>
        {errors.role && (
          <p className="text-xs mt-1" style={{ color: 'var(--accent-red)' }}>
            {errors.role.message}
          </p>
        )}
      </div>

      {/* Access level */}
      <div>
        <label htmlFor="onboard-accessLevel" className={labelClass} style={labelStyle}>
          Access
        </label>
        <select
          id="onboard-accessLevel"
          {...register('accessLevel')}
          style={selectStyle}
          onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--accent-blue)')}
          onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
        >
          <option value="READ_WRITE">Read &amp; Write</option>
          <option value="READ_ONLY">Read Only</option>
        </select>
        {errors.accessLevel && (
          <p className="text-xs mt-1" style={{ color: 'var(--accent-red)' }}>
            {errors.accessLevel.message}
          </p>
        )}
      </div>

      <div className="flex items-center gap-2 pt-2">
        <Button type="submit" variant="primary" size="sm" disabled={isSubmitting}>
          <span className="inline-flex items-center gap-1.5">
            <Shield size={14} />
            {isSubmitting ? 'Onboarding…' : 'Onboard User'}
          </span>
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

/* ── Create Group Form ───────────────────────────────────── */

function CreateGroupFormPanel({
  isSubmitting,
  onSubmit,
  onCancel,
}: {
  isSubmitting: boolean;
  onSubmit: (data: CreateGroupForm) => void;
  onCancel: () => void;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateGroupForm>({
    resolver: zodResolver(createGroupSchema),
    defaultValues: {
      id: '',
      name: '',
      type: 'ORGANIZATIONAL',
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      {/* Group ID */}
      <div>
        <label htmlFor="cg-id" className={labelClass} style={labelStyle}>
          Group ID
        </label>
        <input
          id="cg-id"
          type="text"
          placeholder="engineering"
          {...register('id')}
          style={inputStyle}
          onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--accent-blue)')}
          onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
        />
        {errors.id && (
          <p className="text-xs mt-1" style={{ color: 'var(--accent-red)' }}>
            {errors.id.message}
          </p>
        )}
      </div>

      {/* Name */}
      <div>
        <label htmlFor="cg-name" className={labelClass} style={labelStyle}>
          Name
        </label>
        <input
          id="cg-name"
          type="text"
          placeholder="Engineering Team"
          {...register('name')}
          style={inputStyle}
          onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--accent-blue)')}
          onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
        />
        {errors.name && (
          <p className="text-xs mt-1" style={{ color: 'var(--accent-red)' }}>
            {errors.name.message}
          </p>
        )}
      </div>

      {/* Type */}
      <div>
        <label htmlFor="cg-type" className={labelClass} style={labelStyle}>
          Type
        </label>
        <select
          id="cg-type"
          {...register('type')}
          style={selectStyle}
          onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--accent-blue)')}
          onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
        >
          <option value="ORGANIZATIONAL">Organizational (candidate group)</option>
          <option value="WORKFLOW">Workflow (legacy)</option>
        </select>
        {errors.type && (
          <p className="text-xs mt-1" style={{ color: 'var(--accent-red)' }}>
            {errors.type.message}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-2">
        <Button type="submit" variant="primary" size="sm" disabled={isSubmitting}>
          <span className="inline-flex items-center gap-1.5">
            <Plus size={14} />
            {isSubmitting ? 'Creating...' : 'Create Group'}
          </span>
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

/* ── Manage Members Panel ────────────────────────────────── */

function ManageMembersPanel({
  group,
  allUsers,
}: {
  group: Group;
  allUsers: User[];
}) {
  const queryClient = useQueryClient();
  const [selectedUserId, setSelectedUserId] = useState('');

  const membersQueryKey = qk.users.groupMembers(group.id);

  const { data: members = [], isLoading: membersLoading } = useQuery({
    queryKey: membersQueryKey,
    queryFn: () => getUsers({ memberOfGroup: group.id, maxResults: 200 }),
  });

  // A membership change also moves the group's displayed member count, so refresh
  // ['groups'] alongside the member list — otherwise the count goes stale (#42).
  const invalidateMembers = () => {
    queryClient.invalidateQueries({ queryKey: membersQueryKey });
    queryClient.invalidateQueries({ queryKey: qk.groups.all });
  };

  const addMutation = useMutation({
    mutationFn: (userId: string) => addGroupMember(group.id, userId),
    onSuccess: () => {
      toast.success('Member added');
      setSelectedUserId('');
      invalidateMembers();
    },
    onError: () => toast.error('Failed to add member'),
  });

  const removeMutation = useMutation({
    mutationFn: (userId: string) => removeGroupMember(group.id, userId),
    onSuccess: () => {
      toast.success('Member removed');
      invalidateMembers();
    },
    onError: () => toast.error('Failed to remove member'),
  });

  // Users not already in the group — candidates for the add picker.
  const memberIds = useMemo(() => new Set(members.map((m) => m.id)), [members]);
  const candidates = useMemo(
    () => allUsers.filter((u) => !memberIds.has(u.id)),
    [allUsers, memberIds],
  );

  const userLabel = (u: User) => {
    const name = [u.firstName, u.lastName].filter(Boolean).join(' ').trim();
    return name ? `${name} (${u.id})` : u.id;
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Current members */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
            Members
          </span>
          <Badge variant="default">{members.length}</Badge>
        </div>

        {membersLoading ? (
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Loading…
          </p>
        ) : members.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            No members yet. Add one below.
          </p>
        ) : (
          <ul className="flex flex-col gap-1">
            {members.map((m) => (
              <li
                key={m.id}
                className="flex items-center justify-between rounded-md px-3 py-2"
                style={{ backgroundColor: 'var(--bg-elevated)' }}
              >
                <span className="text-sm min-w-0 truncate" style={{ color: 'var(--text-primary)' }}>
                  {userLabel(m)}
                </span>
                <ConfirmButton
                  variant="ghost"
                  size="sm"
                  disabled={removeMutation.isPending}
                  title="Remove member"
                  aria-label={`Remove ${m.id} from group ${group.name}`}
                  confirmTitle="Remove member"
                  confirmMessage={`Remove "${m.id}" from "${group.name}"?`}
                  confirmLabel="Remove"
                  onConfirm={() => removeMutation.mutate(m.id)}
                >
                  <X size={14} style={{ color: 'var(--accent-red)' }} />
                </ConfirmButton>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Add member */}
      <div>
        <label htmlFor="group-add-member" className={labelClass} style={labelStyle}>
          Add member
        </label>
        <div className="flex items-center gap-2">
          <select
            id="group-add-member"
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            style={selectStyle}
            disabled={candidates.length === 0}
            onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--accent-blue)')}
            onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
          >
            <option value="">
              {candidates.length === 0 ? 'All users are members' : 'Select user…'}
            </option>
            {candidates.map((u) => (
              <option key={u.id} value={u.id}>
                {userLabel(u)}
              </option>
            ))}
          </select>
          <Button
            variant="primary"
            size="sm"
            disabled={!selectedUserId || addMutation.isPending}
            onClick={() => addMutation.mutate(selectedUserId)}
          >
            <span className="inline-flex items-center gap-1.5">
              <UserPlus size={14} />
              Add
            </span>
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ── Create Tenant Form ──────────────────────────────────── */

function CreateTenantFormPanel({
  isSubmitting,
  onSubmit,
  onCancel,
}: {
  isSubmitting: boolean;
  onSubmit: (data: CreateTenantForm) => void;
  onCancel: () => void;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateTenantForm>({
    resolver: zodResolver(createTenantSchema),
    defaultValues: {
      id: '',
      name: '',
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      {/* Tenant ID */}
      <div>
        <label htmlFor="ct-id" className={labelClass} style={labelStyle}>
          Tenant ID
        </label>
        <input
          id="ct-id"
          type="text"
          placeholder="acme-corp"
          {...register('id')}
          style={inputStyle}
          onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--accent-blue)')}
          onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
        />
        {errors.id && (
          <p className="text-xs mt-1" style={{ color: 'var(--accent-red)' }}>
            {errors.id.message}
          </p>
        )}
      </div>

      {/* Name */}
      <div>
        <label htmlFor="ct-name" className={labelClass} style={labelStyle}>
          Name
        </label>
        <input
          id="ct-name"
          type="text"
          placeholder="Acme Corp"
          {...register('name')}
          style={inputStyle}
          onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--accent-blue)')}
          onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
        />
        {errors.name && (
          <p className="text-xs mt-1" style={{ color: 'var(--accent-red)' }}>
            {errors.name.message}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-2">
        <Button type="submit" variant="primary" size="sm" disabled={isSubmitting}>
          <span className="inline-flex items-center gap-1.5">
            <Plus size={14} />
            {isSubmitting ? 'Creating...' : 'Create Tenant'}
          </span>
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

/* ── Manage Tenant Members Panel ─────────────────────────── */

function ManageTenantMembersPanel({
  tenant,
  allUsers,
}: {
  tenant: Tenant;
  allUsers: User[];
}) {
  const queryClient = useQueryClient();
  const [selectedUserId, setSelectedUserId] = useState('');

  const membersQueryKey = qk.users.tenantMembers(tenant.id);

  const { data: members = [], isLoading: membersLoading } = useQuery({
    queryKey: membersQueryKey,
    queryFn: () => getUsers({ memberOfTenant: tenant.id, maxResults: 200 }),
  });

  // Membership changes don't move any count the tenants table renders today, but
  // keep the invalidation local to the member list for correctness (#42).
  const invalidateMembers = () =>
    queryClient.invalidateQueries({ queryKey: membersQueryKey });

  const addMutation = useMutation({
    mutationFn: (userId: string) => addTenantMember(tenant.id, userId),
    onSuccess: () => {
      toast.success('Member added');
      setSelectedUserId('');
      invalidateMembers();
    },
    onError: () => toast.error('Failed to add member'),
  });

  const removeMutation = useMutation({
    mutationFn: (userId: string) => removeTenantMember(tenant.id, userId),
    onSuccess: () => {
      toast.success('Member removed');
      invalidateMembers();
    },
    onError: () => toast.error('Failed to remove member'),
  });

  // Users not already in the tenant — candidates for the add picker.
  const memberIds = useMemo(() => new Set(members.map((m) => m.id)), [members]);
  const candidates = useMemo(
    () => allUsers.filter((u) => !memberIds.has(u.id)),
    [allUsers, memberIds],
  );

  const userLabel = (u: User) => {
    const name = [u.firstName, u.lastName].filter(Boolean).join(' ').trim();
    return name ? `${name} (${u.id})` : u.id;
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Current members */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
            Members
          </span>
          <Badge variant="default">{members.length}</Badge>
        </div>

        {membersLoading ? (
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Loading…
          </p>
        ) : members.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            No members yet. Add one below.
          </p>
        ) : (
          <ul className="flex flex-col gap-1">
            {members.map((m) => (
              <li
                key={m.id}
                className="flex items-center justify-between rounded-md px-3 py-2"
                style={{ backgroundColor: 'var(--bg-elevated)' }}
              >
                <span className="text-sm min-w-0 truncate" style={{ color: 'var(--text-primary)' }}>
                  {userLabel(m)}
                </span>
                <ConfirmButton
                  variant="ghost"
                  size="sm"
                  disabled={removeMutation.isPending}
                  title="Remove member"
                  aria-label={`Remove ${m.id} from tenant ${tenant.name || tenant.id}`}
                  confirmTitle="Remove member"
                  confirmMessage={`Remove "${m.id}" from "${tenant.name || tenant.id}"?`}
                  confirmLabel="Remove"
                  onConfirm={() => removeMutation.mutate(m.id)}
                >
                  <X size={14} style={{ color: 'var(--accent-red)' }} />
                </ConfirmButton>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Add member */}
      <div>
        <label htmlFor="tenant-add-member" className={labelClass} style={labelStyle}>
          Add member
        </label>
        <div className="flex items-center gap-2">
          <select
            id="tenant-add-member"
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            style={selectStyle}
            disabled={candidates.length === 0}
            onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--accent-blue)')}
            onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
          >
            <option value="">
              {candidates.length === 0 ? 'All users are members' : 'Select user…'}
            </option>
            {candidates.map((u) => (
              <option key={u.id} value={u.id}>
                {userLabel(u)}
              </option>
            ))}
          </select>
          <Button
            variant="primary"
            size="sm"
            disabled={!selectedUserId || addMutation.isPending}
            onClick={() => addMutation.mutate(selectedUserId)}
          >
            <span className="inline-flex items-center gap-1.5">
              <UserPlus size={14} />
              Add
            </span>
          </Button>
        </div>
      </div>
    </div>
  );
}
