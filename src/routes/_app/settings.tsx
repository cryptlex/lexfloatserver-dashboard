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

    return (
        <div className="grid grid-cols-1 gap-icon md:grid-cols-2">
            <InfoPanel title="Server">
                <InfoGrid>
                    <InfoItem label="Version" value={stats.version} mono />
                    <InfoItem label="Port" value={config.server.port} mono />
                </InfoGrid>
            </InfoPanel>
            <InfoPanel title="Configuration">
                <InfoGrid>
                    <InfoItem label="SSL" value={config.ssl.enabled ? 'Enabled' : 'Disabled'} />
                    <InfoItem label="Admin users" value={config.auth.admins.join(', ') || '—'} />
                    <InfoItem label="Blocked IPs" value={config.server.blockedIps.join(', ') || 'None'} mono />
                </InfoGrid>
            </InfoPanel>
            <InfoPanel title="Logging">
                <InfoGrid>
                    <InfoItem
                        label="Log level"
                        value={['Debug', 'Information', 'Warning', 'Error'][config.logging.logLevel]}
                    />
                    <InfoItem label="Console logs" value={config.logging.console.enabled ? 'Enabled' : 'Disabled'} />
                    <InfoItem label="File logs" value={config.logging.file.enabled ? 'Enabled' : 'Disabled'} />
                    {config.logging.file.enabled && (
                        <>
                            <InfoItem label="Log directory" value={config.logging.file.directory} mono />
                            <InfoItem label="Max file size" value={`${config.logging.file.maxSize} MB`} />
                            <InfoItem label="Max backups" value={config.logging.file.maxBackups} />
                        </>
                    )}
                </InfoGrid>
            </InfoPanel>
        </div>
    );
}
