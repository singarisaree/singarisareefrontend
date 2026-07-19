import { cache } from 'react';
import { serverStore } from '@/lib/server-store';

export const getCachedHomepage = cache(() => serverStore.getHomepage());

export const getCachedCollectionsPage = cache(() => serverStore.getCollectionsPage());
