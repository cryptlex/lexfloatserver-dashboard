import { queryOptions } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import type { ServerStats } from '@/types';

/** Server-wide totals: version, product count and devices (SERVER.md §6). Used by Products and Settings. */
export const serverStatsQuery = queryOptions({
    queryKey: ['server', 'stats'],
    queryFn: () => apiFetch<ServerStats>('/api/v4/server/stats'),
});
