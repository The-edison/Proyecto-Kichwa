import { useState } from 'react';
import { ArrowRight, BookOpen, CheckCircle2, Circle } from 'lucide-react';
import { Head, Link } from '../../navigation';
import { AppLayout } from '../../layouts/AppLayout';
import { EmptyState, ErrorState, LoadingState } from '../../components/States';
import { Pagination } from '../../components/Pagination';
import { useApi } from '../../hooks/useApi';
import type { LearningModule, ModuleContent, Paginated, Unit } from '../../types';

export default function Module({ moduleId }: { moduleId: number }) {
    const [page, setPage] = useState(1);
    const [unitPage, setUnitPage] = useState(1);
    const module = useApi<LearningModule & { level_name: string }>('/modules/' + moduleId);
    const contents = useApi<Paginated<ModuleContent>>(`/modules/${moduleId}/contents?page=${page}`);
    const units = useApi<Paginated<Unit>>(`/modules/${moduleId}/units?page=${unitPage}`);
    const groups = new Map<number, { title: string; objective: string; order: number; topics: ModuleContent[] }>();
    for (const unit of units.data?.data ?? []) groups.set(unit.id, { title: unit.title, objective: unit.description, order: unit.sort_order, topics: [] });
    for (const topic of contents.data?.data ?? []) {
        const group = groups.get(topic.unit_id) ?? { title: topic.unit_title, objective: topic.unit_objective, order: topic.unit_order, topics: [] };
        group.topics.push(topic); groups.set(topic.unit_id, group);
    }

    return <AppLayout title={module.data?.title ?? 'Contenidos del módulo'} subtitle="Explora los temas de cada unidad y continúa donde te quedaste.">
        <Head title={module.data?.title ?? 'Módulo'} />
        <nav aria-label="Migas de pan" className="mb-7 flex flex-wrap items-center gap-3 text-sm">
            <Link href="/aprender" className="font-semibold text-forest">Mi aprendizaje</Link>
            {module.data && <><span aria-hidden="true">/</span><Link href={'/aprender/nivel/' + module.data.level_id} className="font-semibold text-forest">{module.data.level_name}</Link><span aria-hidden="true">/</span><span aria-current="page" className="break-words">{module.data.title}</span></>}
        </nav>
        {module.data?.description && <div className="glass-panel mb-7 border-l-4 border-l-forest p-5 sm:p-6"><p className="eyebrow mb-2">Objetivo del módulo</p><p className="break-words leading-7 text-muted">{module.data.description.replace(/^Objetivo del módulo:\s*/i, '')}</p></div>}
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3"><h2 className="font-serif text-3xl">Contenido del módulo</h2>{contents.data && <span className="text-sm text-muted">{contents.data.total} {contents.data.total === 1 ? 'tema disponible' : 'temas disponibles'}</span>}</div>
        {module.loading || contents.loading || units.loading ? <LoadingState /> : module.error || contents.error || units.error ? <ErrorState message={module.error || contents.error || units.error || ''} /> :
            !groups.size ? <EmptyState title="El contenido de este módulo está en preparación" description="Las unidades aparecerán aquí cuando el docente las publique." /> :
                <div className="space-y-6">{[...groups.entries()].sort((a, b) => a[1].order - b[1].order).map(([unitId, group]) => <section key={unitId} className="glass-panel overflow-hidden" aria-labelledby={'unit-' + unitId}>
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-emerald-100 bg-emerald-50/70 px-5 py-4 sm:px-6">
                        <div className="min-w-0"><p className="mb-1 text-xs font-bold uppercase tracking-widest text-forest">Unidad {group.order}</p><h3 id={'unit-' + unitId} className="break-words font-serif text-xl sm:text-2xl">{group.title.replace(/^Unidad\s+\d+\s*/iu, '')}</h3></div>
                        <Link href={'/aprender/unidad/' + unitId} className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-forest">Ver unidad <ArrowRight size={16} aria-hidden="true" /></Link>
                    </div>
                    {group.objective && <div className="px-5 py-4 sm:px-6"><p className="eyebrow mb-2">Objetivo de la unidad</p><p className="whitespace-pre-line break-words text-sm leading-7 text-muted">{group.objective}</p></div>}
                    <ol aria-label={'Temas de ' + group.title} className="divide-y divide-emerald-100">
                        {group.topics.map(topic => {
                            const percentage = Math.min(100, Math.max(0, topic.percentage ?? 0));
                            const completed = topic.exercise_count > 0 && percentage === 100;
                            return <li key={topic.id}><Link href={`/aprender/unidad/${unitId}?tema=${topic.id}`} className="group flex min-h-24 items-center gap-4 px-5 py-5 transition-colors hover:bg-emerald-50/80 focus-visible:bg-emerald-50 sm:px-6">
                                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-100 text-forest" aria-hidden="true"><BookOpen size={20} /></span>
                                <div className="min-w-0 flex-1"><h4 className="break-words text-base font-bold text-ink sm:text-lg">{topic.title}</h4><div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted"><span>Lectura{topic.exercise_count > 0 && ` · ${topic.exercise_count} ${topic.exercise_count === 1 ? 'ejercicio' : 'ejercicios'}`}</span><span className="inline-flex items-center gap-1.5">{completed ? <CheckCircle2 size={15} className="text-forest" aria-hidden="true" /> : <Circle size={13} aria-hidden="true" />}{completed ? 'Completado' : percentage > 0 ? percentage + '% completado' : 'Por explorar'}</span></div></div>
                                <ArrowRight size={20} aria-hidden="true" className="shrink-0 text-forest transition-transform group-hover:translate-x-1" />
                            </Link></li>;
                        })}
                    </ol>
                </section>)}</div>}
        <Pagination page={page} lastPage={contents.data?.last_page ?? 1} onChange={setPage} />
        {(units.data?.last_page ?? 1) > 1 && <div className="mt-5"><p className="text-sm text-muted">Páginas de unidades</p><Pagination page={unitPage} lastPage={units.data!.last_page} onChange={setUnitPage} /></div>}
    </AppLayout>;
}
