import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_app/products')({
    component: () => <h1 className="heading-3">Products</h1>,
});
