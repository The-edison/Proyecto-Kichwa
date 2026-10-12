import { Pencil, Trash2, ChevronRight, ClipboardCheck, Layers, X, Save } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { apiDelete, apiGet, apiPatch, apiPost, ApiError } from '../services/api';
import { queryClient } from '../services/queryClient';
import { useApi } from '../hooks/useApi';
import { Link } from '../navigation';
import { EmptyState, ErrorState, LoadingState } from './States';
import { useToast } from './Toast';
import { ExerciseEditor, exerciseForSave, newExercise, type EditableExercise } from './ExerciseEditor';
import { ExerciseInteraction, answerComplete } from './ExerciseCard';
import { AdminCatalogPanel } from './AdminCatalogPanel';
import type { Level, Paginated, Exercise, ExerciseAnswer } from '../types';
type Resource = 'levels' | 'modules' | 'units' | 'contents' | 'exercises' | 'evaluations' | 'questions' | 'diccionario';
type Row = Record<string, unknown> & { id: number };
const titles: Record<Resource, string> = { levels: 'nivel', modules: 'módulo', units: 'unidad', contents: 'tema', exercises: 'ejercicio', evaluations: 'evaluación', questions: 'pregunta', diccionario: 'entrada' };
const display = (row: Row) => String(row.name || row.title || row.prompt || row.kichwa || '#' + row.id);
const base = '/admin/contenidos';
export function AdminContentManager({ levels }: { levels: Level[] }) {
    const location = useLocation(); const [params, setParams] = useSearchParams(); const toast = useToast();
    const parts = location.pathname.slice(base.length).split('/').filter(Boolean);
    const numberAfter = (key: string) => { const i = parts.indexOf(key); return i >= 0 ? Number(parts[i + 1]) : null; };
    const levelId = numberAfter('nivel'), moduleId = numberAfter('modulo'), unitId = numberAfter('unidad'), topicId = numberAfter('tema'), evaluationId = numberAfter('evaluacion');
    const levelPath = base + '/nivel/' + levelId, modulePath = levelPath + '/modulo/' + moduleId, unitPath = modulePath + '/unidad/' + unitId;
    const topicPath = unitPath + '/tema/' + topicId;
    const diagnostic = parts.includes('diagnostico'), diccionario = parts.includes('diccionario');
    const resource: Resource | null = diccionario ? 'diccionario' : evaluationId ? 'questions' : diagnostic ? 'evaluations' : topicId ? 'exercises' : unitId ? params.get('tab') === 'evaluations' ? 'evaluations' : params.get('tab') === 'exercises' ? 'exercises' : 'contents' : moduleId ? 'units' : levelId ? 'modules' : 'levels';
    const parentId = resource === 'modules' ? levelId : resource === 'units' ? moduleId : resource === 'questions' ? evaluationId : unitId;
    const page = Number(params.get('page') || 1);
    const path = resource ? `/admin/${resource}?page=${page}${parentId ? '&parent_id=' + parentId : ''}${topicId ? '&topic_id=' + topicId : ''}${diagnostic ? '&type=diagnostica' : ''}` : null;
    const listing = useApi<Paginated<Row>>(path);
    const topicEvaluations = useApi<Paginated<Row>>(topicId ? `/admin/evaluations?parent_id=${unitId}&per_page=200` : null);
    const practiceOptions = useApi<Paginated<Row>>(unitId ? `/admin/exercises?parent_id=${unitId}&per_page=200` : null);
    const lessonOptions = useApi<Paginated<Row>>(unitId ? `/admin/contents?parent_id=${unitId}&per_page=200` : null);
    const module = useApi<Row>(moduleId ? '/admin/modules/' + moduleId + '?parent_id=' + levelId : null);
    const unit = useApi<Row>(unitId ? '/admin/units/' + unitId + '?parent_id=' + moduleId : null);
    const topic = useApi<Row>(topicId ? '/admin/contents/' + topicId + '?parent_id=' + unitId : null);
    const evaluation = useApi<Row>(evaluationId ? '/admin/evaluations/' + evaluationId : null);
    const [previewQuestions, setPreviewQuestions] = useState<Exercise[]>([]);
    const [previewAnswers, setPreviewAnswers] = useState<Record<number,ExerciseAnswer>>({});
    const [previewResult, setPreviewResult] = useState<{score:number;results:Array<{question_id:number;feedback:string}>}|null>(null);
    const [form, setForm] = useState<Record<string, unknown>>({});
    const [editing, setEditing] = useState<number | null>(null);
    const [open, setOpen] = useState(false), [busy, setBusy] = useState(false);
    const [errors, setErrors] = useState<Record<string, string[]>>({});
    const exercise = resource === 'exercises' || resource === 'questions';
    useEffect(() => { setOpen(false); setEditing(null); setErrors({}); setPreviewQuestions([]); setPreviewAnswers({}); setPreviewResult(null); }, [location.pathname, params.get('tab')]);
    function begin() { setForm({ kind: 'vocabulary', score: 1, published: false, ...(resource === 'evaluations' ? {config: {managed: true, question_count: 10, pass_percentage: 80}} : {}), ...(exercise ? newExercise() : {}) }); setEditing(null); setErrors({}); setOpen(true); }
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
        if (row.published && !confirm('¿Retirar la publicación? Se conservarán respuestas, intentos y recompensas. El avance visible se calculará con las actividades publicadas.')) return;
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
        return <label className="grid gap-2">{label}{multiline ? <textarea className="field min-h-28" required={required} maxLength={maxLength} value={String(form[key] ?? '')} onChange={e => setForm({ ...form, [key]: e.target.value })} aria-invalid={Boolean(errors[key])} aria-describedby={errors[key] ? `admin-error-${key}` : undefined} /> :
            <input className="field" required={required} maxLength={maxLength} value={String(form[key] ?? '')} onChange={e => setForm({ ...form, [key]: e.target.value })} aria-invalid={Boolean(errors[key])} aria-describedby={errors[key] ? `admin-error-${key}` : undefined} />}
            {errors[key] && <span id={`admin-error-${key}`} className="form-error" role="alert">{errors[key].join(' ')}</span>}</label>;
    }
    function childPath(row: Row): string | null {
        if (resource === 'levels') return base + '/nivel/' + row.id;
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
    const catalog = resource === 'levels' || resource === 'modules' || resource === 'units';
    const editor = open && resource ? (<form noValidate={exercise} className={catalog ? "catalog-editor glass-panel space-y-4" : "glass-panel space-y-4 p-5 sm:p-6"} onSubmit={save} aria-busy={busy}>
                <div className={catalog ? "catalog-editor-heading" : ""}><div>{catalog && <span className="eyebrow">{editing ? "ACTUALIZAR CONTENIDO" : "NUEVO CONTENIDO"}</span>}<h3 className="text-2xl font-bold">{editing ? 'Editar' : 'Crear'} {titles[resource]}</h3></div>{catalog && <button type="button" className="glass-icon-button" disabled={busy} aria-label="Cerrar formulario" onClick={() => setOpen(false)}><X size={18} aria-hidden="true" /></button>}</div>
                {exercise && <p className="text-sm leading-6 text-muted">Completa los pasos, indica las respuestas correctas y prueba la actividad antes de guardarla.</p>}
                {exercise ? <ExerciseEditor onBusyChange={setBusy} errors={errors} value={form as unknown as EditableExercise} onChange={value => setForm(current => ({ ...current, ...value }))} /> :
                    diccionario ? <>{field('kichwa', 'Palabra o expresión Kichwa', false, true, 200)}{field('español', 'Equivalencia en español', false, true, 250)}</> : <>
                    {field(resource === 'levels' ? 'name' : 'title', resource === 'levels' ? 'Nombre del nivel' : 'Título', false, true, resource === 'modules' ? 150 : 180)}
                    {(resource === 'levels' || resource === 'modules' || resource === 'units') && field('description', resource === 'levels' ? 'Descripción del nivel' : resource === 'modules' ? 'Objetivo del módulo' : 'Objetivo de la unidad', true, true, 20000)}
                    {resource === 'contents' && <><label className="grid gap-2">Tipo de tema<select className="field" value={String(form.kind ?? 'vocabulary')} onChange={e => setForm({ ...form, kind: e.target.value })}><option value="vocabulary">Vocabulario</option><option value="grammar">Gramática</option><option value="culture">Cultura</option></select></label>{field('body', 'Contenido (texto plano)', true, true, 50000)}</>}
                </>}
                {resource === 'units' && <label className="catalog-unit-mode"><input type="checkbox" checked={(form.config as Record<string,unknown>)?.learning_mode==='sequence'} onChange={e=>setForm({...form,config:{learning_mode:e.target.checked?'sequence':'classic'}})}/><span><strong>Aprendizaje en secuencia</strong><small>Mostrar una introducción, actividades en secuencia y una prueba al final.</small></span></label>}
                {resource === 'evaluations' && <section className="space-y-3 rounded-xl border p-4"><label className="grid gap-2">Tema asociado<select className="field" value={Number(form.topic_id ?? 0)} onChange={e=>setForm({...form,topic_id:Number(e.target.value)||null})}><option value={0}>Evaluación general de la unidad</option>{lessonOptions.data?.data.map(t=><option value={t.id} key={t.id}>{String(t.title)}</option>)}</select></label>
                <label className="flex gap-3"><input type="checkbox" checked={Boolean((form.config as Record<string,unknown>)?.sequence_mode)} onChange={e=>setForm({...form,config:e.target.checked?{...(form.config as object),managed:true,sequence_mode:true,final:true,fixed_order:true,question_count:6,required_correct:5,pass_percentage:80,prerequisite_activities:((form.config as Record<string,unknown>)?.prerequisite_activities ?? [])}:{managed:true,sequence_mode:false,final:true,question_count:10,pass_percentage:80}})}/>Prueba corta tras siete actividades: seis preguntas, cinco aciertos y orden fijo.</label>
                {(form.config as Record<string,unknown>)?.sequence_mode ? <fieldset className="space-y-2"><legend className="font-bold">Siete actividades que desbloquean la prueba</legend><ol className="space-y-2">{((form.config as {prerequisite_activities?:number[]})?.prerequisite_activities ?? []).map((id,index,array)=><li key={id} className="flex flex-wrap items-center gap-2"><span>{index+1}. {String((practiceOptions.data?.data.find(row=>row.id===id)?.config as Record<string,unknown>)?.title ?? practiceOptions.data?.data.find(row=>row.id===id)?.prompt ?? 'Actividad #'+id)}</span>{[-1,1].map(offset=><button type="button" key={offset} className="secondary-button" disabled={index+offset<0 || index+offset>=array.length} onClick={()=>{const ordered=[...array];[ordered[index],ordered[index+offset]]=[ordered[index+offset],ordered[index]];setForm({...form,config:{...(form.config as object),prerequisite_activities:ordered}});}}>{offset<0?'Subir':'Bajar'}</button>)}</li>)}</ol>{practiceOptions.data?.data.map(row=><label className="flex gap-3" key={row.id}><input type="checkbox" checked={((form.config as {prerequisite_activities?:number[]})?.prerequisite_activities ?? []).includes(row.id)} onChange={e=>{const selected=(form.config as {prerequisite_activities?:number[]})?.prerequisite_activities ?? [];setForm({...form,config:{...(form.config as object),prerequisite_activities:e.target.checked?[...selected,row.id]:selected.filter(id=>id!==row.id)}});}}/>{String((row.config as Record<string,unknown>)?.title ?? row.prompt)}{row.published?'':' · Borrador'}</label>)}<p className="text-sm text-muted">Publica exactamente seis preguntas completas y revisadas de un punto cada una. Las siete actividades deben estar publicadas y tener sus recursos.</p></fieldset> : <>{(['question_count','pass_percentage'] as const).map((key,i)=><label className="grid gap-2" key={key}>{['Cantidad de preguntas','Porcentaje mínimo'][i]}<input className="field" type="number" min={1} max={100} value={Number((form.config as Record<string,unknown>)?.[key] ?? (i===0?10:80))} onChange={e=>setForm({...form,config:{...(form.config as object),managed:true,[key]:Number(e.target.value)}})}/></label>)}<label className="flex gap-3"><input type="checkbox" checked={Boolean((form.config as Record<string,unknown>)?.final)} onChange={e=>setForm({...form,config:{...(form.config as object),managed:true,final:e.target.checked,question_count:10,pass_percentage:80}})}/>Desafío del motor anterior: diez preguntas y 80 %.</label></>}
                </section>}
                {resource === 'questions' && <label className="grid gap-2">Puntaje máximo<input className="field" type="number" required readOnly={Boolean((evaluation.data?.config as Record<string,unknown>)?.sequence_mode)} min=".01" max="999999.99" step=".01" value={Number(form.score ?? 10)} onChange={e => setForm({ ...form, score: Number(e.target.value) })} />{errors.score && <span className="form-error">{errors.score}</span>}</label>}
                {['modules', 'units', 'contents'].includes(resource) && <p className="text-sm text-muted">Los registros nuevos se guardan como borrador. Publica después de revisar el contenido.</p>}
                {Object.entries(errors).filter(([key]) => !['title', 'description', 'body', 'kichwa', 'español', 'score'].includes(key)).map(([key, values]) => <p key={key} className="form-error" role="alert">{values.join(' ')}</p>)}
                <div className="flex flex-wrap gap-3 border-t border-line pt-4"><button className="primary-button" type="submit" disabled={busy}>{catalog && <Save size={16} aria-hidden="true" />}{busy ? 'Guardando…' : exercise ? resource === 'questions' ? 'Guardar pregunta' : 'Guardar ejercicio' : 'Guardar'}</button><button className="secondary-button" type="button" disabled={busy} onClick={() => setOpen(false)}>Cancelar</button></div>
            </form>) : null;
    return <div className="admin-content-workspace space-y-6">
        <nav aria-label="Migas de pan" className="learning-breadcrumb catalog-breadcrumb">{crumbs.map(([href, label], i) => <span key={href} className="inline-flex items-center gap-2">{i > 0 && <ChevronRight size={14} aria-hidden="true" />}{i === crumbs.length - 1 && !diagnostic && !diccionario ? <span aria-current="page">{label}</span> : <Link href={href}>{label}</Link>}</span>)}</nav>
        <nav className="catalog-navigation" aria-label="Secciones de contenido"><Link className={!diagnostic && !diccionario ? 'is-active' : ''} aria-current={resource === 'levels' ? 'page' : undefined} href={base}><Layers size={17} aria-hidden="true" />Niveles</Link><Link className={diagnostic ? 'is-active' : ''} aria-current={diagnostic ? 'page' : undefined} href={base + '/diagnostico'}><ClipboardCheck size={17} aria-hidden="true" />Diagnóstico general</Link></nav>
        {parentError ? <ErrorState message={parentError} /> : !resource ? <div className="grid gap-4 sm:grid-cols-2">{levels.map(level => <Link key={level.id} href={base + '/nivel/' + level.id} className="glass-panel card-hover p-6"><h2 className="font-serif text-3xl">{level.name}</h2><p className="mt-3">{level.children_count ?? 0} módulos</p><p className="mt-2 text-muted">{level.available ? 'Administrar contenido del Básico' : 'Estudiante: Próximamente'}</p></Link>)}</div> : <>
            {topicId && <section className="glass-panel space-y-3 p-5"><h3 className="font-bold">Banco y evaluación de esta lección</h3>{topicEvaluations.data?.data.filter(e=>Number(e.topic_id)===topicId).map(e=><Link key={e.id} className="secondary-button mr-2" href={unitPath+'/evaluacion/'+e.id}>{String(e.title)} · abrir preguntas</Link>)}<Link className="secondary-button" href={unitPath+'?tab=evaluations'}>Administrar evaluaciones de la unidad</Link></section>}
            {evaluationId && <section className="glass-panel space-y-4 p-5"><h3 className="font-bold">Revisión del banco</h3><p>Aprueba únicamente contenido que hayas revisado. Los reactivos con multimedia o configuración pendiente se conservarán en borrador.</p><div className="flex flex-wrap gap-3"><button type="button" className="primary-button" disabled={busy} onClick={async()=>{if (!confirm('Confirmo que he revisado las preguntas completas y autorizo su publicación. Los recursos pendientes no se publicarán.'))return;setBusy(true);try{const result=await apiPost<{published_count:number;pending:unknown[]}>(`/admin/evaluations/${evaluationId}/review-bank`,{confirmed:true});await listing.refresh();toast(result.published_count+' preguntas publicadas; '+result.pending.length+' pendientes.');}catch(reason){fail(reason);}finally{setBusy(false);}}}>Revisar y publicar preguntas completas</button>
            {Boolean((evaluation.data?.config as Record<string,unknown>)?.final) && !(evaluation.data?.config as Record<string,unknown>)?.sequence_mode && <button type="button" className="secondary-button" disabled={busy} onClick={async()=>{setBusy(true);try{await apiPost(`/admin/evaluations/${evaluationId}/synchronize-bank`,{});await listing.refresh();toast('Banco actualizado desde las lecciones publicadas.');}catch(reason){fail(reason);}finally{setBusy(false);}}}>Actualizar banco desde las tres lecciones</button>}
            <button type="button" className="secondary-button" disabled={busy} onClick={async()=>{setBusy(true);try{const result=await apiGet<{questions:Exercise[]}>(`/admin/evaluations/${evaluationId}/preview`);setPreviewQuestions(result.questions);setPreviewAnswers({});setPreviewResult(null);}catch(reason){fail(reason);}finally{setBusy(false);}}}>Vista previa de la evaluación</button></div>
            {!!previewQuestions.length && <div className="space-y-4"><p className="eyebrow">Prueba sin intentos, progreso ni XP</p>{previewQuestions.map((q,i)=><article key={q.id} className="space-y-3 rounded-xl border p-4"><h4 className="font-bold">{i+1}. {q.prompt}</h4><ExerciseInteraction exercise={q} answer={previewAnswers[q.id]??{}} onChange={answer=>setPreviewAnswers(old=>({...old,[q.id]:answer}))} name={'preview-'+q.id}/></article>)}<button className="primary-button" type="button" disabled={busy || previewQuestions.some(q=>!answerComplete(q,previewAnswers[q.id]??{}))} onClick={async()=>{setBusy(true);try{setPreviewResult(await apiPost(`/admin/evaluations/${evaluationId}/preview`,{answers:previewQuestions.map(q=>({question_id:q.id,answer:previewAnswers[q.id]}))}));}catch(reason){fail(reason);}finally{setBusy(false);}}}>Calificar vista previa</button><button className="secondary-button" type="button" onClick={()=>setPreviewQuestions([])}>Cerrar vista previa</button>{previewResult && <div role="status"><strong>{previewResult.score}%</strong>{previewResult.results.map(r=><p key={r.question_id}>{r.feedback}</p>)}</div>}</div>}</section>}
            {unitId && !topicId && !evaluationId && <div className="flex flex-wrap gap-2">{[['contents', 'Temas'], ['exercises', 'Actividades de la unidad'], ['evaluations', 'Evaluaciones']].map(([tab, label]) =>
                <Link key={tab} className={resource === tab ? 'primary-button' : 'secondary-button'} href={unitPath + (tab === 'contents' ? '' : '?tab=' + tab)}>{label}</Link>)}</div>}
            {!catalog && <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-serif text-2xl">{exercise ? resource === 'questions' ? 'Preguntas de la evaluación' : topicId ? 'Ejercicios del tema' : 'Actividades de la unidad' : `${listing.data?.total ?? 0} registros · ${titles[resource]}`}</h2>{exercise && <p className="mt-2 break-words text-sm text-muted">{String(topic.data?.title ?? evaluation.data?.title ?? unit.data?.title ?? '')} · {listing.data?.total ?? 0} {resource === 'questions' ? 'preguntas' : 'ejercicios'}. Añade actividades para que el estudiante practique lo aprendido.</p>}</div>
                <button className="primary-button" disabled={busy} onClick={begin}>Crear {titles[resource]}</button></div>}
            {diccionario && <label className="glass-panel grid gap-2 p-4">Importar CSV (UTF-8, máximo 2 MB)<input type="file" accept=".csv" disabled={busy} onChange={e => void importCsv(e.target.files?.[0])} /><small>Columnas: kichwa, español. El id se genera automáticamente. Se conservan los duplicados existentes.</small></label>}
            {!catalog && editor}
            {catalog ? <AdminCatalogPanel key={location.pathname} resource={resource} data={listing.data} loading={listing.loading} error={listing.error} busy={busy} levels={levels} levelName={levels.find(level => level.id === levelId)?.name} moduleName={typeof module.data?.title === 'string' ? module.data.title : undefined} editor={editor} childPath={childPath} onCreate={begin} onEdit={row => void edit(row)} onRemove={row => void remove(row)} onPublish={row => void publish(row)} onMove={(row, direction) => void move(row, direction)} /> : listing.loading ? <LoadingState /> : listing.error ? <ErrorState message={listing.error} /> : !listing.data?.data.length ?
                <EmptyState title={'Todavía no hay ' + titles[resource]} description="Crea el primer registro dentro de este recorrido." action={<button className="primary-button" onClick={begin}>Crear primer {titles[resource]}</button>} /> :
                <div className="grid gap-3">{listing.data.data.map(row => <article className="glass-panel flex flex-wrap items-center gap-3 p-4" key={row.id}>
                    <div className="min-w-0 flex-1">{childPath(row) ? <Link className="block break-words font-bold text-forest underline" href={childPath(row)!}>{display(row)}</Link> : <strong className="block break-words">{display(row)}</strong>}
                        {diccionario && <p className="break-words text-muted">{String(row.español ?? '')}</p>}
                        {row.question_count !== undefined && <p className="text-sm">{Number(row.eligible_count)} reactivos publicados válidos de {Number(row.question_count)}{row.pending_count !== undefined ? ' · ' + row.pending_count + ' pendientes' : ''}</p>}{Array.isArray(row.issues) && row.issues.map((issue,i)=><p className="text-sm text-caution" key={i}>{String(issue)}</p>)}<small className="text-muted">{['exercises','questions','evaluations'].includes(resource) ? 'Versión #' : '#'}{row.id}{row.sort_order ? ' · Orden ' + row.sort_order : ''}{'published' in row ? row.published ? ' · Publicado' : ' · Borrador' : ''}</small></div>
                    <div className="flex flex-wrap gap-2">{'published' in row && <button className="secondary-button" disabled={busy} onClick={() => void publish(row)}>{row.published ? 'Retirar publicación' : 'Publicar'}</button>}
                        {row.sort_order !== undefined && <><button className="secondary-button" disabled={busy} aria-label={'Subir ' + display(row)} onClick={() => void move(row, 'up')}>↑</button><button className="secondary-button" disabled={busy} aria-label={'Bajar ' + display(row)} onClick={() => void move(row, 'down')}>↓</button></>}
                        {['exercises','questions','evaluations'].includes(resource) && <button className="secondary-button" disabled={busy} onClick={async () => { if (!confirm('Crear una copia en borrador conservando el historial de la versión actual?')) return; setBusy(true); try { const copy = await apiPost<Row>(`/admin/${resource}/${row.id}/version`, {}); updateList([copy],undefined,true); toast('Nueva versión creada. Revísala antes de publicar.'); } catch(reason) { fail(reason); } finally { setBusy(false); } }}>Crear nueva versión</button>}
                        <button className="secondary-button" disabled={busy} onClick={() => void edit(row)}><Pencil size={16} aria-hidden="true" /> Editar</button><button className="secondary-button destructive-button" disabled={busy} onClick={() => void remove(row)}><Trash2 size={16} aria-hidden="true" /> Eliminar</button>
                    </div></article>)}</div>}
            {(listing.data?.last_page ?? 1) > 1 && <div className="flex items-center justify-end gap-3"><button className="secondary-button" disabled={page <= 1} onClick={() => setParams(p => { p.set('page', String(page - 1)); return p; })}>Anterior</button><span>Página {page} de {listing.data?.last_page}</span><button className="secondary-button" disabled={page >= (listing.data?.last_page ?? 1)} onClick={() => setParams(p => { p.set('page', String(page + 1)); return p; })}>Siguiente</button></div>}
        </>}
    </div>;
}
