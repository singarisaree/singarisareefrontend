'use client';

import { CustomerLoginDialog } from '@/components/auth/customer-login-dialog';
import { useCustomerAuth } from '@/components/customer-auth-provider';

type CheckoutLoginDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialPhone?: string;
  /** Called after OTP verify succeeds — start payment immediately. */
  onVerified: () => void;
};

export function CheckoutLoginDialog({
  open,
  onOpenChange,
  initialPhone = '',
  onVerified,
}: CheckoutLoginDialogProps) {
  const { setCustomer } = useCustomerAuth();

  return (
    <CustomerLoginDialog
      open={open}
      onOpenChange={onOpenChange}
      setCustomer={setCustomer}
      initialPhone={initialPhone}
      title="Login to pay"
      description="Verify your mobile number with OTP, then payment opens automatically."
      verifyLabel="Verify & pay"
      successMessage="Logged in — opening payment…"
      onVerified={onVerified}
    />
  );
}
