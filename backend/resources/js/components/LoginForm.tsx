import { Link, useForm, usePage } from '@inertiajs/react';
import { ArrowRight } from 'lucide-react';
import type { FormEvent } from 'react';
import type { SharedProps } from '../types';
import { GoogleAuthButton } from './GoogleAuthButton';

export function LoginForm() {
    const { data, setData, post, processing, errors } = useForm({ identifier: '', password: '' });
    const page = usePage().props as unknown as SharedProps;

    function submit(event: FormEvent) {
        event.preventDefault();
        post('/iniciar-sesion');
    }

    return (
        <div className="space-y-6">
            <form onSubmit={submit} className="space-y-5">
                <div>
                    <label className="field-label" htmlFor="identifier">Correo electrónico o cédula</label>
                    <input className="field" id="identifier" autoComplete="username" required value={data.identifier} onChange={(event) => setData('identifier', event.target.value)} />
                    {errors.identifier && <p className="form-error" role="alert">{errors.identifier}</p>}
                </div>
                <div>
                    <label className="field-label" htmlFor="password">Contraseña</label>
                    <input className="field" id="password" type="password" autoComplete="current-password" required value={data.password} onChange={(event) => setData('password', event.target.value)} />
                    {errors.password && <p className="form-error" role="alert">{errors.password}</p>}
                </div>
                <button className="primary-button w-full" disabled={processing}>Entrar a mi espacio <ArrowRight size={18} /></button>
            </form>
            <GoogleAuthButton label="Iniciar sesión con Google" />
            {page.errors?.google && <p className="form-error" role="alert">{page.errors.google}</p>}
            <p className="text-center text-sm text-muted">¿Aún no tienes cuenta? <Link className="font-bold text-forest underline" href="/registro">Regístrate</Link></p>
        </div>
    );
}
