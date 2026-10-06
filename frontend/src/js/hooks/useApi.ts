import { useCallback, useEffect, useState } from 'react';
import { apiGet, ApiError } from '../services/api';

export function useApi<T>(path: string | null) {
    const [data, setData] = useState<T | null>(null);
    const [loading, setLoading] = useState(Boolean(path));
    const [error, setError] = useState<string | null>(null);
    const [version, setVersion] = useState(0);

    useEffect(() => {
        if (!path) {
            setData(null);
            setLoading(false);
            return;
        }
        const controller = new AbortController();
        setLoading(true);
        setError(null);
        apiGet<T>(path, controller.signal)
            .then(setData)
            .catch((reason: unknown) => {
                if (controller.signal.aborted) return;
                setError(reason instanceof ApiError ? reason.message : 'No se pudo cargar la información.');
            })
            .finally(() => {
                if (!controller.signal.aborted) setLoading(false);
            });
        return () => controller.abort();
    }, [path, version]);

    const refresh = useCallback(() => setVersion((current) => current + 1), []);
    return { data, loading, error, refresh };
}
