'use client';

import { useEffect, useRef, useState } from 'react';
import { Gift, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { storefrontService } from '@/services/store.service';

const PHONE_REGEX = /^[6-9]\d{9}$/;

export function NewsletterBanner() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [joined, setJoined] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    nameInputRef.current?.focus();
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanedName = name.trim();
    if (cleanedName.length < 2) {
      toast.error('Enter your name');
      return;
    }

    const cleaned = phone.replace(/\D/g, '').slice(-10);
    if (!PHONE_REGEX.test(cleaned)) {
      toast.error('Enter a valid 10-digit mobile number');
      return;
    }

    setSubmitting(true);
    try {
      await storefrontService.joinVip({ name: cleanedName, phone: cleaned });
      setName('');
      setPhone('');
      setJoined(true);
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not join right now. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="bg-maroon py-10 sm:py-12" aria-label="VIP list signup">
      <div className="mx-auto flex max-w-[90rem] flex-col items-center gap-6 px-4 sm:flex-row sm:justify-between sm:px-10">
        <div className="flex items-start gap-4 text-white sm:max-w-lg">
          <Gift className="mt-1 h-6 w-6 shrink-0 text-gold" strokeWidth={1.5} />
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide">Exclusive Offers & First Access</p>
            <p className="mt-1 text-sm text-white/80">
              Join our VIP list with your name and mobile number and be the first to know about new
              collections, offers &amp; more.
            </p>
          </div>
        </div>

        {joined ? (
          <div className="flex items-center gap-2 rounded-sm bg-white/10 px-5 py-3 text-center text-white sm:px-6">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-gold" strokeWidth={1.5} />
            <p className="text-sm font-medium sm:text-base">
              Thank you for joining as a VIP member
            </p>
          </div>
        ) : !open ? (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="h-10 shrink-0 bg-gold px-6 text-[0.65rem] font-bold tracking-[0.1em] text-charcoal transition-colors hover:bg-gold-dark sm:h-11 sm:px-8 sm:text-xs sm:tracking-[0.15em]"
          >
            <span className="sm:hidden">JOIN</span>
            <span className="hidden sm:inline">JOIN NOW</span>
          </button>
        ) : (
          <form
            className="flex w-full max-w-sm flex-col gap-2 self-center sm:max-w-md sm:self-auto sm:flex-row sm:items-stretch sm:gap-0"
            onSubmit={handleSubmit}
          >
            <input
              ref={nameInputRef}
              type="text"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, 100))}
              placeholder="Your name"
              className="h-10 w-full border-0 bg-white px-3 text-xs text-charcoal outline-none ring-0 placeholder:text-xs placeholder:text-muted focus:border-0 focus:outline-none focus:ring-0 sm:h-11 sm:w-36 sm:px-4 sm:text-sm sm:placeholder:text-sm"
              aria-label="Your name"
              disabled={submitting}
            />
            <input
              type="tel"
              inputMode="numeric"
              autoComplete="tel"
              maxLength={10}
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
              placeholder="Mobile no."
              className="h-10 w-full border-0 bg-white px-3 text-xs text-charcoal outline-none ring-0 placeholder:text-xs placeholder:text-muted focus:border-0 focus:outline-none focus:ring-0 sm:h-11 sm:w-40 sm:px-4 sm:text-sm sm:placeholder:text-sm"
              aria-label="Mobile number"
              disabled={submitting}
            />
            <button
              type="submit"
              disabled={submitting}
              className="h-10 shrink-0 bg-gold px-4 text-[0.65rem] font-bold tracking-[0.1em] text-charcoal transition-colors hover:bg-gold-dark disabled:opacity-60 sm:h-11 sm:px-6 sm:text-xs sm:tracking-[0.15em]"
            >
              <span className="sm:hidden">{submitting ? '...' : 'SUBMIT'}</span>
              <span className="hidden sm:inline">{submitting ? 'JOINING...' : 'SUBMIT'}</span>
            </button>
          </form>
        )}
      </div>
    </section>
  );
}
