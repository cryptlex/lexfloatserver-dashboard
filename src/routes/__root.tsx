import { ToastProvider } from '@cryptlex/web-components/components/toast';
import { setThemeHue } from '@cryptlex/web-components/utilities/theme';
import { type QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { createRootRouteWithContext, HeadContent, Outlet, useRouteContext } from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools';
import { apiFetch } from '@/lib/api';

type Branding = { appName?: string; logoUrl?: string | null; faviconUrl?: string | null; hue?: number };

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
    beforeLoad: async ({ context }) => {
        const branding = await context.queryClient.query({
            queryKey: ['branding'],
            queryFn: () => apiFetch<Branding>('/api/v4/branding').catch((): Branding => ({})),
            staleTime: 'static',
        });
        if (typeof branding.hue === 'number') setThemeHue(branding.hue);
        return {
            branding: {
                appName: branding.appName,
                logoUrl: branding.logoUrl,
            },
        };
    },
    head: ({ match }) => ({
        meta: [{ title: match.context.branding.appName }],
    }),
    component: RootComponent,
});

function RootComponent() {
    const { queryClient } = useRouteContext({ from: '__root__' });
    return (
        <QueryClientProvider client={queryClient}>
            <HeadContent />
            <ToastProvider />
            <Outlet />
            {import.meta.env.DEV && (
                <>
                    <ReactQueryDevtools buttonPosition="bottom-left" />
                    <TanStackRouterDevtools position="bottom-right" />
                </>
            )}
        </QueryClientProvider>
    );
}
