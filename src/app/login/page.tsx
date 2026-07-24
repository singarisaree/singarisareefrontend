'use client';

import { FormEvent, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { isAxiosError } from 'axios';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { customerAuthService } from '@/services/customer-auth.service';
import { useCustomerAuth } from '@/components/customer-auth-provider';
import { getApiErrorMessage } from '@/lib/api-error';
import { Footer } from '@/components/layout/footer';

const DEFAULT_RESEND_SECONDS = 45;

type OtpCredential = Credential & { code?: string };

function parseRetrySeconds(message: string | undefined, fallback: number): number {
  if (!message) return fallback;
  const match = message.match(/(\d+)\s*second/i);
  if (!match) return fallback;
  const value = Number(match[1]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { customer, isLoading: authLoading, setCustomer } = useCustomerAuth();

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
  const lastAutoVerified = useRef<string | null>(null);
  const otpInputRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef(phone);
  const redirectTo = searchParams.get('next') || '/';
  const redirectPath = redirectTo.startsWith('/') ? redirectTo : '/';

  phoneRef.current = phone;

  useEffect(() => {
    if (authLoading || !customer) return;
    router.replace(redirectPath);
  }, [authLoading, customer, redirectPath, router]);

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = window.setTimeout(() => setResendIn((s) => Math.max(0, s - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [resendIn]);

  const verifyOtpCode = useCallback(
    async (codeRaw: string, source: 'manual' | 'auto' = 'manual') => {
      const code = codeRaw.replace(/\D/g, '').slice(0, 6);
      if (!/^\d{6}$/.test(code)) {
        if (source === 'manual') toast.error('Enter the 6-digit OTP');
        return;
      }
      if (verifyInFlight.current) return;
      if (source === 'auto' && lastAutoVerified.current === code) return;

      verifyInFlight.current = true;
      if (source === 'auto') lastAutoVerified.current = code;
      setVerifying(true);
      setOtp(code);

      try {
        const result = await customerAuthService.verifyOtp({
          phone: phoneRef.current,
          otp: code,
        });
        setCustomer(result.customer);
        toast.success(source === 'auto' ? 'Logged in automatically' : 'Logged in');
        router.replace(redirectPath);
      } catch (error) {
        // Keep lastAutoVerified so we don't spam retries; user can edit OTP or tap Verify.
        toast.error(getApiErrorMessage(error, 'Could not verify OTP'));
      } finally {
        verifyInFlight.current = false;
        setVerifying(false);
      }
    },
    [redirectPath, router, setCustomer],
  );

  // Autofill from SMS via Web OTP API (Chrome Android) when on OTP step.
  useEffect(() => {
    if (step !== 'otp') return;
    if (typeof window === 'undefined') return;

    const credentials = navigator.credentials;
    if (!credentials?.get) return;

    const abort = new AbortController();
    const timeout = window.setTimeout(() => abort.abort(), 2 * 60 * 1000);

    void credentials
      .get({
        otp: { transport: ['sms'] },
        signal: abort.signal,
      } as CredentialRequestOptions & { otp: { transport: string[] } })
      .then((credential) => {
        const code = (credential as OtpCredential | null)?.code?.replace(/\D/g, '').slice(0, 6);
        if (code && /^\d{6}$/.test(code)) {
          setOtp(code);
          void verifyOtpCode(code, 'auto');
        }
      })
      .catch(() => {
        // Unsupported, dismissed, or aborted — user can type OTP manually.
      });

    return () => {
      window.clearTimeout(timeout);
      abort.abort();
    };
  }, [step, verifyOtpCode]);

  // Focus OTP field when the OTP step opens.
  useEffect(() => {
    if (step !== 'otp') return;
    const id = window.setTimeout(() => otpInputRef.current?.focus(), 50);
    return () => window.clearTimeout(id);
  }, [step]);

  // Auto-verify as soon as 6 digits are present (paste, OS autofill, or typing).
  useEffect(() => {
    if (step !== 'otp') return;
    if (!/^\d{6}$/.test(otp)) return;
    if (verifyInFlight.current || verifying) return;
    if (lastAutoVerified.current === otp) return;
    void verifyOtpCode(otp, 'auto');
  }, [otp, step, verifying, verifyOtpCode]);

  const applySendResult = useCallback(
    (
      result: {
        phone: string;
        resendAfterSeconds?: number;
        debugOtp?: string;
        channels?: Array<'whatsapp' | 'sms' | 'debug'>;
      },
      isResend: boolean,
    ) => {
      setPhone(result.phone);
      setStep('otp');
      setDebugOtp(result.debugOtp || null);
      setResendIn(result.resendAfterSeconds ?? DEFAULT_RESEND_SECONDS);
      lastAutoVerified.current = null;

      if (result.debugOtp) {
        setOtp(result.debugOtp);
      } else if (isResend) {
        setOtp('');
      }

      const channels = result.channels ?? [];
      toast.success(
        result.debugOtp
          ? isResend
            ? 'New OTP ready (dev mode)'
            : 'OTP ready (dev mode)'
          : channels.includes('whatsapp') && channels.includes('sms')
            ? isResend
              ? 'OTP resent on WhatsApp and SMS'
              : 'OTP sent on WhatsApp and SMS — use either'
            : channels.includes('whatsapp')
              ? isResend
                ? 'OTP resent on WhatsApp'
                : 'OTP sent on WhatsApp'
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

      try {
        const result = await customerAuthService.sendOtp(phoneValue);
        applySendResult(result, isResend);
      } catch (error) {
        if (isAxiosError(error) && error.response?.status === 429) {
          const seconds = parseRetrySeconds(
            getApiErrorMessage(error),
            DEFAULT_RESEND_SECONDS,
          );
          setResendIn(seconds);
          setStep('otp');
          toast.info(getApiErrorMessage(error, 'Please wait before requesting another OTP'));
          return;
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
    if (sendInFlight.current || sending) return;

    const cleaned = phone.replace(/\D/g, '').slice(-10);
    if (!/^[6-9]\d{9}$/.test(cleaned)) {
      toast.error('Enter a valid 10-digit mobile number');
      return;
    }

    await requestOtp(cleaned, false);
  };

  const handleResendOtp = async () => {
    if (resendIn > 0 || resending || sendInFlight.current || !phone) return;
    await requestOtp(phone, true);
  };

  const handleVerify = async (event: FormEvent) => {
    event.preventDefault();
    await verifyOtpCode(otp, 'manual');
  };

  const handleOtpChange = (value: string) => {
    const next = value.replace(/\D/g, '').slice(0, 6);
    lastAutoVerified.current = null;
    setOtp(next);
  };

  return (
    <div className="rounded-2xl border border-beige bg-white p-6 shadow-sm sm:p-8">
      {authLoading || customer ? (
        <div className="py-8 text-center text-sm text-brown-light">Loading…</div>
      ) : (
        <>
          <h1 className="font-serif text-2xl text-charcoal">Login</h1>
          <p className="mt-1 text-sm text-brown-light">Sign in with your mobile number</p>

          {step === 'phone' ? (
            <form onSubmit={handleSendOtp} className="mt-6 space-y-4">
              <div>
                <Label htmlFor="phone">Mobile number</Label>
                <Input
                  id="phone"
                  inputMode="numeric"
                  autoComplete="tel"
                  placeholder="10-digit mobile"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  className="mt-1.5"
                />
              </div>
              <Button type="submit" variant="gold" className="w-full" disabled={sending}>
                {sending ? 'Sending…' : 'Send OTP'}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerify} className="mt-6 space-y-4">
              <p className="text-sm text-brown-light">
                OTP sent to <span className="font-medium text-charcoal">{phone}</span>
              </p>
              <p className="text-xs text-brown-light">
                We can detect SMS OTP on supported phones, or you can enter it and verify.
              </p>
              {debugOtp ? (
                <p className="rounded-md bg-beige/50 px-3 py-2 text-xs text-brown-light">
                  Dev OTP (Sent.dm keys not set):{' '}
                  <span className="font-mono font-semibold">{debugOtp}</span>
                </p>
              ) : null}
              <div>
                <Label htmlFor="otp">OTP</Label>
                <Input
                  ref={otpInputRef}
                  id="otp"
                  name="otp"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  enterKeyHint="done"
                  placeholder="6-digit code"
                  value={otp}
                  onChange={(e) => handleOtpChange(e.target.value)}
                  onInput={(e) => handleOtpChange((e.target as HTMLInputElement).value)}
                  className="mt-1.5 tracking-[0.35em]"
                  maxLength={6}
                  disabled={verifying}
                />
              </div>
              <Button type="submit" variant="gold" className="w-full" disabled={verifying || otp.length < 6}>
                {verifying ? 'Verifying…' : 'Verify & login'}
              </Button>

              <div className="flex flex-col items-center gap-2 pt-1">
                <button
                  type="button"
                  disabled={resendIn > 0 || resending || verifying}
                  onClick={() => void handleResendOtp()}
                  className="text-sm font-medium text-maroon transition-colors hover:text-charcoal disabled:cursor-not-allowed disabled:text-brown-light/70"
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
                    setResendIn(0);
                    lastAutoVerified.current = null;
                  }}
                >
                  Change number
                </button>
              </div>
            </form>
          )}
        </>
      )}
    </div>
  );
}

function LoginBackButton() {
  const router = useRouter();

  const handleBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
      return;
    }
    router.push('/');
  };

  return (
    <button
      type="button"
      onClick={handleBack}
      className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-charcoal/70 transition-colors hover:text-maroon"
    >
      <ArrowLeft className="h-4 w-4" />
      Back
    </button>
  );
}

export default function CustomerLoginPage() {
  return (
    <>
      <div className="relative min-h-[70vh] overflow-hidden bg-cream pattern-mandala">
        <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-12">
          <LoginBackButton />
          <Suspense
            fallback={
              <div className="rounded-2xl border border-beige bg-white p-8 text-sm text-brown-light">
                Loading…
              </div>
            }
          >
            <LoginForm />
          </Suspense>
        </div>
      </div>
      <Footer />
    </>
  );
}
