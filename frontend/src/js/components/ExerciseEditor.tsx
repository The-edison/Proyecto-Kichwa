import { useState } from 'react';
import { apiPost, ApiError } from '../services/api';
import { ExerciseInteraction, mediaUrl } from './ExerciseCard';
import type { Exercise, ExerciseElement, ExerciseSolution, ExerciseZone, ExerciseAnswer } from '../types';

export interface EditableExercise extends Exercise { solution: ExerciseSolution; score?: number | string; }
const id = (prefix: string) => prefix + crypto.randomUUID().replaceAll('-', '').slice(0, 12);
export function newExercise(type: Exercise['type'] = 'seleccion_multiple'): EditableExercise {
    const elements: ExerciseElement[] = type === 'relacionar' ? [{ id: 'k1', texto: '', grupo: 'origen' }, { id: 'd1', texto: '', grupo: 'destino' }]
        : type === 'seleccion_multiple' ? [{ id: 'e1', texto: '' }, { id: 'e2', texto: '' }] : [{ id: 'e1', texto: '' }];
    return { id: 0, type, prompt: '', elements, zones: [], resource: null, sort_order: 1,
        solution: type === 'seleccion_multiple' ? { seleccion: [] } : type === 'completar' ? { textos: { e1: [''] } } : { pares: [] } };
}
export function ExerciseEditor({ value, onChange }: { value: EditableExercise; onChange: (value: EditableExercise) => void }) {
    const [error, setError] = useState('');
    const [uploading, setUploading] = useState(false);
    const [previewAnswer, setPreviewAnswer] = useState<ExerciseAnswer>({});
    const [preview, setPreview] = useState(false);
    const background = value.zones.find(z => z.imagen)?.imagen;
    const origins = value.elements.filter(e => value.type === 'arrastrar' || e.grupo === 'origen');
    const destinations = value.type === 'arrastrar' ? value.zones : value.elements.filter(e => e.grupo === 'destino');
    async function upload(file: File | undefined, kind: 'imagen' | 'audio', done: (path: string) => void) {
        if (!file) return;
        setError(''); setUploading(true);
        const data = new FormData(); data.append('kind', kind); data.append('file', file);
        try { const result = await apiPost<{ path: string }>('/admin/uploads', data); done(result.path); }
        catch (reason) { setError(reason instanceof ApiError ? Object.values(reason.errors).flat().join(' ') || reason.message : 'No se pudo subir el archivo.'); }
        finally { setUploading(false); }
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
    return <div className="space-y-5 rounded-xl border border-emerald-100 p-4">
        <label className="grid gap-2">Tipo de ejercicio<select className="field" value={value.type} onChange={e => { const next = newExercise(e.target.value as Exercise['type']); onChange({ ...next, id: value.id, prompt: value.prompt, resource: value.resource, sort_order: value.sort_order }); setPreviewAnswer({}); }}>
            <option value="seleccion_multiple">Selección múltiple</option><option value="completar">Completar</option><option value="relacionar">Relacionar palabras o imágenes</option><option value="arrastrar">Arrastrar a zonas</option>
        </select></label>
        <label className="grid gap-2">Enunciado<textarea className="field" required maxLength={10000} value={value.prompt} onChange={e => onChange({ ...value, prompt: e.target.value })} /></label>
        <label className="grid gap-2">Audio principal (MP3, WAV, OGG, M4A; máximo 10 MB)<input type="file" accept=".mp3,.wav,.ogg,.m4a" disabled={uploading} onChange={e => void upload(e.target.files?.[0], 'audio', path => onChange({ ...value, resource: path }))} /></label>
        {value.resource && <div className="space-y-2"><audio controls className="w-full" src={mediaUrl(value.resource)} /><button className="secondary-button" type="button" onClick={() => onChange({ ...value, resource: null })}>Quitar audio</button></div>}
        <h3 className="font-bold">Elementos y opciones</h3>
        {value.elements.map((e, index) => <fieldset key={e.id} className="space-y-3 rounded-xl bg-white/70 p-3"><legend className="text-sm">{e.grupo === 'destino' ? 'Destino' : 'Elemento'} {index + 1}</legend>
            <label className="grid gap-1">Texto / descripción de la imagen<input className="field" required maxLength={500} value={e.texto} onChange={event => element(index, { texto: event.target.value })} /></label>
            <label className="grid gap-1 text-sm">Imagen (PNG, JPG, WEBP; máximo 5 MB)<input type="file" accept=".png,.jpg,.jpeg,.webp" disabled={uploading} onChange={event => void upload(event.target.files?.[0], 'imagen', path => element(index, { imagen: path }))} /></label>
            {e.imagen && <div className="flex items-center gap-2"><img src={mediaUrl(e.imagen)} alt={e.texto || 'Imagen del elemento'} className="h-20 w-20 object-contain" /><button type="button" className="secondary-button" onClick={() => element(index, { imagen: undefined })}>Quitar imagen</button></div>}
            {value.type === 'seleccion_multiple' && <label className="flex gap-2"><input type="checkbox" checked={value.solution.seleccion?.includes(e.id) ?? false} onChange={event => onChange({ ...value, solution: { seleccion: event.target.checked ? [...(value.solution.seleccion ?? []), e.id] : value.solution.seleccion?.filter(key => key !== e.id) ?? [] } })} />Respuesta correcta</label>}
            {value.type === 'completar' && <><label className="grid gap-1">Respuestas aceptadas (una variante aprobada por línea)<textarea className="field" required value={value.solution.textos?.[e.id]?.join('\n') ?? ''} onChange={event => onChange({ ...value, solution: { textos: { ...value.solution.textos, [e.id]: event.target.value.split('\n') } } })} /></label>
                <label className="grid gap-1">Opciones para escoger (una por línea; vacío permite escribir)<textarea className="field" value={e.opciones?.join('\n') ?? ''} onChange={event => element(index, { opciones: event.target.value.split('\n').filter(Boolean) })} /></label></>}
            <div className="flex gap-2"><button type="button" className="secondary-button" aria-label={`Subir elemento ${index + 1}`} disabled={index === 0} onClick={() => moveElement(index, -1)}>↑</button><button type="button" className="secondary-button" aria-label={`Bajar elemento ${index + 1}`} disabled={index === value.elements.length - 1} onClick={() => moveElement(index, 1)}>↓</button><button type="button" className="secondary-button" onClick={() => removeElement(index)}>Eliminar elemento</button></div>
        </fieldset>)}
        <div className="flex flex-wrap gap-2"><button type="button" className="secondary-button" disabled={value.elements.length >= 50} onClick={() => addElement(value.type === 'relacionar' ? 'origen' : undefined)}>Añadir {value.type === 'relacionar' ? 'origen' : 'elemento'}</button>{value.type === 'relacionar' && <button type="button" className="secondary-button" disabled={value.elements.length >= 50} onClick={() => addElement('destino')}>Añadir destino</button>}</div>
        {value.type === 'arrastrar' && <section className="space-y-4"><h3 className="font-bold">Imagen y zonas del cuerpo</h3><label className="grid gap-2">Subir imagen de fondo<input type="file" accept=".png,.jpg,.jpeg,.webp" disabled={uploading} onChange={event => void upload(event.target.files?.[0], 'imagen', path => {
            if (!value.zones.length) addZone(.5, .5, path); else onChange({ ...value, zones: value.zones.map(z => ({ ...z, imagen: path })) });
        })} /></label>
            {background && <div className="relative cursor-crosshair overflow-hidden rounded-xl" onClick={event => { const rect = event.currentTarget.getBoundingClientRect(); if (value.zones.length < 50) addZone((event.clientX - rect.left) / rect.width, (event.clientY - rect.top) / rect.height); }}><img src={mediaUrl(background)} alt="Haz clic en la imagen para añadir una zona" className="w-full" />{value.zones.map(z => <span key={z.id} className="pointer-events-none absolute rounded bg-forest px-2 py-1 text-xs text-white" style={{ left: `${z.x * 100}%`, top: `${z.y * 100}%`, transform: 'translate(-50%, -50%)' }}>{z.texto}</span>)}</div>}
            <p className="text-sm text-muted">Marca las partes haciendo clic sobre la imagen y escribe sus etiquetas. Las coordenadas se adaptan al tamaño de pantalla.</p>
            {value.zones.map((z, index) => <div key={z.id} className="grid gap-2 rounded-xl border border-emerald-100 p-3"><label>Nombre de zona<input className="field" required value={z.texto} onChange={e => zone(index, { texto: e.target.value })} /></label><div className="grid grid-cols-2 gap-2">{(['x','y'] as const).map(axis => <label key={axis}>{axis.toUpperCase()} (0 a 1)<input className="field" type="number" min="0" max="1" step=".01" value={z[axis]} onChange={e => zone(index, { [axis]: Number(e.target.value) })} /></label>)}</div><button type="button" className="secondary-button" onClick={() => onChange({ ...value, zones: value.zones.filter((_, i) => i !== index), solution: { pares: value.solution.pares?.filter(p => p.destino !== z.id) ?? [] } })}>Eliminar zona</button></div>)}
            <button type="button" className="secondary-button" disabled={value.zones.length >= 50} onClick={() => addZone()}>Añadir zona</button>
        </section>}
        {(value.type === 'relacionar' || value.type === 'arrastrar') && <fieldset className="grid gap-3"><legend className="font-bold">Solución: destino correcto de cada origen</legend>{origins.map(e => <label key={e.id} className="grid gap-1">{e.texto || 'Origen sin texto'}<select className="field" required value={value.solution.pares?.find(p => p.origen === e.id)?.destino ?? ''} onChange={event => setPair(e.id, event.target.value)}><option value="">Selecciona la respuesta correcta</option>{destinations.map(d => <option key={d.id} value={d.id}>{d.texto || 'Destino sin texto'}</option>)}</select></label>)}</fieldset>}
        {error && <p className="form-error" role="alert">{error}</p>}{uploading && <p role="status">Subiendo y validando archivo…</p>}
        <button className="secondary-button" type="button" onClick={() => { setPreview(!preview); setPreviewAnswer({}); }}>{preview ? 'Cerrar vista previa' : 'Vista previa del estudiante'}</button>
        {preview && <section className="space-y-4 border-t border-emerald-100 pt-4"><h3 className="font-bold">{value.prompt}</h3><ExerciseInteraction exercise={value} answer={previewAnswer} onChange={setPreviewAnswer} name="admin-preview" /></section>}
    </div>;
}
