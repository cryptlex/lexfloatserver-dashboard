import { useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { routerBreadcrumbs } from '@/components/breadcrumbs';
import { productsQuery, serverStatsQuery } from '@/lib/queries';
import { m } from '@/paraglide/messages.js';
import { ProductCard, ProductDetails } from './-product';

export const Route = createFileRoute('/_app/products/')({
    beforeLoad: () => routerBreadcrumbs([{ to: '/products', label: m['productsPage.pageTitle']() }]),
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

    if (products?.length === 1) return <ProductDetails product={products[0]} />;

    const tiles = [
        { label: m['productsPage.sections.stats.products.label'](), value: stats?.productCount },
        { label: m['productsPage.sections.stats.activeDevices.label'](), value: stats?.totalFloatingClients },
        { label: m['productsPage.sections.stats.offlineDevices.label'](), value: stats?.totalOfflineFloatingClients },
    ];

    return (
        <div className="flex flex-col gap-icon">
            <dl className="grid grid-cols-1 gap-icon sm:grid-cols-3">
                {tiles.map(tile => (
                    <div key={tile.label} className="flex flex-col gap-2 rounded-lg border bg-surface-primary p-5">
                        <dt className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                            {tile.label}
                        </dt>
                        <dd className="text-[1.375rem] font-semibold tracking-[-0.02em] text-foreground">
                            {tile.value}
                        </dd>
                    </div>
                ))}
            </dl>
            <ul className="grid grid-cols-1 gap-icon sm:grid-cols-2">
                {products?.map(product => (
                    <li key={product.id} className="grid">
                        <ProductCard product={product} />
                    </li>
                ))}
            </ul>
        </div>
    );
}
