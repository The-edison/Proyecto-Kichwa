import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowDown, ArrowRight, ArrowUp, BookOpen, CheckCircle2, ChevronRight, Eye, EyeOff, FilePenLine, GraduationCap, Layers, ListChecks, Pencil, Plus, Search, Target, Trash2 } from 'lucide-react';
import { Link } from '../navigation';
import { EmptyState, ErrorState, LoadingState } from './States';
import type { Level, Paginated } from '../types';

type CatalogRow = Record<string, unknown> & { id: number };
interface Props {
    resource: 'levels' | 'modules' | 'units';
    data: Paginated<CatalogRow> | null;
    loading: boolean;
    error: string | null;
    busy: boolean;
    levels: Level[];
    levelName?: string;
    moduleName?: string;
    editor: ReactNode;
    childPath: (row: CatalogRow) => string | null;
    onCreate: () => void;
    onEdit: (row: CatalogRow) => void;
    onRemove: (row: CatalogRow) => void;
    onPublish: (row: CatalogRow) => void;
    onMove: (row: CatalogRow, direction: 'up' | 'down') => void;
}

const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es');

// Reuse the catalogue layout without changing each resource's operations.
const catalogue = {
    levels: { singular: 'nivel', plural: 'Niveles', Icon: GraduationCap, step: 0, eyebrow: 'OFERTA DE APRENDIZAJE', description: 'Accede a cada nivel para administrar sus módulos.', placeholder: 'Nombre del nivel…', explore: '' },
    modules: { singular: 'módulo', plural: 'Módulos', Icon: Layers, step: 1, eyebrow: 'CONTENIDO DEL NIVEL', description: 'Abre un módulo para gestionar sus unidades y actividades.', placeholder: 'Título del módulo…', explore: 'Gestionar unidades' },
    units: { singular: 'unidad', plural: 'Unidades', Icon: BookOpen, step: 2, eyebrow: 'CONTENIDO DEL MÓDULO', description: 'Define los objetivos y administra los temas y actividades de cada unidad.', placeholder: 'Título u objetivo de la unidad…', explore: 'Gestionar temas y actividades' },
} as const;

