import { useState, type FormEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiPost, ApiError } from '../services/api';
export function PasswordChange() {
    const { user } = useAuth();
    const [data, setData] = useState({ current_password: '', password: '', password_confirmation: '' });
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [busy, setBusy] = useState(false);
    async function submit(event: FormEvent) {
        event.preventDefault(); setBusy(true); setError('');
        try { await apiPost('/auth/change-password', data); window.location.assign(user?.role === 'admin' ? '/admin' : '/aprender'); }
        catch (reason) { setError(reason instanceof ApiError ? Object.values(reason.errors).flat().join(' ') || reason.message : 'No se pudo cambiar la contraseña.'); setBusy(false); }
    }
    async function verify() {
        setBusy(true);
        try { const result = await apiPost<{ message: string }>('/auth/verification-notification', {}); setNotice(result.message); }
        catch (reason) { setError(reason instanceof ApiError ? reason.message : 'No se pudo enviar el correo.'); }
        finally { setBusy(false); }
    }
    return <section className="glass-panel mb-6 space-y-5 p-7">
        <h2 className="font-serif text-2xl">{user?.debe_cambiar_contrasena ? 'Cambia la contraseña inicial para continuar' : 'Cambiar contraseña'}</h2>
        <form className="grid max-w-xl gap-4" onSubmit={submit}>{(['current_password', 'password', 'password_confirmation'] as const).map(key => <label key={key} className="grid gap-2">{key === 'current_password' ? 'Contraseña actual' : key === 'password' ? 'Nueva contraseña' : 'Confirmar nueva contraseña'}<input className="field" type="password" required autoComplete={key === 'current_password' ? 'current-password' : 'new-password'} minLength={key === 'current_password' ? undefined : 12} value={data[key]} onChange={event => setData({ ...data, [key]: event.target.value })} /></label>)}<p className="text-sm text-muted">Usa 12 caracteres o más, mayúsculas, minúsculas, números y símbolos.</p><button className="primary-button" disabled={busy}>Guardar contraseña</button></form>
        {!user?.debe_cambiar_contrasena && (user?.email_verified ? <p className="text-forest">Correo verificado.</p> : <button className="secondary-button" disabled={busy} onClick={verify}>Enviar correo de verificación</button>)}
        {notice && <p role="status">{notice}</p>}{error && <p className="form-error" role="alert">{error}</p>}
    </section>;
}
