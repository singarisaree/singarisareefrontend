import { cache } from 'react';
import { serverStore } from '@/lib/server-store';

export const getCachedCategoryPage = cache((slug: string) => serverStore.getCategoryPage(slug));
