import { m } from '@/paraglide/messages.js';

/** Lease type as an enum value (ONLINE / OFFLINE), not a status badge. */
export function LeaseType({ offline }: { offline: boolean }) {
    return (
        <span className="font-mono uppercase">
            {offline ? m['common.state.offline']() : m['common.state.online']()}
        </span>
    );
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
