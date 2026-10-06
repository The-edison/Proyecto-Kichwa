import { useState } from 'react';
import { ArrowRight, BookOpen, Check } from 'lucide-react';
import { Head, Link } from '../../navigation';
import { AppLayout } from '../../layouts/AppLayout';
import { EmptyState, ErrorState, LoadingState } from '../../components/States';
import { Pagination } from '../../components/Pagination';
import { useApi } from '../../hooks/useApi';
import type { LearningModule, Paginated, Evaluation } from '../../types';

export default function Level({ level }: { level: { id: number; name: string; code: string } }) {
    const [page, setPage] = useState(1);
    const [diagnosticPage, setDiagnosticPage] = useState(1);
    const modules = useApi<Paginated<LearningModule>>(`/levels/${level.id}/modules?page=${page}`);
    const diagnostic = useApi<Paginated<Evaluation>>(`/levels/${level.id}/evaluations?type=diagnostica&page=${diagnosticPage}`);

    return <AppLayout title={'Nivel ' + level.name} subtitle="Tu recorrido de aprendizaje, módulo a módulo.">
        <Head title={level.name} />
        <nav aria-label="Migas de pan" className="mb-7 flex flex-wrap items-center gap-3 text-sm">
            <Link href="/aprender" className="font-semibold text-forest">Mi aprendizaje</Link><span aria-hidden="true">/</span><span aria-current="page">{level.name}</span>
        </nav>
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div><p className="eyebrow mb-2">Tu curso</p><h2 className="font-serif text-3xl">Módulos de aprendizaje</h2></div>
            {modules.data && <p className="text-sm text-muted">{modules.data.total} {modules.data.total === 1 ? 'módulo disponible' : 'módulos disponibles'}</p>}
        </div>
        {modules.loading ? <LoadingState /> : modules.error ? <ErrorState message={modules.error} /> : !modules.data?.data.length ?
            <EmptyState title="Todavía no hay módulos publicados" description="El administrador está preparando el contenido de este nivel." /> :
            <ol aria-label="Módulos del nivel" className="glass-panel divide-y divide-emerald-100 overflow-hidden">
                {modules.data.data.map((module, index) => {
                    const percentage = Math.min(100, Math.max(0, module.percentage ?? 0));
                    return <li key={module.id}>
                        <Link href={'/aprender/modulo/' + module.id} className="group flex min-h-28 items-start gap-4 p-5 transition-colors hover:bg-emerald-50/80 focus-visible:bg-emerald-50 sm:items-center sm:gap-5 sm:p-6">
                            <span aria-hidden="true" className="mt-1 grid h-11 w-11 shrink-0 place-items-center rounded-full bg-forest text-lg font-bold text-white sm:mt-0">{percentage === 100 ? <Check size={20} /> : (page - 1) * 20 + index + 1}</span>
                            <div className="min-w-0 flex-1">
                                <h3 className="break-words font-serif text-xl text-ink sm:text-2xl">{module.title}</h3>
                                <p className="mt-2 line-clamp-2 break-words text-sm leading-6 text-muted">{module.description}</p>
                                <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm"><span className="inline-flex items-center gap-2 font-semibold text-forest"><BookOpen size={16} aria-hidden="true" />Ver contenidos</span><span className="text-muted">{percentage}% completado</span></div>
                                <div className="progress-track mt-3 max-w-72" role="progressbar" aria-label={'Progreso de ' + module.title} aria-valuenow={percentage} aria-valuemin={0} aria-valuemax={100}><div className="progress-fill" style={{ width: percentage + '%' }} /></div>
                            </div>
                            <ArrowRight size={21} aria-hidden="true" className="mt-2 shrink-0 text-forest transition-transform group-hover:translate-x-1 sm:mt-0" />
                        </Link>
                    </li>;
                })}
            </ol>}
        <Pagination page={page} lastPage={modules.data?.last_page ?? 1} onChange={setPage} />
        {!!diagnostic.data?.data.length && <section className="mt-9 space-y-3"><h2 className="font-serif text-2xl">Diagnóstico general</h2>{diagnostic.data.data.map(e => <Link key={e.id} className="glass-panel card-hover block p-5" href={'/aprender/evaluacion/' + e.id}>{e.title} →</Link>)}<Pagination page={diagnosticPage} lastPage={diagnostic.data.last_page} onChange={setDiagnosticPage} /></section>}
    </AppLayout>;
}
