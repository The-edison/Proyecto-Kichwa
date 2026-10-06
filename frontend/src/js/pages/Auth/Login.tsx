import { LogIn } from 'lucide-react';
import { Head } from '../../navigation';
import { LoginForm } from '../../components/LoginForm';
import { PublicLayout } from '../../layouts/PublicLayout';

export default function Login() {
    return <PublicLayout>
        <Head title="Iniciar sesión" />
        <section className="mx-auto max-w-[540px] px-4 py-10 sm:px-5 sm:py-14">
            <div className="auth-panel glass-panel p-6 sm:p-9">
                <span className="mb-5 grid h-12 w-12 place-items-center rounded-xl bg-emerald-50 text-forest" aria-hidden="true"><LogIn size={24} /></span>
                <p className="eyebrow">Tu espacio de aprendizaje</p>
                <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink">Iniciar sesión</h1>
                <p className="mb-7 mt-3 leading-6 text-muted">Ingresa con tu correo y contraseña para continuar aprendiendo.</p>
                <LoginForm />
            </div>
        </section>
    </PublicLayout>;
}
