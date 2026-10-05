import { Head } from '@inertiajs/react';
import { RegisterForm } from '../../components/RegisterForm';
import { PublicLayout } from '../../layouts/PublicLayout';

export default function Register() {
    return (
        <PublicLayout>
            <Head title="Crear cuenta" />
            <section className="mx-auto max-w-[750px] px-5 py-16">
                <div className="glass-panel p-8 sm:p-10">
                    <span className="eyebrow">EMPIEZA AQUÍ</span>
                    <h1 className="section-title mt-3">Tu camino en Kichwa comienza hoy.</h1>
                    <p className="mb-8 mt-3 text-muted">Regístrate con tu correo y guarda tus avances.</p>
                    <RegisterForm />
                </div>
            </section>
        </PublicLayout>
    );
}
