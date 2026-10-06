import { useRef, useState } from 'react';
import { apiPost, ApiError, apiBaseUrl } from '../services/api';
import type { Exercise, ExerciseAnswer, ExerciseFeedback } from '../types';

export const mediaUrl = (path?: string | null) => path ? apiBaseUrl + '/api/media/' + path : undefined;
export function answerComplete(exercise: Exercise, answer: ExerciseAnswer): boolean {
    if (exercise.type === 'seleccion_multiple') return Boolean(answer.seleccion?.length);
    if (exercise.type === 'completar') return exercise.elements.every(e => Boolean(answer.textos?.[e.id]?.trim()));
    const origins = exercise.elements.filter(e => exercise.type === 'arrastrar' || e.grupo === 'origen');
    return origins.length > 0 && origins.every(e => answer.pares?.some(p => p.origen === e.id && p.destino));
}
function ElementLabel({ element }: { element: { texto: string; imagen?: string } }) {
    return <span className="flex items-center gap-3">{element.imagen && <img src={mediaUrl(element.imagen)} alt={element.texto} className="h-20 w-20 rounded-xl object-contain" />}<span>{element.texto}</span></span>;
}
export function ExerciseInteraction({ exercise, answer, onChange, name }: { exercise: Exercise; answer: ExerciseAnswer; onChange: (answer: ExerciseAnswer) => void; name: string }) {
    const [selected, setSelected] = useState('');
    const dragSource = useRef('');
    const setPair = (origin: string, destination: string) => onChange({ pares: [...(answer.pares ?? []).filter(p => p.origen !== origin), ...(destination ? [{ origen: origin, destino: destination }] : [])] });
    const origins = exercise.elements.filter(e => exercise.type === 'arrastrar' || e.grupo === 'origen');
    const destinations = exercise.type === 'arrastrar' ? exercise.zones : exercise.elements.filter(e => e.grupo === 'destino');
    const background = exercise.zones.find(z => z.imagen)?.imagen;
    const pairControls = <div className="grid gap-4">{origins.map(e => <label key={e.id} className="grid gap-2"><ElementLabel element={e} /><select className="field" aria-label={`Destino para ${e.texto}`} value={answer.pares?.find(p => p.origen === e.id)?.destino ?? ''} onChange={event => setPair(e.id, event.target.value)}><option value="">Elige el destino</option>{destinations.map(d => <option key={d.id} value={d.id}>{d.texto}</option>)}</select></label>)}</div>;
    return <div className="space-y-5">
        {exercise.resource && <audio controls preload="metadata" className="w-full" src={mediaUrl(exercise.resource)}>Tu navegador no permite audio.</audio>}
        {exercise.type === 'seleccion_multiple' ? <fieldset className="grid gap-3"><legend className="mb-2 text-sm text-muted">Selecciona una o varias opciones.</legend>{exercise.elements.map(e => <label key={e.id} className="flex cursor-pointer items-center gap-3 rounded-xl border border-emerald-100 p-3"><input type="checkbox" name={name} checked={answer.seleccion?.includes(e.id) ?? false} onChange={event => onChange({ seleccion: event.target.checked ? [...(answer.seleccion ?? []), e.id] : (answer.seleccion ?? []).filter(id => id !== e.id) })} /><ElementLabel element={e} /></label>)}</fieldset>
        : exercise.type === 'completar' ? <div className="grid gap-4">{exercise.elements.map(e => <label key={e.id} className="grid gap-2"><ElementLabel element={e} />{e.opciones?.length ? <select className="field" value={answer.textos?.[e.id] ?? ''} onChange={event => onChange({ textos: { ...answer.textos, [e.id]: event.target.value } })}><option value="">Escoge la palabra</option>{e.opciones.map(o => <option key={o}>{o}</option>)}</select> : <input className="field" maxLength={500} value={answer.textos?.[e.id] ?? ''} placeholder="Escribe la palabra que falta" onChange={event => onChange({ textos: { ...answer.textos, [e.id]: event.target.value } })} />}</label>)}</div>
        : exercise.type === 'relacionar' ? <><div className="flex flex-wrap gap-3">{destinations.map(d => <div className="rounded-xl border border-emerald-100 p-3" key={d.id}><ElementLabel element={d} /></div>)}</div>{pairControls}</>
        : <><p className="text-sm text-muted">Arrastra una etiqueta o tócala y después toca una zona. También puedes usar los selectores.</p><div className="flex flex-wrap gap-2">{origins.map(e => <button key={e.id} type="button" draggable className={selected === e.id ? 'primary-button' : 'secondary-button'} onClick={() => setSelected(e.id)} onDragStart={event => { dragSource.current = e.id; event.dataTransfer.setData('text/plain', e.id); }} onPointerDown={() => { dragSource.current = e.id; }}
            onPointerUp={event => { const zone = document.elementFromPoint(event.clientX, event.clientY)?.closest('[data-zone]')?.getAttribute('data-zone'); if (zone) { setPair(e.id, zone); setSelected(''); } }}><ElementLabel element={e} /></button>)}</div>
            <div className={background ? 'relative min-h-64 overflow-hidden rounded-xl border border-emerald-100' : 'flex flex-wrap gap-3'}>{background && <img src={mediaUrl(background)} alt="Imagen del ejercicio para ubicar las etiquetas" className="w-full" draggable={false} />}{exercise.zones.map(z => <button key={z.id} data-zone={z.id} type="button" className="rounded-xl border-2 border-forest bg-white/90 px-3 py-2 text-sm text-ink" style={background ? { position: 'absolute', left: `${z.x * 100}%`, top: `${z.y * 100}%`, transform: 'translate(-50%, -50%)', maxWidth: '45%' } : undefined} onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); const origin = e.dataTransfer.getData('text/plain') || dragSource.current; if (origins.some(o => o.id === origin)) setPair(origin, z.id); }} onClick={() => { if (selected) { setPair(selected, z.id); setSelected(''); } }}><strong>{z.texto}</strong>{answer.pares?.filter(p => p.destino === z.id).map(p => <span className="block" key={p.origen}>{origins.find(o => o.id === p.origen)?.texto}</span>)}</button>)}</div>{pairControls}</>}
    </div>;
}
export function ExerciseCard({ exercise, index }: { exercise: Exercise; index: number }) {
    const [answer, setAnswer] = useState<ExerciseAnswer>({});
    const [feedback, setFeedback] = useState<ExerciseFeedback | null>(null);
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    async function submit() {
        setBusy(true); setError('');
        try { setFeedback(await apiPost<ExerciseFeedback>(`/exercises/${exercise.id}/answer`, { answer })); }
        catch (reason) { setError(reason instanceof ApiError ? Object.values(reason.errors).flat().join(' ') || reason.message : 'No se pudo enviar la respuesta.'); }
        finally { setBusy(false); }
    }
    return <article className="glass-panel p-6"><span className="eyebrow">EJERCICIO {index + 1} · {exercise.type.replaceAll('_', ' ').toUpperCase()}</span><h3 className="my-5 text-lg font-bold">{exercise.prompt}</h3><ExerciseInteraction exercise={exercise} answer={answer} onChange={value => { setAnswer(value); setFeedback(null); }} name={`exercise-${exercise.id}`} /><button className="primary-button mt-5" type="button" disabled={!answerComplete(exercise, answer) || busy} onClick={submit}>Comprobar respuesta</button>{error && <p className="form-error" role="alert">{error}</p>}{feedback && <p role="status" className={`mt-5 rounded-xl p-4 ${feedback.is_correct ? 'bg-emerald-100' : 'bg-rose-100'}`}>{feedback.feedback}</p>}</article>;
}
