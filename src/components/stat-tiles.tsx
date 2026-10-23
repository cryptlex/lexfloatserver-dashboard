import type React from 'react';
import { InfoHint } from '@/components/info-panel';

export type StatTile = {
    label: string;
    /** Explains the figure when the label alone doesn't; shown as an info icon beside the label. */
    hint?: string;
    value: React.ReactNode;
    /** Smaller line beneath the value, e.g. how far away a date is. */
    supporting?: React.ReactNode;
};

/** Row of headline figures above a page's panels: one column on mobile, three from `sm`. */
export function StatTiles({ tiles }: { tiles: StatTile[] }) {
    return (
        <dl className="grid grid-cols-1 gap-icon sm:grid-cols-3">
            {tiles.map(tile => (
                <div key={tile.label} className="flex flex-col gap-2 rounded-lg border bg-surface-primary p-5">
                    <dt className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-text-secondary">
                        <span className="wrap-anywhere">{tile.label}</span>
                        {tile.hint && <InfoHint hint={tile.hint} />}
                    </dt>
                    <dd className="flex flex-col gap-0.5">
                        <span className="text-[1.375rem] font-semibold tracking-[-0.02em] text-foreground">
                            {tile.value}
                        </span>
                        {tile.supporting && <span className="text-sm text-text-secondary">{tile.supporting}</span>}
                    </dd>
                </div>
            ))}
        </dl>
    );
}
