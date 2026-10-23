import { Alert } from '@cryptlex/web-components/components/alert';
import { Badge } from '@cryptlex/web-components/components/badge';
import { Button } from '@cryptlex/web-components/components/button';
import { CopyButton } from '@cryptlex/web-components/components/copy-button';
import { ProgressBar } from '@cryptlex/web-components/components/progress-bar';
import { formatDate } from '@cryptlex/web-components/utilities/date';
import type { ApiSchema } from '@cryptlex/web-components/utilities/resources';
import { useQuery } from '@tanstack/react-query';
import { createLink, useRouteContext } from '@tanstack/react-router';
import type React from 'react';
import { CardAvatar } from '@/components/card-avatar';
import { ExpiryValue } from '@/components/expiry-value';
import { InfoGrid, InfoItem, InfoPanel, InfoTable } from '@/components/info-panel';
import { StatTiles } from '@/components/stat-tiles';
import { productConfigQuery } from '@/lib/queries';
import { DATE_TIME_OPTIONS, formatDuration, getExpiryDisplay } from '@/lib/relative-time';
import { m } from '@/paraglide/messages.js';
import { ActivateDialog } from './-activate-dialog';
import { DeactivateDialog } from './-deactivate-dialog';

type Product = ApiSchema<'Product'>;

const ButtonLink = createLink(Button);

export const STATUS: Record<
    Product['status'],
    {
        label: () => string;
        hint: (inputs: { appName: string }) => string;
        variant: React.ComponentProps<typeof Badge>['variant'];
    }
