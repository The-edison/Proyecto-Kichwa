import { Head, Link } from '../../navigation';
import { ArrowRight, BookOpen, CheckCheck, ClipboardCheck, Sparkles, Trophy, Zap, LockKeyhole } from 'lucide-react';
import { EmptyState, ErrorState, LoadingState } from '../../components/States';
import { useApi } from '../../hooks/useApi';
import { useAuth } from '../../context/AuthContext';
import { AppLayout } from '../../layouts/AppLayout';
import type { Level, ProgressSummary, Mastery } from '../../types';
import indigenousLanguagesImage from '../../../images/indigenous-languages.jpg';
import culturalDiversityImage from '../../../images/cultural-diversity.jpg';

const courseCovers = [
    { src: indigenousLanguagesImage, alt: 'Collage de lenguas indígenas, textiles y tradiciones' },
    { src: culturalDiversityImage, alt: 'Ilustración de diversidad cultural y pueblos indígenas' },
];

export default function Dashboard() {
    const { user } = useAuth();
    const levels = useApi<Level[]>('/levels');
    const progress = useApi<ProgressSummary[]>('/progress');
    const mastery = useApi<Mastery>('/mastery');
    const completed = progress.data?.reduce((sum, item) => sum + item.completed_activities, 0) ?? 0;
    const total = progress.data?.reduce((sum, item) => sum + item.total_activities, 0) ?? 0;
    const percentage = total ? Math.round(completed / total * 100) : 0;
    const evaluations = progress.data?.reduce((sum, item) => sum + item.evaluation_results.length, 0) ?? 0;
    const next = levels.data?.find(level => level.available && progress.data?.some(item => item.level.id === level.id && item.percentage > 0 && item.percentage < 100)) ?? levels.data?.find(level => level.available);
    const stats = [
        ['Progreso total', `${percentage}%`, BookOpen, 'De tus actividades de práctica'],
        ['Actividades completadas', completed, CheckCheck, `${total} actividades en total`],
        ['Experiencia ganada', mastery.data?.xp ?? '—', Zap, 'XP de tu aprendizaje'],
        ['Evaluaciones realizadas', evaluations, ClipboardCheck, 'Con resultados registrados'],
    ] as const;
    return <AppLayout title={`¡Hola, ${user?.name.split(' ')[0] ?? 'estudiante'}!`} subtitle="Un pequeño paso hoy. Una nueva palabra para siempre.">
        <Head title="Mi aprendizaje" />
        <div className="dashboard-intro"><span className="eyebrow">TU CAMINO EN KICHWA</span><Link href="/aprender/progreso" className="text-link">Ver mi progreso <ArrowRight size={16} /></Link></div>
        {progress.loading ? <LoadingState label="Cargando tus avances…" /> : progress.error ? <ErrorState message={progress.error} /> : <section className="stats-grid student-dashboard-stats" aria-label="Resumen de aprendizaje">
            {stats.map(([label, value, Icon, note], index) => <article className="stat-card glass-panel" key={label}><span className={`stat-icon tone-${index % 3}`}><Icon size={22} aria-hidden="true" /></span><span className="stat-label">{label}</span><strong className="stat-value">{value}</strong><small>{note}</small></article>)}
        </section>}
        <div className="student-dashboard-content"><section className="student-dashboard-levels" aria-labelledby="student-levels-title">
            <div className="section-heading"><div><span className="eyebrow">EXPLORA Y DESCUBRE</span><h2 id="student-levels-title">Tus niveles</h2></div><span className="badge neutral">{levels.data?.length ?? '—'} niveles</span></div>
            {levels.loading ? <LoadingState /> : levels.error ? <ErrorState message={levels.error} /> : !levels.data?.length ? <EmptyState title="Próximamente" description="Todavía no hay niveles publicados." /> : <div className="course-grid">
                {levels.data.map((level, index) => {
                    const summary = progress.data?.find(item => item.level.id === level.id);
                    const cover = courseCovers[index];
                    const content = <><div className={`course-art tone-${index % 3}${cover ? ' has-image' : ''}`}>
                        {cover ? <img src={cover.src} alt={cover.alt} loading="lazy" /> : <BookOpen size={42} strokeWidth={1.5} aria-hidden="true" />}
                        <span>YACHAY / {String(index + 1).padStart(2, '0')}</span>
                    </div><div className="course-body"><div className="course-meta"><span className="eyebrow">NIVEL {index + 1}</span><span className="badge neutral">{!level.available ? 'Próximamente' : summary?.percentage === 100 ? 'Completado' : summary?.percentage ? 'En curso' : 'Disponible'}</span></div><h3>{level.name}</h3><p>Módulos, unidades y actividades para avanzar paso a paso.</p>{level.available ? <><div className="course-progress"><strong>{summary?.percentage ?? 0}% completado</strong><ArrowRight size={18} aria-hidden="true" /></div><div className="progress-track" role="progressbar" aria-label={`Progreso de ${level.name}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={summary?.percentage ?? 0}><div className="progress-fill" style={{ width: `${summary?.percentage ?? 0}%` }} /></div></> : <p className="locked-label"><LockKeyhole size={16} aria-hidden="true" /> Aún no disponible</p>}</div></>;
                    return level.available ? <Link key={level.id} href={`/aprender/nivel/${level.id}`} className="course-card glass-panel card-hover">{content}</Link> : <article key={level.id} className="course-card glass-panel">{content}</article>;
                })}
            </div>}
        </section><aside className="student-dashboard-support" aria-label="Logros y recursos de aprendizaje">
            <section className="glass-panel achievement-panel" aria-labelledby="student-achievements-title">
                <span className="stat-icon tone-2"><Trophy size={20} aria-hidden="true" /></span>
                <h2 id="student-achievements-title">Pequeños pasos, grandes logros</h2>
                <p className="text-muted">Cada lección cuenta en tu recorrido.</p>
                {mastery.loading ? <LoadingState label="Cargando logros…" /> : mastery.error ? <ErrorState message={mastery.error} /> : <>
                    <div className="achievement-total"><strong>{mastery.data?.mastered_topics.length ?? 0}</strong><span>lecciones dominadas</span></div>
                    {mastery.data?.medals.length ? <ul className="achievement-list">{mastery.data.medals.map(medal => <li key={medal}><Trophy size={16} aria-hidden="true" />{medal}</li>)}</ul> : <p className="soft-note">Completa tus primeras lecciones para conseguir insignias.</p>}
                </>}
                <Link href="/aprender/progreso" className="text-link">Explorar mis logros <ArrowRight size={16} aria-hidden="true" /></Link>
            </section>
            <section className="glass-panel achievement-panel" aria-labelledby="student-practice-title">
                <span className="eyebrow">SIGUIENTE PASO</span>
                <h2 id="student-practice-title">Sigue practicando</h2>
                <p className="text-muted">Repasa palabras nuevas o explora tu próximo nivel.</p>
                <Link href="/aprender/diccionario" className="quick-link"><BookOpen size={20} aria-hidden="true" /><span>Consultar el diccionario<small>Kichwa ↔ Español</small></span><ArrowRight size={16} aria-hidden="true" /></Link>
                {next && <Link href={`/aprender/nivel/${next.id}`} className="quick-link"><Sparkles size={20} aria-hidden="true" /><span>{next.name}<small>Explorar actividades disponibles</small></span><ArrowRight size={16} aria-hidden="true" /></Link>}
            </section>
        </aside></div>
    </AppLayout>;
}
