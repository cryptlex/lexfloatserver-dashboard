import { Badge } from '@cryptlex/web-components/components/badge';
import { queryOptions, useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { InfoGrid, InfoItem, InfoPanel } from '@/components/info-panel';
import { client } from '@/lib/api';
import { serverStatsQuery } from '@/lib/queries';
import { m } from '@/paraglide/messages.js';

const configQuery = queryOptions({
    queryKey: ['get', '/api/v4/server/config'],
    queryFn: async () => (await client.GET('/api/v4/server/config')).data!,
});

export const Route = createFileRoute('/_app/settings')({
    loader: ({ context }) =>
        Promise.all([context.queryClient.query(serverStatsQuery), context.queryClient.query(configQuery)]),
    head: ({ match }) => ({
        meta: [
            {
                title: m['common.pageTitle']({
                    title: m['settingsPage.pageTitle'](),
                    appName: match.context.branding.appName ?? '',
                }),
            },
        ],
    }),
    component: SettingsPage,
});

function SettingsPage() {
    const { data: stats } = useSuspenseQuery(serverStatsQuery);
    const { data: config } = useSuspenseQuery(configQuery);

    // Lists can be long, so they take the full row, wrap, and scroll past a few lines.
    const list = (values: string[]) =>
        values.length === 0 ? (
            m['common.state.none']()
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
            <InfoPanel title={m['settingsPage.sections.server.title']()}>
                <InfoGrid>
                    <InfoItem label={m['version.label']()} value={stats?.version} mono />
                    <InfoItem label={m['port.label']()} value={config.server.port} mono />
                    <InfoItem
                        label={m['cryptlexHost.label']()}
                        value={config.server.cryptlexHost || m['common.state.default']()}
                        mono
                    />
                    <InfoItem
                        label={m['leaseDuration.label']()}
                        hint={m['leaseDuration.hint']()}
                        value={m['common.unit.seconds']({ count: config.productDefaults.leaseDuration })}
                    />
                    <InfoItem
                        label={m['allowedClockOffset.label']()}
                        hint={m['allowedClockOffset.hint']()}
                        value={m['common.unit.seconds']({ count: config.server.allowedClockOffset })}
                    />
                </InfoGrid>
            </InfoPanel>
            <InfoPanel title={m['settingsPage.sections.configuration.title']()}>
                <InfoGrid>
                    <InfoItem
                        label={m['ssl.label']()}
                        value={config.ssl.enabled ? m['common.state.enabled']() : m['common.state.disabled']()}
                    />
                    <InfoItem label={m['admins.label']()} value={config.auth.admins.join(', ') || '—'} />
                    <InfoItem
                        label={m['blockedIps.label']()}
                        hint={m['blockedIps.hint']()}
                        value={list(config.server.blockedIps)}
                        className="sm:col-span-2"
                    />
                    <InfoItem
                        label={m['trustedProxies.label']()}
                        hint={m['trustedProxies.hint']()}
                        value={list(config.proxy.trustedProxies)}
                        className="sm:col-span-2"
                    />
                </InfoGrid>
            </InfoPanel>
            <InfoPanel title={m['settingsPage.sections.logging.title']()}>
                <InfoGrid>
                    <InfoItem
                        label={m['logLevel.label']()}
                        value={[
                            m['logLevel.debug.label'],
                            m['logLevel.information.label'],
                            m['logLevel.warning.label'],
                            m['logLevel.error.label'],
                        ][config.logging.logLevel]?.()}
                    />
                    <InfoItem
                        label={m['consoleLogs.label']()}
                        value={
                            config.logging.console.enabled ? m['common.state.enabled']() : m['common.state.disabled']()
                        }
                    />
                    <InfoItem
                        label={m['fileLogs.label']()}
                        value={config.logging.file.enabled ? m['common.state.enabled']() : m['common.state.disabled']()}
                    />
                    {config.logging.file.enabled && (
                        <>
                            <InfoItem label={m['logDirectory.label']()} value={config.logging.file.directory} mono />
                            <InfoItem
                                label={m['maxFileSize.label']()}
                                value={m['common.unit.megabytes']({ count: config.logging.file.maxSize })}
                            />
                            <InfoItem label={m['maxBackups.label']()} value={config.logging.file.maxBackups} />
                        </>
                    )}
                </InfoGrid>
            </InfoPanel>
        </div>
    );
}
