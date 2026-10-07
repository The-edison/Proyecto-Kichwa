import { Head } from '../../navigation';
import { useEffect, useState } from 'react';
import { EmptyState, ErrorState, LoadingState } from '../../components/States';
import { useApi } from '../../hooks/useApi';
import { AppLayout } from '../../layouts/AppLayout';
import type { Paginated, Student } from '../../types';
import { apiPatch, ApiError } from '../../services/api';
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '../../components/ui/pagination';

export default function Students() {
    const [query, setQuery] = useState('');
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    useEffect(() => {
        if (query.trim() === search) return;
        const timer = setTimeout(() => { setSearch(query.trim()); setPage(1); }, 300);
        return () => clearTimeout(timer);
    }, [query, search]);
    const { data, loading, error, refresh } = useApi<Paginated<Student>>(`/admin/students?q=${encodeURIComponent(search)}&page=${page}`);
    const [actionError, setActionError] = useState('');
    const [busy, setBusy] = useState<number | null>(null);
    const lastPage = data?.last_page ?? 1;
    const pages = Array.from(new Set([1, lastPage, ...Array.from({ length: 5 }, (_, index) => page + index - 2)]))
        .filter(number => number >= 1 && number <= lastPage).sort((a, b) => a - b);
    const searching = query.trim() !== search;
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

    return (
        <AppLayout title="Estudiantes" subtitle="Consulta los estudiantes registrados.">
            <Head title="Estudiantes" />
            <div className="glass-panel p-6">
                <label htmlFor="student-search" className="field-label">Buscar por nombre, correo o cédula</label>
                <input id="student-search" type="search" className="field max-w-xl" maxLength={100} placeholder="Nombre, correo o cédula" value={query} onChange={event => setQuery(event.target.value)} />
                <p className="mt-3 text-sm text-muted" aria-live="polite">{loading || searching ? 'Cargando estudiantes…' : data ? `${data.total} ${data.total === 1 ? 'estudiante encontrado' : 'estudiantes encontrados'}` : 'No se pudo cargar el listado.'}</p>
            </div>
            {actionError && <p className="form-error" role="alert">{actionError}</p>}
            <div className="mt-5">
                {loading || searching ? <LoadingState /> : error ? <ErrorState message={error} /> : !data?.data.length ? (
                    <EmptyState title={search ? 'Sin resultados' : 'Todavía no hay estudiantes registrados'} description={search ? 'Prueba con otro nombre, correo o cédula.' : 'Las cuentas de estudiantes aparecerán aquí cuando se registren.'} />
                ) : (
                    <div className="glass-panel overflow-x-auto">
                        <table className="w-full min-w-[620px] text-left text-sm">
                            <thead className="bg-emerald-50 text-forest"><tr><th className="p-4">Estudiante</th><th className="p-4">Cédula</th><th className="p-4">Correo</th><th className="p-4">Estado</th></tr></thead>
                            <tbody>{data.data.map((student) => (
                                <tr key={student.id} className="border-t border-emerald-100">
                                    <td className="p-4 font-bold">{student.name}</td>
                                    <td className="p-4">{student.cedula ?? 'No registrada'}</td>
                                    <td className="p-4">{student.email}</td>
                                    <td className="p-4"><span className="block">{student.state}</span><button className="secondary-button mt-2" disabled={busy !== null} onClick={() => void changeState(student)}>{student.state === 'activo' ? 'Bloquear' : 'Activar'}</button></td>
                                </tr>
                            ))}</tbody>
                        </table>
                    </div>
                )}
                {data && !loading && !searching && !error && data.total > 0 && (
                    <div className="mt-5 space-y-3">
                        <p className="text-center text-sm text-muted">Mostrando {(data.current_page - 1) * data.per_page + 1}–{Math.min(data.current_page * data.per_page, data.total)} de {data.total} estudiantes · Página {data.current_page} de {lastPage}</p>
                        {lastPage > 1 && <Pagination aria-label="Paginación de estudiantes">
                            <PaginationContent className="flex-wrap">
                                <PaginationItem><PaginationPrevious href="#" text="Anterior" aria-label="Ir a la página anterior" aria-disabled={page <= 1} tabIndex={page <= 1 ? -1 : undefined} className={page <= 1 ? 'pointer-events-none opacity-50' : ''} onClick={event => { event.preventDefault(); if (page > 1) setPage(page - 1); }} /></PaginationItem>
                                {pages.map((number, index) => <PaginationItem key={number} className="flex items-center gap-1">
                                    {index > 0 && number - pages[index - 1] > 1 && <PaginationEllipsis />}
                                    <PaginationLink href="#" aria-label={`Ir a la página ${number}`} isActive={page === number} onClick={event => { event.preventDefault(); setPage(number); }}>{number}</PaginationLink>
                                </PaginationItem>)}
                                <PaginationItem><PaginationNext href="#" text="Siguiente" aria-label="Ir a la página siguiente" aria-disabled={page >= lastPage} tabIndex={page >= lastPage ? -1 : undefined} className={page >= lastPage ? 'pointer-events-none opacity-50' : ''} onClick={event => { event.preventDefault(); if (page < lastPage) setPage(page + 1); }} /></PaginationItem>
                            </PaginationContent>
                        </Pagination>}
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
