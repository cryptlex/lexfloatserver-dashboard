import { ToastProvider } from '@cryptlex/web-components/components/toast';
import { CtxClientProvider } from '@cryptlex/web-components/utilities/ctx-client';
import type { ApiSchema } from '@cryptlex/web-components/utilities/resources';
import { setThemeHue } from '@cryptlex/web-components/utilities/theme';
import { type QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createRootRouteWithContext, HeadContent, Outlet, useRouteContext } from '@tanstack/react-router';
import { client } from '@/lib/api';

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
    beforeLoad: async ({ context }) => {
        const branding = await context.queryClient.query({
            queryKey: ['get', '/api/v4/branding'],
            queryFn: (): Promise<Partial<ApiSchema<'Branding'>>> =>
                client.GET('/api/v4/branding').then(({ data }) => data ?? {}),
            staleTime: 'static',
        });
        if (branding.faviconUrl) document.getElementById('favicon')?.setAttribute('href', branding.faviconUrl);
        if (typeof branding.hue === 'number') setThemeHue(branding.hue);
        return { branding };
    },
    head: ({ match }) => ({
        meta: [{ title: match.context.branding.appName }],
    }),
    component: RootComponent,
});

function RootComponent() {
    const { queryClient } = useRouteContext({ from: '__root__' });
    return (
        <CtxClientProvider client={client}>
            <QueryClientProvider client={queryClient}>
                <HeadContent />
                <ToastProvider />
                <Outlet />
            </QueryClientProvider>
        </CtxClientProvider>
    );
}
