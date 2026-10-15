import { Badge } from '@cryptlex/web-components/components/badge';
import { queryOptions, useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { InfoGrid, InfoItem, InfoPanel } from '@/components/info-panel';
import { apiFetch } from '@/lib/api';
import type { ServerConfig, ServerStats } from '@/types';

const statsQuery = queryOptions({
    queryKey: ['server', 'stats'],
    queryFn: () => apiFetch<ServerStats>('/api/v4/server/stats'),
});

const configQuery = queryOptions({
    queryKey: ['server', 'config'],
    queryFn: () => apiFetch<ServerConfig>('/api/v4/server/config'),
});

export const Route = createFileRoute('/_app/settings')({
    loader: ({ context }) =>
        Promise.all([context.queryClient.query(statsQuery), context.queryClient.query(configQuery)]),
    head: ({ match }) => ({ meta: [{ title: `Settings - ${match.context.branding.appName}` }] }),
    component: SettingsPage,
});

function SettingsPage() {
    const { data: stats } = useSuspenseQuery(statsQuery);
    const { data: config } = useSuspenseQuery(configQuery);

    // Lists can be long, so they take the full row, wrap, and scroll past a few lines.
    const list = (values: string[]) =>
        values.length === 0 ? (
            'None'
        ) : (
            <div className="flex max-h-32 flex-wrap gap-1 overflow-y-auto">
                {values.map(value => (
                    <Badge key={value} variant="neutral" className="font-mono">
                        {value}
                    </Badge>
                ))}
            </div>
        );

    return (
        <div className="grid grid-cols-1 gap-icon md:grid-cols-2">
            <InfoPanel title="Server">
                <InfoGrid>
                    <InfoItem label="Version" value={stats.version} mono />
                    <InfoItem label="Port" value={config.server.port} mono />
                    <InfoItem label="Host" value={config.server.cryptlexHost || 'Default'} mono />
                    <InfoItem
                        label="Lease Duration"
                        hint="How long a device can hold a seat without checking in. Products use this unless they override it. If the app closes without releasing its seat, for example after a crash, the seat becomes free when the lease runs out."
                        value={`${config.productDefaults.leaseDuration} seconds`}
                    />
                    <InfoItem
                        label="Allowed Clock Offset"
                        hint="How far a device's clock can differ from this server's before its requests are refused."
                        value={`${config.server.allowedClockOffset} seconds`}
                    />
                </InfoGrid>
            </InfoPanel>
            <InfoPanel title="Configuration">
                <InfoGrid>
                    <InfoItem label="SSL" value={config.ssl.enabled ? 'Enabled' : 'Disabled'} />
                    <InfoItem label="Admin Users" value={config.auth.admins.join(', ') || '—'} />
                    <InfoItem
                        label="Blocked IPs"
                        hint="IP addresses refused by this server."
                        value={list(config.server.blockedIps)}
                        className="sm:col-span-2"
                    />
                    <InfoItem
                        label="Trusted Proxies"
                        hint="Proxies whose forwarded client IP this server accepts."
                        value={list(config.proxy.trustedProxies)}
                        className="sm:col-span-2"
                    />
                </InfoGrid>
            </InfoPanel>
            <InfoPanel title="Logging">
                <InfoGrid>
                    <InfoItem
                        label="Log Level"
                        value={['Debug', 'Information', 'Warning', 'Error'][config.logging.logLevel]}
                    />
                    <InfoItem label="Console Logs" value={config.logging.console.enabled ? 'Enabled' : 'Disabled'} />
                    <InfoItem label="File Logs" value={config.logging.file.enabled ? 'Enabled' : 'Disabled'} />
                    {config.logging.file.enabled && (
                        <>
                            <InfoItem label="Log Directory" value={config.logging.file.directory} mono />
                            <InfoItem label="Max File Size" value={`${config.logging.file.maxSize} MB`} />
                            <InfoItem label="Max Backups" value={config.logging.file.maxBackups} />
                        </>
                    )}
                </InfoGrid>
            </InfoPanel>
        </div>
    );
}
