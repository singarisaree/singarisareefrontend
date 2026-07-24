'use client';

import { Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export type PaymentOverlayPhase = 'processing' | 'checkout' | null;

const COPY: Record<Exclude<PaymentOverlayPhase, null>, { title: string; subtitle: string }> = {
  processing: {
    title: 'Almost there',
    subtitle: 'Opening secure payment…',
  },
  checkout: {
    title: 'Complete payment',
    subtitle: 'Use the Razorpay window to pay safely',
  },
};

export function PaymentStatusOverlay({ phase }: { phase: PaymentOverlayPhase }) {
  return (
    <AnimatePresence>
      {phase ? (
        <motion.div
          key={phase}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-cream px-6"
          role="alertdialog"
          aria-busy="true"
          aria-live="assertive"
          aria-label={COPY[phase].title}
        >
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.25 }}
            className="w-full max-w-sm border border-gold/15 bg-white px-6 py-8 text-center shadow-xl"
          >
            <Loader2 className="mx-auto h-9 w-9 animate-spin text-gold" />
            <p className="mt-4 font-serif text-xl text-charcoal">{COPY[phase].title}</p>
            <p className="mt-2 text-sm text-brown-light">{COPY[phase].subtitle}</p>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
