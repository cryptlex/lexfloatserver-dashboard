import { classNames } from '@cryptlex/web-components/utilities/theme';
import { getExpiryDisplay } from '@/lib/relative-time';

// Same as web-portals-react `lib/components/expiry-value.tsx`, but takes the API's epoch seconds.

export function ExpiryValue({
    expiresAt,
    className,
}: {
    /** Epoch seconds; 0 means not set. */
    expiresAt: number;
    className?: string;
}) {
    const { label, supporting, dateTime } = getExpiryDisplay(
        expiresAt ? new Date(expiresAt * 1000).toISOString() : null
    );

    // No usable date — no machine value to expose, so this is plain text rather than a <time>.
    if (!dateTime) {
        return <span className={className}>{label}</span>;
    }

    // The label is already the date; a second line would just repeat it.
    if (!supporting) {
        return (
            <time dateTime={dateTime} className={className}>
                {label}
            </time>
        );
    }

    return (
        <span className={classNames('flex flex-col', className)}>
            <time dateTime={dateTime} className="text-primary font-semibold">
                {label}
            </time>
            <span>{supporting}</span>
        </span>
    );
}
