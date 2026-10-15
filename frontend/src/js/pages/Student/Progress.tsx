import { ArrowRight, BookOpen, CheckCheck, CheckCircle2, ClipboardCheck, Trophy, Zap } from 'lucide-react';
import { Head, Link } from '../../navigation';
import { AppLayout } from '../../layouts/AppLayout';
import { EmptyState, ErrorState, LoadingState } from '../../components/States';
import { LearningProgress } from '../../components/LearningProgress';
import { useApi } from '../../hooks/useApi';
import type { ProgressSummary, Mastery } from '../../types';
import '../../../css/student-progress.css';

export default function Progress() {
    const progress = useApi<ProgressSummary[]>('/progress');
    const mastery = useApi<Mastery>('/mastery');
    const completed = progress.data?.reduce((sum, item) => sum + item.completed_activities, 0) ?? 0;
    const total = progress.data?.reduce((sum, item) => sum + item.total_activities, 0) ?? 0;
    const percentage = total ? Math.round(completed / total * 100) : 0;
    const evaluations = progress.data?.reduce((sum, item) => sum + item.evaluation_results.length, 0) ?? 0;
    const stats = [
        ['Progreso total', `${percentage}%`, BookOpen, 'De tus actividades de práctica'],
        ['Actividades completadas', completed, CheckCheck, `${total} actividades en total`],
        ['Experiencia ganada', mastery.loading ? '…' : mastery.data?.xp ?? '—', Zap, 'XP acumulados de todos tus intentos'],
        ['Evaluaciones realizadas', evaluations, ClipboardCheck, 'Con resultados registrados'],
    ] as const;

    return <AppLayout title="Mi progreso" subtitle="Tu recorrido, tus logros y lo que has aprendido en kichwa.">
        <Head title="Mi progreso" />
        <div className="student-progress-page">
            <div className="dashboard-intro"><span className="eyebrow">TU CAMINO EN KICHWA</span><Link href="/aprender" className="text-link">Seguir aprendiendo <ArrowRight size={16} aria-hidden="true" /></Link></div>
            {progress.loading ? <LoadingState label="Cargando tus avances…" /> : progress.error ? <ErrorState message={progress.error} /> : <section className="stats-grid student-dashboard-stats" aria-label="Resumen de aprendizaje">
                {stats.map(([label, value, Icon, note], index) => <article className="stat-card glass-panel" key={label}><span className={`stat-icon tone-${index % 3}`}><Icon size={22} aria-hidden="true" /></span><span className="stat-label">{label}</span><strong className="stat-value">{value}</strong><small>{note}</small></article>)}
            </section>}

            <div className="student-progress-columns">
                <section aria-labelledby="progress-levels-title">
                    <div className="section-heading"><div><span className="eyebrow">PASO A PASO</span><h2 id="progress-levels-title">Avance por nivel</h2></div><BookOpen size={21} className="text-forest" aria-hidden="true" /></div>
                    {progress.loading ? <LoadingState label="Preparando tus niveles…" /> : progress.error ? <p className="soft-note">No se pudo cargar el detalle de tus niveles.</p> : !progress.data?.length ? <EmptyState title="Tu recorrido empieza aquí" description="Explora los niveles disponibles y completa tu primera actividad." action={<Link href="/aprender" className="primary-button">Explorar niveles</Link>} /> : <div className="student-progress-levels">
                        {progress.data.map(item => <article className="glass-panel student-progress-level" key={item.level.id}>
                            <div className="student-progress-level-heading"><h3>{item.level.name}</h3><span className={`badge ${item.total_activities > 0 && item.percentage === 100 ? 'success' : 'neutral'}`}>{!item.total_activities ? 'En preparación' : item.percentage === 100 ? 'Completado' : item.percentage > 0 ? 'En curso' : 'Por comenzar'}</span></div>
                            <LearningProgress value={item.percentage} label={`${item.completed_activities} de ${item.total_activities} actividades completadas`} />
                            {item.evaluation_results.length > 0 && <div className="student-progress-evaluations"><h4><ClipboardCheck size={16} aria-hidden="true" />Evaluaciones</h4><ul>{item.evaluation_results.map(result => <li key={result.evaluation_id}><span>Evaluación #{result.evaluation_id}</span><strong>Mejor nota: {Number(result.best_score)}%</strong></li>)}</ul></div>}
                            {item.total_activities > 0 ? <Link href={`/aprender/nivel/${item.level.id}`} className="text-link">{item.percentage === 100 ? 'Volver a practicar' : 'Continuar aprendiendo'} <ArrowRight size={16} aria-hidden="true" /></Link> : <p className="student-progress-pending">Las actividades aparecerán cuando se publique este nivel.</p>}
                        </article>)}
                    </div>}
                </section>

                <aside className="glass-panel student-progress-achievements" aria-labelledby="progress-achievements-title">
                    <span className="stat-icon tone-2"><Trophy size={23} aria-hidden="true" /></span><span className="eyebrow">CADA PASO CUENTA</span><h2 id="progress-achievements-title">Tus logros</h2>
                    {mastery.loading ? <LoadingState label="Cargando tus logros…" /> : mastery.error ? <ErrorState message={mastery.error} /> : mastery.data && <>
                        <dl className="student-progress-milestones"><div><dt><BookOpen size={16} aria-hidden="true" />Lecciones dominadas</dt><dd>{mastery.data.mastered_topics.length}</dd></div><div><dt><CheckCircle2 size={16} aria-hidden="true" />Unidades completadas</dt><dd>{mastery.data.completed_units.length}</dd></div></dl>
                        <h3>Insignias conseguidas</h3>
                        {mastery.data.medals.length > 0 ? <ul className="student-progress-medals">{mastery.data.medals.map(medal => <li key={medal}><Trophy size={17} aria-hidden="true" />{medal}</li>)}</ul> : <p className="soft-note">Sigue practicando para conseguir tus primeras insignias.</p>}
                        <p className="student-progress-tip">Cada nuevo intento puede sumar experiencia. Repasa a tu ritmo y observa cómo avanzas.</p>
                    </>}
                </aside>
            </div>


        </div>
    </AppLayout>;
}
