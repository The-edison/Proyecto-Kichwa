import { UserRoundPlus } from 'lucide-react';
import { Head } from '../../navigation';
import { RegisterForm } from '../../components/RegisterForm';
import { PublicLayout } from '../../layouts/PublicLayout';

export default function Register() {
    return <PublicLayout>
        <Head title="Crear cuenta" />
        <section className="mx-auto max-w-[720px] px-4 py-10 sm:px-5 sm:py-14">
            <div className="auth-panel glass-panel p-6 sm:p-9">
                <span className="mb-5 grid h-12 w-12 place-items-center rounded-xl bg-emerald-50 text-forest" aria-hidden="true"><UserRoundPlus size={24} /></span>
                <p className="eyebrow">Comienza tu aprendizaje</p>
                <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink">Crear tu cuenta</h1>
                <p className="mb-7 mt-3 leading-6 text-muted">Regístrate para estudiar Kichwa y guardar tus avances.</p>
                <RegisterForm />
            </div>
        </section>
    </PublicLayout>;
}
