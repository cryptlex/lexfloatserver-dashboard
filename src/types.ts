// LexFloatServer API types, transcribed from SERVER.md Appendix A (authoritative).
// Conventions: every `*At` is Unix epoch **seconds** (0 = unset), durations are seconds, -1 in a limit = unlimited.

// ---- Auth and errors ----

/** POST /api/login */
export type LoginRequest = { username: string; password: string };
/** JWT, HS256, expires after 1 hour. */
export type AccessTokenResponse = { accessToken: string };
/** The only claims in the access token. */
export type AccessTokenClaims = { username: string; exp: number };

/** Every non-2xx response. `code` is absent when the server didn't set one (typical for 401/404). */
export type ApiErrorBody = { code?: string; message: string };

// ---- Branding ----

/** GET /api/v4/branding. Unset fields are null. */
export type Branding = {
    appName: string;
    logoUrl: string | null;
    faviconUrl: string | null;
    hue: number;
};

// ---- Server ----

/** GET /api/v4/server/stats */
export type ServerStats = {
    version: string;
    productCount: number;
    totalFloatingClients: number;
    totalOfflineFloatingClients: number;
};

/** GET 🔒 /api/v4/server/config — read-only view of config.yml. */
export type ServerConfig = {
    server: {
        port: number;
        enableIpv6: boolean;
        /** '' unless overridden. */
        cryptlexHost: string;
        blockedIps: string[];
        allowedClockOffset: number;
        leaseDurationGracePeriod: number;
    };
    ssl: { enabled: boolean };
    proxy: { trustedProxies: string[] };
    auth: {
        /** The key itself is never exposed. */
        apiKeyConfigured: boolean;
        /** Usernames only. */
        admins: string[];
    };
    logging: {
        /** 0 Debug · 1 Information · 2 Warning · 3 Error */
        logLevel: number;
        console: { enabled: boolean; noColor: boolean };
        /** `maxSize` is in MB. */
        file: { enabled: boolean; directory: string; maxSize: number; maxBackups: number };
    };
    /** What a product with no overrides inherits. */
    productDefaults: ProductConfig;
};

// ---- Collections ----

/** Every collection response. `total` is after filtering, before paging. */
export type Page<T> = { items: T[]; total: number; limit: number; offset: number };

// ---- Domain ----

export type LicenseStatus = 'ok' | 'not_activated' | 'expired' | 'suspended' | 'grace_period_over';

/** Only 'per-instance' is special; any other value is passed through. '' when not activated. */
export type LeasingStrategy = 'per-instance' | (string & {});

export type Metadata = { key: string; value: string };
export type MeterAttribute = { name: string; uses: number };

/** GET 🔒 /api/v4/products → Page<Product> */
export type Product = {
    /** GUID. Use for routes and filters, render `displayName` instead. */
    id: string;
    /** Never empty. */
    displayName: string;
    /** false = declared in config.yml but not loaded. */
    enabled: boolean;
    /** 'disabled' iff enabled === false. */
    status: LicenseStatus | 'disabled';
    totalFloatingClients: number;
    totalOfflineFloatingClients: number;
    /** Seat limit; 0 when not activated. */
    allowedFloatingClients: number;
    /** 0 when not activated. */
    expiresAt: number;
    /** Non-zero = lost contact with Cryptlex. */
    serverSyncGracePeriodExpiresAt: number;
    /** null unless `?expand=license`. */
    license: ProductLicense | null;
    /** The product's own metadata; null unless `?expand=metadata`. */
    metadata: Metadata[] | null;
};

/** `?expand=license`. Sub-resources are null when not requested, [] when requested and empty. */
export type ProductLicense = ProductLicenseInfo & {
    meterAttributes: LicenseMeterAttribute[] | null;
    featureEntitlements: FeatureEntitlement[] | null;
    metadata: Metadata[] | null;
};

/** The plan/tier the licence sits on, not a product name. */
export type LicenseEntitlementSet = { name: string; displayName: string; tier: number };

/** GET 🔒 /api/v4/products/:productId/server/metadata */
export type ProductMetadata = { license: Metadata[]; product: Metadata[] };

