import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { LogIn, Hexagon } from 'lucide-react';
import Button from '@/shared/ui/Button';
import Card from '@/shared/ui/Card';
import { useAuthStore } from '@/features/auth/stores/authStore';
import { useTenantStore } from '@/shared/stores/tenantStore';
import { api } from '@/shared/api/client';
import { getUserTenants } from '@/features/admin/api/tenant';

const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

type LoginForm = z.infer<typeof loginSchema>;

const inputStyle: React.CSSProperties = {
  backgroundColor: 'var(--bg-elevated)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-md)',
  color: 'var(--text-primary)',
  padding: '0.5rem 0.75rem',
  width: '100%',
  outline: 'none',
};

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const { setTenants, setActiveTenant } = useTenantStore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    setIsSubmitting(true);

    try {
      // Store credentials so the API client can use them
      login(data.username, data.password);

      // Verify connection by hitting the engine endpoint
      await api.get('/engine');

      // Fetch tenants the user belongs to
      const tenants = await getUserTenants(data.username);
      setTenants(tenants);

      if (tenants.length > 0) {
        setActiveTenant(tenants[0].id);
      }

      toast.success('Signed in successfully');
      navigate('/dashboard');
    } catch {
      // Clear credentials on failure
      useAuthStore.getState().logout();
      toast.error('Login failed. Check your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ backgroundColor: 'var(--bg-base)' }}
    >
      <div className="w-full max-w-sm">
        <Card>
          {/* Wordmark */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-2">
              <Hexagon size={32} style={{ color: 'var(--accent-blue)' }} />
              <h1
                className="font-heading text-2xl font-bold tracking-wider"
                style={{ color: 'var(--accent-blue)' }}
              >
                LUKE CORE
              </h1>
            </div>
            <p
              className="text-sm mt-1"
              style={{ color: 'var(--text-secondary)' }}
            >
              Sign in to continue
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Username */}
            <div>
              <label
                className="block text-sm font-medium mb-1.5"
                style={{ color: 'var(--text-secondary)' }}
              >
                Username
              </label>
              <input
                type="text"
                autoComplete="username"
                placeholder="Enter username"
                {...register('username')}
                style={inputStyle}
                onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--accent-blue)')}
                onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
              />
              {errors.username && (
                <p className="text-xs mt-1" style={{ color: 'var(--accent-red)' }}>
                  {errors.username.message}
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <label
                className="block text-sm font-medium mb-1.5"
                style={{ color: 'var(--text-secondary)' }}
              >
                Password
              </label>
              <input
                type="password"
                autoComplete="current-password"
                placeholder="Enter password"
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

            {/* Submit */}
            <Button
              type="submit"
              variant="primary"
              className="w-full"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                'Signing in...'
              ) : (
                <span className="inline-flex items-center gap-2">
                  <LogIn size={16} />
                  Sign In
                </span>
              )}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
