import { Head, Link } from '../../navigation';
import { AppLayout } from '../../layouts/AppLayout';
import { ExerciseCard } from '../../components/ExerciseCard';
import { EmptyState, ErrorState, LoadingState } from '../../components/States';
import { useApi } from '../../hooks/useApi';
import type { Content, Exercise } from '../../types';
export default function Unit({ unitId }: { unitId: number }) {
    const contents = useApi<Content[]>(`/units/${unitId}/contents`);
    const exercises = useApi<Exercise[]>(`/units/${unitId}/exercises`);
    return <AppLayout title="Tu unidad" subtitle="Lee, escucha y practica."><Head title="Unidad" /><Link href="/aprender" className="mb-6 inline-block font-bold text-forest">← Nivel Básico</Link>
        {contents.loading || exercises.loading ? <LoadingState /> : contents.error || exercises.error ? <ErrorState message={contents.error || exercises.error || ''} /> : <div className="space-y-8">
            {contents.data?.length ? contents.data.map((content, index) => <section className="glass-panel p-7" key={content.id}><span className="eyebrow">TEMA {index + 1}</span><h2 className="section-title mt-3">{content.title}</h2><div className="mt-5 whitespace-pre-line leading-8 text-muted">{content.body}</div></section>) : <EmptyState title="Sin temas" description="El administrador todavía no ha cargado temas para esta unidad." />}
            <h2 className="font-serif text-3xl">Practica</h2>{exercises.data?.length ? <div className="grid items-start gap-5 lg:grid-cols-2">{exercises.data.map((exercise, i) => <ExerciseCard key={exercise.id} exercise={exercise} index={i} />)}</div> : <EmptyState title="Sin ejercicios" description="Los ejercicios de esta unidad estarán disponibles cuando los cargue el administrador." />}
        </div>}
    </AppLayout>;
}
