import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_app/devices')({
    component: () => <h1 className="heading-3">Devices</h1>,
});
