import { Badge } from '@cryptlex/web-components/components/badge';
import { Button } from '@cryptlex/web-components/components/button';
import { CopyButton } from '@cryptlex/web-components/components/copy-button';
import { formatDate } from '@cryptlex/web-components/utilities/date';
import { queryOptions } from '@tanstack/react-query';
import type React from 'react';
import { CardAvatar } from '@/components/card-avatar';
import { InfoGrid, InfoItem, InfoPanel, InfoTable } from '@/components/info-panel';
import { apiFetch } from '@/lib/api';
import type { Page, Product } from '@/types';

// Every expansion, so one call is enough to render a product's full details.
const EXPAND = 'license.meterAttributes,license.featureEntitlements,license.metadata,metadata';

export const productsQuery = queryOptions({
    queryKey: ['products'],
    queryFn: () => apiFetch<Page<Product>>(`/api/v4/products?limit=100&expand=${EXPAND}`),
});

export const productQuery = (productId: string) =>
    queryOptions({
        queryKey: ['products', productId],
        queryFn: () =>
            apiFetch<Page<Product>>(
                `/api/v4/products?productId=${encodeURIComponent(productId)}&expand=${EXPAND}`
            ).then(page => page.items[0] ?? null),
    });

export const STATUS: Record<
    Product['status'],
    { label: string; variant: React.ComponentProps<typeof Badge>['variant']; hint: string }
> = {
    ok: { label: 'Active', variant: 'success', hint: 'This license is valid and can be used on activated devices.' },
    not_activated: {
        label: 'Not activated',
        variant: 'neutral',
        hint: "This server hasn't activated a license for this product yet, so it can't hand out seats.",
    },
    expired: {
        label: 'Expired',
        variant: 'destructive',
        hint: 'This license has passed its expiry date and no longer works until it is renewed.',
    },
    suspended: {
        label: 'Suspended',
        variant: 'warning',
        hint: 'This license is temporarily paused. It starts working again on its own once the software vendor lifts the suspension.',
    },
    grace_period_over: {
        label: 'Grace period over',
        variant: 'destructive',
        hint: "This server couldn't sync with Cryptlex in time, so it stopped handing out seats until it syncs again.",
    },
    disabled: {
        label: 'Disabled',
        variant: 'neutral',
        hint: 'This product is turned off in config.yml, so this server does not serve it.',
    },
};

/** API timestamps are epoch seconds, and 0 means not set. */
export const date = (seconds: number) => (seconds ? formatDate(new Date(seconds * 1000).toISOString()) : '');
/** -1 in a limit means unlimited. */
export const limit = (value: number) => (value === -1 ? 'Unlimited' : value);

export function ProductHeader({
    product,
    as: Heading = 'h2',
    showStatus = true,
    actions,
}: {
    product: Product;
    as?: 'h1' | 'h2';
    showStatus?: boolean;
    actions?: React.ReactNode;
}) {
    const entitlementSet = product.license?.entitlementSet;
    return (
        <header className="flex flex-wrap items-center gap-3">
            <CardAvatar name={product.displayName} />
            <div className="flex min-w-0 flex-col items-start gap-1">
                <Heading className="wrap-anywhere font-semibold text-foreground">{product.displayName}</Heading>
                {entitlementSet && <p className="text-sm text-text-secondary">{entitlementSet.displayName}</p>}
            </div>
            {showStatus && (
                <Badge variant={STATUS[product.status].variant} className="ml-auto shrink-0 self-start">
                    {STATUS[product.status].label}
                </Badge>
            )}
            {actions && <div className="ml-auto flex gap-icon">{actions}</div>}
        </header>
    );
}

