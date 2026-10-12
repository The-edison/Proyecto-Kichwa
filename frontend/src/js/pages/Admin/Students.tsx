import { Head } from '../../navigation';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Ban, ChartNoAxesCombined, CheckCircle2, Search, ShieldCheck, UserCheck, Users } from 'lucide-react';
import { EmptyState, ErrorState, LoadingState } from '../../components/States';
import { StudentResults } from '../../components/StudentResults';
import { useApi } from '../../hooks/useApi';
import { AppLayout } from '../../layouts/AppLayout';
import type { Paginated, Student, Mastery } from '../../types';
import { apiPatch, ApiError } from '../../services/api';
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '../../components/ui/pagination';

export default function Students() {
    const [params] = useSearchParams();
    const initialSearch = (params.get('q') ?? '').slice(0, 100);
    const [query, setQuery] = useState(initialSearch);
    const [search, setSearch] = useState(initialSearch);
    const [page, setPage] = useState(1);
    useEffect(() => { setQuery(initialSearch); setSearch(initialSearch); setPage(1); }, [initialSearch]);
    useEffect(() => {
        if (query.trim() === search) return;
        const timer = setTimeout(() => { setSearch(query.trim()); setPage(1); }, 300);
        return () => clearTimeout(timer);
    }, [query, search]);
    const { data, loading, error, refresh } = useApi<Paginated<Student>>(`/admin/students?q=${encodeURIComponent(search)}&page=${page}`);
    const [actionError, setActionError] = useState('');
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
    const results = useApi<Mastery>(selectedStudent ? '/admin/learning-results/' + selectedStudent.id : null);
    const [busy, setBusy] = useState<number | null>(null);
    const [stateFilter, setStateFilter] = useState('all');
    const [sort, setSort] = useState('original');
    const visibleStudents = (data?.data ?? []).filter(student => stateFilter === 'all' || student.state === stateFilter);
    if (sort !== 'original') visibleStudents.sort((a, b) => (sort === 'email' ? a.email.localeCompare(b.email, 'es') : a.name.localeCompare(b.name, 'es')) * (sort === 'name-desc' ? -1 : 1));
    const lastPage = data?.last_page ?? 1;
    const pages = Array.from(new Set([1, lastPage, ...Array.from({ length: 5 }, (_, index) => page + index - 2)]))
        .filter(number => number >= 1 && number <= lastPage).sort((a, b) => a - b);
    const searching = query.trim() !== search;
    const pending = loading || searching;
    const active = data?.data.filter(student => student.state === 'activo').length ?? 0;
    const blocked = data?.data.filter(student => student.state === 'bloqueado').length ?? 0;
    useEffect(() => {
        if (data && page > data.last_page) setPage(Math.max(1, data.last_page));
    }, [data, page]);
    async function changeState(student: Student) {
        const state = student.state === 'activo' ? 'bloqueado' : 'activo';
        if (!window.confirm(`¿${state === 'bloqueado' ? 'Bloquear' : 'Activar'} a ${student.name}?`)) return;
        setBusy(student.id); setActionError('');
        try { await apiPatch(`/admin/students/${student.id}`, { state }); await refresh(); }
        catch (reason) { setActionError(reason instanceof ApiError ? reason.message : 'No se pudo cambiar el estado.'); }
        finally { setBusy(null); }
    }

    return <AppLayout title="Estudiantes" subtitle="Acompaña a tu comunidad y consulta su aprendizaje.">
        <Head title="Estudiantes" />
        <section className="student-directory-overview glass-panel" aria-labelledby="student-community-heading"><div><span className="eyebrow">COMUNIDAD YACHAY</span><h2 id="student-community-heading">Cada estudiante, un nuevo recorrido.</h2><p>Encuentra una cuenta, consulta sus avances y administra su acceso al campus.</p></div><dl className="catalog-summary"><div><dt><Users size={18} aria-hidden="true" />{search ? 'Encontrados' : 'Estudiantes'}</dt><dd>{pending || error ? '—' : data?.total ?? 0}<small>{search ? 'Con esta búsqueda' : 'Cuentas registradas'}</small></dd></div><div><dt><UserCheck size={18} aria-hidden="true" />Activos</dt><dd>{pending || error ? '—' : active}<small>En esta página</small></dd></div><div><dt><Ban size={18} aria-hidden="true" />Bloqueados</dt><dd>{pending || error ? '—' : blocked}<small>En esta página</small></dd></div></dl></section>
        <section className="student-directory glass-panel" aria-labelledby="student-directory-heading">
            <div className="student-directory-heading"><div><span className="eyebrow">GESTIÓN DE ESTUDIANTES</span><h2 id="student-directory-heading">Directorio del campus</h2></div><span className="badge neutral">Página {page} de {lastPage}</span></div>
            <div className="student-directory-toolbar">
                <label className="catalog-search" htmlFor="student-search"><span>Buscar por nombre, correo o cédula</span><div><Search size={18} aria-hidden="true" /><input id="student-search" type="search" maxLength={100} placeholder="Nombre, correo o cédula…" value={query} onChange={event => setQuery(event.target.value)} /></div></label>
                <label className="catalog-filter"><span>Estado en esta página</span><select className="field" value={stateFilter} onChange={event => setStateFilter(event.target.value)}><option value="all">Todos los estados</option><option value="activo">Activos</option><option value="bloqueado">Bloqueados</option></select></label>
                <label className="catalog-filter"><span>Orden en esta página</span><select className="field" value={sort} onChange={event => setSort(event.target.value)}><option value="original">Orden original</option><option value="name-asc">Nombre: A–Z</option><option value="name-desc">Nombre: Z–A</option><option value="email">Correo: A–Z</option></select></label>
                <p className="student-directory-status" aria-live="polite">{pending ? 'Cargando estudiantes…' : error ? 'No se pudo cargar el listado.' : `${data?.total ?? 0} ${data?.total === 1 ? 'estudiante encontrado' : 'estudiantes encontrados'} · ${visibleStudents.length} visibles en esta página`}</p>
            </div>
            {actionError && <p className="auth-alert m-5" role="alert">{actionError}</p>}
            {pending ? <div className="directory-state"><LoadingState label="Cargando estudiantes…" /></div> : error ? <div className="directory-state"><ErrorState message={error} /></div> : !data?.data.length ? <div className="directory-state"><EmptyState title={search ? 'Sin resultados' : 'Todavía no hay estudiantes registrados'} description={search ? 'Prueba con otro nombre, correo o cédula.' : 'Las cuentas de estudiantes aparecerán aquí cuando se registren.'} /></div> : !visibleStudents.length ? <div className="directory-state"><EmptyState title="Sin coincidencias en esta página" description="Selecciona otro estado o consulta la siguiente página." action={<button type="button" className="secondary-button" onClick={() => setStateFilter('all')}>Mostrar todos los estados</button>} /></div> : <div className="student-directory-scroll">
                <ul className="student-directory-list" aria-label="Estudiantes registrados">{visibleStudents.map(student => <li key={student.id}>
                    <article className="student-directory-row" aria-labelledby={`directory-student-${student.id}`}>
                        <header><span className="directory-card-avatar" aria-hidden="true">{student.name.slice(0, 1).toUpperCase()}</span><div><span className="eyebrow">ESTUDIANTE · #{student.id}</span><h3 id={`directory-student-${student.id}`}>{student.name}</h3></div><span className={`badge ${student.state === 'activo' ? 'success' : 'catalog-draft'}`}>{student.state === 'activo' ? <CheckCircle2 size={13} aria-hidden="true" /> : <Ban size={13} aria-hidden="true" />}{student.state === 'activo' ? 'Activo' : 'Bloqueado'}</span></header>
                        <dl><div><dt>Correo electrónico</dt><dd>{student.email}</dd></div><div><dt>Cédula</dt><dd>{student.cedula ?? 'No registrada'}</dd></div></dl>
                        <footer><button type="button" className="primary-button" aria-label={`Ver progreso de ${student.name}`} onClick={() => setSelectedStudent(student)}><ChartNoAxesCombined size={17} aria-hidden="true" />Ver progreso</button><button type="button" className={`ghost-button ${student.state === 'activo' ? 'directory-block-button' : ''}`} disabled={busy !== null} aria-label={`${student.state === 'activo' ? 'Bloquear' : 'Activar'} a ${student.name}`} onClick={() => void changeState(student)}>{student.state === 'activo' ? <Ban size={16} aria-hidden="true" /> : <ShieldCheck size={16} aria-hidden="true" />}{busy === student.id ? 'Actualizando…' : student.state === 'activo' ? 'Bloquear' : 'Activar'}</button></footer>
                    </article>
                </li>)}</ul>
            </div>}
            {data && !pending && !error && data.total > 0 && <footer className="student-directory-footer"><p>Mostrando {(data.current_page - 1) * data.per_page + 1}–{Math.min(data.current_page * data.per_page, data.total)} de {data.total} estudiantes · Página {data.current_page} de {lastPage}</p>
                {lastPage > 1 && <Pagination aria-label="Paginación de estudiantes"><PaginationContent className="flex-wrap">
                    <PaginationItem><PaginationPrevious href="#" text="Anterior" aria-label="Ir a la página anterior" aria-disabled={page <= 1} tabIndex={page <= 1 ? -1 : undefined} className={page <= 1 ? 'pointer-events-none opacity-50' : ''} onClick={event => { event.preventDefault(); if (page > 1) setPage(page - 1); }} /></PaginationItem>
                    {pages.map((number, index) => <PaginationItem key={number} className="flex items-center gap-1">{index > 0 && number - pages[index - 1] > 1 && <PaginationEllipsis />}<PaginationLink href="#" aria-label={`Ir a la página ${number}`} isActive={page === number} onClick={event => { event.preventDefault(); setPage(number); }}>{number}</PaginationLink></PaginationItem>)}
                    <PaginationItem><PaginationNext href="#" text="Siguiente" aria-label="Ir a la página siguiente" aria-disabled={page >= lastPage} tabIndex={page >= lastPage ? -1 : undefined} className={page >= lastPage ? 'pointer-events-none opacity-50' : ''} onClick={event => { event.preventDefault(); if (page < lastPage) setPage(page + 1); }} /></PaginationItem>
                </PaginationContent></Pagination>}
            </footer>}
        </section>
        {selectedStudent && <StudentResults student={selectedStudent} data={results.data} loading={results.loading} error={results.error} onClose={() => setSelectedStudent(null)} />}
    </AppLayout>;
}
