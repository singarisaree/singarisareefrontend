'use client';

import { FormEvent, Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { customerAuthService } from '@/services/customer-auth.service';
import { useCustomerAuth } from '@/components/customer-auth-provider';
import { getApiErrorMessage } from '@/lib/api-error';
import { Footer } from '@/components/layout/footer';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { customer, isLoading: authLoading, setCustomer } = useCustomerAuth();

  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [debugOtp, setDebugOtp] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const redirectTo = searchParams.get('next') || '/';

  useEffect(() => {
    if (authLoading || !customer) return;
    router.replace(redirectTo.startsWith('/') ? redirectTo : '/');
  }, [authLoading, customer, redirectTo, router]);

  const handleSendOtp = async (event: FormEvent) => {
    event.preventDefault();
    const cleaned = phone.replace(/\D/g, '').slice(-10);
    if (!/^[6-9]\d{9}$/.test(cleaned)) {
      toast.error('Enter a valid 10-digit mobile number');
      return;
    }

    setSending(true);
    try {
      const result = await customerAuthService.sendOtp(cleaned);
      setPhone(cleaned);
      setStep('otp');
      setDebugOtp(result.debugOtp || null);
      toast.success(result.debugOtp ? 'OTP ready (dev mode)' : 'OTP sent on WhatsApp / SMS');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Could not send OTP'));
    } finally {
      setSending(false);
    }
  };

  const handleVerify = async (event: FormEvent) => {
    event.preventDefault();
    if (!/^\d{6}$/.test(otp.trim())) {
      toast.error('Enter the 6-digit OTP');
      return;
    }

    setVerifying(true);
    try {
      const result = await customerAuthService.verifyOtp({
        phone,
        otp: otp.trim(),
      });
      setCustomer(result.customer);
      toast.success('Logged in');
      router.replace(redirectTo.startsWith('/') ? redirectTo : '/');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Could not verify OTP'));
    } finally {
      setVerifying(false);
    }
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
              {debugOtp ? (
                <p className="rounded-md bg-beige/50 px-3 py-2 text-xs text-brown-light">
                  Dev OTP (Sent.dm keys not set):{' '}
                  <span className="font-mono font-semibold">{debugOtp}</span>
                </p>
              ) : null}
              <div>
                <Label htmlFor="otp">OTP</Label>
                <Input
                  id="otp"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="6-digit code"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="mt-1.5"
                />
              </div>
              <Button type="submit" variant="gold" className="w-full" disabled={verifying}>
                {verifying ? 'Verifying…' : 'Verify & login'}
              </Button>
              <button
                type="button"
                className="w-full text-center text-xs text-gold hover:underline"
                onClick={() => {
                  setStep('phone');
                  setOtp('');
                  setDebugOtp(null);
                }}
              >
                Change number
              </button>
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
