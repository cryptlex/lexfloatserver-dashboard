import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_app/settings')({
    component: () => <h1 className="heading-3">Settings</h1>,
});
