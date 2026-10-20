import { useState } from 'react';
import { ArrowRight, CheckCircle2, ChevronRight, Target } from 'lucide-react';
import { Head, Link } from '../../navigation';
import { AppLayout } from '../../layouts/AppLayout';
import { EmptyState, ErrorState, LoadingState } from '../../components/States';
import { Pagination } from '../../components/Pagination';
import { ModuleFinalCard } from '../../components/ModuleFinalCard';
import { LearningProgress, progressValue } from '../../components/LearningProgress';
import { useApi } from '../../hooks/useApi';
import type { LearningModule, Paginated, Unit } from '../../types';

export default function Module({ moduleId }: { moduleId: number }) {
    const [page, setPage] = useState(1);
    const module = useApi<LearningModule & { level_name: string }>('/modules/' + moduleId);
    const units = useApi<Paginated<Unit>>(`/modules/${moduleId}/units?page=${page}`);

    return <AppLayout title={module.data?.title ?? 'Unidades del módulo'} subtitle="Elige una unidad para empezar o continuar tu aprendizaje.">
        <Head title={module.data?.title ?? 'Módulo'} />
        <div className="module-units-page">
        <nav aria-label="Migas de pan" className="learning-breadcrumb">
            <Link href="/aprender">Mi aprendizaje</Link>
            {module.data && <><ChevronRight size={14} aria-hidden="true" /><Link href={'/aprender/nivel/' + module.data.level_id}>{module.data.level_name}</Link><ChevronRight size={14} aria-hidden="true" /><span aria-current="page">{module.data.title}</span></>}
        </nav>
        {module.loading || units.loading ? <LoadingState /> : module.error || units.error ? <ErrorState message={module.error || units.error || ''} /> : <>
            {module.data?.description && <section className="module-introduction" aria-labelledby="module-objective-title">
                <span className="module-introduction-icon" aria-hidden="true"><Target size={24} strokeWidth={1.7} /></span>
                <div><h2 id="module-objective-title">Objetivo del módulo</h2>
                    <p>{module.data.description.replace(/^Objetivo del módulo:\s*/i, '')}</p></div>
            </section>}
            <section aria-labelledby="module-units-title">
                <div className="module-units-heading">
                    <h2 id="module-units-title">Unidades</h2>
                    <span>{units.data?.total ?? 0} {units.data?.total === 1 ? 'unidad' : 'unidades'}</span>
                </div>
                {!units.data?.data.length ? <EmptyState title="El contenido de este módulo está en preparación" description="Las unidades aparecerán aquí cuando el docente las publique." /> :
                    <ol className="student-unit-list" aria-label="Unidades del módulo">
                        {[...units.data.data].sort((a, b) => a.sort_order - b.sort_order).map((unit, index) => {
                            const percentage = progressValue(unit.percentage);
                            const completed = percentage === 100;
                            const number = unit.sort_order || (page - 1) * units.data!.per_page + index + 1;
                            const objective = unit.description.replace(/^Objetivo(?: de la unidad)?\s*:\s*/iu, '').trim();
                            return <li key={unit.id}>
                                <Link href={'/aprender/unidad/' + unit.id} className={`student-unit-row${completed ? ' is-completed' : percentage > 0 ? ' is-in-progress' : ''}`}>
                                    <div className="student-unit-heading">
                                        <span className="student-unit-number" aria-hidden="true">{String(number).padStart(2, '0')}</span>
                                        <div className="student-unit-copy">
                                            <span className="student-unit-label">Unidad {number}</span>
                                            <h3>{unit.title.replace(/^Unidad\s+\d+\s*[:.\-–—]?\s*/iu, '')}</h3>
                                        </div>
                                        <span className={`student-unit-status${completed ? ' is-completed' : ''}`}>
                                            {completed && <CheckCircle2 size={14} aria-hidden="true" />}
                                            {completed ? 'Completada' : percentage > 0 ? 'En curso' : 'Sin empezar'}
                                        </span>
                                    </div>
                                    {objective && <p className="student-unit-objective"><strong>Objetivo:</strong> {objective}</p>}
                                    <div className="student-unit-footer">
                                        <div className="student-unit-progress" role="group" aria-label={`Progreso de la unidad ${number}`}><LearningProgress value={percentage} label="Avance" /></div>
                                        <span className="student-unit-action">{completed ? 'Repasar' : percentage > 0 ? 'Continuar' : 'Abrir unidad'}<ArrowRight size={18} aria-hidden="true" /></span>
                                    </div>
                                </Link>
                            </li>;
                        })}
                    </ol>}
                <Pagination page={page} lastPage={units.data?.last_page ?? 1} onChange={setPage} />
            </section>
            {module.data?.final_evaluation && <ModuleFinalCard status={module.data.final_evaluation} />}
        </>}
        </div>
    </AppLayout>;
}
