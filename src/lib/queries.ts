import { queryOptions } from '@tanstack/react-query';
import { client } from '@/lib/api';

/** Server-wide totals: version, product count and devices (SERVER.md §6). Used by Products and Settings. */
export const serverStatsQuery = queryOptions({
    queryKey: ['get', '/api/v4/server/stats'],
    queryFn: async () => (await client.GET('/api/v4/server/stats'))?.data,
});
