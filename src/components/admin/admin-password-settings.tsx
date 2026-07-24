'use client';

import { FormEvent, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { toast } from 'sonner';
import { adminAuthService } from '@/services/admin.service';

export function AdminPasswordSettings() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const changePassword = useMutation({
    mutationFn: () =>
      adminAuthService.changePassword({
        currentPassword,
        newPassword,
        confirmPassword,
      }),
    onSuccess: (result) => {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      if (result.emailSent) {
        toast.success(`Password updated. Check ${result.email} for the new password.`);
      } else {
        toast.success('Password updated, but the confirmation email could not be sent.');
      }
    },
    onError: (error: unknown) => {
      const message = isAxiosError(error)
        ? (error.response?.data as { message?: string } | undefined)?.message
        : undefined;
      toast.error(message || 'Could not update password');
    },
  });

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (currentPassword.length < 1) {
      toast.error('Enter your current password');
      return;
    }
    if (newPassword.length < 8) {
      toast.error('New password must be at least 8 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('New password and confirmation do not match');
      return;
    }
    if (currentPassword === newPassword) {
      toast.error('New password must be different from the current password');
      return;
    }
    changePassword.mutate();
  };

  return (
    <section className="space-y-4 rounded-xl border border-[#e2e8f0] bg-white p-6 shadow-sm">
      <div>
        <h2 className="text-lg font-semibold text-[#0f172a]">Change admin password</h2>
        <p className="mt-1 text-sm text-[#64748b]">
          Update your admin login password. The new password will also be emailed to your
          admin email address.
        </p>
      </div>

      <form onSubmit={onSubmit} className="max-w-md space-y-4">
        <div>
          <label htmlFor="currentPassword" className="text-sm font-medium text-[#334155]">
            Current password
          </label>
          <input
            id="currentPassword"
            type="password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-[#e2e8f0] px-3 py-2.5 text-sm text-[#0f172a] outline-none focus:border-[#0f172a]"
          />
        </div>
        <div>
          <label htmlFor="newPassword" className="text-sm font-medium text-[#334155]">
            New password
          </label>
          <input
            id="newPassword"
            type="password"
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-[#e2e8f0] px-3 py-2.5 text-sm text-[#0f172a] outline-none focus:border-[#0f172a]"
          />
          <p className="mt-1 text-xs text-[#94a3b8]">Minimum 8 characters</p>
        </div>
        <div>
          <label htmlFor="confirmPassword" className="text-sm font-medium text-[#334155]">
            Confirm new password
          </label>
          <input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-[#e2e8f0] px-3 py-2.5 text-sm text-[#0f172a] outline-none focus:border-[#0f172a]"
          />
        </div>

        <button
          type="submit"
          disabled={changePassword.isPending}
          className="rounded-lg bg-[#0f172a] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#1e293b] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {changePassword.isPending ? 'Updating…' : 'Update password'}
        </button>
      </form>
    </section>
  );
}
