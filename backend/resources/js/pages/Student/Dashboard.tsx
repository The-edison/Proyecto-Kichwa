import { Head, Link } from '@inertiajs/react';
import { ArrowRight, BookOpen, Sparkles } from 'lucide-react';
import { EmptyState, ErrorState, LoadingState } from '../../components/States';
import { useApi } from '../../hooks/useApi';
import { AppLayout } from '../../layouts/AppLayout';
import type { Level, ProgressSummary } from '../../types';

export default function Dashboard() {
    const levels = useApi<Level[]>('/levels');
    const progress = useApi<ProgressSummary[]>('/progress');

    return (
        <AppLayout title="Mi aprendizaje" subtitle="Elige un nivel y continúa a tu ritmo.">
            <Head title="Mi aprendizaje" />
            <div className="glass-panel mb-8 flex flex-wrap items-center gap-5 bg-gradient-to-r from-[#e0f3ea] to-[#fff4dd] p-8">
                <span className="grid h-14 w-14 place-items-center rounded-2xl bg-white text-forest"><Sparkles /></span>
                <div>
                    <h2 className="font-serif text-2xl">Cada palabra es un nuevo comienzo.</h2>
                    <p className="text-muted">Explora las lecciones y pon a prueba lo aprendido.</p>
                </div>
            </div>
            <h2 className="mb-5 font-serif text-3xl">Tus niveles</h2>
            {levels.loading ? <LoadingState /> : levels.error ? <ErrorState message={levels.error} /> : !levels.data?.length ? (
                <EmptyState title="Próximamente" description="Todavía no hay niveles publicados." />
            ) : (
                <div className="grid gap-5 md:grid-cols-2">
                    {levels.data.map((level, index) => {
                        const summary = progress.data?.find((item) => item.level.id === level.id);
                        return (
                            <Link
                                href={`/aprender/nivel/${level.id}`}
                                key={level.id}
                                className="level-glass-card glass-panel card-hover block p-7"
                            >
                                <div className="mb-8 flex items-center justify-between">
                                    <span className="grid h-14 w-14 place-items-center rounded-2xl bg-emerald-100 text-forest"><BookOpen /></span>
                                    <span className="glass-chip text-sm text-muted">Nivel {index + 1}</span>
                                </div>
                                <h3 className="font-serif text-3xl">{level.name}</h3>
                                <p className="mt-2 text-muted">Descubre módulos, unidades y actividades.</p>
                                <div className="mt-7 flex items-center justify-between text-sm font-bold text-forest">
                                    <span>{summary ? `${summary.percentage}% completado` : 'Empezar nivel'}</span>
                                    <ArrowRight size={19} />
                                </div>
                                <div className="progress-track mt-3"><div className="progress-fill" style={{ width: `${summary?.percentage ?? 0}%` }} /></div>
                            </Link>
                        );
                    })}
                </div>
            )}
        </AppLayout>
    );
}
