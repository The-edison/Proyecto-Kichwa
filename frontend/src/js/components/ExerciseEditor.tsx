import { useState } from 'react';
import { apiPost, apiGet, ApiError } from '../services/api';
import { ExerciseInteraction, mediaUrl } from './ExerciseCard';
import type { Exercise, ExerciseElement, ExerciseSolution, ExerciseZone, ExerciseAnswer, ExerciseConfig } from '../types';

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
    return { id: 0, config: {managed: true, reviewed: false, max_selections: 1}, published: false, type, prompt: '', elements, zones: [], resource: null, sort_order: 1,
        solution: type === 'ordenar' ? {orden: []} : type === 'seleccion_multiple' ? { seleccion: [] } : type === 'completar' ? { textos: { e1: [''] } } : { pares: [] } };
}
export function ExerciseEditor({ value, onChange, errors = {}, onBusyChange }: { value: EditableExercise; onChange: (value: EditableExercise) => void; errors?: Record<string, string[]>; onBusyChange?: (busy: boolean)=>void }) {
    const [previewFeedback, setPreviewFeedback] = useState('');
    const [library, setLibrary] = useState<{kind: 'imagen' | 'audio'; items: Array<{path: string; name: string}>; page: number; last: number; choose: (path: string) => void} | null>(null);
    const [error, setError] = useState('');
    const [uploading, setUploading] = useState(false);
    const [previewAnswer, setPreviewAnswer] = useState<ExerciseAnswer>({});
    const [preview, setPreview] = useState(false);
    async function browse(kind: 'imagen' | 'audio', choose: (path: string) => void, page = 1) {
        try { const result = await apiGet<{data: Array<{path: string; name: string}>; last_page: number}>(`/admin/media?kind=${kind}&page=${page}`); setLibrary({kind, choose, items: result.data, page, last: result.last_page}); }
        catch { setError('No se pudo abrir la biblioteca.'); }
    }
    async function checkPreview() {
        setPreviewFeedback('');
        try { const result = await apiPost<{feedback: string}>('/admin/preview', {exercise: exerciseForSave(value), answer: previewAnswer}); setPreviewFeedback(result.feedback); }
        catch (reason) { setPreviewFeedback(reason instanceof ApiError ? Object.values(reason.errors).flat().join(' ') || reason.message : 'No se pudo comprobar.'); }
    }
    function configureWord(raw: string, index = 0) {
        const word=raw.trim().toLocaleUpperCase();const letters=Array.from(word);
        if (value.type === 'ordenar') {
            const elements=letters.map(texto=>({id:id('l'),texto}));
            onChange({...value,elements:[...elements].reverse(),solution:{orden:elements.map(e=>e.id)},config:{...value.config,word_target:word,presentation:'tiles'}});
        } else {
            const position=Math.max(0,Math.min(index,Math.max(0,letters.length-1)));const missing=letters[position] ?? '';
            const key=value.elements[0]?.id ?? id('e');const options=[...new Set([...(value.elements[0]?.opciones ?? []),missing].filter(Boolean))];
            onChange({...value,elements:[{...value.elements[0],id:key,texto:letters.map((letter,i)=>i===position?'_':letter).join(''),opciones:options}],solution:{textos:{[key]:[missing]}},config:{...value.config,word_target:word,missing_index:position,presentation:'letter'}});
        }
        setPreviewAnswer({});setPreviewFeedback('');
    }
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
                value.type === 'ordenar' ? {orden: value.solution.orden?.filter(id => id !== removed) ?? []} : value.type === 'completar' ? { textos: texts } : { pares: value.solution.pares?.filter(p => p.origen !== removed && p.destino !== removed) ?? [] } });
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
        ordenar: {label: 'Ordenar letras', help: 'Añade una letra por elemento. Después toca las letras en el orden correcto.', example: 'Ordena las letras para formar Wasi.', elements: 'Letras disponibles'},
        seleccion_multiple: { label: 'Seleccionar respuestas', help: 'El estudiante elige una o varias opciones. Marca todas las que sean correctas.', example: 'Selecciona la palabra que significa «agua».', elements: 'Opciones de respuesta' },
        completar: { label: 'Completar palabras o frases', help: 'El estudiante escribe la palabra que falta o la escoge de una lista.', example: 'Completa la frase con la palabra que falta.', elements: 'Frases para completar' },
        relacionar: { label: 'Relacionar palabras o imágenes', help: 'Crea dos grupos y después indica qué respuesta corresponde a cada palabra.', example: 'Relaciona cada palabra en kichwa con su significado en español.', elements: 'Palabras y respuestas para relacionar' },
        arrastrar: { label: 'Arrastrar etiquetas a zonas', help: 'El estudiante coloca cada etiqueta en una zona. Puedes usar una imagen de fondo.', example: 'Coloca cada etiqueta en la parte correcta de la imagen.', elements: 'Etiquetas para arrastrar' },
    };
    const guide = guides[value.type];
    const blockClass = 'space-y-4 rounded-2xl border border-line bg-card p-4 sm:p-5';
    function elementCard(item: ExerciseElement, index: number, position: number) {
        const label = value.type === 'seleccion_multiple' ? 'Opción' : value.type === 'completar' ? 'Frase' : value.type === 'arrastrar' ? 'Etiqueta' : item.grupo === 'destino' ? 'Respuesta' : 'Palabra';
        const siblings = value.elements.map((entry, entryIndex) => ({ entry, entryIndex })).filter(({ entry }) => value.type !== 'relacionar' || entry.grupo === item.grupo);
        const siblingPosition = siblings.findIndex(({ entryIndex }) => entryIndex === index);
        return <fieldset key={item.id} className="min-w-0 space-y-3 rounded-xl border border-line bg-card p-4">
            <legend className="px-2 text-sm font-bold text-forest">{label} {position + 1}</legend>
            {Object.entries(errors).filter(([key]) => key === `elements.${index}` || key.startsWith(`elements.${index}.`) || key === `solution.textos.${item.id}`).map(([key, messages]) => <p className="form-error" role="alert" key={key}>{messages.join(' ')}</p>)}
            <label className="grid gap-2 text-sm font-semibold">{value.config?.presentation === 'visual' ? 'Descripción para administrar la imagen' : value.type === 'completar' ? 'Frase con el espacio que debe completar' : 'Texto que verá el estudiante'}
                <input className="field" maxLength={500} placeholder={value.type === 'completar' ? 'Ejemplo: Ñuka ___ kani.' : value.type === 'seleccion_multiple' ? 'Ejemplo: Yaku' : 'Escribe una palabra o descripción'} value={item.texto} onChange={event => element(index, { texto: event.target.value })} />
            </label>
            {value.type === 'seleccion_multiple' && <label className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm font-semibold ${value.solution.seleccion?.includes(item.id) ? 'border-forest bg-positive-soft text-forest' : 'border-line'}`}>
                <input type="checkbox" checked={value.solution.seleccion?.includes(item.id) ?? false} onChange={event => onChange({ ...value, solution: { seleccion: event.target.checked ? [...(value.solution.seleccion ?? []), item.id] : value.solution.seleccion?.filter(key => key !== item.id) ?? [] } })} />Esta opción es correcta
            </label>}
            {value.type === 'completar' && <>
                <label className="grid gap-2 text-sm font-semibold">Respuesta correcta y variantes aceptadas
                    <textarea className="field min-h-24" placeholder={'Escribe una respuesta por línea.\nEjemplo: yachak'} value={value.solution.textos?.[item.id]?.join('\n') ?? ''} onChange={event => onChange({ ...value, solution: { textos: { ...value.solution.textos, [item.id]: event.target.value.split('\n') } } })} />
                    <span className="font-normal text-muted">Cada línea es una respuesta válida para esta frase.</span>
                </label>
                <details className="rounded-xl bg-positive-soft p-3"><summary className="cursor-pointer text-sm font-semibold text-forest">Ofrecer una lista de opciones (opcional)</summary>
                    <label className="mt-3 grid gap-2 text-sm">Opciones que verá el estudiante<textarea className="field" placeholder={'Una opción por línea\nyachak\nmashi'} value={item.opciones?.join('\n') ?? ''} onChange={event => element(index, { opciones: event.target.value.split('\n') })} /><span className="text-muted">Déjalo vacío para que escriba la respuesta. Si añades opciones, incluye la respuesta correcta.</span></label>
                </details>
            </>}
            <details className="rounded-xl bg-positive-soft p-3" open={item.imagen ? true : undefined}><summary className="cursor-pointer text-sm font-semibold text-forest">{item.imagen ? 'Imagen de esta opción' : 'Añadir una imagen (opcional)'}</summary>
                <label className="mt-3 grid gap-2 text-sm">PNG, JPG o WEBP; máximo 5 MB<input type="file" accept=".png,.jpg,.jpeg,.webp" disabled={uploading} onChange={event => void upload(event.target.files?.[0], 'imagen', path => element(index, { imagen: path }))} /></label>
                <button type="button" className="secondary-button mt-3" onClick={() => void browse('imagen', path => element(index, {imagen: path}))}>Elegir de la biblioteca</button>{item.imagen && <div className="mt-3 flex flex-wrap items-center gap-3"><img loading="lazy" decoding="async" src={mediaUrl(item.imagen)} alt={item.texto || 'Imagen de la opción'} className="h-24 w-24 rounded-xl object-contain" /><button type="button" className="secondary-button" onClick={() => element(index, { imagen: undefined })}>Quitar imagen</button></div>}
            </details>
            <div className="flex flex-wrap gap-2 border-t border-line pt-3">
                <button type="button" className="secondary-button" aria-label={`Subir ${label.toLowerCase()} ${position + 1}`} disabled={siblingPosition === 0} onClick={() => moveElement(index, siblings[siblingPosition - 1].entryIndex - index)}>Subir</button>
                <button type="button" className="secondary-button" aria-label={`Bajar ${label.toLowerCase()} ${position + 1}`} disabled={siblingPosition === siblings.length - 1} onClick={() => moveElement(index, siblings[siblingPosition + 1].entryIndex - index)}>Bajar</button>
                <button type="button" className="secondary-button" aria-label={`Eliminar ${label.toLowerCase()} ${position + 1}`} onClick={() => removeElement(index)}>Eliminar</button>
            </div>
        </fieldset>;
    }
    return <fieldset disabled={uploading} className="min-w-0 space-y-5">
        <section className={blockClass}>
            <h4 className="text-lg font-bold text-forest">1. Elige qué hará el estudiante</h4>
            <label className="grid gap-2 text-sm font-semibold">Tipo de actividad<select className="field" value={value.type} onChange={event => {
                const nextType = event.target.value as Exercise['type'];
                if (nextType === value.type) return;
                if ((value.elements.some(item => item.texto || item.imagen) || value.zones.length) && !confirm('Cambiar el tipo reemplazará las opciones y respuestas actuales. Se conservarán la instrucción y el audio. ¿Continuar?')) return;
                onChange({ ...newExercise(nextType), id: value.id, prompt: value.prompt, resource: value.resource, sort_order: value.sort_order });
                setPreview(false); setPreviewAnswer({});
            }}>{Object.entries(guides).map(([type, info]) => <option key={type} value={type}>{info.label}</option>)}</select></label>
            <p className="rounded-xl bg-positive-soft p-3 text-sm leading-6 text-muted">{guide.help}</p>
            {['seleccion_multiple','completar','ordenar'].includes(value.type) && <label className="grid gap-2 text-sm font-semibold">Presentación<select className="field" value={value.config?.presentation ?? ''} onChange={event=>{const config={...value.config};if(event.target.value)config.presentation=event.target.value as ExerciseConfig['presentation'];else delete config.presentation;if(config.presentation==='visual')config.requires_images=true;if(config.presentation==='letter'){config.word_target ??= '';config.missing_index ??= 0;}onChange({...value,config});}}><option value="">Interacción habitual</option>{(value.type==='seleccion_multiple' ? [['buttons','Botones de selección'],['visual','Tarjetas de imágenes sin respuestas visibles']] : value.type==='completar' ? [['letter','Letra que falta'],['writing','Respuesta escrita sin alternativas']] : [['tiles','Fichas de letras con espacios y deshacer']]).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>}
            {(value.config?.presentation==='letter' || value.config?.presentation==='tiles') && <div className="grid gap-3 sm:grid-cols-2"><label className="grid gap-2 text-sm">Palabra objetivo<input className="field" maxLength={50} value={value.config.word_target ?? ''} onChange={e=>configureWord(e.target.value,value.config?.missing_index ?? 0)}/></label>{value.config.presentation==='letter' && <label className="grid gap-2 text-sm">Posición de la letra que falta (desde 1)<input className="field" type="number" min={1} max={Array.from(value.config.word_target ?? '').length || 1} value={(value.config.missing_index ?? 0)+1} onChange={e=>configureWord(value.config?.word_target ?? '',Number(e.target.value)-1)}/></label>}<p className="text-sm text-muted sm:col-span-2">El sistema construye las fichas o deriva la letra correcta. Completa las opciones y revisa la respuesta antes de publicar.</p></div>}
            <label className="grid gap-2 text-sm font-semibold">Plantilla de interacción<select className="field" defaultValue="" onChange={event => {
                const preset = event.target.value;
                if (!preset) return;
                if (value.elements.some(e => e.texto || e.imagen) && !confirm('La plantilla reemplazará las opciones actuales. ¿Continuar?')) return;
                const type: Exercise['type'] = preset === 'opciones' || preset === 'escritura' ? 'completar' : preset === 'parejas' ? 'relacionar' : preset === 'letras' ? 'ordenar' : preset === 'zonas' ? 'arrastrar' : 'seleccion_multiple';
                const draft = newExercise(type);
                draft.config = {...draft.config, max_selections: preset === 'multiple' || preset === 'consonantes' ? 3 : 1, exact_selections: preset === 'multiple' || preset === 'consonantes', requires_audio: preset === 'audio', requires_images: preset === 'imagenes'};
                if (preset === 'opciones') draft.elements[0].opciones = [''];
                onChange({...draft,id:value.id,prompt:value.prompt,resource:value.resource,sort_order:value.sort_order}); setPreview(false);setPreviewAnswer({});setPreviewFeedback('');
            }}><option value="">Elegir plantilla</option>{[['simple','Selección simple'],['multiple','Selección múltiple'],['consonantes','Seleccionar consonantes'],['opciones','Completar con opciones'],['escritura','Escritura breve'],['parejas','Relacionar parejas'],['letras','Ordenar letras'],['zonas','Arrastrar a zonas'],['imagenes','Selección con imágenes'],['audio','Escuchar y seleccionar']].map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>
        </section>
        <section className={blockClass}>
            <h4 className="text-lg font-bold text-forest">2. Escribe la instrucción</h4>
            <label className="grid gap-2 text-sm font-semibold">¿Qué debe hacer?<textarea className="field min-h-24" maxLength={10000} placeholder={guide.example} aria-invalid={Boolean(errors.prompt)} value={value.prompt} onChange={event => onChange({ ...value, prompt: event.target.value })} /></label>
            <p className="text-sm text-muted">Ejemplo: {guide.example}</p>
            {errors.prompt && <p className="form-error" role="alert">{errors.prompt.join(' ')}</p>}
            <details className="rounded-xl bg-positive-soft p-3" open={value.resource ? true : undefined}><summary className="cursor-pointer text-sm font-semibold text-forest">Audio de apoyo (opcional)</summary>
                <label className="mt-3 grid gap-2 text-sm">MP3, WAV, OGG o M4A; máximo 10 MB<input type="file" accept=".mp3,.wav,.ogg,.m4a" disabled={uploading} onChange={event => void upload(event.target.files?.[0], 'audio', path => onChange({ ...value, resource: path }))} /></label>
                <button type="button" className="secondary-button mt-3" onClick={() => void browse('audio', path => onChange({...value, resource: path}))}>Elegir audio guardado</button>{value.resource && <div className="mt-3 space-y-2"><audio controls preload="none" className="w-full" src={mediaUrl(value.resource)} /><button className="secondary-button" type="button" onClick={() => onChange({ ...value, resource: null })}>Quitar audio</button></div>}
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
            {background && <div className="relative cursor-crosshair overflow-hidden rounded-xl border border-line" onClick={event => { const rect = event.currentTarget.getBoundingClientRect(); if (value.zones.length < 50) addZone((event.clientX - rect.left) / rect.width, (event.clientY - rect.top) / rect.height); }}>
                <img loading="lazy" decoding="async" src={mediaUrl(background)} alt="Imagen de fondo. Haz clic para añadir una zona; también puedes usar el botón Añadir zona." className="w-full" draggable={false} />
                {value.zones.map(z => <span key={z.id} className="pointer-events-none absolute rounded bg-solid-primary px-2 py-1 text-xs text-button-text" style={{ left: `${z.x * 100}%`, top: `${z.y * 100}%`, transform: 'translate(-50%, -50%)' }}>{z.texto}</span>)}
            </div>}
            <div className="grid gap-3 md:grid-cols-2">{value.zones.map((z, index) => <fieldset key={z.id} className="min-w-0 space-y-3 rounded-xl border border-line p-4">
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
            {!origins.length || !destinations.length ? <p className="rounded-xl bg-caution-soft text-caution p-3 text-sm">Primero añade {value.type === 'arrastrar' ? 'etiquetas y zonas' : 'palabras y respuestas'} en los pasos anteriores.</p> : <div className="grid gap-4 md:grid-cols-2">{origins.map((entry, index) => <label key={entry.id} className="grid gap-2 rounded-xl bg-positive-soft p-3 text-sm font-semibold">{entry.texto || `Palabra ${index + 1} (sin texto)`}<select className="field" value={value.solution.pares?.find(p => p.origen === entry.id)?.destino ?? ''} onChange={event => setPair(entry.id, event.target.value)}><option value="">Elige {value.type === 'arrastrar' ? 'la zona' : 'la respuesta'} correcta</option>{destinations.map((destination, position) => <option key={destination.id} value={destination.id}>{destination.texto || `Respuesta ${position + 1} (sin texto)`}</option>)}</select></label>)}</div>}
        </section>}
        {value.type === 'ordenar' && <section className={blockClass}><h4 className="font-bold">Secuencia correcta</h4><ExerciseInteraction exercise={value} answer={{orden: value.solution.orden ?? []}} onChange={answer => onChange({...value, solution: {orden: answer.orden ?? []}})} name="solution-order" /></section>}
        <section className={blockClass}><h4 className="font-bold">Revisión y publicación</h4>{(['context_text','context_meaning','reveal_highlight'] as const).map((key,i)=><label className="grid gap-2 text-sm" key={key}>{['Palabra de apoyo (opcional)','Significado de apoyo (opcional)','Letras que se resaltan solo después de comprobar'][i]}<input className="field" maxLength={key==='reveal_highlight'?50:500} value={value.config?.[key] ?? ''} onChange={e=>onChange({...value,config:{...value.config,[key]:e.target.value}})}/></label>)}<label className="grid gap-2">Título breve<input className="field" value={value.config?.title ?? ''} onChange={e => onChange({...value,config:{...value.config,title:e.target.value}})}/></label>
        {(['reviewed','requires_audio','requires_images','ignore_accents'] as const).map((key,i)=><label key={key} className="flex items-center gap-3"><input type="checkbox" checked={value.config?.[key] ?? false} onChange={e=>onChange({...value,config:{...value.config,managed:true,[key]:e.target.checked}})}/>{['Contenido revisado por docente','Requiere audio obligatorio','Requiere imágenes en todas las opciones','Aceptar vocales con o sin tilde (conserva Ñ)'][i]}</label>)}
        {value.type === 'seleccion_multiple' && <><label className="flex gap-3"><input type="checkbox" checked={value.config?.exact_selections ?? false} onChange={e=>onChange({...value,config:{...value.config,exact_selections:e.target.checked}})}/>Exigir exactamente la cantidad indicada</label><label className="grid gap-2">Máximo de selecciones (1 para selección simple)<input className="field" type="number" min={1} max={50} value={value.config?.max_selections ?? 50} onChange={e=>onChange({...value,config:{...value.config,max_selections:Number(e.target.value)}})}/></label></>}
        <label className="grid gap-2">Explicación después de responder<textarea className="field" value={value.config?.explanation ?? ''} onChange={e=>onChange({...value,config:{...value.config,explanation:e.target.value}})}/></label>
        <label className="grid gap-2">Dificultad<select className="field" value={value.config?.difficulty ?? 'inicial'} onChange={e=>onChange({...value,config:{...value.config,difficulty:e.target.value}})}><option value="inicial">Inicial</option><option value="medio">Media</option><option value="avanzado">Avanzada</option></select></label><p>Recompensa: 10 XP por el primer acierto elegible. Los borradores y la vista previa no conceden XP.</p></section>
        {library && <section className={blockClass} aria-label="Biblioteca multimedia"><h4 className="font-bold">Recursos guardados</h4><div className="grid gap-3 sm:grid-cols-3">{library.items.map(item=><div className="space-y-2" key={item.path}>{library.kind === 'imagen' ? <img src={mediaUrl(item.path)} alt="Recurso de la biblioteca" className="h-24 w-full object-contain"/> : <audio controls src={mediaUrl(item.path)} className="w-full"/>}<button type="button" className="secondary-button" onClick={()=>{library.choose(item.path);setLibrary(null);}}>Usar recurso</button></div>)}</div>{!library.items.length && <p>No hay recursos guardados.</p>}<div className="flex gap-2"><button type="button" disabled={library.page<=1} onClick={()=>void browse(library.kind,library.choose,library.page-1)}>Anterior</button><button type="button" disabled={library.page>=library.last} onClick={()=>void browse(library.kind,library.choose,library.page+1)}>Siguiente</button><button type="button" className="secondary-button" onClick={()=>setLibrary(null)}>Cerrar biblioteca</button></div></section>}
        {error && <p className="form-error" role="alert">{error}</p>}
        {uploading && <p className="rounded-xl bg-positive-soft p-3 text-sm" role="status">Subiendo y validando archivo…</p>}
        <section className={blockClass}><div className="grid gap-3 md:grid-cols-2">{(['correct_feedback','incorrect_feedback'] as const).map(key=><label className="grid gap-2 text-sm" key={key}>{key === 'correct_feedback' ? 'Mensaje al acertar' : 'Mensaje al equivocarse'}<textarea className="field" maxLength={2000} value={value.config?.[key] ?? ''} onChange={event=>onChange({...value,config:{...value.config,[key]:event.target.value}})} /></label>)}</div></section>
        <section className={blockClass}>
            <div className="flex flex-wrap items-center justify-between gap-3"><div><h4 className="text-lg font-bold text-forest">Revisa antes de guardar</h4><p className="mt-1 text-sm text-muted">Prueba la actividad como la verá el estudiante.</p></div>
                <button className="secondary-button" type="button" aria-expanded={preview} onClick={() => { setPreview(!preview); setPreviewAnswer({}); setPreviewFeedback(''); }}>{preview ? 'Cerrar vista previa' : 'Probar actividad'}</button>
            </div>
            {preview && <section className="space-y-4 rounded-xl border border-line bg-card p-4"><p className="eyebrow">Vista del estudiante · prueba sin guardar</p><h5 className="whitespace-pre-line font-bold">{value.prompt || 'La instrucción aparecerá aquí.'}</h5><ExerciseInteraction key={value.type} exercise={value} answer={previewAnswer} onChange={setPreviewAnswer} name="admin-preview" /><button type="button" className="primary-button" onClick={() => void checkPreview()}>Comprobar sin guardar progreso</button><p role="status">{previewFeedback}</p></section>}
        </section>
    </fieldset>;
}
