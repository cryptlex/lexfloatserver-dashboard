import { Button } from '@cryptlex/web-components/components/button';
import { IcInfo } from '@cryptlex/web-components/components/icons';
import { Popover, PopoverDialog, PopoverTrigger } from '@cryptlex/web-components/components/popover';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@cryptlex/web-components/components/table';
import { Tooltip, TooltipTrigger } from '@cryptlex/web-components/components/tooltip';
import { classNames } from '@cryptlex/web-components/utilities/theme';
import type React from 'react';
import { useSyncExternalStore } from 'react';

// Same "Mini Table" panel and info hint as web-portals-react `lib/components/info-panel.tsx` and `info-hint.tsx`.

/** Bordered panel with an uppercase title bar. */
export function InfoPanel({
    title,
    hint,
    flush,
    children,
}: {
    title: string;
    /** Explains the panel's contents; shown as an info icon beside the title. */
    hint?: string;
    /** Edge-to-edge body, for an `InfoTable`. */
    flush?: boolean;
    children: React.ReactNode;
}) {
    return (
        <section className="overflow-hidden rounded-lg border bg-surface-primary">
            <h2 className="flex h-11 items-center gap-1 border-b border-stroke-secondary bg-surface-secondary px-5 text-xs font-semibold uppercase tracking-wider text-text-secondary">
                {title}
                {hint && <InfoHint hint={hint} />}
            </h2>
            <div className={classNames(!flush && 'px-5 pt-4 pb-5')}>{children}</div>
        </section>
    );
}

/** Label/value list: one column on mobile, two from `sm`. */
export function InfoGrid({ children }: { children: React.ReactNode }) {
    return <dl className="grid grid-cols-1 gap-x-13 gap-y-3 sm:grid-cols-2">{children}</dl>;
}

/** Single label/value pair inside an `InfoGrid`. */
export function InfoItem({
    label,
    hint,
    value,
    mono,
    className,
}: {
    label: string;
    /** Explains a term the reader may not know; shown as an info icon beside the label. */
    hint?: string;
    value: React.ReactNode;
    mono?: boolean;
    className?: string;
}) {
    return (
        <div className={classNames('min-w-0 space-y-1', className)}>
            <dt className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-text-secondary">
                <span className="wrap-anywhere">{label}</span>
                {hint && <InfoHint hint={hint} />}
            </dt>
            <dd className={classNames('wrap-anywhere text-sm font-medium text-foreground', mono && 'font-mono')}>
                {value}
            </dd>
        </div>
    );
}

export type InfoTableColumn<TRow> = {
    label: string;
    render: (row: TRow) => React.ReactNode;
};

/** Flat table for a `flush` `InfoPanel`, the tabular "Mini Table" variant. */
export function InfoTable<TRow>({
    columns,
    rows,
    rowKey,
}: {
    columns: InfoTableColumn<TRow>[];
    rows: TRow[];
    rowKey: (row: TRow) => string;
}) {
    return (
        <div className="max-h-100 overflow-auto">
            <Table className="border-0 py-0">
                <TableHeader>
                    <TableRow>
                        {columns.map(column => (
                            <TableHead
                                key={column.label}
                                className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-text-secondary"
                            >
                                {column.label}
                            </TableHead>
                        ))}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {rows.map(row => (
                        <TableRow key={rowKey(row)}>
                            {columns.map(column => (
                                <TableCell key={column.label} className="px-5 py-3 text-sm font-medium text-foreground">
                                    {column.render(row)}
                                </TableCell>
                            ))}
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}

const HOVER_QUERY = '(hover: hover) and (pointer: fine)';

/** An info icon: a tooltip where the device can hover, a tap-to-open popover where it can't. */
function InfoHint({ hint }: { hint: string }) {
    const canHover = useSyncExternalStore(
        onChange => {
            const mql = window.matchMedia(HOVER_QUERY);
            mql.addEventListener('change', onChange);
            return () => mql.removeEventListener('change', onChange);
        },
        () => window.matchMedia(HOVER_QUERY).matches
    );

    const button = (
        <Button
            variant="ghost"
            size="sm"
            aria-label={hint}
            className="size-auto shrink-0 p-0.5 text-text-secondary hover:text-text-primary"
        >
            <IcInfo className="size-3.5" />
        </Button>
    );

    return canHover ? (
        <TooltipTrigger delay={200}>
            {button}
            <Tooltip>{hint}</Tooltip>
        </TooltipTrigger>
    ) : (
        <PopoverTrigger>
            {button}
            <Popover placement="bottom" className="max-w-[min(20rem,calc(100vw-2rem))]">
                <PopoverDialog className="body-sm normal-case tracking-normal">{hint}</PopoverDialog>
            </Popover>
        </PopoverTrigger>
    );
}
