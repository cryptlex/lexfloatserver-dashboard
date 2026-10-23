import { Alert } from '@cryptlex/web-components/components/alert';
import { Badge } from '@cryptlex/web-components/components/badge';
import { queryOptions, useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { routerBreadcrumbs } from '@/components/breadcrumbs';
import { InfoGrid, InfoItem, InfoPanel } from '@/components/info-panel';
import { client } from '@/lib/api';
import { serverStatsQuery } from '@/lib/queries';
import { formatDuration } from '@/lib/relative-time';
import { m } from '@/paraglide/messages.js';
import { limit } from './products/-product';

const configQuery = queryOptions({
    queryKey: ['get', '/api/v4/server/config'],
    queryFn: async () => (await client.GET('/api/v4/server/config'))?.data,
});

export const Route = createFileRoute('/_app/settings')({
    beforeLoad: () => routerBreadcrumbs([{ to: '/settings', label: m['settingsPage.pageTitle']() }]),
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
    if (!config) return null;

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

    const onOff = (value: boolean) => (value ? m['common.state.on']() : m['common.state.off']());
    const enabled = (value: boolean) => (value ? m['common.state.enabled']() : m['common.state.disabled']());

    return (
        <div className="flex flex-col gap-icon">
            <Alert variant="neutral">{m['settingsPage.banner']()}</Alert>
            <div className="grid grid-cols-1 gap-icon md:grid-cols-2">
                <InfoPanel title={m['settingsPage.sections.server.title']()}>
                    <InfoGrid>
                        <InfoItem label={m['version.label']()} hint={m['version.hint']()} value={stats?.version} />
                        <InfoItem label={m['tls.label']()} hint={m['tls.hint']()} value={onOff(config.ssl.enabled)} />
                        <InfoItem label={m['port.label']()} value={config.server.port} mono />
                        <InfoItem
                            label={m['enableIpv6.label']()}
                            hint={m['enableIpv6.hint']()}
                            value={enabled(config.server.enableIpv6)}
                        />
                        <InfoItem
                            label={m['allowedClockOffset.label']()}
                            hint={m['allowedClockOffset.hint']()}
                            value={m['common.unit.seconds']({ count: config.server.allowedClockOffset })}
                        />
                        <InfoItem
                            label={m['admins.label']()}
                            hint={m['admins.hint']()}
                            value={config.auth.admins.join(', ') || m['common.state.none']()}
                        />
                        <InfoItem
                            label={m['blockedIps.label']()}
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
                        <InfoItem label={m['consoleLogs.label']()} value={enabled(config.logging.console.enabled)} />
                        <InfoItem label={m['fileLogs.label']()} value={enabled(config.logging.file.enabled)} />
                        {config.logging.file.enabled && (
                            <>
                                <InfoItem
                                    label={m['logDirectory.label']()}
                                    value={config.logging.file.directory}
                                    mono
                                />
                                <InfoItem
                                    label={m['maxFileSize.label']()}
                                    hint={m['maxFileSize.hint']()}
                                    value={m['common.unit.megabytes']({ count: config.logging.file.maxSize })}
                                />
                                <InfoItem
                                    label={m['maxBackups.label']()}
                                    hint={m['maxBackups.hint']()}
                                    value={config.logging.file.maxBackups}
                                />
                            </>
                        )}
                    </InfoGrid>
                </InfoPanel>
                <InfoPanel
                    title={m['settingsPage.sections.productDefaults.title']()}
                    hint={m['settingsPage.sections.productDefaults.hint']()}
                >
                    <InfoGrid>
                        <InfoItem
                            label={m['leaseDuration.label']()}
                            hint={m['leaseDuration.hint']()}
                            value={formatDuration(config.productDefaults.leaseDuration)}
                        />
                        <InfoItem
                            label={m['maxOfflineLeaseDuration.label']()}
                            hint={m['maxOfflineLeaseDuration.hint']()}
                            value={formatDuration(config.productDefaults.maxOfflineLeaseDuration)}
                        />
                        <InfoItem
                            label={m['offlineSeats.label']()}
                            hint={m['offlineSeats.hint']()}
                            value={limit(config.productDefaults.allowedOfflineFloatingClients)}
                        />
                    </InfoGrid>
                </InfoPanel>
            </div>
        </div>
    );
}
