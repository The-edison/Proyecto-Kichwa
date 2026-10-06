import { useEffect, useRef, useState } from 'react';
import { ArrowLeftRight, ChevronDown, Copy, Search, X } from 'lucide-react';
import { useApi } from '../hooks/useApi';
import { useToast } from './Toast';
import { ErrorState, LoadingState } from './States';
import { Pagination } from './Pagination';
import type { Paginated, GlossaryTerm } from '../types';

export function GlossarySearch() {
    const [text, setText] = useState(''), [debounced, setDebounced] = useState('');
    const [direction, setDirection] = useState<'kichwa-es' | 'es-kichwa'>('kichwa-es');
    const [page, setPage] = useState(1);
    const input = useRef<HTMLTextAreaElement>(null);
    const toast = useToast();
    useEffect(() => {
        const timer = setTimeout(() => { setDebounced(text.trim()); setPage(1); }, 300);
        return () => clearTimeout(timer);
    }, [text]);
    const result = useApi<Paginated<GlossaryTerm>>(`/diccionario/buscar?q=${encodeURIComponent(debounced)}&direccion=${direction}&page=${page}`);
    const fromKichwa = direction === 'kichwa-es';
    const source = fromKichwa ? 'Kichwa' : 'Español';
    const target = fromKichwa ? 'Español' : 'Kichwa';
    const typing = text.trim() !== debounced;

    function changeDirection(next: 'kichwa-es' | 'es-kichwa') { setDirection(next); setPage(1); }
    function clear() { setText(''); setDebounced(''); setPage(1); input.current?.focus(); }
    async function copy(term: GlossaryTerm) {
        try { await navigator.clipboard.writeText(fromKichwa ? term.spanish : term.kichwa); toast('Resultado copiado.'); }
        catch { toast('No se pudo copiar; selecciona el texto del resultado para copiarlo.', true); }
    }

    return <div className="dictionary-workspace">
        <div className="dictionary-language-bar">
            <div className="dictionary-language-control">
                <label className="sr-only" htmlFor="dictionary-source">Idioma de origen</label>
                <select id="dictionary-source" value={source} onChange={e => changeDirection(e.target.value === 'Kichwa' ? 'kichwa-es' : 'es-kichwa')}>
                    <option>Kichwa</option><option>Español</option>
                </select><ChevronDown size={18} aria-hidden="true" />
            </div>
            <button type="button" className="dictionary-icon-button" aria-label="Intercambiar idiomas conservando el texto" title="Intercambiar idiomas" onClick={() => changeDirection(fromKichwa ? 'es-kichwa' : 'kichwa-es')}>
                <ArrowLeftRight size={22} aria-hidden="true" />
            </button>
            <div className="dictionary-language-control">
                <label className="sr-only" htmlFor="dictionary-target">Idioma de destino</label>
                <select id="dictionary-target" value={target} onChange={e => changeDirection(e.target.value === 'Español' ? 'kichwa-es' : 'es-kichwa')}>
                    <option>Español</option><option>Kichwa</option>
                </select><ChevronDown size={18} aria-hidden="true" />
            </div>
        </div>
        <div className="dictionary-panels">
            <section className="dictionary-panel dictionary-editor" aria-label={'Texto en ' + source}>
                <label htmlFor="dictionary-text" className="sr-only">Palabra o expresión en {source}</label>
                <textarea ref={input} id="dictionary-text" className="dictionary-input" maxLength={100} value={text} onChange={e => setText(e.target.value)}
                    placeholder="Escribe o pega una palabra aquí." aria-describedby="dictionary-help dictionary-limit" spellCheck={false} />
                {text && <button type="button" className="dictionary-icon-button dictionary-clear" aria-label="Limpiar búsqueda" onClick={clear}><X size={21} aria-hidden="true" /></button>}
                <div className="dictionary-editor-footer">
                    <p id="dictionary-help">Busca palabras y expresiones del diccionario Kichwa–Español.</p>
                    <span id="dictionary-limit">{text.length} / 100</span>
                </div>
            </section>
            <section className="dictionary-panel dictionary-output" aria-label={'Resultados en ' + target} aria-live="polite" aria-busy={result.loading || typing}>
                {result.loading || typing ? <LoadingState label="Buscando coincidencias…" /> : result.error ? <ErrorState message={result.error} /> :
                    !debounced ? <div className="dictionary-welcome">
                        <span className="dictionary-welcome-icon" aria-hidden="true"><Search size={27} /></span>
                        <h2>Encuentra el significado</h2>
                        <p>Escribe una palabra en {source}. Sus equivalencias en {target} aparecerán aquí.</p>
                        {!!result.data?.data.length && <div className="dictionary-suggestions">
                            <span>Prueba con una entrada</span>
                            <div>{result.data.data.slice(0, 5).map(term => <button key={term.id} type="button" onClick={() => { setText(fromKichwa ? term.kichwa : term.spanish); input.current?.focus(); }}>{fromKichwa ? term.kichwa : term.spanish}</button>)}</div>
                        </div>}
                        {!result.data?.data.length && <p className="dictionary-preparing">El docente está preparando las entradas del diccionario.</p>}
                    </div> : !result.data?.data.length ? <div className="dictionary-welcome">
                        <span className="dictionary-welcome-icon" aria-hidden="true"><Search size={27} /></span>
                        <h2>Sin coincidencias</h2><p>Prueba otra palabra o intercambia los idiomas.</p>
                    </div> : <>
                        <div className="dictionary-results-heading"><h2>{target}</h2><span>{result.data.total} {result.data.total === 1 ? 'coincidencia' : 'coincidencias'}</span></div>
                        <div className="dictionary-results">{result.data.data.map(term => <article className="dictionary-entry" key={term.id}>
                            <div className="dictionary-entry-main"><div className="min-w-0">
                                <h3>{fromKichwa ? term.spanish : term.kichwa}</h3><p className="dictionary-equivalence">{term.kichwa} <span aria-hidden="true">↔</span> {term.spanish}</p>
                            </div><button type="button" className="dictionary-icon-button shrink-0" aria-label={'Copiar ' + (fromKichwa ? term.spanish : term.kichwa)} onClick={() => void copy(term)}><Copy size={19} aria-hidden="true" /></button></div>
                            {term.synonyms && <p className="dictionary-note"><strong>Sinónimos:</strong> {term.synonyms}</p>}
                            {term.notes && <p className="dictionary-note"><strong>Notas:</strong> {term.notes}</p>}
                        </article>)}</div>
                        <Pagination page={page} lastPage={result.data.last_page} onChange={setPage} />
                    </>}
            </section>
        </div>
        <p className="dictionary-footnote">Consulta equivalencias registradas por el docente; la búsqueda no traduce documentos ni frases completas.</p>
    </div>;
}
