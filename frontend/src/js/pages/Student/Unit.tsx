import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Head, Link } from '../../navigation';
import { AppLayout } from '../../layouts/AppLayout';
import { UnitSequence } from '../../components/UnitSequence';
import { GuidedUnit } from '../../components/GuidedUnit';
import { ExerciseCard } from '../../components/ExerciseCard';
import { EmptyState, ErrorState, LoadingState } from '../../components/States';
import { Pagination } from '../../components/Pagination';
import { useApi } from '../../hooks/useApi';
import { queryClient } from '../../services/queryClient';
import type { Content, Exercise, Unit as UnitData, Paginated, Evaluation, Mastery } from '../../types';
export default function Unit({ unitId }: { unitId: number }) {
    const [params, setParams] = useSearchParams(); const topicId = Number(params.get('tema')) || null;
    const [page, setPage] = useState(1), [exercisePage, setExercisePage] = useState(1), [evaluationPage, setEvaluationPage] = useState(1);
    const unit = useApi<UnitData & { level_id: number; level_name: string; module_name: string }>('/units/' + unitId);
    const contents = useApi<Paginated<Content>>(`/units/${unitId}/contents?page=${page}`);
    const exercises = useApi<Paginated<Exercise>>(`/units/${unitId}/exercises?page=${exercisePage}${topicId ? '&topic_id=' + topicId : ''}`);
    const evaluations = useApi<Paginated<Evaluation>>(unit.data ? `/levels/${unit.data.level_id}/evaluations?unit_id=${unitId}&page=${evaluationPage}` : null);
    const selectedTopic = useApi<Content>(topicId ? `/units/${unitId}/topics/${topicId}` : null);
    const mastery = useApi<Mastery>('/mastery');
    const topic = selectedTopic.data;
    useEffect(() => { setExercisePage(1); setEvaluationPage(1); }, [unitId, topicId]);
    if (unit.data?.config?.learning_mode === 'guided') return <GuidedUnit key={unitId} unit={unit.data}/>;
    if (unit.data?.config?.learning_mode === 'sequence') return <UnitSequence key={unitId} unit={unit.data}/>;
    return <AppLayout title={unit.data?.title ?? 'Tu unidad'} subtitle={`Lee, escucha y practica. Avance de práctica: ${unit.data?.percentage ?? 0}%.`}><Head title="Unidad" />
        <nav aria-label="Migas de pan" className="mb-6 flex flex-wrap gap-3"><Link href="/aprender">Niveles</Link><span>›</span><Link href={'/aprender/nivel/' + unit.data?.level_id}>{unit.data?.level_name ?? 'Nivel'}</Link><span>›</span><Link href={'/aprender/modulo/' + unit.data?.module_id}>{unit.data?.module_name ?? 'Módulo'}</Link><span>›</span><Link href={'/aprender/unidad/' + unitId}>{unit.data?.title ?? 'Unidad'}</Link>{topic && <span>› {topic.title}</span>}</nav>
        {contents.loading || unit.loading ? <LoadingState /> : contents.error || unit.error ? <ErrorState message={contents.error || unit.error || ''} /> : <div className="space-y-6">
            {mastery.data?.completed_units.includes(unitId) && <p className="glass-panel p-5" role="status">Unidad completada · Mis primeras palabras en Kichwa</p>}{unit.data?.description && <section className="glass-panel border-l-4 border-l-forest p-5 sm:p-6"><h2 className="eyebrow mb-2">Objetivo de la unidad</h2><p className="whitespace-pre-line break-words leading-7 text-muted">{unit.data.description}</p></section>}
            {!topicId ? <>{contents.data?.data.length ? <><h2 className="font-serif text-2xl">Temas</h2><div className="grid gap-4 md:grid-cols-2">{contents.data.data.map(c => <Link href={`/aprender/unidad/${unitId}?tema=${c.id}`} onClick={()=> typeof c.body === 'string' && queryClient.setQueryData(['api',`/units/${unitId}/topics/${c.id}`],c)} className="glass-panel card-hover p-6" key={c.id}><h3 className="font-serif text-2xl">{c.title}</h3>{mastery.data?.lessons.filter(l=>l.topic_id===c.id).map(l=><p key={l.topic_id} className="mt-2">{'★'.repeat(l.stars)} Mejor resultado: {l.best_score}% · {l.attempt_count} intentos</p>)}{!c.lesson_key && <p className="mt-2 font-bold text-forest">{c.percentage ?? 0}% de práctica</p>}<p className="mt-3 text-forest">Leer y practicar →</p></Link>)}</div><Pagination page={page} lastPage={contents.data.last_page} onChange={setPage} /></> :
                <EmptyState title="Todavía no hay temas publicados" description="El administrador está preparando esta unidad." />}</> : selectedTopic.loading ? <LoadingState/> : topic ? <section className="glass-panel p-6"><h2 className="font-serif text-2xl">{topic.title}</h2><div className="mt-5 whitespace-pre-line leading-8 text-muted">{topic.body}</div><button className="secondary-button mt-5" onClick={() => { setParams({}); setExercisePage(1); }}>Volver a los temas</button></section> : <ErrorState message={selectedTopic.error??'Este tema no está disponible.'} />}
            {exercises.loading ? <LoadingState /> : exercises.error ? <ErrorState message={exercises.error} /> : exercises.data?.data.length ? <>
                <h2 className="font-serif text-2xl">{topicId ? 'Practica este tema' : 'Actividades de la unidad'}</h2><div className="grid items-start gap-5 lg:grid-cols-2">{exercises.data.data.map((e, i) => <ExerciseCard key={e.id} exercise={e} index={(exercisePage - 1) * (exercises.data?.per_page ?? 20) + i} />)}</div>
                <Pagination page={exercisePage} lastPage={exercises.data.last_page} onChange={setExercisePage} /></> : topicId && !evaluations.data?.data.some(e=>e.topic_id===topicId) && <EmptyState title="Todavía no hay ejercicios en este tema" description="Continúa con otro tema mientras se prepara la práctica." />}
            {!!evaluations.data?.data.length && <section className="space-y-3"><h2 className="font-serif text-2xl">{topicId ? 'Comprueba lo aprendido' : 'Evaluaciones de la unidad'}</h2>{evaluations.data.data.filter(e=>!topicId || !e.topic_id || e.topic_id===topicId).map(e => e.config?.final && (!e.prerequisite_topic_ids?.length || !e.prerequisite_topic_ids.every(id=>mastery.data?.mastered_topics.includes(id))) ? <div key={e.id} className="glass-panel p-5">🔒 {e.title}: domina las lecciones anteriores para desbloquear.</div> : <Link className="glass-panel card-hover block p-5" key={e.id} href={'/aprender/evaluacion/' + e.id}>{e.title} →</Link>)}<Pagination page={evaluationPage} lastPage={evaluations.data.last_page} onChange={setEvaluationPage}/></section>}
        </div>}
    </AppLayout>;
}
