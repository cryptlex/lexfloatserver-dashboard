import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';
import { isLoggedIn } from '@/lib/api';

export const Route = createFileRoute('/_app/routes')({
    beforeLoad: () => {
        if (!isLoggedIn()) throw redirect({ to: '/login' });
    },
    component: Outlet,
});
