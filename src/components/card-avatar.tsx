import type React from 'react';

// Same as web-portals-react `lib/components/card-avatar.tsx`.

export function CardAvatar({
    name,
    iconUrl,
    Icon,
}: {
    name: string;
    iconUrl?: string;
    Icon?: React.ComponentType<{ className: string }>;
}) {
    return (
        <div
            className={`size-input shrink-0 rounded-md ${iconUrl ? '' : 'border bg-surface-secondary'} flex items-center justify-center`}
        >
            {iconUrl ? (
                <img src={iconUrl} alt={name} className="w-full h-full object-cover rounded-md" />
            ) : Icon ? (
                <Icon className="size-icon" />
            ) : (
                <div className="py-1.5 px-3 font-bold text-foreground/60">{name.charAt(0).toUpperCase()}</div>
            )}
        </div>
    );
}
