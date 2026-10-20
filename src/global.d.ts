import type { components, operations, paths } from '@/lib/api-schema';

declare module '@cryptlex/web-components/utilities/api-types' {
    interface Register {
        api: { paths: paths; operations: operations; components: components };
    }
}
