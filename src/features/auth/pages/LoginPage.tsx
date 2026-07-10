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

// TailAdmin text input: rounded, bordered, brand focus ring, dark-mode aware.
const inputClass =
  'h-11 w-full rounded-lg border border-gray-200 bg-transparent px-4 py-2.5 text-theme-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-white/[0.03] dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800';

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
    <div className="min-h-screen flex items-center justify-center px-4 bg-gray-50 dark:bg-gray-950">
      <div className="w-full max-w-sm">
        <Card>
          {/* Wordmark */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-2">
              <Hexagon size={32} className="text-brand-500 dark:text-brand-400" />
              <h1 className="font-heading text-2xl font-bold tracking-wider text-brand-500 dark:text-brand-400">
                LUKE CORE
              </h1>
            </div>
            <p className="text-sm mt-1 text-gray-500 dark:text-gray-400">
              Sign in to continue
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Username */}
            <div>
              <label className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-gray-300">
                Username
              </label>
              <input
                type="text"
                autoComplete="username"
                placeholder="Enter username"
                {...register('username')}
                className={inputClass}
              />
              {errors.username && (
                <p className="text-xs mt-1 text-error-500 dark:text-error-400">
                  {errors.username.message}
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-gray-300">
                Password
              </label>
              <input
                type="password"
                autoComplete="current-password"
                placeholder="Enter password"
                {...register('password')}
                className={inputClass}
              />
              {errors.password && (
                <p className="text-xs mt-1 text-error-500 dark:text-error-400">
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
