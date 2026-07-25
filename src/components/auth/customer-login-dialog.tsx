'use client';

import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { isAxiosError } from 'axios';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { customerAuthService } from '@/services/customer-auth.service';
import type { StoreCustomer } from '@/services/customer-auth.service';
import { getApiErrorMessage } from '@/lib/api-error';
import { cn } from '@/lib/utils';

const DEFAULT_RESEND_SECONDS = 45;

function parseRetrySeconds(message: string | undefined, fallback: number): number {
  if (!message) return fallback;
  const match = message.match(/(\d+)\s*second/i);
  if (!match) return fallback;
  const value = Number(match[1]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

export type CustomerLoginDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  setCustomer: (customer: StoreCustomer | null) => void;
  initialPhone?: string;
  title?: string;
  description?: string;
  verifyLabel?: string;
  successMessage?: string;
  /** Called after OTP verify succeeds (and dialog closes). */
  onVerified?: () => void;
};

export function CustomerLoginDialog({
  open,
  onOpenChange,
  setCustomer,
  initialPhone = '',
  title = 'Login',
  description = 'Verify your mobile number with an OTP sent by SMS.',
  verifyLabel = 'Verify & login',
  successMessage = 'Logged in',
  onVerified,
}: CustomerLoginDialogProps) {
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [debugOtp, setDebugOtp] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [resending, setResending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const sendInFlight = useRef(false);
  const verifyInFlight = useRef(false);
  const otpInputRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef(phone);
  phoneRef.current = phone;
  /** Lift dialog toward top on mobile when the soft keyboard is open. */
  const [keyboardLifted, setKeyboardLifted] = useState(false);

  const reset = useCallback(() => {
    setOtp('');
    setStep('phone');
    setDebugOtp(null);
    setSending(false);
    setResending(false);
    setVerifying(false);
    setResendIn(0);
    setKeyboardLifted(false);
    sendInFlight.current = false;
    verifyInFlight.current = false;
  }, []);

  useEffect(() => {
    if (!open) {
      reset();
      return;
    }
    const cleaned = initialPhone.replace(/\D/g, '').slice(-10);
    setPhone(cleaned);
  }, [open, initialPhone, reset]);

  useEffect(() => {
    if (!open) return;

    const syncKeyboard = () => {
      if (typeof window === 'undefined') return;
      const vv = window.visualViewport;
      // Soft keyboard typically shrinks the visual viewport vs the layout height.
      const covered = vv
        ? window.innerHeight - vv.height > 100
        : false;
      setKeyboardLifted(covered);
    };

    syncKeyboard();
    const vv = window.visualViewport;
    vv?.addEventListener('resize', syncKeyboard);
    vv?.addEventListener('scroll', syncKeyboard);
    window.addEventListener('resize', syncKeyboard);
    return () => {
      vv?.removeEventListener('resize', syncKeyboard);
      vv?.removeEventListener('scroll', syncKeyboard);
      window.removeEventListener('resize', syncKeyboard);
    };
  }, [open]);

  const onFieldFocus = () => {
    // Immediate lift on focus — visualViewport can lag a frame behind the keypad.
    if (typeof window !== 'undefined' && window.matchMedia('(max-width: 639px)').matches) {
      setKeyboardLifted(true);
    }
  };

  const onFieldBlur = () => {
    window.setTimeout(() => {
      const vv = window.visualViewport;
      const covered = vv ? window.innerHeight - vv.height > 100 : false;
      if (!covered) setKeyboardLifted(false);
    }, 150);
  };

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = window.setTimeout(() => setResendIn((s) => Math.max(0, s - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [resendIn]);

  useEffect(() => {
    if (step !== 'otp') return;
    const id = window.setTimeout(() => otpInputRef.current?.focus(), 50);
    return () => window.clearTimeout(id);
  }, [step]);

  const applySendResult = useCallback(
    (
      result: {
        phone: string;
        resendAfterSeconds?: number;
        debugOtp?: string;
      },
      isResend: boolean,
    ) => {
      setPhone(result.phone);
      setStep('otp');
      setDebugOtp(result.debugOtp || null);
      setResendIn(result.resendAfterSeconds ?? DEFAULT_RESEND_SECONDS);
      if (result.debugOtp) setOtp(result.debugOtp);
      else if (isResend) setOtp('');

      toast.success(
        result.debugOtp
          ? isResend
            ? 'New OTP ready (dev mode)'
            : 'OTP ready (dev mode)'
          : isResend
            ? 'OTP resent by SMS'
            : 'OTP sent by SMS',
      );
    },
    [],
  );

  const requestOtp = useCallback(
    async (phoneValue: string, isResend: boolean) => {
      if (sendInFlight.current) return;
      sendInFlight.current = true;
      if (isResend) setResending(true);
      else setSending(true);

      if (!isResend) {
        setPhone(phoneValue);
        setStep('otp');
        setOtp('');
        setDebugOtp(null);
        setResendIn(DEFAULT_RESEND_SECONDS);
      }

      try {
        const result = await customerAuthService.sendOtp(phoneValue);
        applySendResult(result, isResend);
      } catch (error) {
        if (isAxiosError(error) && error.response?.status === 429) {
          setResendIn(parseRetrySeconds(getApiErrorMessage(error), DEFAULT_RESEND_SECONDS));
          setStep('otp');
          toast.info(getApiErrorMessage(error, 'Please wait before requesting another OTP'));
          return;
        }
        if (!isResend) {
          setStep('phone');
          setResendIn(0);
        }
        toast.error(getApiErrorMessage(error, 'Could not send OTP'));
      } finally {
        sendInFlight.current = false;
        setSending(false);
        setResending(false);
      }
    },
    [applySendResult],
  );

  const handleSendOtp = async (event: FormEvent) => {
    event.preventDefault();
    const cleaned = phone.replace(/\D/g, '').slice(-10);
    if (!/^[6-9]\d{9}$/.test(cleaned)) {
      toast.error('Enter a valid 10-digit mobile number');
      return;
    }
    await requestOtp(cleaned, false);
  };

  const handleVerify = async (event: FormEvent) => {
    event.preventDefault();
    const code = otp.replace(/\D/g, '').slice(0, 6);
    if (!/^\d{6}$/.test(code)) {
      toast.error('Enter the 6-digit OTP');
      return;
    }
    if (verifyInFlight.current) return;
    verifyInFlight.current = true;
    setVerifying(true);
    try {
      const result = await customerAuthService.verifyOtp({
        phone: phoneRef.current,
        otp: code,
      });
      setCustomer(result.customer);
      onOpenChange(false);
      toast.success(successMessage);
      onVerified?.();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Could not verify OTP'));
    } finally {
      verifyInFlight.current = false;
      setVerifying(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          'max-w-md border-beige bg-cream transition-[top,transform] duration-200 sm:rounded-2xl',
          'max-sm:max-h-[min(92dvh,100%)] max-sm:overflow-y-auto',
          keyboardLifted &&
            'max-sm:!top-[38%] max-sm:!-translate-y-1/2',
        )}
      >
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl text-charcoal">{title}</DialogTitle>
          <DialogDescription className="text-brown-light">{description}</DialogDescription>
        </DialogHeader>

        {step === 'phone' ? (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div>
              <Label htmlFor="customer-login-phone">Mobile number</Label>
              <Input
                id="customer-login-phone"
                inputMode="numeric"
                autoComplete="tel"
                placeholder="10-digit mobile"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                onFocus={onFieldFocus}
                onBlur={onFieldBlur}
                className="mt-1.5"
                autoFocus
              />
            </div>
            <Button type="submit" variant="gold" className="w-full" disabled={sending}>
              {sending ? 'Sending…' : 'Send OTP'}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleVerify} className="space-y-4">
            <p className="text-sm text-brown-light">
              OTP sent to <span className="font-medium text-charcoal">{phone}</span>
            </p>
            {debugOtp ? (
              <p className="rounded-md bg-beige/50 px-3 py-2 text-xs text-brown-light">
                Dev OTP: <span className="font-mono font-semibold">{debugOtp}</span>
              </p>
            ) : null}
            <div>
              <Label htmlFor="customer-login-otp">OTP</Label>
              <Input
                ref={otpInputRef}
                id="customer-login-otp"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="6-digit code"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                onFocus={onFieldFocus}
                onBlur={onFieldBlur}
                className="mt-1.5 tracking-[0.35em]"
                maxLength={6}
                disabled={verifying}
              />
            </div>
            <Button
              type="submit"
              variant="gold"
              className="w-full"
              disabled={verifying || otp.length < 6}
            >
              {verifying ? 'Verifying…' : verifyLabel}
            </Button>
            <div className="flex flex-col items-center gap-2">
              <button
                type="button"
                disabled={resendIn > 0 || resending || verifying}
                onClick={() => void requestOtp(phoneRef.current, true)}
                className="text-sm font-medium text-maroon hover:text-charcoal disabled:text-brown-light/70"
              >
                {resending
                  ? 'Resending…'
                  : resendIn > 0
                    ? `Resend OTP in ${resendIn}s`
                    : 'Resend OTP'}
              </button>
              <button
                type="button"
                className="text-xs text-gold hover:underline"
                disabled={verifying}
                onClick={() => {
                  setStep('phone');
                  setOtp('');
                  setDebugOtp(null);
                }}
              >
                Change number
              </button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
