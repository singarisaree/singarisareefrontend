'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import axios from 'axios';
import { adminAuthService } from '@/services/admin.service';
import { getApiErrorMessage, getConnectionErrorMessage, isConnectionError } from '@/lib/api-error';
import { reconnectRealtimeSocket } from '@/lib/socket-client';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export default function AdminLoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: z.infer<typeof loginSchema>) => {
    setIsLoading(true);
    try {
      await adminAuthService.login(data.email, data.password);
      reconnectRealtimeSocket();
      toast.success('Welcome back!');
      router.push('/admin');
    } catch (err) {
      if (isConnectionError(err)) {
        toast.error(getConnectionErrorMessage());
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
    <div className="flex min-h-screen items-center justify-center bg-[#f1f5f9] px-4">
      <div className="w-full max-w-md rounded-2xl border border-[#e2e8f0] bg-white p-8 shadow-lg">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-[#0f172a] text-lg font-bold text-white">
            SS
          </div>
          <h1 className="mt-4 text-xl font-bold text-[#0f172a]">Singari Sarees</h1>
          <p className="text-sm text-[#64748b]">Admin Console — Sign in to continue</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-5">
          <div>
            <label htmlFor="email" className="text-sm font-medium text-[#334155]">Email</label>
            <input
              id="email"
              type="email"
              {...register('email')}
              className="mt-1.5 h-11 w-full rounded-lg border border-[#e2e8f0] px-4 text-sm focus:border-[#0f172a] focus:outline-none focus:ring-1 focus:ring-[#0f172a]"
            />
            {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message as string}</p>}
          </div>
          <div>
            <label htmlFor="password" className="text-sm font-medium text-[#334155]">Password</label>
            <input
              id="password"
              type="password"
              {...register('password')}
              className="mt-1.5 h-11 w-full rounded-lg border border-[#e2e8f0] px-4 text-sm focus:border-[#0f172a] focus:outline-none focus:ring-1 focus:ring-[#0f172a]"
            />
            {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message as string}</p>}
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="h-11 w-full rounded-lg bg-[#0f172a] text-sm font-semibold text-white transition-colors hover:bg-[#1e293b] disabled:opacity-60"
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