export function ProductDetails({ product }: { product: Product }) {
    const { license } = product;
    const isActivated = license && license.status !== 'not_activated';

    return (
        <article className="flex flex-col gap-icon">
            <ProductHeader
                product={product}
                as="h1"
                showStatus={false}
                // TODO: licensing actions.
                actions={
                    isActivated ? (
                        <>
                            <Button>Force Sync</Button>
                            <Button variant="destructive_neutral">Deactivate</Button>
                        </>
                    ) : (
                        product.status === 'not_activated' && <Button variant="primary">Activate</Button>
                    )
                }
            />

            <div className="grid grid-cols-1 gap-icon md:grid-cols-2">
                <InfoPanel title="Overview">
                    <InfoGrid>
                        <InfoItem
                            label="Concurrent Seats"
                            hint="Devices holding a seat right now, out of the maximum allowed at the same time. A device frees its seat when the app closes or its lease runs out."
                            value={`${product.totalFloatingClients} / ${limit(product.allowedFloatingClients)}`}
                        />
                        <InfoItem
                            label="Offline Devices"
                            hint="Devices holding a seat through an offline lease, so they don't need to reach this server until the lease ends."
                            value={product.totalOfflineFloatingClients}
                        />
                        <InfoItem
                            label="Expires"
                            hint="The license stops working after this date. Renewing the subscription moves the date forward."
                            value={date(product.expiresAt)}
                        />
                        <InfoItem
                            label="Sync Grace Period Ends"
                            hint="If this server can't reach Cryptlex to sync the license, it keeps handing out seats until this time."
                            value={date(product.serverSyncGracePeriodExpiresAt)}
                        />
                        {product.metadata?.map(item => (
                            <InfoItem key={item.key} label={item.key} value={item.value} />
                        ))}
                    </InfoGrid>
                </InfoPanel>

                <InfoPanel title="License">
                    <InfoGrid>
                        <InfoItem
                            label="Status"
                            hint={STATUS[product.status].hint}
                            value={
                                <Badge variant={STATUS[product.status].variant}>{STATUS[product.status].label}</Badge>
                            }
                        />
                        {isActivated && (
                            <>
                                <InfoItem
                                    label="License Key"
                                    value={
                                        <span className="flex items-center gap-1">
                                            {/* Masked so screenshots don't leak it; the copy button still copies the full key. */}
                                            {`${license.key.slice(0, 6)}…${license.key.slice(-6)}`}
                                            <CopyButton
                                                variant="ghost"
                                                size="icon-sm"
                                                label={null}
                                                textToCopy={license.key}
                                            />
                                        </span>
                                    }
                                    mono
                                />
                                <InfoItem
                                    label="Leasing Strategy"
                                    hint="How seats are counted: per machine gives each device one seat, per instance gives each running copy of the app its own seat."
                                    value={license.leasingStrategy}
                                />
                                <InfoItem
                                    label="Activation Method"
                                    hint={
                                        license.activationMode.current === 'offline'
                                            ? "Activated without internet using a response file. This server doesn't sync, so changes to the license don't reach it until it's activated again."
                                            : 'Activated over the internet. Changes to the license reach this server automatically when it syncs.'
                                    }
                                    value={license.activationMode.current === 'offline' ? 'Offline' : 'Online'}
                                />
                                <InfoItem label="Created" value={date(license.createdAt)} />
                                <InfoItem label="Activated" value={date(license.activatedAt)} />
                                {license.user && (
                                    <InfoItem
                                        label="User"
                                        value={[license.user.name, license.user.email].filter(Boolean).join(', ')}
                                    />
                                )}
                                {license.organization && (
                                    <InfoItem label="Organization" value={license.organization.name} />
                                )}
                                {license.metadata?.map(item => (
                                    <InfoItem key={item.key} label={item.key} value={item.value} />
                                ))}
                            </>
                        )}
                    </InfoGrid>
                </InfoPanel>

                {!!license?.featureEntitlements?.length && (
                    <InfoPanel
                        title="Features"
                        hint="Features this license unlocks, with the value or expiry date that applies to each, if any."
                        flush
                    >
                        <InfoTable
                            rows={license.featureEntitlements}
                            rowKey={feature => feature.featureName}
                            columns={[
                                {
                                    label: 'Feature',
                                    render: feature => feature.featureDisplayName || feature.featureName,
                                },
                                // Many features are a plain on/off unlock, so an empty value is correct.
                                { label: 'Value', render: feature => feature.value },
                                {
                                    label: 'Expires',
                                    render: feature => (feature.expiresAt ? date(feature.expiresAt) : ''),
                                },
                            ]}
                        />
                    </InfoPanel>
                )}

                {!!license?.meterAttributes?.length && (
                    <InfoPanel
                        title="Usage Limits"
                        hint="Countable usage this license allows, such as API calls, exports or credits."
                    >
                        <InfoGrid>
                            {license.meterAttributes.map(meter => (
                                <InfoItem
                                    key={meter.id}
                                    label={meter.name}
                                    value={`${meter.totalUses} / ${limit(meter.allowedUses)}`}
                                />
                            ))}
                        </InfoGrid>
                    </InfoPanel>
                )}
            </div>
        </article>
    );
}
