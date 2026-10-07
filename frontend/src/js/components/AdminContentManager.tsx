import { useEffect, useState, type FormEvent } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { apiDelete, apiGet, apiPatch, apiPost, ApiError } from '../services/api';
import { queryClient } from '../services/queryClient';
import { useApi } from '../hooks/useApi';
import { Link } from '../navigation';
import { EmptyState, ErrorState, LoadingState } from './States';
import { useToast } from './Toast';
import { ExerciseEditor, exerciseForSave, newExercise, type EditableExercise } from './ExerciseEditor';
import type { Level, Paginated } from '../types';
type Resource = 'modules' | 'units' | 'contents' | 'exercises' | 'evaluations' | 'questions' | 'diccionario';
type Row = Record<string, unknown> & { id: number };
const titles: Record<Resource, string> = { modules: 'módulo', units: 'unidad', contents: 'tema', exercises: 'ejercicio', evaluations: 'evaluación', questions: 'pregunta', diccionario: 'entrada' };
const display = (row: Row) => String(row.title || row.prompt || row.kichwa || '#' + row.id);
const base = '/admin/contenidos';
export function AdminContentManager({ levels }: { levels: Level[] }) {
    const location = useLocation(); const [params, setParams] = useSearchParams(); const toast = useToast();
    const parts = location.pathname.slice(base.length).split('/').filter(Boolean);
    const numberAfter = (key: string) => { const i = parts.indexOf(key); return i >= 0 ? Number(parts[i + 1]) : null; };
    const levelId = numberAfter('nivel'), moduleId = numberAfter('modulo'), unitId = numberAfter('unidad'), topicId = numberAfter('tema'), evaluationId = numberAfter('evaluacion');
    const levelPath = base + '/nivel/' + levelId, modulePath = levelPath + '/modulo/' + moduleId, unitPath = modulePath + '/unidad/' + unitId;
    const topicPath = unitPath + '/tema/' + topicId;
    const diagnostic = parts.includes('diagnostico'), diccionario = parts.includes('diccionario');
    const resource: Resource | null = diccionario ? 'diccionario' : evaluationId ? 'questions' : diagnostic ? 'evaluations' : topicId ? 'exercises' : unitId ? params.get('tab') === 'evaluations' ? 'evaluations' : params.get('tab') === 'exercises' ? 'exercises' : 'contents' : moduleId ? 'units' : levelId ? 'modules' : null;
    const parentId = resource === 'modules' ? levelId : resource === 'units' ? moduleId : resource === 'questions' ? evaluationId : unitId;
    const page = Number(params.get('page') || 1);
    const path = resource ? `/admin/${resource}?page=${page}${parentId ? '&parent_id=' + parentId : ''}${topicId ? '&topic_id=' + topicId : ''}${diagnostic ? '&type=diagnostica' : ''}` : null;
    const listing = useApi<Paginated<Row>>(path);
    const module = useApi<Row>(moduleId ? '/admin/modules/' + moduleId + '?parent_id=' + levelId : null);
    const unit = useApi<Row>(unitId ? '/admin/units/' + unitId + '?parent_id=' + moduleId : null);
    const topic = useApi<Row>(topicId ? '/admin/contents/' + topicId + '?parent_id=' + unitId : null);
    const evaluation = useApi<Row>(evaluationId ? '/admin/evaluations/' + evaluationId : null);
    const [form, setForm] = useState<Record<string, unknown>>({});
    const [editing, setEditing] = useState<number | null>(null);
    const [open, setOpen] = useState(false), [busy, setBusy] = useState(false);
    const [errors, setErrors] = useState<Record<string, string[]>>({});
    const exercise = resource === 'exercises' || resource === 'questions';
    useEffect(() => { setOpen(false); setEditing(null); setErrors({}); }, [location.pathname, params.get('tab')]);
    function begin() { setForm({ kind: 'vocabulary', score: 10, ...(exercise ? newExercise() : {}) }); setEditing(null); setErrors({}); setOpen(true); }
    function fail(reason: unknown) { const message = reason instanceof ApiError ? reason.message : 'No se pudo completar la operación.'; setErrors(reason instanceof ApiError ? reason.errors : {}); toast(message, true); }
    function updateList(changed: Row[], removed?: number, append = false) {
        if (resource === 'modules' && (append || removed)) queryClient.setQueryData<Level[]>(['api', '/admin/levels'], old => old?.map(l => l.id === levelId ? { ...l, children_count: (l.children_count ?? 0) + (append ? 1 : -1) } : l));
        queryClient.setQueryData<Paginated<Row>>(['api', path], old => {
            if (!old) return old;
            const originalIds = new Set(old.data.map(r => r.id));
            let data = old.data.filter(r => r.id !== removed).map(r => changed.find(c => c.id === r.id) ?? r);
            const added = append ? changed.filter(r => !originalIds.has(r.id)) : [];
            data = [...data, ...added].sort((a, b) => Number(a.sort_order ?? a.id) - Number(b.sort_order ?? b.id));
            const total = old.total + added.length - (removed ? 1 : 0);
            return { ...old, data: data.slice(0, old.per_page), total, last_page: Math.max(1, Math.ceil(total / old.per_page)) };
        });
        queryClient.invalidateQueries({ predicate: q => q.queryKey[0] === 'api' && q.queryKey[1] !== path, refetchType: 'none' });
    }
    async function save(event: FormEvent) {
        event.preventDefault(); if (busy || !resource) return;
        setBusy(true); setErrors({});
        const payload: Record<string, unknown> = exercise ? { ...exerciseForSave(form as unknown as EditableExercise) } : { ...form }; delete payload.id; delete payload.sort_order;
        const parentKey = resource === 'modules' ? 'level_id' : resource === 'units' ? 'module_id' : resource === 'questions' ? 'evaluation_id' : 'unit_id';
        if (parentId) payload[parentKey] = parentId;
        if (topicId && resource === 'exercises') payload.topic_id = topicId;
        if (resource === 'evaluations') { payload.type = diagnostic ? 'diagnostica' : 'unidad'; payload.unit_id = diagnostic ? null : unitId; }
        try {
            const row = editing ? await apiPatch<Row>(`/admin/${resource}/${editing}`, payload) : await apiPost<Row>('/admin/' + resource, payload);
            updateList([row], undefined, !editing); setOpen(false); setEditing(null); toast('Registro guardado.');
        } catch (reason) { fail(reason); } finally { setBusy(false); }
    }
    async function edit(row: Row) { if (!resource) return; setBusy(true); try { setForm(await apiGet<Row>(`/admin/${resource}/${row.id}`)); setEditing(row.id); setOpen(true); setErrors({}); } catch (reason) { fail(reason); } finally { setBusy(false); } }
    async function remove(row: Row) {
        if (!resource || busy) return;
        setBusy(true);
        try {
            const result = await apiGet<{ dependencies: Record<string, number> }>(`/admin/${resource}/${row.id}/dependencies`);
            const children = Object.entries(result.dependencies).filter(([, n]) => n > 0).map(([name, n]) => `${n} ${name}`);
            if (children.length) { toast('No se puede eliminar: contiene ' + children.join(', ') + '.', true); return; }
            if (!confirm(`¿Eliminar «${display(row)}»? No tiene registros dependientes.`)) return;
            await apiDelete(`/admin/${resource}/${row.id}`); updateList([], row.id); toast('Registro eliminado.');
        } catch (reason) { fail(reason); } finally { setBusy(false); }
    }
    async function move(row: Row, direction: 'up' | 'down') {
        if (!resource || busy) return; setBusy(true);
        try { const result = await apiPatch<{ data: Row[] }>(`/admin/${resource}/${row.id}/move`, { direction }); updateList(result.data); toast('Orden actualizado.'); }
        catch (reason) { fail(reason); } finally { setBusy(false); }
    }
    async function publish(row: Row) {
        if (!resource || busy) return; setBusy(true);
        try { const result = await apiPatch<Row>(`/admin/${resource}/${row.id}`, { published: !row.published }); updateList([result]); toast(result.published ? 'Publicado. Sus padres también deben estar publicados.' : 'Guardado como borrador.'); }
        catch (reason) { fail(reason); } finally { setBusy(false); }
    }
    async function importCsv(file: File | undefined) {
        if (!file) return; setBusy(true); const payload = new FormData(); payload.append('file', file);
        try { const result = await apiPost<{ message: string }>('/admin/diccionario/import', payload); toast(result.message); await listing.refresh(); }
        catch (reason) { fail(reason); } finally { setBusy(false); }
    }
    function field(key: string, label: string, multiline = false, required = true, maxLength = 180) {
        return <label className="grid gap-2">{label}{multiline ? <textarea className="field min-h-28" required={required} maxLength={maxLength} value={String(form[key] ?? '')} onChange={e => setForm({ ...form, [key]: e.target.value })} aria-invalid={Boolean(errors[key])} /> :
            <input className="field" required={required} maxLength={maxLength} value={String(form[key] ?? '')} onChange={e => setForm({ ...form, [key]: e.target.value })} aria-invalid={Boolean(errors[key])} />}
            {errors[key] && <span className="form-error">{errors[key].join(' ')}</span>}</label>;
    }
    function childPath(row: Row): string | null {
        if (resource === 'modules') return levelPath + '/modulo/' + row.id;
        if (resource === 'units') return modulePath + '/unidad/' + row.id;
        if (resource === 'contents') return unitPath + '/tema/' + row.id;
        if (resource === 'evaluations') return (diagnostic ? base + '/diagnostico' : unitPath) + '/evaluacion/' + row.id;
        return null;
    }
    const crumbs = [[base, 'Niveles'], ...(levelId ? [[levelPath, levels.find(l => l.id === levelId)?.name ?? 'Nivel']] : []),
        ...(moduleId ? [[modulePath, String(module.data?.title ?? 'Módulo')]] : []), ...(unitId ? [[unitPath, String(unit.data?.title ?? 'Unidad')]] : []),
        ...(topicId ? [[topicPath, String(topic.data?.title ?? 'Tema')]] : []), ...(evaluationId ? [[location.pathname, String(evaluation.data?.title ?? 'Evaluación')]] : [])];
    const parentError = module.error || unit.error || topic.error || evaluation.error;
    return <div className="space-y-6">
        <nav aria-label="Migas de pan" className="flex flex-wrap items-center gap-2 text-sm">{crumbs.map(([href, label], i) => <span key={href} className="flex items-center gap-2">{i > 0 && <span aria-hidden>›</span>}<Link href={href} className="rounded px-2 py-3 font-bold text-forest">{label}</Link></span>)}</nav>
        <div className="flex flex-wrap gap-3"><Link className="secondary-button" href={base}>Niveles</Link><Link className="secondary-button" href={base + '/diagnostico'}>Diagnóstico general</Link></div>
        {parentError ? <ErrorState message={parentError} /> : !resource ? <div className="grid gap-4 sm:grid-cols-2">{levels.map(level => <Link key={level.id} href={base + '/nivel/' + level.id} className="glass-panel card-hover p-6"><h2 className="font-serif text-3xl">{level.name}</h2><p className="mt-3">{level.children_count ?? 0} módulos</p><p className="mt-2 text-muted">{level.available ? 'Administrar contenido del Básico' : 'Estudiante: Próximamente'}</p></Link>)}</div> : <>
            {unitId && !topicId && !evaluationId && <div className="flex flex-wrap gap-2">{[['contents', 'Temas'], ['exercises', 'Actividades de la unidad'], ['evaluations', 'Evaluaciones']].map(([tab, label]) =>
                <Link key={tab} className={resource === tab ? 'primary-button' : 'secondary-button'} href={unitPath + (tab === 'contents' ? '' : '?tab=' + tab)}>{label}</Link>)}</div>}
            <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-serif text-2xl">{exercise ? resource === 'questions' ? 'Preguntas de la evaluación' : topicId ? 'Ejercicios del tema' : 'Actividades de la unidad' : `${listing.data?.total ?? 0} registros · ${titles[resource]}`}</h2>{exercise && <p className="mt-2 break-words text-sm text-muted">{String(topic.data?.title ?? evaluation.data?.title ?? unit.data?.title ?? '')} · {listing.data?.total ?? 0} {resource === 'questions' ? 'preguntas' : 'ejercicios'}. Añade actividades para que el estudiante practique lo aprendido.</p>}</div>
                <button className="primary-button" disabled={busy} onClick={begin}>Crear {titles[resource]}</button></div>
            {diccionario && <label className="glass-panel grid gap-2 p-4">Importar CSV (UTF-8, máximo 2 MB)<input type="file" accept=".csv" disabled={busy} onChange={e => void importCsv(e.target.files?.[0])} /><small>Columnas: kichwa, español. El id se genera automáticamente. Se conservan los duplicados existentes.</small></label>}
            {open && <form className="glass-panel space-y-4 p-5 sm:p-6" onSubmit={save} aria-busy={busy}>
                <h3 className="font-serif text-2xl">{editing ? 'Editar' : 'Crear'} {titles[resource]}</h3>
                {exercise && <p className="text-sm leading-6 text-muted">Completa los pasos, indica las respuestas correctas y prueba la actividad antes de guardarla.</p>}
                {exercise ? <ExerciseEditor onBusyChange={setBusy} errors={errors} value={form as unknown as EditableExercise} onChange={value => setForm(current => ({ ...current, ...value }))} /> :
                    diccionario ? <>{field('kichwa', 'Palabra o expresión Kichwa', false, true, 200)}{field('español', 'Equivalencia en español', false, true, 250)}</> : <>
                    {field('title', 'Título', false, true, resource === 'modules' ? 150 : 180)}
                    {(resource === 'modules' || resource === 'units') && field('description', resource === 'modules' ? 'Descripción' : 'Objetivo de la unidad', true, true, 20000)}
                    {resource === 'contents' && <><label className="grid gap-2">Tipo de tema<select className="field" value={String(form.kind ?? 'vocabulary')} onChange={e => setForm({ ...form, kind: e.target.value })}><option value="vocabulary">Vocabulario</option><option value="grammar">Gramática</option><option value="culture">Cultura</option></select></label>{field('body', 'Contenido (texto plano)', true, true, 50000)}</>}
                </>}
                {resource === 'questions' && <label className="grid gap-2">Puntaje máximo<input className="field" type="number" required min=".01" max="999999.99" step=".01" value={Number(form.score ?? 10)} onChange={e => setForm({ ...form, score: Number(e.target.value) })} />{errors.score && <span className="form-error">{errors.score}</span>}</label>}
                {['modules', 'units', 'contents'].includes(resource) && <p className="text-sm text-muted">Los registros nuevos se guardan como borrador. Publica después de revisar el contenido.</p>}
                {Object.entries(errors).filter(([key]) => !['title', 'description', 'body', 'kichwa', 'español', 'score'].includes(key)).map(([key, values]) => <p key={key} className="form-error" role="alert">{values.join(' ')}</p>)}
                <div className="flex flex-wrap gap-3 border-t border-emerald-100 pt-4"><button className="primary-button" type="submit" disabled={busy}>{busy ? 'Guardando…' : exercise ? resource === 'questions' ? 'Guardar pregunta' : 'Guardar ejercicio' : 'Guardar'}</button><button className="secondary-button" type="button" disabled={busy} onClick={() => setOpen(false)}>Cancelar</button></div>
            </form>}
            {listing.loading ? <LoadingState /> : listing.error ? <ErrorState message={listing.error} /> : !listing.data?.data.length ?
                <EmptyState title={'Todavía no hay ' + titles[resource]} description="Crea el primer registro dentro de este recorrido." action={<button className="primary-button" onClick={begin}>Crear primer {titles[resource]}</button>} /> :
                <div className="grid gap-3">{listing.data.data.map(row => <article className="glass-panel flex flex-wrap items-center gap-3 p-4" key={row.id}>
                    <div className="min-w-0 flex-1">{childPath(row) ? <Link className="block break-words font-bold text-forest underline" href={childPath(row)!}>{display(row)}</Link> : <strong className="block break-words">{display(row)}</strong>}
                        {diccionario && <p className="break-words text-muted">{String(row.español ?? '')}</p>}
                        <small className="text-muted">#{row.id}{row.sort_order ? ' · Orden ' + row.sort_order : ''}{'published' in row ? row.published ? ' · Publicado' : ' · Borrador' : ''}</small></div>
                    <div className="flex flex-wrap gap-2">{'published' in row && <button className="secondary-button" disabled={busy} onClick={() => void publish(row)}>{row.published ? 'Retirar publicación' : 'Publicar'}</button>}
                        {row.sort_order !== undefined && <><button className="secondary-button" disabled={busy} aria-label={'Subir ' + display(row)} onClick={() => void move(row, 'up')}>↑</button><button className="secondary-button" disabled={busy} aria-label={'Bajar ' + display(row)} onClick={() => void move(row, 'down')}>↓</button></>}
                        <button className="secondary-button" disabled={busy} onClick={() => void edit(row)}>Editar</button><button className="secondary-button" disabled={busy} onClick={() => void remove(row)}>Eliminar</button>
                    </div></article>)}</div>}
            {(listing.data?.last_page ?? 1) > 1 && <div className="flex items-center justify-end gap-3"><button className="secondary-button" disabled={page <= 1} onClick={() => setParams(p => { p.set('page', String(page - 1)); return p; })}>Anterior</button><span>Página {page} de {listing.data?.last_page}</span><button className="secondary-button" disabled={page >= (listing.data?.last_page ?? 1)} onClick={() => setParams(p => { p.set('page', String(page + 1)); return p; })}>Siguiente</button></div>}
        </>}
    </div>;
}
