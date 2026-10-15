import { useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute, notFound } from '@tanstack/react-router';
import { m } from '@/paraglide/messages.js';
import { ProductDetails, productQuery } from './-product';

export const Route = createFileRoute('/_app/products/$productId')({
    loader: async ({ context, params }) => {
        const product = await context.queryClient.query(productQuery(params.productId));
        if (!product) throw notFound();
        return product;
    },
    head: ({ match, loaderData }) => ({
        meta: [
            {
                title: m['common.pageTitle']({
                    title: loaderData?.displayName ?? '',
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
    // The loader already threw notFound() for a missing product.
    return product && <ProductDetails product={product} />;
}
