import { useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { routerBreadcrumbs } from '@/components/breadcrumbs';
import { StatTiles } from '@/components/stat-tiles';
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
            <StatTiles tiles={tiles} />
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
