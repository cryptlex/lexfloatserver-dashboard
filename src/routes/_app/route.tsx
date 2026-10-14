import { IcActivation, IcLogin, IcProduct, IcSettings } from '@cryptlex/web-components/components/icons';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
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
import { isLoggedIn } from '@/lib/api';

const SidebarLink = createLink(SidebarMenuButton);

/** Layout for every signed-in page: anyone without a valid token is sent to the login page. */
export const Route = createFileRoute('/_app')({
    beforeLoad: () => {
        if (!isLoggedIn()) throw redirect({ to: '/login' });
    },
    component: AppLayout,
});

function AppLayout() {
    const { branding } = Route.useRouteContext();
    const navigate = useNavigate();

    return (
        <SidebarProvider>
            <Sidebar className="h-screen">
                <SidebarHeader logo={<img src="/cryptlex-logo.svg" alt="" className="p-1" />}>
                    {branding.appName}
                </SidebarHeader>
                <SidebarContent>
                    <SidebarGroup>
                        <SidebarMenu>
                            <SidebarMenuItem>
                                <SidebarLink to="/products" icon={IcProduct} activeProps={{ isActive: true }}>
                                    Products
                                </SidebarLink>
                            </SidebarMenuItem>
                            <SidebarMenuItem>
                                <SidebarLink to="/devices" icon={IcActivation} activeProps={{ isActive: true }}>
                                    Devices
                                </SidebarLink>
                            </SidebarMenuItem>
                            <SidebarMenuItem>
                                <SidebarLink to="/settings" icon={IcSettings} activeProps={{ isActive: true }}>
                                    Settings
                                </SidebarLink>
                            </SidebarMenuItem>
                        </SidebarMenu>
                    </SidebarGroup>
                </SidebarContent>
                <SidebarFooter>
                    <SidebarMenu>
                        <SidebarMenuItem>
                            <SidebarMenuButton
                                icon={IcLogin}
                                className="text-destructive [&_svg]:rotate-180"
                                onPress={() => {
                                    localStorage.removeItem('accessToken');
                                    navigate({ to: '/login' });
                                }}
                            >
                                Sign out
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    </SidebarMenu>
                </SidebarFooter>
            </Sidebar>
            <SidebarOutlet className="h-screen bg-background">
                <SidebarOutletHeader>
                    <SidebarTrigger size="icon-sm" className="lg:hidden" />
                </SidebarOutletHeader>
                <SidebarOutletContent className="p-icon">
                    <Outlet />
                </SidebarOutletContent>
            </SidebarOutlet>
        </SidebarProvider>
    );
}
