import { Badge } from '@cryptlex/web-components/components/badge';
import { Button } from '@cryptlex/web-components/components/button';
import { CopyButton } from '@cryptlex/web-components/components/copy-button';
import { formatDate } from '@cryptlex/web-components/utilities/date';
import { queryOptions } from '@tanstack/react-query';
import type React from 'react';
import { CardAvatar } from '@/components/card-avatar';
import { InfoGrid, InfoItem, InfoPanel, InfoTable } from '@/components/info-panel';
import { apiFetch } from '@/lib/api';
import { m } from '@/paraglide/messages.js';
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
    { label: () => string; hint: () => string; variant: React.ComponentProps<typeof Badge>['variant'] }
> = {
    ok: { label: m['license.status.ok.label'], hint: m['license.status.ok.hint'], variant: 'success' },
    not_activated: {
        label: m['license.status.notActivated.label'],
        hint: m['license.status.notActivated.hint'],
        variant: 'neutral',
    },
    expired: {
        label: m['license.status.expired.label'],
        hint: m['license.status.expired.hint'],
        variant: 'destructive',
    },
    suspended: {
        label: m['license.status.suspended.label'],
        hint: m['license.status.suspended.hint'],
        variant: 'warning',
    },
    grace_period_over: {
        label: m['license.status.gracePeriodOver.label'],
        hint: m['license.status.gracePeriodOver.hint'],
        variant: 'destructive',
    },
    disabled: {
        label: m['license.status.disabled.label'],
        hint: m['license.status.disabled.hint'],
        variant: 'neutral',
    },
};

/** API timestamps are epoch seconds, and 0 means not set. */
export const date = (seconds: number) => (seconds ? formatDate(new Date(seconds * 1000).toISOString()) : '');
/** -1 in a limit means unlimited. */
export const limit = (value: number) => (value === -1 ? m['common.state.unlimited']() : value);

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
                    {STATUS[product.status].label()}
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
                            <Button>{m['productsPage.action.forceSync']()}</Button>
                            <Button variant="destructive_neutral">{m['productsPage.action.deactivate']()}</Button>
                        </>
                    ) : (
                        product.status === 'not_activated' && (
                            <Button variant="primary">{m['productsPage.action.activate']()}</Button>
                        )
                    )
                }
            />

            <div className="grid grid-cols-1 gap-icon md:grid-cols-2">
                <InfoPanel title={m['productsPage.sections.overview.title']()}>
                    <InfoGrid>
                        <InfoItem
                            label={m['allowedFloatingClients.label']()}
                            hint={m['allowedFloatingClients.hint']()}
                            value={`${product.totalFloatingClients} / ${limit(product.allowedFloatingClients)}`}
                        />
                        <InfoItem
                            label={m['totalOfflineFloatingClients.label']()}
                            hint={m['totalOfflineFloatingClients.hint']()}
                            value={product.totalOfflineFloatingClients}
                        />
                        <InfoItem
                            label={m['expiresAt.label']()}
                            hint={m['expiresAt.hint']()}
                            value={date(product.expiresAt)}
                        />
                        <InfoItem
                            label={m['serverSyncGracePeriodExpiresAt.label']()}
                            hint={m['serverSyncGracePeriodExpiresAt.hint']()}
                            value={date(product.serverSyncGracePeriodExpiresAt)}
                        />
                        {product.metadata?.map(item => (
                            <InfoItem key={item.key} label={item.key} value={item.value} />
                        ))}
                    </InfoGrid>
                </InfoPanel>

                <InfoPanel title={m['license.label']()}>
                    <InfoGrid>
                        <InfoItem
                            label={m['status.label']()}
                            hint={STATUS[product.status].hint()}
                            value={
                                <Badge variant={STATUS[product.status].variant}>{STATUS[product.status].label()}</Badge>
                            }
                        />
                        {isActivated && (
                            <>
                                <InfoItem
                                    label={m['key.label']()}
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
                                    label={m['leasingStrategy.label']()}
                                    hint={m['leasingStrategy.hint']()}
                                    value={license.leasingStrategy}
                                />
                                <InfoItem
                                    label={m['activationMode.label']()}
                                    hint={
                                        license.activationMode.current === 'offline'
                                            ? m['activationMode.offline.hint']()
                                            : m['activationMode.online.hint']()
                                    }
                                    value={
                                        license.activationMode.current === 'offline'
                                            ? m['common.state.offline']()
                                            : m['common.state.online']()
                                    }
                                />
                                <InfoItem label={m['createdAt.label']()} value={date(license.createdAt)} />
                                <InfoItem label={m['activatedAt.label']()} value={date(license.activatedAt)} />
                                {license.user && (
                                    <InfoItem
                                        label={m['user.label']()}
                                        value={[license.user.name, license.user.email].filter(Boolean).join(', ')}
                                    />
                                )}
                                {license.organization && (
                                    <InfoItem label={m['organization.label']()} value={license.organization.name} />
                                )}
                                {license.metadata?.map(item => (
                                    <InfoItem key={item.key} label={item.key} value={item.value} />
                                ))}
                            </>
                        )}
                    </InfoGrid>
                </InfoPanel>

                {!!license?.featureEntitlements?.length && (
                    <InfoPanel title={m['featureEntitlements.label']()} hint={m['featureEntitlements.hint']()} flush>
                        <InfoTable
                            rows={license.featureEntitlements}
                            rowKey={feature => feature.featureName}
                            columns={[
                                {
                                    label: m['featureEntitlements.featureName.label'](),
                                    render: feature => feature.featureDisplayName || feature.featureName,
                                },
                                // Many features are a plain on/off unlock, so an empty value is correct.
                                { label: m['featureEntitlements.value.label'](), render: feature => feature.value },
                                {
                                    label: m['expiresAt.label'](),
                                    render: feature => (feature.expiresAt ? date(feature.expiresAt) : ''),
                                },
                            ]}
                        />
                    </InfoPanel>
                )}

                {!!license?.meterAttributes?.length && (
                    <InfoPanel title={m['meterAttributes.label']()} flush>
                        <InfoTable
                            rows={license.meterAttributes}
                            rowKey={meter => meter.id}
                            columns={[
                                { label: m['meterAttributes.name.label'](), render: meter => meter.name },
                                // Floating meters count uses held by live devices, so the figure can fall (SERVER.md §8.3).
                                {
                                    label: m['meterAttributes.uses.label'](),
                                    render: meter => `${meter.totalUses} / ${limit(meter.allowedUses)}`,
                                },
                                { label: m['meterAttributes.grossUses.label'](), render: meter => meter.grossUses },
                            ]}
                        />
                    </InfoPanel>
                )}
            </div>
        </article>
    );
}
