export function CardAvatar({ name }: { name: string }) {
    return (
        <span
            aria-hidden
            className="flex size-input shrink-0 items-center justify-center rounded-md border bg-surface-secondary font-bold text-foreground/60"
        >
            {name.charAt(0).toUpperCase()}
        </span>
    );
}
