import { LogIn } from 'lucide-react';
import { Head } from '../../navigation';
import { LoginForm } from '../../components/LoginForm';
import { PublicLayout } from '../../layouts/PublicLayout';

export default function Login() {
    return <PublicLayout>
        <Head title="Iniciar sesión" />
        <section className="login-page" aria-labelledby="login-title">
            <div className="auth-panel glass-panel login-panel">
                <header className="login-welcome"><span className="login-welcome-icon" aria-hidden="true"><LogIn size={23} /></span><div><p className="eyebrow">Tu espacio de aprendizaje</p><h1 id="login-title">Iniciar sesión</h1></div></header>
                <p className="login-intro">Ingresa con tu correo y contraseña para continuar aprendiendo.</p>
                <LoginForm />
            </div>
        </section>
    </PublicLayout>;
}
