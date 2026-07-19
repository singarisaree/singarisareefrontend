import { toast as sonnerToast, type ExternalToast } from 'sonner';

const DURATION = {
  quick: 1000,
  default: 1800,
  error: 2800,
} as const;

type ToastOptions = Pick<ExternalToast, 'duration'>;

export const toast = {
  success: (message: string, options?: ToastOptions) =>
    sonnerToast.success(message, { duration: options?.duration ?? DURATION.default }),
  /** Short confirmation — e.g. add to cart */
  quick: (message: string) => sonnerToast.success(message, { duration: DURATION.quick }),
  error: (message: string, options?: ToastOptions) =>
    sonnerToast.error(message, { duration: options?.duration ?? DURATION.error }),
  info: (message: string, options?: ToastOptions) =>
    sonnerToast.info(message, { duration: options?.duration ?? DURATION.default }),
};
