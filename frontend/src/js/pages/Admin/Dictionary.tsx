import { useRef, useState, type FormEvent } from 'react';
import { Download, Languages, Plus, Search, Upload } from 'lucide-react';
import { Head } from '../../navigation';
import { AppLayout } from '../../layouts/AppLayout';
import { useApi } from '../../hooks/useApi';
import { apiPost, ApiError } from '../../services/api';
import { ErrorState, LoadingState } from '../../components/States';
import { Pagination } from '../../components/Pagination';
import type { DictionaryTerm, Paginated } from '../../types';
import '../../../css/admin-dictionary.css';

const template = 'data:text/csv;charset=utf-8,' + encodeURIComponent('\uFEFFkichwa,español\nwasi,casa\nyura,árbol\n');

export default function Dictionary() {
    const [kichwa, setKichwa] = useState('');
    const [spanish, setSpanish] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [busy, setBusy] = useState<'word' | 'csv' | null>(null);
    const [errors, setErrors] = useState<Record<string, string[]>>({});
    const [notice, setNotice] = useState('');
    const [search, setSearch] = useState('');
    const [query, setQuery] = useState('');
    const [page, setPage] = useState(1);
    const sending = useRef(false);
    const upload = useRef<HTMLInputElement>(null);
    const words = useApi<Paginated<DictionaryTerm>>(`/admin/diccionario?page=${page}&q=${encodeURIComponent(query)}`);

    async function save(event: FormEvent, kind: 'word' | 'csv') {
        event.preventDefault();
        if (sending.current) return;
        setErrors({}); setNotice('');
        if (kind === 'csv' && (!file || !/\.csv$/i.test(file.name) || file.size > 2 * 1024 * 1024)) {
            setErrors({ file: ['Selecciona un archivo CSV de hasta 2 MB.'] });
            return;
        }
        sending.current = true; setBusy(kind);
        try {
            if (kind === 'word') {
                await apiPost<DictionaryTerm>('/admin/diccionario', { kichwa: kichwa.trim(), español: spanish.trim() });
                setKichwa(''); setSpanish(''); setNotice('Palabra añadida al diccionario.');
            } else {
                const payload = new FormData();
                payload.append('file', file!);
                const result = await apiPost<{ message: string }>('/admin/diccionario/import', payload);
                setNotice(result.message); setFile(null);
                if (upload.current) upload.current.value = '';
            }
            setPage(1); setQuery(''); setSearch('');
        } catch (reason) {
            setErrors(reason instanceof ApiError && Object.keys(reason.errors).length ? reason.errors : {
                [kind === 'word' ? 'word' : 'file']: [reason instanceof ApiError ? reason.message : 'No se pudo guardar. Conservamos los datos para que vuelvas a intentarlo.'],
            });
        } finally { sending.current = false; setBusy(null); }
    }

    return <AppLayout title="Diccionario" subtitle="Añade palabras en kichwa y sus significados en español.">
        <Head title="Administrar diccionario" />
        <div className="admin-dictionary">
            {notice && <p className="admin-dictionary-notice" role="status">{notice}</p>}
            <div className="admin-dictionary-forms">
                <form className="glass-panel admin-dictionary-card" onSubmit={event => void save(event, 'word')}>
                    <div className="admin-dictionary-heading"><span><Plus size={21} aria-hidden="true" /></span><div><h2>Añadir una palabra</h2><p>Registra una palabra o expresión con su significado.</p></div></div>
                    <fieldset disabled={busy !== null} className="grid gap-4">
                        <label className="grid gap-2" htmlFor="dictionary-kichwa">Kichwa<input id="dictionary-kichwa" required maxLength={200} value={kichwa} onChange={event => setKichwa(event.target.value)} placeholder="Ej. wasi" aria-invalid={Boolean(errors.kichwa)} aria-describedby={errors.kichwa ? 'dictionary-kichwa-error' : undefined} />{errors.kichwa && <span id="dictionary-kichwa-error" className="form-error" role="alert">{errors.kichwa.join(' ')}</span>}</label>
                        <label className="grid gap-2" htmlFor="dictionary-spanish">Español<input id="dictionary-spanish" required maxLength={250} value={spanish} onChange={event => setSpanish(event.target.value)} placeholder="Ej. casa" aria-invalid={Boolean(errors.español)} aria-describedby={errors.español ? 'dictionary-spanish-error' : undefined} />{errors.español && <span id="dictionary-spanish-error" className="form-error" role="alert">{errors.español.join(' ')}</span>}</label>
                        {errors.word && <p className="form-error" role="alert">{errors.word.join(' ')}</p>}
                        <button type="submit" className="primary-button" disabled={busy !== null || !kichwa.trim() || !spanish.trim()}><Plus size={17} aria-hidden="true" />{busy === 'word' ? 'Guardando…' : 'Añadir palabra'}</button>
                    </fieldset>
                </form>
                <form className="glass-panel admin-dictionary-card" onSubmit={event => void save(event, 'csv')}>
                    <div className="admin-dictionary-heading"><span><Upload size={21} aria-hidden="true" /></span><div><h2>Carga masiva</h2><p>Importa varias palabras desde un archivo CSV.</p></div></div>
                    <a className="admin-dictionary-template" href={template} download="plantilla-diccionario.csv"><Download size={17} aria-hidden="true" />Descargar plantilla CSV</a>
                    <label className="admin-dictionary-upload" htmlFor="dictionary-csv"><Upload size={25} aria-hidden="true" /><strong>Selecciona tu archivo</strong><span>CSV en UTF-8 · Hasta 2 MB · 10.000 palabras</span><input ref={upload} id="dictionary-csv" type="file" accept=".csv" disabled={busy !== null} onChange={event => { setFile(event.target.files?.[0] ?? null); setErrors({}); setNotice(''); }} aria-invalid={Boolean(errors.file)} aria-describedby="dictionary-csv-help" /></label>
                    <p id="dictionary-csv-help" className="text-sm text-muted">Columnas: <strong>kichwa</strong> y <strong>español</strong>. Las entradas duplicadas se omiten.</p>
                    {errors.file && <p className="form-error" role="alert">{errors.file.join(' ')}</p>}
                    <button type="submit" className="primary-button" disabled={busy !== null || !file}><Upload size={17} aria-hidden="true" />{busy === 'csv' ? 'Importando…' : 'Importar palabras'}</button>
                </form>
            </div>
            <section className="glass-panel admin-dictionary-card" aria-labelledby="dictionary-list-title">
                <div className="admin-dictionary-list-heading"><div className="admin-dictionary-heading"><span><Languages size={21} aria-hidden="true" /></span><div><h2 id="dictionary-list-title">Palabras registradas</h2><p>{words.data?.total ?? 0} {query ? 'coincidencias' : 'entradas en el diccionario'}</p></div></div>
                    <form role="search" className="admin-dictionary-search" onSubmit={event => { event.preventDefault(); setQuery(search.trim()); setPage(1); }}><input aria-label="Buscar palabras en kichwa o español" maxLength={100} value={search} placeholder="Buscar en ambos idiomas" onChange={event => setSearch(event.target.value)} /><button type="submit" className="secondary-button" aria-label="Buscar palabras"><Search size={18} aria-hidden="true" /></button></form>
                </div>
                {words.loading ? <LoadingState label="Cargando palabras…" /> : words.error ? <ErrorState message={words.error} /> : !words.data?.data.length ? <p className="py-6 text-muted">{query ? 'No se encontraron palabras.' : 'Añade la primera palabra para comenzar.'}</p> : <>
                    <div className="admin-dictionary-table"><table><thead><tr><th scope="col">Kichwa</th><th scope="col">Español</th></tr></thead><tbody>{words.data.data.map(word => <tr key={word.id}><td>{word.kichwa}</td><td>{word.español}</td></tr>)}</tbody></table></div>
                    <Pagination page={words.data.current_page} lastPage={words.data.last_page} onChange={setPage} />
                </>}
            </section>
        </div>
    </AppLayout>;
}
