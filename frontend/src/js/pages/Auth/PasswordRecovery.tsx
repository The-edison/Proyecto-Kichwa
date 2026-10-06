import { useState, type FormEvent } from 'react';
import { PublicLayout } from '../../layouts/PublicLayout';
import { apiPost, ApiError } from '../../services/api';
import { Link } from '../../navigation';
export default function PasswordRecovery() {
    const query = new URLSearchParams(window.location.search);
    const token = query.get('token');
    const [email, setEmail] = useState(query.get('email') ?? '');
    const [password, setPassword] = useState('');
    const [confirmation, setConfirmation] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    async function submit(event: FormEvent) {
        event.preventDefault(); setBusy(true); setError('');
        try { const result = await apiPost<{ message: string }>(token ? '/auth/reset-password' : '/auth/forgot-password', { email, token, password, password_confirmation: confirmation }); setMessage(result.message); }
        catch (reason) { setError(reason instanceof ApiError ? Object.values(reason.errors).flat().join(' ') || reason.message : 'No se pudo completar.'); }
        finally { setBusy(false); }
    }
    return <PublicLayout><form onSubmit={submit} className="glass-panel mx-auto my-20 max-w-lg space-y-5 p-8"><h1 className="font-serif text-3xl">Recuperar contraseña</h1><label className="grid gap-2">Correo<input className="field" required type="email" value={email} onChange={e => setEmail(e.target.value)} /></label>{token && <><label className="grid gap-2">Nueva contraseña<input className="field" required minLength={12} type="password" autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} /></label><label className="grid gap-2">Confirmar contraseña<input className="field" required minLength={12} type="password" autoComplete="new-password" value={confirmation} onChange={e => setConfirmation(e.target.value)} /></label><p className="text-sm text-muted">12 caracteres o más, mayúsculas, minúsculas, números y símbolos.</p></>}<button className="primary-button" disabled={busy}>{token ? 'Cambiar contraseña' : 'Enviar enlace'}</button>{message && <p role="status">{message}</p>}{error && <p className="form-error" role="alert">{error}</p>}<Link href="/iniciar-sesion" className="block text-forest">Volver a iniciar sesión</Link></form></PublicLayout>;
}
