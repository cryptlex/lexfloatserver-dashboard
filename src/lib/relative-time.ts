import { formatDate } from '@cryptlex/web-components/utilities/date';
import { m } from '@/paraglide/messages.js';

// Same expiry phrasing as web-portals-react `lib/utils/relative-time.ts`.

/**
 * The time is included deliberately: on the final day of a license it matters
 * whether it lapses at 09:00 or 23:59. `formatDate` defaults to including
 * `second: '2-digit'`, which is noise here, so these options override it.
 */
export const DATE_TIME_OPTIONS: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
};

/** Inside this window the expiry is urgent enough to phrase relatively. */
const EXPIRING_SOON_DAYS = 7;

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

export type ExpiryDisplay = {
    /**
     * What the reader scans: a relative phrase ("In 3 days") inside the week
     * before expiry, where the urgency is the point; otherwise the formatted
     * date, which is what a reader acts on at that distance.
     */
    label: string;
    /**
     * The exact timestamp, for a second line beneath a relative `label`.
     * `null` whenever `label` is already the date, so it is never repeated —
     * which also makes this the marker for "this expiry is urgent".
     */
    supporting: string | null;
    /** The raw ISO value for a `<time dateTime>` attribute, if there is one. */
    dateTime: string | null;
};

/** No usable date. */
const withoutDate = (label: string): ExpiryDisplay => ({
    label,
    supporting: null,
    dateTime: null,
});

/**
 * Describes an expiry the way a reader asks about it: *is this a problem, and
 * how soon?* Only the last week before expiry is urgent enough to phrase
 * relatively; everything else — a distant renewal, an already-lapsed licence —
 * is a date, which is what a reader acts on at that distance.
 */
export function getExpiryDisplay(expiresAt?: string | null): ExpiryDisplay {
    if (!expiresAt) return withoutDate('');

    // Validate before formatting: `formatDate` throws a RangeError on an
    // unparseable value rather than returning null, which would crash the page.
    const remainingMs = new Date(expiresAt).getTime() - Date.now();
    if (Number.isNaN(remainingMs)) return withoutDate('');

    // An unparseable date must not fall back to printing the raw ISO string.
    const exact = formatDate(expiresAt, DATE_TIME_OPTIONS);
    if (!exact) return withoutDate('');

    // Lapsed and distant expiries both read as a plain date, so the relative
    // phrase is reserved for the window where it changes what the reader does.
    const isExpiringSoon = remainingMs > 0 && remainingMs < EXPIRING_SOON_DAYS * DAY_MS;

    return {
        // Where the phrase leads, the timestamp sits one line below it, so the
        // urgency is scannable without putting the exact time out of reach.
        label: isExpiringSoon ? relativePhrase(remainingMs) : exact,
        supporting: isExpiringSoon ? exact : null,
        dateTime: expiresAt,
    };
}

/**
 * Only ever called inside the warning window, so it steps down from days to
 * minutes and no further — coarser month and year phrasings are unreachable.
 * Each unit picks its own singular form, so this can never emit "1 days".
 */
function relativePhrase(ms: number): string {
    // Whole units remaining, the way a user counts them: 36 hours is "In 1 day"
    // (a day and a half), not two, and 90 minutes is "In 1 hour".
    const days = Math.floor(ms / DAY_MS);
    if (days >= 1) return days === 1 ? m['time.in.day']() : m['time.in.days']({ count: days });

    const hours = Math.floor(ms / HOUR_MS);
    if (hours >= 1) return hours === 1 ? m['time.in.hour']() : m['time.in.hours']({ count: hours });

    const minutes = Math.max(1, Math.round(ms / MINUTE_MS));
    return minutes === 1 ? m['time.in.minute']() : m['time.in.minutes']({ count: minutes });
}
