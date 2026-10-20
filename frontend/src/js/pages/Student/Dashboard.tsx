import { Head, Link } from '../../navigation';
import { ArrowRight, BookOpen, Sparkles, Trophy, LockKeyhole } from 'lucide-react';
import { EmptyState, ErrorState, LoadingState } from '../../components/States';
import { useApi } from '../../hooks/useApi';
import { useAuth } from '../../context/AuthContext';
import { AppLayout } from '../../layouts/AppLayout';
import { nextLearningHref } from '../../components/LearningJourney';
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
    const report = mastery.data?.learning_report;
    const nextStep = report?.next_step;
    const next = levels.data?.find(level => level.available && progress.data?.some(item => item.level.id === level.id && item.percentage > 0 && item.percentage < 100)) ?? levels.data?.find(level => level.available);
    return <AppLayout title={`¡Hola, ${user?.name.split(' ')[0] ?? 'estudiante'}!`} subtitle="Un pequeño paso hoy. Una nueva palabra para siempre.">
        <Head title="Mi aprendizaje" />
        <div className="dashboard-intro"><span className="eyebrow">APRENDE A TU RITMO</span><Link href="/aprender/progreso" className="text-link">Ver mi progreso <ArrowRight size={16} /></Link></div>
        <div className="student-dashboard-content"><section className="student-dashboard-levels" aria-labelledby="student-levels-title">
            <div className="section-heading"><div><h2 id="student-levels-title">Tus niveles</h2></div><span className="badge neutral">{levels.data?.length ?? '—'} niveles</span></div>
            {levels.loading ? <LoadingState /> : levels.error ? <ErrorState message={levels.error} /> : !levels.data?.length ? <EmptyState title="Próximamente" description="Todavía no hay niveles publicados." /> : <div className="course-grid">
                {levels.data.map((level, index) => {
                    const summary = progress.data?.find(item => item.level.id === level.id);
                    const levelReport = report?.levels.find(item => item.id === level.id);
                    const levelCompleted = levelReport?.completed ?? summary?.percentage === 100;
                    const cover = courseCovers[index];
                    const content = <><div className={`course-art tone-${index % 3}${cover ? ' has-image' : ''}`}>
                        {cover ? <img src={cover.src} alt={cover.alt} loading="lazy" /> : <BookOpen size={42} strokeWidth={1.5} aria-hidden="true" />}
                        <span>YACHAY / {String(index + 1).padStart(2, '0')}</span>
                    </div><div className="course-body"><div className="course-meta"><span className="eyebrow">NIVEL {index + 1}</span><span className="badge neutral">{!level.available ? 'Próximamente' : levelCompleted ? 'Completado' : summary?.percentage === 100 ? 'Práctica lista' : summary?.percentage ? 'En curso' : 'Disponible'}</span></div><h3>{level.name}</h3><p>Módulos, unidades y actividades para avanzar paso a paso.</p>{level.available ? <><div className="course-progress"><strong>{summary?.percentage ?? 0}% de práctica</strong><ArrowRight size={18} aria-hidden="true" /></div><div className="progress-track" role="progressbar" aria-label={`Progreso de práctica de ${level.name}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={summary?.percentage ?? 0}><div className="progress-fill" style={{ width: `${summary?.percentage ?? 0}%` }} /></div></> : <p className="locked-label"><LockKeyhole size={16} aria-hidden="true" /> Aún no disponible</p>}</div></>;
                    return level.available ? <Link key={level.id} href={`/aprender/nivel/${level.id}`} className="course-card glass-panel card-hover">{content}</Link> : <article key={level.id} className="course-card glass-panel">{content}</article>;
                })}
            </div>}
        </section><aside className="student-dashboard-support" aria-label="Logros y recursos de aprendizaje">
            <section className="glass-panel achievement-panel" aria-labelledby="student-achievements-title">
                <div className="student-support-heading"><span className="stat-icon tone-2"><Trophy size={20} aria-hidden="true" /></span><h2 id="student-achievements-title">Pequeños pasos, grandes logros</h2></div>
                {mastery.loading ? <LoadingState label="Cargando logros…" /> : mastery.error ? <ErrorState message={mastery.error} /> : <>
                    <dl className="achievement-counts">
                        <div><dt>Unidades completadas</dt><dd>{report?.summary.completed_units ?? mastery.data?.completed_units.length ?? 0}{report && <small> / {report.summary.total_units}</small>}</dd></div>
                        <div><dt>Módulos completados</dt><dd>{report?.summary.completed_modules ?? 0}{report && <small> / {report.summary.total_modules}</small>}</dd></div>
                        <div><dt>Pruebas finales aprobadas</dt><dd>{report?.summary.passed_finals ?? 0}{report && <small> / {report.summary.total_finals}</small>}</dd></div>
                    </dl>
                    {Boolean(mastery.data?.medals.length) && <ul className="achievement-list">{mastery.data?.medals.map(medal => <li key={medal}><Trophy size={16} aria-hidden="true" />{medal}</li>)}</ul>}
                </>}
                <Link href="/aprender/progreso" className="text-link">Explorar mis logros <ArrowRight size={16} aria-hidden="true" /></Link>
            </section>
            <section className="glass-panel achievement-panel" aria-labelledby="student-practice-title">
                <span className="eyebrow">SIGUIENTE PASO</span>
                <h2 id="student-practice-title">Sigue practicando</h2>
                <Link href="/aprender/diccionario" className="quick-link"><BookOpen size={20} aria-hidden="true" /><span>Consultar el diccionario</span><ArrowRight size={16} aria-hidden="true" /></Link>
                {mastery.loading ? <p className="soft-note">Buscando tu siguiente paso…</p> : nextStep ? <Link href={nextLearningHref(nextStep)} className="quick-link"><Sparkles size={20} aria-hidden="true" /><span>{nextStep.title}<small>{nextStep.kind === 'module_final' ? 'Continúa con tu prueba final' : 'Continúa tu aprendizaje'}</small></span><ArrowRight size={16} aria-hidden="true" /></Link> : report ? <p className="soft-note">{report.summary.total_activities ? '¡Has completado todo el contenido disponible! Puedes repasar tus unidades.' : 'El contenido de aprendizaje está en preparación.'}</p> : next && <Link href={`/aprender/nivel/${next.id}`} className="quick-link"><Sparkles size={20} aria-hidden="true" /><span>{next.name}<small>Explorar actividades disponibles</small></span><ArrowRight size={16} aria-hidden="true" /></Link>}
            </section>
        </aside></div>
    </AppLayout>;
}
