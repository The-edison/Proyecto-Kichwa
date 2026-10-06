export class ApiError extends Error {
    constructor(
        message: string,
        public readonly status: number,
        public readonly errors: Record<string, string[]> = {},
    ) {
        super(message);
        this.name = 'ApiError';
    }
}

export const apiBaseUrl = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');

function csrfToken(): string | null {
    const cookie = document.cookie.split('; ').find((part) => part.startsWith('XSRF-TOKEN='));
    return cookie ? decodeURIComponent(cookie.substring('XSRF-TOKEN='.length)) : null;
}

interface ApiOptions {
    method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
    data?: unknown;
    signal?: AbortSignal;
}

export async function apiRequest<T>(path: string, options: ApiOptions = {}): Promise<T> {
    const method = options.method ?? 'GET';
    if (method !== 'GET' && !csrfToken()) {
        const csrfResponse = await fetch(`${apiBaseUrl}/sanctum/csrf-cookie`, { credentials: 'include' });
        if (!csrfResponse.ok) throw new ApiError('No se pudo iniciar la sesión segura.', csrfResponse.status);
    }

    const headers: Record<string, string> = {
        Accept: 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
    };
    if (options.data !== undefined && !(options.data instanceof FormData)) headers['Content-Type'] = 'application/json';
    if (method !== 'GET' && csrfToken()) headers['X-XSRF-TOKEN'] = csrfToken()!;

    const response = await fetch(`${apiBaseUrl}/api${path}`, {
        method,
        credentials: 'include',
        headers,
        body: options.data === undefined ? undefined : options.data instanceof FormData ? options.data : JSON.stringify(options.data),
        signal: options.signal,
    });

    if (response.status === 204) return undefined as T;
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
        throw new ApiError(
            payload?.message ?? 'No se pudo completar la solicitud.',
            response.status,
            payload?.errors ?? {},
        );
    }
    return payload as T;
}

export const apiGet = <T,>(path: string, signal?: AbortSignal) =>
    apiRequest<T>(path, { signal });
export const apiPost = <T,>(path: string, data: unknown) =>
    apiRequest<T>(path, { method: 'POST', data });
export const apiPatch = <T,>(path: string, data: unknown) =>
    apiRequest<T>(path, { method: 'PATCH', data });
export const apiDelete = (path: string) =>
    apiRequest<void>(path, { method: 'DELETE' });
