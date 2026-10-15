import { Link } from '../navigation';
import { ArrowRight, Check, LoaderCircle } from 'lucide-react';
import { useRef, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ApiError } from '../services/api';
import { cedulaError, normalizePersonName, passwordChecks, registrationErrors, type RegistrationData } from '../services/registration';
import { GoogleAuthButton } from './GoogleAuthButton';
import { PasswordInput } from './PasswordInput';

export function RegisterForm() {
    const { register } = useAuth();
    const [params] = useSearchParams();
    const [data, setData] = useState<RegistrationData>({ first_name: '', last_name: '', cedula: '', email: '', password: '', password_confirmation: '' });
    const [processing, setProcessing] = useState(false);
    const submitting = useRef(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const googleError = params.get('google_error');
    const checks = passwordChecks(data.password);

    function update(field: keyof RegistrationData, value: string) {
        if ((field === 'first_name' || field === 'last_name') && /[^\p{L}\p{M} ]/u.test(value)) {
            setErrors(current => ({ ...current, [field]: 'Solo se permiten letras y espacios.' })); return;
        }
        if (field === 'cedula' && /[^0-9]/.test(value)) {
            setErrors(current => ({ ...current, cedula: 'Solo se permiten dígitos del 0 al 9.' })); return;
        }
        setData(current => ({ ...current, [field]: value }));
        setErrors(current => { const next = { ...current }; delete next[field]; delete next.form; if (field === 'password') delete next.password_confirmation; return next; });
    }

    async function submit(event: FormEvent) {
        event.preventDefault();
        if (submitting.current) return;
        const invalid = registrationErrors(data);
        setErrors(invalid);
        if (Object.keys(invalid).length) { document.getElementById(Object.keys(invalid)[0])?.focus(); return; }
        submitting.current = true; setProcessing(true);
        try {
            await register({ ...data, first_name: normalizePersonName(data.first_name), last_name: normalizePersonName(data.last_name), email: data.email.trim().toLowerCase(), cedula: data.cedula.trim() });
        } catch (error) {
            const failures = error instanceof ApiError ? Object.keys(error.errors).length ? Object.fromEntries(Object.entries(error.errors).map(([key, values]) => [key, values[0]])) : { form: error.message } : { form: 'No se pudo crear la cuenta. Tus datos se conservan; inténtalo de nuevo.' };
            setErrors(failures);
            submitting.current = false; setProcessing(false);
            document.getElementById(Object.keys(failures)[0])?.focus();
        }
    }

    const errorFor = (field: string) => errors[field] ? <p id={field + '-error'} className="form-error" role="alert">{errors[field]}</p> : null;
    const accessibility = (field: string, help?: string) => ({ 'aria-invalid': Boolean(errors[field]), 'aria-describedby': [help, errors[field] ? field + '-error' : null].filter(Boolean).join(' ') || undefined });

    return <div className="register-form-content">
        {googleError && <p className="auth-alert" role="alert">{googleError}</p>}
        <form onSubmit={submit} noValidate aria-label="Crear una cuenta con correo" aria-busy={processing}>
            <fieldset disabled={processing} className="register-fieldset">
                <legend><span aria-hidden="true">01</span> Datos personales</legend>
                <div className="form-grid register-grid">
                    <div><label className="field-label" htmlFor="first_name">Nombres</label>
                        <input id="first_name" name="first_name" className="field" required minLength={2} maxLength={74} autoComplete="given-name" placeholder="Ej. María José" value={data.first_name} onChange={event => update('first_name', event.target.value)} onBlur={() => update('first_name', normalizePersonName(data.first_name))} {...accessibility('first_name', 'names-help')} />
                        {errorFor('first_name')}
                    </div>
                    <div><label className="field-label" htmlFor="last_name">Apellidos</label>
                        <input id="last_name" name="last_name" className="field" required minLength={2} maxLength={74} autoComplete="family-name" placeholder="Ej. Yánez Quishpe" value={data.last_name} onChange={event => update('last_name', event.target.value)} onBlur={() => update('last_name', normalizePersonName(data.last_name))} {...accessibility('last_name', 'names-help')} />
                        {errorFor('last_name')}
                    </div>
                </div>
                <p id="names-help" className="register-help">Solo letras y espacios; se admiten tildes y ñ.</p>
                <div className="form-grid register-grid">
                    <div><label className="field-label" htmlFor="cedula">Cédula <span className="register-optional">Opcional</span></label>
                        <input id="cedula" name="cedula" className="field" inputMode="numeric" pattern="[0-9]{10}" maxLength={10} placeholder="10 dígitos" value={data.cedula} onChange={event => update('cedula', event.target.value)} onBlur={() => { const error = cedulaError(data.cedula); if (error) setErrors(current => ({ ...current, cedula: error })); }} {...accessibility('cedula', 'cedula-help')} />
                        <p id="cedula-help" className="register-help">Sin espacios ni guiones.</p>
                        {errorFor('cedula')}
                    </div>
                    <div><label className="field-label" htmlFor="email">Correo electrónico</label>
                        <input id="email" name="email" className="field" type="email" inputMode="email" required maxLength={254} autoComplete="email" autoCapitalize="none" spellCheck={false} placeholder="tu@correo.com" value={data.email} onChange={event => update('email', event.target.value)} {...accessibility('email')} />
                        {errorFor('email')}
                    </div>
                </div>
            </fieldset>
            <fieldset disabled={processing} className="register-fieldset register-security">
                <legend><span aria-hidden="true">02</span> Protege tu cuenta</legend>
                <div className="form-grid register-grid">
                    <div><label className="field-label" htmlFor="password">Contraseña</label>
                        <PasswordInput id="password" name="password" required minLength={12} maxLength={72} disabled={processing} autoComplete="new-password" value={data.password} onChange={event => update('password', event.target.value)} {...accessibility('password', 'password-help')} />
                        {errorFor('password')}
                    </div>
                    <div><label className="field-label" htmlFor="password_confirmation">Confirmar contraseña</label>
                        <PasswordInput id="password_confirmation" name="password_confirmation" required minLength={12} maxLength={72} disabled={processing} autoComplete="new-password" value={data.password_confirmation} onChange={event => update('password_confirmation', event.target.value)} {...accessibility('password_confirmation')} />
                        {errorFor('password_confirmation')}
                    </div>
                </div>
                <ul id="password-help" className="register-password-checks" aria-label="Requisitos de contraseña">
                    {([['length', 'Mínimo 12 caracteres'], ['mixed', 'Mayúscula y minúscula'], ['number', 'Al menos un número'], ['symbol', 'Al menos un símbolo']] as const).map(([key, label]) => <li key={key} className={checks[key] ? 'is-met' : ''}><Check size={13} aria-hidden="true" /><span className="sr-only">{checks[key] ? 'Cumplido: ' : 'Pendiente: '}</span>{label}</li>)}
                </ul>
            </fieldset>
            {errors.form && <p id="form" tabIndex={-1} className="auth-alert" role="alert">{errors.form}</p>}
            <button type="submit" className="primary-button register-submit" disabled={processing}>{processing ? <><LoaderCircle size={18} className="animate-spin" aria-hidden="true" />Creando tu cuenta…</> : <>Crear mi cuenta <ArrowRight size={18} aria-hidden="true" /></>}</button>
        </form>
        <GoogleAuthButton disabled={processing} />
        <p className="register-login">¿Ya tienes una cuenta? {processing ? <span aria-disabled="true">Iniciar sesión</span> : <Link href="/iniciar-sesion">Iniciar sesión</Link>}</p>
    </div>;
}
