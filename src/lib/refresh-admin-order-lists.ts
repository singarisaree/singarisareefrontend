import type { QueryClient } from '@tanstack/react-query';
import type { DispatchRecord } from '@/types';
import type { PaginationMeta } from '@/lib/pagination';

type DispatchesCache = {
  dispatches: DispatchRecord[];
  courierPartners: Array<{ key: string; label: string; count: number }>;
  meta?: PaginationMeta;
};

/** Refresh orders + dispatches lists after status or shipping changes. */
export function refreshAdminOrderLists(
  queryClient: QueryClient,
  options?: { removeDispatchOrderId?: string },
) {
  if (options?.removeDispatchOrderId) {
    queryClient.setQueriesData<DispatchesCache>({ queryKey: ['admin-dispatches'] }, (old) => {
      if (!old?.dispatches) return old;
      const dispatches = old.dispatches.filter((d) => d.id !== options.removeDispatchOrderId);
      if (dispatches.length === old.dispatches.length) return old;
      return {
        ...old,
        dispatches,
        meta: old.meta
          ? {
              ...old.meta,
              total: Math.max(0, old.meta.total - 1),
              totalPages: Math.max(1, Math.ceil(Math.max(0, old.meta.total - 1) / old.meta.limit)),
            }
          : old.meta,
      };
    });
  }

  // Don't await — toast/navigation should not wait on list refetch
  void queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
  void queryClient.invalidateQueries({ queryKey: ['admin-dispatches'] });
}
