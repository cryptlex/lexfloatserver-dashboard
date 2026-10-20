import type { ApiQuery } from '@cryptlex/web-components/utilities/resources';
import { queryOptions } from '@tanstack/react-query';
import { client } from '@/lib/api';

/** Server-wide totals: version, product count and devices (SERVER.md §6). Used by Products and Settings. */
export const serverStatsQuery = queryOptions({
    queryKey: ['get', '/api/v4/server/stats'],
    queryFn: async () => (await client.GET('/api/v4/server/stats'))?.data,
});

// Every sub-resource, so one call is enough to render a product's full details.
const INCLUDE = [
    'license.meterAttributes',
    'license.featureEntitlements',
    'license.metadata',
    'metadata',
] as const satisfies ApiQuery<'listProducts'>['include'];

/** Every product on the server. Loaded once by the `/_app` layout, so pages read it from the cache. */
export const productsQuery = queryOptions({
    queryKey: ['get', '/api/v4/products'],
    queryFn: async () =>
        (
            await client.GET('/api/v4/products', {
                params: { query: { limit: 100, include: [...INCLUDE] } },
            })
        )?.data,
});

export const productQuery = (productId: string) =>
    queryOptions({
        queryKey: ['get', '/api/v4/products', productId],
        queryFn: async () => {
            const { data } = await client.GET('/api/v4/products', {
                params: { query: { id: productId, include: [...INCLUDE] } },
            });
            return data?.[0] ?? null;
        },
    });
