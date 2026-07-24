'use client';

import { FormEvent, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { adminAuthService } from '@/services/admin.service';

function PasswordField({
  id,
  label,
  value,
  onChange,
  autoComplete,
  hint,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: string;
  hint?: string;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div>
      <label htmlFor={id} className="text-sm font-medium text-[#334155]">
        {label}
      </label>
      <div className="relative mt-1.5">
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-lg border border-[#e2e8f0] px-3 py-2.5 pr-11 text-sm text-[#0f172a] outline-none focus:border-[#0f172a]"
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute inset-y-0 right-0 flex items-center px-3 text-[#64748b] hover:text-[#0f172a]"
          aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {hint ? <p className="mt-1 text-xs text-[#94a3b8]">{hint}</p> : null}
    </div>
  );
}

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
        <PasswordField
          id="currentPassword"
          label="Current password"
          autoComplete="current-password"
          value={currentPassword}
          onChange={setCurrentPassword}
        />
        <PasswordField
          id="newPassword"
          label="New password"
          autoComplete="new-password"
          value={newPassword}
          onChange={setNewPassword}
          hint="Minimum 8 characters"
        />
        <PasswordField
          id="confirmPassword"
          label="Confirm new password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={setConfirmPassword}
        />

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