export function AdminCatalogPanel({ resource, data, loading, error, busy, levels, levelName, moduleName, editor, childPath, onCreate, onEdit, onRemove, onPublish, onMove }: Props) {
    const [search, setSearch] = useState('');
    const [state, setState] = useState('all');
    const editorContainer = useRef<HTMLDivElement>(null);
    const hasEditor = Boolean(editor);
    const isLevel = resource === 'levels';
    const isUnit = resource === 'units';
    const settings = catalogue[resource];
    const { singular, plural, Icon } = settings;
    const rows = data?.data ?? [];
    const published = rows.filter(row => row.published === true).length;
    const drafts = rows.filter(row => row.published === false).length;
    const filtered = rows.filter(row => {
        const title = String(row.name || row.title || '');
        const searchable = isUnit ? `${title} ${String(row.description ?? '')}` : title;
        return normalize(searchable).includes(normalize(search.trim()))
            && (state === 'all' || (state === 'published' ? row.published === true : row.published === false));
    });

    // The editor remains inline; give keyboard users a clear entry and return point.
    useEffect(() => {
        if (!hasEditor) return;
        const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        const first = editorContainer.current?.querySelector<HTMLElement>('input:not(:disabled), textarea:not(:disabled), select:not(:disabled)');
        first?.focus();
        return () => { if (previous?.isConnected) previous.focus(); };
    }, [hasEditor]);

    return <section className="admin-catalog" aria-labelledby="catalog-heading">
        <div className="catalog-overview glass-panel">
            <div className="catalog-overview-copy"><span className="eyebrow">ESTRUCTURA DEL CAMPUS</span><h2>{isLevel ? 'El aprendizaje empieza aquí.' : isUnit ? 'Diseña cada paso del aprendizaje.' : `Construye el recorrido de ${levelName ?? 'este nivel'}.`}</h2><p>{isLevel ? 'Organiza los niveles y sus módulos para dar forma a una experiencia de aprendizaje clara.' : isUnit ? 'Organiza las unidades, define sus objetivos y prepara un recorrido claro para tus estudiantes.' : 'Organiza los módulos, prepara sus contenidos y decide cuándo estarán disponibles.'}</p>{isUnit && moduleName && <p className="catalog-parent-context"><Layers size={16} aria-hidden="true" /><span>{moduleName}</span></p>}<ol className="catalog-path" aria-label="Estructura del contenido">{['Niveles', 'Módulos', 'Unidades', 'Temas'].map((label, index) => <li key={label}>{index > 0 && <ChevronRight size={13} aria-hidden="true" />}<span className={index === settings.step ? 'is-current' : ''}>{label}</span></li>)}</ol></div>
            <dl className="catalog-summary"><div><dt><Icon size={18} aria-hidden="true" />{plural}</dt><dd>{loading || error ? '—' : data?.total ?? 0}<small>En este recorrido</small></dd></div><div><dt><CheckCircle2 size={18} aria-hidden="true" />Publicados</dt><dd>{loading || error ? '—' : published}<small>En esta página</small></dd></div><div><dt><FilePenLine size={18} aria-hidden="true" />Borradores</dt><dd>{loading || error ? '—' : drafts}<small>En esta página</small></dd></div></dl>
        </div>
        <div className="catalog-section-heading"><div><span className="eyebrow">{settings.eyebrow}</span><h2 id="catalog-heading">{plural} {isLevel ? 'del campus' : isUnit ? 'del módulo' : 'de aprendizaje'}</h2><p>{settings.description}</p></div><button type="button" className="primary-button" disabled={busy} onClick={onCreate}><Plus size={18} aria-hidden="true" />Crear {singular}</button></div>
        {hasEditor && <div ref={editorContainer}>{editor}</div>}
        <div className="catalog-toolbar glass-panel"><label className="catalog-search"><span>Buscar en esta página</span><div><Search size={18} aria-hidden="true" /><input type="search" value={search} maxLength={180} placeholder={settings.placeholder} disabled={loading} onChange={event => setSearch(event.target.value)} /></div></label><label className="catalog-filter"><span>Estado de publicación</span><select className="field" value={state} disabled={loading} onChange={event => setState(event.target.value)}><option value="all">Todos los estados</option><option value="published">Publicados</option><option value="draft">Borradores</option></select></label><p aria-live="polite">{loading ? 'Cargando registros…' : error ? 'No se pudo cargar el listado.' : `${filtered.length} de ${rows.length} registros visibles en esta página`}</p></div>
        {loading ? <LoadingState label={`Cargando ${plural.toLowerCase()}…`} /> : error ? <ErrorState message={error} /> : !rows.length ? <EmptyState title={`Todavía no hay ${plural.toLowerCase()}`} description="Crea el primer registro para empezar a organizar este recorrido." action={<button type="button" className="primary-button" disabled={busy} onClick={onCreate}><Plus size={18} aria-hidden="true" />Crear {singular}</button>} /> : !filtered.length ? <EmptyState title="Sin coincidencias en esta página" description="Prueba otro nombre o cambia el estado de publicación." action={<button type="button" className="secondary-button" onClick={() => { setSearch(''); setState('all'); }}>Limpiar filtros</button>} /> : <div className={`catalog-records is-${resource}`}>
            {filtered.map(row => {
                const title = String(row.name || row.title || `Registro #${row.id}`);
                const heading = isUnit ? title.replace(/^Unidad\s+\d+\s*/iu, '') : title;
                const href = childPath(row);
                const level = isLevel ? levels.find(item => item.id === row.id) : null;
                const description = String(row.description ?? '').replace(/^Objetivo (?:del módulo|de la unidad):\s*/i, '');
                const sequence = (row.config as Record<string, unknown> | undefined)?.learning_mode === 'sequence';
                const children = typeof row.children_count === 'number' ? row.children_count : level?.children_count;
                return <article key={row.id} className="catalog-record glass-panel" aria-labelledby={`catalog-record-${resource}-${row.id}`}>
                    <div className="catalog-record-main">
                        <span className={`catalog-record-icon ${isLevel || isUnit ? 'tone-0' : 'tone-1'}`} aria-hidden="true"><Icon size={26} strokeWidth={1.7} /></span>
                        <div className="catalog-record-copy">
                            <div className="catalog-record-meta">
                                <span className="eyebrow">{singular.toLocaleUpperCase('es')} {String(row.sort_order ?? row.id)}</span>
                                {'published' in row && <span className={`badge ${row.published ? 'success' : 'catalog-draft'}`}>{row.published ? <CheckCircle2 size={13} aria-hidden="true" /> : <FilePenLine size={13} aria-hidden="true" />}{row.published ? 'Publicado' : 'Borrador'}</span>}
                                {isUnit && <span className="badge catalog-learning-mode">{sequence ? <ListChecks size={13} aria-hidden="true" /> : <BookOpen size={13} aria-hidden="true" />}{sequence ? 'Secuencia guiada' : 'Recorrido por temas'}</span>}
                            </div>
                            <h3 id={`catalog-record-${resource}-${row.id}`}>{href ? <Link href={href}>{heading}{isLevel && <ArrowRight size={18} aria-hidden="true" />}</Link> : heading}</h3>
                            {description && <p className={`catalog-record-description ${isUnit ? 'catalog-unit-objective' : ''}`}>{isUnit && <span><Target size={13} aria-hidden="true" />OBJETIVO DE LA UNIDAD</span>}{description}</p>}
                            <div className="catalog-record-details"><span>ID #{row.id}</span>{row.sort_order !== undefined && <span>Orden {String(row.sort_order)}</span>}{isLevel && children !== undefined && <span><Layers size={14} aria-hidden="true" />{children} {children === 1 ? 'módulo' : 'módulos'}</span>}</div>
                            {isLevel && level?.available === false && <p className="catalog-availability">Próximamente para estudiantes</p>}
                            {!isLevel && href && <Link href={href} className="catalog-explore-link">{settings.explore} <ArrowRight size={15} aria-hidden="true" /></Link>}
                        </div>
                    </div>
                    <footer className="catalog-record-actions">
                        {'published' in row && <button type="button" className={`catalog-publish-button ${row.published ? 'is-published' : ''}`} disabled={busy} onClick={() => onPublish(row)}>{row.published ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}{row.published ? 'Retirar publicación' : 'Publicar'}</button>}
                        <div className="catalog-edit-actions">
                            {!isLevel && row.sort_order !== undefined && <div className="catalog-order-actions" role="group" aria-label={`Orden de ${title}`}><button type="button" className="glass-icon-button" disabled={busy} aria-label={`Subir ${title}`} title={`Subir ${singular}`} onClick={() => onMove(row, 'up')}><ArrowUp size={16} aria-hidden="true" /></button><button type="button" className="glass-icon-button" disabled={busy} aria-label={`Bajar ${title}`} title={`Bajar ${singular}`} onClick={() => onMove(row, 'down')}><ArrowDown size={16} aria-hidden="true" /></button></div>}
                            <button type="button" className="secondary-button" disabled={busy} aria-label={`Editar ${title}`} onClick={() => onEdit(row)}><Pencil size={15} aria-hidden="true" />Editar</button>
                            <button type="button" className="secondary-button destructive-button" disabled={busy} aria-label={`Eliminar ${title}`} onClick={() => onRemove(row)}><Trash2 size={15} aria-hidden="true" />Eliminar</button>
                        </div>
                    </footer>
                </article>;
            })}
        </div>}
    </section>;
}
