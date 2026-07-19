'use client';

import { useQuery } from '@tanstack/react-query';
import { homeService } from '@/services/store.service';
import { useStoreSettings } from '@/components/store-settings-provider';

export function usePublicSettings() {
  const layoutSettings = useStoreSettings();

  const { data } = useQuery({
    queryKey: ['public-settings'],
    queryFn: () => homeService.getSettings(),
    staleTime: 30 * 1000,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    initialData: layoutSettings,
  });

  return data ?? layoutSettings;
}
