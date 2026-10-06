import { Link } from '../navigation';
import { ArrowRight, LoaderCircle } from 'lucide-react';
import { useRef, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ApiError } from '../services/api';
import { GoogleAuthButton } from './GoogleAuthButton';
import { PasswordInput } from './PasswordInput';

export function RegisterForm() {
    const { register } = useAuth();
    const [params] = useSearchParams();
    const [data, setData] = useState({ name: '', cedula: '', email: '', password: '', password_confirmation: '' });
    const [processing, setProcessing] = useState(false);
    const submitting = useRef(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const googleError = params.get('google_error');

    async function submit(event: FormEvent) {
        event.preventDefault();
        if (submitting.current) return;
        setErrors({});
        if (data.password !== data.password_confirmation) {
            setErrors({ password_confirmation: 'Las contraseñas no coinciden.' });
            document.getElementById('confirmation')?.focus(); return;
        }
        submitting.current = true; setProcessing(true);
        try {
            await register({ ...data, name: data.name.trim(), email: data.email.trim(), cedula: data.cedula.trim() });
        } catch (error) {
            setErrors(error instanceof ApiError ? Object.keys(error.errors).length ? Object.fromEntries(Object.entries(error.errors).map(([key, values]) => [key, values[0]])) : { form: error.message } : { form: 'No se pudo crear la cuenta. Inténtalo de nuevo.' });
            submitting.current = false; setProcessing(false);
        }
    }

    const update = (field: keyof typeof data, value: string) => setData(current => ({ ...current, [field]: value }));
    const errorFor = (field: string) => errors[field] ? <p id={field + '-error'} className="form-error" role="alert">{errors[field]}</p> : null;
    const accessibility = (field: string) => ({ 'aria-invalid': Boolean(errors[field]), 'aria-describedby': errors[field] ? field + '-error' : undefined });

    return <div className="space-y-6">
        {googleError && <p className="auth-alert" role="alert">{googleError}</p>}
        <form onSubmit={submit} className="space-y-5" aria-label="Crear una cuenta con correo" aria-busy={processing}>
            <fieldset disabled={processing} className="space-y-5">
                <legend className="sr-only">Datos de tu cuenta</legend>
                <div className="form-grid">
                    <div><label className="field-label" htmlFor="name">Nombres y apellidos</label>
                        <input id="name" className="field" required minLength={2} maxLength={150} autoComplete="name" value={data.name} onChange={event => update('name', event.target.value)} {...accessibility('name')} />
                        {errorFor('name')}
                    </div>
                    <div><label className="field-label" htmlFor="cedula">Cédula ecuatoriana <span className="font-normal text-muted">(opcional)</span></label>
                        <input id="cedula" className="field" inputMode="numeric" maxLength={10} value={data.cedula} onChange={event => update('cedula', event.target.value)} {...accessibility('cedula')} />
                        {errorFor('cedula')}
                    </div>
                </div>
                <div><label className="field-label" htmlFor="email">Correo electrónico</label>
                    <input id="email" className="field" type="email" inputMode="email" required maxLength={254} autoComplete="email" autoCapitalize="none" spellCheck={false}
                        value={data.email} onChange={event => update('email', event.target.value)} {...accessibility('email')} />
                    {errorFor('email')}
                </div>
                <div className="form-grid">
                    <div><label className="field-label" htmlFor="password">Contraseña</label>
                        <PasswordInput id="password" required minLength={12} maxLength={72} disabled={processing} autoComplete="new-password" value={data.password}
                            onChange={event => update('password', event.target.value)} {...accessibility('password')} aria-describedby={errors.password ? 'password-help password-error' : 'password-help'} />
                        <p id="password-help" className="mt-2 text-xs leading-5 text-muted">Al menos 12 caracteres, con mayúsculas, minúsculas, números y símbolos.</p>
                        {errorFor('password')}
                    </div>
                    <div><label className="field-label" htmlFor="confirmation">Confirmar contraseña</label>
                        <PasswordInput id="confirmation" required minLength={12} maxLength={72} disabled={processing} autoComplete="new-password" value={data.password_confirmation}
                            onChange={event => update('password_confirmation', event.target.value)} {...accessibility('password_confirmation')} />
                        {errorFor('password_confirmation')}
                    </div>
                </div>
            </fieldset>
            {errors.form && <p className="auth-alert" role="alert">{errors.form}</p>}
            <button type="submit" className="primary-button w-full" disabled={processing}>{processing ?
                <><LoaderCircle size={18} className="animate-spin" aria-hidden="true" />Creando tu cuenta…</> : <>Crear mi cuenta <ArrowRight size={18} aria-hidden="true" /></>}</button>
        </form>
        <div className="border-t border-emerald-100 pt-5"><p className="text-center text-sm text-muted">¿Ya tienes una cuenta?</p>
            {processing ? <span className="mt-2 block text-center text-sm font-semibold text-muted" aria-disabled="true">Iniciar sesión</span> :
                <Link href="/iniciar-sesion" className="mt-1 flex min-h-11 items-center justify-center font-semibold text-forest hover:underline">Iniciar sesión</Link>}
        </div>
        <GoogleAuthButton disabled={processing} />
    </div>;
}
