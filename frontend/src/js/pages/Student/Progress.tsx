import { ArrowRight, BookOpen, CheckCheck, CheckCircle2, ClipboardCheck, Zap } from 'lucide-react';
import { Head, Link } from '../../navigation';
import { AppLayout } from '../../layouts/AppLayout';
import { EmptyState, ErrorState, LoadingState } from '../../components/States';
import { useApi } from '../../hooks/useApi';
import type { ProgressSummary, Mastery } from '../../types';
import '../../../css/student-progress.css';

interface TestProgress {
    id: number; title: string; score: number | null; passed: boolean;
}

export default function Progress() {
    const progress = useApi<ProgressSummary[]>('/progress');
    const mastery = useApi<Mastery>('/mastery');
    const report = mastery.data?.learning_report;
    const completed = progress.data?.reduce((sum, item) => sum + item.completed_activities, 0) ?? 0;
    const total = progress.data?.reduce((sum, item) => sum + item.total_activities, 0) ?? 0;
    const percentage = total ? Math.round(completed / total * 100) : 0;
    const stats = [
        ['Práctica completada', `${report?.summary.percentage ?? percentage}%`, BookOpen, 'Actividades resueltas correctamente'],
        ['Actividades correctas', report?.summary.completed_activities ?? completed, CheckCheck, `${report?.summary.total_activities ?? total} actividades en total`],
        ['Unidades completadas', mastery.loading ? '…' : report?.summary.completed_units ?? mastery.data?.completed_units.length ?? '—', CheckCircle2, report ? `${report.summary.total_units} unidades disponibles` : 'Con su recorrido completado'],
        ['Experiencia ganada', mastery.loading ? '…' : mastery.data?.xp ?? '—', Zap, 'XP acumulados de todos tus intentos'],
    ] as const;
    const tests = new Map<number, TestProgress>();
    for (const level of report?.levels ?? []) {
        for (const module of level.modules) {
            const final = module.final_evaluation;
            if (final && (final.latest_score !== null || final.in_progress)) {
                tests.set(module.id, { id: final.id, title: final.title, score: final.latest_score,
                    passed: final.latest_passed ?? (final.latest_score !== null && final.latest_score >= final.pass_percentage) });
            }
        }
    }

    return <AppLayout title="Mi progreso" subtitle="Un resumen de tu avance y los resultados de tus pruebas.">
        <Head title="Mi progreso" />
        <div className="student-progress-page">
            <div className="dashboard-intro"><span className="eyebrow">TU CAMINO EN KICHWA</span><Link href="/aprender" className="text-link">Seguir aprendiendo <ArrowRight size={16} aria-hidden="true" /></Link></div>
            {progress.loading ? <LoadingState label="Cargando tus avances…" /> : progress.error ? <ErrorState message={progress.error} /> : <section className="stats-grid student-dashboard-stats" aria-label="Resumen de aprendizaje">
                {stats.map(([label, value, Icon, note], index) => <article className="stat-card glass-panel" key={label}><span className={`stat-icon tone-${index % 3}`}><Icon size={22} aria-hidden="true" /></span><span className="stat-label">{label}</span><strong className="stat-value">{value}</strong><small>{note}</small></article>)}
            </section>}
            {mastery.error && <ErrorState message={mastery.error} />}
            <section aria-labelledby="progress-tests-title">
                <div className="section-heading"><div><span className="eyebrow">TUS RESULTADOS</span><h2 id="progress-tests-title">Pruebas de módulo</h2></div><ClipboardCheck size={21} className="text-forest" aria-hidden="true" /></div>
                {mastery.loading ? <LoadingState label="Cargando tus resultados…" /> : mastery.error ? <p className="soft-note">No se pudieron cargar los resultados.</p> : !tests.size ? <EmptyState title="Todavía no tienes resultados" description="Realiza una prueba de módulo para ver aquí tu última nota." action={<Link href="/aprender" className="primary-button">Seguir aprendiendo</Link>} /> : <div className="student-progress-test-list">
                    {[...tests.values()].map(test => <article key={test.id} className="glass-panel student-progress-test">
                        <h3>{test.title}</h3>
                        <div className="student-progress-test-result"><span className="student-progress-test-score" aria-label={test.score === null ? 'Sin nota todavía' : `Última nota: ${test.score} de 100`}>{test.score === null ? '—' : `${test.score} / 100`}</span><span className={`badge ${test.passed ? 'success' : 'neutral'}`}>{test.score === null ? 'En curso' : test.passed ? 'Aprobada' : 'No aprobada'}</span></div>
                    </article>)}
                </div>}
            </section>
        </div>
    </AppLayout>;
}
