import { useState } from 'react';
import { Head, Link } from '../../navigation';
import { AppLayout } from '../../layouts/AppLayout';
import { EmptyState, ErrorState, LoadingState } from '../../components/States';
import { Pagination } from '../../components/Pagination';
import { useApi } from '../../hooks/useApi';
import type { LearningModule, Unit, Paginated } from '../../types';
export default function Module({ moduleId }: { moduleId: number }) {
    const [page, setPage] = useState(1);
    const module = useApi<LearningModule & { level_name: string }>('/modules/' + moduleId);
    const units = useApi<Paginated<Unit>>(`/modules/${moduleId}/units?page=${page}`);
    return <AppLayout title={module.data?.title ?? 'Módulo'} subtitle="Escoge una unidad publicada."><Head title="Módulo" />
        <nav aria-label="Migas de pan" className="mb-6 flex flex-wrap gap-3"><Link href="/aprender">Niveles</Link><span>›</span><Link href={'/aprender/nivel/' + module.data?.level_id}>{module.data?.level_name ?? 'Nivel'}</Link><span>› {module.data?.title}</span></nav>
        {module.loading || units.loading ? <LoadingState /> : module.error || units.error ? <ErrorState message={module.error || units.error || ''} /> :
            !units.data?.data.length ? <EmptyState title="Todavía no hay unidades publicadas" description="Vuelve pronto para continuar tu aprendizaje." /> :
                <div className="grid gap-5 md:grid-cols-2">{units.data.data.map(u => <Link key={u.id} className="glass-panel card-hover space-y-3 p-6" href={'/aprender/unidad/' + u.id}>
                    <h2 className="font-serif text-2xl">{u.title}</h2><p className="text-muted">{u.description}</p><p className="font-bold text-forest">{u.percentage ?? 0}% completado</p><p className="text-forest">Ver temas →</p>
                </Link>)}</div>}
        <Pagination page={page} lastPage={units.data?.last_page ?? 1} onChange={setPage} />
    </AppLayout>;
}
