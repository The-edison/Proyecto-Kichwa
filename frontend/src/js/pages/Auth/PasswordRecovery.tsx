import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Check, CheckCircle2, KeyRound, LoaderCircle, Mail } from 'lucide-react';
import { PublicLayout } from '../../layouts/PublicLayout';
import { apiPost, ApiError } from '../../services/api';
import { Head, Link } from '../../navigation';
import { PasswordInput } from '../../components/PasswordInput';
import { PrivacyNotice } from '../../components/PrivacyNotice';
import { passwordChecks, passwordError } from '../../services/registration';

export default function PasswordRecovery() {
    const [query] = useSearchParams();
    const navigate = useNavigate();
    const token = query.get('token');
    const resetting = query.has('token');
    const [email, setEmail] = useState(query.get('email') ?? '');
    const [password, setPassword] = useState('');
    const [confirmation, setConfirmation] = useState('');
    const [message, setMessage] = useState('');
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [busy, setBusy] = useState(false);
    const submitting = useRef(false);
    const checks = passwordChecks(password);
    useEffect(() => { setErrors({}); setMessage(''); setPassword(''); setConfirmation(''); }, [token]);

    async function submit(event: FormEvent) {
        event.preventDefault();
        if (submitting.current) return;
        const invalid: Record<string, string> = {};
        const normalizedEmail = email.trim().toLowerCase();
        if (!normalizedEmail || normalizedEmail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) invalid.email = 'Ingresa un correo electrónico válido.';
        if (resetting) {
            if (!token) invalid.form = 'El enlace no está completo. Solicita uno nuevo.';
            const error = passwordError(password);
            if (error) invalid.password = error;
            if (!confirmation || confirmation !== password) invalid.password_confirmation = 'Las contraseñas no coinciden.';
        }
        setErrors(invalid); setMessage('');
        if (Object.keys(invalid).length) { document.getElementById('recovery-' + Object.keys(invalid)[0])?.focus(); return; }
        submitting.current = true; setBusy(true);
        try {
            const payload = resetting ? { email: normalizedEmail, token, password, password_confirmation: confirmation } : { email: normalizedEmail };
            const result = await apiPost<{ message: string }>(resetting ? '/auth/reset-password' : '/auth/forgot-password', payload);
            if (resetting) navigate('/iniciar-sesion?password_reset=1', { replace: true });
            else setMessage(result.message);
        } catch (reason) {
            const errors = reason instanceof ApiError && Object.keys(reason.errors).length ? Object.fromEntries(Object.entries(reason.errors).map(([key, values]) => [key, values[0]])) : { form: reason instanceof ApiError ? reason.message : 'No se pudo conectar. Tus datos se conservan; inténtalo de nuevo.' };
            setErrors(errors);
            document.getElementById('recovery-' + Object.keys(errors)[0])?.focus();
        } finally {
            submitting.current = false; setBusy(false);
        }
    }

    const errorFor = (field: string) => errors[field] && <p id={'recovery-' + field + '-error'} className="form-error" role="alert">{errors[field]}</p>;
    const accessibility = (field: string, help?: string) => ({ 'aria-invalid': Boolean(errors[field]), 'aria-describedby': [help, errors[field] ? 'recovery-' + field + '-error' : null].filter(Boolean).join(' ') || undefined });

    return <PublicLayout>
        <Head title={resetting ? 'Nueva contraseña' : 'Recuperar contraseña'} />
        <section className="password-recovery-page">
            <div className="auth-panel glass-panel password-recovery-panel">
                <span className="recovery-symbol" aria-hidden="true">{resetting ? <KeyRound size={27} /> : <Mail size={27} />}</span>
                <span className="eyebrow">VUELVE A TU APRENDIZAJE</span>
                <h1>{resetting ? 'Crea una nueva contraseña' : 'Recupera tu contraseña'}</h1>
                <PrivacyNotice />
                <p className="recovery-intro">{resetting ? 'Elige una contraseña segura para volver a entrar a tu cuenta.' : 'Escribe el correo de tu cuenta y te enviaremos un enlace para cambiar la contraseña.'}</p>
                {message ? <div className="recovery-confirmation" role="status"><CheckCircle2 size={26} aria-hidden="true" /><h2>Revisa tu correo</h2><p>{message}</p><p>Revisa también la carpeta de spam. El enlace vence en 60 minutos.</p><button type="button" className="secondary-button" onClick={() => setMessage('')}>Usar otro correo o volver a intentar</button></div> :
                    <form onSubmit={submit} noValidate aria-busy={busy} aria-label={resetting ? 'Crear una nueva contraseña' : 'Solicitar enlace de recuperación'}>
                        <fieldset disabled={busy} className="recovery-fields">
                            <legend className="sr-only">Datos para recuperar tu acceso</legend>
                            <div><label className="field-label" htmlFor="recovery-email">Correo electrónico</label>
                                <input id="recovery-email" className="field" type="email" inputMode="email" required maxLength={254} autoComplete="email" autoCapitalize="none" spellCheck={false} placeholder="tu@correo.com" value={email} onChange={event => { setEmail(event.target.value); setErrors(current => ({ ...current, email: '', form: '' })); }} {...accessibility('email')} />
                                {errorFor('email')}
                            </div>
                            {resetting && <>
                                <div><label className="field-label" htmlFor="recovery-password">Nueva contraseña</label><PasswordInput id="recovery-password" required minLength={12} maxLength={72} disabled={busy} autoComplete="new-password" value={password} onChange={event => { setPassword(event.target.value); setErrors(current => ({ ...current, password: '', password_confirmation: '' })); }} {...accessibility('password', 'recovery-password-help')} />{errorFor('password')}</div>
                                <div><label className="field-label" htmlFor="recovery-password_confirmation">Confirmar nueva contraseña</label><PasswordInput id="recovery-password_confirmation" required minLength={12} maxLength={72} disabled={busy} autoComplete="new-password" value={confirmation} onChange={event => { setConfirmation(event.target.value); setErrors(current => ({ ...current, password_confirmation: '' })); }} {...accessibility('password_confirmation')} />{errorFor('password_confirmation')}</div>
                                <ul id="recovery-password-help" className="register-password-checks">{([['length', '12 caracteres como mínimo'], ['mixed', 'Mayúsculas y minúsculas'], ['number', 'Al menos un número'], ['symbol', 'Al menos un símbolo']] as const).map(([key, label]) => <li key={key} className={checks[key] ? 'is-met' : ''}><Check size={13} aria-hidden="true" /><span className="sr-only">{checks[key] ? 'Cumplido: ' : 'Pendiente: '}</span>{label}</li>)}</ul>
                            </>}
                        </fieldset>
                        {errors.form && <p id="recovery-form" tabIndex={-1} className="auth-alert" role="alert">{errors.form}</p>}
                        <button type="submit" className="primary-button recovery-submit" disabled={busy}>{busy && <LoaderCircle size={18} className="animate-spin" aria-hidden="true" />}{busy ? resetting ? 'Guardando…' : 'Enviando…' : resetting ? 'Guardar nueva contraseña' : 'Enviar enlace de recuperación'}</button>
                    </form>}
                {resetting && <Link href={'/recuperar-contrasena?email=' + encodeURIComponent(email)} className="recovery-new-link">¿El enlace venció? Solicita uno nuevo</Link>}
                <Link href="/iniciar-sesion" className="recovery-back"><ArrowLeft size={16} aria-hidden="true" />Volver a iniciar sesión</Link>
            </div>
        </section>
    </PublicLayout>;
}
