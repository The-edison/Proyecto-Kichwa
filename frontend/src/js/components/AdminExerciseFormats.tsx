import { useState } from 'react';
import { useApi } from '../hooks/useApi';
import type { Exercise, Paginated } from '../types';
import { AdminExerciseSketch, exerciseFormatNames } from './AdminExerciseSketch';

type CatalogExercise = Exercise & { unit_id: number };
type CatalogUnit = { id: number; title: string; config?: { guided_lesson?: string } };

export function AdminExerciseFormats() {
    const exercises = useApi<Paginated<CatalogExercise>>('/admin/exercises?per_page=200');
    const units = useApi<Paginated<CatalogUnit>>('/admin/units?per_page=200');
    const [previewId, setPreviewId] = useState<number | null>(null);
    const unitById = new Map(units.data?.data.map(unit => [unit.id, unit]) ?? []);
    const formats = Object.entries(exerciseFormatNames) as Array<[Exercise['type'], string]>;

    return <section className="glass-panel space-y-4 p-5 sm:p-6" aria-labelledby="admin-exercise-formats-title">
        <div>
            <h3 id="admin-exercise-formats-title" className="text-xl font-bold">Formatos de ejercicios del sistema</h3>
            <p className="mt-2 text-sm text-muted">Explora los ejercicios existentes por formato. Abre cualquiera para ver su boceto, esté publicado o en borrador.</p>
        </div>
        {exercises.loading ? <p role="status">Cargando formatos…</p> : exercises.error ? <p role="alert" className="form-error">No se pudieron cargar los formatos.</p> :
            <div className="space-y-3">{formats.map(([type, label]) => {
                const items = (exercises.data?.data ?? []).filter(item => item.type === type);
                if (!items.length) return null;
                return <details key={type} className="rounded-xl border border-line bg-card p-4">
                    <summary className="cursor-pointer font-bold">{label} · {items.length} {items.length === 1 ? 'ejercicio' : 'ejercicios'}</summary>
                    <div className="mt-4 space-y-3">{items.map(item => {
                        const unit = unitById.get(item.unit_id);
                        const lesson = unit?.config?.guided_lesson === 'numbers' || unit?.config?.guided_lesson === 'calendar' ? unit.config.guided_lesson : undefined;
                        return <div key={item.id} className="rounded-xl border border-line p-3">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div><strong className="block">{item.config?.title ?? item.prompt}</strong><span className="text-sm text-muted">#{item.id} · {unit?.title ?? `Unidad #${item.unit_id}`} · {item.published ? 'Publicado' : 'Borrador'}</span></div>
                                <button type="button" className="secondary-button" aria-expanded={previewId === item.id} aria-controls={`format-sketch-${item.id}`} onClick={() => setPreviewId(current => current === item.id ? null : item.id)}>{previewId === item.id ? 'Cerrar boceto' : 'Ver boceto'}</button>
                            </div>
                            {previewId === item.id && <div id={`format-sketch-${item.id}`} className="mt-4"><AdminExerciseSketch key={item.id} exercise={item} lesson={lesson} /></div>}
                        </div>;
                    })}</div>
                </details>;
            })}</div>}
        {(exercises.data?.last_page ?? 1) > 1 && <p className="text-sm text-muted">Se muestran los primeros 200 ejercicios del sistema.</p>}
    </section>;
}
