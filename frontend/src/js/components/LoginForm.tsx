import { Link } from '../navigation';
import { ArrowRight } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import { ApiError } from '../services/api';
import { GoogleAuthButton } from './GoogleAuthButton';

export function LoginForm() {
    const { login } = useAuth();
    const [data, setData] = useState({ identifier: '', password: '' });
    const [processing, setProcessing] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const googleError = new URLSearchParams(window.location.search).get('google_error');

    async function submit(event: FormEvent) {
        event.preventDefault();
        setProcessing(true);
        setErrors({});
        try {
            await login(data.identifier, data.password);
        } catch (error) {
            setErrors(error instanceof ApiError ? Object.keys(error.errors).length ? Object.fromEntries(Object.entries(error.errors).map(([key, values]) => [key, values[0]])) : { identifier: error.message } : { identifier: 'No se pudo iniciar sesión.' });
            setProcessing(false);
        }
    }

    return (
        <div className="space-y-6">
            <form onSubmit={submit} className="space-y-5">
                <div>
                    <label className="field-label" htmlFor="identifier">Correo electrónico</label>
                    <input className="field" id="identifier" autoComplete="username" required value={data.identifier} onChange={(event) => setData({ ...data, identifier: event.target.value })} />
                    {errors.identifier && <p className="form-error" role="alert">{errors.identifier}</p>}
                </div>
                <div>
                    <label className="field-label" htmlFor="password">Contraseña</label>
                    <input className="field" id="password" type="password" autoComplete="current-password" required value={data.password} onChange={(event) => setData({ ...data, password: event.target.value })} />
                    {errors.password && <p className="form-error" role="alert">{errors.password}</p>}
                </div>
                <button className="primary-button w-full" disabled={processing}>Entrar a mi espacio <ArrowRight size={18} /></button>
            </form>
            <GoogleAuthButton label="Iniciar sesión con Google" />
            <Link href="/recuperar-contrasena" className="block text-center font-bold text-forest">Olvidé mi contraseña</Link>
            {googleError && <p className="form-error" role="alert">{googleError}</p>}
            <p className="text-center text-sm text-muted">¿Aún no tienes cuenta? <Link className="font-bold text-forest underline" href="/registro">Regístrate</Link></p>
        </div>
    );
}
