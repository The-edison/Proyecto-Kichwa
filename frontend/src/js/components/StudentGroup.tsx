import { useState, type FormEvent } from 'react';
import { Users } from 'lucide-react';
import { useApi } from '../hooks/useApi';
import { apiPost, apiDelete, ApiError } from '../services/api';
import { ErrorState, LoadingState } from './States';
import type { GroupMembership } from '../types';

export function StudentGroup() {
    const { data, loading, error, refresh } = useApi<GroupMembership>('/mi-grupo');
    const [code, setCode] = useState('');
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState('');
    const [actionError, setActionError] = useState('');
    async function join(event: FormEvent) {
        event.preventDefault();
        if (busy) return;
        setBusy(true); setMessage(''); setActionError('');
        try {
            const response = await apiPost<GroupMembership & { message: string }>('/mi-grupo', { codigo: code.trim().toUpperCase() });
            setMessage(response.message); setCode(''); await refresh();
        } catch (reason) { setActionError(reason instanceof ApiError ? reason.status === 429 ? 'Has realizado demasiados intentos. Espera un minuto antes de volver a ingresar el código.' : reason.errors.codigo?.[0] ?? reason.message : 'No se pudo ingresar al grupo. Inténtalo de nuevo.'); }
        finally { setBusy(false); }
    }
    async function leave() {
        if (busy || !window.confirm('¿Quieres salir de este grupo? Tu aprendizaje y tus resultados se conservarán.')) return;
        setBusy(true); setMessage(''); setActionError('');
        try { await apiDelete('/mi-grupo'); setMessage('Saliste del grupo. Puedes seguir aprendiendo o unirte a otro grupo.'); await refresh(); }
        catch (reason) { setActionError(reason instanceof ApiError ? reason.message : 'No se pudo salir del grupo.'); }
        finally { setBusy(false); }
    }
    return <section id="account-group" tabIndex={-1} className="account-card glass-panel" aria-labelledby="student-group-title"><div className="account-card-heading"><span className="stat-icon tone-1"><Users size={23} aria-hidden="true" /></span><div><span className="eyebrow">TU CURSO</span><h2 id="student-group-title">Mi grupo</h2></div></div>
        {loading ? <LoadingState label="Consultando tu grupo…" /> : error ? <ErrorState message={error} action={<button type="button" className="secondary-button" onClick={() => void refresh()}>Reintentar</button>} /> : data?.grupo ? <><div className="group-membership"><h3>{data.grupo.nombre}</h3><span className={`badge ${data.grupo.activo ? 'success' : 'neutral'}`}>{data.grupo.activo ? 'Activo' : 'Inactivo'}</span></div>{!data.grupo.activo && <p className="account-card-description">Este grupo no admite nuevos ingresos. Sigues perteneciendo a él y puedes continuar aprendiendo.</p>}<button type="button" className="secondary-button" disabled={busy} onClick={() => void leave()}>{busy ? 'Saliendo…' : 'Salir del grupo'}</button></> : <><p className="account-card-description">Unirte es opcional. Si tu profesor te dio un código, ingrésalo aquí. Puedes seguir aprendiendo sin grupo.</p><form className="group-join-form" onSubmit={event => void join(event)}><label htmlFor="student-group-code">¿Tienes un código de grupo?<input id="student-group-code" className="field" value={code} required maxLength={9} placeholder="KCH-7F3A9" autoComplete="off" autoCapitalize="characters" spellCheck={false} disabled={busy} aria-describedby={actionError ? 'student-group-error' : undefined} aria-invalid={Boolean(actionError)} onChange={event => setCode(event.target.value.toUpperCase())} /></label><button className="primary-button" type="submit" disabled={busy || !code.trim()}>{busy ? 'Ingresando…' : 'Unirme'}</button></form></>}
        {message && <p className="account-success-notice" role="status">{message}</p>}{actionError && <p id="student-group-error" className="auth-alert" role="alert">{actionError}</p>}
    </section>;
}
