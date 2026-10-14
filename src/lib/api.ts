import { jwtDecode } from 'jwt-decode';

/** Every non-2xx response is `{ code?, message }`; `code` is absent for most 401/404s. */
export class ApiError extends Error {
    constructor(
        readonly status: number,
        readonly code: string | undefined,
        message: string | undefined
    ) {
        super(message ?? `Request failed with status ${status}`);
    }
}

/**
 * Fetch wrapper for the LexFloatServer API.
 * The dashboard is served by LexFloatServer itself, so paths are same-origin (e.g. `/api/v4/server/stats`).
 */
export async function apiFetch<TResponse>(path: string, init: RequestInit = {}): Promise<TResponse> {
    const headers = new Headers(init.headers);
    headers.set('Content-Type', 'application/json');
    const token = localStorage.getItem('accessToken');
    if (token) {
        headers.set('Authorization', `Bearer ${token}`);
    }

    const response = await fetch(path, { ...init, headers });
    const body = response.status === 204 ? null : await response.json().catch(() => null);
    if (!response.ok) {
        throw new ApiError(response.status, body?.code, body?.message);
    }
    return body;
}

/** True when a stored access token exists and hasn't expired. */
export function isLoggedIn() {
    try {
        const { exp } = jwtDecode(localStorage.getItem('accessToken') ?? '');
        return exp === undefined || exp * 1000 > Date.now();
    } catch {
        return false;
    }
}
