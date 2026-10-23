import { IcActivation, IcLogin, IcProduct, IcSettings } from '@cryptlex/web-components/components/icons';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarOutlet,
    SidebarOutletContent,
    SidebarOutletHeader,
    SidebarProvider,
    SidebarTrigger,
} from '@cryptlex/web-components/components/sidebar';
import { createFileRoute, createLink, Outlet, redirect, useNavigate } from '@tanstack/react-router';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { isLoggedIn, removeAccessToken } from '@/lib/api';
import { productsQuery } from '@/lib/queries';
import { m } from '@/paraglide/messages.js';

const SidebarLink = createLink(SidebarMenuButton);

const DEFAULT_LOGO_URL = '/cryptlex-icon-logo.svg';

/** Layout for every signed-in page: anyone without a valid token is sent to the login page. */
export const Route = createFileRoute('/_app')({
    beforeLoad: () => {
        if (!isLoggedIn()) throw redirect({ to: '/login' });
    },
    // Products and devices both need the product list, so load it once here; pages read it from the cache.
    loader: ({ context }) => context.queryClient.query({ ...productsQuery, staleTime: 'static' }),
    component: AppLayout,
});

function AppLayout() {
    const { branding } = Route.useRouteContext();
    const navigate = useNavigate();

    return (
        <SidebarProvider>
            <Sidebar className="h-screen">
                <SidebarHeader logo={<img src={branding.logoUrl ?? DEFAULT_LOGO_URL} alt="" className="p-1" />}>
                    {branding.appName}
                </SidebarHeader>
                <SidebarContent>
                    <SidebarGroup>
                        <SidebarGroupLabel>{m['nav.server']()}</SidebarGroupLabel>
                        <SidebarGroupContent>
                            <SidebarMenu>
                                <SidebarMenuItem>
                                    <SidebarLink to="/products" icon={IcProduct} activeProps={{ isActive: true }}>
                                        {m['nav.products']()}
                                    </SidebarLink>
                                </SidebarMenuItem>
                                <SidebarMenuItem>
                                    <SidebarLink to="/devices" icon={IcActivation} activeProps={{ isActive: true }}>
                                        {m['nav.devices']()}
                                    </SidebarLink>
                                </SidebarMenuItem>
                                <SidebarMenuItem>
                                    <SidebarLink to="/settings" icon={IcSettings} activeProps={{ isActive: true }}>
                                        {m['nav.settings']()}
                                    </SidebarLink>
                                </SidebarMenuItem>
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </SidebarGroup>
                </SidebarContent>
                <SidebarFooter>
                    <SidebarMenu>
                        <SidebarMenuItem>
                            <SidebarMenuButton
                                icon={IcLogin}
                                className="text-destructive [&_svg]:rotate-180"
                                onPress={() => {
                                    removeAccessToken();
                                    navigate({ to: '/login' });
                                }}
                            >
                                {m['nav.logOut']()}
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    </SidebarMenu>
                </SidebarFooter>
            </Sidebar>
            <SidebarOutlet className="h-screen bg-background">
                <SidebarOutletHeader>
                    <SidebarTrigger size="icon-sm" className="lg:hidden" />
                    <Breadcrumbs />
                </SidebarOutletHeader>
                <SidebarOutletContent className="p-icon">
                    <Outlet />
                </SidebarOutletContent>
            </SidebarOutlet>
        </SidebarProvider>
    );
}
