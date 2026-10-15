import { Link } from '../navigation';
import { ArrowRight, KeyRound, LoaderCircle } from 'lucide-react';
import { useRef, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ApiError } from '../services/api';
import { GoogleAuthButton } from './GoogleAuthButton';
import { PasswordInput } from './PasswordInput';

export function LoginForm() {
    const { login } = useAuth();
    const [params] = useSearchParams();
    const [data, setData] = useState({ identifier: '', password: '' });
    const [processing, setProcessing] = useState(false);
    const submitting = useRef(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const googleError = params.get('google_error');

    async function submit(event: FormEvent) {
        event.preventDefault();
        if (submitting.current) return;
        submitting.current = true; setProcessing(true); setErrors({});
        try {
            await login(data.identifier.trim(), data.password);
        } catch (error) {
            setErrors(error instanceof ApiError ? Object.keys(error.errors).length ? Object.fromEntries(Object.entries(error.errors).map(([key, values]) => [key, values[0]])) : { form: error.message } : { form: 'No se pudo iniciar sesión. Inténtalo de nuevo.' });
            submitting.current = false; setProcessing(false);
        }
    }

    return <div className="login-form-content">
        {googleError && <p className="auth-alert" role="alert">{googleError}</p>}
        {params.get('password_reset') === '1' && <p className="login-reset-success" role="status">Tu contraseña se actualizó. Ya puedes iniciar sesión con la nueva.</p>}
        <form onSubmit={submit} className="login-fields" aria-label="Iniciar sesión con correo" aria-busy={processing}>
            <div>
                <label className="field-label" htmlFor="identifier">Correo electrónico</label>
                <input className="field" id="identifier" type="email" inputMode="email" autoComplete="username" autoCapitalize="none" spellCheck={false}
                    required maxLength={254} disabled={processing} value={data.identifier}
                    aria-invalid={Boolean(errors.identifier)} aria-describedby={errors.identifier ? 'identifier-error' : undefined}
                    onChange={event => setData({ ...data, identifier: event.target.value })} />
                {errors.identifier && <p id="identifier-error" className="form-error" role="alert">{errors.identifier}</p>}
            </div>
            <div>
                <label className="field-label" htmlFor="password">Contraseña</label>
                <PasswordInput id="password" autoComplete="current-password" required disabled={processing} value={data.password}
                    aria-invalid={Boolean(errors.password)} aria-describedby={errors.password ? 'password-error' : undefined}
                    onChange={event => setData({ ...data, password: event.target.value })} />
                {errors.password && <p id="password-error" className="form-error" role="alert">{errors.password}</p>}
            </div>
            {errors.form && <p className="auth-alert" role="alert">{errors.form}</p>}
            <button type="submit" className="primary-button w-full" disabled={processing}>
                {processing ? <><LoaderCircle size={18} className="animate-spin" aria-hidden="true" />Iniciando sesión…</> : <>Iniciar sesión <ArrowRight size={18} aria-hidden="true" /></>}
            </button>
        </form>
        <div className="login-recovery"><span className="login-recovery-icon" aria-hidden="true"><KeyRound size={20} /></span><div><strong>¿Olvidaste tu contraseña?</strong><p>Recibe un enlace seguro en tu correo.</p>{processing ? <span aria-disabled="true">Recuperar contraseña</span> : <Link href={`/recuperar-contrasena${data.identifier.trim() ? '?email=' + encodeURIComponent(data.identifier.trim()) : ''}`}>Recuperar contraseña <ArrowRight size={14} aria-hidden="true" /></Link>}</div></div>
        <div className="login-create-account">
            <p className="text-center text-sm text-muted">¿Aún no tienes una cuenta?</p>
            {processing ? <span className="mt-2 block text-center text-sm font-semibold text-muted" aria-disabled="true">Crear una cuenta</span> :
                <Link href="/registro" className="mt-1 flex min-h-11 items-center justify-center font-semibold text-forest hover:underline">Crear una cuenta</Link>}
        </div>
        <GoogleAuthButton disabled={processing} />
    </div>;
}
