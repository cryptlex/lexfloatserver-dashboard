import { Badge } from '@cryptlex/web-components/components/badge';
import { DataTable, DataTableProvider, useDataTableState } from '@cryptlex/web-components/components/data-table';
import type { FiltersConfig } from '@cryptlex/web-components/components/data-table-filter';
import { IcEye } from '@cryptlex/web-components/components/icons';
import type { ApiSchema } from '@cryptlex/web-components/utilities/resources';
import { useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { createColumnHelper } from '@tanstack/react-table';
import { routerBreadcrumbs } from '@/components/breadcrumbs';
import { m } from '@/paraglide/messages.js';
import { date, productsQuery } from '../products/-product';

export const Route = createFileRoute('/_app/devices/')({
    beforeLoad: () => routerBreadcrumbs([{ to: '/devices', label: m['devicesPage.pageTitle']() }]),
    head: ({ match }) => ({
        meta: [
            {
                title: m['common.pageTitle']({
                    title: m['devicesPage.pageTitle'](),
                    appName: match.context.branding.appName ?? '',
                }),
            },
        ],
    }),
    component: DevicesPage,
});

const relativeTimeFormat = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
const relativeTimeUnits: [Intl.RelativeTimeFormatUnit, number][] = [
    ['year', 31_536_000],
    ['month', 2_592_000],
    ['day', 86_400],
    ['hour', 3_600],
    ['minute', 60],
    ['second', 1],
];

/** Epoch seconds as "in 5 minutes" over the exact date, laid out like web-portals-react's `ExpiryValue`. */
function relativeDate(seconds: number) {
    if (!seconds) return '';
    const diff = seconds - Date.now() / 1000;
    const [unit, size] = relativeTimeUnits.find(([, size]) => Math.abs(diff) >= size) ?? relativeTimeUnits[5];
    return (
        <span className="flex flex-col">
            <time dateTime={new Date(seconds * 1000).toISOString()} className="text-primary font-semibold">
                {relativeTimeFormat.format(Math.round(diff / size), unit)}
            </time>
            <span>{date(seconds)}</span>
        </span>
    );
}

const columnHelper = createColumnHelper<ApiSchema<'FloatingLicense'>>();

function DevicesPage() {
    const { data: products } = useSuspenseQuery(productsQuery);
    const navigate = useNavigate();

    const columns = [
        columnHelper.accessor('hostname', {
            header: m['devicesPage.columns.hostname'](),
            cell: ({ row }) => (
                <div className="flex flex-col">
                    {row.original.hostname}
                    <span className="text-sm text-muted-foreground">{row.original.username}</span>
                </div>
            ),
        }),
        columnHelper.accessor('productDisplayName', {
            header: m['devicesPage.columns.product'](),
            enableSorting: false,
        }),
        columnHelper.accessor('ip', {
            header: m['devicesPage.columns.ipAddress'](),
            cell: ({ getValue }) => <span className="font-mono">{getValue()}</span>,
        }),
        columnHelper.accessor('offline', {
            header: m['devicesPage.columns.lease'](),
            cell: ({ getValue }) =>
                getValue() ? (
                    <Badge variant="neutral">{m['common.state.offline']()}</Badge>
                ) : (
                    <Badge variant="success">{m['common.state.online']()}</Badge>
                ),
        }),
        columnHelper.accessor('clientVersion', {
            header: m['devicesPage.columns.clientVersion'](),
            enableSorting: false,
        }),
        // Timestamps are epoch seconds, so they can't use `displayType: 'date'`, which expects ISO strings.
        columnHelper.accessor('updatedAt', {
            header: m['devicesPage.columns.lastSeenAt'](),
            cell: ({ getValue }) => relativeDate(getValue()),
        }),
        columnHelper.accessor('expiresAt', {
            header: m['devicesPage.columns.leaseExpiresAt'](),
            cell: ({ getValue }) => relativeDate(getValue()),
        }),
    ];

    // Sent as `productId[in]=a,b` and `offline=true`. Timestamp filters are left out: the date filter sends
    // ISO strings, and the API only takes unix seconds.
    // FiltersConfig wants every filterable query param (even `include`); only these two are filters here.
    const filterConfig = {
        productId: {
            type: 'enum',
            options: products?.map(product => ({ id: product.id, label: product.displayName })) ?? [],
        },
        offline: { type: 'bool' },
    } satisfies Partial<FiltersConfig<'listFloatingLicenses'>> as FiltersConfig<'listFloatingLicenses'>;

    const state = useDataTableState<ApiSchema<'FloatingLicense'>, 'listFloatingLicenses'>({
        path: '/api/v4/floating-licenses',
        columns,
        columnsToHideByDefault: { clientVersion: true },
        filterConfig,
        initialFilters: [],
        previewFilters: (products?.length ?? 0) > 1 ? ['productId', 'offline'] : ['offline'],
        tableActions: [
            {
                resourceType: 'single',
                label: m['devicesPage.action.view'](),
                icon: IcEye,
                onPress: ({ data }) => navigate({ to: '/devices/$deviceId', params: { deviceId: data.id } }),
            },
        ],
        searchPlaceholder: m['devicesPage.searchPlaceholder'](),
        hideViewToggle: true,
        onRowNavigate: row => navigate({ to: '/devices/$deviceId', params: { deviceId: row.id } }),
    });

    return (
        <DataTableProvider<ApiSchema<'FloatingLicense'>, 'listFloatingLicenses'> {...state}>
            <DataTable />
        </DataTableProvider>
    );
}
