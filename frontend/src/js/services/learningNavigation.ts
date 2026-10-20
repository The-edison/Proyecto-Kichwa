import { apiGet } from './api';
import { queryClient } from './queryClient';
import type { Unit } from '../types';

export const loadLearningModule = () => import('../pages/Student/Module');
export const loadLearningUnit = () => import('../pages/Student/Unit');

function destination(href: string) {
    return /^\/aprender\/(modulo|unidad)\/([1-9]\d*)$/.exec(href);
}

export function preloadLearningCode(href: string) {
    const match = destination(href);
    if (!match) return;
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
    if (connection?.saveData || ['slow-2g', '2g'].includes(connection?.effectiveType ?? '')) return;
    void (match[1] === 'modulo' ? loadLearningModule() : loadLearningUnit()).catch(() => {});
}

export function prefetchLearningData(href: string) {
    const match = destination(href);
    if (!match) return;
    const [, kind, id] = match;
    const prefetch = (path: string) => queryClient.prefetchQuery({
        queryKey: ['api', path], queryFn: ({ signal }) => apiGet(path, signal),
    });
    if (kind === 'modulo') {
        void prefetch(`/modules/${id}`);
        void prefetch(`/modules/${id}/units?page=1`);
        return;
    }
    const path = `/units/${id}`;
    void queryClient.fetchQuery<Unit>({ queryKey: ['api', path], queryFn: ({ signal }) => apiGet<Unit>(path, signal) })
        .then(unit => {
            if (unit.config?.learning_mode === 'guided') return prefetch(`/units/${id}/guided`);
        }).catch(() => {});
}
