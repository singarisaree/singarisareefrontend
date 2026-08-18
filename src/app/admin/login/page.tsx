'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import axios from 'axios';
import { Eye, EyeOff } from 'lucide-react';
import { adminAuthService } from '@/services/admin.service';
import { getApiErrorMessage, getConnectionErrorMessage, isConnectionError } from '@/lib/api-error';
import { reconnectRealtimeSocket } from '@/lib/socket-client';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function AdminLoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true);
    try {
      await adminAuthService.login(data.email, data.password);
      reconnectRealtimeSocket();
      toast.success('Welcome back!');
      router.push('/admin');
    } catch (err) {
      if (isConnectionError(err)) {
        toast.error(getConnectionErrorMessage());
      } else if (axios.isAxiosError(err) && err.response?.status === 429) {
        toast.error('Too many requests. Wait a moment and try again.');
      } else if (axios.isAxiosError(err) && err.response?.status === 401) {
        toast.error('Invalid credentials');
      } else {
        toast.error(getApiErrorMessage(err));
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-cream pattern-mandala px-4 relative overflow-hidden">
      {/* Soft background glow */}
      <div className="absolute -top-40 -left-40 h-80 w-80 rounded-full bg-maroon/5 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 h-80 w-80 rounded-full bg-gold/10 blur-3xl pointer-events-none" />

      <div className="w-full max-w-md rounded-2xl border border-maroon/10 bg-white/95 backdrop-blur-sm p-8 shadow-xl relative z-10 hover:border-maroon/20 transition-all duration-300">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-maroon border-2 border-gold text-xl font-serif font-semibold text-gold shadow-md shadow-maroon/20">
            SS
          </div>
          <h1 className="mt-5 text-2xl font-serif font-semibold text-maroon tracking-wide">Singari Sarees</h1>
          <p className="mt-1 text-sm text-muted font-medium">Admin Console — Sign in to continue</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-6">
          <div>
            <label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-maroon-dark">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              {...register('email')}
              placeholder="admin@singarisarees.com"
              className="mt-1.5 h-11 w-full rounded-lg border border-beige bg-ivory px-4 text-sm focus:border-maroon focus:outline-none focus:ring-2 focus:ring-maroon/10 transition-all"
            />
            {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message as string}</p>}
          </div>
          <div>
            <label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider text-maroon-dark">
              Password
            </label>
            <div className="relative mt-1.5">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                {...register('password')}
                placeholder="••••••••"
                className="h-11 w-full rounded-lg border border-beige bg-ivory px-4 pr-11 text-sm focus:border-maroon focus:outline-none focus:ring-2 focus:ring-maroon/10 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-muted hover:text-maroon transition-colors"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message as string}</p>}
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="mt-2 h-11 w-full rounded-lg bg-maroon text-sm font-serif font-semibold tracking-wider text-white transition-all duration-300 hover:bg-maroon-dark hover:shadow-lg hover:shadow-maroon/20 active:scale-[0.99] disabled:opacity-60 disabled:pointer-events-none"
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
