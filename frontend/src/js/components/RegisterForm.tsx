import { Link } from '../navigation';
import { ArrowRight } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import { ApiError } from '../services/api';
import { GoogleAuthButton } from './GoogleAuthButton';

export function RegisterForm() {
    const { register } = useAuth();
    const [data, setData] = useState({ name: '', cedula: '', email: '', password: '', password_confirmation: '' });
    const [processing, setProcessing] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const googleError = new URLSearchParams(window.location.search).get('google_error');

    async function submit(event: FormEvent) {
        event.preventDefault();
        setProcessing(true);
        setErrors({});
        try {
            await register(data);
        } catch (error) {
            setErrors(error instanceof ApiError ? Object.keys(error.errors).length ? Object.fromEntries(Object.entries(error.errors).map(([key, values]) => [key, values[0]])) : { email: error.message } : { email: 'No se pudo crear la cuenta.' });
            setProcessing(false);
        }
    }

    const update = (field: keyof typeof data, value: string) => setData((current) => ({ ...current, [field]: value }));

    return (
        <div className="space-y-6">
            <form onSubmit={submit} className="space-y-5">
                <div className="form-grid">
                    <div>
                        <label className="field-label" htmlFor="name">Nombres y apellidos</label>
                        <input id="name" className="field" required autoComplete="name" value={data.name} onChange={(event) => update('name', event.target.value)} />
                        {errors.name && <p className="form-error">{errors.name}</p>}
                    </div>
                    <div>
                        <label className="field-label" htmlFor="cedula">Cédula ecuatoriana (opcional)</label>
                        <input id="cedula" className="field" inputMode="numeric" value={data.cedula} onChange={(event) => update('cedula', event.target.value)} />
                        {errors.cedula && <p className="form-error">{errors.cedula}</p>}
                    </div>
                </div>
                <div>
                    <label className="field-label" htmlFor="email">Correo electrónico</label>
                    <input id="email" className="field" type="email" required autoComplete="email" value={data.email} onChange={(event) => update('email', event.target.value)} />
                    {errors.email && <p className="form-error">{errors.email}</p>}
                </div>
                <div className="form-grid">
                    <div>
                        <label className="field-label" htmlFor="password">Contraseña</label>
                        <input id="password" className="field" type="password" required minLength={12} autoComplete="new-password" value={data.password} onChange={(event) => update('password', event.target.value)} />
                        <p className="mt-2 text-sm text-muted">Al menos 12 caracteres, mayúsculas, minúsculas, números y símbolos.</p>
                        {errors.password && <p className="form-error">{errors.password}</p>}
                    </div>
                    <div>
                        <label className="field-label" htmlFor="confirmation">Confirmar contraseña</label>
                        <input id="confirmation" className="field" type="password" required minLength={12} autoComplete="new-password" value={data.password_confirmation} onChange={(event) => update('password_confirmation', event.target.value)} />
                    </div>
                </div>
                <button className="primary-button w-full" disabled={processing}>Crear mi cuenta <ArrowRight size={18} /></button>
            </form>
            <GoogleAuthButton label="Registrarme con Google" />
            {googleError && <p className="form-error" role="alert">{googleError}</p>}
            <p className="text-center text-sm text-muted">¿Ya tienes cuenta? <Link className="font-bold text-forest underline" href="/iniciar-sesion">Inicia sesión</Link></p>
        </div>
    );
}
