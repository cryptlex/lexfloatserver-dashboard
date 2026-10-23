import {
    DataTable,
    DataTableProvider,
    getColumnHelper,
    useDataTableState,
} from '@cryptlex/web-components/components/data-table';
import type { FilterConfig, FiltersConfig } from '@cryptlex/web-components/components/data-table-filter';
import { IcEye } from '@cryptlex/web-components/components/icons';
import type { ApiResponseBody } from '@cryptlex/web-components/utilities/resources';
import { useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { routerBreadcrumbs } from '@/components/breadcrumbs';
import { ExpiryValue } from '@/components/expiry-value';
import { productsQuery } from '@/lib/queries';
import { m } from '@/paraglide/messages.js';
import { LeaseType } from './-device';

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

const columnHelper = getColumnHelper<'listFloatingLicenses'>();
type Device = ApiResponseBody<'listFloatingLicenses'>;
type DeviceFilters = FiltersConfig<'listFloatingLicenses'> & { leaseType: FilterConfig };

function DevicesPage() {
    const { data: products } = useSuspenseQuery(productsQuery);
    const navigate = useNavigate();
    // With a single product, the product column and filter say nothing.
    const hasManyProducts = (products?.length ?? 0) > 1;

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
        ...(hasManyProducts
            ? [
                  columnHelper.accessor('productDisplayName', {
                      header: m['devicesPage.columns.product'](),
                      enableSorting: false,
                  }),
              ]
            : []),
        columnHelper.accessor('ip', {
            header: m['devicesPage.columns.ipAddress'](),
            cell: ({ getValue }) => <span className="font-mono">{getValue()}</span>,
        }),
        columnHelper.accessor('offline', {
            header: m['devicesPage.columns.leaseType'](),
            cell: ({ getValue }) => <LeaseType offline={getValue()} />,
        }),
        // Timestamps are epoch seconds, so they can't use `displayType: 'date'`, which expects ISO strings.
        // A past renewal reads as a plain date; an expiry inside the next week reads relatively.
        columnHelper.accessor('updatedAt', {
            header: m['devicesPage.columns.leaseRenewedAt'](),
            cell: ({ getValue }) => <ExpiryValue expiresAt={getValue()} />,
        }),
        columnHelper.accessor('expiresAt', {
            header: m['devicesPage.columns.leaseExpiresAt'](),
            cell: ({ getValue }) => <ExpiryValue expiresAt={getValue()} />,
        }),
    ];

    // Sent as `productId[in]=a,b` and `offline=true|false`. Lease type is a virtual key, mapped onto `offline`
    // so the chip reads "Online"/"Offline" instead of "True"/"False". Timestamp filters are left out: the date
    // filter sends ISO strings, and the API only takes unix seconds.
    // FiltersConfig wants every filterable query param (even `include`); only these two are filters here.
    const filterConfig = {
        ...(hasManyProducts && {
            productId: {
                type: 'enum',
                options: products?.map(product => ({ id: product.id, label: product.displayName })) ?? [],
            },
        }),
        leaseType: {
            type: 'derived-select',
            options: [
                { id: 'online', label: m['common.state.online']() },
                { id: 'offline', label: m['common.state.offline']() },
            ],
            toApiQuery: value => ({ offline: value === 'offline' }),
        },
    } satisfies Record<string, FilterConfig> as unknown as DeviceFilters;

    const state = useDataTableState<Device, 'listFloatingLicenses', DeviceFilters>({
        path: '/api/v4/floating-licenses',
        columns,
        filterConfig,
        initialFilters: [],
        previewFilters: hasManyProducts ? ['productId', 'leaseType'] : ['leaseType'],
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
        // DataTableProvider has no TFilterConfig generic, so it can't see the virtual `leaseType` key.
        <DataTableProvider<Device, 'listFloatingLicenses'>
            {...state}
            previewFilters={state.previewFilters as (keyof FiltersConfig<'listFloatingLicenses'>)[]}
        >
            <DataTable />
        </DataTableProvider>
    );
}
