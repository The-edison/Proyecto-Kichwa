import { useState } from 'react';
import { ArrowRight, BookOpen, CheckCircle2, ChevronRight, Circle, ClipboardCheck, Layers, ListChecks, LockKeyhole, Star, Target } from 'lucide-react';
import { Head, Link } from '../../navigation';
import { AppLayout } from '../../layouts/AppLayout';
import { EmptyState, ErrorState, LoadingState } from '../../components/States';
import { Pagination } from '../../components/Pagination';
import { LearningProgress, progressValue } from '../../components/LearningProgress';
import { useApi } from '../../hooks/useApi';
import type { LearningModule, ModuleContent, Paginated, Unit } from '../../types';

export default function Module({ moduleId }: { moduleId: number }) {
    const [page, setPage] = useState(1);
    const [unitPage, setUnitPage] = useState(1);
    const module = useApi<LearningModule & { level_name: string }>('/modules/' + moduleId);
    const contents = useApi<Paginated<ModuleContent>>(`/modules/${moduleId}/contents?page=${page}`);
    const units = useApi<Paginated<Unit>>(`/modules/${moduleId}/units?page=${unitPage}`);
    const groups = new Map<number, { title: string; objective: string; order: number; percentage?: number; topics: ModuleContent[] }>();
    for (const unit of units.data?.data ?? []) groups.set(unit.id, { title: unit.title, objective: unit.description, order: unit.sort_order, percentage: unit.percentage, topics: [] });
    for (const topic of contents.data?.data ?? []) {
        const group = groups.get(topic.unit_id) ?? { title: topic.unit_title, objective: topic.unit_objective, order: topic.unit_order, topics: [] };
        group.topics.push(topic); groups.set(topic.unit_id, group);
    }

    return <AppLayout title={module.data?.title ?? 'Contenidos del módulo'} subtitle="Explora los temas de cada unidad y continúa donde te quedaste.">
        <Head title={module.data?.title ?? 'Módulo'} />
        <nav aria-label="Migas de pan" className="learning-breadcrumb">
            <Link href="/aprender">Mi aprendizaje</Link>
            {module.data && <><ChevronRight size={14} aria-hidden="true" /><Link href={'/aprender/nivel/' + module.data.level_id}>{module.data.level_name}</Link><ChevronRight size={14} aria-hidden="true" /><span aria-current="page">{module.data.title}</span></>}
        </nav>
        {module.loading || contents.loading || units.loading ? <LoadingState /> : module.error || contents.error || units.error ? <ErrorState message={module.error || contents.error || units.error || ''} /> : <>
            <section className="learning-overview module-overview glass-panel" aria-labelledby="module-objective-title"><div className="learning-objective-icon" aria-hidden="true"><Target size={32} strokeWidth={1.6} /></div><div className="learning-overview-copy"><span className="eyebrow">APRENDE CON UN PROPÓSITO</span><h2 id="module-objective-title">Tu objetivo en este módulo</h2><p>{module.data?.description ? module.data.description.replace(/^Objetivo del módulo:\s*/i, '') : 'Explora las unidades y practica cada tema para seguir construyendo tu aprendizaje.'}</p></div><div className="module-overview-counts"><span><Layers size={20} aria-hidden="true" /><strong>{units.data?.total ?? '—'}</strong><small>{units.data?.total === 1 ? 'unidad' : 'unidades'}</small></span><span><BookOpen size={20} aria-hidden="true" /><strong>{contents.data?.total ?? '—'}</strong><small>{contents.data?.total === 1 ? 'tema' : 'temas'}</small></span></div></section>
            <div className="section-heading learning-section-heading"><div><span className="eyebrow">PASO A PASO</span><h2>Tu recorrido por las unidades</h2><p>Descubre cada tema y pon en práctica lo aprendido.</p></div><span className="badge neutral"><Layers size={14} aria-hidden="true" />{units.data?.total ?? '—'} {units.data?.total === 1 ? 'unidad' : 'unidades'}</span></div>
            {!groups.size ? <EmptyState title="El contenido de este módulo está en preparación" description="Las unidades aparecerán aquí cuando el docente las publique." /> : <div className="learning-unit-grid">{[...groups.entries()].sort((a, b) => a[1].order - b[1].order).map(([unitId, group]) => <section key={unitId} className="learning-unit-card glass-panel" aria-labelledby={'unit-' + unitId}>
                <header className="learning-unit-header"><span className="learning-unit-icon" aria-hidden="true"><Layers size={24} strokeWidth={1.6} /></span><div><span className="eyebrow">UNIDAD {group.order}</span><h3 id={'unit-' + unitId}>{group.title.replace(/^Unidad\s+\d+\s*/iu, '')}</h3></div>{group.percentage !== undefined && <span className={`badge ${progressValue(group.percentage) === 100 ? 'success' : 'neutral'}`}>{progressValue(group.percentage) === 100 ? '✓ Completada' : progressValue(group.percentage) > 0 ? 'En curso' : 'Por explorar'}</span>}</header>
                {group.objective && <div className="learning-unit-objective"><span><Target size={14} aria-hidden="true" /> LO QUE APRENDERÁS</span><p>{group.objective}</p></div>}
                <div className="learning-unit-topics"><span className="learning-topics-caption">TEMAS Y ACTIVIDADES</span><ol aria-label={'Temas de ' + group.title}>
                    {group.topics.map(topic => {
                        const percentage = progressValue(topic.percentage);
                        const completed = (topic.mastery?.stars ?? 0) > 0 || !topic.evaluation_final && topic.exercise_count > 0 && percentage === 100;
                        const status = completed ? topic.mastery ? 'Dominado' : 'Completado' : topic.evaluation_locked ? 'Prueba pendiente de desbloquear' : percentage > 0 ? `${Math.round(percentage)}% completado` : 'Por explorar';
                        const Icon = topic.sequence_mode ? ListChecks : topic.evaluation_final ? ClipboardCheck : BookOpen;
                        return <li key={topic.id}><Link href={!topic.sequence_mode && topic.evaluation_final && !topic.evaluation_locked && topic.evaluation_id ? `/aprender/evaluacion/${topic.evaluation_id}` : `/aprender/unidad/${unitId}?tema=${topic.id}`} className={`learning-topic-link ${completed ? 'is-completed' : ''}`}>
                            <span className="learning-topic-icon" aria-hidden="true"><Icon size={20} /></span><div className="learning-topic-copy"><h4>{topic.title}</h4><div className="learning-topic-meta"><span>{topic.sequence_mode ? 'Secuencia' : topic.evaluation_final ? 'Desafío' : 'Lectura'}</span>{topic.exercise_count > 0 && <span>{topic.exercise_count} {topic.exercise_count === 1 ? 'ejercicio' : 'ejercicios'}</span>}{(topic.evaluation_question_count ?? 0) > 0 && <span>{topic.evaluation_question_count} preguntas{topic.evaluation_final ? '' : ' de evaluación'}</span>}</div><div className="learning-topic-status"><span className={`badge ${completed ? 'success' : 'neutral'}`}>{completed ? <CheckCircle2 size={14} aria-hidden="true" /> : topic.evaluation_locked ? <LockKeyhole size={13} aria-hidden="true" /> : <Circle size={12} aria-hidden="true" />}{status}</span>{completed && topic.mastery && <span className="learning-mastery-stars" role="img" aria-label={`${topic.mastery.stars} estrellas de dominio`}>{Array.from({ length: topic.mastery.stars }, (_, index) => <Star size={14} key={index} fill="currentColor" aria-hidden="true" />)}</span>}</div>{!completed && topic.evaluation_locked && <p className="learning-unlock-note">{topic.sequence_mode ? 'Acertar las siete actividades desbloquea la prueba.' : 'Completa las tres lecciones para desbloquear.'}</p>}</div><ArrowRight size={18} className="learning-topic-arrow" aria-hidden="true" />
                        </Link></li>;
                    })}
                </ol>{!group.topics.length && <p className="learning-unit-note">Abre la unidad para explorar su recorrido. También puedes consultar las siguientes páginas de temas.</p>}</div>
                <footer className="learning-unit-footer">{group.percentage !== undefined && <LearningProgress value={group.percentage} label="Progreso de la unidad" />}<Link href={'/aprender/unidad/' + unitId} className="secondary-button">Ver unidad <ArrowRight size={16} aria-hidden="true" /></Link></footer>
            </section>)}</div>}
        </>}
        <Pagination page={page} lastPage={contents.data?.last_page ?? 1} onChange={setPage} />
        {(units.data?.last_page ?? 1) > 1 && <div className="mt-5"><p className="text-sm text-muted">Páginas de unidades</p><Pagination page={unitPage} lastPage={units.data!.last_page} onChange={setUnitPage} /></div>}
    </AppLayout>;
}
