import { useState } from 'react';
import { Head, Link } from '../../navigation';
import { AppLayout } from '../../layouts/AppLayout';
import { EmptyState, ErrorState, LoadingState } from '../../components/States';
import { Pagination } from '../../components/Pagination';
import { useApi } from '../../hooks/useApi';
import type { LearningModule, Paginated, Evaluation } from '../../types';
export default function Level({ level }: { level: { id: number; name: string; code: string } }) {
    const [page, setPage] = useState(1);
    const modules = useApi<Paginated<LearningModule>>(`/levels/${level.id}/modules?page=${page}`);
    const [diagnosticPage,setDiagnosticPage]=useState(1);
    const diagnostic=useApi<Paginated<Evaluation>>(`/levels/${level.id}/evaluations?type=diagnostica&page=${diagnosticPage}`);
    return <AppLayout title={'Nivel ' + level.name} subtitle="Escoge un módulo publicado."><Head title={level.name} />
        <nav aria-label="Migas de pan" className="mb-6 flex gap-3"><Link href="/aprender">Niveles</Link><span>› {level.name}</span></nav>
        {modules.loading ? <LoadingState /> : modules.error ? <ErrorState message={modules.error} /> : !modules.data?.data.length ? <EmptyState title="Todavía no hay módulos publicados" description="El administrador está preparando el contenido de este nivel." /> :
            <div className="grid gap-5 md:grid-cols-2">{modules.data.data.map(m => <Link key={m.id} className="glass-panel card-hover space-y-3 p-6" href={'/aprender/modulo/' + m.id}>
                <h2 className="font-serif text-2xl">{m.title}</h2><p className="text-muted">{m.description}</p><p className="font-bold text-forest">{m.percentage ?? 0}% completado</p><p className="text-forest">Ver unidades →</p>
            </Link>)}</div>}
        <Pagination page={page} lastPage={modules.data?.last_page ?? 1} onChange={setPage} />
        {!!diagnostic.data?.data.length && <section className="mt-7 space-y-3"><h2 className="font-serif text-2xl">Diagnóstico general</h2>{diagnostic.data.data.map(e=><Link key={e.id} className="glass-panel card-hover block p-5" href={'/aprender/evaluacion/'+e.id}>{e.title} →</Link>)}<Pagination page={diagnosticPage} lastPage={diagnostic.data.last_page} onChange={setDiagnosticPage}/></section>}
    </AppLayout>;
}
