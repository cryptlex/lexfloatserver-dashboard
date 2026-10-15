import { jwtDecode } from 'jwt-decode';
import { m } from '@/paraglide/messages.js';

/** localStorage key for the access token. Kept the same as the old dashboard so existing sessions carry over. */
const ACCESS_TOKEN_KEY = 'accessToken';

export const getAccessToken = () => localStorage.getItem(ACCESS_TOKEN_KEY);
export const setAccessToken = (token: string) => localStorage.setItem(ACCESS_TOKEN_KEY, token);
export const removeAccessToken = () => localStorage.removeItem(ACCESS_TOKEN_KEY);

/** Every non-2xx response is `{ code?, message }`; `code` is absent for most 401/404s. */
export class ApiError extends Error {
    constructor(
        readonly status: number,
        readonly code: string | undefined,
        message: string | undefined
    ) {
        super(message ?? m['common.error.requestFailed']({ status }));
    }
}

/**
 * Fetch wrapper for the LexFloatServer API.
 * The dashboard is served by LexFloatServer itself, so paths are same-origin (e.g. `/api/v4/server/stats`).
 */
export async function apiFetch<TResponse>(path: string, init: RequestInit = {}): Promise<TResponse> {
    const headers = new Headers(init.headers);
    headers.set('Content-Type', 'application/json');
    const token = getAccessToken();
    if (token) {
        headers.set('Authorization', `Bearer ${token}`);
    }

    const response = await fetch(path, { ...init, headers });
    const body = response.status === 204 ? null : await response.json().catch(() => null);
    // The token is missing, expired or was invalidated by a server restart: drop it and start over at login.
    // A full page load also clears any cached data from the old session.
    if (response.status === 401 && window.location.pathname !== '/login') {
        removeAccessToken();
        window.location.replace('/login');
    }
    if (!response.ok) {
        throw new ApiError(response.status, body?.code, body?.message);
    }
    return body;
}

/** True when a stored access token exists and hasn't expired. */
export function isLoggedIn() {
    try {
        const { exp } = jwtDecode(getAccessToken() ?? '');
        return exp === undefined || exp * 1000 > Date.now();
    } catch {
        return false;
    }
}
