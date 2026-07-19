'use client';

import { Footer } from '@/components/layout/footer';
import { useStoreSettings } from '@/components/store-settings-provider';

export function StoreFooter() {
  const settings = useStoreSettings();
  return <Footer settings={settings as Record<string, string>} />;
}
