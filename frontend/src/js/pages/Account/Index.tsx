import { Head } from '../../navigation';
import { CheckCircle2, Mail, ShieldCheck } from 'lucide-react';
import { AppLayout } from '../../layouts/AppLayout';
import { useAuth } from '../../context/AuthContext';
import { apiBaseUrl } from '../../services/api';
import { PasswordChange } from '../../components/PasswordChange';

export default function Account() {
    const { user, googleEnabled } = useAuth();
    const search = new URLSearchParams(window.location.search);
    const status = search.get('google_status');
    const googleError = search.get('google_error');

    return (
        <AppLayout title="Mi cuenta" subtitle="Consulta tus datos y métodos de acceso.">
            <Head title="Mi cuenta" />
            <PasswordChange />
            <div className="grid gap-5 lg:grid-cols-2">
                <section className="glass-panel p-7">
                    <span className="eyebrow">DATOS DE TU CUENTA</span>
                    <h2 className="mt-3 font-serif text-2xl">{user?.name}</h2>
                    <p className="mt-5 flex items-center gap-2 text-muted"><Mail size={18} />{user?.email}</p>
                    {user?.cedula && <p className="mt-3 text-sm text-muted">Cédula: {user.cedula}</p>}
                </section>
                <section className="glass-panel p-7">
                    <span className="eyebrow">ACCESO CON GOOGLE</span>
                    <h2 className="mt-3 font-serif text-2xl">Conecta tu cuenta</h2>
                    {user?.google_connected ? (
                        <p className="mt-5 flex items-center gap-2 font-bold text-forest"><CheckCircle2 size={20} />Google está vinculado a tu cuenta.</p>
                    ) : googleEnabled ? (
                        <>
                            <p className="mt-4 leading-7 text-muted">Usa el mismo correo de esta cuenta para poder entrar con Google la próxima vez.</p>
                            <a className="secondary-button mt-5" href={`${apiBaseUrl}/cuenta/google`}><ShieldCheck size={18} />Vincular Google</a>
                        </>
                    ) : (
                        <p className="mt-4 text-muted">El acceso con Google estará disponible cuando se habilite en la plataforma.</p>
                    )}
                    {status && <p className="mt-4 rounded-xl bg-emerald-100 p-3 text-emerald-900" role="status">{status}</p>}
                    {googleError && <p className="form-error" role="alert">{googleError}</p>}
                </section>
            </div>
        </AppLayout>
    );
}
