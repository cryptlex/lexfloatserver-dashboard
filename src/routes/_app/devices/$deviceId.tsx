import { Badge } from '@cryptlex/web-components/components/badge';
import { queryOptions, useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute, Link, notFound } from '@tanstack/react-router';
import { CardAvatar } from '@/components/card-avatar';
import { InfoGrid, InfoItem, InfoPanel, InfoTable } from '@/components/info-panel';
import { ApiError, client } from '@/lib/api';
import { m } from '@/paraglide/messages.js';
import { date } from '../products/-product';

// The detail route always includes the lease's metadata and meter attributes.
const deviceQuery = (id: string) =>
    queryOptions({
        queryKey: ['get', '/api/v4/floating-licenses/{id}', id],
        queryFn: async () => (await client.GET('/api/v4/floating-licenses/{id}', { params: { path: { id } } }))?.data,
    });

export const Route = createFileRoute('/_app/devices/$deviceId')({
    loader: async ({ context, params }) => {
        // A lease disappears once the device releases it or it expires, so a stale link is a 404.
        const device = await context.queryClient.query(deviceQuery(params.deviceId)).catch(error => {
            if (error instanceof ApiError && error.status === 404) throw notFound();
            throw error;
        });
        if (!device) throw notFound();
        return device;
    },
    head: ({ match, loaderData }) => ({
        meta: [
            {
                title: m['common.pageTitle']({
                    title: loaderData?.hostname ?? '',
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
    // The loader already threw notFound() for a missing device.
    if (!device) return null;

    return (
        <article className="flex flex-col gap-icon">
            <header className="flex flex-wrap items-center gap-3">
                <CardAvatar name={device.hostname} />
                <div className="flex min-w-0 flex-col items-start gap-1">
                    <h1 className="wrap-anywhere font-semibold text-foreground">{device.hostname}</h1>
                    <p className="text-sm text-text-secondary">{device.productDisplayName}</p>
                </div>
            </header>

            <div className="grid grid-cols-1 gap-icon md:grid-cols-2">
                <InfoPanel title={m['devicesPage.details.sections.device.title']()}>
                    <InfoGrid>
                        <InfoItem label={m['devicesPage.columns.hostname']()} value={device.hostname} />
                        <InfoItem
                            label={m['devicesPage.columns.lease']()}
                            hint={m['devicesPage.details.lease.hint']()}
                            value={
                                device.offline ? (
                                    <Badge variant="neutral">{m['common.state.offline']()}</Badge>
                                ) : (
                                    <Badge variant="success">{m['common.state.online']()}</Badge>
                                )
                            }
                        />
                        <InfoItem label={m['devicesPage.columns.ipAddress']()} value={device.ip} mono />
                        <InfoItem
                            label={m['devicesPage.columns.os']()}
                            value={[device.os, device.osVersion].filter(Boolean).join(' ')}
                        />
                        <InfoItem label={m['devicesPage.columns.osUser']()} value={device.username} />
                        <InfoItem label={m['devicesPage.columns.clientVersion']()} value={device.clientVersion} mono />
                    </InfoGrid>
                </InfoPanel>

                <InfoPanel title={m['devicesPage.details.sections.lease.title']()}>
                    <InfoGrid>
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
                        <InfoItem label={m['devicesPage.columns.firstSeenAt']()} value={date(device.createdAt)} />
                        <InfoItem
                            label={m['devicesPage.columns.lastSeenAt']()}
                            hint={m['devicesPage.details.lastSeenAt.hint']()}
                            value={date(device.updatedAt)}
                        />
                        <InfoItem label={m['devicesPage.columns.leaseExpiresAt']()} value={date(device.expiresAt)} />
                    </InfoGrid>
                </InfoPanel>

                {!!device.metadata?.length && (
                    <InfoPanel title={m['devicesPage.details.sections.metadata.title']()}>
                        <InfoGrid>
                            {device.metadata.map(item => (
                                <InfoItem key={item.key} label={item.key} value={item.value} />
                            ))}
                        </InfoGrid>
                    </InfoPanel>
                )}

                {!!device.meterAttributes?.length && (
                    <InfoPanel
                        title={m['meterAttributes.label']()}
                        hint={m['devicesPage.details.meterAttributes.hint']()}
                        flush
                    >
                        <InfoTable
                            rows={device.meterAttributes}
                            rowKey={meter => meter.name}
                            columns={[
                                { label: m['meterAttributes.name.label'](), render: meter => meter.name },
                                { label: m['meterAttributes.uses.label'](), render: meter => meter.uses },
                            ]}
                        />
                    </InfoPanel>
                )}
            </div>
        </article>
    );
}
