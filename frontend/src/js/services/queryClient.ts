import { QueryClient } from '@tanstack/react-query';
export const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 300_000, gcTime: 900_000, retry: false, refetchOnWindowFocus: false } } });
