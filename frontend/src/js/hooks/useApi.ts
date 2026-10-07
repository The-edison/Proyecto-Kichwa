import { useQuery } from '@tanstack/react-query';
import { apiGet, ApiError } from '../services/api';
export function useApi<T>(path: string | null) {
    const catalog = Boolean(path && /^\/(levels|modules|units|evaluations)(\/|\?|$)/.test(path));
    const refreshOnVisit = catalog || Boolean(path && /^\/admin\/students(\?|$)/.test(path));
    const query = useQuery<T>({ queryKey: ['api', path], queryFn: ({ signal }) => apiGet<T>(path!, signal), enabled: Boolean(path),
        refetchOnMount: refreshOnVisit ? 'always' : true, refetchOnWindowFocus: refreshOnVisit ? 'always' : true });
    return { data: query.data ?? null, loading: Boolean(path) && query.isPending,
        error: query.error ? query.error instanceof ApiError ? query.error.message : 'No se pudo cargar la información.' : null,
        refresh: query.refetch };
}
