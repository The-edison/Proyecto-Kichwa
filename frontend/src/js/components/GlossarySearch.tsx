import { useEffect, useState } from 'react';
import { ArrowLeftRight, Copy, X } from 'lucide-react';
import { useApi } from '../hooks/useApi';
import { useToast } from './Toast';
import { EmptyState, ErrorState, LoadingState } from './States';
import { Pagination } from './Pagination';
import type { Paginated, GlossaryTerm } from '../types';
export function GlossarySearch() {
    const [text, setText] = useState(''), [debounced, setDebounced] = useState('');
    const [direction, setDirection] = useState<'kichwa-es' | 'es-kichwa'>('kichwa-es');
    const [page, setPage] = useState(1); const toast = useToast();
    useEffect(() => { const timer = setTimeout(() => { setDebounced(text.trim()); setPage(1); }, 300); return () => clearTimeout(timer); }, [text]);
    const result = useApi<Paginated<GlossaryTerm>>(`/diccionario/buscar?q=${encodeURIComponent(debounced)}&direccion=${direction}&page=${page}`);
    const fromKichwa = direction === 'kichwa-es';
    const typing = text.trim() !== debounced;
    async function copy(term: GlossaryTerm) {
        try { await navigator.clipboard.writeText(fromKichwa ? term.spanish : term.kichwa); toast('Resultado copiado.'); }
        catch { toast('No se pudo copiar; selecciona el texto del resultado para copiarlo.', true); }
    }
    return <div className="space-y-5">
        <p className="text-muted">Busca palabras y expresiones registradas por el docente. No traduce frases que todavía no estén en el diccionario.</p>
        <div className="grid items-start gap-4 md:grid-cols-[1fr_auto_1fr]">
            <section className="glass-panel space-y-4 p-5">
                <div className="flex items-center justify-between gap-3"><label htmlFor="dictionary-text" className="font-bold text-forest">{fromKichwa ? 'Kichwa' : 'Español'} · origen</label>
                    <button className="secondary-button min-h-11 min-w-11" type="button" aria-label="Limpiar búsqueda" onClick={() => { setText(''); setDebounced(''); setPage(1); }}><X size={18} /></button></div>
                <textarea id="dictionary-text" className="field min-h-56 resize-y text-lg" maxLength={100} value={text} onChange={e => setText(e.target.value)} placeholder="Escribe una palabra o expresión…" />
                <small className="text-muted">{text.length} / 100</small>
            </section>
            <button className="secondary-button mx-auto min-h-11 min-w-11 md:mt-5" type="button" aria-label="Intercambiar idiomas conservando el texto" onClick={() => { setDirection(fromKichwa ? 'es-kichwa' : 'kichwa-es'); setPage(1); }}><ArrowLeftRight size={22} /></button>
            <section className="glass-panel min-h-80 space-y-4 p-5" aria-live="polite" aria-busy={result.loading || typing}>
                <h2 className="font-bold text-forest">{fromKichwa ? 'Español' : 'Kichwa'} · destino</h2>
                {!debounced && <p className="text-muted">Escribe a la izquierda para buscar. Puedes empezar con una entrada sugerida.</p>}
                {result.loading || typing ? <LoadingState label="Buscando…" /> : result.error ? <ErrorState message={result.error} /> :
                    !result.data?.data.length ? <EmptyState title={debounced ? 'Sin coincidencias' : 'Diccionario en preparación'} description={debounced ? 'Prueba otra palabra o intercambia los idiomas.' : 'El administrador todavía no ha cargado entradas.'} /> :
                        result.data.data.map(term => <article className="space-y-3 rounded-xl border border-emerald-100 bg-white/75 p-4" key={term.id}>
                            <div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="break-words font-serif text-2xl">{fromKichwa ? term.spanish : term.kichwa}</h3><p className="mt-1 break-words text-muted">{term.kichwa} ↔ {term.spanish}</p></div>
                                <button className="secondary-button min-h-11 min-w-11 shrink-0" aria-label={'Copiar ' + (fromKichwa ? term.spanish : term.kichwa)} onClick={() => void copy(term)}><Copy size={18} /></button></div>
                            {term.synonyms && <p className="break-words text-sm"><strong>Sinónimos:</strong> {term.synonyms}</p>}
                            {term.notes && <p className="whitespace-pre-line break-words text-sm"><strong>Notas:</strong> {term.notes}</p>}
                            {!debounced && <button className="secondary-button" onClick={() => setText(fromKichwa ? term.kichwa : term.spanish)}>Buscar esta entrada</button>}
                        </article>)}
                {!!debounced && <Pagination page={page} lastPage={result.data?.last_page ?? 1} onChange={setPage} />}
            </section>
        </div>
    </div>;
}
