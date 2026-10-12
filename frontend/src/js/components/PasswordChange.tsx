import { useState, type FormEvent } from 'react';
import { CheckCircle2, KeyRound, LockKeyhole, Mail, Send, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { apiPost, ApiError } from '../services/api';
import { PasswordInput } from './PasswordInput';
import { useToast } from './Toast';

export function PasswordChange() {
    const { user, refreshUser } = useAuth();
    const navigate = useNavigate();
    const toast = useToast();
    const [data, setData] = useState({ current_password: '', password: '', password_confirmation: '' });
    const [error, setError] = useState('');
    const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
    const [notice, setNotice] = useState('');
    const [busy, setBusy] = useState(false);
    async function submit(event: FormEvent) {
        event.preventDefault(); if (busy) return;
        setBusy(true); setError(''); setFieldErrors({}); setNotice('');
        try { await apiPost('/auth/change-password', data); await refreshUser(); toast('Contraseña actualizada.'); navigate(user?.role === 'admin' ? '/admin' : '/aprender'); }
        catch (reason) { setFieldErrors(reason instanceof ApiError ? reason.errors : {}); setError(reason instanceof ApiError ? Object.values(reason.errors).flat().join(' ') || reason.message : 'No se pudo cambiar la contraseña.'); setBusy(false); }
    }
    async function verify() {
        if (busy) return;
        setBusy(true); setError(''); setNotice('');
        try { const result = await apiPost<{ message: string }>('/auth/verification-notification', {}); setNotice(result.message); }
        catch (reason) { setError(reason instanceof ApiError ? reason.message : 'No se pudo enviar el correo.'); }
        finally { setBusy(false); }
    }
    return <section id="account-security" tabIndex={-1} className="account-security-card account-card glass-panel" aria-labelledby="password-heading">
        <div className="account-card-heading"><span className="stat-icon tone-0"><KeyRound size={23} aria-hidden="true" /></span><div><span className="eyebrow">SEGURIDAD DE LA CUENTA</span><h2 id="password-heading">{user?.debe_cambiar_contrasena ? 'Actualiza tu contraseña inicial' : 'Cambiar contraseña'}</h2></div></div>
        <p className="account-card-description">{user?.debe_cambiar_contrasena ? 'Establece una nueva contraseña para continuar al campus.' : 'Protege tu acceso con una contraseña que solo tú conozcas.'}</p>
        <form className="account-password-form" onSubmit={submit} aria-busy={busy}>
            {(['current_password', 'password', 'password_confirmation'] as const).map(key => <div key={key} className="account-password-field"><label className="field-label" htmlFor={`account-${key}`}>{key === 'current_password' ? 'Contraseña actual' : key === 'password' ? 'Nueva contraseña' : 'Confirmar nueva contraseña'}</label><PasswordInput id={`account-${key}`} required disabled={busy} autoComplete={key === 'current_password' ? 'current-password' : 'new-password'} minLength={key === 'current_password' ? undefined : 12} value={data[key]} onChange={event => setData({ ...data, [key]: event.target.value })} aria-invalid={Boolean(fieldErrors[key])} aria-describedby={fieldErrors[key] ? `account-error-${key}` : key === 'password' ? 'account-password-help' : undefined} />{fieldErrors[key] && <p className="form-error" id={`account-error-${key}`}>{fieldErrors[key].join(' ')}</p>}</div>)}
            <p className="account-password-help" id="account-password-help"><LockKeyhole size={17} aria-hidden="true" /><span>Usa 12 caracteres o más, mayúsculas, minúsculas, números y símbolos.</span></p>
            <button className="primary-button" type="submit" disabled={busy}><ShieldCheck size={18} aria-hidden="true" />{busy ? 'Procesando…' : 'Guardar contraseña'}</button>
        </form>
        {!user?.debe_cambiar_contrasena && <div className="account-email-verification"><div><Mail size={20} aria-hidden="true" /><span><strong>Verificación del correo</strong><small>{user?.email_verified ? 'Tu dirección de correo está confirmada.' : 'Confirma tu correo para mantener tu cuenta verificada.'}</small></span></div>{user?.email_verified ? <span className="badge success"><CheckCircle2 size={14} aria-hidden="true" />Correo verificado</span> : <button type="button" className="secondary-button" disabled={busy} onClick={() => void verify()}><Send size={16} aria-hidden="true" />Enviar correo de verificación</button>}</div>}
        {notice && <p className="account-success-notice" role="status"><CheckCircle2 size={17} aria-hidden="true" />{notice}</p>}{error && <p className="auth-alert" role="alert">{error}</p>}
    </section>;
}