/** GET /api/v4/products/:productId/server/stats */
export type ProductStats = {
    productId: string;
    totalFloatingClients: number;
    totalOfflineFloatingClients: number;
};

/** GET /api/v4/products/:productId/server/config (not auth-protected) */
export type ProductConfig = {
    leaseDuration: number;
    maxOfflineLeaseDuration: number;
    allowedOfflineFloatingClients: number;
};

/** Opaque LexActivator strings; '' before activation. */
export type ServerActivationMode = { initial: string; current: string };

export type ServerLicenseUser = { name: string; email: string; company: string };

export type ServerLicenseOrganization = {
    name: string;
    address: {
        addressLine1: string;
        addressLine2: string;
        city: string;
        state: string;
        country: string;
        postalCode: string;
    };
};

/** GET 🔒 /api/v4/products/:productId/server/license-info */
export type ProductLicenseInfo = {
    /** Full licence key — mask it in the UI. */
    key: string;
    allowedFloatingClients: number;
    createdAt: number;
    activatedAt: number;
    expiresAt: number;
    /** Non-zero = urgent. */
    serverSyncGracePeriodExpiresAt: number;
    activationMode: ServerActivationMode;
    user: ServerLicenseUser | null;
    organization: ServerLicenseOrganization | null;
    status: LicenseStatus;
    leasingStrategy: LeasingStrategy;
    /** Always null when status === 'not_activated'. */
    entitlementSet: LicenseEntitlementSet | null;
};

/** GET /api/v4/products/:productId/server/license-meter-attributes → LicenseMeterAttribute[] */
export type LicenseMeterAttribute = {
    id: string;
    name: string;
    /** -1 = unlimited. */
    allowedUses: number;
    totalUses: number;
    grossUses: number;
    /** true = totalUses is "in use now" and can fall; false = accumulated consumption. */
    floating: boolean;
};

/** GET /api/v4/products/:productId/server/feature-entitlements → FeatureEntitlement[] */
export type FeatureEntitlement = {
    featureName: string;
    /** Prefer this; fall back to featureName when ''. */
    featureDisplayName: string;
    /** Always a string, even for booleans and numbers. */
    value: string;
    baseValue: string;
    /** 0 = does not expire. */
    expiresAt: number;
};

/**
 * GET 🔒 /api/v4/floating-licenses → Page<FloatingLicense>
 * GET 🔒 /api/v4/floating-licenses/:id → FloatingLicense (metadata and meterAttributes always populated)
 */
export type FloatingLicense = {
    /** Row key and detail lookup, not for display. */
    id: string;
    productId: string;
    /** Render this, not productId. */
    productDisplayName: string;
    ip: string;
    os: string;
    osVersion: string;
    hostname: string;
    /** OS account name reported by the client; '' when not reported. Not an authenticated identity. */
    username: string;
    offline: boolean;
    /** LexFloatClient SDK version. */
    clientVersion: string;
    createdAt: number;
    /** Last renewal — the liveness signal. */
    updatedAt: number;
    expiresAt: number;
    /** null unless `?expand=metadata`. */
    metadata: Metadata[] | null;
    /** This lease's own uses; null unless `?expand=meterAttributes`. */
    meterAttributes: MeterAttribute[] | null;
};

// ---- Activation and deactivation ----

/** POST .../server/activate, .../server/offline-activation-request */
export type ServerLicenseActivationRequest = { licenseKey: string; metadata?: Metadata[] };

/** POST .../server/deactivate, .../server/offline-deactivate */
export type ServerLicenseDeactivationRequest = { licenseKey: string };

/** POST .../server/offline-activate */
export type ServerOfflineLicenseActivationRequest = {
    licenseKey: string;
    /** Full text of the .offres file from the portal. */
    offlineResponse: string;
};

/** Success envelope for activate / offline-activate / deactivate, e.g. `SERVER_LICENSE_ACTIVATED`. */
export type Result = { code: string; message: string };

/** POST .../server/offline-activation-request and .../server/offline-deactivate → offer as a .offreq download. */
export type ServerOfflineRequestResponse = { offlineRequest: string };
