import { Head } from '@inertiajs/react';
import { useDeferredValue, useState } from 'react';
import { EmptyState, ErrorState, LoadingState } from '../../components/States';
import { useApi } from '../../hooks/useApi';
import { AppLayout } from '../../layouts/AppLayout';
import type { Paginated, Student } from '../../types';

export default function Students() {
    const [query, setQuery] = useState('');
    const deferred = useDeferredValue(query);
    const [page, setPage] = useState(1);
    const { data, loading, error } = useApi<Paginated<Student>>(`/admin/students?q=${encodeURIComponent(deferred)}&page=${page}`);

    return (
        <AppLayout title="Estudiantes" subtitle="Consulta los estudiantes registrados.">
            <Head title="Estudiantes" />
            <div className="glass-panel p-6">
                <label htmlFor="student-search" className="field-label">Buscar por nombre o cédula</label>
                <input id="student-search" type="search" className="field max-w-xl" placeholder="Nombre o cédula" value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} />
                <p className="mt-3 text-sm text-muted">{data?.total ?? 0} estudiantes encontrados</p>
            </div>
            <div className="mt-5">
                {loading ? <LoadingState /> : error ? <ErrorState message={error} /> : !data?.data.length ? (
                    <EmptyState title="Sin resultados" description="Prueba otra búsqueda." />
                ) : (
                    <div className="glass-panel overflow-x-auto">
                        <table className="w-full min-w-[620px] text-left text-sm">
                            <thead className="bg-emerald-50 text-forest"><tr><th className="p-4">Estudiante</th><th className="p-4">Cédula</th><th className="p-4">Correo</th><th className="p-4">Registro</th></tr></thead>
                            <tbody>{data.data.map((student) => (
                                <tr key={student.id} className="border-t border-emerald-100">
                                    <td className="p-4 font-bold">{student.name}</td>
                                    <td className="p-4">{student.cedula ?? 'No registrada'}</td>
                                    <td className="p-4">{student.email}</td>
                                    <td className="p-4">{new Date(student.created_at).toLocaleDateString('es-EC')}</td>
                                </tr>
                            ))}</tbody>
                        </table>
                    </div>
                )}
                {data && data.last_page > 1 && (
                    <div className="mt-5 flex items-center justify-end gap-3">
                        <button className="secondary-button" disabled={page === 1} onClick={() => setPage(page - 1)}>Anterior</button>
                        <span className="text-sm">{page} / {data.last_page}</span>
                        <button className="secondary-button" disabled={page === data.last_page} onClick={() => setPage(page + 1)}>Siguiente</button>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
