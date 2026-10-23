import { queryOptions, useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute, Link, notFound } from '@tanstack/react-router';
import { routerBreadcrumbs } from '@/components/breadcrumbs';
import { CardAvatar } from '@/components/card-avatar';
import { InfoGrid, InfoItem, InfoPanel } from '@/components/info-panel';
import { ApiError, client } from '@/lib/api';
import { productsQuery } from '@/lib/queries';
import { m } from '@/paraglide/messages.js';
import { date } from '../products/-product';
import { formatOs, LeaseType } from './-device';

const deviceQuery = (id: string) =>
    queryOptions({
        queryKey: ['get', '/api/v4/floating-licenses/{id}', id],
        queryFn: async () => (await client.GET('/api/v4/floating-licenses/{id}', { params: { path: { id } } }))?.data,
    });

export const Route = createFileRoute('/_app/devices/$deviceId')({
    beforeLoad: async ({ context, params }) => {
        const device = await context.queryClient
            .query({ ...deviceQuery(params.deviceId), staleTime: 'static' })
            .catch(error => {
                if (error instanceof ApiError && error.status === 404) throw notFound();
                throw error;
            });
        if (!device) throw notFound();
        return {
            device,
            ...routerBreadcrumbs([
                { to: '/devices', label: m['devicesPage.pageTitle']() },
                { to: '.', label: device.hostname },
            ]),
        };
    },
    head: ({ match }) => ({
        meta: [
            {
                title: m['common.pageTitle']({
                    title: match.context.device.hostname,
                    appName: match.context.branding.appName ?? '',
                }),
            },
        ],
    }),
    component: DevicePage,
});

function DevicePage() {
    const { deviceId } = Route.useParams();
    const { data: device } = useSuspenseQuery(deviceQuery(deviceId));
    const { data: products } = useSuspenseQuery(productsQuery);
    // With a single product, naming it on every device is noise.
    const hasManyProducts = (products?.length ?? 0) > 1;
    // beforeLoad already threw notFound() for a missing device.
    if (!device) return null;

    return (
        <article className="flex flex-col gap-icon">
            <header className="flex flex-wrap items-center gap-3">
                <CardAvatar name={device.hostname} />
                <div className="flex min-w-0 flex-col items-start gap-1">
                    <h1 className="wrap-anywhere font-semibold text-foreground">{device.hostname}</h1>
                    {hasManyProducts && <p className="text-sm text-text-secondary">{device.productDisplayName}</p>}
                </div>
            </header>

            <div className="grid grid-cols-1 gap-icon md:grid-cols-2">
                <InfoPanel title={m['devicesPage.details.sections.device.title']()}>
                    <InfoGrid>
                        <InfoItem label={m['devicesPage.columns.hostname']()} value={device.hostname} />
                        <InfoItem label={m['devicesPage.columns.ipAddress']()} value={device.ip} mono />
                        <InfoItem label={m['devicesPage.columns.os']()} value={formatOs(device.os, device.osVersion)} />
                        <InfoItem label={m['devicesPage.columns.osUser']()} value={device.username} />
                        <InfoItem label={m['devicesPage.columns.appVersion']()} value={device.clientVersion} />
                    </InfoGrid>
                </InfoPanel>

                <InfoPanel title={m['devicesPage.details.sections.lease.title']()}>
                    <InfoGrid>
                        {hasManyProducts && (
                            <InfoItem
                                label={m['devicesPage.columns.product']()}
                                value={
                                    <Link
                                        to="/products/$productId"
                                        params={{ productId: device.productId }}
                                        className="link"
                                    >
                                        {device.productDisplayName}
                                    </Link>
                                }
                            />
                        )}
                        <InfoItem
                            label={m['devicesPage.columns.leaseType']()}
                            hint={m['devicesPage.details.leaseType.hint']()}
                            value={<LeaseType offline={device.offline} />}
                        />
                        <InfoItem
                            label={m['devicesPage.columns.leasedAt']()}
                            hint={m['devicesPage.details.leasedAt.hint']()}
                            value={date(device.createdAt)}
                        />
                        <InfoItem
                            label={m['devicesPage.columns.leaseRenewedAt']()}
                            hint={m['devicesPage.details.leaseRenewedAt.hint']()}
                            value={date(device.updatedAt)}
                        />
                        <InfoItem
                            label={m['devicesPage.columns.leaseExpiresAt']()}
                            hint={m['devicesPage.details.leaseExpiresAt.hint']()}
                            value={date(device.expiresAt)}
                        />
                    </InfoGrid>
                </InfoPanel>
            </div>
        </article>
    );
}
