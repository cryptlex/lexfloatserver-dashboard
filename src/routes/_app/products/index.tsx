import { Button } from '@cryptlex/web-components/components/button';
import { useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute, createLink } from '@tanstack/react-router';
import { InfoGrid, InfoItem } from '@/components/info-panel';
import { date, limit, ProductDetails, ProductHeader, productsQuery } from './-product';

const ButtonLink = createLink(Button);

export const Route = createFileRoute('/_app/products/')({
    loader: ({ context }) => context.queryClient.query(productsQuery),
    head: ({ match }) => ({ meta: [{ title: `Products - ${match.context.branding.appName}` }] }),
    component: ProductsPage,
});

function ProductsPage() {
    const { data: products } = useSuspenseQuery(productsQuery);

    if (products.items.length === 1) return <ProductDetails product={products.items[0]} />;

    return (
        <ul className="grid grid-cols-1 gap-icon sm:grid-cols-2">
            {products.items.map(product => (
                <li key={product.id}>
                    <article className="flex h-full flex-col gap-3 rounded-lg border bg-surface-primary p-4">
                        <ProductHeader product={product} />
                        {product.status !== 'not_activated' && product.enabled && (
                            <InfoGrid>
                                <InfoItem
                                    label="Concurrent Seats"
                                    hint="Devices holding a seat right now, out of the maximum allowed at the same time. A device frees its seat when the app closes or its lease runs out."
                                    value={`${product.totalFloatingClients} / ${limit(product.allowedFloatingClients)}`}
                                />
                                <InfoItem
                                    label="Expires"
                                    hint="The license stops working after this date. Renewing the subscription moves the date forward."
                                    value={date(product.expiresAt)}
                                />
                            </InfoGrid>
                        )}
                        <footer className="mt-auto flex justify-end gap-icon">
                            {product.status === 'not_activated' && (
                                // TODO: activation flow.
                                <Button variant="primary" size="sm">
                                    Activate
                                </Button>
                            )}
                            <ButtonLink to="/products/$productId" params={{ productId: product.id }} size="sm">
                                View
                            </ButtonLink>
                        </footer>
                    </article>
                </li>
            ))}
        </ul>
    );
}
