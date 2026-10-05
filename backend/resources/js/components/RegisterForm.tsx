import { Link, useForm, usePage } from '@inertiajs/react';
import { ArrowRight } from 'lucide-react';
import type { FormEvent } from 'react';
import type { SharedProps } from '../types';
import { GoogleAuthButton } from './GoogleAuthButton';

export function RegisterForm() {
    const { data, setData, post, processing, errors } = useForm({ name: '', cedula: '', email: '', password: '', password_confirmation: '' });
    const page = usePage().props as unknown as SharedProps;

    function submit(event: FormEvent) {
        event.preventDefault();
        post('/registro');
    }

    return (
        <div className="space-y-6">
            <form onSubmit={submit} className="space-y-5">
                <div className="form-grid">
                    <div>
                        <label className="field-label" htmlFor="name">Nombres y apellidos</label>
                        <input id="name" className="field" required autoComplete="name" value={data.name} onChange={(event) => setData('name', event.target.value)} />
                        {errors.name && <p className="form-error">{errors.name}</p>}
                    </div>
                    <div>
                        <label className="field-label" htmlFor="cedula">Cédula o DNI (opcional)</label>
                        <input id="cedula" className="field" inputMode="numeric" value={data.cedula} onChange={(event) => setData('cedula', event.target.value)} />
                        {errors.cedula && <p className="form-error">{errors.cedula}</p>}
                    </div>
                </div>
                <div>
                    <label className="field-label" htmlFor="email">Correo electrónico</label>
                    <input id="email" className="field" type="email" required autoComplete="email" value={data.email} onChange={(event) => setData('email', event.target.value)} />
                    {errors.email && <p className="form-error">{errors.email}</p>}
                </div>
                <div className="form-grid">
                    <div>
                        <label className="field-label" htmlFor="password">Contraseña</label>
                        <input id="password" className="field" type="password" required minLength={8} autoComplete="new-password" value={data.password} onChange={(event) => setData('password', event.target.value)} />
                        {errors.password && <p className="form-error">{errors.password}</p>}
                    </div>
                    <div>
                        <label className="field-label" htmlFor="confirmation">Confirmar contraseña</label>
                        <input id="confirmation" className="field" type="password" required minLength={8} autoComplete="new-password" value={data.password_confirmation} onChange={(event) => setData('password_confirmation', event.target.value)} />
                    </div>
                </div>
                <button className="primary-button w-full" disabled={processing}>Crear mi cuenta <ArrowRight size={18} /></button>
            </form>
            <GoogleAuthButton label="Registrarme con Google" />
            {page.errors?.google && <p className="form-error" role="alert">{page.errors.google}</p>}
            <p className="text-center text-sm text-muted">¿Ya tienes cuenta? <Link className="font-bold text-forest underline" href="/iniciar-sesion">Inicia sesión</Link></p>
        </div>
    );
}
