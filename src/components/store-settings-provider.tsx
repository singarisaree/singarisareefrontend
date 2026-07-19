'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type { PublicSettings } from '@/types';

const StoreSettingsContext = createContext<PublicSettings>({});
const StoreSettingsMergeContext = createContext<(next: PublicSettings) => void>(() => {});

export function StoreSettingsProvider({
  settings,
  children,
}: {
  settings: PublicSettings;
  children: ReactNode;
}) {
  const [value, setValue] = useState<PublicSettings>(settings);

  useEffect(() => {
    setValue(settings);
  }, [settings]);

  const mergeSettings = useCallback((next: PublicSettings) => {
    setValue((prev) => ({ ...prev, ...next }));
  }, []);

  return (
    <StoreSettingsContext.Provider value={value}>
      <StoreSettingsMergeContext.Provider value={mergeSettings}>
        {children}
      </StoreSettingsMergeContext.Provider>
    </StoreSettingsContext.Provider>
  );
}

/** Merge settings from a page bundle without blocking the root layout. */
export function StoreSettingsSync({ settings }: { settings: PublicSettings }) {
  const merge = useContext(StoreSettingsMergeContext);
  const prevKey = useRef('');

  useEffect(() => {
    if (Object.keys(settings).length === 0) return;
    const key = JSON.stringify(settings);
    if (key === prevKey.current) return;
    prevKey.current = key;
    merge(settings);
  }, [settings, merge]);

  return null;
}

export function useStoreSettings() {
  return useContext(StoreSettingsContext);
}
