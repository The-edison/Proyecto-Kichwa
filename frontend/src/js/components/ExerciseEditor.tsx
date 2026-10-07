import { useState } from 'react';
import { apiPost, ApiError } from '../services/api';
import { ExerciseInteraction, mediaUrl } from './ExerciseCard';
import type { Exercise, ExerciseElement, ExerciseSolution, ExerciseZone, ExerciseAnswer } from '../types';

export interface EditableExercise extends Exercise { solution: ExerciseSolution; score?: number | string; }
export function exerciseForSave(value: EditableExercise): EditableExercise {
    return { ...value, elements: value.elements.map(item => ({ ...item,
        ...(item.opciones ? { opciones: item.opciones.map(option => option.trim()).filter(Boolean) } : {}),
    })), ...(value.type === 'completar' ? { solution: { textos: Object.fromEntries(Object.entries(value.solution.textos ?? {}).map(([key, variants]) => [key, variants.map(variant => variant.trim()).filter(Boolean)])) } } : {}) };
}
const id = (prefix: string) => prefix + crypto.randomUUID().replaceAll('-', '').slice(0, 12);
export function newExercise(type: Exercise['type'] = 'seleccion_multiple'): EditableExercise {
    const elements: ExerciseElement[] = type === 'relacionar' ? [{ id: 'k1', texto: '', grupo: 'origen' }, { id: 'd1', texto: '', grupo: 'destino' }]
        : type === 'seleccion_multiple' ? [{ id: 'e1', texto: '' }, { id: 'e2', texto: '' }] : [{ id: 'e1', texto: '' }];
    return { id: 0, type, prompt: '', elements, zones: [], resource: null, sort_order: 1,
        solution: type === 'seleccion_multiple' ? { seleccion: [] } : type === 'completar' ? { textos: { e1: [''] } } : { pares: [] } };
}
export function ExerciseEditor({ value, onChange, errors = {}, onBusyChange }: { value: EditableExercise; onChange: (value: EditableExercise) => void; errors?: Record<string, string[]>; onBusyChange?: (busy: boolean)=>void }) {
    const [error, setError] = useState('');
    const [uploading, setUploading] = useState(false);
    const [previewAnswer, setPreviewAnswer] = useState<ExerciseAnswer>({});
    const [preview, setPreview] = useState(false);
    const background = value.zones.find(z => z.imagen)?.imagen;
    const origins = value.elements.filter(e => value.type === 'arrastrar' || e.grupo === 'origen');
    const destinations = value.type === 'arrastrar' ? value.zones : value.elements.filter(e => e.grupo === 'destino');
    async function upload(file: File | undefined, kind: 'imagen' | 'audio', done: (path: string) => void) {
        if (!file) return;
        setError(''); setUploading(true); onBusyChange?.(true);
        const data = new FormData(); data.append('kind', kind); data.append('file', file);
        try { const result = await apiPost<{ path: string }>('/admin/uploads', data); done(result.path); }
        catch (reason) { setError(reason instanceof ApiError ? Object.values(reason.errors).flat().join(' ') || reason.message : 'No se pudo subir el archivo.'); }
        finally { setUploading(false); onBusyChange?.(false); }
    }
    function element(index: number, changes: Partial<ExerciseElement>) {
        onChange({ ...value, elements: value.elements.map((e, i) => i === index ? { ...e, ...changes } : e) });
    }
    function removeElement(index: number) {
        const removed = value.elements[index].id;
        const texts = { ...value.solution.textos }; delete texts[removed];
        onChange({ ...value, elements: value.elements.filter((_, i) => i !== index),
            solution: value.type === 'seleccion_multiple' ? { seleccion: value.solution.seleccion?.filter(s => s !== removed) ?? [] } :
                value.type === 'completar' ? { textos: texts } : { pares: value.solution.pares?.filter(p => p.origen !== removed && p.destino !== removed) ?? [] } });
    }
    function addElement(group?: 'origen' | 'destino') {
        const key = id('e');
        onChange({ ...value, elements: [...value.elements, { id: key, texto: '', ...(group ? { grupo: group } : {}) }],
            solution: value.type === 'completar' ? { textos: { ...value.solution.textos, [key]: [''] } } : value.solution });
    }
    function moveElement(index: number, offset: number) {
        const elements = [...value.elements]; [elements[index], elements[index + offset]] = [elements[index + offset], elements[index]];
        onChange({ ...value, elements });
    }
    function zone(index: number, changes: Partial<ExerciseZone>) {
        onChange({ ...value, zones: value.zones.map((z, i) => i === index ? { ...z, ...changes } : z) });
    }
    function addZone(x = .5, y = .5, image = background) {
        onChange({ ...value, zones: [...value.zones, { id: id('z'), texto: `Zona ${value.zones.length + 1}`, x, y, ...(image ? { imagen: image } : {}) }] });
    }
    function setPair(origin: string, destination: string) {
        onChange({ ...value, solution: { pares: [...(value.solution.pares ?? []).filter(p => p.origen !== origin), ...(destination ? [{ origen: origin, destino: destination }] : [])] } });
    }
    const guides: Record<Exercise['type'], { label: string; help: string; example: string; elements: string }> = {
        seleccion_multiple: { label: 'Seleccionar respuestas', help: 'El estudiante elige una o varias opciones. Marca todas las que sean correctas.', example: 'Selecciona la palabra que significa «agua».', elements: 'Opciones de respuesta' },
        completar: { label: 'Completar palabras o frases', help: 'El estudiante escribe la palabra que falta o la escoge de una lista.', example: 'Completa la frase con la palabra que falta.', elements: 'Frases para completar' },
        relacionar: { label: 'Relacionar palabras o imágenes', help: 'Crea dos grupos y después indica qué respuesta corresponde a cada palabra.', example: 'Relaciona cada palabra en kichwa con su significado en español.', elements: 'Palabras y respuestas para relacionar' },
        arrastrar: { label: 'Arrastrar etiquetas a zonas', help: 'El estudiante coloca cada etiqueta en una zona. Puedes usar una imagen de fondo.', example: 'Coloca cada etiqueta en la parte correcta de la imagen.', elements: 'Etiquetas para arrastrar' },
    };
    const guide = guides[value.type];
    const blockClass = 'space-y-4 rounded-2xl border border-emerald-100 bg-white/70 p-4 sm:p-5';
    function elementCard(item: ExerciseElement, index: number, position: number) {
        const label = value.type === 'seleccion_multiple' ? 'Opción' : value.type === 'completar' ? 'Frase' : value.type === 'arrastrar' ? 'Etiqueta' : item.grupo === 'destino' ? 'Respuesta' : 'Palabra';
        const siblings = value.elements.map((entry, entryIndex) => ({ entry, entryIndex })).filter(({ entry }) => value.type !== 'relacionar' || entry.grupo === item.grupo);
        const siblingPosition = siblings.findIndex(({ entryIndex }) => entryIndex === index);
        return <fieldset key={item.id} className="min-w-0 space-y-3 rounded-xl border border-emerald-100 bg-white p-4">
            <legend className="px-2 text-sm font-bold text-forest">{label} {position + 1}</legend>
            {Object.entries(errors).filter(([key]) => key === `elements.${index}` || key.startsWith(`elements.${index}.`) || key === `solution.textos.${item.id}`).map(([key, messages]) => <p className="form-error" role="alert" key={key}>{messages.join(' ')}</p>)}
            <label className="grid gap-2 text-sm font-semibold">{value.type === 'completar' ? 'Frase con el espacio que debe completar' : 'Texto que verá el estudiante'}
                <input className="field" required maxLength={500} placeholder={value.type === 'completar' ? 'Ejemplo: Ñuka ___ kani.' : value.type === 'seleccion_multiple' ? 'Ejemplo: Yaku' : 'Escribe una palabra o descripción'} value={item.texto} onChange={event => element(index, { texto: event.target.value })} />
            </label>
            {value.type === 'seleccion_multiple' && <label className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm font-semibold ${value.solution.seleccion?.includes(item.id) ? 'border-forest bg-emerald-50 text-forest' : 'border-emerald-100'}`}>
                <input type="checkbox" checked={value.solution.seleccion?.includes(item.id) ?? false} onChange={event => onChange({ ...value, solution: { seleccion: event.target.checked ? [...(value.solution.seleccion ?? []), item.id] : value.solution.seleccion?.filter(key => key !== item.id) ?? [] } })} />Esta opción es correcta
            </label>}
            {value.type === 'completar' && <>
                <label className="grid gap-2 text-sm font-semibold">Respuesta correcta y variantes aceptadas
                    <textarea className="field min-h-24" required placeholder={'Escribe una respuesta por línea.\nEjemplo: yachak'} value={value.solution.textos?.[item.id]?.join('\n') ?? ''} onChange={event => onChange({ ...value, solution: { textos: { ...value.solution.textos, [item.id]: event.target.value.split('\n') } } })} />
                    <span className="font-normal text-muted">Cada línea es una respuesta válida para esta frase.</span>
                </label>
                <details className="rounded-xl bg-emerald-50/60 p-3"><summary className="cursor-pointer text-sm font-semibold text-forest">Ofrecer una lista de opciones (opcional)</summary>
                    <label className="mt-3 grid gap-2 text-sm">Opciones que verá el estudiante<textarea className="field" placeholder={'Una opción por línea\nyachak\nmashi'} value={item.opciones?.join('\n') ?? ''} onChange={event => element(index, { opciones: event.target.value.split('\n') })} /><span className="text-muted">Déjalo vacío para que escriba la respuesta. Si añades opciones, incluye la respuesta correcta.</span></label>
                </details>
            </>}
            <details className="rounded-xl bg-emerald-50/60 p-3" open={item.imagen ? true : undefined}><summary className="cursor-pointer text-sm font-semibold text-forest">{item.imagen ? 'Imagen de esta opción' : 'Añadir una imagen (opcional)'}</summary>
                <label className="mt-3 grid gap-2 text-sm">PNG, JPG o WEBP; máximo 5 MB<input type="file" accept=".png,.jpg,.jpeg,.webp" disabled={uploading} onChange={event => void upload(event.target.files?.[0], 'imagen', path => element(index, { imagen: path }))} /></label>
                {item.imagen && <div className="mt-3 flex flex-wrap items-center gap-3"><img loading="lazy" decoding="async" src={mediaUrl(item.imagen)} alt={item.texto || 'Imagen de la opción'} className="h-24 w-24 rounded-xl object-contain" /><button type="button" className="secondary-button" onClick={() => element(index, { imagen: undefined })}>Quitar imagen</button></div>}
            </details>
            <div className="flex flex-wrap gap-2 border-t border-emerald-100 pt-3">
                <button type="button" className="secondary-button" aria-label={`Subir ${label.toLowerCase()} ${position + 1}`} disabled={siblingPosition === 0} onClick={() => moveElement(index, siblings[siblingPosition - 1].entryIndex - index)}>Subir</button>
                <button type="button" className="secondary-button" aria-label={`Bajar ${label.toLowerCase()} ${position + 1}`} disabled={siblingPosition === siblings.length - 1} onClick={() => moveElement(index, siblings[siblingPosition + 1].entryIndex - index)}>Bajar</button>
                <button type="button" className="secondary-button" aria-label={`Eliminar ${label.toLowerCase()} ${position + 1}`} onClick={() => removeElement(index)}>Eliminar</button>
            </div>
        </fieldset>;
    }
    return <div className="space-y-5">
        <section className={blockClass}>
            <h4 className="text-lg font-bold text-forest">1. Elige qué hará el estudiante</h4>
            <label className="grid gap-2 text-sm font-semibold">Tipo de actividad<select className="field" value={value.type} onChange={event => {
                const nextType = event.target.value as Exercise['type'];
                if (nextType === value.type) return;
                if ((value.elements.some(item => item.texto || item.imagen) || value.zones.length) && !confirm('Cambiar el tipo reemplazará las opciones y respuestas actuales. Se conservarán la instrucción y el audio. ¿Continuar?')) return;
                onChange({ ...newExercise(nextType), id: value.id, prompt: value.prompt, resource: value.resource, sort_order: value.sort_order });
                setPreview(false); setPreviewAnswer({});
            }}>{Object.entries(guides).map(([type, info]) => <option key={type} value={type}>{info.label}</option>)}</select></label>
            <p className="rounded-xl bg-emerald-50 p-3 text-sm leading-6 text-muted">{guide.help}</p>
        </section>
        <section className={blockClass}>
            <h4 className="text-lg font-bold text-forest">2. Escribe la instrucción</h4>
            <label className="grid gap-2 text-sm font-semibold">¿Qué debe hacer?<textarea className="field min-h-24" required maxLength={10000} placeholder={guide.example} aria-invalid={Boolean(errors.prompt)} value={value.prompt} onChange={event => onChange({ ...value, prompt: event.target.value })} /></label>
            <p className="text-sm text-muted">Ejemplo: {guide.example}</p>
            {errors.prompt && <p className="form-error" role="alert">{errors.prompt.join(' ')}</p>}
            <details className="rounded-xl bg-emerald-50/60 p-3" open={value.resource ? true : undefined}><summary className="cursor-pointer text-sm font-semibold text-forest">Audio de apoyo (opcional)</summary>
                <label className="mt-3 grid gap-2 text-sm">MP3, WAV, OGG o M4A; máximo 10 MB<input type="file" accept=".mp3,.wav,.ogg,.m4a" disabled={uploading} onChange={event => void upload(event.target.files?.[0], 'audio', path => onChange({ ...value, resource: path }))} /></label>
                {value.resource && <div className="mt-3 space-y-2"><audio controls preload="none" className="w-full" src={mediaUrl(value.resource)} /><button className="secondary-button" type="button" onClick={() => onChange({ ...value, resource: null })}>Quitar audio</button></div>}
            </details>
        </section>
        <section className={blockClass}>
            <h4 className="text-lg font-bold text-forest">3. {guide.elements}</h4>
            {value.type === 'relacionar' ? <div className="grid items-start gap-5 lg:grid-cols-2">{(['origen', 'destino'] as const).map(group => <div key={group} className="min-w-0 space-y-3">
                <div><h5 className="font-bold">{group === 'origen' ? 'Palabras para relacionar' : 'Respuestas disponibles'}</h5><p className="text-sm text-muted">{group === 'origen' ? 'Ejemplo: una palabra en kichwa.' : 'Ejemplo: su significado en español.'}</p></div>
                {value.elements.map((entry, index) => ({ entry, index })).filter(({ entry }) => entry.grupo === group).map(({ entry, index }, position) => elementCard(entry, index, position))}
                <button type="button" className="secondary-button" disabled={value.elements.length >= 50} onClick={() => addElement(group)}>{group === 'origen' ? 'Añadir palabra' : 'Añadir respuesta'}</button>
            </div>)}</div> : <><div className="grid items-start gap-4 md:grid-cols-2">{value.elements.map((entry, index) => elementCard(entry, index, index))}</div>
                <button type="button" className="secondary-button" disabled={value.elements.length >= 50} onClick={() => addElement()}>Añadir {value.type === 'seleccion_multiple' ? 'opción' : value.type === 'completar' ? 'frase' : 'etiqueta'}</button></>}
            {!value.elements.length && <p className="text-sm text-muted">Añade al menos un elemento para preparar la actividad.</p>}
            {value.type === 'seleccion_multiple' && <p className="text-sm text-muted">Marca al menos una opción correcta. Las opciones sin marcar serán respuestas incorrectas.</p>}
        </section>
        {value.type === 'arrastrar' && <section className={blockClass}>
            <h4 className="text-lg font-bold text-forest">4. Prepara las zonas de destino</h4>
            <p className="text-sm leading-6 text-muted">Sube una imagen y haz clic donde quieras colocar cada zona. También puedes crear zonas sin imagen.</p>
            <label className="grid gap-2 text-sm font-semibold">Imagen de fondo (opcional; PNG, JPG o WEBP; máximo 5 MB)<input type="file" accept=".png,.jpg,.jpeg,.webp" disabled={uploading} onChange={event => void upload(event.target.files?.[0], 'imagen', path => {
                if (!value.zones.length) addZone(.5, .5, path); else onChange({ ...value, zones: value.zones.map(z => ({ ...z, imagen: path })) });
            })} /></label>
            {background && <div className="relative cursor-crosshair overflow-hidden rounded-xl border border-emerald-100" onClick={event => { const rect = event.currentTarget.getBoundingClientRect(); if (value.zones.length < 50) addZone((event.clientX - rect.left) / rect.width, (event.clientY - rect.top) / rect.height); }}>
                <img loading="lazy" decoding="async" src={mediaUrl(background)} alt="Imagen de fondo. Haz clic para añadir una zona; también puedes usar el botón Añadir zona." className="w-full" draggable={false} />
                {value.zones.map(z => <span key={z.id} className="pointer-events-none absolute rounded bg-forest px-2 py-1 text-xs text-white" style={{ left: `${z.x * 100}%`, top: `${z.y * 100}%`, transform: 'translate(-50%, -50%)' }}>{z.texto}</span>)}
            </div>}
            <div className="grid gap-3 md:grid-cols-2">{value.zones.map((z, index) => <fieldset key={z.id} className="min-w-0 space-y-3 rounded-xl border border-emerald-100 p-4">
                <legend className="px-2 text-sm font-bold text-forest">Zona {index + 1}</legend>
                {Object.entries(errors).filter(([key]) => key === `zones.${index}` || key.startsWith(`zones.${index}.`)).map(([key, messages]) => <p key={key} className="form-error" role="alert">{messages.join(' ')}</p>)}
                <label className="grid gap-2 text-sm font-semibold">Nombre de la zona<input className="field" required maxLength={500} placeholder="Ejemplo: Cabeza" value={z.texto} onChange={event => zone(index, { texto: event.target.value })} /></label>
                <details><summary className="cursor-pointer text-sm text-forest">Ajustar posición</summary><div className="mt-3 grid grid-cols-2 gap-3">{(['x', 'y'] as const).map(axis => <label className="grid gap-2 text-sm" key={axis}>{axis === 'x' ? 'Desde la izquierda (%)' : 'Desde arriba (%)'}<input className="field" type="number" min="0" max="100" step="any" required value={z[axis] * 100} onChange={event => zone(index, { [axis]: Number(event.target.value) / 100 })} /></label>)}</div></details>
                <button type="button" className="secondary-button" onClick={() => onChange({ ...value, zones: value.zones.filter((_, i) => i !== index), solution: { pares: value.solution.pares?.filter(p => p.destino !== z.id) ?? [] } })}>Eliminar zona {index + 1}</button>
            </fieldset>)}</div>
            <button type="button" className="secondary-button" disabled={value.zones.length >= 50} onClick={() => addZone()}>Añadir zona</button>
        </section>}
        {(value.type === 'relacionar' || value.type === 'arrastrar') && <section className={blockClass}>
            <h4 className="text-lg font-bold text-forest">{value.type === 'arrastrar' ? '5' : '4'}. Indica las parejas correctas</h4>
            <p className="text-sm text-muted">Para cada {value.type === 'arrastrar' ? 'etiqueta, elige la zona' : 'palabra, elige la respuesta'} que corresponde. Esto se usará para calificar al estudiante.</p>
            {!origins.length || !destinations.length ? <p className="rounded-xl bg-amber-50 p-3 text-sm">Primero añade {value.type === 'arrastrar' ? 'etiquetas y zonas' : 'palabras y respuestas'} en los pasos anteriores.</p> : <div className="grid gap-4 md:grid-cols-2">{origins.map((entry, index) => <label key={entry.id} className="grid gap-2 rounded-xl bg-emerald-50/60 p-3 text-sm font-semibold">{entry.texto || `Palabra ${index + 1} (sin texto)`}<select className="field" required value={value.solution.pares?.find(p => p.origen === entry.id)?.destino ?? ''} onChange={event => setPair(entry.id, event.target.value)}><option value="">Elige {value.type === 'arrastrar' ? 'la zona' : 'la respuesta'} correcta</option>{destinations.map((destination, position) => <option key={destination.id} value={destination.id}>{destination.texto || `Respuesta ${position + 1} (sin texto)`}</option>)}</select></label>)}</div>}
        </section>}
        {error && <p className="form-error" role="alert">{error}</p>}
        {uploading && <p className="rounded-xl bg-emerald-50 p-3 text-sm" role="status">Subiendo y validando archivo…</p>}
        <section className={blockClass}>
            <div className="flex flex-wrap items-center justify-between gap-3"><div><h4 className="text-lg font-bold text-forest">Revisa antes de guardar</h4><p className="mt-1 text-sm text-muted">Prueba la actividad como la verá el estudiante.</p></div>
                <button className="secondary-button" type="button" aria-expanded={preview} onClick={() => { setPreview(!preview); setPreviewAnswer({}); }}>{preview ? 'Cerrar vista previa' : 'Probar actividad'}</button>
            </div>
            {preview && <section className="space-y-4 rounded-xl border border-emerald-100 bg-white p-4"><p className="eyebrow">Vista del estudiante · prueba sin guardar</p><h5 className="whitespace-pre-line font-bold">{value.prompt || 'La instrucción aparecerá aquí.'}</h5><ExerciseInteraction key={value.type} exercise={value} answer={previewAnswer} onChange={setPreviewAnswer} name="admin-preview" /></section>}
        </section>
    </div>;
}
