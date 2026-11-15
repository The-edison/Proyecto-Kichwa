import { useState, type FormEvent } from 'react';
import { Copy, Layers, Users } from 'lucide-react';
import { Head, Link } from '../../navigation';
import { AppLayout } from '../../layouts/AppLayout';
import { useApi } from '../../hooks/useApi';
import { apiPost, apiPatch, ApiError } from '../../services/api';
import { EmptyState, ErrorState, LoadingState } from '../../components/States';
import type { StudentGroup } from '../../types';

export default function Groups() {
    const { data, loading, error, refresh } = useApi<{ data: StudentGroup[] }>('/admin/grupos');
    const [name, setName] = useState('');
    const [busy, setBusy] = useState<number | 'create' | null>(null);
    const [message, setMessage] = useState('');
    const [actionError, setActionError] = useState('');
    const [created, setCreated] = useState<StudentGroup | null>(null);
    async function create(event: FormEvent) {
        event.preventDefault();
        if (busy !== null) return;
        setBusy('create'); setActionError(''); setMessage('');
        try {
            const group = await apiPost<StudentGroup>('/admin/grupos', { nombre: name.trim() });
            setCreated(group); setName(''); setMessage('Grupo creado. Comparte el código con tus estudiantes.');
            await refresh();
        } catch (reason) { setActionError(reason instanceof ApiError ? reason.errors.nombre?.[0] ?? reason.message : 'No se pudo crear el grupo. Inténtalo de nuevo.'); }
        finally { setBusy(null); }
    }
    async function toggle(group: StudentGroup) {
        if (busy !== null) return;
        setBusy(group.id); setActionError(''); setMessage('');
        try {
            await apiPatch(`/admin/grupos/${group.id}`, { activo: !group.activo });
            setMessage(group.activo ? 'Grupo desactivado. Ya no admite nuevos ingresos.' : 'Grupo activado. Sus estudiantes ya pueden unirse.');
            await refresh();
        } catch (reason) { setActionError(reason instanceof ApiError ? reason.message : 'No se pudo actualizar el grupo.'); }
        finally { setBusy(null); }
    }
    async function copy(code: string) {
        try { await navigator.clipboard.writeText(code); setMessage(`Código copiado: ${code}`); setActionError(''); }
        catch { setActionError('No se pudo copiar automáticamente. Selecciona el código y cópialo manualmente.'); }
    }
    return <AppLayout title="Grupos de estudiantes" subtitle="Organiza tus cursos y filtra a sus estudiantes.">
        <Head title="Grupos" />
        <nav className="catalog-navigation" aria-label="Secciones de contenido"><Link href="/admin/contenidos"><Layers size={17} aria-hidden="true" />Niveles</Link><Link href="/admin/contenidos/grupos" className="is-active" aria-current="page"><Users size={17} aria-hidden="true" />Grupos</Link></nav>
        <section className="glass-panel groups-create" aria-labelledby="create-group-title"><span className="eyebrow">TUS CURSOS</span><h2 id="create-group-title">Crear un grupo</h2><p className="text-muted">Escribe solo el nombre. Yachay generará el código para compartir con tus estudiantes.</p>
            <form className="group-join-form" onSubmit={event => void create(event)}><label htmlFor="group-name">Nombre del grupo<input id="group-name" className="field" required maxLength={100} placeholder="Por ejemplo: Kichwa A" value={name} disabled={busy === 'create'} onChange={event => setName(event.target.value)} /></label><button className="primary-button" type="submit" disabled={busy !== null || !name.trim()}>{busy === 'create' ? 'Creando…' : 'Crear grupo'}</button></form>
            {created && <div className="group-created"><strong>{created.nombre}</strong><span>Código para compartir</span><code>{created.codigo}</code><button type="button" className="secondary-button" aria-label={`Copiar código ${created.codigo}`} onClick={() => void copy(created.codigo)}><Copy size={17} aria-hidden="true" />Copiar código</button></div>}
            <p className="text-muted group-help">Los grupos solo sirven para organizar estudiantes. Todos acceden al mismo contenido.</p>
        </section>
        {message && <p className="account-success-notice" role="status">{message}</p>}{actionError && <p className="auth-alert" role="alert">{actionError}</p>}
        <section className="glass-panel groups-list" aria-labelledby="groups-list-title"><div className="section-heading"><h2 id="groups-list-title">Mis grupos</h2><Link href="/admin/estudiantes" className="text-link">Ver estudiantes</Link></div>
            {loading ? <LoadingState label="Cargando grupos…" /> : error ? <ErrorState message={error} action={<button type="button" className="secondary-button" onClick={() => void refresh()}>Reintentar</button>} /> : !data?.data.length ? <EmptyState title="Aún no tienes grupos" description="Crea tu primer grupo para compartir su código con tus estudiantes." /> : <ul className="groups-records">{data.data.map(group => <li key={group.id}><div><h3>{group.nombre}</h3><span className={`badge ${group.activo ? 'success' : 'neutral'}`}>{group.activo ? 'Activo' : 'Inactivo'}</span></div><div className="group-code"><code>{group.codigo}</code><button type="button" className="glass-icon-button" title="Copiar código" aria-label={`Copiar código de ${group.nombre}`} onClick={() => void copy(group.codigo)}><Copy size={18} aria-hidden="true" /></button></div><Link href={`/admin/estudiantes?grupo_id=${group.id}`} className="text-link">{group.estudiantes_count} {group.estudiantes_count === 1 ? 'estudiante' : 'estudiantes'}</Link><button type="button" className="secondary-button" disabled={busy !== null} onClick={() => void toggle(group)}>{busy === group.id ? 'Actualizando…' : group.activo ? 'Desactivar' : 'Activar'}</button></li>)}</ul>}
        </section>
    </AppLayout>;
}
