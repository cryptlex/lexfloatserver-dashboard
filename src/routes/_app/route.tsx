import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';
import { isLoggedIn } from '@/lib/api';

/** Layout for every signed-in page: anyone without a valid token is sent to the login page. */
export const Route = createFileRoute('/_app')({
    beforeLoad: () => {
        if (!isLoggedIn()) throw redirect({ to: '/login' });
    },
    component: Outlet,
});
