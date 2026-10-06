import { useEffect, useState, type FormEvent } from 'react';
import { apiDelete, apiGet, apiPatch, apiPost, ApiError } from '../services/api';
import { EmptyState, LoadingState } from './States';
import { ExerciseEditor, newExercise, type EditableExercise } from './ExerciseEditor';
import type { Level, Paginated } from '../types';

type Resource = 'modules' | 'units' | 'contents' | 'exercises' | 'evaluations' | 'questions' | 'glossary';
type Row = Record<string, unknown> & { id: number };
type Form = Record<string, unknown>;
const names: Record<Resource, string> = { modules: 'Módulos', units: 'Unidades', contents: 'Temas', exercises: 'Ejercicios', evaluations: 'Evaluaciones', questions: 'Preguntas', glossary: 'Diccionario' };
const parents: Partial<Record<Resource, { resource: Resource; field: string; label: string }>> = {
    units: { resource: 'modules', field: 'module_id', label: 'Módulo' },
    contents: { resource: 'units', field: 'unit_id', label: 'Unidad' },
    exercises: { resource: 'units', field: 'unit_id', label: 'Unidad' },
    evaluations: { resource: 'units', field: 'unit_id', label: 'Unidad' },
    questions: { resource: 'evaluations', field: 'evaluation_id', label: 'Evaluación' },
};
const initial = (resource: Resource): Form => ({ sort_order: 1, type: resource === 'evaluations' ? 'unidad' : 'seleccion_multiple', kind: 'vocabulary', score: 10, ...(resource === 'exercises' || resource === 'questions' ? newExercise() : {}) });
const display = (row: Row) => String(row.title || row.prompt || row.spanish || row.name || `#${row.id}`);
async function allRows(resource: Resource): Promise<Row[]> {
    let page = 1; const rows: Row[] = [];
    while (true) {
        const result = await apiGet<Paginated<Row>>(`/admin/${resource}?per_page=200&page=${page}`);
        rows.push(...result.data);
        if (page >= result.last_page) return rows;
        page++;
    }
}
export function AdminContentManager({ levels }: { levels: Level[] }) {
    const [resource, setResource] = useState<Resource>('modules');
    const [rows, setRows] = useState<Row[]>([]);
    const [parentRows, setParentRows] = useState<Row[]>([]);
    const [form, setForm] = useState<Form>(initial('modules'));
    const [editing, setEditing] = useState<number | null>(null);
    const [page, setPage] = useState(1);
    const [lastPage, setLastPage] = useState(1);
    const [loading, setLoading] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const parent = parents[resource];
    const exercise = resource === 'exercises' || resource === 'questions';
    async function load() {
        setLoading(true); setError('');
        try {
            const [result, options] = await Promise.all([
                apiGet<Paginated<Row>>(`/admin/${resource}?per_page=20&page=${page}`),
                parent ? allRows(parent.resource) : Promise.resolve([]),
            ]);
            setRows(result.data); setLastPage(result.last_page); setParentRows(options);
        } catch (reason) { setError(reason instanceof ApiError ? reason.message : 'No se pudieron cargar los registros.'); }
        finally { setLoading(false); }
    }
    useEffect(() => { void load(); }, [resource, page]);
    const set = (key: string, value: unknown) => setForm(current => ({ ...current, [key]: value }));
    function switchResource(next: Resource) { setResource(next); setPage(1); setEditing(null); setForm(initial(next)); setNotice(''); }
    async function save(event: FormEvent) {
        event.preventDefault(); setBusy(true); setError(''); setNotice('');
        const payload = { ...form };
        delete payload.id;
        if (resource === 'evaluations' && form.type === 'diagnostica') payload.unit_id = null;
        try {
            if (editing) await apiPatch(`/admin/${resource}/${editing}`, payload);
            else await apiPost(`/admin/${resource}`, payload);
            setNotice('Registro guardado.'); setEditing(null); setForm(initial(resource)); await load();
        } catch (reason) { setError(reason instanceof ApiError ? Object.values(reason.errors).flat().join(' ') || reason.message : 'No se pudo guardar.'); }
        finally { setBusy(false); }
    }
    async function remove(row: Row) {
        if (!window.confirm(`¿Eliminar «${display(row)}»? El contenido con relaciones o respuestas históricas se conserva.`)) return;
        setError('');
        try { await apiDelete(`/admin/${resource}/${row.id}`); setNotice('Registro eliminado.'); await load(); }
        catch (reason) { setError(reason instanceof ApiError ? reason.message : 'No se pudo eliminar.'); }
    }
    function textField(key: string, label: string, multiline = false, max = 180) {
        return <label className="grid gap-2">{label}{multiline ? <textarea className="field min-h-28" required maxLength={max} value={String(form[key] ?? '')} onChange={e => set(key, e.target.value)} /> : <input className="field" required maxLength={max} value={String(form[key] ?? '')} onChange={e => set(key, e.target.value)} />}</label>;
    }
    return <div className="space-y-6">
        <div className="glass-panel p-4"><strong>Niveles</strong><div className="mt-2 flex flex-wrap gap-3">{levels.map(level => <span key={level.id} className="rounded-xl bg-emerald-50 p-3">{level.name} · {level.available ? 'Disponible' : 'Próximamente'}</span>)}</div><p className="mt-3 text-sm text-muted">Carga contenido validado por el docente. Los registros del Básico guardados aquí estarán disponibles para el estudiante.</p></div>
        <div className="flex gap-2 overflow-x-auto" role="tablist" aria-label="Tipo de contenido">{(Object.keys(names) as Resource[]).map(key => <button key={key} role="tab" aria-selected={resource === key} className={`tab-button ${resource === key ? 'is-active' : ''}`} onClick={() => switchResource(key)}>{names[key]}</button>)}</div>
        <div className="grid items-start gap-6 xl:grid-cols-2"><form className="glass-panel space-y-5 p-6" onSubmit={save}><h2 className="font-serif text-2xl">{editing ? 'Editar' : 'Crear'} · {names[resource]}</h2>
            {resource === 'modules' && <label className="grid gap-2">Nivel<select className="field" required value={String(form.level_id ?? '')} onChange={e => set('level_id', Number(e.target.value))}><option value="">Selecciona nivel</option>{levels.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}</select></label>}
            {resource === 'evaluations' && <label className="grid gap-2">Tipo de evaluación<select className="field" value={String(form.type)} onChange={e => set('type', e.target.value)}><option value="unidad">Unidad</option><option value="diagnostica">Diagnóstica general</option></select></label>}
            {parent && !(resource === 'evaluations' && form.type === 'diagnostica') && <label className="grid gap-2">{parent.label}<select className="field" required value={String(form[parent.field] ?? '')} onChange={e => set(parent.field, Number(e.target.value))}><option value="">Selecciona…</option>{parentRows.map(row => <option key={row.id} value={row.id}>#{row.id} · {display(row)}</option>)}</select></label>}
            {resource === 'glossary' ? <>{textField('kichwa', 'Palabra o expresión Kichwa', false, 200)}{textField('spanish', 'Equivalencia en español', false, 250)}</> : exercise ? <ExerciseEditor key={resource + '-' + (editing ?? 'new')} value={form as unknown as EditableExercise} onChange={value => setForm(current => ({ ...current, ...value }))} /> : <>{textField('title', 'Título', false, resource === 'modules' ? 150 : 180)}
                {(resource === 'modules' || resource === 'units') && textField('description', resource === 'units' ? 'Objetivo de la unidad' : 'Descripción', true, 20000)}
                {resource === 'contents' && <><label className="grid gap-2">Tipo de tema<select className="field" value={String(form.kind)} onChange={e => set('kind', e.target.value)}><option value="vocabulary">Vocabulario</option><option value="grammar">Gramática</option><option value="culture">Cultura</option></select></label>{textField('body', 'Contenido (texto plano)', true, 50000)}</>}</>}
            {resource !== 'evaluations' && resource !== 'glossary' && <label className="grid gap-2">Orden dentro de su nivel, módulo, unidad o evaluación<input className="field" type="number" required min={1} step={1} value={Number(form.sort_order)} onChange={e => set('sort_order', Number(e.target.value))} /></label>}
            {resource === 'questions' && <label className="grid gap-2">Puntaje máximo<input className="field" type="number" required min={.01} max={999999.99} step={.01} value={Number(form.score)} onChange={e => set('score', Number(e.target.value))} /></label>}
            <div className="flex flex-wrap gap-3"><button className="primary-button" disabled={busy} type="submit">Guardar</button>{editing && <button className="secondary-button" type="button" onClick={() => { setEditing(null); setForm(initial(resource)); }}>Cancelar</button>}</div>
            {error && <p className="form-error" role="alert">{error}</p>}{notice && <p role="status" className="text-forest">{notice}</p>}
        </form><section className="space-y-4"><h2 className="font-serif text-2xl">Registros</h2>{loading ? <LoadingState /> : !rows.length ? <EmptyState title="Sin registros" description="Crea el primer registro desde el formulario." /> : rows.map(row => <article key={row.id} className="glass-panel flex flex-wrap items-center gap-3 p-4"><div className="min-w-0 flex-1"><strong className="block">{display(row)}</strong><small className="text-muted">#{row.id}{row.sort_order ? ` · Orden ${row.sort_order}` : ''}</small></div><button className="secondary-button" onClick={() => { setEditing(row.id); setForm({ ...initial(resource), ...row }); setNotice(''); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>Editar</button><button className="secondary-button" onClick={() => void remove(row)}>Eliminar</button></article>)}
            {lastPage > 1 && <div className="flex items-center justify-end gap-3"><button className="secondary-button" disabled={page <= 1} onClick={() => setPage(page - 1)}>Anterior</button><span>{page} / {lastPage}</span><button className="secondary-button" disabled={page >= lastPage} onClick={() => setPage(page + 1)}>Siguiente</button></div>}
        </section></div>
    </div>;
}
