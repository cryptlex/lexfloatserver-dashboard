import { Button } from '@cryptlex/web-components/components/button';
import { useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute, createLink } from '@tanstack/react-router';
import { InfoGrid, InfoItem } from '@/components/info-panel';
import { serverStatsQuery } from '@/lib/queries';
import { m } from '@/paraglide/messages.js';
import { date, limit, ProductDetails, ProductHeader, productsQuery } from './-product';

const ButtonLink = createLink(Button);

export const Route = createFileRoute('/_app/products/')({
    loader: ({ context }) =>
        Promise.all([context.queryClient.query(productsQuery), context.queryClient.query(serverStatsQuery)]),
    head: ({ match }) => ({
        meta: [
            {
                title: m['common.pageTitle']({
                    title: m['productsPage.pageTitle'](),
                    appName: match.context.branding.appName ?? '',
                }),
            },
        ],
    }),
    component: ProductsPage,
});

function ProductsPage() {
    const { data: products } = useSuspenseQuery(productsQuery);
    const { data: stats } = useSuspenseQuery(serverStatsQuery);

    if (products.items.length === 1) return <ProductDetails product={products.items[0]} />;

    const tiles = [
        { label: m['productsPage.sections.stats.products.label'](), value: stats.productCount },
        {
            label: m['productsPage.sections.stats.devices.label'](),
            value: stats.totalFloatingClients,
            description: m['productsPage.sections.stats.devices.description']({
                count: stats.totalOfflineFloatingClients,
            }),
        },
    ];

    return (
        <div className="flex flex-col gap-icon">
            <dl className="grid grid-cols-2 gap-icon">
                {tiles.map(tile => (
                    <div key={tile.label} className="rounded-lg border bg-surface-primary p-4">
                        <dt className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                            {tile.label}
                        </dt>
                        <dd className="heading-3">{tile.value}</dd>
                        {tile.description && <dd className="text-sm text-text-secondary">{tile.description}</dd>}
                    </div>
                ))}
            </dl>
            <ul className="grid grid-cols-1 gap-icon sm:grid-cols-2">
                {products.items.map(product => (
                    <li key={product.id}>
                        <article className="flex h-full flex-col gap-3 rounded-lg border bg-surface-primary p-4">
                            <ProductHeader product={product} />
                            {product.status !== 'not_activated' && product.enabled && (
                                <InfoGrid>
                                    <InfoItem
                                        label={m['allowedFloatingClients.label']()}
                                        hint={m['allowedFloatingClients.hint']()}
                                        value={`${product.totalFloatingClients} / ${limit(product.allowedFloatingClients)}`}
                                    />
                                    <InfoItem
                                        label={m['expiresAt.label']()}
                                        hint={m['expiresAt.hint']()}
                                        value={date(product.expiresAt)}
                                    />
                                </InfoGrid>
                            )}
                            <footer className="mt-auto flex justify-end gap-icon">
                                {product.status === 'not_activated' && (
                                    // TODO: activation flow.
                                    <Button variant="primary" size="sm">
                                        {m['productsPage.action.activate']()}
                                    </Button>
                                )}
                                <ButtonLink to="/products/$productId" params={{ productId: product.id }} size="sm">
                                    {m['common.action.view']()}
                                </ButtonLink>
                            </footer>
                        </article>
                    </li>
                ))}
            </ul>
        </div>
    );
}
