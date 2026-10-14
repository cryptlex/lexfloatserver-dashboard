import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_app/')({
    component: HomePage,
});

function HomePage() {
    return (
        <main className="p-6">
            <h1 className="heading-3">LexFloatServer</h1>
            <p className="body-base text-text-secondary">Dashboard</p>
        </main>
    );
}
