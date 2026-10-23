import { m } from '@/paraglide/messages.js';

/** Lease type as plain text (Online / Offline), not a status badge. */
export function LeaseType({ offline, className }: { offline: boolean; className?: string }) {
    return <span className={className}>{offline ? m['common.state.offline']() : m['common.state.online']()}</span>;
}

// Clients report OS names in lowercase ("macos"); show them with their proper casing.
const OS_NAMES: Record<string, string> = {
    windows: 'Windows',
    macos: 'macOS',
    linux: 'Linux',
    ios: 'iOS',
    android: 'Android',
    freebsd: 'FreeBSD',
};

export function formatOs(os: string, version: string) {
    return [OS_NAMES[os.toLowerCase()] ?? os, version].filter(Boolean).join(' ');
}