> = {
    ok: { label: m['license.status.ok.label'], hint: m['license.status.ok.hint'], variant: 'success' },
    not_activated: {
        label: m['license.status.notActivated.label'],
        hint: m['license.status.notActivated.hint'],
        variant: 'warning',
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

/** Seats in use against the limit, as a progress bar unless the limit is unlimited. */
export function seats(product: Product) {
    const label = `${product.totalFloatingClients} / ${limit(product.allowedFloatingClients)}`;
    if (product.allowedFloatingClients === -1) return label;
    return (
        <ProgressBar
            minValue={0}
            maxValue={product.allowedFloatingClients}
            value={product.totalFloatingClients}
            // Count above the bar.
            className="flex-col-reverse items-start"
            meterClassName="w-50"
            label={label}
        />
    );
}

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

/** LexFloatServer has no sync endpoint yet, so this stays disabled until it does. */
function SyncButton() {
    return <Button isDisabled>{m['productsPage.action.sync']()}</Button>;
}

function Banner({
    title,
    children,
    actions,
    variant,
}: {
    title: string;
    children: React.ReactNode;
    actions?: React.ReactNode;
    /** Shows the banner as an alert, for a product that can't hand out seats. */
    variant?: 'destructive' | 'warning' | 'neutral';
}) {
    if (variant) {
        return (
            <Alert variant={variant} className="sm:w-full">
                <div className="flex flex-wrap items-center gap-icon">
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                        <h3 className="font-semibold">{title}</h3>
                        <p className="text-text-secondary">{children}</p>
                    </div>
                    {actions && <div className="flex gap-icon">{actions}</div>}
                </div>
            </Alert>
        );
    }
    return (
        <>
            <div className="flex flex-col gap-1">
                <h3 className="font-semibold text-foreground">{title}</h3>
                <p className="text-sm text-text-secondary">{children}</p>
            </div>
            {actions && <footer className="mt-auto flex justify-end gap-icon border-t pt-3">{actions}</footer>}
        </>
    );
}

/** Why a product can't hand out seats, and the fix. No badge: the header badge already names the state. */
function StatusBanner({ product }: { product: Product }) {
    switch (product.status) {
        case 'grace_period_over':
            return (
                <Banner
                    title={m['productsPage.banner.gracePeriodOver.title']()}
                    actions={<SyncButton />}
                    variant="destructive"
                >
                    {m['productsPage.banner.gracePeriodOver.description']()}
                </Banner>
            );
        case 'expired':
            return (
                <Banner
                    title={m['productsPage.banner.expired.title']()}
                    variant="destructive"
                    actions={
                        <>
                            <SyncButton />
                            <ActivateDialog product={product} />
                        </>
                    }
                >
                    {m['productsPage.banner.expired.description']()}
                </Banner>
            );
        case 'suspended':
            return (
                <Banner title={m['productsPage.banner.suspended.title']()} variant="warning">
                    {m['productsPage.banner.suspended.description']()}
                </Banner>
            );
        case 'disabled': {
            // Split around a placeholder so the file name can be set in mono inside the translated sentence.
            const [before, after] = m['productsPage.banner.disabled.description']({ file: '\0' }).split('\0');
            return (
                <Banner title={m['productsPage.banner.disabled.title']()} variant="neutral">
                    {before}
                    <code className="font-mono">config.yml</code>
                    {after}
                </Banner>
            );
        }
        // A not-activated product shows its card instead.
        case 'not_activated':
        case 'ok':
            return null;
    }
}

/** The card's own border frames a status alert, so the alert drops its border and padding. */
const CARD_CLASS =
    'flex flex-col gap-4 rounded-lg border bg-surface-primary p-5 [&_[role=alert]]:border-0 [&_[role=alert]]:p-0';
const CARD_FOOTER_CLASS = 'mt-auto flex justify-end gap-icon border-t pt-3';

/** Compact product summary; also stands in for the details page while the product is not activated or disabled. */
export function ProductCard({ product }: { product: Product }) {
    // One muted line where the seats and expiry would be, so the card isn't empty.
    if (product.status === 'not_activated') {
        return (
            <article className={CARD_CLASS}>
                <ProductHeader product={product} />
                <p className="text-sm text-text-secondary">{m['productsPage.card.notActivated']()}</p>
                <footer className={CARD_FOOTER_CLASS}>
                    <ActivateDialog product={product} />
                </footer>
            </article>
        );
    }

    if (product.status === 'disabled') {
        return (
            <article className={CARD_CLASS}>
                <ProductHeader product={product} />
                <StatusBanner product={product} />
            </article>
        );
    }

    return (
        <article className={CARD_CLASS}>
            <ProductHeader product={product} />
            {/* A license that can't hand out seats shows only why, not its figures. */}
            {product.status === 'ok' ? (
                <InfoGrid>
                    <InfoItem
                        label={m['productsPage.card.seats.label']()}
                        hint={m['productsPage.card.seats.hint']()}
                        value={seats(product)}
                    />
                    <InfoItem
                        label={m['expiresAt.label']()}
                        hint={m['expiresAt.hint']()}
                        // 0 means a perpetual license.
                        value={
                            product.expiresAt ? (
                                <ExpiryValue expiresAt={product.expiresAt} />
                            ) : (
                                m['common.state.never']()
                            )
                        }
                    />
                </InfoGrid>
            ) : (
                <StatusBanner product={product} />
            )}
            <footer className={CARD_FOOTER_CLASS}>
                <ButtonLink variant="primary" to="/products/$productId" params={{ productId: product.id }}>
                    {m['productsPage.action.viewProduct']()}
                </ButtonLink>
            </footer>
        </article>
    );
}

/** Headline figures for an activated product: seats in use, lease duration and expiry. */
function ProductStats({ product }: { product: Product }) {
    const { data: config } = useQuery(productConfigQuery(product.id));
    // Same phrasing as the product cards: relative only in the week before expiry.
    const expiry = getExpiryDisplay(product.expiresAt ? new Date(product.expiresAt * 1000).toISOString() : null);

    return (
        <StatTiles
            tiles={[
                // "0 / 10" already says what it is, so no hint.
                { label: m['productsPage.card.seats.label'](), value: seats(product) },
                {
                    label: m['leaseDuration.label'](),
                    hint: m['productsPage.sections.stats.leaseDuration.hint'](),
                    value: config ? formatDuration(config.leaseDuration) : '',
                },
                {
                    label: m['expiresAt.label'](),
                    hint: m['expiresAt.hint'](),
                    // 0 means a perpetual license.
                    value: expiry.dateTime ? (
                        <time dateTime={expiry.dateTime}>{expiry.label}</time>
                    ) : (
                        m['common.state.never']()
                    ),
                    supporting: expiry.supporting,
                },
            ]}
        />
    );
}

/** What each leasing strategy means; the value itself is shown as the raw enum. */
const LEASING_STRATEGY_HINT: Record<string, () => string> = {
    'per-machine': m['leasingStrategy.perMachine.hint'],
    'per-instance': m['leasingStrategy.perInstance.hint'],
};

/** Masked down to its last group so screenshots don't leak it; copy still copies it whole. */
function LicenseKey({ value }: { value: string }) {
    return (
        <span className="flex items-center gap-1">
            <span className="whitespace-nowrap font-mono">{`••••-••••-${value.split('-').at(-1)}`}</span>
            <CopyButton variant="ghost" size="icon-sm" label={null} textToCopy={value} />
        </span>
    );
}

function LicenseDetails({ product }: { product: Product }) {
    const { license } = product;
    const { data: config } = useQuery(productConfigQuery(product.id));
    const appName = useRouteContext({ from: '__root__' }).branding.appName ?? '';

    return (
        <InfoPanel title={m['productsPage.sections.licenseDetails.title']()}>
            <InfoGrid>
                {/* The only place the status shows on this page; the header hides its badge. */}
                <InfoItem
                    label={m['status.label']()}
                    hint={STATUS[product.status].hint({ appName })}
                    value={<Badge variant={STATUS[product.status].variant}>{STATUS[product.status].label()}</Badge>}
                />
                {license && (
                    <>
                        <InfoItem label={m['key.label']()} value={<LicenseKey value={license.key} />} />
                        {/* The server only knows whether this license has been online, not how it was first activated. */}
                        <InfoItem
                            label={m['offline.label']()}
                            hint={m['offline.hint']()}
                            value={
                                license.activationMode.current === 'offline'
                                    ? m['common.state.yes']()
                                    : m['common.state.no']()
                            }
                        />
                        <InfoItem
                            label={m['activatedAt.label']()}
                            value={
                                license.activatedAt ? (
                                    <time dateTime={new Date(license.activatedAt * 1000).toISOString()}>
                                        {formatDate(
                                            new Date(license.activatedAt * 1000).toISOString(),
                                            DATE_TIME_OPTIONS
                                        )}
                                    </time>
                                ) : (
                                    ''
                                )
                            }
                        />
                        <InfoItem
                            label={m['leasingStrategy.label']()}
                            hint={LEASING_STRATEGY_HINT[license.leasingStrategy]?.()}
                            value={<span className="uppercase">{license.leasingStrategy}</span>}
                            mono
                        />
                    </>
                )}
                <InfoItem
                    label={m['offlineSeats.label']()}
                    hint={m['offlineSeats.hint']()}
                    value={
                        config
                            ? `${product.totalOfflineFloatingClients} / ${limit(config.allowedOfflineFloatingClients)}`
                            : ''
                    }
                />
                <InfoItem
                    label={m['maxOfflineLeaseDuration.label']()}
                    hint={m['maxOfflineLeaseDuration.hint']()}
                    value={config ? formatDuration(config.maxOfflineLeaseDuration) : ''}
                />
            </InfoGrid>
        </InfoPanel>
    );
}

/** Key/value metadata, hidden when there is none. */
function MetadataPanel({
    title,
    hint,
    metadata,
}: {
    title: string;
    hint: string;
    metadata: ApiSchema<'Metadata'>[] | null | undefined;
}) {
    if (!metadata?.length) return null;
    return (
        <InfoPanel title={title} hint={hint} flush>
            <InfoTable
                rows={metadata}
                rowKey={item => item.key}
                columns={[
                    { label: m['metadata.key.label'](), render: item => item.key },
                    { label: m['metadata.value.label'](), render: item => item.value },
                ]}
            />
        </InfoPanel>
    );
}

export function ProductDetails({ product }: { product: Product }) {
    const { license } = product;
    const isActivated = license && license.status !== 'not_activated';

    // Nothing to show before activation or while disabled, so the card's prompt is all there is.
    if (product.status === 'not_activated' || product.status === 'disabled') return <ProductCard product={product} />;

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
                            <SyncButton />
                            {license.activationMode.current === 'offline' ? (
                                // TODO: offline deactivation flow.
                                <Button variant="destructive_neutral">{m['productsPage.action.deactivate']()}</Button>
                            ) : (
                                <DeactivateDialog product={product} licenseKey={license.key} />
                            )}
                        </>
                    ) : null
                }
            />

            <StatusBanner product={product} />

            <ProductStats product={product} />

            <div className="grid grid-cols-1 gap-icon md:grid-cols-2">
                <LicenseDetails product={product} />

                {!!license?.meterAttributes?.length && (
                    <InfoPanel
                        title={m['productsPage.sections.meterAttributes.title']()}
                        hint={m['productsPage.sections.meterAttributes.hint']()}
                        flush
                    >
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

                {!!license?.featureEntitlements?.length && (
                    <InfoPanel
                        title={m['productsPage.sections.featureEntitlements.title']()}
                        hint={m['productsPage.sections.featureEntitlements.hint']()}
                        flush
                    >
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

                <MetadataPanel
                    title={m['productsPage.sections.licenseMetadata.title']()}
                    hint={m['productsPage.sections.licenseMetadata.hint']()}
                    metadata={license?.metadata}
                />

                <MetadataPanel
                    title={m['productsPage.sections.productMetadata.title']()}
                    hint={m['productsPage.sections.productMetadata.hint']()}
                    metadata={product.metadata}
                />
            </div>
        </article>
    );
}
