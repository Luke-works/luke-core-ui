import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Users, UserPlus, Trash2, Shield, Plus, UsersRound, X } from 'lucide-react';
import PageHeader from '@/shared/layout/PageHeader';
import Card from '@/shared/ui/Card';
import Button from '@/shared/ui/Button';
import Badge from '@/shared/ui/Badge';
import Drawer from '@/shared/ui/Drawer';
import EmptyState from '@/shared/ui/EmptyState';
import DataTable, { type ColumnDef } from '@/shared/ui/DataTable';
import CopyId from '@/shared/ui/CopyId';
import {
  getUsers,
  createUser,
  deleteUser,
  getGroups,
  createGroup,
  deleteGroup,
  addGroupMember,
  removeGroupMember,
  type User,
  type Group,
} from '@/features/admin/api/users';

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
  type: z.enum(['WORKFLOW', 'ORGANIZATIONAL'], {
    message: 'Type is required',
  }),
});

type CreateGroupForm = z.infer<typeof createGroupSchema>;

/* ── Users Page ──────────────────────────────────────────── */

export default function UsersPage() {
  const queryClient = useQueryClient();
  const [userDrawerOpen, setUserDrawerOpen] = useState(false);
  const [groupDrawerOpen, setGroupDrawerOpen] = useState(false);
  const [managingGroup, setManagingGroup] = useState<Group | null>(null);

  /* ── Queries ─────────────────────────────────────────── */

  const {
    data: users = [],
    isLoading: usersLoading,
  } = useQuery({
    queryKey: ['users'],
    queryFn: () => getUsers({ maxResults: 50 }),
  });

  const {
    data: groups = [],
    isLoading: groupsLoading,
  } = useQuery({
    queryKey: ['groups'],
    queryFn: () => getGroups({ maxResults: 50 }),
  });

  /* ── Mutations ───────────────────────────────────────── */

  const deleteUserMutation = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => {
      toast.success('User deleted');
      queryClient.invalidateQueries({ queryKey: ['users'] });
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
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: () => {
      toast.error('Failed to create user');
    },
  });

  const deleteGroupMutation = useMutation({
    mutationFn: deleteGroup,
    onSuccess: () => {
      toast.success('Group deleted');
      queryClient.invalidateQueries({ queryKey: ['groups'] });
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
      queryClient.invalidateQueries({ queryKey: ['groups'] });
    },
    onError: () => {
      toast.error('Failed to create group');
    },
  });

  /* ── User Columns ────────────────────────────────────── */

  const userColumns = useMemo<ColumnDef<User, any>[]>(
    () => [
      {
        accessorKey: 'id',
        header: 'ID',
        cell: ({ row }) => <CopyId id={row.original.id} />,
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
        cell: ({ row }) => (
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              if (window.confirm(`Delete user "${row.original.id}"? This cannot be undone.`)) {
                deleteUserMutation.mutate(row.original.id);
              }
            }}
            title="Delete user"
          >
            <Trash2 size={14} style={{ color: 'var(--accent-red)' }} />
          </Button>
        ),
      },
    ],
    [deleteUserMutation],
  );

  /* ── Group Columns ───────────────────────────────────── */

  const groupColumns = useMemo<ColumnDef<Group, any>[]>(
    () => [
      {
        accessorKey: 'id',
        header: 'ID',
        cell: ({ row }) => <CopyId id={row.original.id} />,
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
            >
              <UsersRound size={14} style={{ color: 'var(--accent-blue)' }} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                if (window.confirm(`Delete group "${row.original.id}"? This cannot be undone.`)) {
                  deleteGroupMutation.mutate(row.original.id);
                }
              }}
              title="Delete group"
            >
              <Trash2 size={14} style={{ color: 'var(--accent-red)' }} />
            </Button>
          </div>
        ),
      },
    ],
    [deleteGroupMutation],
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
            <Button
              variant="primary"
              size="sm"
              onClick={() => setUserDrawerOpen(true)}
            >
              <span className="inline-flex items-center gap-1.5">
                <UserPlus size={14} />
                Create User
              </span>
            </Button>
          }
        >
          {!usersLoading && users.length === 0 ? (
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
            <DataTable
              data={users}
              columns={userColumns}
              isLoading={usersLoading}
              emptyMessage="No users found."
            />
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
          {!groupsLoading && groups.length === 0 ? (
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
            <DataTable
              data={groups}
              columns={groupColumns}
              isLoading={groupsLoading}
              emptyMessage="No groups found."
            />
          )}
        </Card>
      </div>

      {/* ── Create User Drawer ─────────────────────────────── */}
      <Drawer
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
      </Drawer>

      {/* ── Create Group Drawer ────────────────────────────── */}
      <Drawer
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
      </Drawer>

      {/* ── Manage Members Drawer ──────────────────────────── */}
      <Drawer
        open={managingGroup !== null}
        onClose={() => setManagingGroup(null)}
        title={managingGroup ? `Manage Members — ${managingGroup.name}` : 'Manage Members'}
        width={420}
      >
        {managingGroup && (
          <ManageMembersPanel group={managingGroup} allUsers={users} />
        )}
      </Drawer>
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
        <label className={labelClass} style={labelStyle}>
          Username
        </label>
        <input
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
        <label className={labelClass} style={labelStyle}>
          First Name
        </label>
        <input
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
        <label className={labelClass} style={labelStyle}>
          Last Name
        </label>
        <input
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
        <label className={labelClass} style={labelStyle}>
          Email
        </label>
        <input
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
        <label className={labelClass} style={labelStyle}>
          Password
        </label>
        <input
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
      type: 'WORKFLOW',
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      {/* Group ID */}
      <div>
        <label className={labelClass} style={labelStyle}>
          Group ID
        </label>
        <input
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
        <label className={labelClass} style={labelStyle}>
          Name
        </label>
        <input
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
        <label className={labelClass} style={labelStyle}>
          Type
        </label>
        <select
          {...register('type')}
          style={selectStyle}
          onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--accent-blue)')}
          onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
        >
          <option value="WORKFLOW">WORKFLOW</option>
          <option value="ORGANIZATIONAL">ORGANIZATIONAL</option>
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

  const membersQueryKey = ['group-members', group.id];

  const { data: members = [], isLoading: membersLoading } = useQuery({
    queryKey: membersQueryKey,
    queryFn: () => getUsers({ memberOfGroup: group.id, maxResults: 200 }),
  });

  const addMutation = useMutation({
    mutationFn: (userId: string) => addGroupMember(group.id, userId),
    onSuccess: () => {
      toast.success('Member added');
      setSelectedUserId('');
      queryClient.invalidateQueries({ queryKey: membersQueryKey });
    },
    onError: () => toast.error('Failed to add member'),
  });

  const removeMutation = useMutation({
    mutationFn: (userId: string) => removeGroupMember(group.id, userId),
    onSuccess: () => {
      toast.success('Member removed');
      queryClient.invalidateQueries({ queryKey: membersQueryKey });
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
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={removeMutation.isPending}
                  onClick={() => {
                    if (window.confirm(`Remove "${m.id}" from "${group.name}"?`)) {
                      removeMutation.mutate(m.id);
                    }
                  }}
                  title="Remove member"
                >
                  <X size={14} style={{ color: 'var(--accent-red)' }} />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Add member */}
      <div>
        <label className={labelClass} style={labelStyle}>
          Add member
        </label>
        <div className="flex items-center gap-2">
          <select
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
