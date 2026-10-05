import { Head } from '@inertiajs/react';
import { LoginForm } from '../../components/LoginForm';
import { PublicLayout } from '../../layouts/PublicLayout';

export default function Login() {
    return (
        <PublicLayout>
            <Head title="Iniciar sesión" />
            <section className="mx-auto max-w-[520px] px-5 py-16">
                <div className="glass-panel p-8 sm:p-10">
                    <span className="eyebrow">BIENVENIDO DE NUEVO</span>
                    <h1 className="section-title mt-3">Continúa tu recorrido.</h1>
                    <p className="mb-8 mt-3 text-muted">Ingresa con tu correo o cédula y contraseña.</p>
                    <LoginForm />
                </div>
            </section>
        </PublicLayout>
    );
}
