import { classNames } from '@cryptlex/web-components/utilities/theme';
import type React from 'react';

export function InfoPanel({ title, children }: { title: React.ReactNode; children: React.ReactNode }) {
    return (
        <section className="flex flex-col overflow-hidden rounded-lg border bg-surface-primary">
            <header className="flex h-11 shrink-0 items-center border-b border-stroke-secondary bg-surface-secondary px-5">
                <h3 className="truncate text-xs font-semibold uppercase tracking-wider text-text-secondary">{title}</h3>
            </header>
            <div className="h-full w-full px-5 pt-4 pb-5">{children}</div>
        </section>
    );
}

export function InfoGrid({ children }: { children: React.ReactNode }) {
    return <div className="grid grid-cols-2 gap-x-13 gap-y-3">{children}</div>;
}

export function InfoItem({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
    return (
        <div className="min-w-0 space-y-1">
            <div className="truncate text-xs font-semibold uppercase tracking-wider text-text-secondary">{label}</div>
            <div className={classNames('text-sm font-medium text-foreground wrap-anywhere', mono && 'font-mono')}>
                {value}
            </div>
        </div>
    );
}
