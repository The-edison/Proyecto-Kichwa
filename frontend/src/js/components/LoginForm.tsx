import { Link } from '../navigation';
import { ArrowRight, LoaderCircle } from 'lucide-react';
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

    return <div className="space-y-6">
        {googleError && <p className="auth-alert" role="alert">{googleError}</p>}
        <form onSubmit={submit} className="space-y-5" aria-label="Iniciar sesión con correo" aria-busy={processing}>
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
                <div className="mt-2 flex justify-end">{processing ? <span className="inline-flex min-h-11 items-center text-sm text-muted" aria-disabled="true">¿Olvidaste tu contraseña?</span> : <Link href="/recuperar-contrasena" className="inline-flex min-h-11 items-center text-sm font-semibold text-forest hover:underline">¿Olvidaste tu contraseña?</Link>}</div>
            </div>
            {errors.form && <p className="auth-alert" role="alert">{errors.form}</p>}
            <button type="submit" className="primary-button w-full" disabled={processing}>
                {processing ? <><LoaderCircle size={18} className="animate-spin" aria-hidden="true" />Iniciando sesión…</> : <>Iniciar sesión <ArrowRight size={18} aria-hidden="true" /></>}
            </button>
        </form>
        <div className="border-t border-emerald-100 pt-5">
            <p className="text-center text-sm text-muted">¿Aún no tienes una cuenta?</p>
            {processing ? <span className="mt-2 block text-center text-sm font-semibold text-muted" aria-disabled="true">Crear una cuenta</span> :
                <Link href="/registro" className="mt-1 flex min-h-11 items-center justify-center font-semibold text-forest hover:underline">Crear una cuenta</Link>}
        </div>
        <GoogleAuthButton disabled={processing} />
    </div>;
}
