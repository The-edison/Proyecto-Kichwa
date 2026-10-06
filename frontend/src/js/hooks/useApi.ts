import { useQuery } from '@tanstack/react-query';
import { apiGet, ApiError } from '../services/api';
export function useApi<T>(path: string | null) {
    const query = useQuery<T>({ queryKey: ['api', path], queryFn: ({ signal }) => apiGet<T>(path!, signal), enabled: Boolean(path) });
    return { data: query.data ?? null, loading: Boolean(path) && query.isPending,
        error: query.error ? query.error instanceof ApiError ? query.error.message : 'No se pudo cargar la información.' : null,
        refresh: query.refetch };
}
