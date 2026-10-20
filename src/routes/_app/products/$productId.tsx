import { useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute, notFound } from '@tanstack/react-router';
import { routerBreadcrumbs } from '@/components/breadcrumbs';
import { m } from '@/paraglide/messages.js';
import { ProductDetails, productQuery } from './-product';

export const Route = createFileRoute('/_app/products/$productId')({
    beforeLoad: async ({ context, params }) => {
        const product = await context.queryClient.query({ ...productQuery(params.productId), staleTime: 'static' });
        if (!product) throw notFound();
        return {
            product,
            ...routerBreadcrumbs([
                { to: '/products', label: m['productsPage.pageTitle']() },
                { to: '.', label: product.displayName },
            ]),
        };
    },
    head: ({ match }) => ({
        meta: [
            {
                title: m['common.pageTitle']({
                    title: match.context.product.displayName,
                    appName: match.context.branding.appName ?? '',
                }),
            },
        ],
    }),
    component: ProductPage,
});

function ProductPage() {
    const { productId } = Route.useParams();
    const { data: product } = useSuspenseQuery(productQuery(productId));
    // beforeLoad already threw notFound() for a missing product.
    return product && <ProductDetails product={product} />;
}
